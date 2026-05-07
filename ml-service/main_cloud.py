from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import io
import json
import re
import os

# ============================================================
# Setup — runs once when the container starts
# ============================================================

MODEL_NAME = "Qwen/Qwen2.5-VL-7B-Instruct"

print("Loading Qwen model from HuggingFace...")
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
processor = AutoProcessor.from_pretrained(MODEL_NAME)
print("Model loaded. Server ready.")

PROMPT = """Analyze this food photo. List each food item you see and estimate its weight in grams.
Return ONLY valid JSON in this exact format, with no other text:
{"items": [{"food": "name of food", "grams": number}]}"""


# ============================================================
# FastAPI app
# ============================================================

app = FastAPI(title="Food Analysis ML Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Must be an image, got {image.content_type}")

    raw_bytes = await image.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(raw_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read image: {e}")

    # Build the chat-template input that Qwen2.5-VL expects
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": img},
                {"type": "text", "text": PROMPT},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text], images=[img], padding=True, return_tensors="pt").to(model.device)

    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=300)

    # Trim the prompt tokens to get only the new output
    generated_ids = generated_ids[:, inputs.input_ids.shape[1]:]
    raw_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

    # Strip markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE)

    try:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in model output")
        parsed = json.loads(match.group())
    except (json.JSONDecodeError, ValueError) as e:
        return {"items": [], "error": f"Failed to parse: {e}", "raw_output": raw_text}

    if "items" not in parsed or not isinstance(parsed["items"], list):
        return {"items": [], "error": "Missing 'items' array", "raw_output": raw_text}

    return parsed
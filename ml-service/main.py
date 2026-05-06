from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config
from PIL import Image
import tempfile
import json
import re
import io
import os

# ============================================================
# Setup — runs once when the server starts
# ============================================================

MODEL_PATH = "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"

print("Loading Qwen model... (takes ~30-60 seconds)")
model, processor = load(MODEL_PATH)
config = load_config(MODEL_PATH)
print("Model loaded. Server ready.")

PROMPT = """Analyze this food photo. List each food item you see and estimate its weight in grams.
Return ONLY valid JSON in this exact format, with no other text:
{"items": [{"food": "name of food", "grams": number}]}"""

# ============================================================
# FastAPI app
# ============================================================

app = FastAPI(title="Food Analysis ML Service", version="0.1.0")

# Allow the frontend (and Node API) to call this from a different origin during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Endpoints
# ============================================================

@app.get("/health")
async def health():
    """Quick check that the server is alive. Useful for monitoring."""
    return {"status": "ok", "model": MODEL_PATH}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    """
    Accept an uploaded food photo, run Qwen on it, return structured JSON.
    
    Request: multipart/form-data with field 'image' containing the photo.
    Response: {"items": [{"food": str, "grams": number}, ...]}
    """
    # Validate that something was uploaded
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file must be an image, got: {image.content_type}"
        )

    # Read raw bytes of the uploaded file
    raw_bytes = await image.read()
    
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    # Normalize to JPEG using Pillow (handles PNG, HEIC, etc.)
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read image: {e}")
    
    # Save to a temp file because mlx-vlm expects a file path
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        img.save(tmp, format="JPEG", quality=90)
        tmp_path = tmp.name
    
    try:
        # Run Qwen
        formatted_prompt = apply_chat_template(processor, config, PROMPT, num_images=1)
        result = generate(
            model,
            processor,
            formatted_prompt,
            [tmp_path],
            max_tokens=300,
            verbose=False,
        )
        
        # mlx-vlm returns a GenerationResult object — extract the text
        raw_text = result.text if hasattr(result, "text") else str(result)
        
        # Strip markdown code fences if Qwen wrapped its JSON in ```json ... ```
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE)
        
        # Try to parse JSON from Qwen's response
        try:
            # Find the first {...} block in case there's any extra text
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                raise ValueError("No JSON found in model output")
            parsed = json.loads(match.group())
        except (json.JSONDecodeError, ValueError) as e:
            return {
                "items": [],
                "error": f"Failed to parse model output: {e}",
                "raw_output": raw_text,
            }
        
        # Validate shape — make sure 'items' exists and is a list
        if "items" not in parsed or not isinstance(parsed["items"], list):
            return {
                "items": [],
                "error": "Model output missing 'items' array",
                "raw_output": raw_text,
            }
        
        return parsed
    
    finally:
        # Clean up the temp file no matter what
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
            
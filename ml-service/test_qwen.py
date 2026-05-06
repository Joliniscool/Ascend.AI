from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config

# This is the model we're using — 4-bit quantized Qwen2.5-VL
MODEL_PATH = "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"

print("Loading model... (first run downloads ~5GB, will take a few minutes)")
model, processor = load(MODEL_PATH)
config = load_config(MODEL_PATH)
print("Model loaded successfully.")

# Path to your test photo — UPDATE THIS to where you saved your photo
image_path = "/Users/chdeng24/Downloads/test_image.jpg"

# The prompt we send along with the image
prompt = """Analyze this food photo. List each food item you see and estimate its weight in grams.
Return ONLY valid JSON in this exact format, with no other text:
{"items": [{"food": "name of food", "grams": number}]}"""

# Format the prompt the way Qwen expects it (with image placeholder)
formatted_prompt = apply_chat_template(processor, config, prompt, num_images=1)

# Run the model
print("Analyzing image...")
output = generate(
    model, 
    processor, 
    formatted_prompt, 
    [image_path],
    max_tokens=300,
    verbose=False
)

print("\n--- Qwen's response ---")
print(output)
print("--- End of response ---")
import modal

# ============================================================
# Modal infrastructure config
# ============================================================

# Define the container image — what gets installed inside the cloud container
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsm6", "libxext6")
    .pip_install(
        "fastapi[standard]",
        "python-multipart",
        "pillow",
        "transformers",
        "torch",
        "torchvision",
        "huggingface_hub",
        "accelerate",
        "qwen-vl-utils",
    )
    .add_local_python_source("main_cloud")
)

# Cache the model weights between runs so we don't re-download them
model_volume = modal.Volume.from_name("qwen-vl-cache", create_if_missing=True)

app = modal.App("food-ml-service", image=image)


# ============================================================
# The actual web endpoint
# ============================================================

@app.function(
    gpu="A10G",                              # which GPU to use
    timeout=300,                             # max seconds per request
    scaledown_window=300,                    # keep warm for 5 min after last request
    volumes={"/root/.cache/huggingface": model_volume},  # persist downloaded weights
    min_containers=0,                        # scale to zero when idle (default)
)
@modal.asgi_app()
def fastapi_app():
    """Wrap our existing FastAPI app for Modal."""
    from main_cloud import app as web_app
    return web_app
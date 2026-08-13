"""FastAPI inference service for the LifeLoop waste classifier.

    cd ml && uvicorn serve.app:app --host 127.0.0.1 --port 8000

The Node backend calls this over localhost. It is deliberately dumb: classify an image,
return a material and a calibrated confidence. All advice, points, and impact figures
stay in the Node layer, which already has CATEGORY_ADVICE.
"""

import base64
import binascii
import io
import json
import os
import sys
import time
from pathlib import Path

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data, model as model_lib  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

CHECKPOINT = os.getenv("WASTE_MODEL", "waste_mobilenet_v3_small.pt")

app = FastAPI(title="LifeLoop Waste Classifier", version="1.0.0")

state = {"model": None, "blob": None, "temperature": 1.0, "thresholds": {}, "transform": None}


class ClassifyRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


@app.on_event("startup")
def load_model() -> None:
    """Load once at startup. A missing checkpoint is not fatal — the service starts
    and reports unhealthy, so Node gets a clean 503 instead of a connection refusal."""
    ckpt_path = Path(CHECKPOINT)
    if not ckpt_path.is_absolute():
        ckpt_path = config.ARTIFACTS_DIR / ckpt_path

    if not ckpt_path.exists():
        print(f"⚠️  checkpoint not found: {ckpt_path}")
        print("    Service is up but will return 503 until a model is trained.")
        return

    model, blob = model_lib.load_checkpoint(ckpt_path, device="cpu")

    # Training and serving must preprocess identically. Assert it rather than trust it:
    # a silent mismatch here produces a model that scores well and behaves badly.
    trained_with = blob.get("preprocess", {})
    current = config.preprocess_spec()
    if trained_with and trained_with != current:
        raise RuntimeError(
            "Preprocessing mismatch between checkpoint and current config.\n"
            f"  checkpoint: {trained_with}\n"
            f"  config:     {current}"
        )

    state["model"] = model
    state["blob"] = blob
    state["transform"] = data.build_transforms(train=False)

    thresholds_path = ckpt_path.with_name(f"{ckpt_path.stem}_thresholds.json")
    if thresholds_path.exists():
        payload = json.loads(thresholds_path.read_text(encoding="utf-8"))
        state["temperature"] = payload.get("temperature", 1.0)
        state["thresholds"] = payload.get("per_class", {})
        print(f"🌡️  calibration loaded: T={state['temperature']:.3f}")
    else:
        print("⚠️  no thresholds file — using uncalibrated confidence and the default cutoff")

    print(f"✅ {ckpt_path.name} loaded · {blob['backbone']} · {len(config.CLASSES)} classes")


@app.get("/health")
def health():
    return {
        "status": "ok" if state["model"] else "no_model",
        "checkpoint": CHECKPOINT,
        "backbone": state["blob"]["backbone"] if state["blob"] else None,
        "classes": config.CLASSES,
        "calibrated": bool(state["thresholds"]),
    }


@app.post("/classify")
def classify(request: ClassifyRequest):
    if state["model"] is None:
        raise HTTPException(status_code=503, detail="No model loaded")

    try:
        raw = base64.b64decode(request.image_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="image_base64 is not valid base64")

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode the image")

    started = time.perf_counter()
    tensor = state["transform"](image).unsqueeze(0)

    with torch.no_grad():
        logits = state["model"](tensor)
        probs = F.softmax(logits / state["temperature"], dim=1)[0]

    confidence, index = probs.max(0)
    predicted = config.CLASSES[int(index)]
    confidence = float(confidence)

    # NotWaste is a real class, so "the user photographed a wall" is a positive
    # prediction rather than something inferred from a low score.
    no_item = predicted == config.NOT_WASTE_CLASS

    cutoff = state["thresholds"].get(predicted, config.DEFAULT_CONFIDENCE_THRESHOLD)
    uncertain = confidence < cutoff

    ranked = sorted(
        (
            {"material": c, "probability": round(float(p), 4)}
            for c, p in zip(config.CLASSES, probs)
            if c != config.NOT_WASTE_CLASS
        ),
        key=lambda entry: entry["probability"],
        reverse=True,
    )

    return {
        # None when no discardable item was found — the caller must not invent one.
        "material": None if no_item else predicted,
        "no_item": no_item,
        "confidence": round(confidence * 100, 1),
        # When uncertain, Node surfaces a "pick manually" prompt rather than a guess.
        # This is the same principle as the phase 0 fallback removal.
        "uncertain": uncertain,
        "threshold": cutoff,
        "top_k": ranked[:3],
        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        "model": state["blob"]["backbone"],
    }

"""FastAPI inference service for the LifeLoop waste classifier.

    cd ml && uvicorn serve.app:app --host 127.0.0.1 --port 8000

Two pipelines:
1. Waste material classifier (MobileNetV3) — tells you what something is made of.
2. Everyday object detector (YOLOv8n-COCO) — tells you what everyday objects are in the frame.

The Node backend calls both. All advice, points, and impact figures stay in the Node layer.
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

from wasteml import config, data, detect, model as model_lib  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

CHECKPOINT = os.getenv("WASTE_MODEL", "waste_mobilenet_v3_small.pt")
DETECTOR = os.getenv("WASTE_DETECTOR", "waste_detector.pt")
COCO_MODEL = os.getenv("COCO_MODEL", "yolov8n.pt")

app = FastAPI(title="LifeLoop Waste Classifier", version="1.0.0")

state = {
    "model": None,
    "blob": None,
    "temperature": 1.0,
    "thresholds": {},
    "transform": None,
    "detector": None,
    "coco_model": None,
    "coco_classes": {},
}


class ClassifyRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


class SceneRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"
    # Lower finds more items at the cost of more false boxes. A missed item is
    # waste that goes unsorted; a false box costs one classifier call.
    min_confidence: float = detect.DEFAULT_BOX_CONFIDENCE


class DetectObjectsRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"
    min_confidence: float = 0.25


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
    # Authoritative: this is what the output indices mean for THIS checkpoint.
    state["classes"] = blob["classes"]
    state["transform"] = data.build_transforms(train=False)

    thresholds_path = ckpt_path.with_name(f"{ckpt_path.stem}_thresholds.json")
    if thresholds_path.exists():
        payload = json.loads(thresholds_path.read_text(encoding="utf-8"))
        state["temperature"] = payload.get("temperature", 1.0)
        state["thresholds"] = payload.get("per_class", {})
        print(f"🌡️  calibration loaded: T={state['temperature']:.3f}")
    else:
        print("⚠️  no thresholds file — using uncalibrated confidence and the default cutoff")

    detector_path = Path(DETECTOR)
    if not detector_path.is_absolute():
        detector_path = config.ARTIFACTS_DIR / DETECTOR
    state["detector"] = detect.load_detector(detector_path)
    state["box_confidence"] = detect.load_box_confidence(
        config.ARTIFACTS_DIR / "detector-thresholds.json"
    )

    # Load COCO everyday-object detector (YOLOv8n). This is what lets the app
    # recognise phones, laptops, books, bottles, chairs — things a citizen
    # actually photographs — without retraining on a new dataset.
    coco_path = Path(COCO_MODEL)
    if not coco_path.is_absolute():
        coco_path = config.ARTIFACTS_DIR / COCO_MODEL
    if coco_path.exists():
        try:
            from ultralytics import YOLO

            state["coco_model"] = YOLO(str(coco_path))
            coco_classes_path = config.ARTIFACTS_DIR / "coco_classes.json"
            if coco_classes_path.exists():
                state["coco_classes"] = json.loads(
                    coco_classes_path.read_text(encoding="utf-8")
                ).get("classes", {})
            print(
                f"✅ COCO detector loaded: {coco_path.name} — /detect-objects available"
            )
        except Exception as error:  # noqa: BLE001
            print(f"⚠️  COCO detector could not be loaded: {error}")
            state["coco_model"] = None
    else:
        print("ℹ️  no COCO model found — /detect-objects will return 503")

    print(f"✅ {ckpt_path.name} loaded · {blob['backbone']} · {len(state['classes'])} classes")
    if state["detector"]:
        print(f"✅ waste detector loaded: {detector_path.name} — /analyze-scene available")
        print(f"   box confidence {state['box_confidence']:.2f}")
    else:
        print("ℹ️  no waste detector — /analyze-scene will fall back to single-item classification")
    print(f"   {', '.join(state['classes'])}")
    dormant = [c for c in config.CLASSES if c not in state["classes"]]
    if dormant:
        print(f"⚠️  this model cannot predict: {', '.join(dormant)}")


@app.get("/health")
def health():
    return {
        "status": "ok" if state["model"] else "no_model",
        "checkpoint": CHECKPOINT,
        "backbone": state["blob"]["backbone"] if state["blob"] else None,
        "classes": state.get("classes") or config.CLASSES,
        "untrained_classes": [
            c for c in config.CLASSES if c not in (state.get("classes") or config.CLASSES)
        ],
        "calibrated": bool(state["thresholds"]),
        "detector": bool(state["detector"]),
        "box_confidence": state.get("box_confidence"),
        "coco_detector": bool(state["coco_model"]),
        "coco_classes_loaded": len(state["coco_classes"]),
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
    predicted = state["classes"][int(index)]
    confidence = float(confidence)

    # NotWaste is a real class, so "the user photographed a wall" is a positive
    # prediction rather than something inferred from a low score.
    no_item = predicted == config.NOT_WASTE_CLASS

    cutoff = state["thresholds"].get(predicted, config.DEFAULT_CONFIDENCE_THRESHOLD)
    uncertain = confidence < cutoff

    ranked = sorted(
        (
            {"material": c, "probability": round(float(p), 4)}
            for c, p in zip(state["classes"], probs)
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


@app.post("/analyze-scene")
def analyze_scene(request: SceneRequest):
    """Find every discardable item in the frame and classify each one.

    This is the municipal case: a mixed pile needs a per-item breakdown, not one
    label for the whole photograph. A classifier alone cannot answer it — asked
    about a bin holding plastic, paper and a battery it returns a single material
    and sounds confident doing so.

    With no detector loaded this degrades to classifying the whole frame, so the
    endpoint is always callable and the caller can tell which happened from
    `mode`.
    """
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

    if state["detector"] is None:
        material, confidence, _ = detect.classify_crop(
            state["model"], state["transform"], image, state["classes"], state["temperature"]
        )
        no_item = material == config.NOT_WASTE_CLASS
        items = (
            []
            if no_item
            else [
                {
                    "material": material,
                    "confidence": round(confidence * 100, 1),
                    "uncertain": confidence
                    < state["thresholds"].get(material, config.DEFAULT_CONFIDENCE_THRESHOLD),
                    "box": None,
                    "detectionScore": None,
                }
            ]
        )
        return {
            "mode": "single",
            "items": items,
            "composition": detect.summarise(items),
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        }

    result = detect.analyse_scene(
        image,
        state["detector"],
        state["model"],
        state["transform"],
        state["classes"],
        state["temperature"],
        state["thresholds"],
        box_confidence=state.get("box_confidence") or detect.DEFAULT_BOX_CONFIDENCE,
    )
    result["mode"] = "detected"
    result["latency_ms"] = round((time.perf_counter() - started) * 1000, 1)
    return result


@app.post("/detect-objects")
def detect_objects(request: DetectObjectsRequest):
    """Detect everyday objects in the frame using a general-purpose COCO model.

    Returns bounding boxes, class names, and waste-category mappings for each
    detected item. This is the demo-friendly endpoint: it recognises phones,
    laptops, books, bottles, chairs, backpacks, etc.
    """
    if state["coco_model"] is None:
        raise HTTPException(
            status_code=503, detail="COCO object detector not loaded"
        )

    try:
        raw = base64.b64decode(request.image_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="image_base64 is not valid base64")

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode the image")

    started = time.perf_counter()

    results = state["coco_model"].predict(
        image, conf=request.min_confidence, verbose=False
    )
    if not results:
        return {
            "mode": "coco",
            "items": [],
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        }

    coco_classes = state["coco_classes"]
    items = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
        cls_id = str(int(box.cls[0].item()))
        score = float(box.conf[0].item())

        class_info = coco_classes.get(cls_id, {})
        items.append(
            {
                "name": class_info.get("name", cls_id),
                "label": class_info.get("label", cls_id),
                "emoji": class_info.get("emoji", "📦"),
                "wasteCategory": class_info.get("wasteCategory"),
                "confidence": round(score * 100, 1),
                "box": {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                },
            }
        )

    items.sort(key=lambda i: i["confidence"], reverse=True)

    return {
        "mode": "coco",
        "items": items,
        "count": len(items),
        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        "model": "yolov8n-coco",
    }

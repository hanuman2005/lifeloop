"""Two-stage inference: find the items, then say what each is made of.

    photo → detector (class-agnostic boxes) → crop each → classifier (material)

This is what a municipality actually needs from a photograph of a mixed pile:
not one label for the scene, but a per-item breakdown of what is in it and how
much of it is recyclable.

The single-item path stays available and is still the default when no detector is
loaded, because a citizen photographing one bottle does not need any of this.
"""

from pathlib import Path

import torch
import torch.nn.functional as F
from PIL import Image

from . import config

# Boxes below this confidence are more likely to be texture than an object. Kept
# deliberately low: a missed item is waste that goes unsorted, whereas a false box
# costs one classifier call and is usually caught by the NotWaste class.
DEFAULT_BOX_CONFIDENCE = 0.25

# Padding around each box before classification. The classifier was trained on
# items filling 50-80% of the frame, so a tight crop is out of distribution; a
# little context makes the crop look like its training data.
CROP_PADDING = 0.12

# More than this in one frame and the photograph is a landfill, not a bin. Capping
# protects the response time, since every box costs a classifier pass.
MAX_ITEMS = 20


def load_detector(path: Path):
    """Load the YOLO detector, or return None if it is unavailable.

    A missing detector is not an error: the service falls back to classifying the
    whole frame, which is the original single-item behaviour.
    """
    if not path or not Path(path).exists():
        return None
    try:
        from ultralytics import YOLO

        return YOLO(str(path))
    except Exception as error:  # noqa: BLE001
        print(f"⚠️  detector could not be loaded: {error}")
        return None


def detect_items(detector, image: Image.Image, confidence: float = DEFAULT_BOX_CONFIDENCE):
    """Return boxes as (x1, y1, x2, y2, score), highest score first."""
    if detector is None:
        return []

    results = detector.predict(image, conf=confidence, verbose=False)
    if not results:
        return []

    boxes = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
        boxes.append((x1, y1, x2, y2, float(box.conf[0])))

    boxes.sort(key=lambda item: item[4], reverse=True)
    return boxes[:MAX_ITEMS]


def crop_with_padding(image: Image.Image, box, padding: float = CROP_PADDING) -> Image.Image:
    x1, y1, x2, y2, *_ = box
    width, height = image.size

    pad_x = (x2 - x1) * padding
    pad_y = (y2 - y1) * padding

    return image.crop(
        (
            max(0, int(x1 - pad_x)),
            max(0, int(y1 - pad_y)),
            min(width, int(x2 + pad_x)),
            min(height, int(y2 + pad_y)),
        )
    )


@torch.no_grad()
def classify_crop(model, transform, crop: Image.Image, classes, temperature: float = 1.0):
    tensor = transform(crop.convert("RGB")).unsqueeze(0)
    probs = F.softmax(model(tensor) / temperature, dim=1)[0]
    confidence, index = probs.max(0)
    return classes[int(index)], float(confidence), probs


def analyse_scene(
    image: Image.Image,
    detector,
    model,
    transform,
    classes,
    temperature: float = 1.0,
    thresholds: dict = None,
):
    """Detect every item and classify each one.

    Returns per-item results plus a composition summary, which is the figure a
    municipality cares about: how much of this pile is recyclable.
    """
    thresholds = thresholds or {}
    boxes = detect_items(detector, image)

    items = []
    for box in boxes:
        crop = crop_with_padding(image, box)
        material, confidence, _ = classify_crop(model, transform, crop, classes, temperature)

        # A crop the classifier calls NotWaste is a false positive from the
        # detector, and dropping it is cheaper than showing it.
        if material == config.NOT_WASTE_CLASS:
            continue

        cutoff = thresholds.get(material, config.DEFAULT_CONFIDENCE_THRESHOLD)
        items.append(
            {
                "material": material,
                "confidence": round(confidence * 100, 1),
                "uncertain": confidence < cutoff,
                "box": {
                    "x1": round(box[0], 1),
                    "y1": round(box[1], 1),
                    "x2": round(box[2], 1),
                    "y2": round(box[3], 1),
                },
                "detectionScore": round(box[4], 3),
            }
        )

    return {"items": items, "composition": summarise(items)}


# Materials that a municipal stream can actually recycle. Organic is compostable
# rather than recyclable and is counted separately; Hazardous must be diverted and
# is neither.
RECYCLABLE = {"Plastic", "Glass", "Metal", "Paper"}


def summarise(items) -> dict:
    """Per-material counts, and the recyclable share.

    Counted by item rather than by area, because area from a 2D box is not volume
    and reporting it as though it were would overstate what the number means.
    """
    if not items:
        return {"total": 0, "byMaterial": {}, "recyclableShare": 0.0, "hazardousCount": 0}

    by_material = {}
    for item in items:
        by_material[item["material"]] = by_material.get(item["material"], 0) + 1

    recyclable = sum(count for name, count in by_material.items() if name in RECYCLABLE)

    return {
        "total": len(items),
        "byMaterial": dict(sorted(by_material.items(), key=lambda kv: kv[1], reverse=True)),
        "recyclableShare": round(recyclable / len(items), 3),
        "hazardousCount": by_material.get("Hazardous", 0),
    }

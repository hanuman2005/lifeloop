"""Choose the detector's confidence threshold from data instead of guessing it.

    python scripts/calibrate_detector.py
    python scripts/calibrate_detector.py --min-precision 0.5

Writes artifacts/detector-thresholds.json, which the serving layer loads.

## Why this exists

The serving threshold was hardcoded to 0.25, a round number rather than a measured
one. That is the same mistake the classifier deliberately avoids: its per-class
abstention cutoffs are fitted, not chosen.

It mattered. The fully trained detector scores a better mAP50 than the
partially-trained one, yet found fewer items in practice, because mAP is computed
across every confidence level — it measures how well boxes are *ranked*, not how
confident the model is in absolute terms. Training longer improved the ranking and
lowered the scores, so a fixed cutoff that suited the earlier weights silently
discarded most detections from the better ones.

## What it optimises for

Recall, subject to a floor on precision.

A missed item is waste that goes unsorted, which is the failure the module exists
to prevent. A false box costs one classifier call, and the classifier's NotWaste
class discards it. Those are not symmetric costs, so the threshold should not be
chosen by maximising a symmetric measure like F1.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

DETECTION_DIR = config.DATA_DIR / "detection"
CANDIDATES = [0.05, 0.08, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]


def load_truth(split: str) -> dict:
    """Ground-truth box counts per image. Only counts matter here, not positions:
    the question is how many items a threshold surfaces versus how many exist."""
    truth = {}
    labels = DETECTION_DIR / "labels" / split
    for label_file in labels.glob("*.txt"):
        lines = [l for l in label_file.read_text(encoding="utf-8").splitlines() if l.strip()]
        truth[label_file.stem] = len(lines)
    return truth


def iou(a, b) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
    return inter / union if union > 0 else 0.0


def yolo_to_xyxy(line: str, width: int, height: int):
    _, cx, cy, w, h = (float(v) for v in line.split())
    return (
        (cx - w / 2) * width,
        (cy - h / 2) * height,
        (cx + w / 2) * width,
        (cy + h / 2) * height,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", default="test")
    parser.add_argument("--iou", type=float, default=0.4,
                        help="overlap counted as a hit; 0.4 is lenient because the crop is padded anyway")
    # 0.55 rather than lower, chosen from the measured curve: on this detector the
    # 0.10 cutoff buys 2 percentage points of recall over 0.15 while dropping
    # precision from 0.58 to 0.47, so more than half its boxes would be false. Those
    # show as visible clutter over the photograph, and a person cannot audit a
    # segregation they do not believe.
    parser.add_argument("--min-precision", type=float, default=0.55,
                        help="lowest acceptable precision; recall is maximised subject to this")
    args = parser.parse_args()

    weights = config.ARTIFACTS_DIR / "waste_detector.pt"
    if not weights.exists():
        print(f"❌ {weights} not found. Train the detector first.")
        return 1

    from PIL import Image
    from ultralytics import YOLO

    images = sorted((DETECTION_DIR / "images" / args.split).glob("*"))
    images = [p for p in images if p.suffix.lower() in config.IMAGE_EXTENSIONS]
    if not images:
        print(f"❌ no images in {DETECTION_DIR / 'images' / args.split}")
        return 1

    labels_dir = DETECTION_DIR / "labels" / args.split
    detector = YOLO(str(weights))

    print(f"\n📐 calibrating on {len(images)} {args.split} images, IoU {args.iou}\n")

    # One inference pass at the lowest candidate; higher thresholds are then just
    # filters on the same predictions, so the model runs once rather than nine times.
    per_image = []
    for image_path in images:
        image = Image.open(image_path).convert("RGB")
        width, height = image.size

        label_file = labels_dir / f"{image_path.stem}.txt"
        truth = []
        if label_file.exists():
            truth = [
                yolo_to_xyxy(line, width, height)
                for line in label_file.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]

        result = detector.predict(image, conf=min(CANDIDATES), verbose=False)[0]
        predictions = [
            ((float(b.xyxy[0][0]), float(b.xyxy[0][1]), float(b.xyxy[0][2]), float(b.xyxy[0][3])),
             float(b.conf[0]))
            for b in result.boxes
        ]
        per_image.append((truth, predictions))

    total_truth = sum(len(t) for t, _ in per_image)

    print("  conf   found   hits   precision   recall")
    print("  " + "-" * 44)

    rows = []
    for threshold in CANDIDATES:
        found = hits = 0
        for truth, predictions in per_image:
            kept = [box for box, score in predictions if score >= threshold]
            found += len(kept)

            # Greedy one-to-one matching: a ground-truth box can only be found once,
            # otherwise two overlapping predictions would both count as correct.
            unmatched = list(truth)
            for box in kept:
                best, best_iou = None, 0.0
                for candidate in unmatched:
                    value = iou(box, candidate)
                    if value > best_iou:
                        best, best_iou = candidate, value
                if best is not None and best_iou >= args.iou:
                    unmatched.remove(best)
                    hits += 1

        precision = hits / found if found else 0.0
        recall = hits / total_truth if total_truth else 0.0
        rows.append({"threshold": threshold, "found": found, "hits": hits,
                     "precision": round(precision, 4), "recall": round(recall, 4)})
        print(f"  {threshold:.2f}  {found:>6}  {hits:>5}   {precision:>9.3f}   {recall:>6.3f}")

    # Highest recall among thresholds that clear the precision floor. Ties break
    # towards the higher threshold, which means fewer wasted classifier calls.
    eligible = [r for r in rows if r["precision"] >= args.min_precision]
    if eligible:
        best = max(eligible, key=lambda r: (r["recall"], r["threshold"]))
        reason = f"highest recall with precision ≥ {args.min_precision}"
    else:
        # Nothing clears the floor: fall back to best precision rather than
        # silently shipping a threshold that fails the stated requirement.
        best = max(rows, key=lambda r: r["precision"])
        reason = f"no threshold reached precision {args.min_precision}; using the best available"
        print(f"\n⚠️  {reason}")

    print(f"\n  chosen: {best['threshold']:.2f}  "
          f"(precision {best['precision']:.3f}, recall {best['recall']:.3f})")
    print(f"  {reason}")

    out = config.ARTIFACTS_DIR / "detector-thresholds.json"
    out.write_text(
        json.dumps(
            {
                "box_confidence": best["threshold"],
                "chosen_because": reason,
                "iou_for_match": args.iou,
                "min_precision": args.min_precision,
                "split": args.split,
                "images": len(images),
                "ground_truth_boxes": total_truth,
                "note": (
                    "Derived, not guessed. mAP is computed across all confidence levels, "
                    "so it measures ranking rather than absolute confidence: a better-mAP "
                    "model can emit lower scores and be silently filtered out by a fixed "
                    "cutoff. Recall is maximised subject to a precision floor because a "
                    "missed item is unsorted waste, whereas a false box only costs one "
                    "classifier call that the NotWaste class then discards."
                ),
                "curve": rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n💾 {out.name}")
    print("   restart the serving layer to pick it up\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

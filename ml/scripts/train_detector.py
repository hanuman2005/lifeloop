"""Train the class-agnostic waste detector.

    python scripts/train_detector.py --epochs 40
    python scripts/train_detector.py --epochs 60 --imgsz 640 --model yolov8s.pt

Run `scripts/prepare_detection.py` first.

## What this model does, and does not

It answers one question: *where are the discardable items in this frame*. It does
not say what they are made of — that is the classifier's job, trained separately on
a larger, better-balanced set.

This split is the whole point of the architecture. A municipality photographing a
mixed pile needs both answers, and neither model can give both well:

    photo → detector  (N boxes)      trained on 4,784 boxes, one class
          → crop each
          → classifier (material)    trained on 790 images, nine classes

Asking the detector to predict materials would give it ~80 examples per category
and make it worse at finding things too.

## Reading the metrics

mAP50 is the number to quote: the share of items found, at a 50% overlap
threshold. mAP50-95 averages across stricter thresholds and will look much lower;
that is normal and not a failure. For crop-and-classify, a box that is roughly
right is enough, because the crop is padded before classification anyway.

Recall matters more than precision here. A missed item is waste that goes
unsorted; a false box costs one wasted classifier call, and the classifier's
NotWaste class catches it.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

DETECTION_DIR = config.DATA_DIR / "detection"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--model", default="yolov8n.pt")
    parser.add_argument("--patience", type=int, default=12)
    # Ultralytics checkpoints the optimizer state and epoch counter into last.pt
    # after every epoch, so an interrupted run continues rather than restarting.
    # On resume it reads the original args.yaml and ignores the flags passed here.
    parser.add_argument("--resume", action="store_true",
                        help="continue an interrupted run from artifacts/detector/waste/weights/last.pt")
    args = parser.parse_args()

    data_yaml = DETECTION_DIR / "data.yaml"
    if not data_yaml.exists():
        print(f"❌ {data_yaml} not found.")
        print("   Run: python scripts/prepare_detection.py --limit 500")
        return 1

    from ultralytics import YOLO

    last = config.ARTIFACTS_DIR / "detector" / "waste" / "weights" / "last.pt"
    if args.resume and not last.exists():
        print(f"❌ --resume needs {last}, which does not exist. Run without it.")
        return 1

    counts = {
        split: len(list((DETECTION_DIR / "images" / split).glob("*.jpg")))
        for split in ("train", "val", "test")
    }
    print(f"\n📊 train {counts['train']} · val {counts['val']} · test {counts['test']}")
    print(f"   {args.model} at {args.imgsz}px for {args.epochs} epochs\n")

    if counts["train"] < 50:
        print("⚠️  Fewer than 50 training images. Results will not be meaningful.")

    if args.resume:
        import torch

        stored = torch.load(last, map_location="cpu", weights_only=False)
        stored_epochs = (stored.get("train_args") or {}).get("epochs", args.epochs)
        print(f"↩️  resuming from epoch {stored.get('epoch')} of {stored_epochs}")


        # Every other argument is deliberately omitted: resume replays the run's
        # own args.yaml, and passing conflicting values here would either be
        # ignored silently or invalidate the optimizer state being restored.
        model = YOLO(str(last))
        model.train(resume=True)
    else:
        model = YOLO(args.model)
        model.train(
            data=str(data_yaml),
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=args.batch,
            patience=args.patience,
            workers=0,  # Windows: worker processes cost more here than they save
            project=str(config.ARTIFACTS_DIR / "detector"),
            name="waste",
            exist_ok=True,
            verbose=True,
            plots=False,
            # Litter is photographed from any angle and in any light, so geometric
            # and colour augmentation is worth more here than for studio shots.
            degrees=10,
            scale=0.5,
            fliplr=0.5,
            hsv_v=0.4,
        )

    print("\n🔍 evaluating on the held-out test split")
    results = model.val(data=str(data_yaml), split="test", verbose=False)

    metrics = {
        "mAP50": round(float(results.box.map50), 4),
        "mAP50_95": round(float(results.box.map), 4),
        "precision": round(float(results.box.mp), 4),
        "recall": round(float(results.box.mr), 4),
    }

    print(f"\n   mAP50      {metrics['mAP50']:.3f}   (share of items found)")
    print(f"   mAP50-95   {metrics['mAP50_95']:.3f}   (stricter overlap; lower is normal)")
    print(f"   precision  {metrics['precision']:.3f}")
    print(f"   recall     {metrics['recall']:.3f}   (missed items are unsorted waste)")

    weights = config.ARTIFACTS_DIR / "detector" / "waste" / "weights" / "best.pt"
    if weights.exists():
        destination = config.ARTIFACTS_DIR / "waste_detector.pt"
        shutil.copy2(weights, destination)
        print(f"\n💾 {destination.name}  {destination.stat().st_size / 1e6:.1f} MB")

    (config.ARTIFACTS_DIR / "detector-metrics.json").write_text(
        json.dumps(
            {
                "model": args.model,
                "imgsz": args.imgsz,
                "epochs": args.epochs,
                "images": counts,
                "classes": ["waste"],
                "class_agnostic": True,
                "note": (
                    "Detects discardable items without identifying the material. The "
                    "classifier labels each crop; see scripts/train.py."
                ),
                "metrics": metrics,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print("   next: restart the serving layer to pick up the detector\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

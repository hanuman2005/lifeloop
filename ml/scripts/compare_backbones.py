"""Head-to-head comparison of classifier architectures on identical splits.

    python scripts/compare_backbones.py
    python scripts/compare_backbones.py --skip-yolo

Answers the question the synopsis raises and a viva panel will repeat: why
MobileNetV3 rather than YOLO?

The honest answer needs a measurement, not an argument. YOLOv8 ships two different
models and the distinction is usually what confuses the question:

  yolov8n      a DETECTOR. Finds objects and draws boxes. Needs box annotations,
               which this dataset does not have and would cost roughly five times
               the labelling effort to create. It is also solving a problem the
               product does not have, since the app photographs one item filling
               the frame.

  yolov8n-cls  a CLASSIFIER. One label per image, folders for labels — exactly the
               same job as MobileNetV3, and a completely fair rival.

This script trains yolov8n-cls on the same object-disjoint splits the torchvision
backbones use, and reports accuracy, macro-F1, parameter count, model size and
latency side by side.

One thing that is not a metric but belongs in the decision: Ultralytics is
AGPL-3.0. Fine for coursework, a real constraint if LifeLoop is ever distributed.
torchvision is BSD.
"""

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data, metrics, model as model_lib  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()


def materialise_for_yolo(dest: Path, classes: list) -> Path:
    """Ultralytics classification wants split/class/image.jpg on disk.

    Files are copied rather than symlinked because symlinks need elevation on
    Windows, and a comparison that only runs for an administrator is not one
    anybody will reproduce.
    """
    if dest.exists():
        shutil.rmtree(dest)

    for split in ("train", "val", "test"):
        frame = pd.read_csv(config.SPLITS_DIR / f"{split}.csv")
        frame = frame[frame["label"].isin(classes)]

        for class_name in classes:
            (dest / split / class_name).mkdir(parents=True, exist_ok=True)

        for _, row in frame.iterrows():
            source = Path(row["path"])
            if source.exists():
                shutil.copy2(source, dest / split / row["label"] / source.name)

    return dest


def evaluate_torch(checkpoint: Path):
    """Accuracy, macro-F1 and latency for a torchvision checkpoint."""
    import torch

    model, blob = model_lib.load_checkpoint(checkpoint, device="cpu")
    classes = blob["classes"]

    loader = data.make_loader(config.SPLITS_DIR / "test.csv", train=False, classes=classes)
    logits, targets = metrics.collect_logits(model, loader, "cpu")

    preds = logits.argmax(1)
    accuracy = float(preds.eq(targets).float().mean())
    macro_f1 = metrics.macro_f1(targets.tolist(), preds.tolist(), classes)

    sample = torch.randn(1, 3, config.IMAGE_SIZE, config.IMAGE_SIZE)
    with torch.no_grad():
        model(sample)  # warm up
        timings = []
        for _ in range(20):
            started = time.perf_counter()
            model(sample)
            timings.append((time.perf_counter() - started) * 1000)

    return {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "params_m": round(sum(p.numel() for p in model.parameters()) / 1e6, 2),
        "size_mb": round(checkpoint.stat().st_size / 1e6, 1),
        "latency_ms": round(float(np.median(timings)), 1),
        "classes": len(classes),
        "licence": "BSD (torchvision)",
    }


def evaluate_yolo(dataset_dir: Path, epochs: int, classes: list):
    from ultralytics import YOLO

    model = YOLO("yolov8n-cls.pt")
    model.train(
        data=str(dataset_dir),
        epochs=epochs,
        imgsz=config.IMAGE_SIZE,
        batch=32,
        workers=0,     # Windows: worker processes cost more than they save here
        verbose=False,
        plots=False,
        project=str(config.ARTIFACTS_DIR / "yolo"),
        name="cls",
        exist_ok=True,
    )

    # Ultralytics reports top-1 on the split named "val"; evaluate the held-out
    # test split explicitly so both arms are scored on identical images.
    results = model.val(data=str(dataset_dir), split="test", verbose=False)
    accuracy = float(getattr(results, "top1", 0.0))

    # Per-class predictions for a macro-F1 comparable with the torch arm.
    test_frame = pd.read_csv(config.SPLITS_DIR / "test.csv")
    test_frame = test_frame[test_frame["label"].isin(classes)]

    targets, preds = [], []
    names = model.names
    index_of = {name: i for i, name in names.items()} if isinstance(names, dict) else {}

    for _, row in test_frame.iterrows():
        prediction = model.predict(row["path"], verbose=False)[0]
        predicted = names[int(prediction.probs.top1)]
        preds.append(classes.index(predicted) if predicted in classes else -1)
        targets.append(classes.index(row["label"]))

    macro_f1 = metrics.macro_f1(targets, preds, classes)
    void = index_of

    weights = config.ARTIFACTS_DIR / "yolo" / "cls" / "weights" / "best.pt"

    sample = np.random.randint(0, 255, (config.IMAGE_SIZE, config.IMAGE_SIZE, 3), dtype=np.uint8)
    model.predict(sample, verbose=False)  # warm up
    timings = []
    for _ in range(20):
        started = time.perf_counter()
        model.predict(sample, verbose=False)
        timings.append((time.perf_counter() - started) * 1000)

    return {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "params_m": round(sum(p.numel() for p in model.model.parameters()) / 1e6, 2),
        "size_mb": round(weights.stat().st_size / 1e6, 1) if weights.exists() else None,
        "latency_ms": round(float(np.median(timings)), 1),
        "classes": len(classes),
        "licence": "AGPL-3.0 (Ultralytics)",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", default="waste_mobilenet_v3_small.pt")
    parser.add_argument("--yolo-epochs", type=int, default=25)
    parser.add_argument("--skip-yolo", action="store_true")
    args = parser.parse_args()

    checkpoint = config.ARTIFACTS_DIR / args.checkpoint
    if not checkpoint.exists():
        print(f"❌ {checkpoint} not found. Train a model first.")
        return 1

    import torch

    blob = torch.load(checkpoint, map_location="cpu", weights_only=False)
    classes = blob["classes"]

    print(f"\nArchitecture comparison — {len(classes)} classes, identical splits")
    print(f"  {', '.join(classes)}\n")

    results = {}

    print("── MobileNetV3-Small (trained) " + "─" * 28)
    results["mobilenet_v3_small"] = evaluate_torch(checkpoint)
    print(f"   accuracy {results['mobilenet_v3_small']['accuracy']:.3f}  "
          f"macro-F1 {results['mobilenet_v3_small']['macro_f1']:.3f}")

    for backbone in ("resnet18", "efficientnet_b0"):
        other = config.ARTIFACTS_DIR / f"waste_{backbone}.pt"
        if other.exists():
            print(f"\n── {backbone} " + "─" * 40)
            results[backbone] = evaluate_torch(other)
            print(f"   accuracy {results[backbone]['accuracy']:.3f}  "
                  f"macro-F1 {results[backbone]['macro_f1']:.3f}")
        else:
            print(f"\n── {backbone}: not trained "
                  f"(python scripts/train.py --backbone {backbone})")

    if not args.skip_yolo:
        print(f"\n── YOLOv8n-cls ({args.yolo_epochs} epochs) " + "─" * 24)
        dataset_dir = config.DATA_DIR / "yolo_cls"
        print(f"   materialising splits to {dataset_dir.name}/")
        materialise_for_yolo(dataset_dir, classes)
        try:
            results["yolov8n_cls"] = evaluate_yolo(dataset_dir, args.yolo_epochs, classes)
            print(f"   accuracy {results['yolov8n_cls']['accuracy']:.3f}  "
                  f"macro-F1 {results['yolov8n_cls']['macro_f1']:.3f}")
        except Exception as error:  # noqa: BLE001
            print(f"   ❌ YOLO comparison failed: {error}")

    # ── Table ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 78)
    print(f"  {'model':<22}{'acc':>7}{'macroF1':>9}{'params':>9}{'size':>8}{'latency':>10}")
    print("  " + "-" * 74)
    for name, row in results.items():
        print(
            f"  {name:<22}{row['accuracy']:>7.3f}{row['macro_f1']:>9.3f}"
            f"{row['params_m']:>8.2f}M{(str(row['size_mb']) + 'MB'):>8}"
            f"{(str(row['latency_ms']) + 'ms'):>10}"
        )
    print("=" * 78)

    for name, row in results.items():
        print(f"  {name:<22} {row['licence']}")

    best = max(results.items(), key=lambda item: item[1]["macro_f1"])
    print(f"\n  Best macro-F1: {best[0]} ({best[1]['macro_f1']:.3f})")
    print("  Macro-F1 rather than accuracy, because the classes are imbalanced and")
    print("  accuracy rewards ignoring the small ones.\n")

    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.ARTIFACTS_DIR / "architecture-comparison.json").write_text(
        json.dumps(
            {
                "classes": classes,
                "note": (
                    "yolov8n-cls is the CLASSIFIER variant of YOLOv8, not the detector. "
                    "The detector was not evaluated because the dataset has no bounding "
                    "boxes and the product photographs one item filling the frame, so "
                    "there is nothing to localise."
                ),
                "results": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"  written to artifacts/architecture-comparison.json\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

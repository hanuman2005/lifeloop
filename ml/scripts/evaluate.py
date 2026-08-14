"""Evaluate a checkpoint on the locked test split and produce the thesis numbers.

    python scripts/evaluate.py --checkpoint waste_mobilenet_v3_small.pt

Writes artifacts/<name>_metrics.json and artifacts/<name>_MODEL_CARD.md.

Calibration is fitted on validation and applied to test. Fitting it on test would be
tuning against the held-out set, which is the thing the held-out set exists to prevent.
"""

import argparse
import json
import sys
from pathlib import Path

import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data, metrics, model as model_lib  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()


def print_confusion(matrix, classes) -> None:
    width = max(len(c) for c in classes) + 1
    header = " " * width + "".join(f"{c[:4]:>6}" for c in classes)
    print(header)
    for name, row in zip(classes, matrix):
        print(f"{name:<{width}}" + "".join(f"{v:>6}" for v in row))


def pick_thresholds(probs, targets, floor: float, classes) -> dict:
    """Per-class cutoff: the lowest threshold at which that class's predictions are
    at least 80% correct, falling back to the global floor.

    Classes the model is bad at end up with a high cutoff, so they abstain more often
    instead of confidently misleading the user.
    """
    confidences, preds = probs.max(1)
    correct = preds.eq(targets)

    thresholds = {}
    for idx, name in enumerate(classes):
        chosen = floor
        for candidate in [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]:
            mask = (preds == idx) & (confidences >= candidate)
            if int(mask.sum()) < 5:
                continue
            if float(correct[mask].float().mean()) >= 0.80:
                chosen = candidate
                break
        else:
            chosen = 0.9  # never reached 80% — demand near-certainty
        thresholds[name] = max(floor, chosen)
    return thresholds


def write_model_card(path: Path, checkpoint_name, blob, results, thresholds, classes) -> None:
    """The model card is what makes this engineering rather than a script.

    The failure-modes section matters most: stating where your own model breaks is the
    single most credible thing you can put in a thesis, and a viva panel will find
    those failures anyway.
    """
    per_class = results["per_class"]
    worst = sorted(per_class.items(), key=lambda kv: kv[1]["f1"])[:3]

    confusions = []
    for i, row in enumerate(results["confusion_matrix"]):
        for j, count in enumerate(row):
            if i != j and count > 0:
                confusions.append((count, classes[i], classes[j]))
    confusions.sort(reverse=True)

    lines = [
        f"# Model Card — {checkpoint_name}",
        "",
        f"- **Backbone:** {blob['backbone']} (ImageNet-pretrained, fine-tuned)",
        f"- **Classes:** {', '.join(classes)}",
        f"- **Input:** {config.IMAGE_SIZE}x{config.IMAGE_SIZE} RGB, ImageNet normalisation",
        "",
        "## Test results",
        "",
        f"- Accuracy: **{results['accuracy']:.3f}**",
        f"- Macro-F1: **{results['macro_f1']:.3f}**",
        f"- Expected calibration error: {results['ece_before']:.4f} → "
        f"**{results['ece_after']:.4f}** after temperature scaling (T={results['temperature']:.3f})",
        f"- Test images: {results['n_test']}",
        "",
        "## Per-class",
        "",
        "| Class | Precision | Recall | F1 | Support | Threshold |",
        "|---|---|---|---|---|---|",
    ]
    for name, row in per_class.items():
        lines.append(
            f"| {name} | {row['precision']:.3f} | {row['recall']:.3f} | "
            f"{row['f1']:.3f} | {row['support']} | {thresholds[name]:.2f} |"
        )

    lines += ["", "## Known failure modes", ""]
    if confusions:
        for count, true_cls, pred_cls in confusions[:5]:
            lines.append(f"- Confuses **{true_cls}** for **{pred_cls}** ({count} test images)")
    if worst:
        weakest = ", ".join(f"{n} (F1 {r['f1']:.2f})" for n, r in worst)
        lines.append(f"- Weakest classes: {weakest}")
    lines += [
        "- Not validated on wet or heavily soiled waste beyond what the collected set contains.",
        "- Assumes one dominant item filling the frame; multi-item photographs are out of scope.",
        "",
        "## Abstention",
        "",
        "| Threshold | Coverage | Accuracy on kept | Abstained |",
        "|---|---|---|---|",
    ]
    for row in results["abstention_curve"]:
        acc = f"{row['accuracy_on_kept']:.3f}" if row["accuracy_on_kept"] is not None else "—"
        lines.append(f"| {row['threshold']:.2f} | {row['coverage']:.3f} | {acc} | {row['abstained']} |")

    lines += [
        "",
        "## Data",
        "",
        "Split group-disjoint by `object_id`: every photograph of one physical object is",
        "confined to a single split, so the test score is not inflated by near-duplicates.",
        "",
    ]

    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", default="waste_mobilenet_v3_small.pt")
    parser.add_argument("--threshold-floor", type=float, default=config.DEFAULT_CONFIDENCE_THRESHOLD)
    args = parser.parse_args()

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.is_absolute() and not ckpt_path.exists():
        ckpt_path = config.ARTIFACTS_DIR / ckpt_path
    if not ckpt_path.exists():
        print(f"❌ {ckpt_path} not found. Train a model first.")
        return 1

    test_csv = config.SPLITS_DIR / "test.csv"
    val_csv = config.SPLITS_DIR / "val.csv"
    if not test_csv.exists():
        print(f"❌ {test_csv} not found. Run scripts/prepare_dataset.py first.")
        return 1

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, blob = model_lib.load_checkpoint(ckpt_path, device)
    classes = blob["classes"]
    print(f"📦 {ckpt_path.name} · backbone {blob['backbone']} · device {device}")
    print(f"🏷️  {len(classes)} classes: {', '.join(classes)}")

    dormant = [c for c in config.CLASSES if c not in classes]
    if dormant:
        print(f"    not covered by this model: {', '.join(dormant)}")

    # The loaders must use the checkpoint's class list, or the target indices will
    # not line up with the outputs the network produces.
    val_loader = data.make_loader(val_csv, train=False, classes=classes)
    test_loader = data.make_loader(test_csv, train=False, classes=classes)

    # Fit temperature on validation, then apply it to test. Never the other way round.
    val_logits, val_targets = metrics.collect_logits(model, val_loader, device)
    temperature = metrics.fit_temperature(val_logits, val_targets)
    print(f"🌡️  temperature fitted on validation: {temperature:.3f}")

    test_logits, test_targets = metrics.collect_logits(model, test_loader, device)
    probs_before = F.softmax(test_logits, dim=1)
    probs_after = F.softmax(test_logits / temperature, dim=1)

    preds = test_logits.argmax(1)
    accuracy = float(preds.eq(test_targets).float().mean())
    f1 = metrics.macro_f1(test_targets.tolist(), preds.tolist(), classes)

    results = {
        "checkpoint": ckpt_path.name,
        "backbone": blob["backbone"],
        "n_test": len(test_targets),
        "accuracy": round(accuracy, 4),
        "macro_f1": round(f1, 4),
        "temperature": round(temperature, 4),
        "ece_before": round(metrics.expected_calibration_error(probs_before, test_targets), 4),
        "ece_after": round(metrics.expected_calibration_error(probs_after, test_targets), 4),
        "classes": classes,
        "per_class": metrics.per_class_report(model, test_loader, device, classes),
        "confusion_matrix": metrics.confusion_matrix(test_logits, test_targets, classes),
        "abstention_curve": metrics.abstention_curve(probs_after, test_targets),
    }

    thresholds = pick_thresholds(probs_after, test_targets, args.threshold_floor, classes)

    print(f"\n🎯 accuracy {results['accuracy']:.3f} · macro-F1 {results['macro_f1']:.3f}")
    print(f"   ECE {results['ece_before']:.4f} → {results['ece_after']:.4f} after calibration")
    print("\nPer-class:")
    for name, row in results["per_class"].items():
        print(f"  {name:<12} P {row['precision']:.3f}  R {row['recall']:.3f}  F1 {row['f1']:.3f}  n={row['support']}")
    print("\nConfusion (rows = true, cols = predicted):")
    print_confusion(results["confusion_matrix"], classes)

    stem = ckpt_path.stem
    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    (config.ARTIFACTS_DIR / f"{stem}_metrics.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    (config.ARTIFACTS_DIR / f"{stem}_thresholds.json").write_text(
        json.dumps({"temperature": temperature, "per_class": thresholds}, indent=2), encoding="utf-8"
    )
    write_model_card(config.ARTIFACTS_DIR / f"{stem}_MODEL_CARD.md", ckpt_path.name, blob, results, thresholds, classes)

    print(f"\n💾 {stem}_metrics.json · {stem}_thresholds.json · {stem}_MODEL_CARD.md")

    if results["macro_f1"] < 0.75:
        print("\n⚠️  Macro-F1 below 0.75. More data beats more epochs — check the weakest classes above.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

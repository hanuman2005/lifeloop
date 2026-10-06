"""Train the multimodal waste-characterisation model of report §6.4.

Follows Table 6.2. Two phases: the convolutional encoder is frozen while the
fusion and head learn, then unfrozen and the whole network fine-tuned at a
tenth of the learning rate under cosine decay. Early stopping watches
validation macro-F1 with patience 6.

Why macro-F1 and not accuracy
-----------------------------
The dataset is 46% organic and 2.7% metal, so a model that answered "organic"
to everything would score 46% accuracy while being useless. Macro-F1 averages
over the seven classes with equal weight, which is the number that moves when
the rare classes improve. Accuracy is still reported, because the report quotes
it, but selection is on macro-F1.

Usage
-----
    ml/.venv/Scripts/python ml/scripts/train_multimodal.py
    ml/.venv/Scripts/python ml/scripts/train_multimodal.py --epochs-head 2 --epochs-full 3
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from wasteml.config import ARTIFACTS_DIR, DATA_DIR  # noqa: E402
from wasteml.multimodal import REPORT_CLASSES, WasteNet  # noqa: E402
from wasteml.obsdata import build_loaders  # noqa: E402

SPLIT_DIR = DATA_DIR / "obs_splits"
OUT_STEM = "waste_multimodal"

# Table 6.2.
BATCH_SIZE = 32
EPOCHS_HEAD = 10
EPOCHS_FULL = 40
LR_HEAD = 1e-3
LR_FULL = 1e-4
WEIGHT_DECAY = 1e-4
LABEL_SMOOTHING = 0.1
PATIENCE = 6


def macro_f1(confusion: torch.Tensor) -> tuple[float, list[float]]:
    """Macro-averaged F1 from a confusion matrix of counts.

    A class the model never predicts and that never appears would give 0/0; it
    scores 0.0 here rather than being skipped, so the average cannot be
    flattered by ignoring a class the model failed on entirely.
    """
    per_class = []
    for index in range(confusion.size(0)):
        true_positive = confusion[index, index].item()
        predicted = confusion[:, index].sum().item()
        actual = confusion[index, :].sum().item()

        precision = true_positive / predicted if predicted else 0.0
        recall = true_positive / actual if actual else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall)
            else 0.0
        )
        per_class.append(f1)
    return sum(per_class) / len(per_class), per_class


@torch.no_grad()
def evaluate(model: nn.Module, loader, device: torch.device) -> dict:
    model.eval()
    size = len(REPORT_CLASSES)
    confusion = torch.zeros(size, size, dtype=torch.long)

    for image, spatial, context, label in loader:
        logits = model(image.to(device), spatial.to(device), context.to(device))
        predicted = logits.argmax(dim=1).cpu()
        for truth, guess in zip(label, predicted):
            confusion[truth, guess] += 1

    correct = confusion.diag().sum().item()
    total = confusion.sum().item()
    f1, per_class = macro_f1(confusion)

    # Macro precision and recall, which the report quotes alongside F1.
    precisions, recalls = [], []
    for index in range(size):
        true_positive = confusion[index, index].item()
        predicted_count = confusion[:, index].sum().item()
        actual_count = confusion[index, :].sum().item()
        precisions.append(true_positive / predicted_count if predicted_count else 0.0)
        recalls.append(true_positive / actual_count if actual_count else 0.0)

    return {
        "accuracy": correct / total if total else 0.0,
        "macro_f1": f1,
        "macro_precision": sum(precisions) / size,
        "macro_recall": sum(recalls) / size,
        "per_class_f1": dict(zip(REPORT_CLASSES, per_class)),
        "per_class_recall": dict(zip(REPORT_CLASSES, recalls)),
        "confusion": confusion.tolist(),
    }


def run_epoch(model, loader, criterion, optimiser, scheduler, device) -> float:
    model.train()
    running, seen = 0.0, 0

    for image, spatial, context, label in loader:
        image = image.to(device)
        spatial = spatial.to(device)
        context = context.to(device)
        label = label.to(device)

        optimiser.zero_grad()
        loss = criterion(model(image, spatial, context), label)
        loss.backward()
        optimiser.step()
        if scheduler is not None:
            scheduler.step()

        running += loss.item() * label.size(0)
        seen += label.size(0)

    return running / max(1, seen)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs-head", type=int, default=EPOCHS_HEAD)
    parser.add_argument("--epochs-full", type=int, default=EPOCHS_FULL)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument(
        "--limit-train",
        type=int,
        default=0,
        help="train on this many rows only; for checking the loop runs, not for results",
    )
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device          {device}")

    train_loader, val_loader, test_loader, imputation = build_loaders(
        SPLIT_DIR, batch_size=args.batch_size, workers=args.workers
    )

    if args.limit_train:
        train_loader.dataset.rows = train_loader.dataset.rows[: args.limit_train]

    print(f"train/val/test  {len(train_loader.dataset)}/"
          f"{len(val_loader.dataset)}/{len(test_loader.dataset)}")

    model = WasteNet().to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)

    best_f1 = -1.0
    best_state = None
    epochs_without_gain = 0
    history = []
    started = time.time()

    for phase, (epochs, learning_rate, frozen) in enumerate(
        [(args.epochs_head, LR_HEAD, True), (args.epochs_full, LR_FULL, False)], start=1
    ):
        if epochs <= 0:
            continue

        model.freeze_image_encoder(frozen)
        trainable = [p for p in model.parameters() if p.requires_grad]
        optimiser = torch.optim.AdamW(trainable, lr=learning_rate, weight_decay=WEIGHT_DECAY)

        # Cosine decay over phase 2 only, as Table 6.2 specifies.
        scheduler = (
            torch.optim.lr_scheduler.CosineAnnealingLR(
                optimiser, T_max=epochs * len(train_loader)
            )
            if not frozen
            else None
        )

        print(f"\nphase {phase}  encoder {'frozen' if frozen else 'unfrozen'}  "
              f"lr {learning_rate}  epochs {epochs}")

        for epoch in range(1, epochs + 1):
            loss = run_epoch(model, train_loader, criterion, optimiser, scheduler, device)
            metrics = evaluate(model, val_loader, device)
            history.append({"phase": phase, "epoch": epoch, "loss": loss, **{
                k: v for k, v in metrics.items() if k not in ("confusion", "per_class_f1", "per_class_recall")
            }})

            marker = ""
            if metrics["macro_f1"] > best_f1:
                best_f1 = metrics["macro_f1"]
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
                epochs_without_gain = 0
                marker = "  <- best"
            else:
                epochs_without_gain += 1

            print(f"  epoch {epoch:>2}  loss {loss:.4f}  "
                  f"val acc {metrics['accuracy']:.4f}  "
                  f"val macroF1 {metrics['macro_f1']:.4f}{marker}")

            if epochs_without_gain >= PATIENCE:
                print(f"  early stop: {PATIENCE} epochs without improvement")
                break

        if epochs_without_gain >= PATIENCE:
            break

    if best_state is not None:
        model.load_state_dict(best_state)

    print("\nevaluating the selected checkpoint on the held-out test split")
    test_metrics = evaluate(model, test_loader, device)

    print(f"  accuracy        {test_metrics['accuracy']:.4f}")
    print(f"  macro-F1        {test_metrics['macro_f1']:.4f}")
    print(f"  macro-precision {test_metrics['macro_precision']:.4f}")
    print(f"  macro-recall    {test_metrics['macro_recall']:.4f}")
    print("\n  per class        F1    recall")
    for name in REPORT_CLASSES:
        print(f"    {name:<12} {test_metrics['per_class_f1'][name]:.4f}    "
              f"{test_metrics['per_class_recall'][name]:.4f}")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    checkpoint_path = ARTIFACTS_DIR / f"{OUT_STEM}.pt"
    torch.save(
        {
            "state_dict": model.state_dict(),
            "classes": REPORT_CLASSES,
            "imputation": imputation,
        },
        checkpoint_path,
    )

    metrics_path = ARTIFACTS_DIR / f"{OUT_STEM}_metrics.json"
    metrics_path.write_text(
        json.dumps(
            {
                "classes": REPORT_CLASSES,
                "test": test_metrics,
                "best_val_macro_f1": best_f1,
                "history": history,
                "minutes": round((time.time() - started) / 60, 2),
                "train_rows": len(train_loader.dataset),
                "val_rows": len(val_loader.dataset),
                "test_rows": len(test_loader.dataset),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\nsaved           {checkpoint_path}")
    print(f"saved           {metrics_path}")
    print(f"took            {(time.time() - started) / 60:.1f} min")


if __name__ == "__main__":
    main()

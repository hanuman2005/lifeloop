"""Two-phase transfer learning for the waste classifier.

    python scripts/train.py                          # defaults
    python scripts/train.py --backbone resnet18      # comparison baseline
    python scripts/train.py --phase-b-epochs 30

Phase A trains only the new classification head with the backbone frozen: the head
starts as random noise, and letting its large early gradients flow into pretrained
features would damage them.

Phase B unfreezes everything at a ten-times-smaller learning rate. The small rate is
the point — fine-tuning at phase A's rate destroys the ImageNet features the whole
approach depends on (catastrophic forgetting).
"""

import argparse
import json
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data, model as model_lib  # noqa: E402
from wasteml.metrics import macro_f1, per_class_report  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()


def run_epoch(model, loader, criterion, optimizer, device):
    """One pass. Training when an optimizer is given, evaluation otherwise."""
    training = optimizer is not None
    model.train(training)

    total_loss = 0.0
    all_preds, all_targets = [], []

    with torch.set_grad_enabled(training):
        for images, targets in loader:
            images, targets = images.to(device), targets.to(device)

            logits = model(images)
            loss = criterion(logits, targets)

            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            all_preds.extend(logits.argmax(1).cpu().tolist())
            all_targets.extend(targets.cpu().tolist())

    n = max(1, len(all_targets))
    accuracy = sum(p == t for p, t in zip(all_preds, all_targets)) / n
    return total_loss / n, accuracy, macro_f1(all_targets, all_preds)


def train_phase(name, model, epochs, lr, params, loaders, criterion, device, state):
    """Shared loop for both phases, tracking the best validation macro-F1."""
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=config.WEIGHT_DECAY)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(1, epochs))
    train_loader, val_loader = loaders

    print(f"\n── Phase {name}: {epochs} epochs at lr={lr} " + "─" * 30)

    for epoch in range(1, epochs + 1):
        started = time.time()
        tr_loss, tr_acc, tr_f1 = run_epoch(model, train_loader, criterion, optimizer, device)
        va_loss, va_acc, va_f1 = run_epoch(model, val_loader, criterion, None, device)
        scheduler.step()

        marker = ""
        if va_f1 > state["best_f1"]:
            state["best_f1"] = va_f1
            state["best_epoch"] = state["epochs_run"] + epoch
            state["patience"] = 0
            state["best_state"] = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            marker = "  ← best"
        else:
            state["patience"] += 1

        print(
            f"  {epoch:>2}/{epochs}  "
            f"train loss {tr_loss:.3f} acc {tr_acc:.3f} f1 {tr_f1:.3f}  |  "
            f"val loss {va_loss:.3f} acc {va_acc:.3f} f1 {va_f1:.3f}  "
            f"[{time.time() - started:.0f}s]{marker}"
        )

        # Overfitting is expected on a dataset this size; stopping early is how we
        # keep the deployed weights from being the memorised ones.
        if state["patience"] >= config.EARLY_STOP_PATIENCE:
            print(f"  early stop: no val improvement in {config.EARLY_STOP_PATIENCE} epochs")
            break

    state["epochs_run"] += epochs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backbone", default=model_lib.DEFAULT_BACKBONE, choices=sorted(model_lib.BACKBONES))
    parser.add_argument("--batch-size", type=int, default=config.BATCH_SIZE)
    parser.add_argument("--phase-a-epochs", type=int, default=config.PHASE_A_EPOCHS)
    parser.add_argument("--phase-b-epochs", type=int, default=config.PHASE_B_EPOCHS)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    train_csv = config.SPLITS_DIR / "train.csv"
    val_csv = config.SPLITS_DIR / "val.csv"
    if not train_csv.exists():
        print(f"❌ {train_csv} not found. Run scripts/prepare_dataset.py first.")
        return 1

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🖥️  device: {device}")
    if device == "cpu":
        print("    No GPU. Fine for a smoke test; use Colab's T4 for a real run.")

    train_loader = data.make_loader(train_csv, train=True, batch_size=args.batch_size)
    val_loader = data.make_loader(val_csv, train=False, batch_size=args.batch_size)
    print(f"📊 train {len(train_loader.dataset)} · val {len(val_loader.dataset)}")

    model = model_lib.build_model(args.backbone).to(device)

    weights = data.class_weights(train_csv).to(device)
    print("⚖️  class weights: " + ", ".join(f"{c}={w:.2f}" for c, w in zip(config.CLASSES, weights.tolist())))
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)

    state = {"best_f1": 0.0, "best_epoch": 0, "patience": 0, "best_state": None, "epochs_run": 0}
    loaders = (train_loader, val_loader)

    model_lib.set_backbone_trainable(model, args.backbone, trainable=False)
    train_phase("A (frozen backbone)", model, args.phase_a_epochs, config.PHASE_A_LR,
                model_lib.head_parameters(model, args.backbone), loaders, criterion, device, state)

    model_lib.set_backbone_trainable(model, args.backbone, trainable=True)
    train_phase("B (fine-tune)", model, args.phase_b_epochs, config.PHASE_B_LR,
                model.parameters(), loaders, criterion, device, state)

    if state["best_state"] is None:
        print("❌ No epoch completed.")
        return 1

    model.load_state_dict(state["best_state"])
    model.to(device)

    _, val_acc, val_f1 = run_epoch(model, val_loader, criterion, None, device)
    report = per_class_report(model, val_loader, device)

    print(f"\n🏁 best epoch {state['best_epoch']} · val acc {val_acc:.3f} · val macro-F1 {val_f1:.3f}")
    print("\nPer-class on validation:")
    for cls, row in report.items():
        print(f"  {cls:<12} P {row['precision']:.3f}  R {row['recall']:.3f}  F1 {row['f1']:.3f}  n={row['support']}")

    out = args.out or (config.ARTIFACTS_DIR / f"waste_{args.backbone}.pt")
    model_lib.save_checkpoint(
        out, model, args.backbone,
        {"val_accuracy": val_acc, "val_macro_f1": val_f1, "best_epoch": state["best_epoch"], "per_class": report},
    )
    print(f"\n💾 {out}")
    print(f"   next: python scripts/evaluate.py --checkpoint {out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

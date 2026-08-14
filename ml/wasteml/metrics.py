"""Metrics, calibration, and abstention.

Plain accuracy is the wrong headline number for this dataset. With Plastic at ~350
images and Hazardous at ~150, a model that never predicts Hazardous can still post a
respectable accuracy while failing at the one class with real-world consequences.
Macro-F1 weights every class equally and exposes that.
"""

import numpy as np
import torch
import torch.nn.functional as F

from . import config


def macro_f1(targets, preds, classes: list = None) -> float:
    """Unweighted mean of per-class F1. Classes with no support are skipped."""
    n_classes = len(classes) if classes else config.NUM_CLASSES
    scores = []
    for idx in range(n_classes):
        tp = sum(1 for t, p in zip(targets, preds) if t == idx and p == idx)
        fp = sum(1 for t, p in zip(targets, preds) if t != idx and p == idx)
        fn = sum(1 for t, p in zip(targets, preds) if t == idx and p != idx)

        if tp + fn == 0:
            continue  # class absent from this split

        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn)
        scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)

    return float(np.mean(scores)) if scores else 0.0


@torch.no_grad()
def collect_logits(model, loader, device):
    """Run the model over a loader, returning raw logits and targets."""
    model.eval()
    logits, targets = [], []
    for images, batch_targets in loader:
        logits.append(model(images.to(device)).cpu())
        targets.append(batch_targets)
    return torch.cat(logits), torch.cat(targets)


def per_class_report(model, loader, device, classes: list = None) -> dict:
    """Per-class precision/recall/F1 over the model's own class list."""
    classes = list(classes) if classes else list(config.CLASSES)

    logits, targets = collect_logits(model, loader, device)
    preds = logits.argmax(1)

    report = {}
    for idx, name in enumerate(classes):
        tp = int(((preds == idx) & (targets == idx)).sum())
        fp = int(((preds == idx) & (targets != idx)).sum())
        fn = int(((preds != idx) & (targets == idx)).sum())

        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

        report[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": tp + fn,
        }
    return report


def confusion_matrix(logits, targets, classes: list = None) -> list:
    """Rows are true classes, columns predicted. The most informative single artifact
    in the evaluation — it names which pairs the model actually confuses."""
    n_classes = len(classes) if classes else config.NUM_CLASSES
    preds = logits.argmax(1)
    matrix = np.zeros((n_classes, n_classes), dtype=int)
    for t, p in zip(targets.tolist(), preds.tolist()):
        matrix[t][p] += 1
    return matrix.tolist()


def expected_calibration_error(probs, targets, n_bins: int = 10) -> float:
    """How far the stated confidence is from the observed accuracy.

    A well-calibrated model that says "90%" is right 90% of the time. Neural networks
    are systematically overconfident, and this app prints that number to the user, so
    the gap has to be measured rather than assumed away.
    """
    confidences, preds = probs.max(1)
    correct = preds.eq(targets).float()

    error = 0.0
    bins = torch.linspace(0, 1, n_bins + 1)
    for lo, hi in zip(bins[:-1], bins[1:]):
        in_bin = (confidences > lo) & (confidences <= hi)
        if in_bin.sum() == 0:
            continue
        share = in_bin.float().mean()
        error += (correct[in_bin].mean() - confidences[in_bin].mean()).abs() * share

    return float(error)


def fit_temperature(logits, targets, max_iter: int = 200) -> float:
    """Temperature scaling: one scalar, fitted on validation, dividing the logits.

    It cannot change which class wins, so accuracy is untouched — it only rescales
    the confidence into something honest. The cheapest credible calibration method.
    """
    log_t = torch.zeros(1, requires_grad=True)
    optimizer = torch.optim.LBFGS([log_t], lr=0.05, max_iter=max_iter)

    def closure():
        optimizer.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), targets)
        loss.backward()
        return loss

    optimizer.step(closure)
    return float(log_t.exp().item())


def abstention_curve(probs, targets, thresholds=None) -> list:
    """Coverage against accuracy as the confidence cutoff rises.

    Reading this table is how the deployed threshold gets chosen: it makes the
    tradeoff explicit rather than picking a round number.
    """
    if thresholds is None:
        thresholds = [0.0, 0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9]

    confidences, preds = probs.max(1)
    correct = preds.eq(targets)
    total = len(targets)

    rows = []
    for threshold in thresholds:
        kept = confidences >= threshold
        n_kept = int(kept.sum())
        rows.append(
            {
                "threshold": threshold,
                "coverage": round(n_kept / total, 4) if total else 0.0,
                "accuracy_on_kept": round(float(correct[kept].float().mean()), 4) if n_kept else None,
                "abstained": total - n_kept,
            }
        )
    return rows

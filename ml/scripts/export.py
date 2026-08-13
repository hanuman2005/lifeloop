"""Export a trained checkpoint to a self-contained, servable bundle.

    python scripts/export.py --checkpoint waste_mobilenet_v3_small.pt
    python scripts/export.py --checkpoint waste_mobilenet_v3_small.pt --no-quantize

Produces artifacts/<name>_bundle/ containing the ONNX graph, an int8-quantized
variant, the label order, the preprocessing contract, and the calibration thresholds.

Weights alone are not a deliverable. Served without the label order the outputs map to
the wrong classes; served without the preprocessing spec the inputs are wrong in a way
that degrades accuracy silently. The bundle keeps all four together.

**Parity is checked, not assumed.** An export that quietly diverges from the PyTorch
model is worse than no export: evaluation reports one model's accuracy while production
runs another. This script compares both graphs against the trained model on real test
images and fails if they disagree.

ONNX is the target because it is verifiable here and runs under onnxruntime on the same
machine. The TFLite conversion for true on-device inference is a later step; it needs a
separate toolchain, and exporting to a format that cannot be checked would defeat the
purpose of this script.
"""

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data, model as model_lib  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

# Tolerances for PyTorch-vs-ONNX agreement.
#
# float32 export should be near-exact, so anything above 1e-4 signals a real graph
# difference rather than arithmetic noise. Quantization genuinely changes the numbers,
# so int8 is judged on whether it still predicts the same class and keeps confidence
# close, not on raw logit equality.
FLOAT_TOLERANCE = 1e-4
INT8_MAX_PROB_DRIFT = 0.05
INT8_MIN_AGREEMENT = 0.98


def sample_inputs(limit: int) -> torch.Tensor:
    """Real test images if available, random noise otherwise.

    Random tensors exercise the graph but not the input distribution the model
    actually sees, so quantization error measured on noise is not trustworthy.
    """
    test_csv = config.SPLITS_DIR / "test.csv"
    if not test_csv.exists():
        print("⚠️  No test split found — checking parity on random tensors instead.")
        print("    Quantization error on noise is not representative; re-run after")
        print("    scripts/prepare_dataset.py for a meaningful figure.")
        return torch.randn(limit, 3, config.IMAGE_SIZE, config.IMAGE_SIZE)

    loader = data.make_loader(test_csv, train=False, batch_size=limit)
    images, _ = next(iter(loader))
    return images


def to_onnx(model, path: Path, opset: int) -> None:
    dummy = torch.randn(1, 3, config.IMAGE_SIZE, config.IMAGE_SIZE)

    kwargs = dict(
        input_names=["image"],
        output_names=["logits"],
        # Batch stays dynamic so the same graph serves one image or a batch.
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=opset,
        do_constant_folding=True,
    )

    try:
        # torch 2.6+ defaults to the dynamo exporter, which requires onnxscript.
        # That package has no wheel for Python 3.13, so ask for the TorchScript
        # exporter explicitly. It is the older path but fully sufficient for a
        # static CNN, and the parity check below proves the result either way.
        torch.onnx.export(model, dummy, str(path), dynamo=False, **kwargs)
    except TypeError:
        # Older torch has no `dynamo` argument and uses TorchScript regardless.
        torch.onnx.export(model, dummy, str(path), **kwargs)


def run_onnx(path: Path, batch: torch.Tensor) -> np.ndarray:
    import onnxruntime as ort

    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    return session.run(None, {name: batch.numpy()})[0]


def softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def check_parity(name, reference_logits, candidate_logits, float_export: bool) -> bool:
    """Compare an exported graph against the PyTorch reference."""
    max_diff = float(np.abs(reference_logits - candidate_logits).max())

    ref_pred = reference_logits.argmax(axis=1)
    cand_pred = candidate_logits.argmax(axis=1)
    agreement = float((ref_pred == cand_pred).mean())

    ref_probs = softmax(reference_logits)
    cand_probs = softmax(candidate_logits)
    prob_drift = float(np.abs(ref_probs.max(axis=1) - cand_probs.max(axis=1)).max())

    print(f"\n  {name}")
    print(f"    max logit difference   {max_diff:.6f}")
    print(f"    prediction agreement   {agreement:.4f}")
    print(f"    max confidence drift   {prob_drift:.4f}")

    if float_export:
        ok = max_diff <= FLOAT_TOLERANCE
        if not ok:
            print(f"    ❌ exceeds {FLOAT_TOLERANCE} — the exported graph is not the trained model")
    else:
        ok = agreement >= INT8_MIN_AGREEMENT and prob_drift <= INT8_MAX_PROB_DRIFT
        if not ok:
            print(
                f"    ❌ quantization changed behaviour beyond tolerance "
                f"(need agreement ≥ {INT8_MIN_AGREEMENT}, drift ≤ {INT8_MAX_PROB_DRIFT})"
            )

    if ok:
        print("    ✅ parity holds")
    return ok


def benchmark(path: Path, runs: int = 20) -> float:
    """Median single-image latency, which is what the served endpoint experiences."""
    import onnxruntime as ort

    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    single = np.random.randn(1, 3, config.IMAGE_SIZE, config.IMAGE_SIZE).astype(np.float32)

    session.run(None, {name: single})  # warm up; the first call includes setup cost

    timings = []
    for _ in range(runs):
        started = time.perf_counter()
        session.run(None, {name: single})
        timings.append((time.perf_counter() - started) * 1000)
    return float(np.median(timings))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", default="waste_mobilenet_v3_small.pt")
    parser.add_argument("--opset", type=int, default=17)
    parser.add_argument("--samples", type=int, default=16)
    # Off by default. Dynamic quantization targets Linear-heavy models (transformers,
    # RNNs); on a convolutional network it degrades accuracy badly and, without fused
    # int8 conv kernels, runs slower than float32. Measured on MobileNetV3-Small:
    # prediction agreement 0.56 and 33 ms versus 1.6 ms. Static quantization with a
    # calibration set is the correct route, and it needs the real dataset.
    parser.add_argument(
        "--quantize",
        action="store_true",
        help="also emit a dynamically quantized int8 graph (usually a bad trade for a CNN)",
    )
    args = parser.parse_args()

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.is_absolute() and not ckpt_path.exists():
        ckpt_path = config.ARTIFACTS_DIR / ckpt_path
    if not ckpt_path.exists():
        print(f"❌ {ckpt_path} not found. Train a model first.")
        return 1

    model, blob = model_lib.load_checkpoint(ckpt_path, device="cpu")
    print(f"📦 {ckpt_path.name} · {blob['backbone']} · {config.NUM_CLASSES} classes")

    bundle = config.ARTIFACTS_DIR / f"{ckpt_path.stem}_bundle"
    bundle.mkdir(parents=True, exist_ok=True)

    onnx_path = bundle / "model.onnx"
    print(f"\n🔄 exporting to ONNX (opset {args.opset})")
    to_onnx(model, onnx_path, args.opset)

    import onnx

    onnx.checker.check_model(onnx.load(str(onnx_path)))
    print(f"   {onnx_path.name}  {onnx_path.stat().st_size / 1e6:.2f} MB")

    batch = sample_inputs(args.samples)
    with torch.no_grad():
        reference = model(batch).numpy()

    print(f"\n🔍 parity against PyTorch on {len(batch)} images")
    all_ok = check_parity("model.onnx (float32)", reference, run_onnx(onnx_path, batch), True)

    quant_path = None
    if args.quantize:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        quant_path = bundle / "model_int8.onnx"
        print("\n🔄 quantizing to int8 (dynamic)")
        quantize_dynamic(
            model_input=str(onnx_path),
            model_output=str(quant_path),
            weight_type=QuantType.QInt8,
        )
        print(f"   {quant_path.name}  {quant_path.stat().st_size / 1e6:.2f} MB")

        if not check_parity("model_int8.onnx", reference, run_onnx(quant_path, batch), False):
            # A graph that disagrees with the trained model must not be left in a
            # bundle someone might serve. The float32 export is verified and stands
            # on its own, so the export is still usable — minus this file.
            quant_path.unlink()
            quant_path = None
            print("\n⚠️  int8 graph deleted — it did not match the trained model.")
            print("    Dynamic quantization suits Linear-heavy models, not CNNs.")
            print("    For on-device size, use static quantization with a calibration")
            print("    set drawn from the real training data.")

    # ── Sidecars: the graph is useless without these ────────────────────────
    (bundle / "labels.json").write_text(
        json.dumps(
            {
                "classes": config.CLASSES,
                "material_classes": config.MATERIAL_CLASSES,
                "not_waste_class": config.NOT_WASTE_CLASS,
                # Spelled out because index order is the contract between the graph's
                # output vector and the class names.
                "index_order": {i: name for i, name in enumerate(config.CLASSES)},
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (bundle / "preprocess.json").write_text(
        json.dumps(config.preprocess_spec(), indent=2), encoding="utf-8"
    )

    thresholds_src = ckpt_path.with_name(f"{ckpt_path.stem}_thresholds.json")
    if thresholds_src.exists():
        shutil.copy2(thresholds_src, bundle / "thresholds.json")
    else:
        print(
            "\n⚠️  No thresholds file. The bundle carries no calibration, so a consumer\n"
            "    will show raw overconfident scores. Run scripts/evaluate.py first."
        )

    card_src = ckpt_path.with_name(f"{ckpt_path.stem}_MODEL_CARD.md")
    if card_src.exists():
        shutil.copy2(card_src, bundle / "MODEL_CARD.md")

    print("\n⏱️  median single-image latency")
    print(f"    float32  {benchmark(onnx_path):.1f} ms")
    if quant_path:
        print(f"    int8     {benchmark(quant_path):.1f} ms")

    print(f"\n💾 {bundle}")
    for item in sorted(bundle.iterdir()):
        print(f"    {item.name:<22} {item.stat().st_size / 1e3:>9.1f} KB")

    if not all_ok:
        print("\n❌ Parity check failed. Do not serve this bundle.")
        return 1

    print("\n✅ Bundle exported and verified against the trained model.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

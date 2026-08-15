"""Convert the exported ONNX graph to TFLite for on-device inference.

    python scripts/export_tflite.py --checkpoint waste_mobilenet_v3_small.pt
    python scripts/export_tflite.py --no-quantize

Run `scripts/export.py` first — this consumes the ONNX graph that produces, rather
than re-exporting from PyTorch, so both artifacts are provably the same graph.

## Why the conversion goes through ONNX

There is no direct, reliable PyTorch to TFLite path on this machine. Google's
`ai-edge-torch` is the official route and has no wheel for Python 3.13, so pip
refuses to resolve it. `onnx2tf` converts the ONNX graph to a TensorFlow
SavedModel, which TFLite then consumes. It also handles the layout change that
makes this conversion awkward: PyTorch is NCHW, TensorFlow is NHWC, and a naive
conversion inserts transposes around every convolution that ruin mobile latency.

## On quantization

Dynamic-range quantization is applied by default here, unlike in `export.py` where
it is off. The reason is that the two are different operations despite the shared
name: ONNX Runtime's dynamic quantization has no fused int8 convolution kernels for
this graph and made it slower and far less accurate, whereas TFLite's converter
quantizes weights and keeps activations in float, which is well supported for
convolutional networks and is the standard mobile deployment.

Parity is still checked rather than assumed. If the quantized model disagrees with
the float one beyond tolerance, it is deleted rather than left in the bundle.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wasteml import config, data  # noqa: E402
from wasteml.console import enable_utf8  # noqa: E402

enable_utf8()

# TFLite float conversion is near-lossless; anything larger is a real graph
# difference. Quantization genuinely changes the numbers, so it is judged on
# whether it still predicts the same class.
FLOAT_TOLERANCE = 1e-3
INT8_MIN_AGREEMENT = 0.95
INT8_MAX_PROB_DRIFT = 0.10


def sample_inputs(limit: int, classes=None):
    """Real test images where available; the input distribution matters for
    judging quantization error, which noise would misrepresent."""
    test_csv = config.SPLITS_DIR / "test.csv"
    if not test_csv.exists():
        print("⚠️  No test split — checking parity on random tensors.")
        print("    Quantization error on noise is not representative.")
        return np.random.randn(limit, 3, config.IMAGE_SIZE, config.IMAGE_SIZE).astype(np.float32)

    loader = data.make_loader(test_csv, train=False, batch_size=limit, classes=classes)
    images, _ = next(iter(loader))
    return images.numpy().astype(np.float32)


def run_onnx(path: Path, batch: np.ndarray) -> np.ndarray:
    import onnxruntime as ort

    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    return session.run(None, {name: batch})[0]


def run_tflite(path: Path, batch_nhwc: np.ndarray) -> np.ndarray:
    import tensorflow as tf

    interpreter = tf.lite.Interpreter(model_path=str(path))
    input_detail = interpreter.get_input_details()[0]

    # The converted graph has a fixed batch of 1, so resize before allocating.
    interpreter.resize_tensor_input(input_detail["index"], [1, *batch_nhwc.shape[1:]])
    interpreter.allocate_tensors()

    input_detail = interpreter.get_input_details()[0]
    output_detail = interpreter.get_output_details()[0]

    outputs = []
    for sample in batch_nhwc:
        interpreter.set_tensor(input_detail["index"], sample[None, ...].astype(np.float32))
        interpreter.invoke()
        outputs.append(interpreter.get_tensor(output_detail["index"])[0])
    return np.stack(outputs)


def softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def check_parity(name, reference, candidate, float_export: bool) -> bool:
    max_diff = float(np.abs(reference - candidate).max())
    agreement = float((reference.argmax(axis=1) == candidate.argmax(axis=1)).mean())
    drift = float(np.abs(softmax(reference).max(axis=1) - softmax(candidate).max(axis=1)).max())

    print(f"\n  {name}")
    print(f"    max logit difference   {max_diff:.6f}")
    print(f"    prediction agreement   {agreement:.4f}")
    print(f"    max confidence drift   {drift:.4f}")

    if float_export:
        ok = max_diff <= FLOAT_TOLERANCE
        if not ok:
            print(f"    ❌ exceeds {FLOAT_TOLERANCE} — the converted graph is not the same model")
    else:
        ok = agreement >= INT8_MIN_AGREEMENT and drift <= INT8_MAX_PROB_DRIFT
        if not ok:
            print(
                f"    ❌ quantization changed behaviour beyond tolerance "
                f"(need agreement ≥ {INT8_MIN_AGREEMENT}, drift ≤ {INT8_MAX_PROB_DRIFT})"
            )

    if ok:
        print("    ✅ parity holds")
    return ok


def benchmark(path: Path, runs: int = 20) -> float:
    import tensorflow as tf

    interpreter = tf.lite.Interpreter(model_path=str(path))
    interpreter.allocate_tensors()
    input_detail = interpreter.get_input_details()[0]
    sample = np.random.randn(*input_detail["shape"]).astype(np.float32)

    interpreter.set_tensor(input_detail["index"], sample)
    interpreter.invoke()  # warm up

    timings = []
    for _ in range(runs):
        started = time.perf_counter()
        interpreter.set_tensor(input_detail["index"], sample)
        interpreter.invoke()
        timings.append((time.perf_counter() - started) * 1000)
    return float(np.median(timings))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", default="waste_mobilenet_v3_small.pt")
    parser.add_argument("--samples", type=int, default=16)
    parser.add_argument("--no-quantize", action="store_true")
    args = parser.parse_args()

    stem = Path(args.checkpoint).stem
    bundle = config.ARTIFACTS_DIR / f"{stem}_bundle"
    onnx_path = bundle / "model.onnx"

    if not onnx_path.exists():
        print(f"❌ {onnx_path} not found.")
        print(f"   Run: python scripts/export.py --checkpoint {args.checkpoint}")
        return 1

    labels_path = bundle / "labels.json"
    classes = json.loads(labels_path.read_text(encoding="utf-8"))["classes"] if labels_path.exists() else None

    print(f"\n📦 {onnx_path.relative_to(config.ML_ROOT)}")
    if classes:
        print(f"🏷️  {len(classes)} classes: {', '.join(classes)}")

    # onnx2tf writes a SavedModel plus its own TFLite variants into a directory.
    with tempfile.TemporaryDirectory() as workdir:
        work = Path(workdir)
        print("\n🔄 converting ONNX to TensorFlow (onnx2tf)")

        result = subprocess.run(
            [
                sys.executable, "-m", "onnx2tf",
                "-i", str(onnx_path),
                "-o", str(work),
                "-osd",              # also emit a SavedModel
                "--non_verbose",
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            print("❌ onnx2tf failed:")
            print((result.stderr or result.stdout)[-1500:])
            return 1

        produced = sorted(work.glob("*.tflite"))
        if not produced:
            print("❌ onnx2tf produced no .tflite file")
            return 1

        # onnx2tf emits several variants; the plain float32 one is the reference.
        float_candidates = [p for p in produced if "float32" in p.name] or produced
        float_model = float_candidates[0]

        bundle.mkdir(parents=True, exist_ok=True)
        float_out = bundle / "model_float32.tflite"
        shutil.copy2(float_model, float_out)
        print(f"   {float_out.name}  {float_out.stat().st_size / 1024:.1f} KB")

        quant_out = None
        if not args.no_quantize:
            quant_candidates = [
                p for p in produced
                if "dynamic_range" in p.name or "integer_quant" in p.name or "int8" in p.name
            ]
            if quant_candidates:
                quant_out = bundle / "model_int8.tflite"
                shutil.copy2(quant_candidates[0], quant_out)
                print(f"   {quant_out.name}  {quant_out.stat().st_size / 1024:.1f} KB")
            else:
                print("   (no quantized variant produced)")

    # ── Parity ──────────────────────────────────────────────────────────────
    print(f"\n🔍 parity against the ONNX graph on {args.samples} images")

    batch_nchw = sample_inputs(args.samples, classes)
    reference = run_onnx(onnx_path, batch_nchw)

    # onnx2tf converts to NHWC, so the same images must be laid out that way.
    batch_nhwc = np.transpose(batch_nchw, (0, 2, 3, 1))

    ok = check_parity("model_float32.tflite", reference, run_tflite(float_out, batch_nhwc), True)
    if not ok:
        print("\n❌ The float TFLite graph does not match the ONNX model. Not shipping it.")
        float_out.unlink(missing_ok=True)
        return 1

    if quant_out:
        if not check_parity("model_int8.tflite", reference, run_tflite(quant_out, batch_nhwc), False):
            print("    removing the quantized model rather than leaving it servable")
            quant_out.unlink(missing_ok=True)
            quant_out = None

    print("\n⏱️  median single-image latency")
    print(f"    float32  {benchmark(float_out):.1f} ms")
    if quant_out:
        print(f"    int8     {benchmark(quant_out):.1f} ms")

    # The layout difference is the one thing a mobile consumer must be told.
    (bundle / "tflite.json").write_text(
        json.dumps(
            {
                "input_layout": "NHWC",
                "input_shape": [1, config.IMAGE_SIZE, config.IMAGE_SIZE, 3],
                "note": (
                    "Converted from ONNX via onnx2tf, so the input is NHWC while the "
                    "PyTorch and ONNX graphs are NCHW. Preprocessing is otherwise "
                    "identical to preprocess.json."
                ),
                "float32": float_out.name,
                "int8": quant_out.name if quant_out else None,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\n✅ TFLite written to {bundle.name}, verified against the ONNX graph.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

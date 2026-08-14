# LifeLoop Waste Classifier (M1)

Nine-class image classifier that tells the app what a photographed item is made of.
Trained here, on locally collected data. No hosted vision API.

```
Plastic · Glass · Metal · Paper · Organic · Electronic · Textile · Wood · Hazardous
```

---

## Why classification and not detection

The synopsis proposes YOLOv8. Detection answers *"what objects are where"* and needs
bounding boxes drawn by hand on every training image. Classification answers *"what is
this image of"* and needs a photograph dropped into a folder.

The product photographs one item filling the frame. Boxes buy nothing and cost roughly
five times the annotation effort.

## Why the model only outputs two fields

`CATEGORY_ADVICE` in `LifeLoop/src/screens/WasteAnalyzer.js` already holds recycling
guidance, impact figures, and action probabilities for every material. The classifier
supplies `material` and `confidence`; `MATERIAL_RULES` in
`backend/controllers/aiController.js` supplies the rest.

That is what makes a 2.5M-parameter model a viable replacement for a large
vision-language model here — most of what the LLM produced was never used.

---

## Setup

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

There is no GPU on the development machine. Train on Google Colab's free T4 and
download the checkpoint; ~2 minutes per epoch there versus ~40 on CPU.

---

## Workflow

### 1. Collect

Photographs go in `data/raw/<Class>/`, metadata in `data/metadata.csv`. Rules,
ambiguous-case table, and per-class targets are in
[LABELLING-POLICY.md](./LABELLING-POLICY.md); where the photographs come from, who
takes them, and in what order is in [COLLECTION-PLAN.md](./COLLECTION-PLAN.md).

```bash
cp data/metadata.template.csv data/metadata.csv     # once

# import a session's photographs: renames, groups, and records them
python scripts/new_batch.py --class Plastic --collector HM --inbox ~/phone/today \
    --group-size 3 --condition crushed --background road --lighting sun --area street

# audit against the policy — run after every import
python scripts/check_dataset.py
```

`new_batch.py` generates `Plastic_HM_0042.jpg`-style names, allocates the `object_id`
shared by shots of one physical object, and writes the metadata row. Doing that by hand
is where the `object_id` gets forgotten, and a forgotten `object_id` is invisible until
it has already inflated the test score.

`check_dataset.py` catches mislabelled folders, orphan metadata, cross-class
`object_id`s, duplicate images, out-of-vocabulary metadata, thin classes, missing
variation, and split leakage. Run it with `--strict` before training.

### 2. Prepare

```bash
python scripts/prepare_dataset.py
```

Builds `data/manifest.csv` and `data/splits/{train,val,test}.csv`, reports per-class
counts, and **refuses to emit a split that leaks**.

The split is stratified by class and disjoint by `object_id`. Every photograph of one
physical object is confined to a single split. Without that, near-duplicates straddle
train and test, and the reported accuracy silently overstates reality.

Images ingested from public datasets go to **train only**. They are studio photographs
of single items on plain backgrounds, so a test set containing them measures a
different problem from the one the app solves — and validation is where the confidence
the app shows users gets calibrated. `--allow-public-holdout` lifts the restriction and
says so in the output.

### 3. Train

```bash
python scripts/train.py                        # mobilenet_v3_small
python scripts/train.py --backbone resnet18    # comparison baseline
```

Two phases:

| Phase | Backbone | Epochs | LR | Why |
|---|---|---|---|---|
| A | frozen | 5 | 1e-3 | The new head is random noise; its large early gradients would damage pretrained features |
| B | trainable | 20 | 1e-4 | Ten times smaller — fine-tuning at phase A's rate destroys the ImageNet features the approach depends on |

Class-weighted loss throughout, otherwise the network learns to predict Plastic and
Hazardous disappears entirely.

Selection is on validation **macro-F1**, not accuracy. With Plastic at ~350 images and
Hazardous at ~150, accuracy rewards ignoring the small classes.

### 4. Evaluate

```bash
python scripts/evaluate.py --checkpoint waste_mobilenet_v3_small.pt
```

Writes to `artifacts/`:

| File | Contents |
|---|---|
| `*_metrics.json` | per-class P/R/F1, confusion matrix, calibration error, abstention curve |
| `*_thresholds.json` | fitted temperature and per-class confidence cutoffs |
| `*_MODEL_CARD.md` | the thesis artifact, including known failure modes |

Two things happen here that matter beyond the score:

**Temperature scaling.** Networks are systematically overconfident — one that says "95%"
is right closer to 80% of the time. A single scalar, fitted on validation, rescales the
confidence without changing which class wins. The app prints that number to users, so it
has to mean something.

**Abstention thresholds.** Below a per-class cutoff the service reports `uncertain` and
the app asks the user to choose. A model that declines 8% of images and is 92% right on
the rest beats one that is 85% right and never hesitates. This is the same principle as
the phase 0 removal of the silent fallback: never present a guess as a result.

Calibration is fitted on **validation** and applied to test. Fitting it on test would be
tuning against the held-out set.

### 5. Export

```bash
python scripts/export.py --checkpoint waste_mobilenet_v3_small.pt
```

Writes `artifacts/<name>_bundle/` — the ONNX graph plus `labels.json`,
`preprocess.json`, `thresholds.json`, and a copy of the model card.

All four sidecars are load-bearing. Without the label order the output vector maps to
the wrong classes; without the preprocessing spec the inputs are wrong in a way that
degrades accuracy without erroring; without the thresholds a consumer shows raw
overconfident scores.

**Parity is verified, not assumed.** The script runs the exported graph and the trained
model over real test images and fails if they disagree. An export that quietly diverges
is worse than none: the thesis would report one model's accuracy while production
serves another. Expect a max logit difference around 1e-5 for float32.

`--quantize` additionally emits an int8 graph, and is **off by default for good
reason.** Dynamic quantization targets Linear-heavy architectures; on this CNN it drops
prediction agreement to 0.56 and runs at 33 ms against float32's 1.6 ms, because there
are no fused int8 convolution kernels for the graph. When it fails parity the script
deletes the file rather than leaving something servable in the bundle. For on-device
size, static quantization with a calibration set from the real training data is the
correct route.

TFLite conversion for true on-device inference is a later step needing a separate
toolchain. ONNX is the target here because it can be verified on this machine, and an
export that cannot be checked defeats the purpose.

Note: `onnxscript` has no Python 3.13 wheel, so the script asks torch for the
TorchScript exporter explicitly. Fully sufficient for a static CNN, and the parity
check proves the result regardless.

### 6. Serve

```bash
uvicorn serve.app:app --host 127.0.0.1 --port 8000
```

`POST /classify` with `{"image_base64": "..."}` returns:

```json
{
  "material": "Plastic",
  "confidence": 87.4,
  "uncertain": false,
  "threshold": 0.6,
  "top_k": [{"material": "Plastic", "probability": 0.874}],
  "latency_ms": 31.2,
  "model": "mobilenet_v3_small"
}
```

The Node backend calls this from `POST /api/ai/analyze-image`. That endpoint's HTTP
contract — auth, rate limit, validation, image-hash cache, response shape — is unchanged
from the Gemini-backed version, so the mobile app is indifferent to what is behind it.

Startup asserts that the checkpoint's preprocessing spec matches `wasteml/config.py`.
A mismatch between training and serving preprocessing is the most common cause of
"excellent in the notebook, useless in the app", and it otherwise fails silently.

---

## Testing without photographs

```bash
python scripts/make_smoke_data.py
python scripts/prepare_dataset.py --raw-dir data/smoke_raw --metadata data/smoke_metadata.csv
python scripts/train.py --phase-a-epochs 2 --phase-b-epochs 3 --batch-size 16
python scripts/evaluate.py
```

The smoke set writes its own `data/smoke_metadata.csv` and never touches
`data/metadata.csv`, which holds the team's hand-recorded rows.

Exercises every stage on synthetic shapes. It proves the machinery, not the model —
the scores are meaningless and must never appear in the thesis.

---

## Layout

```
wasteml/
  config.py      classes, preprocessing, hyperparameters — the single source of truth
  data.py        datasets, augmentation, class weights
  model.py       backbone construction, checkpoint I/O
  metrics.py     macro-F1, confusion matrix, calibration, abstention
scripts/
  new_batch.py         import a session's photographs: naming, grouping, metadata
  check_dataset.py     audit data/raw against the labelling policy
  ingest_public.py     map a downloaded public dataset into our classes
  crop_taco.py         cut TACO's detection annotations into single-item crops
  make_smoke_data.py   synthetic dataset for pipeline testing
  prepare_dataset.py   manifest + group-aware split
  train.py             two-phase transfer learning
  evaluate.py          test metrics, calibration, model card
  export.py            ONNX bundle with a verified parity check
serve/
  app.py         FastAPI inference service
data/            photographs and splits (gitignored)
artifacts/       checkpoints and metrics (weights gitignored)
```

---

## Notes

**Changing `CLASSES` invalidates every checkpoint.** The list order defines the network's
output indices. `load_checkpoint` refuses to load a checkpoint whose class list disagrees
with the current config rather than silently mislabelling everything.

**On Windows, use `127.0.0.1` rather than `localhost`.** Resolving `localhost` tries IPv6
first and costs roughly 2 seconds per request before falling back — enough to look like a
performance problem in the model that isn't one.

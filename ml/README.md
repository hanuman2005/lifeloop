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
[LABELLING-POLICY.md](./LABELLING-POLICY.md).

### 2. Prepare

```bash
python scripts/prepare_dataset.py
```

Builds `data/manifest.csv` and `data/splits/{train,val,test}.csv`, reports per-class
counts, and **refuses to emit a split that leaks**.

The split is stratified by class and disjoint by `object_id`. Every photograph of one
physical object is confined to a single split. Without that, near-duplicates straddle
train and test, and the reported accuracy silently overstates reality.

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

### 5. Serve

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
python scripts/prepare_dataset.py --raw-dir data/smoke_raw
python scripts/train.py --phase-a-epochs 2 --phase-b-epochs 3 --batch-size 16
python scripts/evaluate.py
```

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
  make_smoke_data.py   synthetic dataset for pipeline testing
  prepare_dataset.py   manifest + group-aware split
  train.py             two-phase transfer learning
  evaluate.py          test metrics, calibration, model card
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

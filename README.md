# LifeLoop

> A software-only circular economy platform for urban waste

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Final year project — B.Tech CSE, SRKR Engineering College.

---

## What Is This?

LifeLoop closes the urban waste loop entirely in software: classify what a citizen is
about to throw away, incentivise the correct disposal, collect it efficiently, formalise
the labour that does the collecting, and issue verifiable proof that recycling happened.

**Key innovation:** participatory sensing instead of IoT hardware. Citizens replace
fill-level sensors, so the system scales at zero marginal cost per bin.

The waste classifier is trained here, on our own data. No hosted vision API is used.

---

## Modules

| # | Module | Status |
|---|---|---|
| M1 | **AI Waste Scanner** — photo → material, calibrated confidence, disposal guidance | Pipeline complete. Model covers 7 of 10 classes |
| M2 | **Crowd-Sensing Bin Network** — citizen reports → live ward map → collection routes | Complete |
| M3 | **The Exchange** — items find a second owner before becoming waste | Complete |
| M4 | **Collector Formalization** — identity, proximity tasks, tamper-evident work ledger | Complete |
| M5 | EPR Certificate Ledger | Descoped. Its hash-chain technique is implemented in M4 |

---

## Measured results

Both are reproducible from a seed, so the figures in the thesis regenerate exactly.

### Classifier

| Metric | Value |
|---|---|
| Accuracy | **0.842** |
| Macro-F1 | **0.841** |
| Calibration error | 0.45 → **0.11** after temperature scaling |
| Export | ONNX, 6.1 MB, 2.7 ms/image, parity verified against the trained model |

Trained on 570 public images across 7 classes. **These figures describe studio
photographs of single items on plain backgrounds, not the photographs the app
receives.** Closing that gap is what the local data collection is for — see
[ml/README.md](./ml/README.md).

### Route efficiency

**26.5% mean distance reduction** at realistic fill rates (20–50%), against a synopsis
target of 25–40%.

The baseline is a fixed circuit over every bin, ordered with the *same* nearest-neighbour
and 2-opt heuristics the optimised route uses — deliberately strong, so the saving can
only come from skipping bins that did not need emptying.

The study also reports where the approach fails: above roughly 60% fill the fixed circuit
wins, reaching −20% at full occupancy. Crowd-sensing pays off precisely when bins are not
uniformly full. Full method and limitations in
[backend/artifacts/route-simulation.md](./backend/artifacts/route-simulation.md).

---

## Repository Layout

```
backend/     Node.js + Express + MongoDB + Socket.IO API
web/         React PWA (Vite, Tailwind, shadcn/ui) — the client
ml/          The waste classifier: dataset tooling, training, evaluation, serving
LifeLoop/    Expo React Native app — superseded by web/, retained for reference
```

Scope, schedule, and every deliberate departure from the synopsis are recorded in
[PROJECT-PLAN.md](./PROJECT-PLAN.md). That file is the scope of record.
Demo instructions are in [DEMO.md](./DEMO.md).

---

## Screens

17 routes across the citizen, collector and municipal roles.

| Area | Screens |
|---|---|
| Scanner | Scan, result with abstention, history with waste-composition breakdown |
| Exchange | Browse, detail, create, my items, interested users and assignment |
| Bins | Two-tap report with geotag, live ward map |
| Coordination | Chat (real-time), pickups, QR handover, ratings |
| Disposal | Where to take it — centres filtered by material |
| Collector | Nearby tasks, photo verification, work record with live chain check |
| Municipal | Ward pressure, collection route planning |

---

## Getting Started

Three services. MongoDB must be running first.

### 1. Classifier

```bash
cd ml
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn serve.app:app --host 127.0.0.1 --port 8000
```

Optional. Without it the scan endpoint returns a clean 503, or falls back to Gemini if a
key is configured.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in the values below
npm run dev             # http://localhost:5000
```

### 3. Web client

```bash
cd web
npm install
cp .env.example .env
npm run dev             # http://localhost:5173
```

To open the app from a phone, set `VITE_API_URL` to your machine's LAN IP rather than
`localhost`, and add that origin to `ALLOWED_ORIGINS` in `backend/.env`.

### Required environment variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Token signing key (32+ characters) |
| `ALLOWED_ORIGINS` | Comma-separated browser origins permitted by CORS |
| `MODEL_SERVICE_URL` | The classifier service, default `http://127.0.0.1:8000` |
| `GEMINI_API_KEY` | Optional temporary fallback when the classifier is unreachable |
| `CLOUDINARY_*` | Image storage |
| `QR_SECRET_KEY` | Signs QR handover tokens |

See [backend/.env.example](./backend/.env.example) for the full list.

---

## Reproducing the results

```bash
# Route efficiency study
cd backend && node scripts/routeSimulation.js --bins 100 --trials 30

# Classifier: audit, split, train, evaluate, export
cd ml
python scripts/check_dataset.py          # audit against the labelling policy
python scripts/prepare_dataset.py        # group-disjoint splits; refuses to leak
python scripts/train.py                  # two-phase transfer learning
python scripts/evaluate.py               # metrics, calibration, model card
python scripts/export.py                 # ONNX bundle, parity checked
```

---

## Engineering notes

A few decisions worth knowing, each documented where it lives:

- **The model never presents a guess as a result.** Below its calibrated per-class
  threshold it reports `uncertain`, and a dedicated `NotWaste` class means "no
  discardable item" is a positive prediction rather than an inference from a low score.
- **Splits are disjoint by `object_id`**, so every photograph of one physical object
  stays in one split. `prepare_dataset.py` refuses to emit a split that leaks, because
  near-duplicate leakage produces a test score that looks *better* than the truth.
- **Calibration is fitted on validation and applied to test.** Fitting it on test would
  be tuning against the held-out set.
- **Bin reports are weighted, not blocked.** Reporter reputation scales influence rather
  than gating submission; rejected reports are stored rather than deleted so the
  rejection rate stays measurable.
- **The work ledger is hash-chained per collector** and re-verified on every read.
  A tamper applied directly to the database is detected at the exact entry.
- **Gemini, if configured, fires only when the classifier is unreachable** — never to
  mask a low-confidence answer from our own model, which would invalidate the accuracy
  evaluation. Every response carries an `engine` field.

---

## Known gaps

Recorded honestly rather than discovered later. Full detail in
[PROJECT-PLAN.md](./PROJECT-PLAN.md) §6a.

| Gap | Status |
|---|---|
| No locally collected photographs yet | Collection in progress. The central claim — that Indian waste does not look like TrashNet — is currently asserted, not measured |
| `Electronic`, `Wood`, `NotWaste` have no training data | Not predicted by the current model |
| Multi-item photographs | One material is assigned to the whole scene. Detection is scoped in §5b, not built |
| EPR module (M5) | Descoped; specified in the plan, hash-chain technique demonstrated in M4 |
| Thesis / SRS | Not written |

---

## Stack

Node.js · Express · MongoDB (Mongoose, geospatial) · Socket.IO · React · Vite ·
Tailwind · shadcn/ui · Leaflet · Recharts · PyTorch · FastAPI · ONNX

---

## License

MIT — see [LICENSE](LICENSE)

## Author

**Hanumantha Rao Madineni** — [@hanuman2005](https://github.com/hanuman2005)

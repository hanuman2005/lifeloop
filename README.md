# LifeLoop

> A software-only circular economy platform for urban waste

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What Is This?

LifeLoop closes the urban waste loop entirely in software: classify what a citizen is
about to throw away, incentivise the correct disposal, collect it efficiently, formalise
the labour that does the collecting, and issue verifiable proof that recycling happened.

**Key innovation:** participatory sensing instead of IoT hardware. Citizens replace
fill-level sensors, so the system scales at zero marginal cost per bin.

Final year project — B.Tech CSE, SRKR Engineering College.

---

## Modules

| # | Module | Status |
|---|---|---|
| M1 | AI Waste Scanner — photo → material, confidence, disposal guidance | Pipeline complete; model covers 7 of 10 classes |
| M2 | Crowd-Sensing Bin Network — citizen reports → live ward map → collection routes | Complete |
| M3 | The Exchange — items find a second owner before becoming waste | Complete |
| M4 | Collector Formalization — identity, proximity tasks, tamper-evident work ledger | Complete |
| M5 | EPR Certificate Ledger | Descoped; its hash-chain technique is used in M4 |

Two measured results, both reproducible:

- **Classifier:** accuracy 0.842, macro-F1 0.841 on a locked, object-disjoint test set.
  Measured on public dataset images, not real waste — see the caveat in
  [ml/README.md](./ml/README.md).
- **Route efficiency:** 26.5% mean distance reduction against a fixed collection
  circuit at realistic fill rates. Full method and limitations in
  [backend/artifacts/route-simulation.md](./backend/artifacts/route-simulation.md).

Scope, schedule, and every deliberate departure from the synopsis are recorded in
[PROJECT-PLAN.md](./PROJECT-PLAN.md). That file is the scope of record.

---

## Repository Layout

```
backend/     Node.js + Express + MongoDB + Socket.IO API
web/         React PWA (Vite, Tailwind, shadcn/ui) — the client
ml/          The waste classifier: dataset tooling, training, FastAPI serving
LifeLoop/    Expo React Native app — superseded by web/, retained for reference
```

---

## Getting Started

Four terminals. MongoDB must be running first.

### 1. Classifier

```bash
cd ml
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn serve.app:app --host 127.0.0.1 --port 8000
```

Optional. Without it the scan endpoint returns a clean 503, or falls back to Gemini if
a key is configured.

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

# Classifier: prepare, train, evaluate, export
cd ml
python scripts/check_dataset.py
python scripts/prepare_dataset.py
python scripts/train.py
python scripts/evaluate.py
python scripts/export.py
```

Both are seeded, so the figures in the thesis regenerate exactly.

---

## Stack

Node.js · Express · MongoDB (Mongoose, geospatial) · Socket.IO · React · Vite ·
Tailwind · shadcn/ui · Leaflet · PyTorch · FastAPI · ONNX

---

## License

MIT — see [LICENSE](LICENSE)

---

## Author

**Hanumantha Rao Madineni** — [@hanuman2005](https://github.com/hanuman2005)

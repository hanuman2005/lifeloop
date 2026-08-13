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
| M1 | AI Waste Scanner — photo → category, material, disposal instruction, points | In progress |
| M2 | Crowd-Sensing Bin Network — citizen bin reports → live ward map | Planned |
| M3 | The Exchange — items find a second owner before becoming waste | Built |
| M4 | Collector Formalization — digital identity, proximity tasks, work ledger | Planned |
| M5 | EPR Certificate Ledger — hash-chained append-only recycling certificates | Planned |

Scope, schedule, and every deliberate departure from the synopsis are recorded in
[PROJECT-PLAN.md](./PROJECT-PLAN.md). That file is the scope of record.

---

## Repository Layout

```
backend/     Node.js + Express + MongoDB + Socket.IO API
LifeLoop/    Expo / React Native mobile app (SDK 54)
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in the values below
npm run dev             # http://localhost:5000
```

### Mobile app

```bash
cd LifeLoop
npm install
npx expo start
```

The mobile app reads its API URL from `expo.extra.API_URL` in `app.json`. On a physical
device this must be your machine's LAN IP, not `localhost` — update both `API_URL` and
`SOCKET_API_URL` when your network changes.

### Required environment variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Token signing key (32+ characters) |
| `GEMINI_API_KEY` | Gemini Vision — powers the M1 waste scanner |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image storage |
| `QR_SECRET_KEY` | Signs QR handover tokens |

See [backend/.env.example](./backend/.env.example) for the full list.

---

## Stack

Node.js · Express · MongoDB (Mongoose, geospatial) · PostgreSQL (certificate ledger) ·
Socket.IO · React Native (Expo) · Gemini Vision · JWT

---

## License

MIT — see [LICENSE](LICENSE)

---

## Author

**Hanumantha Rao Madineni** — [@hanuman2005](https://github.com/hanuman2005)

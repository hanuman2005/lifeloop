# LifeLoop

> AI-assisted circular economy platform for smarter reuse, recycling, upcycling, and donation decisions

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What Is This?

LifeLoop helps users decide what to do with unused items before discarding them. Using AI-assisted analysis, it suggests reuse, recycling, upcycling, or donation, and supports real-time coordination when items are shared.

**Key innovation:** Most donation platforms assume you want to donate. LifeLoop uses AI to help you make the smartest decision first.

---

## Why It's Interesting

- Real-time coordination using Socket.IO (chat, notifications, live heatmaps)
- Geospatial search and route optimization (K-means + TSP, 28-45% savings)
- State-heavy backend workflows (queues, schedules, transactions)
- AI-assisted item analysis with TensorFlow.js (multi-image, 85-95% accuracy)

---

## Getting Started

```bash
# Clone repository
git clone https://github.com/hanuman2005/lifeloop.git
cd lifeloop

# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm start
```

## Docker Usage

To run the full stack with Docker:

```bash
docker-compose up --build
```

To stop:

```bash
docker-compose down
```

Make sure to copy .env.example to .env in both backend and frontend, and adjust values as needed.

**Access:** Frontend at `http://localhost:3000`, Backend at `http://localhost:5000`

---

## Documentation

- **Backend architecture** → [backend/README.md](./backend/README.md)
- **Frontend architecture** → [frontend/README.md](./frontend/README.md)
- **API reference** → [DOCS.md](./DOCS.md)
- **Features & concepts** → [FEATURES.md](./FEATURES.md)
- **Testing guide** → [TESTING.md](./TESTING.md)
- **Roadmap** → [ROADMAP.md](./ROADMAP.md)

---

## Status

Feature-complete MVP with 12+ pages, 40+ components, 80+ API endpoints, and real-time features tested with 100+ concurrent users.

---

## License

MIT License - See [LICENSE](LICENSE) for details

---

## Author

**Hanumantha Madineni** — [@hanuman2005](https://github.com/hanuman2005)

---

## CI/CD Status

[![LifeLoop CI/CD](https://github.com/hanuman2005/lifeloop/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/hanuman2005/lifeloop/actions/workflows/ci-cd.yml)

```
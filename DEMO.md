# Demo Runbook

Everything needed to get LifeLoop running in front of an audience, what to show, and
what to avoid. Read the network section first — it is the single most likely thing to
break.

---

## 1. Network — do this first, at the venue

The mobile app reaches the backend over your machine's LAN IP. That address changes
every time you join a different network, and when it is wrong the app cannot reach the
backend at all: no login, no scan, nothing.

Find the current address:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
```

Take the **Wi-Fi** one (currently `10.98.16.129`) and put it in two places:

**`LifeLoop/app.json`**
```json
"API_URL": "http://<IP>:5000/api",
"SOCKET_API_URL": "http://<IP>:5000",
```

**`backend/.env`**
```
ALLOWED_ORIGINS=http://<IP>:8081,http://<IP>:19000,http://<IP>:19006
```

Then restart the backend and Expo. Changing `app.json` requires an Expo restart — it is
read at startup, not on reload.

**The phone and the laptop must be on the same Wi-Fi.** College guest networks often
isolate clients from each other, which blocks this silently. If you can, use a phone
hotspot with the laptop joined to it — that always works.

Verify from the laptop before trusting it:

```bash
curl http://<IP>:5000/health
```

Expect `{"status":"ok", ... "mongodb":"connected"}`.

---

## 2. Start the three services

Three terminals, in this order. MongoDB must already be running.

**Terminal 1 — the classifier**
```bash
cd ml
uvicorn serve.app:app --host 0.0.0.0 --port 8000
```
Wait for `✅ waste_mobilenet_v3_small.pt loaded`.

**Terminal 2 — the backend**
```bash
cd backend
npm run dev
```
Wait for `🚀 LIFELOOP SERVER RUNNING`.

**Terminal 3 — the app**
```bash
cd LifeLoop
npx expo start
```
Scan the QR code with Expo Go.

### Health check before you present

```bash
curl http://127.0.0.1:8000/health     # classifier: expect 7 classes listed
curl http://<IP>:5000/health          # backend: expect mongodb "connected"
```

If port 5000 says `EADDRINUSE`, an old server is still running:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 3. What the classifier can and cannot do

Trained on 570 public images. **7 of 10 classes:**

```
✅ Plastic   Glass   Metal   Paper   Organic   Textile   Hazardous
❌ Electronic   Wood   NotWaste        ← no training images, never predicted
```

Measured on held-out public images: **accuracy 0.842, macro-F1 0.841.**

| Class | F1 | Demo confidence |
|---|---|---|
| Organic | 1.000 | Very safe |
| Textile | 0.941 | Very safe |
| Plastic | 0.889 | Safe |
| Metal | 0.815 | Safe |
| Hazardous | 0.800 | Safe |
| Glass | 0.720 | Riskier |
| Paper | 0.720 | Riskier — confused with Glass and Metal |

### Good things to scan

A plastic bottle, a steel tumbler, a banana peel, an old shirt, a battery. Single item,
filling the frame, plain background, good light.

### Avoid

- **Anything wooden or electronic** — the model has never seen those classes and will
  confidently pick something else.
- **Multiple items in frame** — it assigns one material to the whole scene. This is the
  known limitation that the detection work (PROJECT-PLAN.md §5b) exists to fix.
- **Paper against a shiny or white background** — Paper is the weakest class.

### If it is unsure

Low confidence shows as *"Not sure — best guess: X"* with no confetti. That is
deliberate, not a bug: the model abstains rather than presenting a guess as a result.
Worth calling out — it is a design decision a panel will respect.

---

## 4. What to demo, in order

1. **Register / login** — role selection, donor or recipient.
2. **Scan an item** — the AI classifier. Show the confidence and the material.
   This is the centrepiece: the model is trained by you, not a hosted API.
3. **Create a listing** from the scan result.
4. **Browse and express interest** as a recipient (second account, or the same one).
5. **Chat** between donor and recipient — real-time over Socket.IO.
6. **Schedule a pickup**, then **QR verification** at handover.
7. **Impact dashboard** — CO₂ saved, eco points, leaderboard.

Steps 3–7 are complete and stable. Step 2 is the newest and the one worth talking about.

---

## 5. If the classifier dies mid-demo

The backend falls back to Gemini automatically when the classifier service is
unreachable, has no model loaded, or times out. It is **off by default**.

To arm it, put a free key from `aistudio.google.com/apikey` in `backend/.env`:

```
GEMINI_API_KEY=your_key_here
```

Restart the backend. If the Python service dies, scans keep working and the response is
tagged `engine: "gemini"` so the two are never confused.

Worth arming before the demo purely as insurance.

**Important:** the fallback does *not* fire when your own model returns a low-confidence
answer — only when it cannot be reached at all. That is deliberate, so a hosted API can
never quietly stand in for your model's accuracy.

---

## 6. Honest answers to likely questions

**"Is this your own model?"**
Yes. MobileNetV3-Small architecture from torchvision, ImageNet-pretrained, then
fine-tuned on waste images in two phases. The weights are ours. Training a CNN
architecture from scratch on this much data would be strictly worse — transfer learning
is the correct approach at this scale.

**"Why not YOLO, as the synopsis says?"**
YOLO is a detector: it answers *where are the objects*. This is a classification
problem — one item, one label — and detection would cost roughly five times the
annotation effort for no gain. Detection is being added as a second stage to handle
multi-item photographs; see PROJECT-PLAN.md §5b and §6.6.

**"What accuracy?"**
84.2% on a held-out test set, 7 classes. But be straight: that is measured on public
dataset photographs — single items on plain backgrounds. Real photographs will score
lower, and closing that gap is exactly what the local data collection is for. Claiming
84% represents real-world performance is the one thing that would damage your
credibility.

**"How much data?"**
570 public images so far, from TrashNet, TACO and a Kaggle set. The team is collecting
~2,000 local photographs in Bhimavaram, which is the project's actual data
contribution — the argument being that Indian waste does not look like TrashNet.

**"What is missing?"**
Three classes with no data yet, multi-item photographs, and modules 2, 4 and 5. All
recorded in PROJECT-PLAN.md rather than hidden.

---

## 7. Pre-demo checklist

- [ ] Laptop and phone on the same network (hotspot is safest)
- [ ] IP updated in `app.json` and `backend/.env`
- [ ] MongoDB running
- [ ] Classifier service up — `/health` lists 7 classes
- [ ] Backend up — `/health` says mongodb connected
- [ ] Expo running, app loads on the phone
- [ ] One test scan completed successfully end to end
- [ ] `GEMINI_API_KEY` set as insurance (optional)
- [ ] A few known-good items on hand: bottle, tumbler, cloth, peel
- [ ] Laptop on mains power, sleep disabled

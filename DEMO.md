# Demo Runbook

Startup order, what to show, and honest answers to the questions a panel will ask.
Read section 1 at the venue — the network step is what breaks most often.

---

## 1. Network — do this first, at the venue

The web app runs in a browser, so a laptop-only demo needs no network setup at all:
`localhost` works. You only need this section if you want to open the app **on a phone**,
which is worth doing because the scanner then uses the real camera.

Find the machine's current address:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
```

Take the **Wi-Fi** one and set it in two places:

**`web/.env`**
```
VITE_API_URL=http://<IP>:5000/api
VITE_SOCKET_URL=http://<IP>:5000
```

**`backend/.env`**
```
ALLOWED_ORIGINS=http://<IP>:5173
```

Restart both. Vite reads `.env` at startup, and CORS now genuinely rejects unknown
origins rather than waving everything through.

Then open `http://<IP>:5173` on the phone.

**Phone and laptop must be on the same Wi-Fi.** College guest networks often isolate
clients from each other, which blocks this silently. A phone hotspot with the laptop
joined to it always works.

One caveat on phone camera access: browsers only allow `getUserMedia` on HTTPS or
localhost. The scanner deliberately uses a file input with `capture`, which opens the
native camera over plain HTTP too — so this works, but do not switch it to a live
video preview at the venue.

---

## 2. Start the services

MongoDB must already be running.

**Terminal 1 — classifier** *(optional but wanted for the scan demo)*
```bash
cd ml
uvicorn serve.app:app --host 127.0.0.1 --port 8000
```
Wait for `✅ waste_mobilenet_v3_small.pt loaded`.

**Terminal 2 — backend**
```bash
cd backend
npm run dev
```
Wait for `🚀 LIFELOOP SERVER RUNNING`.

**Terminal 3 — web client**
```bash
cd web
npm run dev
```

### Health check before presenting

```bash
curl http://127.0.0.1:8000/health     # classifier: expect 7 classes listed
curl http://127.0.0.1:5000/health     # backend: expect mongodb "connected"
```

If port 5000 reports `EADDRINUSE`, an old server is still holding it:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 3. What the classifier can and cannot do

Trained on 570 public images. **7 of 10 classes.**

```
✅ Plastic   Glass   Metal   Paper   Organic   Textile   Hazardous
❌ Electronic   Wood   NotWaste        ← no training data, never predicted
```

Test accuracy **0.842**, macro-F1 **0.841**.

| Class | F1 | Demo confidence |
|---|---|---|
| Organic | 1.000 | Very safe |
| Textile | 0.941 | Very safe |
| Plastic | 0.889 | Safe |
| Metal | 0.815 | Safe |
| Hazardous | 0.800 | Safe |
| Glass | 0.720 | Riskier |
| Paper | 0.720 | Riskier — confused with Glass and Metal |

**Scan these:** plastic bottle, steel tumbler, banana peel, old shirt, battery. Single
item, filling the frame, plain background, decent light.

**Avoid:** anything wooden or electronic (no training data), multi-item shots (one
material is assigned to the whole scene), and paper on a shiny white background.

**When it is unsure** it says so — "Not sure", no confetti, no "identified" badge. That
is deliberate: the model abstains below its calibrated per-class threshold rather than
presenting a guess as a result. Worth calling out; panels respect it.

---

## 4. Demo sequence

1. **Register** — pick a role. Roles come from the same enum the backend enforces.
2. **Scan an item** — the centrepiece. Show the material, the calibrated confidence, and
   the disposal guidance. Then scan something it will hesitate on and show it abstaining.
3. **Give it away** — the scan result preselects a category on the listing form.
4. **Report a bin** — two taps plus a geotag. Show the accuracy readout.
5. **Waste map** — the ward map built from those reports. Colour is weighted pressure,
   size is report volume.
6. **Municipal dashboard** *(admin account)* — ward pressure chart, then **Build route**
   to show the collection plan and the saving against the fixed circuit.
7. **Collector** *(collector account)* — accept a task, complete it with before/after
   photos, then confirm from the citizen account. Show the work record and the
   **Record intact** chain check.

Step 7 is the strongest sequence in the demo: it is the only part that visibly closes
the loop from citizen report to verified collection.

To make an admin, set `userType: "admin"` on the user document directly in MongoDB, or
use `backend/scripts/makeAdmin.js`.

---

## 5. If the classifier dies mid-demo

The backend falls back to Gemini when the classifier service is unreachable, has no
model loaded, or times out. It is **off by default**.

Put a key from `aistudio.google.com/apikey` in `backend/.env`:

```
GEMINI_API_KEY=your_key_here
```

Restart the backend. Responses are tagged `engine: "gemini"`, and the UI shows a
`fallback` badge, so the two can never be confused.

Worth arming as insurance. It does **not** fire when your own model returns a
low-confidence answer — only when it cannot be reached at all — so it can never quietly
stand in for your model's accuracy.

---

## 6. Honest answers to likely questions

**"Is this your own model?"**
Yes. MobileNetV3-Small from torchvision, ImageNet-pretrained, then fine-tuned in two
phases on waste images. The weights are ours. Transfer learning is the correct approach
at this data scale — training an architecture from scratch on 570 images would be
strictly worse.

**"Why not YOLO, as the synopsis says?"**
YOLO is a detector: it answers *where are the objects*. This is classification — one
item, one label — and detection would cost roughly five times the annotation effort for
no gain. Detection is scoped as a second stage for multi-item photographs; see
PROJECT-PLAN.md §5b and §6.6. It is not built yet.

**"What accuracy?"**
84.2% on a held-out, object-disjoint test set across 7 classes. Then say the important
part unprompted: that is measured on **public dataset photographs** — single items on
plain backgrounds. Real photographs will score lower, and closing that gap is what the
local data collection is for. Claiming 84% represents real-world performance is the one
thing that would cost you credibility.

**"How much data?"**
570 public images from TrashNet, TACO and a Kaggle set. The team is collecting ~2,000
local photographs in Bhimavaram, which is the project's actual data contribution — the
argument being that Indian waste does not look like TrashNet.

**"How do you stop people gaming the bin reports?"**
Four rules, all enforced and all measurable: SHA-256 image-hash duplicate detection, a
per-user rate limit, a geofence, and a same-place cooldown. Rejected reports are stored
rather than deleted, so the rejection rate is a number we can quote. Reporter reputation
weights rather than blocks — a new reporter is not a bad reporter, and the map
aggregates by summed weight so an unreliable account fades instead of vanishing.

**"Is the 26.5% route saving real?"**
It is measured against a *fixed circuit over every bin, ordered with the same
heuristics* as the optimised route — not against a naive per-bin round trip, which would
have shown 80–90% and meant nothing. The study also reports where the approach loses:
above roughly 60% fill the fixed circuit wins, because there is nothing left to skip.
That crossover is what makes the headline figure believable.

**"Can the collector work record be faked?"**
A collector cannot verify their own task — the citizen who raised it confirms. Entries
are hash-chained, so altering one invalidates everything after it, and the chain is
re-verified on every read. Application-level edits are blocked outright; a tamper
applied directly to the database is detected at the exact entry.

**"What is missing?"**
Three classifier classes with no data, multi-item detection, the EPR module, and the
thesis. All recorded in PROJECT-PLAN.md §6a rather than hidden.

---

## 7. Pre-demo checklist

- [ ] MongoDB running
- [ ] Classifier up — `/health` lists 7 classes
- [ ] Backend up — `/health` says mongodb connected
- [ ] Web client up, loads in the browser
- [ ] One test scan completed end to end
- [ ] Admin account ready (for the municipal dashboard)
- [ ] Collector account ready, plus a second citizen account to verify with
- [ ] Bin reports seeded so the map and dashboard are not empty
- [ ] `GEMINI_API_KEY` set as insurance (optional)
- [ ] Known-good items on hand: bottle, tumbler, cloth, peel
- [ ] Laptop on mains power, sleep disabled

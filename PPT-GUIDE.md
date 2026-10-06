# LifeLoop — Slide Guide

One page per slide. What is on it, what to say, what they will ask.

Plain words only. If you cannot explain a word, do not use it.

---

## Before you start

**The project in one sentence:**
Take a photo of a bin, and the app tells you what every item in it is made of and
how much can be recycled — with no sensors installed anywhere.

**Who says what:**

| Person | Slides |
|---|---|
| M. Hanumantha Rao | 1–4 |
| K. Prabhu Kumar | 5–7 |
| M. Chiranjeevi Raju | 8–10 |
| K. Dhanush Kumar | 11–13 |

**Six numbers everyone must know:**

| | |
|---|---|
| 3,170 | photos we trained on |
| 84.8% | how often the classifier is right |
| 0.835 | macro-F1 (balanced score) |
| 0.746 | detector score |
| 26.5% | driving distance saved |
| 0 | sensors installed |

---

## Slide 1 — Title

**On the slide:** Nine coloured bars, project title, team names, guide.

**Say:**
> "Good morning. Our project is LifeLoop — an AI and participatory-sensing based
> circular economy platform for municipal solid waste management. These nine
> coloured bars are the nine materials our model can tell apart."

Point at the bars. Fifteen seconds, then move.

---

## Slide 2 — Outline

**On the slide:** Nine section names.

**Say:** Read them. Five seconds. Do not explain.

---

## Slide 3 — Abstract

**On the slide:** A summary paragraph, and four numbers on the right —
**9+1**, **3,170**, **0.835**, **0**.

**Say:**
> "Nine materials, plus a tenth category for photos that have no rubbish in them at
> all. That tenth one is important — it lets the model say *none of these* instead
> of guessing wrongly.
>
> We trained on 3,170 photos. Our balanced score is 0.835. And the last number is
> zero — zero sensors installed on any bin."

**Why the zero matters:** it is the whole argument of the project in one figure.

---

## Slide 4 — Introduction

**On the slide:** Three numbered problems.

**Say:**
> "Three problems, and they make each other worse.
>
> First, the sorting decision happens at the bin, by a person who is often not sure
> which category something belongs to. Once a bag is mixed and the food waste has
> soaked the paper, that paper is worthless, and nothing later in the chain can
> fix it.
>
> Second, nobody knows which bin is actually full. Trucks follow a fixed route, so
> they empty bins that are a quarter full and miss ones overflowing two streets
> away. The usual fix is a sensor on every bin, which is a cost that never ends.
>
> Third, the informal waste collectors who do most of the actual recycling have no
> record of their work, so they cannot prove their income to anyone.
>
> Our starting point was this: anyone throwing something away is already holding a
> camera."

---

## Slide 5 — Literature Survey

**On the slide:** Table of 6 papers with a Gaps column.

**Do not read the table out loud.**

**Say:**
> "These are the works we built on. TrashNet and TACO are the photo datasets.
> MobileNet and YOLO are the models. The last one is where we got the method for
> making our confidence numbers honest. The final column is what each one does not
> solve for our problem."

Then show you actually read one:
> "TrashNet is the standard benchmark everyone uses. But every photo in it is one
> clean object on a white background. That is not what a real bin looks like."

**If asked "only six papers?":**
> "The slide shows six. The full survey in our report has twelve."

---

## Slide 6 — Research Gaps

**On the slide:** Five gaps in cards.

**Only the first one really matters. Say:**
> "The main gap is this. Existing waste models give one answer for one photo. But a
> real bin has several different materials in it at the same time. That single
> problem is the reason our system uses two models instead of one."

Mention the others in one line each and move on.

---

## Slide 7 — Objectives

**On the slide:** Goal panel on the left, five numbered objectives on the right.

**Say:** Read the goal, then list the five quickly. Twenty seconds. Do not
elaborate — the next three slides explain them.

---

## Slide 8 — Methodology

**On the slide:** Six numbered steps.

**Slow down on two of them.**

**Step 2 — how we split the photos:**
> "If we take three photos of the same bottle, they look nearly identical. If one
> goes into the training set and another into the test set, the model has basically
> already seen the answer, and our score would be a lie. So we keep all photos of
> the same object together in one set."

**Step 4 — making confidence honest:**
> "Models are naturally over-confident. They say ninety per cent when they are
> really right only seventy per cent of the time. We tune one value to correct
> that, so when it says eighty per cent, it means eighty per cent."

Judges notice both of these. They show care.

---

## Slide 9 — Architecture: the two-stage pipeline

**On the slide:** Six boxes with arrows — photo, detector, crop, classifier,
calibrate, breakdown. Plus two explanation cards below.

**Say, moving your hand along the arrows:**
> "A photo comes in. The first model finds every object and draws a box around it.
> We cut out each box with a small margin. Each cut-out then goes to the second
> model, which says what that one object is made of. Finally we check the
> confidence, and anything we are not sure about is marked unsure rather than
> guessed."

**Two questions always come here.**

**"Why two models?"**
> "They answer different questions, and we have very different amounts of data for
> each. We have thousands of examples of *this is a discardable object*, but only a
> few dozen per material. So the first model uses the big pile of data to find
> things, and the second names them one at a time. Forcing one model to do both
> makes it worse at both."

**"What is the tenth category?"**
> "If you give a model nine choices and show it a blank wall, it will confidently
> pick one of the nine. Adding a tenth option — *not waste* — lets it say none of
> these."

---

## Slide 10 — The five modules

**On the slide:** M1 to M5 with descriptions.

**Say one line each, then stop on two.**

- M1 — the scanner
- M2 — citizens reporting bins
- M3 — giving away usable items
- M4 — the collector work record
- M5 — planning collection routes

**Stop on M2:**
> "Four checks run on every bin report. Is this the same photo someone already sent.
> Is the person actually near that bin. Are they reporting the same bin over and
> over. And how accurate have their past reports been. If a report fails a check we
> keep it and mark it rejected, rather than deleting it — that way we can measure
> how often we reject."

**Stop on M4:**
> "Every completed job is added to a chain of records. Each record carries a
> fingerprint of the record before it. So if somebody edits an old record, every
> record after it stops matching, and we can see it straight away."

---

## Slide 11 — Results

**The most important slide. Know these without looking.**

**On the slide:** Two metric boxes, per-material bar chart, and a limits box.

**Say:**
> "Our classifier is right 84.8% of the time across nine materials. Our balanced
> score is 0.835. And we improved the honesty of our confidence numbers from 0.073
> down to 0.018 — lower is better there.
>
> The object detector scores 0.746. And our routing simulation saves 26.5% of
> driving distance compared to a fixed route."

**Explain macro-F1 before they ask:**
> "We report the balanced score rather than plain accuracy because our categories
> are not equal in size. Plain accuracy would be dominated by whichever material we
> have the most photos of. The balanced score gives every material equal weight,
> which matters because getting Hazardous wrong is worse than getting Plastic
> wrong."

**Then read out your own weaknesses. Do not skip this.**
> "We should be clear about three things.
>
> One — all our photos come from public datasets. They are clean studio photos, so
> this is a best case, not what you would get on a real street. Our own script
> actually refused to build a test set from that data and we had to override it
> deliberately.
>
> Two — we have no photos of wood at all, so the model is really nine materials,
> not ten.
>
> Three — our weakest result is the *not waste* category. It only catches about
> half of the photos that contain no rubbish."

**Why this works:** if you hide a weakness and a judge finds it, everything else
you said becomes doubtful. Say it first and everything else becomes believable.

---

## Slide 12 — Conclusion

**On the slide:** Four claims.

**Say:**
> "Four things. Splitting the job between two models is what makes it possible to
> read a mixed pile. Fixing the confidence numbers changed how the system fails —
> it now says unsure instead of guessing. Citizen reports genuinely replace
> hardware. And all five parts run on one working platform."

Thirty seconds.

---

## Slide 13 — Future Scope

**On the slide:** Six future items on a dark background.

**Lead with the honest one:**
> "The first thing we do next is go out and photograph real waste here in
> Bhimavaram, so our accuracy stops being a best case and becomes a real
> measurement. After that: fill the wood gap, improve the not-waste category, and
> run a pilot in an actual ward."

---

## Questions they will ask

**"Did you build the model or use an API?"**
> "We built it. Both models are trained in our own code from public photo datasets
> and run on our own server. Nothing calls Google or ChatGPT."

**"Why MobileNet and not something else?"**
> "We tested two models on exactly the same data. Their scores differed by 0.0004,
> which is nothing. So we chose on licensing. The other one would legally force us
> to publish our entire source code. MobileNet's licence does not."

**"Other projects show 97% accuracy. Why is yours 84.8%?"**
> "Two reasons. Ours is a nine-way choice; most of those are a two-way choice like
> wet versus dry, which is far easier. And we are telling you exactly how we
> measured it. We would rather report a number we can defend."

**"What happens when it is wrong?"**
> "It says it is unsure. Each material has a confidence cut-off, and below that the
> app says unsure instead of naming a material. We saw this work — a printed page
> our earlier model called Plastic is now correctly called Paper and marked
> uncertain."

**"Why no IoT sensors?"**
> "Cost that never ends. The device, the battery, the maintenance, on every one of
> thousands of bins. Citizens with phones cost nothing per bin, and we filter their
> reports with four checks."

**"How do you stop fake reports?"**
> "Four checks — duplicate photo, distance from the bin, how often that person
> reports, and their past accuracy. Someone unreliable still gets counted, just
> with less weight."

**"Is the work record a blockchain?"**
> "No, and we would not call it one. It is a chain of linked records in our own
> database. No network, no mining. It makes tampering visible, not impossible."

**"Can it run offline?"**
> "Not yet. Our model file is only 6.1 MB and takes 4.7 milliseconds per photo, so
> it would fit on a phone easily. That conversion is in our future work."

**"How many photos per material?"**
> "Plastic 580, Metal 415, Paper 413, Textile 389, Organic 384, Hazardous 354,
> Glass 351, NotWaste 149, Electronic 144, Wood zero."

**"Why is there no wood data?"**
> "We could not find an honest dataset. The ones labelled wood turned out to be
> photos of wood *texture* — a close-up of a plank wall, not a thrown-away wooden
> object. We rejected one for that reason rather than train on something
> misleading."

**"What is participatory sensing?"**
> "Using people with phones as the sensors instead of buying hardware. A citizen
> walking past a full bin reports it in two taps. That report is our fill-level
> signal."

---

## Words you may need to say

| Word | Plain meaning |
|---|---|
| Classifier | The model that says what one object is made of |
| Detector | The model that finds where objects are and boxes them |
| Macro-F1 | A score averaged across all nine materials, each counting equally |
| Precision | When it says yes, how often it is right |
| Recall | Out of everything really there, how much it found |
| mAP50 | A single score for how well the detector finds objects |
| Calibration | Making the confidence percentage honest |
| Abstention | The model saying "not sure" instead of guessing |
| Hash chain | Linked records where changing an old one breaks all the later ones |
| Participatory sensing | People with phones instead of hardware sensors |

---

## Do not say

- **IoT or sensors.** We have none, deliberately. That is the point, not a gap.
- **97% or 10,000 images.** Those are from another team's sample deck with a
  similar title. Not ours.
- **Ten materials.** We train on nine. Wood is listed but empty.
- **Blockchain.**
- **Any number you are unsure of.** "We have not measured that yet" is a perfectly
  good answer. A guessed number that gets questioned is much worse.
- **Overselling the 26.5%.** It is a simulation, not a real city. And above about
  60% bin fullness the old fixed route is actually better. Saying that shows you
  understand your own method.

---

## Closing line

If you get a chance to close:

> "Other teams will show you a higher accuracy number. What we can show you is
> exactly what our number means, how we measured it, and where it fails. That is
> why we put our limitations on the slide instead of leaving them out."

// The landing page.
//
// Its job is that someone who has never heard of LifeLoop can read the top of this
// page and say what it does, who uses it, and why it is not another donation app.
// Four decisions follow from that:
//
// The problem comes before the product. A visitor is told what municipal
// segregation actually fails at before they are told what we built, because the
// product only makes sense downstream of that.
//
// The signature is the material stream strip. It is the nine classes the model
// actually predicts, in the colours the app actually uses to label them — the same
// values as features/scanner/materials.js, so the page cannot drift from the
// product. A bin lineup is what segregation looks like, and the strip encodes the
// class list rather than decorating the page.
//
// The results section publishes the model's accuracy and the conditions under which
// it fails. Most products do not. This one measures itself, and saying so on the
// front page is more persuasive to the audience that matters than an adjective is.
//
// The FAQ answers the questions an examiner asks first — is the model ours, what
// runs where, what happens when it is unsure — because those are the questions that
// decide whether the visitor takes the rest of the page seriously.

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  Layers,
  MapPin,
  Recycle,
  Route,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";

// Same hues the scan result uses to label a box, so the page and the model agree.
const STREAM = [
  { name: "Plastic", colour: "#3b82f6" },
  { name: "Glass", colour: "#06b6d4" },
  { name: "Metal", colour: "#64748b" },
  { name: "Paper", colour: "#d97706" },
  { name: "Organic", colour: "#16a34a" },
  { name: "Electronic", colour: "#8b5cf6" },
  { name: "Textile", colour: "#ec4899" },
  { name: "Wood", colour: "#a16207" },
  { name: "Hazardous", colour: "#dc2626" },
];

const NAV = [
  { label: "The problem", href: "#problem" },
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Results", href: "#results" },
  { label: "FAQ", href: "#faq" },
];

// Shown under the hero. Each one is a number the page later explains in full, so
// nothing here is a claim the visitor has to take on faith.
//
// Labels are short enough to hold three columns at 360px. The longer phrasing
// ("material classes, plus one for not waste") wrapped to two lines each, which made
// the hero taller than a phone screen and pushed the third stat below the fold.
const HERO_STATS = [
  { value: "9 + 1", label: "material classes" },
  { value: "3.19", label: "items per photo" },
  { value: "0", label: "sensors to fit" },
];

const PROBLEM = [
  {
    title: "Segregation fails at the source",
    body: "By the time a mixed bag reaches a transfer station, wet waste has soaked the paper and the recyclable fraction is worth almost nothing. The decision that matters is made at the bin, by someone who is not sure which side an item belongs on.",
  },
  {
    title: "Nobody knows which bin is full",
    body: "Collection runs a fixed circuit. Trucks empty bins that are a quarter full and miss the ones overflowing two streets away, because there is no fill-level signal — and sensor hardware costs money per bin, forever.",
  },
  {
    title: "The people doing the work have no record of it",
    body: "Informal waste collectors move most of what actually gets recycled. Almost none of it is documented, so there is no work history to show a lender, an employer or a municipal contract.",
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Segregate a mixed pile",
    body: "Photograph a bin and every item is found and named separately, with the recyclable share on top. A classifier on its own would return one answer for the whole scene.",
  },
  {
    icon: MapPin,
    title: "Bin reports without sensors",
    body: "Two taps and a geotag. Citizens replace fill-level hardware, so coverage costs nothing per bin — and each report is weighted by how reliable that reporter has been.",
  },
  {
    icon: Route,
    title: "Routes from what is actually full",
    body: "Collection is planned from today's reports instead of a fixed circuit, so trucks skip the bins nobody needs emptied.",
  },
  {
    icon: Recycle,
    title: "Items reused before they are waste",
    body: "Anything still usable is offered to someone nearby, with a scanned handover so neither side is taken on trust.",
  },
  {
    icon: ClipboardCheck,
    title: "A work record collectors can bank",
    body: "Collectors get tasks, photo-verified completion, and a tamper-evident history — the document a lender can actually accept.",
  },
  {
    icon: ShieldCheck,
    title: "Built to be gamed, then hardened",
    body: "Duplicate photos, spoofed locations and repeat reports are caught and recorded rather than silently dropped, so the rejection rate stays measurable.",
  },
];

// Numbered because this genuinely is a sequence: the output of each step is the
// input to the next.
const STEPS = [
  {
    step: "01",
    title: "Find the items",
    body: "A detector locates every discardable object in the frame. It is trained on a single question — is this a thing someone is throwing away — because that question has enough examples to learn from.",
  },
  {
    step: "02",
    title: "Name each material",
    body: "Each item is cropped and classified on its own. Below its calibrated confidence the answer is marked uncertain instead of asserted, so a weak guess is visible as a weak guess.",
  },
  {
    step: "03",
    title: "Act on the result",
    body: "The recyclable share goes to the ward map, reusable items go to the exchange, and full bins become a collection route for the morning.",
  },
];

const AUDIENCES = [
  {
    icon: Camera,
    who: "A resident",
    does: "Scans an item, learns where it goes, reports a full bin on the way past, and gives away what someone else can still use.",
  },
  {
    icon: ClipboardCheck,
    who: "A waste collector",
    does: "Picks up tasks nearby, verifies each with before and after photographs, and builds a work history nobody can quietly edit.",
  },
  {
    icon: Route,
    who: "A ward officer",
    does: "Sees which wards are under pressure today and sends a route built from reports rather than from habit.",
  },
];

// Published deliberately, failures included. See the comment at the top.
const RESULTS = [
  { value: "0.835", label: "classifier macro-F1", note: "9 classes, held-out test set" },
  { value: "0.653", label: "detector mAP50", note: "class-agnostic, 3.19 items per photo" },
  { value: "26.5%", label: "collection distance saved", note: "against a fixed circuit, 20–50% fill" },
];

const LIMITS = [
  "Accuracy is measured on public dataset photographs. Real waste, in real light, scores lower — closing that gap is what the local collection round is for.",
  "Above roughly 60% bin occupancy a fixed circuit beats the optimised route. Crowd-sensing pays off when bins are not uniformly full.",
  "Wood has no training data yet. No public dataset covers wood waste in a way that could be labelled honestly, so the class is declared and empty.",
];

const STACK = [
  { group: "Model", items: "PyTorch · YOLOv8 detector · MobileNetV3 classifier · ONNX" },
  { group: "Service", items: "Node · Express · MongoDB · Socket.IO" },
  { group: "Web", items: "React · Vite · Tailwind · TanStack Query · Leaflet" },
];

const FAQ = [
  {
    q: "Is the model yours, or an API?",
    a: "Ours. The detector and the classifier are both trained in this repository, from public waste datasets plus photographs collected locally, and served from our own endpoint. Nothing in the scan path calls a hosted vision API.",
  },
  {
    q: "Why two models instead of one?",
    a: "They answer different questions. A classifier shown a photograph of five objects returns one label for the whole frame. The detector finds the objects first; the classifier then names each crop. That split is what makes mixed-pile segregation possible at all.",
  },
  {
    q: "What happens when the model is unsure?",
    a: "It says so. Each class has a confidence threshold fitted on validation data, and below it the item is reported as uncertain rather than given a material. A tenth class covers photographs with no discardable item in them, so pointing the camera at a wall does not produce a confident wrong answer.",
  },
  {
    q: "Does any of this need hardware?",
    a: "No. Fill level comes from citizen reports rather than bin sensors, and location comes from the phone. The whole platform is software, which is the only version a municipality can pilot without a procurement cycle.",
  },
  {
    q: "How are fake reports handled?",
    a: "Four rules run on every submission: duplicate image hashes, distance from the bin, report frequency per user, and reporter reputation. Rejected reports are stored as rejected rather than deleted, so the rejection rate itself stays measurable.",
  },
];

function Eyebrow({ children }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, lead, className = "" }) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 max-w-2xl font-display text-[27px] font-extrabold leading-[1.12] tracking-[-0.02em] md:text-[38px]">
        {title}
      </h2>
      {lead ? (
        <p className="mt-3.5 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

// The four-point star from the reference. Decorative, so it is hidden from
// assistive technology and cannot swallow a pointer event.
function Star({ className = "", style }) {
  return (
    <svg
      viewBox="-1 0 26 24"
      aria-hidden="true"
      className={`pointer-events-none absolute text-accent-soft ${className}`}
      style={style}
      fill="currentColor"
    >
      <path d="M12 0c.6 5.9 5.5 10.8 11.4 11.4v1.2C17.5 13.2 12.6 18.1 12 24h-1.2C10.2 18.1 5.3 13.2-.6 12.6v-1.2C5.3 10.8 10.2 5.9 10.8 0Z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="focus-ring flex items-center gap-2.5 rounded-md">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
              <Recycle className="h-[17px] w-[17px]" />
            </span>
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">
              LifeLoop
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="focus-ring rounded-full px-3.5 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-accent"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Sign in is hidden on the narrowest screens: at 320px the two buttons
              plus the wordmark forced the page into horizontal scroll. The login
              page is still one tap away from Get started. */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden rounded-full xs:inline-flex" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button variant="accent" size="sm" className="rounded-full px-4 sm:px-5" asChild>
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="aura-hero pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="veil-grid pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* The arc that closes the hero: an oversized ellipse whose top edge is
              the only part on screen. It sits before the content in DOM order and
              at z-0, because both it and the content are positioned — later-in-DOM
              would otherwise paint this opaque gradient over the stats row. */}
          <div
            className="arc-hero pointer-events-none absolute -bottom-1 left-[-25%] z-0 h-[160px] w-[150%] md:h-[300px]"
            aria-hidden="true"
          />

          {/* Hidden on small screens: at 360px they land on top of the headline. */}
          <Star className="left-[8%] top-[22%] hidden h-4 w-4 animate-drift opacity-70 sm:block" />
          <Star
            className="right-[10%] top-[60%] hidden h-5 w-5 animate-drift opacity-60 sm:block"
            style={{ animationDelay: "1.4s" }}
          />

          <div className="relative z-10 mx-auto max-w-4xl px-5 pb-24 pt-14 text-center md:px-8 md:pb-52 md:pt-24">
            {/* nowrap and a short label: the longer phrasing wrapped inside the pill
                at 390px, leaving the status dot alone on the first line. */}
            <div
              className="animate-rise inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-accent/25 bg-card/70 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent sm:text-[10.5px] sm:tracking-[0.16em]"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-accent" />
              Municipal pilot · Bhimavaram
            </div>

            {/* clamp rather than a breakpoint step: "One Photograph Sorts" is 20
                characters, and at a fixed 38px it runs past a 360px viewport. */}
            <h1
              className="animate-rise mt-7 font-display font-extrabold leading-[1.05] tracking-[-0.035em]"
              style={{
                animationDelay: "0.15s",
                fontSize: "clamp(1.9rem, 8.2vw, 4.25rem)",
              }}
            >
              One Photograph Sorts
              <br />
              <span className="text-gradient-accent">The Whole Bin</span>
            </h1>

            <p
              className="animate-rise mx-auto mt-6 max-w-[36rem] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]"
              style={{ animationDelay: "0.28s" }}
            >
              LifeLoop finds every item in a mixed pile of waste, names what each one is
              made of, and says what can still be recycled. Citizen reports become
              collection routes — with no sensors to install on a single bin.
            </p>

            {/* Full width and stacked on a phone: two pills of different widths
                centred under each other read as ragged rather than as a pair. */}
            <div
              className="animate-rise mx-auto mt-9 flex max-w-xs flex-col items-stretch gap-2.5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3"
              style={{ animationDelay: "0.4s" }}
            >
              <Button variant="accent" size="lg" className="rounded-full px-7" asChild>
                <Link to="/register">
                  Scan something now
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-foreground/15 px-7"
                asChild
              >
                <a href="#how">See how it works</a>
              </Button>
            </div>

            <dl
              className="animate-rise mx-auto mt-11 grid max-w-2xl grid-cols-3 gap-3 sm:gap-6 md:mt-14"
              style={{ animationDelay: "0.52s" }}
            >
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] tabular-nums sm:text-[30px]">
                    {stat.value}
                  </dt>
                  <dd className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground sm:text-[12.5px]">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The arc that closes the hero: an oversized ellipse whose top edge is
              the only part on screen. */}
          <div
            className="arc-hero pointer-events-none absolute -bottom-1 left-[-25%] h-[220px] w-[150%] md:h-[300px]"
            aria-hidden="true"
          />
        </section>

        {/* ── The problem ───────────────────────────────────────────────── */}
        <section id="problem" className="scroll-mt-20 border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <SectionHeading
              eyebrow="Why this exists"
              title="Municipal waste is not a collection problem. It is a sorting problem."
              lead="Almost everything in a bin could be recovered. What stops it is that the sorting decision happens at the wrong moment, by someone with no way to check, and nothing downstream can undo it."
            />

            <div className="mt-11 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border md:grid-cols-3">
              {PROBLEM.map((item, index) => (
                <div key={item.title} className="bg-card p-6">
                  <div className="font-mono text-[11px] tracking-[0.16em] text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-3 font-display text-[16.5px] font-bold leading-snug tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Signature: the material stream strip ──────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <SectionHeading
            eyebrow="What it can tell apart"
            title="Nine materials, and the honesty to say “none of these”"
            lead="These are the classes the model predicts, in the colours the app uses to label them. A tenth class covers photographs with no discardable item in them, so the model can decline instead of guessing at a blank wall."
          />

          <div className="mt-10 overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
            <div className="flex h-2.5">
              {STREAM.map((stream) => (
                <div
                  key={stream.name}
                  className="flex-1"
                  style={{ backgroundColor: stream.colour }}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 divide-x divide-y divide-border sm:grid-cols-5 lg:grid-cols-9 lg:divide-y-0">
              {STREAM.map((stream) => (
                <div key={stream.name} className="px-3 py-4">
                  <div className="text-[18px] leading-none">
                    {MATERIAL_GUIDE[stream.name]?.icon}
                  </div>
                  <div className="mt-2 text-[12.5px] font-medium leading-tight">
                    {stream.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <SectionHeading
              eyebrow="How one photograph becomes a decision"
              title="Two models, because one cannot answer both questions"
            />

            <ol className="mt-11 grid gap-8 md:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint font-mono text-[12.5px] font-semibold text-accent">
                      {item.step}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-4 font-display text-[17px] font-bold tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24"
        >
          <SectionHeading
            eyebrow="The loop"
            title="Classify, incentivise, collect, formalise, reuse"
            lead="These pieces exist separately elsewhere. Closing the loop between them, in software, with no hardware to install, is the part that is new."
          />

          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-[var(--radius)] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-tint text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="h-[19px] w-[19px]" />
                </div>
                <h3 className="mt-4 font-display text-[16px] font-bold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Audiences ─────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <SectionHeading
              eyebrow="Who it is for"
              title="Three people open the same app and see different work"
            />

            <div className="mt-11 grid gap-4 md:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, who, does }) => (
                <div
                  key={who}
                  className="rounded-[var(--radius)] border border-accent/15 bg-accent-tint/60 p-6"
                >
                  <Icon className="h-[19px] w-[19px] text-accent" />
                  <h3 className="mt-3.5 font-display text-[16px] font-bold tracking-[-0.01em]">
                    {who}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {does}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Measured results ──────────────────────────────────────────── */}
        <section
          id="results"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24"
        >
          <SectionHeading
            eyebrow="Measured, not claimed"
            title="Every number here comes with the conditions it was measured under"
          />

          <div className="mt-11 grid gap-6 sm:grid-cols-3">
            {RESULTS.map((result) => (
              <div key={result.label} className="border-t-2 border-accent pt-4">
                <div className="font-display text-[42px] font-extrabold leading-none tracking-[-0.035em] tabular-nums">
                  {result.value}
                </div>
                <div className="mt-2.5 text-[13.5px] font-medium">{result.label}</div>
                <div className="mt-1 font-mono text-[11.5px] text-muted-foreground">
                  {result.note}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[var(--radius)] border border-border bg-card p-6">
            <h3 className="font-display text-[15px] font-bold">
              And where it currently fails
            </h3>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {LIMITS.map((limit) => (
                <li key={limit} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Named plainly rather than shown as a logo wall: a reader who wants to
              know what this is built on wants the list, not the badges. */}
          <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
            {STACK.map((layer) => (
              <div key={layer.group} className="bg-card px-5 py-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent">
                  {layer.group}
                </div>
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {layer.items}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-20 border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <SectionHeading eyebrow="FAQ" title="The five questions everyone asks first" />

            <div className="mt-10 max-w-3xl divide-y divide-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-md">
                    <span className="font-display text-[15.5px] font-bold tracking-[-0.01em]">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-accent transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl pr-10 text-[13.5px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Close ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="aura-hero pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-5 py-20 text-center md:px-8 md:py-28">
            <h2 className="mx-auto max-w-2xl font-display text-[29px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[44px]">
              Most of what goes to landfill
              <br />
              <span className="text-gradient-accent">did not need to</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
              Start with one photograph of whatever you were about to throw away.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="accent" size="lg" className="rounded-full px-7" asChild>
                <Link to="/register">
                  Create an account
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-foreground/15 px-7"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-9 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
              <Recycle className="h-[15px] w-[15px]" />
            </span>
            <div className="text-[12.5px] text-muted-foreground">
              <span className="font-display font-bold text-foreground">LifeLoop</span>
              <span className="ml-2">
                Final year project · B.Tech CSE, SRKR Engineering College, Bhimavaram
              </span>
            </div>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            SDG 11 · 12 · 13
          </div>
        </div>
      </footer>
    </div>
  );
}

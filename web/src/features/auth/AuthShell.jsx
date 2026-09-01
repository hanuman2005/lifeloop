// The shell behind sign-in, registration and password reset.
//
// It used to be a centred card on an empty page, on the argument that these
// screens exist to be got through rather than admired. That is true of the form —
// and false of the page, which is the first thing anyone sees after the landing
// page and the only screen a visitor reaches before they have any reason to trust
// the product.
//
// So the left panel states what LifeLoop does in the one way this product can:
// the nine material classes the model predicts, stacked as a sorted pile, in the
// exact colours the scanner labels a result with. It is the landing page's
// signature carried through to the door, and it cannot drift from the product
// because the same values appear in features/scanner/materials.js.
//
// The panel is deep violet rather than another pale surface. Nine material colours
// need a dark ground to read against, and a login that is half dark and half light
// is memorable in a way a centred card on white is not.
//
// On a phone the panel collapses to a single colour band. A tall brand panel above
// a form is just something to scroll past on the screen where scrolling costs most.

import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";

// Same hues as features/scanner/materials.js and the landing page strip.
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

// Published, not rounded up. The same figures the landing page carries.
const PROOF = [
  { value: "0.835", label: "classifier macro-F1" },
  { value: "0.746", label: "detector mAP50" },
  { value: "0", label: "sensors to fit" },
];

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[hsl(263_45%_11%)] lg:flex lg:flex-col lg:justify-between">
      {/* Same atmosphere as the landing hero, at a lower opacity so the material
          colours stay the brightest thing on the panel. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(70% 50% at 20% 0%, hsl(258 90% 60% / 0.30) 0%, transparent 70%), radial-gradient(50% 40% at 90% 90%, hsl(280 80% 55% / 0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, hsl(0 0% 100% / 0.035) 0 1px, transparent 1px 68px), repeating-linear-gradient(to bottom, hsl(0 0% 100% / 0.03) 0 1px, transparent 1px 68px)",
        }}
      />

      <div className="relative px-10 pt-10">
        <Link to="/" className="inline-flex flex-col">
          <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-white">
            LifeLoop
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/45">
            Circular economy
          </span>
        </Link>
      </div>

      <div className="relative px-10">
        <h2 className="max-w-[15ch] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
          Sort it before you bin it.
        </h2>
        <p className="mt-4 max-w-[34ch] text-[13.5px] leading-relaxed text-white/60">
          Photograph a mixed pile. Every item is found and named separately, and the
          recyclable share comes back on top.
        </p>

        {/* The signature: nine classes as a sorted stack. Each row is one class,
            its bar width fixed rather than data-driven — this states what the model
            can tell apart, not how much of anything this person has. */}
        <ul className="mt-8 space-y-[7px]">
          {STREAM.map((stream, index) => (
            <li
              key={stream.name}
              className="animate-slide-in-left flex items-center gap-3"
              style={{ animationDelay: `${120 + index * 55}ms`, animationFillMode: "backwards" }}
            >
              <span
                className="h-[3px] w-14 shrink-0 rounded-full"
                style={{ backgroundColor: stream.colour }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
                {stream.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative border-t border-white/10 px-10 py-7">
        <dl className="flex gap-8">
          {PROOF.map((item) => (
            <div key={item.label}>
              <dt className="font-display text-[19px] font-bold leading-none tabular-nums text-white">
                {item.value}
              </dt>
              <dd className="mt-1.5 max-w-[11ch] font-mono text-[9.5px] uppercase leading-snug tracking-[0.12em] text-white/40">
                {item.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,460px)_1fr]">
      <BrandPanel />

      <div className="flex min-h-screen flex-col lg:min-h-0">
        {/* The phone version of the panel: one band of the nine colours. It carries
            the same idea in 4px instead of 400. */}
        <div className="flex h-1 lg:hidden" aria-hidden="true">
          {STREAM.map((stream) => (
            <div key={stream.name} className="flex-1" style={{ backgroundColor: stream.colour }} />
          ))}
        </div>

        <header className="px-5 py-5 lg:hidden">
          <Link to="/" className="inline-flex items-baseline gap-2">
            <span className="font-display text-[16px] font-extrabold tracking-[-0.02em]">
              LifeLoop
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Circular economy
            </span>
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-2 sm:items-center sm:pt-0 lg:px-8 lg:py-14">
          <div className={wide ? "w-full max-w-lg" : "w-full max-w-sm"}>
            <div className="mb-5">
              <h1 className="font-display text-[26px] font-extrabold tracking-[-0.025em] text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            <Card className="shadow-md">
              <CardContent className="pt-6">{children}</CardContent>
            </Card>

            {footer && (
              <p className="mt-5 text-center text-[13px] text-muted-foreground">{footer}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

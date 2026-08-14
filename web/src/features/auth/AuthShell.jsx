// Centred card used by sign-in and registration.
//
// Deliberately plain: these screens exist to be got through, not admired, and
// the visual weight belongs to the scanner and the map.

import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";

export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-5">
        <Link to="/" className="inline-flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight">LifeLoop</span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Circular economy
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-16 pt-2 sm:items-center sm:pt-0">
        <div className={wide ? "w-full max-w-lg" : "w-full max-w-sm"}>
          <div className="mb-5">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>}
          </div>

          <Card className="shadow-sm">
            <CardContent className="pt-6">{children}</CardContent>
          </Card>

          {footer && (
            <p className="mt-5 text-center text-[13px] text-muted-foreground">{footer}</p>
          )}
        </div>
      </main>
    </div>
  );
}

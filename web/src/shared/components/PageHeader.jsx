// The heading block every screen opens with.
//
// Each page had written its own, and they had drifted — different sizes, different
// gaps, some with a description and some without, the action button sometimes
// wrapping onto its own line on a phone. One component keeps the rhythm the same
// from screen to screen, which is most of what makes a set of pages feel finished.

export function PageHeader({ title, description, action, eyebrow }) {
  return (
    <header>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-[22px] font-bold tracking-tight">{title}</h1>
        </div>
        {/* shrink-0 because an action is usually a button, and letting it compress
            turns the label into two cramped lines on a narrow screen. */}
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {description && (
        <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}

export default PageHeader;

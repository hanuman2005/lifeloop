import { Card, CardContent } from "@/components/ui/card";

function StatCard({ icon: Icon, label, value, suffix, tone = "" }) {
  return (
    <Card>
      <CardContent className="py-4">
        {Icon && <Icon className="h-4 w-4 text-accent" />}
        <div className={`mt-2 text-[22px] font-semibold tabular-nums leading-none ${tone}`}>
          {value}
          {suffix && <span className="ml-1 text-[13px] font-normal text-muted-foreground">{suffix}</span>}
        </div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;

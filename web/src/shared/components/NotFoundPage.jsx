import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">404</div>
      <h1 className="text-[22px] font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-[13.5px] text-muted-foreground">
        That page does not exist. It may have moved, or the link may be out of date.
      </p>
      <Button asChild>
        <Link to="/scan">Back to the scanner</Link>
      </Button>
    </div>
  );
}

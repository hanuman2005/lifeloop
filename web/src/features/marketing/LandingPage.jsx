import { Link } from "react-router-dom";
import { ArrowRight, Camera, MapPin, Recycle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MODULES = [
  { icon: Camera, title: "AI waste scanner", body: "Photograph an item and find out what it is made of and what to do with it." },
  { icon: Recycle, title: "The exchange", body: "Give items a second owner before they ever become waste." },
  { icon: MapPin, title: "Crowd-sensed bins", body: "Citizens report bin status, producing a live ward map without any sensors." },
  { icon: Users, title: "Collector inclusion", body: "Waste collectors get digital identity, tasks and a verifiable work record." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">LifeLoop</div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Circular economy
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
          <Button asChild><Link to="/register">Get started</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-10 md:px-10 md:pt-16">
        <h1 className="max-w-2xl text-[30px] font-semibold leading-[1.15] tracking-tight md:text-[42px]">
          Decide what to do with an item{" "}
          <span className="text-accent">before</span> you throw it away.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Most platforms assume you want to donate. LifeLoop uses a waste classifier trained
          on local data to help you make the smarter decision first — reuse, recycle,
          compost or give away.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/register">Create an account<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild><Link to="/login">I already have one</Link></Button>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          {MODULES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <Icon className="h-5 w-5 text-accent" />
                <div className="mt-3 text-[14.5px] font-medium">{title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

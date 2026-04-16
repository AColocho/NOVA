import { ArrowRight, Sparkles } from "lucide-react";

import { AppCard } from "@/components/app-card";
import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { APP_REGISTRY } from "@/lib/apps";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Welcome Home
          </Badge>
        </div>
        <PageIntro
          eyebrow="Home"
          title="Choose an app and get started."
          description="This home screen keeps your tools in one calm place. Open Recipes to manage saved meals or Receipts to review purchases, upload scans, and track what you spent."
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">
              Apps
            </h2>
            <p className="text-sm text-muted-foreground">
              Your main tools live here.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
            Open
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {APP_REGISTRY.map((app) => (
            <AppCard key={app.href} app={app} />
          ))}
        </div>
      </section>
    </main>
  );
}

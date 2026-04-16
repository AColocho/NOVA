import { Clock3, Info } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <PageIntro
          eyebrow="Analytics"
          title="Spending insights are coming soon."
          description="This section is being prepared for easy-to-read charts and summaries."
        />
      </section>

      <EmptyState
        title="Nothing to show here yet"
        description="Charts and summaries will appear here once this section is ready."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="size-5" />
            What to expect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-[1.25rem] bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
            Track spending over time
          </div>
          <div className="rounded-[1.25rem] bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
            Compare categories at a glance
          </div>
          <div className="rounded-[1.25rem] bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
            Review simple summaries without extra setup
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/75">
        <CardContent className="flex gap-3 pt-6 text-sm leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            For now, Recipes is the main part of the app. This area will expand with
            clear charts and simple summaries later on.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

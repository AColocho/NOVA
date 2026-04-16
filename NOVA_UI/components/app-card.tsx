import Link from "next/link";
import { ArrowUpRight, Grid2x2 } from "lucide-react";

import type { AppDefinition } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppCardProps = {
  app: AppDefinition;
};

export function AppCard({ app }: AppCardProps) {
  return (
    <Link href={app.href} className="group block">
      <Card className="h-full overflow-hidden transition-transform duration-200 group-hover:-translate-y-1">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-14 items-center justify-center rounded-[1.35rem] bg-secondary text-secondary-foreground">
              <Grid2x2 className="size-6" />
            </div>
            {app.badge ? (
              <Badge className="bg-accent text-accent-foreground">{app.badge}</Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <CardTitle>{app.name}</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{app.description}</p>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-1 text-sm font-semibold text-primary">
          <span>Open app</span>
          <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

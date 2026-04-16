import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 pt-6">
        <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-secondary text-secondary-foreground">
          <FilePlus2 className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {href && actionLabel ? (
          <Button asChild>
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

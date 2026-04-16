import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description,
  actionLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 pt-6">
        <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {onRetry ? <Button onClick={onRetry}>{actionLabel}</Button> : null}
      </CardContent>
    </Card>
  );
}

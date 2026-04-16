import { cn } from "@/lib/utils";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  className,
}: PageIntroProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

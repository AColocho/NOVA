import Link from "next/link";
import type { ReactNode } from "react";

import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  badge,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center py-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/78 p-8 shadow-[var(--shadow-soft)] backdrop-blur sm:p-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(235,174,106,0.2),transparent_55%),radial-gradient(circle_at_top_right,rgba(125,188,173,0.16),transparent_42%)]" />
          <div className="relative space-y-8">
            <Badge className="bg-accent text-accent-foreground">{badge}</Badge>
            <PageIntro
              eyebrow={eyebrow}
              title={title}
              description={description}
              className="max-w-xl"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-white/70 bg-white/65">
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold text-foreground">
                    Shared home space
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Everyone in your home shares the same recipes, receipts, and
                    future household tools.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/70 bg-white/65">
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold text-foreground">
                    Easy to return to
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Once you are signed in, you can move through the app without
                    starting over each time.
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Need a different page? Go to{" "}
              <Link href="/auth/login" className="font-semibold text-primary">
                sign in
              </Link>{" "}
              or{" "}
              <Link
                href="/auth/create-home"
                className="font-semibold text-primary"
              >
                set up a home
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-white/70 bg-white/88 p-6 shadow-[var(--shadow-soft)] backdrop-blur sm:p-8">
          <div className="space-y-6">
            {children}
            <div className="border-t border-border pt-5 text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

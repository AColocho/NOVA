"use client";

import Link from "next/link";
import { HousePlus, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPostAuthRedirect } from "@/lib/auth-shared";
import { getApiErrorMessage, registerHome } from "@/lib/api";

export function CreateHomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [homeName, setHomeName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        await registerHome({
          homeName: homeName.trim(),
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        });

        toast.success("Home created.");
        router.replace(getPostAuthRedirect(searchParams.get("next")));
        router.refresh();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    });
  };

  return (
    <AuthPageShell
      eyebrow="First setup"
      title="Set up the home that brings everything together."
      description="This creates the first account for your home and signs you in right away. After that, recipes and receipts stay together in one place."
      badge="Create Home"
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-primary">
            Log in instead
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">Create home</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This first account gets your home started.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Home name</span>
          <Input
            autoComplete="organization"
            placeholder="Jarvis Home"
            value={homeName}
            onChange={(event) => setHomeName(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">
            Display name
          </span>
          <Input
            autoComplete="name"
            placeholder="Jarvis"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Email</span>
          <Input
            type="email"
            autoComplete="email"
            placeholder="alex@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Password</span>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">
            Confirm password
          </span>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {errorMessage ? (
          <div className="rounded-[1.25rem] border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <Button className="w-full" size="lg" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Creating home
            </>
          ) : (
            <>
              <HousePlus className="size-4" />
              Create home
            </>
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}

"use client";

import Link from "next/link";
import { LogIn, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPostAuthRedirect } from "@/lib/auth-shared";
import { getApiErrorMessage, login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        await login({
          email: email.trim(),
          password,
        });

        toast.success("Signed in.");
        router.replace(getPostAuthRedirect(searchParams.get("next")));
        router.refresh();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    });
  };

  return (
    <AuthPageShell
      eyebrow="Welcome back"
      title="Log in to your home."
      description="Use the email and password for your home account. Once you are in, your tools are ready for you."
      badge="Login"
      footer={
        <p>
          New here?{" "}
          <Link href="/auth/create-home" className="font-semibold text-primary">
            Set up your home
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-foreground">Sign in</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Enter your details to open your home.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
              Signing in
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Log in
            </>
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}

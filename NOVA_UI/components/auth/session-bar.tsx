"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clearAuthSession, getStoredAuthUser } from "@/lib/auth";

export function SessionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredAuthUser();

  if (pathname.startsWith("/auth") || !user) {
    return null;
  }

  const handleLogout = () => {
    clearAuthSession();
    toast.success("Signed out.");
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <header className="mb-5 flex flex-col gap-3 rounded-[1.7rem] border border-white/70 bg-white/76 px-4 py-4 shadow-[var(--shadow-soft)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {user.displayName || user.email}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {user.email}
            {user.isHomeAdmin ? " · Main account" : ""}
          </p>
        </div>
      </div>

      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="size-4" />
        Log out
      </Button>
    </header>
  );
}

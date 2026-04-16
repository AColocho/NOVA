import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionBar } from "@/components/auth/session-bar";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nova Dashboard",
    template: "%s | Nova Dashboard",
  },
  description:
    "A mobile-friendly personal dashboard for recipes, analytics, and future household apps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-8">
            <SessionBar />
            {children}
          </div>
          <Toaster richColors position="top-center" />
        </div>
      </body>
    </html>
  );
}

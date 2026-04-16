"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, ReceiptText, ScanLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getReceipts } from "@/lib/api";
import type { ReceiptSummary } from "@/types";

function formatDate(value: string) {
  if (!value) {
    return "Date unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(amount: string, currencyCode: string) {
  const numericAmount = Number(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function formatLocation(receipt: ReceiptSummary) {
  return [receipt.city, receipt.state].filter(Boolean).join(", ") || "Location not added";
}

function ReceiptListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ReceiptsList() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReceipts = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getReceipts({ signal });
      setReceipts(data);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadReceipts(controller.signal);

    return () => controller.abort();
  }, [loadReceipts]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <PageIntro
              eyebrow="Receipts"
              title="Review recent purchases."
              description="Open saved receipts to see totals, items, and savings in the same calm layout used across the app."
            />
            <Button asChild size="lg">
              <Link href="/receipts/new">
                <Plus className="size-4" />
                Add Receipt
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? <ReceiptListSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState
          description={errorMessage}
          onRetry={() => void loadReceipts()}
        />
      ) : null}

      {!isLoading && !errorMessage && receipts.length === 0 ? (
        <EmptyState
          title="No receipts yet"
          description="Upload a scan or enter one manually to start building your receipt history."
          href="/receipts/new"
          actionLabel="Add your first receipt"
        />
      ) : null}

      {!isLoading && !errorMessage && receipts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`} className="group block">
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-secondary text-secondary-foreground">
                      <ReceiptText className="size-6" />
                    </div>
                    <Badge className="bg-accent text-accent-foreground">
                      {receipt.scanLocation ? (
                        <>
                          <ScanLine className="size-3.5" />
                          Scanned
                        </>
                      ) : (
                        "Manual"
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{receipt.storeName}</CardTitle>
                    <CardDescription>
                      {formatDate(receipt.receiptDate)}
                      {receipt.invoiceNumber ? ` • Invoice ${receipt.invoiceNumber}` : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.35rem] bg-secondary/65 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Total
                    </p>
                    <p className="mt-1 font-display text-2xl text-foreground">
                      {formatCurrency(receipt.totalAmount, receipt.currencyCode)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold text-primary">
                    <span>{formatLocation(receipt)}</span>
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

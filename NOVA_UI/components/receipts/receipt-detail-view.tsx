"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  LoaderCircle,
  MapPin,
  PencilLine,
  ReceiptText,
  ScanLine,
  Trash2,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
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
import { deleteReceipt, getApiErrorMessage, getReceipt } from "@/lib/api";
import type { Receipt, ReceiptDiscount, ReceiptItem } from "@/types";

type ReceiptDetailViewProps = {
  id: string;
};

function formatDate(value: string, withTime = false) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {}),
  }).format(parsed);
}

function formatCurrency(amount: string, currencyCode: string) {
  const numericAmount = Number(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function formatQuantity(quantity: string) {
  const numericQuantity = Number(quantity);

  if (!Number.isFinite(numericQuantity)) {
    return quantity;
  }

  return Number.isInteger(numericQuantity)
    ? String(numericQuantity)
    : numericQuantity.toFixed(2);
}

function formatLocation(receipt: Receipt) {
  return [receipt.city, receipt.state].filter(Boolean).join(", ") || "Location not added";
}

function ReceiptDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-32 rounded-full" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DiscountList({
  discounts,
  currencyCode,
  emptyCopy,
}: {
  discounts: ReceiptDiscount[];
  currencyCode: string;
  emptyCopy: string;
}) {
  if (discounts.length === 0) {
    return <p className="text-sm leading-6 text-muted-foreground">{emptyCopy}</p>;
  }

  return (
    <div className="space-y-3">
      {discounts.map((discount, index) => (
        <div
          key={discount.discountId ?? `${discount.label}-${index}`}
          className="flex items-center justify-between rounded-[1.2rem] bg-secondary/65 px-4 py-3"
        >
          <span className="text-sm font-semibold text-foreground">{discount.label}</span>
          <span className="text-sm text-muted-foreground">
            -{formatCurrency(discount.amount, currencyCode)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ItemCard({ item, currencyCode }: { item: ReceiptItem; currencyCode: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/75 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {item.lineNumber ? (
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {item.lineNumber}
              </span>
            ) : null}
            <h3 className="font-semibold text-foreground">{item.itemName}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Qty {formatQuantity(item.quantity)}
            {item.unitPriceAmount
              ? ` • ${formatCurrency(item.unitPriceAmount, currencyCode)} each`
              : ""}
          </p>
        </div>
        <div className="rounded-[1rem] bg-secondary/75 px-3 py-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Line total
          </p>
          <p className="font-semibold text-foreground">
            {formatCurrency(item.totalAmount, currencyCode)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.1rem] bg-background/70 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Gross
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(item.grossAmount, currencyCode)}
          </p>
        </div>
        <div className="rounded-[1.1rem] bg-background/70 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Discount
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(item.discountAmount, currencyCode)}
          </p>
        </div>
        <div className="rounded-[1.1rem] bg-background/70 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(item.totalAmount, currencyCode)}
          </p>
        </div>
      </div>

      {item.discounts.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Item discounts
          </p>
          <DiscountList
            discounts={item.discounts}
            currencyCode={currencyCode}
            emptyCopy="No item discounts"
          />
        </div>
      ) : null}
    </div>
  );
}

export function ReceiptDetailView({ id }: ReceiptDetailViewProps) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReceipt = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getReceipt(id, { signal });
      setReceipt(data);
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
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadReceipt(controller.signal);

    return () => controller.abort();
  }, [loadReceipt]);

  async function handleDelete() {
    if (!receipt) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${receipt.storeName}? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteReceipt(id);
      toast.success("Receipt deleted", {
        description: `${receipt.storeName} has been removed.`,
      });
      startTransition(() => {
        router.push("/receipts");
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not delete receipt", {
        description: message,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <ReceiptDetailSkeleton />;
  }

  if (errorMessage && !receipt) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/receipts">
            <ArrowLeft className="size-4" />
            Back to receipts
          </Link>
        </Button>
        <ErrorState
          description={errorMessage}
          onRetry={() => void loadReceipt()}
        />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/receipts">
            <ArrowLeft className="size-4" />
            Back to receipts
          </Link>
        </Button>
        <EmptyState
          title="Receipt not found"
          description="This receipt could not be opened right now. It may have been removed."
          href="/receipts"
          actionLabel="Return to receipts"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/receipts">
            <ArrowLeft className="size-4" />
            Back to receipts
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/receipts/${id}/edit`}>
            <PencilLine className="size-4" />
            Edit receipt
          </Link>
        </Button>
        <Button
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Delete receipt
            </>
          )}
        </Button>
        <Button asChild>
          <Link href="/receipts/new">Add another receipt</Link>
        </Button>
      </div>

      {errorMessage ? <ErrorState description={errorMessage} /> : null}

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-secondary text-secondary-foreground">
                <ReceiptText className="size-7" />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl">{receipt.storeName}</CardTitle>
                  <CardDescription className="text-base">
                    {receipt.invoiceNumber
                      ? `Invoice ${receipt.invoiceNumber}`
                      : "No invoice number added"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-accent text-accent-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDate(receipt.receiptDate)}
                  </Badge>
                  <Badge className="bg-secondary text-secondary-foreground">
                    <MapPin className="size-3.5" />
                    {formatLocation(receipt)}
                  </Badge>
                  <Badge className="bg-white/80 text-foreground">
                    <BadgeDollarSign className="size-3.5" />
                    {receipt.currencyCode}
                  </Badge>
                  {receipt.scanLocation ? (
                    <Badge className="bg-white/80 text-foreground">
                      <ScanLine className="size-3.5" />
                      Scanned
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-accent/75 px-5 py-4 sm:min-w-52">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-foreground/70">
                Total
              </p>
              <p className="mt-2 font-display text-3xl text-foreground">
                {formatCurrency(receipt.totalAmount, receipt.currencyCode)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipt summary</CardTitle>
              <CardDescription>Key fields from the saved record.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-secondary/65 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Subtotal
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatCurrency(receipt.subtotalAmount, receipt.currencyCode)}
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/65 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Savings
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatCurrency(receipt.receiptDiscountTotal, receipt.currencyCode)}
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/65 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Tax
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatCurrency(receipt.taxAmount, receipt.currencyCode)}
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/65 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Last updated
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatDate(receipt.updatedAt, true)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extra savings</CardTitle>
              <CardDescription>Savings applied across the whole purchase.</CardDescription>
            </CardHeader>
            <CardContent>
              <DiscountList
                discounts={receipt.receiptDiscounts}
                currencyCode={receipt.currencyCode}
                emptyCopy="No extra savings were added."
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>
              {receipt.items.length} saved item{receipt.items.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {receipt.items.length > 0 ? (
              <div className="space-y-4">
                {receipt.items.map((item, index) => (
                  <ItemCard
                    key={item.itemId ?? `${item.itemName}-${index}`}
                    item={item}
                    currencyCode={receipt.currencyCode}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No receipt items were saved for this record.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

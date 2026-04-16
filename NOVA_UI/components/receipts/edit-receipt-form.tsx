"use client";

import type { FormEvent } from "react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getReceipt, updateReceipt } from "@/lib/api";
import type { Receipt, ReceiptDiscount, ReceiptDraft, ReceiptItem } from "@/types";

type EditReceiptFormProps = {
  id: string;
};

type EditableDiscount = {
  id: string;
  label: string;
  amount: string;
};

type EditableItem = {
  id: string;
  itemName: string;
  quantity: string;
  unitPriceAmount: string;
  grossAmount: string;
  discountAmount: string;
  totalAmount: string;
  discountLabel: string;
};

type ReceiptFormValues = {
  storeName: string;
  invoiceNumber: string;
  receiptDate: string;
  city: string;
  state: string;
  currencyCode: string;
  subtotalAmount: string;
  receiptDiscountTotal: string;
  taxAmount: string;
  totalAmount: string;
  scanLocation: string;
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

function createEmptyItem(): EditableItem {
  return {
    id: createId(),
    itemName: "",
    quantity: "1",
    unitPriceAmount: "",
    grossAmount: "",
    discountAmount: "0.00",
    totalAmount: "",
    discountLabel: "",
  };
}

function createEmptyDiscount(): EditableDiscount {
  return {
    id: createId(),
    label: "",
    amount: "",
  };
}

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase().slice(0, 3);
}

function getReceiptFormValues(receipt: Receipt): {
  formValues: ReceiptFormValues;
  items: EditableItem[];
  receiptDiscounts: EditableDiscount[];
} {
  return {
    formValues: {
      storeName: receipt.storeName,
      invoiceNumber: receipt.invoiceNumber ?? "",
      receiptDate: receipt.receiptDate,
      city: receipt.city ?? "",
      state: receipt.state ?? "",
      currencyCode: receipt.currencyCode,
      subtotalAmount: receipt.subtotalAmount,
      receiptDiscountTotal: receipt.receiptDiscountTotal,
      taxAmount: receipt.taxAmount,
      totalAmount: receipt.totalAmount,
      scanLocation: receipt.scanLocation ?? "",
    },
    items:
      receipt.items.length > 0
        ? receipt.items.map((item) => ({
            id: item.itemId ?? createId(),
            itemName: item.itemName,
            quantity: item.quantity,
            unitPriceAmount: item.unitPriceAmount ?? "",
            grossAmount: item.grossAmount,
            discountAmount: item.discountAmount,
            totalAmount: item.totalAmount,
            discountLabel: item.discounts[0]?.label ?? "",
          }))
        : [createEmptyItem()],
    receiptDiscounts: receipt.receiptDiscounts.map((discount) => ({
      id: discount.discountId ?? createId(),
      label: discount.label,
      amount: discount.amount,
    })),
  };
}

function toDraftDiscounts(discounts: EditableDiscount[]): ReceiptDiscount[] {
  return discounts
    .map((discount) => ({
      label: discount.label.trim(),
      amount: discount.amount.trim(),
    }))
    .filter((discount) => discount.label && discount.amount);
}

function buildReceiptDraft(
  formValues: ReceiptFormValues,
  items: EditableItem[],
  receiptDiscounts: EditableDiscount[],
): ReceiptDraft {
  const normalizedItems: ReceiptItem[] = items
    .map((item) => {
      const trimmedDiscountAmount = item.discountAmount.trim() || "0.00";
      const itemDiscounts: ReceiptDiscount[] =
        item.discountLabel.trim() && Number(trimmedDiscountAmount) > 0
          ? [
              {
                label: item.discountLabel.trim(),
                amount: trimmedDiscountAmount,
              },
            ]
          : [];

      return {
        itemName: item.itemName.trim(),
        quantity: item.quantity.trim() || "1",
        unitPriceAmount: item.unitPriceAmount.trim(),
        grossAmount: item.grossAmount.trim(),
        discountAmount: trimmedDiscountAmount,
        totalAmount: item.totalAmount.trim(),
        discounts: itemDiscounts,
      };
    })
    .filter((item) => item.itemName && item.grossAmount && item.totalAmount);

  return {
    storeName: formValues.storeName.trim(),
    invoiceNumber: formValues.invoiceNumber.trim(),
    receiptDate: formValues.receiptDate,
    city: formValues.city.trim(),
    state: formValues.state.trim(),
    scanLocation: formValues.scanLocation,
    currencyCode: normalizeCurrencyCode(formValues.currencyCode) || "USD",
    subtotalAmount: formValues.subtotalAmount.trim(),
    receiptDiscountTotal: formValues.receiptDiscountTotal.trim() || "0.00",
    taxAmount: formValues.taxAmount.trim() || "0.00",
    totalAmount: formValues.totalAmount.trim(),
    receiptDiscounts: toDraftDiscounts(receiptDiscounts),
    items: normalizedItems,
  };
}

function EditReceiptSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-36 rounded-full" />
      <Skeleton className="h-28 w-full rounded-[2rem]" />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function EditReceiptForm({ id }: EditReceiptFormProps) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [formValues, setFormValues] = useState<ReceiptFormValues>({
    storeName: "",
    invoiceNumber: "",
    receiptDate: "",
    city: "",
    state: "",
    currencyCode: "USD",
    subtotalAmount: "",
    receiptDiscountTotal: "0.00",
    taxAmount: "0.00",
    totalAmount: "",
    scanLocation: "",
  });
  const [items, setItems] = useState<EditableItem[]>([createEmptyItem()]);
  const [receiptDiscounts, setReceiptDiscounts] = useState<EditableDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const previewCounts = useMemo(
    () => ({
      itemCount: items.filter((item) => item.itemName.trim()).length,
      discountCount: receiptDiscounts.filter((discount) => discount.label.trim()).length,
    }),
    [items, receiptDiscounts],
  );

  const loadReceipt = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getReceipt(id, { signal });
      setReceipt(data);
      const nextValues = getReceiptFormValues(data);
      setFormValues(nextValues.formValues);
      setItems(nextValues.items);
      setReceiptDiscounts(nextValues.receiptDiscounts);
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

  function updateFormValue<K extends keyof ReceiptFormValues>(
    key: K,
    value: ReceiptFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateItem(id: string, key: keyof EditableItem, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function updateReceiptDiscount(
    id: string,
    key: keyof EditableDiscount,
    value: string,
  ) {
    setReceiptDiscounts((current) =>
      current.map((discount) =>
        discount.id === id
          ? {
              ...discount,
              [key]: value,
            }
          : discount,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = buildReceiptDraft(formValues, items, receiptDiscounts);

    if (!draft.storeName) {
      setErrorMessage("Add the store name before saving.");
      return;
    }

    if (!draft.receiptDate) {
      setErrorMessage("Add the receipt date before saving.");
      return;
    }

    if (!draft.subtotalAmount || !draft.totalAmount) {
      setErrorMessage("Add both subtotal and total before saving.");
      return;
    }

    if (draft.items.length === 0) {
      setErrorMessage("Add at least one item with an amount and a total.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const savedReceipt = await updateReceipt(id, draft);

      toast.success("Receipt updated", {
        description: `${savedReceipt.storeName} has been saved.`,
      });

      startTransition(() => {
        router.push(`/receipts/${savedReceipt.id}`);
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not update receipt", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <EditReceiptSkeleton />;
  }

  if (errorMessage && !receipt) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={`/receipts/${id}`}>
            <ArrowLeft className="size-4" />
            Back to receipt
          </Link>
        </Button>
        <ErrorState description={errorMessage} onRetry={() => void loadReceipt()} />
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
          description="This receipt could not be opened for editing right now."
          href="/receipts"
          actionLabel="Return to receipts"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href={`/receipts/${id}`}>
                <ArrowLeft className="size-4" />
                Back to receipt
              </Link>
            </Button>
          </div>
          <PageIntro
            eyebrow="Edit Receipt"
            title={`Update ${receipt.storeName}`}
            description="Change the store name, date, totals, items, or savings, then save when you are ready."
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
          <CardDescription>
            Change anything you need and save the latest version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-foreground">Store name</span>
                <Input
                  value={formValues.storeName}
                  onChange={(event) => updateFormValue("storeName", event.target.value)}
                  placeholder="Maple Market"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Invoice number</span>
                <Input
                  value={formValues.invoiceNumber}
                  onChange={(event) => updateFormValue("invoiceNumber", event.target.value)}
                  placeholder="A-1042"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Receipt date</span>
                <Input
                  type="date"
                  value={formValues.receiptDate}
                  onChange={(event) => updateFormValue("receiptDate", event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">City</span>
                <Input
                  value={formValues.city}
                  onChange={(event) => updateFormValue("city", event.target.value)}
                  placeholder="Brooklyn"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">State</span>
                <Input
                  value={formValues.state}
                  onChange={(event) => updateFormValue("state", event.target.value)}
                  placeholder="NY"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Currency</span>
                <Input
                  value={formValues.currencyCode}
                  onChange={(event) =>
                    updateFormValue("currencyCode", normalizeCurrencyCode(event.target.value))
                  }
                  maxLength={3}
                  placeholder="USD"
                />
              </label>

              <div className="hidden sm:block" />

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Subtotal</span>
                <Input
                  inputMode="decimal"
                  value={formValues.subtotalAmount}
                  onChange={(event) => updateFormValue("subtotalAmount", event.target.value)}
                  placeholder="24.98"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Savings</span>
                <Input
                  inputMode="decimal"
                  value={formValues.receiptDiscountTotal}
                  onChange={(event) =>
                    updateFormValue("receiptDiscountTotal", event.target.value)
                  }
                  placeholder="2.00"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Tax</span>
                <Input
                  inputMode="decimal"
                  value={formValues.taxAmount}
                  onChange={(event) => updateFormValue("taxAmount", event.target.value)}
                  placeholder="1.85"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <Input
                  inputMode="decimal"
                  value={formValues.totalAmount}
                  onChange={(event) => updateFormValue("totalAmount", event.target.value)}
                  placeholder="24.83"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-foreground">Items</h3>
                  <p className="text-sm text-muted-foreground">
                    One card per item keeps the receipt easy to read.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setItems((current) => [...current, createEmptyItem()])}
                >
                  Add item
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={item.id} className="bg-white/70">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Item {index + 1}</CardTitle>
                        <CardDescription>
                          Update the name and amounts to match the receipt.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.length === 1
                              ? current
                              : current.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2 sm:col-span-2">
                        <span className="text-sm font-semibold text-foreground">Item name</span>
                        <Input
                          value={item.itemName}
                          onChange={(event) =>
                            updateItem(item.id, "itemName", event.target.value)
                          }
                          placeholder="Organic milk"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Quantity</span>
                        <Input
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, "quantity", event.target.value)
                          }
                          placeholder="1"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Unit price</span>
                        <Input
                          inputMode="decimal"
                          value={item.unitPriceAmount}
                          onChange={(event) =>
                            updateItem(item.id, "unitPriceAmount", event.target.value)
                          }
                          placeholder="4.99"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Gross amount</span>
                        <Input
                          inputMode="decimal"
                          value={item.grossAmount}
                          onChange={(event) =>
                            updateItem(item.id, "grossAmount", event.target.value)
                          }
                          placeholder="4.99"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Item savings</span>
                        <Input
                          inputMode="decimal"
                          value={item.discountAmount}
                          onChange={(event) =>
                            updateItem(item.id, "discountAmount", event.target.value)
                          }
                          placeholder="0.50"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Item total</span>
                        <Input
                          inputMode="decimal"
                          value={item.totalAmount}
                          onChange={(event) =>
                            updateItem(item.id, "totalAmount", event.target.value)
                          }
                          placeholder="4.49"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Savings label</span>
                        <Input
                          value={item.discountLabel}
                          onChange={(event) =>
                            updateItem(item.id, "discountLabel", event.target.value)
                          }
                          placeholder="Coupon"
                        />
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-foreground">Savings</h3>
                  <p className="text-sm text-muted-foreground">
                    Add any extra savings that apply to the full purchase.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setReceiptDiscounts((current) => [...current, createEmptyDiscount()])
                  }
                >
                  Add savings row
                </Button>
              </div>

              {receiptDiscounts.length > 0 ? (
                <div className="space-y-3">
                  {receiptDiscounts.map((discount, index) => (
                    <div
                      key={discount.id}
                      className="grid gap-3 rounded-[1.35rem] bg-secondary/60 p-4 sm:grid-cols-[1fr_180px_auto]"
                    >
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">
                          Savings {index + 1} label
                        </span>
                        <Input
                          value={discount.label}
                          onChange={(event) =>
                            updateReceiptDiscount(discount.id, "label", event.target.value)
                          }
                          placeholder="Member savings"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Amount</span>
                        <Input
                          inputMode="decimal"
                          value={discount.amount}
                          onChange={(event) =>
                            updateReceiptDiscount(discount.id, "amount", event.target.value)
                          }
                          placeholder="1.25"
                        />
                      </label>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setReceiptDiscounts((current) =>
                              current.filter((entry) => entry.id !== discount.id),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.35rem] bg-secondary/55 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  Add a savings row only if the receipt shows one outside the item list.
                </div>
              )}
            </div>

            {errorMessage ? <ErrorState description={errorMessage} /> : null}

            <div className="flex flex-col gap-3 rounded-[1.5rem] bg-accent/55 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {previewCounts.itemCount} items, {previewCounts.discountCount} savings rows
                </p>
                <p className="text-sm text-muted-foreground">
                  Save when the receipt looks right.
                </p>
              </div>
              <Button type="submit" size="lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <PencilLine className="size-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import type { ChangeEvent, FormEvent } from "react";
import { startTransition, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  PlusCircle,
  ReceiptText,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  createReceipt,
  createReceiptFromScan,
  getApiErrorMessage,
} from "@/lib/api";
import type { ReceiptDiscount, ReceiptDraft, ReceiptItem } from "@/types";

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
};

const helperCopy = [
  "Upload a receipt photo or PDF if you want the app to read it for you.",
  "Manual entry keeps the same warm card layout as recipes, but focuses on totals, items, and savings.",
  "Use one item card per purchase so the saved receipt stays easy to read later.",
];

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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialFormValues(): ReceiptFormValues {
  return {
    storeName: "",
    invoiceNumber: "",
    receiptDate: getTodayDate(),
    city: "",
    state: "",
    currencyCode: "USD",
    subtotalAmount: "",
    receiptDiscountTotal: "0.00",
    taxAmount: "0.00",
    totalAmount: "",
  };
}

function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase().slice(0, 3);
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
    scanLocation: "",
    currencyCode: normalizeCurrencyCode(formValues.currencyCode) || "USD",
    subtotalAmount: formValues.subtotalAmount.trim(),
    receiptDiscountTotal: formValues.receiptDiscountTotal.trim() || "0.00",
    taxAmount: formValues.taxAmount.trim() || "0.00",
    totalAmount: formValues.totalAmount.trim(),
    receiptDiscounts: toDraftDiscounts(receiptDiscounts),
    items: normalizedItems,
  };
}

export function AddReceiptForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState(getInitialFormValues);
  const [items, setItems] = useState<EditableItem[]>([createEmptyItem()]);
  const [receiptDiscounts, setReceiptDiscounts] = useState<EditableDiscount[]>([]);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isUploadingScan, setIsUploadingScan] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const previewCounts = useMemo(
    () => ({
      itemCount: items.filter((item) => item.itemName.trim()).length,
      discountCount: receiptDiscounts.filter((discount) => discount.label.trim()).length,
    }),
    [items, receiptDiscounts],
  );

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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function handleScanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Choose a PNG, JPEG, or PDF receipt file before uploading.");
      return;
    }

    setIsUploadingScan(true);
    setErrorMessage("");

    try {
      await createReceiptFromScan(selectedFile);
      toast.success("Receipt uploaded", {
        description: "The scan was processed and saved. Opening your receipt list now.",
      });
      startTransition(() => {
        router.push("/receipts");
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        toast.success("Receipt is still being saved", {
          description: "This can take a little longer for some scans. Check your receipts list in a moment.",
        });
        startTransition(() => {
          router.push("/receipts");
        });
        return;
      }

      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not process receipt", {
        description: message,
      });
    } finally {
      setIsUploadingScan(false);
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
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
      setErrorMessage("Add at least one item with a gross amount and line total.");
      return;
    }

    setIsSavingManual(true);
    setErrorMessage("");

    try {
      const savedReceipt = await createReceipt(draft);

      toast.success("Receipt saved", {
        description: `${savedReceipt.storeName} is ready to review.`,
      });

      startTransition(() => {
        router.push(`/receipts/${savedReceipt.id}`);
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not save receipt", {
        description: message,
      });
    } finally {
      setIsSavingManual(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href="/receipts">
                <ArrowLeft className="size-4" />
                Back to receipts
              </Link>
            </Button>
          </div>
          <PageIntro
            eyebrow="Add Receipt"
            title="Save a receipt your way."
            description="Upload a scan so the app can read it for you, or enter the details yourself. The layout mirrors recipes so the flow feels familiar."
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Upload a scan</CardTitle>
            <CardDescription>
              Send a PNG, JPEG, or PDF and let the app fill in the details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleScanSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Receipt file
                </span>
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                  onChange={handleFileChange}
                  className="rounded-[1.4rem] px-4 py-3 file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground"
                />
              </label>

              <div className="rounded-[1.35rem] bg-secondary/65 px-4 py-4 text-sm leading-6 text-muted-foreground">
                {selectedFile ? (
                  <p>
                    Selected file: <span className="font-semibold text-foreground">{selectedFile.name}</span>
                  </p>
                ) : (
                  <p>No file selected yet.</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isUploadingScan || !selectedFile}
              >
                {isUploadingScan ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload receipt
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enter it yourself</CardTitle>
            <CardDescription>
              Fill in the store, date, totals, and items below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleManualSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-foreground">
                    Store name
                  </span>
                  <Input
                    value={formValues.storeName}
                    onChange={(event) => updateFormValue("storeName", event.target.value)}
                    placeholder="Maple Market"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Invoice number
                  </span>
                  <Input
                    value={formValues.invoiceNumber}
                    onChange={(event) => updateFormValue("invoiceNumber", event.target.value)}
                    placeholder="A-1042"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Receipt date
                  </span>
                  <Input
                    type="date"
                    value={formValues.receiptDate}
                    onChange={(event) => updateFormValue("receiptDate", event.target.value)}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    City
                  </span>
                  <Input
                    value={formValues.city}
                    onChange={(event) => updateFormValue("city", event.target.value)}
                    placeholder="Brooklyn"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    State
                  </span>
                  <Input
                    value={formValues.state}
                    onChange={(event) => updateFormValue("state", event.target.value)}
                    placeholder="NY"
                  />
                </label>

              <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-foreground">
                    Currency
                  </span>
                  <Input
                    value={formValues.currencyCode}
                    onChange={(event) =>
                      updateFormValue("currencyCode", normalizeCurrencyCode(event.target.value))
                    }
                    placeholder="USD"
                    maxLength={3}
                  />
                </label>

                <div className="hidden sm:block" />

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Subtotal
                  </span>
                  <Input
                    inputMode="decimal"
                    value={formValues.subtotalAmount}
                    onChange={(event) => updateFormValue("subtotalAmount", event.target.value)}
                    placeholder="24.98"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Receipt discount total
                  </span>
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
                  <span className="text-sm font-semibold text-foreground">
                    Tax
                  </span>
                  <Input
                    inputMode="decimal"
                    value={formValues.taxAmount}
                    onChange={(event) => updateFormValue("taxAmount", event.target.value)}
                    placeholder="1.85"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Total
                  </span>
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
                      One card per item keeps the receipt detail clean.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setItems((current) => [...current, createEmptyItem()])}
                  >
                    <PlusCircle className="size-4" />
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
                            Capture the amounts exactly as they appear on the receipt.
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
                          <span className="text-sm font-semibold text-foreground">
                            Item name
                          </span>
                          <Input
                            value={item.itemName}
                            onChange={(event) =>
                              updateItem(item.id, "itemName", event.target.value)
                            }
                            placeholder="Organic milk"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-foreground">
                            Quantity
                          </span>
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
                          <span className="text-sm font-semibold text-foreground">
                            Unit price
                          </span>
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
                          <span className="text-sm font-semibold text-foreground">
                            Gross amount
                          </span>
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
                          <span className="text-sm font-semibold text-foreground">
                            Item discount amount
                          </span>
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
                          <span className="text-sm font-semibold text-foreground">
                            Item total
                          </span>
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
                          <span className="text-sm font-semibold text-foreground">
                            Item discount label
                          </span>
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
                    <h3 className="font-display text-2xl text-foreground">Receipt discounts</h3>
                    <p className="text-sm text-muted-foreground">
                      Optional savings applied across the full receipt.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setReceiptDiscounts((current) => [...current, createEmptyDiscount()])
                    }
                  >
                    <PlusCircle className="size-4" />
                    Add discount
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
                            Discount {index + 1} label
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
                          <span className="text-sm font-semibold text-foreground">
                            Amount
                          </span>
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

              <div className="flex flex-col gap-3 rounded-[1.5rem] bg-accent/55 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {previewCounts.itemCount} items, {previewCounts.discountCount} savings rows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Manual entry saves the receipt with all of its items and totals.
                  </p>
                </div>
                <Button type="submit" size="lg" disabled={isSavingManual}>
                  {isSavingManual ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Saving receipt...
                    </>
                  ) : (
                    <>
                      <ReceiptText className="size-4" />
                      Save receipt
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <ErrorState description={errorMessage} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {helperCopy.map((item) => (
          <Card key={item} className="bg-white/70">
            <CardContent className="pt-6 text-sm leading-6 text-muted-foreground">
              {item}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>Helpful notes</CardTitle>
          <CardDescription>
            A few quick tips make manual entry faster and easier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-secondary/65 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ScanLine className="size-4" />
              Scan uploads
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Some scans take a little longer. If that happens, check your receipts list again in a moment.
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-secondary/65 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ReceiptText className="size-4" />
              Amounts
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use decimal values like 12.49 for subtotal, tax, discounts, and totals.
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-secondary/65 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Upload className="size-4" />
              Item savings
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Add a label only when an item savings amount appears on the receipt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { AddReceiptForm } from "@/components/receipts/add-receipt-form";

export const metadata = {
  title: "Add Receipt",
};

export default function NewReceiptPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AddReceiptForm />
    </main>
  );
}

import { ReceiptsList } from "@/components/receipts/receipts-list";

export const metadata = {
  title: "Receipts",
};

export default function ReceiptsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <ReceiptsList />
    </main>
  );
}

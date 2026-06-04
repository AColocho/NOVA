import { ReceiptDetailView } from "@/components/receipts/receipt-detail-view";

type ReceiptDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return [{ id: "_static" }];
}

export const dynamicParams = false;

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <ReceiptDetailView id={id} />
    </main>
  );
}

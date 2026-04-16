import { EditReceiptForm } from "@/components/receipts/edit-receipt-form";

type EditReceiptPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Receipt",
};

export default async function EditReceiptPage({ params }: EditReceiptPageProps) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <EditReceiptForm id={id} />
    </main>
  );
}

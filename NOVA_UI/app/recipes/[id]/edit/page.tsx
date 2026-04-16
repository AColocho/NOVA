import { EditRecipeForm } from "@/components/recipes/edit-recipe-form";

type EditRecipePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Edit Recipe",
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <EditRecipeForm id={id} />
    </main>
  );
}

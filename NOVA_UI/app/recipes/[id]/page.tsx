import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <RecipeDetailView id={id} />
    </main>
  );
}

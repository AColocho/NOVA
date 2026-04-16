import { RecipesList } from "@/components/recipes/recipes-list";

export const metadata = {
  title: "Recipes",
};

export default function RecipesPage() {
  return (
    <main className="flex flex-1 flex-col">
      <RecipesList />
    </main>
  );
}

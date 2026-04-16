import { AddRecipeForm } from "@/components/recipes/add-recipe-form";

export const metadata = {
  title: "Add Recipe",
};

export default function NewRecipePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AddRecipeForm />
    </main>
  );
}

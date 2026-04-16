import type { Ingredient, Recipe, RecipeDraft } from "@/types";

export type RecipeFormValues = {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredientsText: string;
  stepsText: string;
};

export function parsePositiveInteger(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseNonNegativeInteger(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseIngredientLine(line: string): Ingredient | null {
  const cleaned = line.trim();

  if (!cleaned) {
    return null;
  }

  const parts = cleaned
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return { name: parts[0] };
  }

  if (parts.length === 2) {
    return { amount: parts[0], name: parts[1] };
  }

  return {
    amount: parts[0],
    unit: parts[1],
    name: parts.slice(2).join(" | "),
  };
}

function formatIngredientLine(ingredient: Ingredient) {
  const parts = [ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean);
  return parts.join(" | ");
}

export function buildRecipeDraft(input: RecipeFormValues): RecipeDraft {
  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    prepTime: parseNonNegativeInteger(input.prepTime),
    cookTime: parseNonNegativeInteger(input.cookTime),
    servings: parsePositiveInteger(input.servings),
    ingredients: input.ingredientsText
      .split("\n")
      .map(parseIngredientLine)
      .filter((ingredient): ingredient is Ingredient => ingredient !== null),
    steps: input.stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((instruction) => ({ instruction })),
  };
}

export function getEmptyRecipeFormValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    ingredientsText: "",
    stepsText: "",
  };
}

export function getRecipeFormValues(recipe: Recipe): RecipeFormValues {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    prepTime: recipe.prepTime ? String(recipe.prepTime) : "",
    cookTime: recipe.cookTime ? String(recipe.cookTime) : "",
    servings: recipe.servings ? String(recipe.servings) : "",
    ingredientsText: recipe.ingredients.map(formatIngredientLine).join("\n"),
    stepsText: recipe.steps.map((step) => step.instruction).join("\n"),
  };
}

"use client";

import Link from "next/link";
import { ArrowLeft, PencilLine, Soup, TimerReset } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getRecipe } from "@/lib/api";
import type { Ingredient, Recipe } from "@/types";

type RecipeDetailViewProps = {
  id: string;
};

function formatIngredient(ingredient: Ingredient) {
  const pieces = [ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean);
  const base = pieces.join(" ");

  return ingredient.note ? `${base} (${ingredient.note})` : base;
}

function RecipeDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-28 rounded-full" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

export function RecipeDetailView({ id }: RecipeDetailViewProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipe = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getRecipe(id, { signal });
      setRecipe(data);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRecipe(controller.signal);

    return () => controller.abort();
  }, [loadRecipe]);

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/recipes">
            <ArrowLeft className="size-4" />
            Back to recipes
          </Link>
        </Button>
        <ErrorState
          description={errorMessage}
          onRetry={() => void loadRecipe()}
        />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/recipes">
            <ArrowLeft className="size-4" />
            Back to recipes
          </Link>
        </Button>
        <EmptyState
          title="Recipe not found"
          description="This recipe could not be opened right now. It may have been removed."
          href="/recipes"
          actionLabel="Return to recipes"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/recipes">
            <ArrowLeft className="size-4" />
            Back to recipes
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/recipes/${id}/edit`}>
            <PencilLine className="size-4" />
            Edit recipe
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-secondary text-secondary-foreground">
            <Soup className="size-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl sm:text-4xl">{recipe.title}</CardTitle>
            <CardDescription className="text-base">
              {recipe.description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            <CardDescription>Easy to scan while you cook.</CardDescription>
          </CardHeader>
          <CardContent>
            {recipe.ingredients.length > 0 ? (
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient.name}-${index}`}
                    className="rounded-[1.25rem] bg-secondary/65 px-4 py-3 text-sm leading-6 text-foreground"
                  >
                    {formatIngredient(ingredient)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No ingredients have been added yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[1rem] bg-accent text-accent-foreground">
                <TimerReset className="size-5" />
              </div>
              <div>
                <CardTitle>Steps</CardTitle>
                <CardDescription>Follow each step in a calm, clear flow.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recipe.steps.length > 0 ? (
              <ol className="space-y-4">
                {recipe.steps.map((step, index) => (
                  <li
                    key={`${step.instruction}-${index}`}
                    className="flex gap-4 rounded-[1.5rem] bg-white/75 p-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      {step.title ? (
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                      ) : null}
                      <p className="text-sm leading-6 text-muted-foreground">
                        {step.instruction}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No steps have been added yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

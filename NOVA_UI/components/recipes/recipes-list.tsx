"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ChefHat, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getRecipes } from "@/lib/api";
import type { RecipeSummary } from "@/types";

function RecipeListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RecipesList() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipes = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getRecipes({ signal });
      setRecipes(data);
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadRecipes(controller.signal);

    return () => controller.abort();
  }, [loadRecipes]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <PageIntro
              eyebrow="Recipes"
              title="Browse saved meals."
              description="Open any recipe to see ingredients and steps in a clear, easy-to-read layout."
            />
            <Button asChild size="lg">
              <Link href="/recipes/new">
                <Plus className="size-4" />
                Add Recipe
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? <RecipeListSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState
          description={errorMessage}
          onRetry={() => void loadRecipes()}
        />
      ) : null}

      {!isLoading && !errorMessage && recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          description="Add your first recipe to keep ingredients and steps in one place."
          href="/recipes/new"
          actionLabel="Add your first recipe"
        />
      ) : null}

      {!isLoading && !errorMessage && recipes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group block">
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader className="gap-4">
                  <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-secondary text-secondary-foreground">
                    <ChefHat className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{recipe.title}</CardTitle>
                    <CardDescription>{recipe.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm font-semibold text-primary">
                  <span>
                    {recipe.ingredientsCount
                      ? `${recipe.ingredientsCount} ingredients`
                      : "View recipe"}
                  </span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

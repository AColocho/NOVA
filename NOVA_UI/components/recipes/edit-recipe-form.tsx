"use client";

import type { FormEvent } from "react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage, getRecipe, updateRecipe } from "@/lib/api";
import {
  buildRecipeDraft,
  getEmptyRecipeFormValues,
  getRecipeFormValues,
} from "@/lib/recipe-form";
import type { Recipe } from "@/types";
import type { RecipeFormValues } from "@/lib/recipe-form";

type EditRecipeFormProps = {
  id: string;
};

function EditRecipeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-36 rounded-full" />
      <Skeleton className="h-28 w-full rounded-[2rem]" />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function EditRecipeForm({ id }: EditRecipeFormProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [formValues, setFormValues] = useState<RecipeFormValues>(
    getEmptyRecipeFormValues,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const previewCounts = useMemo(() => {
    const ingredientCount = formValues.ingredientsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
    const stepCount = formValues.stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;

    return { ingredientCount, stepCount };
  }, [formValues.ingredientsText, formValues.stepsText]);

  const loadRecipe = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getRecipe(id, { signal });
      setRecipe(data);
      setFormValues(getRecipeFormValues(data));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = buildRecipeDraft(formValues);

    if (!draft.title) {
      setErrorMessage("Add a recipe name before saving.");
      return;
    }

    if (draft.steps.length === 0) {
      setErrorMessage("Add at least one step before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const savedRecipe = await updateRecipe(id, draft);

      toast.success("Recipe updated", {
        description: `"${savedRecipe.title}" has been saved.`,
      });

      startTransition(() => {
        router.push(`/recipes/${savedRecipe.id}`);
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not update recipe", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <EditRecipeSkeleton />;
  }

  if (errorMessage && !recipe) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={`/recipes/${id}`}>
            <ArrowLeft className="size-4" />
            Back to recipe
          </Link>
        </Button>
        <ErrorState description={errorMessage} onRetry={() => void loadRecipe()} />
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
          description="This recipe could not be opened for editing right now."
          href="/recipes"
          actionLabel="Return to recipes"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href={`/recipes/${id}`}>
                <ArrowLeft className="size-4" />
                Back to recipe
              </Link>
            </Button>
          </div>
          <PageIntro
            eyebrow="Edit Recipe"
            title={`Update ${recipe.title}`}
            description="Make changes to the name, details, ingredients, or steps, then save when you are ready."
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
          <CardDescription>
            Change anything you need and save the latest version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-foreground">
                  Recipe name
                </span>
                <Input
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Grandma's Tomato Pasta"
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-foreground">
                  Description
                </span>
                <Textarea
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="A simple weeknight pasta with tomato sauce."
                  className="min-h-28"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Prep time (minutes)
                </span>
                <Input
                  inputMode="numeric"
                  value={formValues.prepTime}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      prepTime: event.target.value,
                    }))
                  }
                  placeholder="15"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Cook time (minutes)
                </span>
                <Input
                  inputMode="numeric"
                  value={formValues.cookTime}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      cookTime: event.target.value,
                    }))
                  }
                  placeholder="20"
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-foreground">
                  Servings
                </span>
                <Input
                  inputMode="numeric"
                  value={formValues.servings}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      servings: event.target.value,
                    }))
                  }
                  placeholder="4"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Ingredients
                </span>
                <Textarea
                  value={formValues.ingredientsText}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      ingredientsText: event.target.value,
                    }))
                  }
                  placeholder={`1 | lb | pasta\n2 | cups | tomato sauce\nParmesan cheese`}
                  className="min-h-60"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Steps
                </span>
                <Textarea
                  value={formValues.stepsText}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      stepsText: event.target.value,
                    }))
                  }
                  placeholder={`Boil pasta until tender.\nWarm the tomato sauce.\nCombine and serve.`}
                  className="min-h-60"
                />
              </label>
            </div>

            {errorMessage ? <ErrorState description={errorMessage} /> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {previewCounts.ingredientCount} ingredients, {previewCounts.stepCount} steps
              </p>
              <Button type="submit" size="lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <PencilLine className="size-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

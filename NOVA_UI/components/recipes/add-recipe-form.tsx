"use client";

import type { FormEvent } from "react";
import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, LoaderCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  createRecipe,
  createRecipeFromUrl,
  getApiErrorMessage,
} from "@/lib/api";
import { buildRecipeDraft, getEmptyRecipeFormValues } from "@/lib/recipe-form";

const helperCopy = [
  "You can save a recipe from a link or enter it by hand.",
  "For ingredients, use one line per item. You can write `amount | unit | name` or simply the item name.",
  "For steps, add one instruction per line to keep things easy to follow.",
];

export function AddRecipeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [formValues, setFormValues] = useState(getEmptyRecipeFormValues);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isImportingUrl, setIsImportingUrl] = useState(false);
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

  async function handleUrlImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim()) {
      setErrorMessage("Enter a recipe link before importing.");
      return;
    }

    setIsImportingUrl(true);
    setErrorMessage("");

    try {
      await createRecipeFromUrl(url.trim());
      toast.success("Recipe imported", {
        description: "Your recipe was saved. Opening your recipe list now.",
      });
      startTransition(() => {
        router.push("/recipes");
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not import recipe", {
        description: message,
      });
    } finally {
      setIsImportingUrl(false);
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
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

    setIsSavingManual(true);
    setErrorMessage("");

    try {
      const savedRecipe = await createRecipe(draft);

      toast.success("Recipe saved", {
        description: `"${savedRecipe.title}" is ready to open.`,
      });

      startTransition(() => {
        router.push(`/recipes/${savedRecipe.id}`);
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not save recipe", {
        description: message,
      });
    } finally {
      setIsSavingManual(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="outline">
              <Link href="/recipes">
                <ArrowLeft className="size-4" />
                Back to recipes
              </Link>
            </Button>
          </div>
          <PageIntro
            eyebrow="Add Recipe"
            title="Add a recipe your way."
            description="Save a recipe from a link or enter the details yourself. Everything is kept simple and easy to read."
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Save from a link</CardTitle>
            <CardDescription>
              Paste a recipe page link and save it in a few taps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleUrlImport}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Recipe link
                </span>
                <Input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/recipe"
                />
              </label>
              <Button
                type="submit"
                size="lg"
                disabled={isImportingUrl || !url.trim()}
              >
                {isImportingUrl ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Globe className="size-4" />
                    Save from link
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enter it yourself</CardTitle>
            <CardDescription>
              Fill in the details below and save the recipe when you are ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleManualSubmit}>
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {previewCounts.ingredientCount} ingredients, {previewCounts.stepCount} steps
                </p>
                <Button type="submit" size="lg" disabled={isSavingManual}>
                  {isSavingManual ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Saving recipe...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-4" />
                      Save recipe
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <ErrorState description={errorMessage} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {helperCopy.map((item) => (
          <Card key={item} className="bg-white/70">
            <CardContent className="pt-6 text-sm leading-6 text-muted-foreground">
              {item}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

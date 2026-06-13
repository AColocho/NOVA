"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  LoaderCircle,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteMovie,
  getApiErrorMessage,
  getMovie,
  setMovieRating,
} from "@/lib/api";
import { resolveMovieRouteId } from "@/lib/movie-routes";
import type { Movie } from "@/types";

type MovieDetailViewProps = {
  id: string;
};

function MovieDetailSkeleton() {
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
    </div>
  );
}

function formatRuntime(minutes?: number) {
  if (!minutes) {
    return "Runtime unknown";
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) {
    return `${remaining} min`;
  }
  return `${hours} hr ${remaining} min`;
}

function ratingLabel(value?: number) {
  return value === undefined ? "Not rated" : `${value.toFixed(1)} / 5`;
}

export function MovieDetailView({ id }: MovieDetailViewProps) {
  const router = useRouter();
  const movieId = resolveMovieRouteId(id);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedRating, setSelectedRating] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMovie = useCallback(async (signal?: AbortSignal) => {
    if (!movieId) {
      setErrorMessage("Movie ID is missing from the URL.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getMovie(movieId, { signal });
      setMovie(data);
      setSelectedRating(data.currentUserRating ? String(data.currentUserRating) : "");
    } catch (error) {
      if (!signal?.aborted) {
        setErrorMessage(getApiErrorMessage(error));
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [movieId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMovie(controller.signal);

    return () => controller.abort();
  }, [loadMovie]);

  async function handleRatingSubmit() {
    if (!movieId || !selectedRating) {
      return;
    }

    setIsSavingRating(true);
    setErrorMessage("");

    try {
      const updatedMovie = await setMovieRating(movieId, Number(selectedRating));
      setMovie(updatedMovie);
      setSelectedRating(
        updatedMovie.currentUserRating ? String(updatedMovie.currentUserRating) : "",
      );
      toast.success("Rating saved");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not save rating", { description: message });
    } finally {
      setIsSavingRating(false);
    }
  }

  async function handleDelete() {
    if (!movieId) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteMovie(movieId);
      toast.success("Movie deleted");
      router.push("/movies");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not delete movie", { description: message });
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <MovieDetailSkeleton />;
  }

  if (errorMessage && !movie) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/movies">
            <ArrowLeft className="size-4" />
            Back to movies
          </Link>
        </Button>
        <ErrorState description={errorMessage} onRetry={() => void loadMovie()} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/movies">
            <ArrowLeft className="size-4" />
            Back to movies
          </Link>
        </Button>
        <EmptyState
          title="Movie not found"
          description="This movie could not be opened right now. It may have been removed."
          href="/movies"
          actionLabel="Return to movies"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/movies">
            <ArrowLeft className="size-4" />
            Back to movies
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Delete
        </Button>
      </div>

      {movie.backdropUrl ? (
        <img
          src={movie.backdropUrl}
          alt=""
          className="max-h-[22rem] w-full rounded-[1.5rem] object-cover"
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="overflow-hidden">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt=""
              className="aspect-[2/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-secondary text-secondary-foreground">
              <Clapperboard className="size-14" />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl sm:text-4xl">{movie.title}</CardTitle>
            <CardDescription className="text-base">
              {[movie.year, formatRuntime(movie.runtimeMinutes)]
                .filter(Boolean)
                .join(" • ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {movie.overview || "No overview has been added yet."}
            </p>
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1rem] bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Household
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {ratingLabel(movie.averageRating)}
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Your rating
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {movie.currentUserRating ?? "None"}
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  TMDB
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {movie.tmdbVoteAverage?.toFixed(1) ?? "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rate this movie</CardTitle>
            <CardDescription>
              Each active user keeps one rating per movie.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedRating}
              onChange={(event) => setSelectedRating(event.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose rating</option>
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={() => void handleRatingSubmit()}
              disabled={!selectedRating || isSavingRating}
            >
              {isSavingRating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Star className="size-4" />
              )}
              Save rating
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Household ratings</CardTitle>
            <CardDescription>
              {movie.ratingCount} rating{movie.ratingCount === 1 ? "" : "s"} saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movie.ratings.length > 0 ? (
              <div className="grid gap-3">
                {movie.ratings.map((rating) => (
                  <div
                    key={rating.userId}
                    className="flex items-center justify-between rounded-[1rem] bg-white/75 px-4 py-3"
                  >
                    <span className="font-semibold text-foreground">
                      {rating.userName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-primary">
                      <Star className="size-4 fill-current" />
                      {rating.rating}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No one has rated this movie yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <ErrorState description={errorMessage} /> : null}
    </div>
  );
}

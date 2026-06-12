"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Plus, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getMovies } from "@/lib/api";
import { getMovieDetailHref } from "@/lib/movie-routes";
import type { MovieSummary } from "@/types";

function MoviesListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="aspect-[2/3] w-full rounded-[1.25rem]" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ratingText(movie: MovieSummary) {
  if (!movie.ratingCount || movie.averageRating === undefined) {
    return "No household rating";
  }

  return `${movie.averageRating.toFixed(1)} avg from ${movie.ratingCount}`;
}

export function MoviesList() {
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMovies = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setMovies(await getMovies({ signal }));
    } catch (error) {
      if (!signal?.aborted) {
        setErrorMessage(getApiErrorMessage(error));
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadMovies(controller.signal);

    return () => controller.abort();
  }, [loadMovies]);

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
              eyebrow="Movies"
              title="Browse household movies."
              description="Open a movie to see metadata, household averages, and each person’s rating."
            />
            <Button asChild size="lg">
              <Link href="/movies/new">
                <Plus className="size-4" />
                Add Movie
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? <MoviesListSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState description={errorMessage} onRetry={() => void loadMovies()} />
      ) : null}

      {!isLoading && !errorMessage && movies.length === 0 ? (
        <EmptyState
          title="No movies yet"
          description="Add a movie from TMDB search or enter one manually."
          href="/movies/new"
          actionLabel="Add your first movie"
        />
      ) : null}

      {!isLoading && !errorMessage && movies.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {movies.map((movie) => (
            <Link
              key={movie.id}
              href={getMovieDetailHref(movie.id)}
              className="group block"
            >
              <Card className="h-full overflow-hidden transition-transform duration-200 group-hover:-translate-y-1">
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt=""
                    className="aspect-[2/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center bg-secondary text-secondary-foreground">
                    <Clapperboard className="size-12" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{movie.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="line-clamp-3">
                    {movie.overview || "No overview has been added yet."}
                  </p>
                  <div className="flex items-center justify-between gap-3 font-semibold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-4 fill-current" />
                      {ratingText(movie)}
                    </span>
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

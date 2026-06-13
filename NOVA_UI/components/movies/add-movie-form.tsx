"use client";

/* eslint-disable @next/next/no-img-element */

import type { FormEvent } from "react";
import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  LoaderCircle,
  PlusCircle,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createManualMovie,
  createMovieFromTMDB,
  getApiErrorMessage,
  searchTMDBMovies,
} from "@/lib/api";
import { getMovieDetailHref } from "@/lib/movie-routes";
import type { TMDBMovieSearchResult } from "@/types";

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseGenres(value: string) {
  return value
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}

function RatingSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-foreground">
        Your rating
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Not rated yet</option>
        {[1, 2, 3, 4, 5].map((rating) => (
          <option key={rating} value={rating}>
            {rating}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AddMovieForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovieSearchResult[]>([]);
  const [tmdbRating, setTmdbRating] = useState("");
  const [manualRating, setManualRating] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [overview, setOverview] = useState("");
  const [runtime, setRuntime] = useState("");
  const [genres, setGenres] = useState("");
  const [posterPath, setPosterPath] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [savingTmdbId, setSavingTmdbId] = useState<number | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setErrorMessage("Enter a movie title before searching.");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      setResults(await searchTMDBMovies(query.trim()));
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("TMDB search failed", { description: message });
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddTMDB(movie: TMDBMovieSearchResult) {
    setSavingTmdbId(movie.tmdbId);
    setErrorMessage("");

    try {
      const savedMovie = await createMovieFromTMDB(
        movie.tmdbId,
        parseOptionalNumber(tmdbRating),
      );
      toast.success("Movie saved", {
        description: `"${savedMovie.title}" is ready to open.`,
      });
      startTransition(() => {
        router.push(getMovieDetailHref(savedMovie.id));
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not save movie", { description: message });
    } finally {
      setSavingTmdbId(null);
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Add a movie title before saving.");
      return;
    }

    setIsSavingManual(true);
    setErrorMessage("");

    try {
      const savedMovie = await createManualMovie({
        title: title.trim(),
        year: parseOptionalNumber(year),
        overview: overview.trim() || undefined,
        runtimeMinutes: parseOptionalNumber(runtime),
        genres: parseGenres(genres),
        posterPath: posterPath.trim() || undefined,
        initialRating: parseOptionalNumber(manualRating),
      });
      toast.success("Movie saved", {
        description: `"${savedMovie.title}" is ready to open.`,
      });
      startTransition(() => {
        router.push(getMovieDetailHref(savedMovie.id));
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error("Could not save movie", { description: message });
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
              <Link href="/movies">
                <ArrowLeft className="size-4" />
                Back to movies
              </Link>
            </Button>
          </div>
          <PageIntro
            eyebrow="Add Movie"
            title="Find a movie or add your own."
            description="Search TMDB for metadata, or save a manual entry when the movie is not listed."
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Search TMDB</CardTitle>
            <CardDescription>
              Select a result to save its current TMDB metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSearch}>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="The Matrix"
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search
              </Button>
            </form>

            <RatingSelect value={tmdbRating} onChange={setTmdbRating} />

            {results.length === 0 && !isSearching ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Search results will appear here.
              </p>
            ) : null}

            <div className="grid gap-3">
              {results.map((movie) => (
                <div
                  key={movie.tmdbId}
                  className="grid gap-4 rounded-[1.25rem] bg-white/75 p-3 sm:grid-cols-[5rem_1fr_auto]"
                >
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt=""
                      className="aspect-[2/3] w-20 rounded-[0.75rem] object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] w-20 items-center justify-center rounded-[0.75rem] bg-secondary text-secondary-foreground">
                      <Clapperboard className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{movie.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {movie.year ?? "Year unknown"}
                      </p>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {movie.overview || "No overview from TMDB."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleAddTMDB(movie)}
                    disabled={savingTmdbId !== null}
                  >
                    {savingTmdbId === movie.tmdbId ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <PlusCircle className="size-4" />
                    )}
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Manual entry</CardTitle>
            <CardDescription>
              Only the title is required. Everything else can be added later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleManualSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Title</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Movie title"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Year</span>
                  <Input
                    inputMode="numeric"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    placeholder="1999"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Runtime</span>
                  <Input
                    inputMode="numeric"
                    value={runtime}
                    onChange={(event) => setRuntime(event.target.value)}
                    placeholder="136"
                  />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Overview</span>
                <Textarea
                  value={overview}
                  onChange={(event) => setOverview(event.target.value)}
                  className="min-h-28"
                  placeholder="Short plot summary"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Genres</span>
                <Input
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  placeholder="Action, Sci-Fi"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Poster URL or TMDB path
                </span>
                <Input
                  value={posterPath}
                  onChange={(event) => setPosterPath(event.target.value)}
                  placeholder="/poster.jpg or https://..."
                />
              </label>
              <RatingSelect value={manualRating} onChange={setManualRating} />
              <Button type="submit" size="lg" disabled={isSavingManual}>
                {isSavingManual ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Star className="size-4" />
                )}
                Save movie
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <ErrorState description={errorMessage} /> : null}
    </div>
  );
}

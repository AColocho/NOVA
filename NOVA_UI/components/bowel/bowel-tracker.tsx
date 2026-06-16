"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
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
  analyzeBowelMovements,
  createBowelMovement,
  deleteBowelMovement,
  getApiErrorMessage,
  getBowelMovements,
} from "@/lib/api";
import type {
  BowelAnalysis,
  BowelMovement,
  BowelMovementDraft,
  BowelStatus,
} from "@/types";

const bristolTypes = [
  "Separate hard lumps",
  "Lumpy sausage",
  "Cracked sausage",
  "Smooth, soft sausage",
  "Soft blobs",
  "Fluffy or mushy",
  "Entirely liquid",
];

const statuses: { value: BowelStatus; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "constipated", label: "Constipated" },
  { value: "loose", label: "Loose" },
  { value: "urgent", label: "Urgent" },
  { value: "incomplete", label: "Incomplete" },
  { value: "other", label: "Other" },
];

const selectClass =
  "h-12 w-full rounded-full border border-border bg-input px-4 text-sm shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-ring";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function initialDraft(): BowelMovementDraft {
  return {
    occurredOn: today(),
    bristolType: 4,
    status: "normal",
    color: "brown",
    painLevel: 0,
    bloodPresent: false,
    notes: "",
  };
}

function monthParts(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return { year, month };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function BowelTracker() {
  const [draft, setDraft] = useState<BowelMovementDraft>(initialDraft);
  const [monthValue, setMonthValue] = useState(currentMonth);
  const [entries, setEntries] = useState<BowelMovement[]>([]);
  const [analysis, setAnalysis] = useState<BowelAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadEntries = useCallback(async (signal?: AbortSignal) => {
    const { year, month } = monthParts(monthValue);
    setIsLoading(true);
    setErrorMessage("");
    setAnalysis(null);
    try {
      setEntries(await getBowelMovements(year, month, { signal }));
    } catch (error) {
      if (!signal?.aborted) setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [monthValue]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEntries(controller.signal);
    return () => controller.abort();
  }, [loadEntries]);

  const daysLogged = useMemo(
    () => new Set(entries.map((entry) => entry.occurredOn)).size,
    [entries],
  );

  function updateDraft<K extends keyof BowelMovementDraft>(
    key: K,
    value: BowelMovementDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      await createBowelMovement(draft);
      toast.success("Bowel movement saved.");
      setDraft(initialDraft());
      setMonthValue(draft.occurredOn.slice(0, 7));
      await loadEntries();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this private bowel movement entry?")) return;
    try {
      await deleteBowelMovement(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setAnalysis(null);
      toast.success("Entry deleted.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleAnalyze() {
    const { year, month } = monthParts(monthValue);
    setIsAnalyzing(true);
    setErrorMessage("");
    try {
      setAnalysis(await analyzeBowelMovements(year, month));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to Home
              </Link>
            </Button>
            <Badge className="bg-secondary text-secondary-foreground">
              <LockKeyhole className="mr-1 size-3.5" />
              Private to you
            </Badge>
          </div>
          <PageIntro
            eyebrow="Personal Wellness"
            title="Track bowel movement patterns."
            description="Log dates and observations, then review a cautious monthly pattern summary. This tracker cannot diagnose health conditions."
          />
        </div>
      </section>

      {errorMessage ? (
        <ErrorState description={errorMessage} onRetry={() => void loadEntries()} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Log a bowel movement</CardTitle>
            <CardDescription>
              Bristol types 3 and 4 are often considered typical, but normal varies by person.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-semibold">
                Date
                <Input
                  type="date"
                  max={today()}
                  value={draft.occurredOn}
                  onChange={(event) => updateDraft("occurredOn", event.target.value)}
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Shape / Bristol stool type
                <select
                  className={selectClass}
                  value={draft.bristolType}
                  onChange={(event) => updateDraft("bristolType", Number(event.target.value))}
                >
                  {bristolTypes.map((description, index) => (
                    <option key={description} value={index + 1}>
                      Type {index + 1}: {description}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-semibold">
                  Status
                  <select
                    className={selectClass}
                    value={draft.status}
                    onChange={(event) => updateDraft("status", event.target.value as BowelStatus)}
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 text-sm font-semibold">
                  Color
                  <Input
                    value={draft.color}
                    maxLength={40}
                    onChange={(event) => updateDraft("color", event.target.value)}
                    placeholder="Brown"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-sm font-semibold">
                Pain level: {draft.painLevel}/10
                <input
                  className="w-full accent-[var(--primary)]"
                  type="range"
                  min="0"
                  max="10"
                  value={draft.painLevel}
                  onChange={(event) => updateDraft("painLevel", Number(event.target.value))}
                />
              </label>
              <label className="flex items-center gap-3 rounded-[1.3rem] border border-border bg-muted px-4 py-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={draft.bloodPresent}
                  onChange={(event) => updateDraft("bloodPresent", event.target.checked)}
                />
                Blood was present
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Notes
                <Textarea
                  value={draft.notes}
                  maxLength={2000}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  placeholder="Optional: urgency, diet changes, medications, or other context"
                />
              </label>
              <Button className="w-full" type="submit" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
                Save entry
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Monthly history</CardTitle>
                  <CardDescription>{entries.length} entries across {daysLogged} days</CardDescription>
                </div>
                <Input
                  className="sm:w-44"
                  type="month"
                  value={monthValue}
                  onChange={(event) => setMonthValue(event.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading entries...</p> : null}
              {!isLoading && entries.length === 0 ? (
                <p className="rounded-[1.3rem] bg-muted p-4 text-sm text-muted-foreground">
                  No bowel movements logged for this month.
                </p>
              ) : null}
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-[1.4rem] border border-border bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatDate(entry.occurredOn)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Type {entry.bristolType}: {bristolTypes[entry.bristolType - 1]} · {entry.status}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => void handleDelete(entry.id)} aria-label="Delete entry">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">Pain {entry.painLevel}/10</Badge>
                    {entry.color ? <Badge className="bg-secondary text-secondary-foreground">{entry.color}</Badge> : null}
                    {entry.bloodPresent ? <Badge className="bg-destructive text-destructive-foreground">Blood noted</Badge> : null}
                  </div>
                  {entry.notes ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.notes}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly OpenAI summary</CardTitle>
              <CardDescription>
                Clicking analyze sends this month&apos;s entries, including notes, to OpenAI. The result is a pattern summary, not a health check or diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => void handleAnalyze()} disabled={isAnalyzing || entries.length === 0}>
                {isAnalyzing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Send month to OpenAI and analyze
              </Button>
              {analysis ? (
                <div className="space-y-4">
                  {analysis.stats.urgentAttentionRecommended ? (
                    <div className="rounded-[1.3rem] border border-destructive/30 bg-destructive/10 p-4">
                      <p className="flex items-center gap-2 font-semibold text-destructive">
                        <TriangleAlert className="size-4" />
                        Logged symptoms may warrant prompt medical attention.
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-[1.4rem] bg-secondary/65 p-4">
                    <p className="flex items-center gap-2 font-display text-xl">
                      <Activity className="size-5" />
                      {analysis.headline}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.overview}</p>
                  </div>
                  {[
                    ["Patterns", analysis.patterns],
                    ["General suggestions", analysis.suggestions],
                    ["When to seek care", analysis.seekCare],
                  ].map(([title, items]) => (
                    <div key={title as string}>
                      <p className="font-semibold">{title}</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                        {(items as string[]).map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                  ))}
                  <p className="rounded-[1.3rem] bg-muted p-4 text-xs leading-5 text-muted-foreground">
                    {analysis.disclaimer}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

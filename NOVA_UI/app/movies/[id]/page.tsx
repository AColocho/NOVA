import { MovieDetailView } from "@/components/movies/movie-detail-view";

type MovieDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return [{ id: "_static" }];
}

export const dynamicParams = false;

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <MovieDetailView id={id} />
    </main>
  );
}

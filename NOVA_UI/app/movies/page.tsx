import { MoviesList } from "@/components/movies/movies-list";

export const metadata = {
  title: "Movies",
};

export default function MoviesPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MoviesList />
    </main>
  );
}

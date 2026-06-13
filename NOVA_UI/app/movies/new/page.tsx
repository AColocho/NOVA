import { AddMovieForm } from "@/components/movies/add-movie-form";

export const metadata = {
  title: "Add Movie",
};

export default function NewMoviePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AddMovieForm />
    </main>
  );
}

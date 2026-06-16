import { BowelTracker } from "@/components/bowel/bowel-tracker";

export const metadata = {
  title: "Bowel Tracker",
};

export default function BowelTrackerPage() {
  return (
    <main className="flex flex-1 flex-col">
      <BowelTracker />
    </main>
  );
}

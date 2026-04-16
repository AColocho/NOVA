import { Skeleton } from "@/components/ui/skeleton";

export function ScreenSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 w-full rounded-[2rem]" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

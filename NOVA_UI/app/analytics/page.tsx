import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AnalyticsDashboard />
    </main>
  );
}

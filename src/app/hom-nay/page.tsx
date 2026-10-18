import type { Metadata } from "next";
import { TodayPanel } from "@/features/activity/TodayPanel";

export const metadata: Metadata = { title: "Hôm nay" };

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-stone-900">Hôm nay</h1>
      <TodayPanel />
    </div>
  );
}

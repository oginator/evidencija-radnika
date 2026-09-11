import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { ReportScreen } from "@/components/ReportScreen";

export default async function ReportPage() {
  const session = await getSession();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Učitavanje...</p>}>
      <ReportScreen owner={session?.role === "owner"} />
    </Suspense>
  );
}

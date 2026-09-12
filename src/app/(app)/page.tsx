import { getSession } from "@/lib/auth";
import { DailyEntryScreen } from "@/components/DailyEntryScreen";

export default async function HomePage() {
  const session = await getSession();
  return <DailyEntryScreen owner={session?.role === "owner"} />;
}

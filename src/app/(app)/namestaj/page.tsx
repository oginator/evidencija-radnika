import { getSession } from "@/lib/auth";
import { FurnitureScreen } from "@/components/FurnitureScreen";

export default async function FurniturePage() {
  const session = await getSession();
  return <FurnitureScreen owner={session?.role === "owner"} />;
}

import { verifySession } from "@/app/lib/dal";
import AskPanel from "@/app/components/AskPanel";

export default async function AskPage() {
  await verifySession();
  // AskPanel renders its own keitai Screen (status bar + soft keys).
  return <AskPanel />;
}

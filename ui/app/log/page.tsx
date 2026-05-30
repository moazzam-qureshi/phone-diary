import { verifySession } from "@/app/lib/dal";
import CaptureScreen from "@/app/components/CaptureScreen";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  await verifySession();
  return <CaptureScreen />;
}

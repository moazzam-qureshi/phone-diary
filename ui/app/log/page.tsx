import { verifySession } from "@/app/lib/dal";
import CaptureScreen from "@/app/components/CaptureScreen";

export default async function LogPage() {
  await verifySession();
  return <CaptureScreen />;
}

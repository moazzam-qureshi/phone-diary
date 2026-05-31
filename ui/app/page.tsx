import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { getViewer } from "@/app/lib/identity";
import HomeMenu from "@/app/components/HomeMenu";

export const dynamic = "force-dynamic";

export default async function Home() {
  await verifySession();
  // Identity is proven by passcode at login; if somehow absent, send to login.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // Logout lives in the status bar (HomeMenu's Screen) so it never overlaps.
  return <HomeMenu />;
}

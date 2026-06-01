import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { getViewer } from "@/app/lib/identity";
import { unseenReactionsForViewer } from "@/app/lib/reactions";
import HomeMenu from "@/app/components/HomeMenu";
import ReactionToasts from "@/app/components/ReactionToasts";

export const dynamic = "force-dynamic";

export default async function Home() {
  await verifySession();
  // Identity is proven by passcode at login; if somehow absent, send to login.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // New partner reactions float in on open; logout lives in the status bar.
  const toasts = await unseenReactionsForViewer(viewer);
  return (
    <>
      <ReactionToasts toasts={toasts} />
      <HomeMenu />
    </>
  );
}

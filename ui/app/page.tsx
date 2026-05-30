import { verifySession } from "@/app/lib/dal";
import { getViewer } from "@/app/lib/identity";
import HomeMenu from "@/app/components/HomeMenu";
import IdentityGate from "@/app/components/IdentityGate";
import SwitchIdentity from "@/app/components/SwitchIdentity";
import LogoutButton from "@/app/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  await verifySession();
  // Identity (who-am-I) is separate from auth: if it's unset on this device
  // (incl. sessions predating couple's mode), show the one-time pick screen.
  const viewer = await getViewer();
  if (!viewer) return <IdentityGate />;
  return (
    <div className="relative h-full">
      <LogoutButton />
      <SwitchIdentity viewer={viewer} />
      <HomeMenu />
    </div>
  );
}

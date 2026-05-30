import { verifySession } from "@/app/lib/dal";
import HomeMenu from "@/app/components/HomeMenu";
import LogoutButton from "@/app/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  // verifySession() now guarantees a logged-in author (identity is proven by
  // passcode at login), so there's no identity gate or switch here anymore.
  await verifySession();
  return (
    <div className="relative h-full">
      <LogoutButton />
      <HomeMenu />
    </div>
  );
}

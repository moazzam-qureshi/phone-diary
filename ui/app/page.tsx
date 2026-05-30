import { verifySession } from "@/app/lib/dal";
import HomeMenu from "@/app/components/HomeMenu";

export const dynamic = "force-dynamic";

export default async function Home() {
  await verifySession();
  return <HomeMenu />;
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAds } from "@/lib/ads/queries";
import { AccountMenu } from "@/components/main/account-menu";
import { AdsSection } from "@/components/main/ads-section";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ads = await getAds(session.userId);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-28 pt-6 md:px-8 md:pt-10">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight md:text-3xl">
          Hi, <span className="text-foreground">{session.username}</span>
        </h1>
        <AccountMenu username={session.username} />
      </header>

      <AdsSection ads={ads} />
    </main>
  );
}

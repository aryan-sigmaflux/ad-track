import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAds } from "@/lib/ads/queries";
import { clientCategories } from "@/lib/filters";
import { AccountMenu } from "@/components/main/account-menu";
import { CategoriesButton } from "@/components/main/categories-button";
import { AdsSection } from "@/components/main/ads-section";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ads = await getAds(session.userId);
  const categories = clientCategories(ads);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-28 pt-6 md:px-8 md:pt-10">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="justify-self-start">
          <AccountMenu username={session.username} />
        </div>
        <h1 className="min-w-0 justify-self-center truncate text-center text-xl font-bold tracking-tight md:text-3xl">
          Hi, <span className="text-foreground">{session.username}</span>
        </h1>
        <div className="justify-self-end">
          <CategoriesButton categories={categories} />
        </div>
      </header>

      <AdsSection ads={ads} />
    </main>
  );
}

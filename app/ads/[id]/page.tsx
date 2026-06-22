import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdDetail, getClientNames } from "@/lib/ads/queries";
import { AdDetailView } from "@/components/ads/ad-detail";

export default async function AdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [detail, clients] = await Promise.all([
    getAdDetail(id, session.userId),
    getClientNames(session.userId),
  ]);
  if (!detail) notFound();

  return <AdDetailView detail={detail} clients={clients} />;
}

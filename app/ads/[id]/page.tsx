import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdDetail } from "@/lib/ads/queries";
import { AdDetailView } from "@/components/ads/ad-detail";

export default async function AdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const detail = await getAdDetail(id, session.userId);
  if (!detail) notFound();

  return <AdDetailView detail={detail} />;
}

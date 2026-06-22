import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getClientDetail } from "@/lib/ads/queries";
import { OTHERS_SLUG } from "@/lib/filters";
import { ClientDetailView } from "@/components/clients/client-detail";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Next decodes the path segment, so `slug` is already the raw client string.
  const { slug } = await params;
  const clientKey = slug === OTHERS_SLUG ? null : slug;
  const detail = await getClientDetail(session.userId, clientKey);
  if (!detail) notFound();

  return <ClientDetailView detail={detail} />;
}

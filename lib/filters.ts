/** Sentinel used to represent ads with no client/company in filter selections. */
export const NO_CLIENT = "__none__";

export type StatusFilter = "all" | "running" | "paused";

/** URL slug for the "Others" group (ads with no client). */
export const OTHERS_SLUG = "__others__";

export type ClientCategory = { client: string | null; label: string; count: number };

/** Distinct clients across the given ads, with ad counts. Ads without a client
 *  collapse into a single "Others" category, always listed last. */
export function clientCategories(ads: { client: string | null }[]): ClientCategory[] {
  const counts = new Map<string, number>();
  let others = 0;
  for (const a of ads) {
    const key = a.client?.trim() ? a.client.trim() : null;
    if (key === null) others++;
    else counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cats: ClientCategory[] = Array.from(counts, ([client, count]) => ({
    client,
    label: client,
    count,
  })).sort((x, y) => x.label.localeCompare(y.label));
  if (others > 0) cats.push({ client: null, label: "Others", count: others });
  return cats;
}

/** Path segment for a client's page. `null` → the Others group. */
export function clientToSlug(client: string | null): string {
  return client === null ? OTHERS_SLUG : encodeURIComponent(client);
}

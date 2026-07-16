import { brandBySlug, type ArtGroup, type Brand, type CatalogEntry, type PortalResource, type PrebookEntry } from "@/data/portal";
import { isPrebookOpen, isPublicationLive } from "@/lib/publication";
import { createPortalAdminClient } from "@/lib/supabase/server";

type ResourceRow = {
  id: string;
  label: string;
  kind: PortalResource["kind"];
  source_type: "external_url" | "storage_object";
  external_url: string | null;
};

function resourceHref(row: ResourceRow, collection: "catalog" | "prebook" | "art") {
  return row.source_type === "external_url" && row.external_url
    ? row.external_url
    : `/api/resources/${collection}/${row.id}`;
}

function mapResources(rows: ResourceRow[], collection: "catalog" | "prebook" | "art"): PortalResource[] {
  return rows.map((row) => ({
    label: row.label,
    kind: row.kind,
    sourceType: row.source_type,
    href: resourceHref(row, collection),
  }));
}

async function readBrand(slug: string): Promise<Brand | undefined> {
  const fallback = brandBySlug(slug);
  const client = createPortalAdminClient();
  if (!client) return fallback;

  const { data: brand, error: brandError } = await client
    .from("portal_brands")
    .select("id,slug,name,nav_label,short_description,accent")
    .eq("slug", slug)
    .maybeSingle();
  if (brandError || !brand) return fallback;

  const [catalogResult, prebookResult, artGroupResult] = await Promise.all([
    client
      .from("portal_catalogs")
      .select("id,title,season,summary,image_alt,cover_source_type,cover_external_url,status,publish_at,display_order,portal_catalog_resources(id,label,kind,source_type,external_url,display_order)")
      .eq("brand_id", brand.id)
      .order("display_order"),
    client
      .from("portal_prebooks")
      .select("id,title,season,image_alt,deadline,ship_date,minimums,details,hero_source_type,hero_external_url,status,publish_at,display_order,portal_prebook_resources(id,label,kind,source_type,external_url,display_order)")
      .eq("brand_id", brand.id)
      .order("display_order"),
    client
      .from("portal_art_groups")
      .select("id,title,status,publish_at,display_order,portal_art_resources(id,label,kind,source_type,external_url,display_order)")
      .eq("brand_id", brand.id)
      .order("display_order"),
  ]);

  if (catalogResult.error || prebookResult.error || artGroupResult.error) return fallback;

  const now = Date.now();
  const inlineCatalogs: CatalogEntry[] = (catalogResult.data ?? [])
    .filter((row) => isPublicationLive(row.status, row.publish_at, now))
    .map((row) => ({
      id: row.id,
      title: row.title,
      season: row.season,
      image: row.cover_source_type === "external_url" && row.cover_external_url
        ? row.cover_external_url
        : `/api/media/catalog/${row.id}`,
      imageAlt: row.image_alt,
      summary: row.summary,
      resources: mapResources(
        [...(row.portal_catalog_resources ?? [])].sort((a, b) => a.display_order - b.display_order) as ResourceRow[],
        "catalog",
      ),
    }));

  const prebooks: PrebookEntry[] = (prebookResult.data ?? [])
    .filter((row) => isPublicationLive(row.status, row.publish_at, now) && isPrebookOpen(row.deadline, now))
    .map((row) => {
      const daysRemaining = Math.ceil((Date.parse(row.deadline) - now) / 86_400_000);
      return {
        id: row.id,
        title: row.title,
        season: row.season,
        status: daysRemaining <= 14 ? "closing-soon" : "open",
        image: row.hero_source_type === "external_url" && row.hero_external_url
          ? row.hero_external_url
          : `/api/media/prebook/${row.id}`,
        imageAlt: row.image_alt,
        deadline: row.deadline,
        shipDate: row.ship_date,
        minimums: row.minimums,
        details: Array.isArray(row.details) ? row.details.filter((value): value is string => typeof value === "string") : [],
        resources: mapResources(
          [...(row.portal_prebook_resources ?? [])].sort((a, b) => a.display_order - b.display_order) as ResourceRow[],
          "prebook",
        ),
      };
    });

  const artGroups: ArtGroup[] = (artGroupResult.data ?? [])
    .filter((row) => isPublicationLive(row.status, row.publish_at, now))
    .map((row) => ({
      title: row.title,
      resources: mapResources(
        [...(row.portal_art_resources ?? [])].sort((a, b) => a.display_order - b.display_order) as ResourceRow[],
        "art",
      ),
    }));

  return {
    slug: brand.slug,
    name: brand.name,
    navLabel: brand.nav_label,
    shortDescription: brand.short_description,
    accent: brand.accent,
    inlineCatalogs,
    prebooks,
    artGroups,
  };
}

export const getPublishedBrand = readBrand;

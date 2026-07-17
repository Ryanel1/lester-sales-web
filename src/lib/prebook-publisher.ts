import { catalogSourceFields, publicationFields, type CatalogResourceInput, type CatalogSourceInput } from "./catalog-publisher";

const requiredKinds = new Set(["catalog", "pricing", "workbook"]);
const allowedKinds = new Set(["catalog", "pricing", "program", "workbook"]);

export type PrebookResourceInput = CatalogResourceInput;

export function prebookResourceRows(resources: PrebookResourceInput[]) {
  if (resources.length < 3 || resources.length > 20) throw new Error("A prebook needs its catalog, price list, and workbook, and can have up to 20 resources.");
  const rows = resources.map((input, index) => {
    const label = typeof input.label === "string" ? input.label.trim() : "";
    const kind = typeof input.kind === "string" ? input.kind : "";
    if (!label || label.length > 180 || !allowedKinds.has(kind)) throw new Error("Every prebook resource needs a label and valid type.");
    const source = catalogSourceFields(input);
    return {
      ...(typeof input.id === "string" && /^[0-9a-f-]{36}$/i.test(input.id) ? { id: input.id } : {}),
      label,
      kind,
      link_status: source.source_type === "external_url" ? "unchecked" : "available",
      link_checked_at: source.source_type === "storage_object" ? new Date().toISOString() : null,
      display_order: (index + 1) * 10,
      ...source,
    };
  });
  const kinds = new Set(rows.map((row) => row.kind));
  for (const kind of requiredKinds) if (!kinds.has(kind)) throw new Error("A prebook must include a catalog, price list, and workbook.");
  return rows;
}

export function prebookRecord(body: Record<string, unknown>, now = Date.now()) {
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const deadline = typeof body.deadline === "string" ? body.deadline : "";
  const deadlineTime = Date.parse(deadline);
  const shipDate = typeof body.shipDate === "string" ? body.shipDate.trim() : "";
  const minimums = typeof body.minimums === "string" ? body.minimums.trim() : "";
  const publication = publicationFields(body, now);
  const details = Array.isArray(body.details)
    ? body.details.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];
  if (!/^[0-9a-f-]{36}$/i.test(brandId) || !title || title.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Brand, title, and URL slug are required.");
  }
  if (!Number.isFinite(deadlineTime) || !shipDate || !minimums) throw new Error("Deadline, ship date, and minimums are required.");
  if (publication.status === "published" && deadlineTime <= now) throw new Error("A prebook with a passed deadline cannot be published as open.");
  if (publication.status === "scheduled" && deadlineTime <= Date.parse(publication.publish_at as string)) {
    throw new Error("Schedule this prebook before its booking deadline.");
  }
  if (details.length > 20 || details.some((detail) => detail.length > 300)) throw new Error("Use no more than 20 concise prebook details.");
  return {
    brand_id: brandId,
    slug,
    title,
    season: typeof body.season === "string" ? body.season.trim() : "",
    image_alt: typeof body.imageAlt === "string" && body.imageAlt.trim() ? body.imageAlt.trim() : `Program image for ${title}`,
    deadline: new Date(deadlineTime).toISOString(),
    ship_date: shipDate,
    minimums,
    details,
    ...publication,
    archived_at: null,
    ...catalogSourceFields((body.hero ?? {}) as CatalogSourceInput, "hero_"),
  };
}

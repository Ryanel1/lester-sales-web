import { catalogSourceFields, publicationFields, type CatalogResourceInput } from "./catalog-publisher";

export type ArtResourceInput = CatalogResourceInput;

export function artResourceRows(resources: ArtResourceInput[]) {
  if (!resources.length || resources.length > 60) throw new Error("An art group needs at least one resource and can contain up to 60.");
  return resources.map((input, index) => {
    const label = typeof input.label === "string" ? input.label.trim() : "";
    if (!label || label.length > 180) throw new Error("Every art resource needs a label.");
    const source = catalogSourceFields(input);
    return {
      ...(typeof input.id === "string" && /^[0-9a-f-]{36}$/i.test(input.id) ? { id: input.id } : {}),
      label,
      kind: "art",
      link_status: source.source_type === "external_url" ? "unchecked" : "available",
      link_checked_at: source.source_type === "storage_object" ? new Date().toISOString() : null,
      display_order: (index + 1) * 10,
      ...source,
    };
  });
}

export function artGroupRecord(body: Record<string, unknown>, now = Date.now()) {
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(brandId) || !title || title.length > 180) throw new Error("Brand and group title are required.");
  return {
    brand_id: brandId,
    title,
    ...publicationFields(body, now),
    archived_at: null,
  };
}

export type CatalogSourceInput = {
  sourceType?: unknown;
  externalUrl?: unknown;
  storageBucket?: unknown;
  storagePath?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
};

export type CatalogResourceInput = CatalogSourceInput & {
  id?: unknown;
  label?: unknown;
  kind?: unknown;
};

const allowedKinds = new Set(["catalog", "pricing", "program", "workbook"]);
const allowedBuckets = new Set(["portal-documents", "portal-media"]);

export function catalogSourceFields(source: CatalogSourceInput, prefix = "") {
  const sourceType = source.sourceType === "storage_object" ? "storage_object" : "external_url";
  const externalUrl = typeof source.externalUrl === "string" ? source.externalUrl.trim() : "";
  const storageBucket = typeof source.storageBucket === "string" ? source.storageBucket : "";
  const storagePath = typeof source.storagePath === "string" ? source.storagePath : "";
  if (sourceType === "external_url" && !isHttpsUrl(externalUrl)) {
    throw new Error("Company links must begin with https://.");
  }
  if (sourceType === "storage_object" && (!allowedBuckets.has(storageBucket) || !storagePath)) {
    throw new Error("Finish the private file upload before saving.");
  }
  return {
    [`${prefix}source_type`]: sourceType,
    [`${prefix}external_url`]: sourceType === "external_url" ? externalUrl : null,
    [`${prefix}storage_bucket`]: sourceType === "storage_object" ? storageBucket : null,
    [`${prefix}storage_path`]: sourceType === "storage_object" ? storagePath : null,
    [`${prefix}original_filename`]: typeof source.originalFilename === "string" ? source.originalFilename.trim() || null : null,
    [`${prefix}mime_type`]: typeof source.mimeType === "string" ? source.mimeType.trim() || null : null,
    [`${prefix}byte_size`]: typeof source.byteSize === "number" && Number.isSafeInteger(source.byteSize) && source.byteSize >= 0
      ? source.byteSize
      : null,
  };
}

export function catalogResourceRows(primary: CatalogResourceInput, attachments: CatalogResourceInput[]) {
  if (attachments.length > 20) throw new Error("A catalog can have up to 20 supporting resources.");
  const inputs = [{ ...primary, label: "View catalog", kind: "catalog" }, ...attachments];
  return inputs.map((input, index) => {
    const label = typeof input.label === "string" ? input.label.trim() : "";
    const kind = typeof input.kind === "string" ? input.kind : "";
    if (!label || label.length > 180 || !allowedKinds.has(kind)) {
      throw new Error("Every resource needs a label and valid type.");
    }
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
}

export function catalogRecord(body: Record<string, unknown>) {
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const status = body.status === "published" ? "published" : "draft";
  if (!/^[0-9a-f-]{36}$/i.test(brandId) || !title || title.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Brand, title, and URL slug are required.");
  }
  return {
    brand_id: brandId,
    slug,
    title,
    season: typeof body.season === "string" ? body.season.trim() : "",
    summary: typeof body.summary === "string" ? body.summary.trim() : "",
    image_alt: typeof body.imageAlt === "string" && body.imageAlt.trim() ? body.imageAlt.trim() : `Cover of ${title}`,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    archived_at: null,
    ...catalogSourceFields((body.cover ?? {}) as CatalogSourceInput, "cover_"),
  };
}

export function isTemporarySignedUrl(value: string) {
  if (!isHttpsUrl(value)) return false;
  const parameters = new URL(value).searchParams;
  return ["expires", "signature", "token", "x-amz-signature", "x-amz-expires"].some((key) =>
    Array.from(parameters.keys()).some((parameter) => parameter.toLowerCase() === key),
  );
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

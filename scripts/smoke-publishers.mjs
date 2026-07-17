import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3002";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: "info@lestersales.net", password: process.env.PORTAL_ADMIN_PASSWORD });
if (authError || !auth.session) throw authError ?? new Error("Admin smoke authentication failed.");
const headers = { Authorization: `Bearer ${auth.session.access_token}`, "Content-Type": "application/json" };

async function request(path, method, body) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${payload.error ?? response.status}`);
  return payload;
}

const catalogList = await request("/api/admin/catalogs", "GET");
const brandId = catalogList.brands.find((brand) => brand.slug === "champion")?.id;
if (!brandId) throw new Error("Champion brand missing.");
const suffix = crypto.randomUUID().slice(0, 8);
const prebookIds = [];
const artIds = [];

try {
  const source = { sourceType: "external_url", externalUrl: "https://example.com/file.pdf" };
  const createdPrebook = await request("/api/admin/prebooks", "POST", { brandId, title: `Smoke Prebook ${suffix}`, slug: `smoke-prebook-${suffix}`, season: "QA", deadline: "2099-12-31T23:59:59Z", shipDate: "Spring 2099", minimums: "12 pieces", details: ["Automated lifecycle check"], imageAlt: "Smoke test", hero: { sourceType: "external_url", externalUrl: "https://example.com/hero.jpg" }, status: "draft", resources: [{ label: "Catalog", kind: "catalog", ...source }, { label: "Price list", kind: "pricing", ...source }, { label: "Workbook", kind: "workbook", ...source }] });
  prebookIds.push(createdPrebook.id);
  await request(`/api/admin/prebooks/${createdPrebook.id}`, "PATCH", { action: "publish" });
  await request(`/api/admin/prebooks/${createdPrebook.id}`, "PATCH", { action: "unpublish" });
  const duplicatePrebook = await request(`/api/admin/prebooks/${createdPrebook.id}`, "POST", { action: "duplicate" }); prebookIds.push(duplicatePrebook.id);
  await request(`/api/admin/prebooks/${createdPrebook.id}`, "PATCH", { action: "archive" });

  const createdArt = await request("/api/admin/art-groups", "POST", { brandId, title: `Smoke Art ${suffix}`, status: "draft", resources: [{ label: "Smoke art", kind: "art", ...source }] });
  artIds.push(createdArt.id);
  await request(`/api/admin/art-groups/${createdArt.id}`, "PATCH", { action: "publish" });
  await request(`/api/admin/art-groups/${createdArt.id}`, "PATCH", { action: "unpublish" });
  const duplicateArt = await request(`/api/admin/art-groups/${createdArt.id}`, "POST", { action: "duplicate" }); artIds.push(duplicateArt.id);
  await request(`/api/admin/art-groups/${createdArt.id}`, "PATCH", { action: "archive" });
  console.log(JSON.stringify({ prebookLifecycle: "passed", artLifecycle: "passed" }));
} finally {
  for (const id of prebookIds) await request(`/api/admin/prebooks/${id}`, "DELETE").catch(() => undefined);
  for (const id of artIds) await request(`/api/admin/art-groups/${id}`, "DELETE").catch(() => undefined);
}

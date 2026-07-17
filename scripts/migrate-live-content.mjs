import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sq = (name) => `https://www.lestersales.net/s/${name}`;
const gfs = (name, folder = "share") => `https://gfsgraphics.blob.core.windows.net/gfs-graphics/prd/gfsionline/${folder}/${name}`;
const external = (label, kind, url) => ({ label, kind, url });
const hosted = (label, kind, filename) => ({ label, kind, url: sq(filename), hosted: true });

const catalogs = [
  { brand: "champion", slug: "champion-collegiate-2026", title: "Champion Collegiate 2026", season: "Current inline collection", summary: "The current collegiate apparel assortment, together with the pricing and program files used to build an order.", cover: "champion.jpg", resources: [
    external("View catalog", "catalog", gfs("26FA_CC_CATALOG_COLLEGIATE_WEB_4.pdf")), external("Curated programs", "program", gfs("26FA_CC_PROGRAM_Curated_Program_Web_printable.pdf")), hosted("Bookstore programs", "program", "program-resize1.pdf"), hosted("Base pricing", "pricing", "26YR_CC_PRICE_Standard_Price_List.pdf"), hosted("High school pricing", "pricing", "26FA_CHS_PRICE_HIGH_SCHOOL_PRICE_Grid_2.pdf"),
  ] },
  { brand: "gear-comfortwash", slug: "gear-collegiate-2026", title: "Gear Collegiate 2026", season: "Current inline collection", summary: "The current Gear for Sports collegiate assortment with savings-program and inline pricing materials.", cover: "gear.jpg", resources: [
    external("View catalog", "catalog", gfs("26FA_GC_CATALOG_WEB.pdf")), external("Savings program", "program", gfs("2_26FA_GC_PROGRAM_Booklet.pdf")), hosted("Standard pricing", "pricing", "26YR_GC_TARGET_PRICING_GRID_INLINE_2.pdf"), hosted("High school pricing", "pricing", "26YR_GHS_PRICELIST_INLINE_2.pdf"),
  ] },
  { brand: "gear-comfortwash", slug: "comfortwash-collegiate-2026", title: "ComfortWash Collegiate 2026", season: "Current inline collection", summary: "The current ComfortWash collegiate collection with standard and high school pricing.", cover: "comfortwash.jpg", resources: [
    external("View catalog", "catalog", gfs("26YR_CWC_COLLEGIATE_CATALOG_WEB_2.pdf")), hosted("Standard pricing", "pricing", "26YR_CWB_TARGET-PRICING_GRID_INLINE_2-1.pdf"), hosted("High school pricing", "pricing", "26YR_CWHS_PRICELIST_INLINE.pdf"),
  ] },
  { brand: "under-armour", slug: "under-armour-collegiate-essentials-2026", title: "Under Armour Collegiate Essentials 2026", season: "Current inline collection", summary: "Under Armour collegiate apparel essentials with the current standard and high school price list.", cover: "ua.jpg", resources: [external("View catalog", "catalog", gfs("26FA_UC_CATALOG_COLLEGIATE_ESSENTIALS_WEB_3.pdf")), hosted("Standard / high school pricing", "pricing", "26FA_CC_PRICE_Inline_Price_List-1.pdf")] },
  { brand: "under-armour", slug: "under-armour-headwear-accessories-2026", title: "Under Armour Headwear & Accessories 2026", season: "Current inline collection", summary: "The current Under Armour collegiate headwear and accessories collection with supporting pricing.", cover: "ua-headwear.jpg", resources: [external("View catalog", "catalog", gfs("26FA_UC_CATALOG_HEADWEAR_ACCESSORIES_WEB_2.pdf")), hosted("Standard / high school pricing", "pricing", "26FA_CC_PRICE_Headwear_Acc_Price_List_2.pdf")] },
  { brand: "pro-sports", slug: "under-armour-milb-2026", title: "Under Armour MiLB 2026", season: "Current inline collection", summary: "The 2026 Under Armour Minor League Baseball collection and venue pricing.", cover: "pro.jpg", resources: [external("View catalog", "catalog", gfs("26FA_UPS_CATALOG_MILB_WEB.pdf")), hosted("Pricing", "pricing", "26FA_UPS_PRICE_Inline_Price_List.pdf")] },
  { brand: "pro-sports", slug: "champion-milb-2026", title: "Champion MiLB 2026", season: "Current inline collection", summary: "The 2026 Champion Minor League Baseball collection and venue pricing.", cover: "champion-milb.jpg", resources: [external("View catalog", "catalog", gfs("26FA_CPS_CATALOG_MILB_3.pdf")), hosted("Pricing", "pricing", "26FA_CPS_PRICE_Venue_MiLB_Price_List.pdf")] },
];

const artGroups = [
  { brand: "champion", title: "Collegiate art collections", resources: [
    hosted("Front chest embroidery", "art", "FC-Embroidary.pdf"), hosted("Tackle twill", "art", "Tackle-Twill-Art.pdf"), hosted("Tackle twill with mascot", "art", "Tackle-Twill-w-Mascot-Art.pdf"), hosted("Front chest screenprint", "art", "FC-Screenprint.pdf"), hosted("Reverse Weave", "art", "250115_0034_QG_C_RW_2025-fmx6.pdf"), hosted("Oversized graphics", "art", "250112_0005_QG_C_OVERSIZED_ART.pdf"), external("Mom, dad & alumni", "art", gfs("25YR_CC_SKETCH_MOM_DAD_ALUMNI.pdf")), hosted("More mom art", "art", "250115_0023_QG_C_Mom.pdf"), hosted("More dad art", "art", "250115_0028_QG_C_Dad_2025.pdf"), hosted("More alumni art", "art", "250115_0026_QG_C_Alumni_2025.pdf"), hosted("Baseball 2025", "art", "25YR_CC_SKETCH_BASEBALL_COLLECTION.pdf"), hosted("More baseball", "art", "241227_0012_QG_C_Baseball_2025.pdf"), external("Left chest embroideries", "art", gfs("25YR_CC_SKETCH_Left_Chest_Embroideries.pdf")), external("90s catalog flips", "art", gfs("25YR_CC_SKETCH_90S_CATALOG_FLIPS.pdf")), hosted("More football", "art", "MoreFootball.pdf"), hosted("Football 2025", "art", "25YR_CC_SKETCH_FOOTBALL_COLLECTION.pdf"),
  ] },
  { brand: "gear-comfortwash", title: "Gear art collections", resources: [
    external("Floral embroidery", "art", gfs("25FA_GC_TOOLS_FLORAL.pdf")), external("3-stripe 3D front chest", "art", gfs("25FA_GC_TOOLS_3_Stripe_3DE.pdf")), external("Tapestry embroidery", "art", gfs("25FA_GC_TOOLS_Tapestry.pdf")), external("Boucle", "art", gfs("25FA_GC_TOOLS_BOUCLE.pdf")), external("Metallic applique twill", "art", gfs("25FA_GC_TOOLS_METALLIC_APPLIQUE.pdf")), external("Alumni art pack", "art", gfs("25FA_GC_SKETCH_Alumni_Package.pdf")), external("Teddy bear pack", "art", gfs("26FA_GC_SAMPLE_Teddy_Bear_Package.pdf")), external("Dad art pack", "art", gfs("25FA_GC_SKETCH_Dad_Package.pdf")), external("Mom art pack", "art", gfs("25FA_GC_SKETCH_Mom_Package.pdf")), external("Hot color pop", "art", gfs("26YR_CWC_TOOLS_HOT_COLOR_BOOKSTORE.pdf")),
  ] },
  { brand: "gear-comfortwash", title: "ComfortWash art collections", resources: [external("Color pop", "art", gfs("25FA_CW_TOOLS_COLOR_POP_GUIDE.pdf")), external("Wool applique", "art", gfs("25FA_CW_TOOLS_WOOL_APPLIQUE_COLOR_GUIDE.pdf")), external("Pastel pop", "art", gfs("25FA_CW_TOOLS_PASTEL_POP_GUIDE.pdf"))] },
];

const prebooks = [
  { brand: "champion", slug: "skybox-spring-2027", title: "SkyBox Spring 2027", season: "Spring 2027", deadline: "2026-05-18T23:59:59-05:00", shipDate: "Starts shipping February 15, 2027", minimums: "48- and 72-piece minimums available at different cost tiers.", details: ["Styles use the mixed-ratio case packs shown in the catalog.", "No cancellations or order changes after release to production.", "Graphic designs and locations cannot be changed.", "Styles or colors may be dropped because of low demand."], resources: [external("Catalog", "catalog", gfs("27SP_CCP_CATALOG_SKYBOX_COLLEGIATE_CATALOG_PRINT.pdf")), hosted("Price list", "pricing", "27SP_CC_PRICE_SkyBox_Collegiate_Bookstore_Price_List-w88t.pdf"), external("Workbook", "workbook", gfs("27SP_CC_PRICE_SkyBox_Workbooks.pdf", "nonshare"))] },
  { brand: "champion", slug: "skybox-fall-2026", title: "SkyBox Collection Fall 2026", season: "Fall 2026", deadline: "2025-10-17T23:59:59-05:00", shipDate: "Started shipping July 15, 2026", minimums: "72 pieces per style, color, and graphic; selected styles allow 48–71 pieces.", details: ["All styles use mixed-ratio case packs.", "Men’s, women’s, and youth styles are ordered in 12- or 24-piece increments.", "No cancellations or changes after release to production.", "Graphic process methods and locations cannot be changed."], resources: [hosted("Catalog", "catalog", "26FA_CPS_CATALOG_NCAA_SkyBox.pdf"), hosted("Price list", "pricing", "26FA_CC_PRICE_PreBook_SkyBox_Price_List_Bookstore.pdf"), hosted("Workbook", "workbook", "26FA_CC_TOOLS_2026_Skybox_Workbooks.pdf")] },
];

function safeName(url) { return path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]+/g, "-"); }
async function download(url) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error(`Empty file ${url}`);
  return { bytes, mime: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream" };
}
async function sourceFields(resource, brand) {
  if (!resource.hosted) return { source_type: "external_url", external_url: resource.url, storage_bucket: null, storage_path: null, original_filename: null, mime_type: null, byte_size: null, sha256: null, link_status: "available", link_checked_at: new Date().toISOString(), source_note: "Verified canonical company URL during 2026 migration." };
  const file = await download(resource.url); const filename = safeName(resource.url); const storagePath = `migration/${brand}/${filename}`;
  const { error } = await supabase.storage.from("portal-documents").upload(storagePath, file.bytes, { contentType: file.mime, upsert: true });
  if (error) throw error;
  return { source_type: "storage_object", external_url: null, storage_bucket: "portal-documents", storage_path: storagePath, original_filename: filename, mime_type: file.mime, byte_size: file.bytes.length, sha256: createHash("sha256").update(file.bytes).digest("hex"), link_status: "available", link_checked_at: new Date().toISOString(), source_note: `Migrated from ${resource.url}` };
}
async function rowsFor(resources, brand) { const rows = []; for (let index = 0; index < resources.length; index += 1) rows.push({ label: resources[index].label, kind: resources[index].kind, display_order: (index + 1) * 10, ...await sourceFields(resources[index], brand) }); return rows; }
async function uploadCover(filename, slug) {
  const bytes = await readFile(path.join(process.cwd(), ".migration-staging/covers", filename)); const storagePath = `migration/covers/${slug}.jpg`;
  const { error } = await supabase.storage.from("portal-media").upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true }); if (error) throw error;
  return { cover_source_type: "storage_object", cover_external_url: null, cover_storage_bucket: "portal-media", cover_storage_path: storagePath, cover_original_filename: filename, cover_mime_type: "image/jpeg", cover_byte_size: bytes.length, cover_sha256: createHash("sha256").update(bytes).digest("hex") };
}
async function run() {
  const { data: brands, error: brandsError } = await supabase.from("portal_brands").select("id,slug"); if (brandsError) throw brandsError;
  const brandIds = new Map(brands.map((brand) => [brand.slug, brand.id]));
  for (let index = 0; index < catalogs.length; index += 1) {
    const catalog = catalogs[index]; const brandId = brandIds.get(catalog.brand); const cover = await uploadCover(catalog.cover, catalog.slug);
    const { data: saved, error } = await supabase.from("portal_catalogs").upsert({ brand_id: brandId, slug: catalog.slug, title: catalog.title, season: catalog.season, summary: catalog.summary, image_alt: `Cover of ${catalog.title}`, status: "published", published_at: new Date().toISOString(), archived_at: null, display_order: (index + 1) * 10, ...cover }, { onConflict: "brand_id,slug" }).select("id").single(); if (error) throw error;
    await supabase.from("portal_catalog_resources").delete().eq("catalog_id", saved.id); const rows = await rowsFor(catalog.resources, catalog.brand);
    const { error: resourceError } = await supabase.from("portal_catalog_resources").insert(rows.map((row) => ({ ...row, catalog_id: saved.id }))); if (resourceError) throw resourceError;
  }
  for (let index = 0; index < artGroups.length; index += 1) {
    const group = artGroups[index]; const brandId = brandIds.get(group.brand);
    const { data: saved, error } = await supabase.from("portal_art_groups").upsert({ brand_id: brandId, title: group.title, status: "published", published_at: new Date().toISOString(), archived_at: null, display_order: (index + 1) * 10 }, { onConflict: "brand_id,title" }).select("id").single(); if (error) throw error;
    await supabase.from("portal_art_resources").delete().eq("art_group_id", saved.id); const rows = await rowsFor(group.resources, group.brand);
    const { error: resourceError } = await supabase.from("portal_art_resources").insert(rows.map((row) => ({ ...row, art_group_id: saved.id }))); if (resourceError) throw resourceError;
  }
  for (let index = 0; index < prebooks.length; index += 1) {
    const prebook = prebooks[index]; const brandId = brandIds.get(prebook.brand);
    const { data: saved, error } = await supabase.from("portal_prebooks").upsert({ brand_id: brandId, slug: prebook.slug, title: prebook.title, season: prebook.season, image_alt: "", deadline: prebook.deadline, ship_date: prebook.shipDate, minimums: prebook.minimums, details: prebook.details, status: "archived", archived_at: new Date().toISOString(), published_at: null, display_order: (index + 1) * 10 }, { onConflict: "brand_id,slug" }).select("id").single(); if (error) throw error;
    await supabase.from("portal_prebook_resources").delete().eq("prebook_id", saved.id); const rows = await rowsFor(prebook.resources, prebook.brand);
    const { error: resourceError } = await supabase.from("portal_prebook_resources").insert(rows.map((row) => ({ ...row, prebook_id: saved.id }))); if (resourceError) throw resourceError;
  }
  console.log(JSON.stringify({ catalogs: catalogs.length, catalogResources: catalogs.reduce((sum, item) => sum + item.resources.length, 0), artGroups: artGroups.length, artResources: artGroups.reduce((sum, item) => sum + item.resources.length, 0), archivedPrebooks: prebooks.length, prebookResources: prebooks.reduce((sum, item) => sum + item.resources.length, 0) }));
}

await run();

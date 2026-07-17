"use client";

import { type Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BrandOption, emptySource, PublisherAuth, PublisherHeader, PublisherSourcePanel, rowSource, slugify, SourceDraft, StoredResource, usePublisherSession } from "@/components/PublisherShared";

type ResourceKind = "catalog" | "pricing" | "program" | "workbook";
type ResourceDraft = { key: string; id?: string; label: string; kind: ResourceKind; source: SourceDraft };
type PrebookSummary = { id: string; brand_id: string; slug: string; title: string; season: string; image_alt: string; deadline: string; ship_date: string; minimums: string; details: string[]; status: "draft" | "scheduled" | "published" | "archived"; display_order: number; hero_source_type: SourceDraft["mode"] | null; hero_external_url: string | null; hero_storage_bucket: string | null; hero_storage_path: string | null; hero_original_filename: string | null; hero_mime_type: string | null; hero_byte_size: number | null; portal_brands: { name: string } | null; portal_prebook_resources: StoredResource[] };
const coreResources: Array<{ label: string; kind: ResourceKind }> = [{ label: "View catalog", kind: "catalog" }, { label: "Price list", kind: "pricing" }, { label: "Order workbook", kind: "workbook" }];

function initialResources(): ResourceDraft[] { return coreResources.map((resource) => ({ ...resource, key: crypto.randomUUID(), source: emptySource() })); }
function localDate(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return Number.isNaN(date.valueOf()) ? "" : new Date(date.valueOf() - offset).toISOString().slice(0, 16); }

export function AdminPrebookPublisher() {
  const { client, session, authReady, prepareSource } = usePublisherSession();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [prebooks, setPrebooks] = useState<PrebookSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [season, setSeason] = useState("");
  const [deadline, setDeadline] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [minimums, setMinimums] = useState("");
  const [details, setDetails] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [hero, setHero] = useState<SourceDraft>(emptySource);
  const [resources, setResources] = useState<ResourceDraft[]>([]);

  const load = useCallback(async (active: Session) => {
    const response = await fetch("/api/admin/prebooks", { headers: { Authorization: `Bearer ${active.access_token}` } });
    const payload = await response.json();
    if (!response.ok) { if (response.status === 401) await client?.auth.signOut(); throw new Error(payload.error ?? "Unable to load prebooks."); }
    setBrands(payload.brands); setPrebooks(payload.prebooks); setBrandId((current) => current || payload.brands[0]?.id || "");
    setResources((current) => current.length ? current : initialResources());
  }, [client]);

  useEffect(() => { if (session) Promise.resolve().then(() => load(session)).catch((error) => setMessage(error.message)); }, [session, load]);

  function reset() { setEditingId(null); setTitle(""); setSlug(""); setSlugEdited(false); setSeason(""); setDeadline(""); setShipDate(""); setMinimums(""); setDetails(""); setImageAlt(""); setHero(emptySource()); setResources(initialResources()); }

  function edit(prebook: PrebookSummary) {
    setEditingId(prebook.id); setBrandId(prebook.brand_id); setTitle(prebook.title); setSlug(prebook.slug); setSlugEdited(true); setSeason(prebook.season); setDeadline(localDate(prebook.deadline)); setShipDate(prebook.ship_date); setMinimums(prebook.minimums); setDetails(prebook.details.join("\n")); setImageAlt(prebook.image_alt);
    setHero({ mode: prebook.hero_source_type ?? "external_url", url: prebook.hero_external_url ?? "", file: null, storageBucket: prebook.hero_storage_bucket ?? "", storagePath: prebook.hero_storage_path ?? "", originalFilename: prebook.hero_original_filename ?? "", mimeType: prebook.hero_mime_type ?? "", byteSize: prebook.hero_byte_size });
    setResources([...prebook.portal_prebook_resources].sort((a, b) => a.display_order - b.display_order).map((resource) => ({ key: resource.id, id: resource.id, label: resource.label, kind: resource.kind as ResourceKind, source: rowSource(resource) })));
    setMessage(`Editing ${prebook.title}.`); document.getElementById("prebook-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === "published" ? "published" : "draft";
    setBusy(true); setMessage(status === "published" ? "Uploading and publishing…" : "Uploading and saving draft…");
    try {
      const [preparedHero, ...preparedResources] = await Promise.all([prepareSource(hero, "portal-media", session), ...resources.map((resource) => prepareSource(resource.source, "portal-documents", session))]);
      const body = { brandId, title, slug, season, deadline, shipDate, minimums, details: details.split("\n"), imageAlt, hero: preparedHero, status, resources: resources.map((resource, index) => ({ id: resource.id, label: resource.label, kind: resource.kind, ...preparedResources[index] })) };
      const response = await fetch(editingId ? `/api/admin/prebooks/${editingId}` : "/api/admin/prebooks", { method: editingId ? "PATCH" : "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to save prebook.");
      setMessage(status === "published" ? "Prebook published and visible until its deadline." : "Prebook draft saved privately."); reset(); await load(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save prebook."); } finally { setBusy(false); }
  }

  async function action(prebook: PrebookSummary, actionName: "publish" | "unpublish" | "archive" | "move_up" | "move_down" | "duplicate" | "delete") {
    if (!session) return;
    if (["delete", "archive", "unpublish"].includes(actionName) && !window.confirm(actionName === "delete" ? `Permanently delete “${prebook.title}”?` : `${actionName === "archive" ? "Archive" : "Unpublish"} “${prebook.title}”?`)) return;
    setBusy(true);
    try {
      const method = actionName === "duplicate" ? "POST" : actionName === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(`/api/admin/prebooks/${prebook.id}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, ...(method === "DELETE" ? {} : { "Content-Type": "application/json" }) }, body: method === "DELETE" ? undefined : JSON.stringify({ action: actionName }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to update prebook.");
      if (editingId === prebook.id && ["delete", "archive"].includes(actionName)) reset(); setMessage(`Prebook ${actionName.replace("_", " ")} complete.`); await load(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update prebook."); } finally { setBusy(false); }
  }

  function updateResource(key: string, update: Partial<ResourceDraft> | ((current: ResourceDraft) => ResourceDraft)) { setResources((current) => current.map((resource) => resource.key === key ? typeof update === "function" ? update(resource) : { ...resource, ...update } : resource)); }

  if (!authReady) return <main className="publisherLoading">Opening publisher…</main>;
  if (!session) return <PublisherAuth busy={busy} client={client} message={message} onError={setMessage} onSignedIn={async (active) => { setBusy(true); try { await load(active); } finally { setBusy(false); } }} />;

  return <main className="publisherShell"><PublisherHeader active="prebooks" client={client} description="Publish limited-time programs with dates, minimums, and every order file together." title="Prebook builder" /><div className="publisherGrid"><form className="publisherForm" id="prebook-editor" onSubmit={save}>
    {editingId ? <div className="publisherEditNotice"><span>Editing</span><strong>{title}</strong><button onClick={reset} type="button">Cancel edit</button></div> : null}
    <section className="publisherPanel"><div className="publisherPanelHeading"><span>01</span><div><h2>Program details</h2><p>The selling window, expected ship timing, and minimum order.</p></div></div><div className="publisherFields publisherFieldsTwo"><label>Brand<select onChange={(event) => setBrandId(event.target.value)} required value={brandId}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label>Season<input onChange={(event) => setSeason(event.target.value)} placeholder="Spring 2027" required value={season} /></label><label className="publisherFieldWide">Prebook title<input onChange={(event) => { const value = event.target.value; setTitle(value); if (!slugEdited) setSlug(slugify(value)); }} required value={title} /></label><label>URL slug<input onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} required value={slug} /></label><label>Hero description<input onChange={(event) => setImageAlt(event.target.value)} placeholder="Program image for…" value={imageAlt} /></label><label>Booking deadline<input onChange={(event) => setDeadline(event.target.value)} required type="datetime-local" value={deadline} /></label><label>Expected ship<input onChange={(event) => setShipDate(event.target.value)} placeholder="Ships February–March 2027" required value={shipDate} /></label><label className="publisherFieldWide">Minimums<input onChange={(event) => setMinimums(event.target.value)} placeholder="24 pieces per design" required value={minimums} /></label><label className="publisherFieldWide">Program details, one per line<textarea onChange={(event) => setDetails(event.target.value)} placeholder={"Opening order requirements\nDecoration restrictions\nCancellation terms"} rows={5} value={details} /></label></div></section>
    <PublisherSourcePanel accept="image/jpeg,image/png,image/webp,image/avif" index="02" label="Hero image" onChange={setHero} source={hero} />
    <section className="publisherPanel"><div className="publisherPanelHeading publisherPanelHeadingAction"><span>03</span><div><h2>Order files</h2><p>Catalog, price list, and workbook are required. Add program files when needed.</p></div><button onClick={() => setResources((current) => [...current, { key: crypto.randomUUID(), label: "", kind: "program", source: emptySource() }])} type="button">Add resource</button></div><div className="publisherAttachments">{resources.map((resource, index) => <article className="publisherAttachment" key={resource.key}><div className="publisherAttachmentHeader"><strong>{index < 3 ? coreResources[index].label : `Additional resource ${index - 2}`}</strong>{index >= 3 ? <button onClick={() => setResources((current) => current.filter((item) => item.key !== resource.key))} type="button">Remove</button> : null}</div><div className="publisherFields publisherFieldsTwo"><label>Label<input onChange={(event) => updateResource(resource.key, { label: event.target.value })} required value={resource.label} /></label><label>Type<select disabled={index < 3} onChange={(event) => updateResource(resource.key, { kind: event.target.value as ResourceKind })} value={resource.kind}><option value="catalog">Catalog</option><option value="pricing">Pricing</option><option value="workbook">Workbook</option><option value="program">Program</option></select></label></div><PublisherSourcePanel accept="application/pdf,.xlsx,.xls,.zip" label={resource.label || `Resource ${index + 1}`} onChange={(source) => updateResource(resource.key, (current) => ({ ...current, source }))} source={resource.source} /></article>)}</div></section>
    <div className="publisherSubmitBar"><p aria-live="polite">{message || "Prebooks disappear automatically when the booking deadline passes."}</p><div><button disabled={busy} name="status" type="submit" value="draft">Save draft</button><button className="publisherPrimary" disabled={busy} name="status" type="submit" value="published">{editingId ? "Save & publish" : "Publish prebook"}</button></div></div>
  </form><aside className="publisherLibrary"><div><p className="publisherEyebrow">Program library</p><h2>{prebooks.length} prebook{prebooks.length === 1 ? "" : "s"}</h2></div><div className="publisherCatalogRows">{prebooks.map((prebook) => <article key={prebook.id}><div className="publisherCatalogSummary"><div><strong>{prebook.title}</strong><span>{prebook.portal_brands?.name} · closes {new Date(prebook.deadline).toLocaleDateString()}</span></div><em data-status={prebook.status}>{prebook.status}</em></div><div className="publisherCatalogActions"><button disabled={busy} onClick={() => edit(prebook)} type="button">Edit</button><button disabled={busy} onClick={() => action(prebook, "duplicate")} type="button">Duplicate</button><button aria-label={`Move ${prebook.title} up`} disabled={busy} onClick={() => action(prebook, "move_up")} type="button">↑</button><button aria-label={`Move ${prebook.title} down`} disabled={busy} onClick={() => action(prebook, "move_down")} type="button">↓</button>{prebook.status === "published" ? <button disabled={busy} onClick={() => action(prebook, "unpublish")} type="button">Unpublish</button> : <button disabled={busy} onClick={() => action(prebook, "publish")} type="button">Publish</button>}<button disabled={busy} onClick={() => action(prebook, "archive")} type="button">Archive</button><button className="publisherDanger" disabled={busy} onClick={() => action(prebook, "delete")} type="button">Delete</button></div></article>)}</div></aside></div></main>;
}

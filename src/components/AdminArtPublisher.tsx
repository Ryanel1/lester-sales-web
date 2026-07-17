"use client";

import { type Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BrandOption, emptySource, PublisherAuth, PublisherHeader, PublisherSourcePanel, rowSource, SourceDraft, StoredResource, usePublisherSession } from "@/components/PublisherShared";

type ArtDraft = { key: string; id?: string; label: string; source: SourceDraft };
type ArtGroupSummary = { id: string; brand_id: string; title: string; status: "draft" | "scheduled" | "published" | "archived"; display_order: number; portal_brands: { name: string } | null; portal_art_resources: StoredResource[] };

export function AdminArtPublisher() {
  const { client, session, authReady, prepareSource } = usePublisherSession();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [groups, setGroups] = useState<ArtGroupSummary[]>([]);
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [resources, setResources] = useState<ArtDraft[]>([{ key: "initial", label: "", source: emptySource() }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (active: Session) => {
    const response = await fetch("/api/admin/art-groups", { headers: { Authorization: `Bearer ${active.access_token}` } });
    const payload = await response.json();
    if (!response.ok) { if (response.status === 401) await client?.auth.signOut(); throw new Error(payload.error ?? "Unable to load art library."); }
    setBrands(payload.brands); setGroups(payload.groups); setBrandId((current) => current || payload.brands[0]?.id || "");
  }, [client]);
  useEffect(() => { if (session) Promise.resolve().then(() => load(session)).catch((error) => setMessage(error.message)); }, [session, load]);

  function reset() { setEditingId(null); setTitle(""); setResources([{ key: crypto.randomUUID(), label: "", source: emptySource() }]); }
  function edit(group: ArtGroupSummary) { setEditingId(group.id); setBrandId(group.brand_id); setTitle(group.title); setResources([...group.portal_art_resources].sort((a, b) => a.display_order - b.display_order).map((resource) => ({ key: resource.id, id: resource.id, label: resource.label, source: rowSource(resource) }))); setMessage(`Editing ${group.title}.`); document.getElementById("art-editor")?.scrollIntoView({ behavior: "smooth" }); }
  function updateResource(key: string, update: Partial<ArtDraft> | ((current: ArtDraft) => ArtDraft)) { setResources((current) => current.map((resource) => resource.key === key ? typeof update === "function" ? update(resource) : { ...resource, ...update } : resource)); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === "published" ? "published" : "draft";
    setBusy(true); setMessage(status === "published" ? "Uploading and publishing…" : "Uploading and saving draft…");
    try {
      const prepared = await Promise.all(resources.map((resource) => prepareSource(resource.source, "portal-documents", session)));
      const body = { brandId, title, status, resources: resources.map((resource, index) => ({ id: resource.id, label: resource.label, kind: "art", ...prepared[index] })) };
      const response = await fetch(editingId ? `/api/admin/art-groups/${editingId}` : "/api/admin/art-groups", { method: editingId ? "PATCH" : "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to save art group.");
      setMessage(status === "published" ? "Art group published to the customer site." : "Art group draft saved privately."); reset(); await load(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save art group."); } finally { setBusy(false); }
  }

  async function action(group: ArtGroupSummary, actionName: "publish" | "unpublish" | "archive" | "move_up" | "move_down" | "duplicate" | "delete") {
    if (!session) return;
    if (["delete", "archive", "unpublish"].includes(actionName) && !window.confirm(actionName === "delete" ? `Permanently delete “${group.title}”?` : `${actionName === "archive" ? "Archive" : "Unpublish"} “${group.title}”?`)) return;
    setBusy(true);
    try {
      const method = actionName === "duplicate" ? "POST" : actionName === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(`/api/admin/art-groups/${group.id}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, ...(method === "DELETE" ? {} : { "Content-Type": "application/json" }) }, body: method === "DELETE" ? undefined : JSON.stringify({ action: actionName }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to update art group.");
      if (editingId === group.id && ["delete", "archive"].includes(actionName)) reset(); setMessage(`Art group ${actionName.replace("_", " ")} complete.`); await load(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update art group."); } finally { setBusy(false); }
  }

  if (!authReady) return <main className="publisherLoading">Opening publisher…</main>;
  if (!session) return <PublisherAuth busy={busy} client={client} message={message} onError={setMessage} onSignedIn={async (active) => { setBusy(true); try { await load(active); } finally { setBusy(false); } }} />;

  return <main className="publisherShell"><PublisherHeader active="art" client={client} description="Group customer-ready artwork by brand and keep every source current." title="Art library manager" /><div className="publisherGrid"><form className="publisherForm" id="art-editor" onSubmit={save}>
    {editingId ? <div className="publisherEditNotice"><span>Editing</span><strong>{title}</strong><button onClick={reset} type="button">Cancel edit</button></div> : null}
    <section className="publisherPanel"><div className="publisherPanelHeading"><span>01</span><div><h2>Collection</h2><p>Use a customer-friendly group name that matches how the artwork is sold.</p></div></div><div className="publisherFields publisherFieldsTwo"><label>Brand<select onChange={(event) => setBrandId(event.target.value)} required value={brandId}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label>Group title<input onChange={(event) => setTitle(event.target.value)} placeholder="Decoration" required value={title} /></label></div></section>
    <section className="publisherPanel"><div className="publisherPanelHeading publisherPanelHeadingAction"><span>02</span><div><h2>Art resources</h2><p>Each item can retain a stable company link or live in private LesterSales.net Storage.</p></div><button onClick={() => setResources((current) => [...current, { key: crypto.randomUUID(), label: "", source: emptySource() }])} type="button">Add artwork</button></div><div className="publisherAttachments">{resources.map((resource, index) => <article className="publisherAttachment" key={resource.key}><div className="publisherAttachmentHeader"><strong>Art resource {index + 1}</strong>{resources.length > 1 ? <button onClick={() => setResources((current) => current.filter((item) => item.key !== resource.key))} type="button">Remove</button> : null}</div><div className="publisherFields"><label>Customer label<input onChange={(event) => updateResource(resource.key, { label: event.target.value })} placeholder="Front chest embroidery" required value={resource.label} /></label></div><PublisherSourcePanel accept="application/pdf,.zip,image/jpeg,image/png" label={resource.label || `Art resource ${index + 1}`} onChange={(source) => updateResource(resource.key, (current) => ({ ...current, source }))} source={resource.source} /></article>)}</div></section>
    <div className="publisherSubmitBar"><p aria-live="polite">{message || "Published groups appear as compact customer links on the brand page."}</p><div><button disabled={busy} name="status" type="submit" value="draft">Save draft</button><button className="publisherPrimary" disabled={busy} name="status" type="submit" value="published">{editingId ? "Save & publish" : "Publish art group"}</button></div></div>
  </form><aside className="publisherLibrary"><div><p className="publisherEyebrow">Art library</p><h2>{groups.length} group{groups.length === 1 ? "" : "s"}</h2></div><div className="publisherCatalogRows">{groups.map((group) => <article key={group.id}><div className="publisherCatalogSummary"><div><strong>{group.title}</strong><span>{group.portal_brands?.name} · {group.portal_art_resources.length} resources</span></div><em data-status={group.status}>{group.status}</em></div><div className="publisherCatalogActions"><button disabled={busy} onClick={() => edit(group)} type="button">Edit</button><button disabled={busy} onClick={() => action(group, "duplicate")} type="button">Duplicate</button><button aria-label={`Move ${group.title} up`} disabled={busy} onClick={() => action(group, "move_up")} type="button">↑</button><button aria-label={`Move ${group.title} down`} disabled={busy} onClick={() => action(group, "move_down")} type="button">↓</button>{group.status === "published" ? <button disabled={busy} onClick={() => action(group, "unpublish")} type="button">Unpublish</button> : <button disabled={busy} onClick={() => action(group, "publish")} type="button">Publish</button>}<button disabled={busy} onClick={() => action(group, "archive")} type="button">Archive</button><button className="publisherDanger" disabled={busy} onClick={() => action(group, "delete")} type="button">Delete</button></div></article>)}</div></aside></div></main>;
}

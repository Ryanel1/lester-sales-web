"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { isTemporarySignedUrl } from "@/lib/catalog-publisher";

type BrandOption = { id: string; name: string; slug: string };
type SourceMode = "external_url" | "storage_object";
type ResourceKind = "pricing" | "program" | "workbook";
type SourceDraft = {
  mode: SourceMode;
  url: string;
  file: File | null;
  storageBucket: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number | null;
};
type AttachmentDraft = { key: string; id?: string; kind: ResourceKind; label: string; source: SourceDraft };
type CatalogResourceRow = {
  id: string;
  label: string;
  kind: "catalog" | ResourceKind;
  source_type: SourceMode;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: number | null;
  display_order: number;
};
type CatalogSummary = {
  id: string;
  brand_id: string;
  slug: string;
  title: string;
  season: string;
  summary: string;
  image_alt: string;
  status: "draft" | "scheduled" | "published" | "archived";
  display_order: number;
  updated_at: string;
  cover_source_type: SourceMode | null;
  cover_external_url: string | null;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_original_filename: string | null;
  cover_mime_type: string | null;
  cover_byte_size: number | null;
  portal_brands: { name: string } | null;
  portal_catalog_resources: CatalogResourceRow[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function emptySource(): SourceDraft {
  return { mode: "external_url", url: "", file: null, storageBucket: "", storagePath: "", originalFilename: "", mimeType: "", byteSize: null };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rowSource(row: CatalogResourceRow): SourceDraft {
  return {
    mode: row.source_type,
    url: row.external_url ?? "",
    file: null,
    storageBucket: row.storage_bucket ?? "",
    storagePath: row.storage_path ?? "",
    originalFilename: row.original_filename ?? "",
    mimeType: row.mime_type ?? "",
    byteSize: row.byte_size,
  };
}

export function AdminCatalogPublisher() {
  const client = useMemo(() => supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null, []);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!client);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [season, setSeason] = useState("Current inline collection");
  const [summary, setSummary] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [cover, setCover] = useState<SourceDraft>(emptySource);
  const [catalogSource, setCatalogSource] = useState<SourceDraft>(emptySource);
  const [catalogResourceId, setCatalogResourceId] = useState<string>();
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const loadCatalogs = useCallback(async (activeSession: Session) => {
    const response = await fetch("/api/admin/catalogs", { headers: { Authorization: `Bearer ${activeSession.access_token}` } });
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        await client?.auth.signOut();
        setSession(null);
      }
      throw new Error(payload.error ?? "Unable to load the publisher.");
    }
    setBrands(payload.brands);
    setCatalogs(payload.catalogs);
    setBrandId((current) => current || payload.brands[0]?.id || "");
  }, [client]);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) loadCatalogs(data.session).catch((error) => setStatusMessage(error.message));
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [client, loadCatalogs]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setStatusMessage("");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) setStatusMessage(error?.message ?? "Unable to sign in.");
    else {
      setSession(data.session);
      await loadCatalogs(data.session).catch((loadError) => setStatusMessage(loadError.message));
    }
    setBusy(false);
  }

  async function upload(file: File, bucket: "portal-documents" | "portal-media", activeSession: Session) {
    if (!client) throw new Error("Upload service is unavailable.");
    const preparation = await fetch("/api/admin/uploads", {
      method: "POST",
      headers: { Authorization: `Bearer ${activeSession.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, filename: file.name, byteSize: file.size }),
    });
    const prepared = await preparation.json();
    if (!preparation.ok) throw new Error(prepared.error ?? "Unable to prepare upload.");
    const { error } = await client.storage.from(bucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (error) throw error;
    return { sourceType: "storage_object", storageBucket: bucket, storagePath: prepared.path, originalFilename: file.name, mimeType: file.type, byteSize: file.size };
  }

  async function prepareSource(source: SourceDraft, bucket: "portal-documents" | "portal-media", activeSession: Session) {
    if (source.mode === "external_url") return { sourceType: "external_url", externalUrl: source.url };
    if (source.file) return upload(source.file, bucket, activeSession);
    return { sourceType: "storage_object", storageBucket: source.storageBucket, storagePath: source.storagePath, originalFilename: source.originalFilename, mimeType: source.mimeType, byteSize: source.byteSize };
  }

  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publicationStatus = submitter?.value === "published" ? "published" : "draft";
    setBusy(true);
    setStatusMessage(publicationStatus === "published" ? "Uploading and publishing…" : "Uploading and saving draft…");
    try {
      const [preparedCover, primaryResource, ...preparedAttachments] = await Promise.all([
        prepareSource(cover, "portal-media", session),
        prepareSource(catalogSource, "portal-documents", session),
        ...attachments.map((attachment) => prepareSource(attachment.source, "portal-documents", session)),
      ]);
      const payload = {
        brandId, title, slug, season, summary, imageAlt, status: publicationStatus,
        cover: preparedCover,
        catalogResource: { id: catalogResourceId, ...primaryResource },
        attachments: attachments.map((attachment, index) => ({ id: attachment.id, label: attachment.label, kind: attachment.kind, ...preparedAttachments[index] })),
      };
      const response = await fetch(editingId ? `/api/admin/catalogs/${editingId}` : "/api/admin/catalogs", {
        method: editingId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save catalog.");
      setStatusMessage(publicationStatus === "published" ? "Catalog published. The customer page is live now." : "Draft saved privately.");
      resetForm();
      await loadCatalogs(session);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save catalog.");
    } finally {
      setBusy(false);
    }
  }

  function editCatalog(catalog: CatalogSummary, showPreview = false) {
    const orderedResources = [...catalog.portal_catalog_resources].sort((left, right) => left.display_order - right.display_order);
    const primary = orderedResources.find((resource) => resource.kind === "catalog");
    setEditingId(catalog.id);
    setTitle(catalog.title);
    setSlug(catalog.slug);
    setSlugEdited(true);
    setBrandId(catalog.brand_id);
    setSeason(catalog.season);
    setSummary(catalog.summary);
    setImageAlt(catalog.image_alt);
    setCover({
      mode: catalog.cover_source_type ?? "external_url",
      url: catalog.cover_external_url ?? "",
      file: null,
      storageBucket: catalog.cover_storage_bucket ?? "",
      storagePath: catalog.cover_storage_path ?? "",
      originalFilename: catalog.cover_original_filename ?? "",
      mimeType: catalog.cover_mime_type ?? "",
      byteSize: catalog.cover_byte_size,
    });
    setCatalogSource(primary ? rowSource(primary) : emptySource());
    setCatalogResourceId(primary?.id);
    setAttachments(orderedResources.filter((resource) => resource.kind !== "catalog").map((resource) => ({
      key: resource.id,
      id: resource.id,
      label: resource.label,
      kind: resource.kind as ResourceKind,
      source: rowSource(resource),
    })));
    setPreviewOpen(showPreview);
    setStatusMessage(showPreview ? "Previewing the saved catalog. Nothing has been changed." : `Editing ${catalog.title}.`);
    document.getElementById("catalog-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    setEditingId(null);
    setTitle(""); setSlug(""); setSlugEdited(false); setSummary(""); setImageAlt("");
    setSeason("Current inline collection"); setCover(emptySource()); setCatalogSource(emptySource());
    setCatalogResourceId(undefined); setAttachments([]); setPreviewOpen(false);
  }

  async function runAction(catalog: CatalogSummary, action: "publish" | "unpublish" | "archive" | "move_up" | "move_down" | "duplicate" | "delete") {
    if (!session) return;
    const destructive = action === "delete" || action === "archive" || action === "unpublish";
    if (destructive && !window.confirm(action === "delete"
      ? `Permanently delete “${catalog.title}”? This cannot be undone.`
      : `${action === "archive" ? "Archive" : "Unpublish"} “${catalog.title}”? It will leave the customer site immediately.`)) return;
    setBusy(true);
    setStatusMessage(`${action.replace("_", " ")} in progress…`);
    try {
      const method = action === "duplicate" ? "POST" : action === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(`/api/admin/catalogs/${catalog.id}`, {
        method,
        headers: { Authorization: `Bearer ${session.access_token}`, ...(method === "DELETE" ? {} : { "Content-Type": "application/json" }) },
        body: method === "DELETE" ? undefined : JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update catalog.");
      setStatusMessage(action === "duplicate" ? "Draft copy created." : action === "delete" ? "Catalog permanently deleted." : `Catalog ${action.replace("_", " ")} complete.`);
      if (editingId === catalog.id && (action === "delete" || action === "archive")) resetForm();
      await loadCatalogs(session);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update catalog.");
    } finally {
      setBusy(false);
    }
  }

  function addAttachment() {
    setAttachments((current) => [...current, { key: crypto.randomUUID(), kind: "pricing", label: "", source: emptySource() }]);
  }

  function updateAttachment(key: string, update: Partial<AttachmentDraft> | ((current: AttachmentDraft) => AttachmentDraft)) {
    setAttachments((current) => current.map((attachment) => attachment.key === key
      ? typeof update === "function" ? update(attachment) : { ...attachment, ...update }
      : attachment));
  }

  if (!authReady) return <main className="publisherLoading">Opening publisher…</main>;

  if (!session) {
    return (
      <main className="publisherAuthShell">
        <section className="publisherAuthCard">
          <p className="publisherEyebrow">LesterSales.net</p><h1>Portal publisher</h1>
          <p>Private access for maintaining customer catalogs, prebooks, and art resources.</p>
          <form onSubmit={signIn}>
            <label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label>Password<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
            <button disabled={busy || !client} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <p aria-live="polite" className="publisherMessage">{statusMessage}</p><Link href="/">Return to customer portal</Link>
        </section>
      </main>
    );
  }

  const selectedBrand = brands.find((brand) => brand.id === brandId);
  return (
    <main className="publisherShell">
      <header className="publisherHeader">
        <div><p className="publisherEyebrow">LesterSales.net · Private</p><h1>Catalog builder</h1><p>Create and maintain customer-ready catalogs with every supporting sales file attached.</p></div>
        <div className="publisherHeaderActions"><Link href="/brands/champion" target="_blank">Open customer site</Link><button onClick={() => client?.auth.signOut()} type="button">Sign out</button></div>
      </header>
      <div className="publisherGrid">
        <form className="publisherForm" id="catalog-editor" onSubmit={saveCatalog}>
          {editingId ? <div className="publisherEditNotice"><span>Editing</span><strong>{title}</strong><button onClick={resetForm} type="button">Cancel edit</button></div> : null}
          {previewOpen ? <CatalogPreview brand={selectedBrand?.name ?? "Brand"} cover={cover} resources={["View catalog", ...attachments.map((attachment) => attachment.label || "Untitled resource")]} season={season} summary={summary} title={title || "Untitled catalog"} /> : null}
          <section className="publisherPanel">
            <div className="publisherPanelHeading"><span>01</span><div><h2>Catalog details</h2><p>Customer-facing name, season, and context.</p></div></div>
            <div className="publisherFields publisherFieldsTwo">
              <label>Brand<select onChange={(event) => setBrandId(event.target.value)} required value={brandId}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
              <label>Season<input onChange={(event) => setSeason(event.target.value)} required value={season} /></label>
              <label className="publisherFieldWide">Catalog title<input onChange={(event) => { const next = event.target.value; setTitle(next); if (!slugEdited) setSlug(slugify(next)); }} required value={title} /></label>
              <label>URL slug<input onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} /></label>
              <label>Cover description<input onChange={(event) => setImageAlt(event.target.value)} placeholder="Cover of…" value={imageAlt} /></label>
              <label className="publisherFieldWide">Summary<textarea onChange={(event) => setSummary(event.target.value)} required rows={4} value={summary} /></label>
            </div>
          </section>
          <SourcePanel accept="image/jpeg,image/png,image/webp,image/avif" index="02" label="Cover image" onChange={setCover} source={cover} />
          <SourcePanel accept="application/pdf" index="03" label="Catalog PDF" onChange={setCatalogSource} source={catalogSource} />
          <section className="publisherPanel">
            <div className="publisherPanelHeading publisherPanelHeadingAction"><span>04</span><div><h2>Pricing & supporting programs</h2><p>Keep price lists, programs, and workbooks visibly attached to this catalog.</p></div><button onClick={addAttachment} type="button">Add resource</button></div>
            {attachments.length ? <div className="publisherAttachments">{attachments.map((attachment, index) => <AttachmentEditor attachment={attachment} index={index} key={attachment.key} onChange={(update) => updateAttachment(attachment.key, update)} onRemove={() => setAttachments((current) => current.filter((item) => item.key !== attachment.key))} />)}</div> : <div className="publisherEmptyResources"><p>No supporting resources yet.</p><button onClick={addAttachment} type="button">Add pricing or a program</button></div>}
          </section>
          <div className="publisherSubmitBar">
            <p aria-live="polite">{statusMessage || "Drafts stay private. Publish makes the catalog visible to customers."}</p>
            <div><button onClick={() => setPreviewOpen((current) => !current)} type="button">{previewOpen ? "Hide preview" : "Preview"}</button><button disabled={busy} name="status" type="submit" value="draft">Save draft</button><button className="publisherPrimary" disabled={busy} name="status" type="submit" value="published">{editingId ? "Save & publish" : "Publish catalog"}</button></div>
          </div>
        </form>
        <aside className="publisherLibrary">
          <div><p className="publisherEyebrow">Current library</p><h2>{catalogs.length} catalog{catalogs.length === 1 ? "" : "s"}</h2></div>
          <div className="publisherCatalogRows">{catalogs.map((catalog) => <article key={catalog.id}><div className="publisherCatalogSummary"><div><strong>{catalog.title}</strong><span>{catalog.portal_brands?.name ?? "Brand"} · {catalog.season}</span></div><em data-status={catalog.status}>{catalog.status}</em></div><div className="publisherCatalogActions"><button disabled={busy} onClick={() => editCatalog(catalog)} type="button">Edit</button><button disabled={busy} onClick={() => editCatalog(catalog, true)} type="button">Preview</button><button disabled={busy} onClick={() => runAction(catalog, "duplicate")} type="button">Duplicate</button><button aria-label={`Move ${catalog.title} up`} disabled={busy} onClick={() => runAction(catalog, "move_up")} type="button">↑</button><button aria-label={`Move ${catalog.title} down`} disabled={busy} onClick={() => runAction(catalog, "move_down")} type="button">↓</button>{catalog.status === "published" ? <button disabled={busy} onClick={() => runAction(catalog, "unpublish")} type="button">Unpublish</button> : <button disabled={busy} onClick={() => runAction(catalog, "publish")} type="button">Publish</button>}<button disabled={busy} onClick={() => runAction(catalog, "archive")} type="button">Archive</button><button className="publisherDanger" disabled={busy} onClick={() => runAction(catalog, "delete")} type="button">Delete</button></div></article>)}</div>
        </aside>
      </div>
    </main>
  );
}

function SourcePanel({ accept, index, label, onChange, source }: { accept: string; index?: string; label: string; onChange: (source: SourceDraft) => void; source: SourceDraft }) {
  const warning = source.mode === "external_url" && isTemporarySignedUrl(source.url);
  const hasStoredFile = source.mode === "storage_object" && Boolean(source.storagePath) && !source.file;
  return <section className={index ? "publisherPanel" : "publisherAttachmentSource"}>{index ? <div className="publisherPanelHeading"><span>{index}</span><div><h2>{label}</h2><p>Use a stable company link when available; upload when Lester Sales needs to host the file.</p></div></div> : null}<div className="publisherSourceTabs" role="group" aria-label={`${label} source`}><button aria-pressed={source.mode === "external_url"} onClick={() => onChange({ ...source, mode: "external_url" })} type="button">Paste company link</button><button aria-pressed={source.mode === "storage_object"} onClick={() => onChange({ ...source, mode: "storage_object" })} type="button">Upload file</button></div>{source.mode === "external_url" ? <div className="publisherLinkField"><label className="publisherSourceField">HTTPS URL<input onChange={(event) => onChange({ ...source, url: event.target.value })} placeholder="https://company.example/catalog.pdf" required type="url" value={source.url} /></label>{source.url.startsWith("https://") ? <a href={source.url} rel="noreferrer" target="_blank">Test link</a> : null}{warning ? <p className="publisherSourceWarning">This URL appears temporary or signed. Replace it with the stable company URL before publishing.</p> : null}</div> : <label className="publisherDropField"><span>{source.file?.name ?? source.originalFilename ?? `Choose ${label.toLowerCase()}`}</span><small>{source.file ? `${(source.file.size / 1_048_576).toFixed(1)} MB` : hasStoredFile ? "Current private file. Choose another file to replace it." : "Uploads go directly to private LesterSales.net Storage."}</small><input accept={accept} onChange={(event) => onChange({ ...source, file: event.target.files?.[0] ?? null })} required={!hasStoredFile} type="file" /></label>}</section>;
}

function AttachmentEditor({ attachment, index, onChange, onRemove }: { attachment: AttachmentDraft; index: number; onChange: (update: Partial<AttachmentDraft> | ((current: AttachmentDraft) => AttachmentDraft)) => void; onRemove: () => void }) {
  return <article className="publisherAttachment"><div className="publisherAttachmentHeader"><strong>Resource {index + 1}</strong><button onClick={onRemove} type="button">Remove</button></div><div className="publisherFields publisherFieldsTwo"><label>Label<input onChange={(event) => onChange({ label: event.target.value })} placeholder="Standard pricing" required value={attachment.label} /></label><label>Resource type<select onChange={(event) => onChange({ kind: event.target.value as ResourceKind })} value={attachment.kind}><option value="pricing">Pricing</option><option value="program">Program</option><option value="workbook">Workbook</option></select></label></div><SourcePanel accept="application/pdf,.xlsx,.xls,.zip" label={attachment.label || `Resource ${index + 1}`} onChange={(source) => onChange((current) => ({ ...current, source }))} source={attachment.source} /></article>;
}

function CatalogPreview({ brand, cover, resources, season, summary, title }: { brand: string; cover: SourceDraft; resources: string[]; season: string; summary: string; title: string }) {
  const coverLabel = cover.file?.name || cover.originalFilename || (cover.url ? "Company-hosted cover" : "Cover preview");
  return <section className="publisherPreview" aria-label="Customer catalog preview"><div className="publisherPreviewCover" style={cover.mode === "external_url" && cover.url.startsWith("https://") ? { backgroundImage: `url(${cover.url})` } : undefined}><span>{coverLabel}</span></div><div><p className="publisherEyebrow">{brand} · {season || "Season"}</p><h2>{title}</h2><p>{summary || "Catalog summary will appear here."}</p><div>{resources.map((resource, index) => <span key={`${resource}-${index}`}>{resource}</span>)}</div></div></section>;
}

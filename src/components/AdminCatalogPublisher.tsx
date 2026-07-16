"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type BrandOption = { id: string; name: string; slug: string };
type CatalogSummary = { id: string; title: string; season: string; status: string; updated_at: string; portal_brands: { name: string } | null };
type SourceMode = "external_url" | "storage_object";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function AdminCatalogPublisher() {
  const client = useMemo(
    () => supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null,
    [],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!client);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [season, setSeason] = useState("Current inline collection");
  const [summary, setSummary] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [coverMode, setCoverMode] = useState<SourceMode>("external_url");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [catalogMode, setCatalogMode] = useState<SourceMode>("external_url");
  const [catalogUrl, setCatalogUrl] = useState("");
  const [catalogFile, setCatalogFile] = useState<File | null>(null);

  const loadCatalogs = useCallback(async (activeSession: Session) => {
    const response = await fetch("/api/admin/catalogs", { headers: { Authorization: `Bearer ${activeSession.access_token}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load the publisher.");
    setBrands(payload.brands);
    setCatalogs(payload.catalogs);
    setBrandId((current) => current || payload.brands[0]?.id || "");
  }, []);

  useEffect(() => {
    if (!client) {
      return;
    }
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

  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publicationStatus = submitter?.value === "published" ? "published" : "draft";
    setBusy(true);
    setStatusMessage(publicationStatus === "published" ? "Uploading and publishing…" : "Uploading and saving draft…");
    try {
      const cover = coverMode === "storage_object"
        ? await upload(coverFile as File, "portal-media", session)
        : { sourceType: "external_url", externalUrl: coverUrl };
      const catalogResource = catalogMode === "storage_object"
        ? await upload(catalogFile as File, "portal-documents", session)
        : { sourceType: "external_url", externalUrl: catalogUrl };
      const response = await fetch("/api/admin/catalogs", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, title, slug, season, summary, imageAlt, status: publicationStatus, cover, catalogResource }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save catalog.");
      setStatusMessage(publicationStatus === "published" ? "Catalog published. The customer page is live now." : "Draft saved.");
      setTitle(""); setSlug(""); setSlugEdited(false); setSummary(""); setImageAlt(""); setCoverUrl(""); setCoverFile(null); setCatalogUrl(""); setCatalogFile(null);
      await loadCatalogs(session);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save catalog.");
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return <main className="publisherLoading">Opening publisher…</main>;

  if (!session) {
    return (
      <main className="publisherAuthShell">
        <section className="publisherAuthCard">
          <p className="publisherEyebrow">LesterSales.net</p>
          <h1>Portal publisher</h1>
          <p>Private access for maintaining customer catalogs, prebooks, and art resources.</p>
          <form onSubmit={signIn}>
            <label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label>Password<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
            <button disabled={busy || !client} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <p aria-live="polite" className="publisherMessage">{statusMessage}</p>
          <Link href="/">Return to customer portal</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="publisherShell">
      <header className="publisherHeader">
        <div><p className="publisherEyebrow">LesterSales.net · Private</p><h1>Catalog builder</h1><p>Create a customer-ready catalog from a company link or managed upload.</p></div>
        <div className="publisherHeaderActions"><Link href="/brands/champion" target="_blank">Open customer site</Link><button onClick={() => client?.auth.signOut()} type="button">Sign out</button></div>
      </header>
      <div className="publisherGrid">
        <form className="publisherForm" onSubmit={saveCatalog}>
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
          <SourcePanel accept="image/jpeg,image/png,image/webp,image/avif" file={coverFile} index="02" label="Cover image" mode={coverMode} onFile={setCoverFile} onMode={setCoverMode} onUrl={setCoverUrl} url={coverUrl} />
          <SourcePanel accept="application/pdf" file={catalogFile} index="03" label="Catalog PDF" mode={catalogMode} onFile={setCatalogFile} onMode={setCatalogMode} onUrl={setCatalogUrl} url={catalogUrl} />
          <div className="publisherSubmitBar">
            <p aria-live="polite">{statusMessage || "Drafts stay private. Publish makes the catalog visible to customers."}</p>
            <div><button disabled={busy} name="status" type="submit" value="draft">Save draft</button><button className="publisherPrimary" disabled={busy} name="status" type="submit" value="published">Publish catalog</button></div>
          </div>
        </form>
        <aside className="publisherLibrary">
          <div><p className="publisherEyebrow">Current library</p><h2>{catalogs.length} catalog{catalogs.length === 1 ? "" : "s"}</h2></div>
          <div className="publisherCatalogRows">{catalogs.map((catalog) => <article key={catalog.id}><div><strong>{catalog.title}</strong><span>{catalog.portal_brands?.name ?? "Brand"} · {catalog.season}</span></div><em data-status={catalog.status}>{catalog.status}</em></article>)}</div>
        </aside>
      </div>
    </main>
  );
}

function SourcePanel({ accept, file, index, label, mode, onFile, onMode, onUrl, url }: { accept: string; file: File | null; index: string; label: string; mode: SourceMode; onFile: (file: File | null) => void; onMode: (mode: SourceMode) => void; onUrl: (value: string) => void; url: string }) {
  return <section className="publisherPanel"><div className="publisherPanelHeading"><span>{index}</span><div><h2>{label}</h2><p>Use a stable company link when available; upload when Lester Sales needs to host the file.</p></div></div><div className="publisherSourceTabs" role="group" aria-label={`${label} source`}><button aria-pressed={mode === "external_url"} onClick={() => onMode("external_url")} type="button">Paste company link</button><button aria-pressed={mode === "storage_object"} onClick={() => onMode("storage_object")} type="button">Upload file</button></div>{mode === "external_url" ? <label className="publisherSourceField">HTTPS URL<input onChange={(event) => onUrl(event.target.value)} placeholder="https://company.example/catalog.pdf" required type="url" value={url} /></label> : <label className="publisherDropField"><span>{file ? file.name : `Choose ${label.toLowerCase()}`}</span><small>{file ? `${(file.size / 1_048_576).toFixed(1)} MB` : "Uploads go directly to private LesterSales.net Storage."}</small><input accept={accept} onChange={(event) => onFile(event.target.files?.[0] ?? null)} required type="file" /></label>}</section>;
}

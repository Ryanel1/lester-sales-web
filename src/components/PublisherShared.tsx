"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isTemporarySignedUrl } from "@/lib/catalog-publisher";

export type BrandOption = { id: string; name: string; slug: string };
export type SourceMode = "external_url" | "storage_object";
export type SourceDraft = { mode: SourceMode; url: string; file: File | null; storageBucket: string; storagePath: string; originalFilename: string; mimeType: string; byteSize: number | null };
export type StoredResource = { id: string; label: string; kind: string; source_type: SourceMode; external_url: string | null; storage_bucket: string | null; storage_path: string | null; original_filename: string | null; mime_type: string | null; byte_size: number | null; display_order: number };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function emptySource(): SourceDraft { return { mode: "external_url", url: "", file: null, storageBucket: "", storagePath: "", originalFilename: "", mimeType: "", byteSize: null }; }
export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
export function rowSource(row: StoredResource): SourceDraft { return { mode: row.source_type, url: row.external_url ?? "", file: null, storageBucket: row.storage_bucket ?? "", storagePath: row.storage_path ?? "", originalFilename: row.original_filename ?? "", mimeType: row.mime_type ?? "", byteSize: row.byte_size }; }

export function usePublisherSession() {
  const client = useMemo(() => supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null, []);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!client);
  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, [client]);
  async function upload(file: File, bucket: "portal-documents" | "portal-media", activeSession: Session) {
    if (!client) throw new Error("Upload service is unavailable.");
    const response = await fetch("/api/admin/uploads", { method: "POST", headers: { Authorization: `Bearer ${activeSession.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ bucket, filename: file.name, byteSize: file.size }) });
    const prepared = await response.json();
    if (!response.ok) throw new Error(prepared.error ?? "Unable to prepare upload.");
    const { error } = await client.storage.from(bucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (error) throw error;
    return { sourceType: "storage_object", storageBucket: bucket, storagePath: prepared.path, originalFilename: file.name, mimeType: file.type, byteSize: file.size };
  }
  async function prepareSource(source: SourceDraft, bucket: "portal-documents" | "portal-media", activeSession: Session) {
    if (source.mode === "external_url") return { sourceType: "external_url", externalUrl: source.url };
    if (source.file) return upload(source.file, bucket, activeSession);
    return { sourceType: "storage_object", storageBucket: source.storageBucket, storagePath: source.storagePath, originalFilename: source.originalFilename, mimeType: source.mimeType, byteSize: source.byteSize };
  }
  return { client, session, authReady, prepareSource };
}

export function PublisherAuth({ busy, client, message, onError, onSignedIn }: { busy: boolean; client: SupabaseClient | null; message: string; onError: (message: string) => void; onSignedIn: (session: Session) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Unable to sign in.");
    await onSignedIn(data.session);
  }
  return <main className="publisherAuthShell"><section className="publisherAuthCard"><p className="publisherEyebrow">LesterSales.net</p><h1>Portal publisher</h1><p>Private access for maintaining customer catalogs, prebooks, and art resources.</p><form onSubmit={(event) => signIn(event).catch((error) => onError(error instanceof Error ? error.message : "Unable to sign in."))}><label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label>Password<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label><button disabled={busy || !client} type="submit">{busy ? "Signing in…" : "Sign in"}</button></form><p aria-live="polite" className="publisherMessage">{message}</p><Link href="/">Return to customer portal</Link></section></main>;
}

export function PublisherNav({ active }: { active: "catalogs" | "prebooks" | "art" | "health" }) {
  return <nav aria-label="Publisher tools" className="publisherToolNav"><Link aria-current={active === "catalogs" ? "page" : undefined} href="/admin">Catalogs</Link><Link aria-current={active === "prebooks" ? "page" : undefined} href="/admin/prebooks">Prebooks</Link><Link aria-current={active === "art" ? "page" : undefined} href="/admin/art-library">Art library</Link><Link aria-current={active === "health" ? "page" : undefined} href="/admin/link-health">Link health</Link></nav>;
}

export function PublisherHeader({ active, client, description, title }: { active: "catalogs" | "prebooks" | "art" | "health"; client: SupabaseClient | null; description: string; title: string }) {
  return <><header className="publisherHeader"><div><p className="publisherEyebrow">LesterSales.net · Private</p><h1>{title}</h1><p>{description}</p></div><div className="publisherHeaderActions"><Link href="/brands/champion" target="_blank">Open customer site</Link><button onClick={() => client?.auth.signOut()} type="button">Sign out</button></div></header><PublisherNav active={active} /></>;
}

export function PublisherSourcePanel({ accept, index, label, onChange, source }: { accept: string; index?: string; label: string; onChange: (source: SourceDraft) => void; source: SourceDraft }) {
  const warning = source.mode === "external_url" && isTemporarySignedUrl(source.url);
  const hasStoredFile = source.mode === "storage_object" && Boolean(source.storagePath) && !source.file;
  return <section className={index ? "publisherPanel" : "publisherAttachmentSource"}>{index ? <div className="publisherPanelHeading"><span>{index}</span><div><h2>{label}</h2><p>Use a stable company link when available; upload when Lester Sales needs to host the file.</p></div></div> : null}<div className="publisherSourceTabs" role="group" aria-label={`${label} source`}><button aria-pressed={source.mode === "external_url"} onClick={() => onChange({ ...source, mode: "external_url" })} type="button">Paste company link</button><button aria-pressed={source.mode === "storage_object"} onClick={() => onChange({ ...source, mode: "storage_object" })} type="button">Upload file</button></div>{source.mode === "external_url" ? <div className="publisherLinkField"><label className="publisherSourceField">HTTPS URL<input onChange={(event) => onChange({ ...source, url: event.target.value })} placeholder="https://company.example/resource.pdf" required type="url" value={source.url} /></label>{source.url.startsWith("https://") ? <a href={source.url} rel="noreferrer" target="_blank">Test link</a> : null}{warning ? <p className="publisherSourceWarning">This URL appears temporary or signed. Replace it with a stable company URL before publishing.</p> : null}</div> : <label className="publisherDropField"><span>{source.file?.name ?? source.originalFilename ?? `Choose ${label.toLowerCase()}`}</span><small>{source.file ? `${(source.file.size / 1_048_576).toFixed(1)} MB` : hasStoredFile ? "Current private file. Choose another file to replace it." : "Uploads go directly to private LesterSales.net Storage."}</small><input accept={accept} onChange={(event) => onChange({ ...source, file: event.target.files?.[0] ?? null })} required={!hasStoredFile} type="file" /></label>}</section>;
}

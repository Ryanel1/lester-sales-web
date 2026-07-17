"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { PublisherAuth, PublisherHeader, usePublisherSession } from "@/components/PublisherShared";

type Summary = { total: number; available: number; warning: number; unavailable: number; unchecked: number; lastCheckedAt: string | null };

export function AdminLinkHealth() {
  const { client, session, authReady } = usePublisherSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async (active: Session, check = false) => {
    const response = await fetch("/api/admin/link-health", { method: check ? "POST" : "GET", headers: { Authorization: `Bearer ${active.access_token}` } });
    const payload = await response.json();
    if (!response.ok) { if (response.status === 401) await client?.auth.signOut(); throw new Error(payload.error ?? "Unable to read link health."); }
    setSummary(payload);
  }, [client]);
  useEffect(() => { if (session) Promise.resolve().then(() => load(session)).catch((error) => setMessage(error.message)); }, [session, load]);
  async function runCheck() { if (!session) return; setBusy(true); setMessage("Checking every external company link…"); try { await load(session, true); setMessage("Link check complete."); } catch (error) { setMessage(error instanceof Error ? error.message : "Link check failed."); } finally { setBusy(false); } }
  if (!authReady) return <main className="publisherLoading">Opening publisher…</main>;
  if (!session) return <PublisherAuth busy={busy} client={client} message={message} onError={setMessage} onSignedIn={async (active) => load(active)} />;
  return <main className="publisherShell"><PublisherHeader active="health" client={client} description="Verify company-hosted resources before customers encounter a broken link." title="Link health" /><section className="publisherHealth"><div><h2>External resource check</h2><p>Managed Supabase files are already verified at upload. This check tests every company-hosted catalog, program, workbook, and art URL.</p></div><div className="publisherHealthCounts"><div><strong>{summary?.available ?? 0}</strong><span>Available</span></div><div><strong>{summary?.warning ?? 0}</strong><span>Host warnings</span></div><div><strong>{summary?.unavailable ?? 0}</strong><span>Unavailable</span></div><div><strong>{summary?.unchecked ?? 0}</strong><span>Unchecked</span></div></div><p className="publisherHealthMeta">{summary?.lastCheckedAt ? `Last checked ${new Date(summary.lastCheckedAt).toLocaleString()}` : "No complete check has run yet."}</p><button className="publisherPrimary publisherHealthButton" disabled={busy} onClick={runCheck} type="button">{busy ? "Checking links…" : `Check all ${summary?.total ?? 0} external links`}</button><p aria-live="polite" className="publisherMessage">{message}</p></section></main>;
}

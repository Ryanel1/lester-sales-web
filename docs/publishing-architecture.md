# Publishing architecture

## Boundary

LesterSales.net is a standalone application with two surfaces:

- a private LesterSales.net publisher for managing content;
- a password-protected LesterSales.net customer portal that reads only published content.

The application owns a dedicated GitHub repository, Vercel project, Supabase project, database schema, Storage buckets, credentials, and deployment lifecycle. None of these resources are shared with another product. The portal has no external product-level runtime or publishing dependency.

The private publisher may live under an authenticated `/admin` route in this Next.js application or a separate deployment from the same LesterSales.net repository. In either case, it connects only to the dedicated LesterSales.net Supabase project.

## Implemented tables

- `portal_brands`
- `portal_catalogs`
- `portal_catalog_resources`
- `portal_prebooks`
- `portal_prebook_resources`
- `portal_art_groups`
- `portal_art_resources`

Catalogs and prebooks share common publishing fields: `status`, `published_at`, `archived_at`, `display_order`, `season`, `brand_id`, and timestamps. Supporting documents remain child records so a catalog can own several pricing or program files without flattening them into unrelated uploads.

Every resource child supports two source types: a stable external company URL or a managed private Supabase Storage object. See `docs/publisher-resource-sources.md` for the shared builder controls, validation, and database fields.

## Status model

- `draft`: visible only in the private LesterSales.net publisher
- `scheduled`: publishes at a future time
- `published`: visible to the customer portal
- `archived`: retained internally and removed from the current portal

Prebooks additionally derive `open`, `closing-soon`, and `closed` from the booking deadline. Permanent delete remains available behind a destructive confirmation, but archive is the normal end-of-season action.

## Storage

Use private Supabase Storage buckets for covers and resource files that Lester Sales must host. Customer routes issue short-lived signed URLs after portal access has been verified. The service-role key never reaches the browser.

Reliable company-hosted resources do not need to be duplicated. Supabase stores their external URLs as record data and the customer portal opens those URLs directly. Vercel hosts the application build and environment configuration; it is not used as persistent document storage.

Files or links already present in another product are not read across project boundaries. Reuse requires either the original stable company URL or an explicit one-time copy into LesterSales.net Storage. No foreign table, bucket, service-role key, or API becomes a LesterSales.net dependency.

## Current portal access

The Supabase-backed portal uses a shared customer password on the server and a signed, HTTP-only 12-hour session cookie. Pages and downloadable resource files are checked before delivery. Managed catalog covers and prebook hero images are delivered through protected, short-lived Supabase URLs.

Production requires both `PORTAL_PASSWORD` and `PORTAL_SESSION_SECRET` and fails closed when either is missing. Rotate the session secret whenever all active customer sessions should be invalidated.

This is intentionally a low-friction shared-password gate for deterring casual and competitor browsing. It is not customer identity, authorization, or a promise that externally hosted company links remain private after opening. Customer accounts, password recovery, per-user permissions, and access auditing are out of scope unless business requirements change.

## Completed migration sequence

1. Inventoried published Squarespace pages and built the 55-reference allowlist.
2. Migrated the four current brands, seven catalogs, three art groups, and two archived prebooks.
3. Retained stable company URLs and moved only Squarespace-hosted files to private Storage.
4. Verified all 27 external company URLs with the automated checker.
5. Removed customer-resource fixtures and duplicated local catalog PDFs.
6. Deployed the standalone Vercel production site for device review.
7. Cut over `lestersales.net` and `www.lestersales.net` to the standalone Vercel project while preserving Google Workspace, order-email, Domain Connect, and SalesLens DNS records.

See `docs/live-content-inventory.md` for the verified published-page scope and file-selection rules.

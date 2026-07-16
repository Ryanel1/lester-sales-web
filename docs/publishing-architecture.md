# Publishing architecture

## Boundary

LesterSales.net is a standalone application with two surfaces:

- a private LesterSales.net publisher for managing content;
- a password-protected LesterSales.net customer portal that reads only published content.

The application owns a dedicated GitHub repository, Vercel project, Supabase project, database schema, Storage buckets, credentials, and deployment lifecycle. None of these resources are shared with another product. The portal has no external product-level runtime or publishing dependency.

The private publisher may live under an authenticated `/admin` route in this Next.js application or a separate deployment from the same LesterSales.net repository. In either case, it connects only to the dedicated LesterSales.net Supabase project.

## Proposed tables

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

Use private Supabase Storage buckets for covers and sales files that Lester Sales must host. Customer routes issue short-lived signed URLs after portal access has been verified. The service-role key never reaches the browser.

Reliable company-hosted resources do not need to be duplicated. Supabase stores their external URLs as record data and the customer portal opens those URLs directly. Vercel hosts the application build and environment configuration; it is not used as persistent document storage.

Files or links already present in another product are not read across project boundaries. Reuse requires either the original stable company URL or an explicit one-time copy into LesterSales.net Storage. No foreign table, bucket, service-role key, or API becomes a LesterSales.net dependency.

## Current portal access

The fixture-backed portal now uses a shared customer password on the server and a signed, HTTP-only 12-hour session cookie. Pages and downloadable sales files are checked before delivery. Catalog cover images remain public so Next.js can optimize them; move those assets behind signed Supabase URLs when the storage migration is implemented.

Production requires both `PORTAL_PASSWORD` and `PORTAL_SESSION_SECRET` and fails closed when either is missing. Rotate the session secret whenever all active customer sessions should be invalidated.

This is intentionally a low-friction shared-password gate for deterring casual and competitor browsing. It is not customer identity, authorization, or a promise that externally hosted company links remain private after opening. Customer accounts, password recovery, per-user permissions, and access auditing are out of scope unless business requirements change.

## Migration sequence

1. Inventory published Squarespace pages and build an allowlist of the sales files they currently reference; do not bulk-copy unused asset-library uploads.
2. Enter the current Champion and Gear materials through the new publisher.
3. Confirm the Supabase-backed portal matches the local fixture pages.
4. Migrate Under Armour, Pro Sports, and remaining art/prebook resources.
5. Verify the shared-password experience on customer devices.
6. Deploy to a temporary Vercel URL for customer-device review.
7. Connect the Squarespace-managed domain only after route, email-DNS, and file checks pass.

See `docs/live-content-inventory.md` for the verified published-page scope and file-selection rules.

# LesterSales.net launch plan

Last verified: July 16, 2026.

## Definition of done

LesterSales.net is ready to launch when a Lester Sales administrator can create, preview, publish, update, archive, and remove customer resources in the private publisher; customers can use the shared password to view only current published resources; managed files are delivered securely from the dedicated LesterSales.net Supabase project; and `lestersales.net` serves the Vercel deployment without disrupting company email.

LesterSales.net is a standalone product. Its GitHub repository, Vercel project, Supabase project, database, Storage, credentials, publishing interface, and deployment lifecycle are not shared with another product.

## Verified current state

### Complete

- [x] Responsive customer landing page and four brand pages.
- [x] Horizontal brand navigation and LesterSales.net-owned visual system.
- [x] Catalog, prebook, art-library, empty, and unavailable UI states.
- [x] Shared customer-password flow with a signed 12-hour HTTP-only session.
- [x] Resort removed from the new site's content model.
- [x] Local Champion and Gear catalog examples with covers and working PDFs.
- [x] Account Application link and PDF in the footer.
- [x] GitHub remote points to `Ryanel1/lester-sales-web`.
- [x] A standalone Vercel project named `lester-sales-web` exists.
- [x] Lint, TypeScript, and production builds pass.

### Not yet complete

- [x] The initial codebase is committed and pushed to GitHub.
- [x] The Vercel project has a verified production deployment at `https://lester-sales-web.vercel.app`; the custom domain is not connected yet.
- [x] A dedicated LesterSales.net Supabase project exists and is linked to this repository.
- [ ] The transition to live data is complete. Brand pages now query Supabase and Champion is live there, but fixtures remain as temporary fallback/navigation data.
- [x] A private `/admin` Catalog Builder exists with separate administrator authentication.
- [ ] The 55 live Squarespace sales-resource references have been migrated.
- [ ] Automated coverage is complete. Initial unit tests now cover portal sessions, safe redirects, publication timing, and prebook closure; API and end-to-end coverage remain.

## Remaining work, in order

### 1. Establish the standalone project baseline

- [x] Review the untracked files and create the initial Git commit.
- [x] Push the initial branch to `Ryanel1/lester-sales-web`.
- [x] Link this working directory to the existing Vercel `lester-sales-web` project.
- [x] Create a new Supabase project specifically for LesterSales.net.
- [x] Link this repository's Supabase CLI configuration only to that project.
- [x] Add separate local, Vercel Preview, and Vercel Production environment variables.
- [x] Confirm that no credential, project reference, database URL, bucket, or runtime dependency points to another product.

Completion condition: GitHub contains the code, Vercel recognizes this repository, and the LesterSales.net Supabase project can be reached with its own development credentials.

### 2. Build the Supabase foundation

- [x] Add versioned SQL migrations under `supabase/migrations/`.
- [x] Create `portal_brands`.
- [x] Create `portal_catalogs` and `portal_catalog_resources`.
- [x] Create `portal_prebooks` and `portal_prebook_resources`.
- [x] Create `portal_art_groups` and `portal_art_resources`.
- [x] Add enums or constraints for publication status, resource kind, source type, and link status.
- [x] Add foreign keys, unique constraints, display-order indexes, timestamps, and source-integrity checks.
- [x] Add publish scheduling and archive fields.
- [x] Enforce that a resource uses exactly one source: an HTTPS company URL or a managed Storage object.
- [x] Enable Row Level Security on every portal table.
- [x] Permit public/anonymous database access to nothing.
- [x] Permit authenticated publisher access only through protected server routes.
- [x] Create private LesterSales.net Storage buckets for documents and cover/hero media.
- [x] Add Storage policies that prevent anonymous listing or direct permanent downloads.
- [x] Seed the four brands in their desired display order.

Completion condition: migrations can build an empty LesterSales.net database from scratch, all policy tests pass, and no portal data is exposed directly through the anonymous Supabase key.

### 3. Build the private LesterSales.net publisher

- [x] Create a protected `/admin` area in this repository.
- [x] Use Supabase Auth for administrator sign-in and restrict publishing to an explicit Lester Sales administrator allowlist.
- [x] Keep customer shared-password access separate from administrator authentication.
- [x] Build the Catalog Builder first as the vertical slice.
- [x] Support catalog title, brand, season, summary, cover, catalog file/link, attached pricing/program/workbook resources, display order, and status.
- [x] For every Catalog Builder resource, support `Paste company link` and direct-to-private-Storage `Upload file`.
- [ ] Extend the working `Test link` action and temporary-signed-URL warnings with server-side last-checked status and private source notes.
- [x] Add edit, inline preview, publish, unpublish, archive, duplicate, reorder, and permanent delete controls to the Catalog Builder.
- [ ] Add future publish scheduling to the Catalog Builder.
- [ ] Build the Prebook Builder with deadline, ship date, minimums, details, catalog, price list, workbook, and additional resources.
- [ ] Automatically hide closed prebooks and prevent past-deadline programs from publishing as open.
- [ ] Build the Art Library Manager with brand groups and ordered resources.
- [ ] Add clear validation, upload progress, errors, destructive confirmations, and mobile-friendly controls.

Completion condition: an administrator can publish one new catalog from `/admin`, using either a stable company URL or an uploaded file, and manage its full lifecycle without editing code.

### 4. Connect the customer portal to published data

- [x] Add server-only Supabase clients and typed portal queries.
- [ ] Replace `src/data/portal.ts` fixtures with a repository/data-access layer backed by the dedicated LesterSales.net Supabase project.
- [x] Return one stable customer-facing data shape for external URLs and managed files.
- [x] Show only published or currently scheduled-live records.
- [x] Exclude drafts, archived entries, future content, and closed prebooks.
- [x] Add protected download routes that verify the customer session and create short-lived Supabase signed URLs.
- [x] Resolve private cover and hero images without exposing permanent Storage URLs.
- [x] Keep brand pages dynamic so publishing changes appear on the next customer request.
- [x] Fail safely with fixture-backed brand structure and useful unavailable states when Supabase or a source file is temporarily unavailable.
- [x] Add a visible customer sign-out action.

Completion condition: publishing or archiving a catalog changes the password-protected customer site without a code change or redeployment. Verified for the Champion catalog and the temporary lifecycle test catalog.

### 5. Migrate current customer content

- [ ] Export and record the exact URLs for all 55 in-scope live Squarespace resource references.
- [ ] Preserve brand, catalog, prebook, and art-group relationships during import.
- [ ] Prefer reliable company-hosted URLs for large PDFs.
- [ ] Upload only files that do not have a durable company URL.
- [ ] Resolve and verify the twelve expired CloudFront art links individually.
- [ ] Import Champion's 27 references.
- [ ] Import Gear & ComfortWash's 20 references.
- [ ] Import Under Armour's four references and create the required catalog covers.
- [ ] Import Pro Sports' four references and create the required catalog covers.
- [ ] Capture the two expired Champion prebooks as archived records, not open programs.
- [ ] Confirm that older art packs are still current before publishing them.
- [ ] Keep Resort entirely excluded.
- [ ] Move the Account Application to managed Storage or deliberately retain it as an application asset.
- [ ] Record source URL, original filename, byte size, MIME type, and SHA-256 for managed files.
- [ ] Remove duplicated local catalog PDFs only after the Supabase/company-link versions are verified in production.

Completion condition: every current, approved Squarespace resource has a verified destination in the new portal, and expired or obsolete material is not shown as current.

### 6. Add security, reliability, and test coverage

- [ ] Rate-limit shared-password attempts.
- [x] Add baseline security headers in `next.config.ts` or the Vercel configuration.
- [ ] Keep service-role credentials server-only and add a secret-exposure check.
- [ ] Add structured production logging for failed authentication, publishing, uploads, and signed downloads without logging sensitive values.
- [ ] Add an automated external-link checker and publisher warnings for broken resources.
- [ ] Add unit tests for publication filters, deadlines, URL validation, and source constraints.
- [ ] Add API tests for administrator authorization, uploads, publishing, and signed downloads.
- [ ] Add end-to-end tests for customer login, sign-out, navigation, downloads, and administrator publishing.
- [ ] Test expired customer sessions and expired signed URLs.
- [ ] Test keyboard navigation, focus visibility, screen-reader labels, color contrast, and reduced motion.
- [ ] Test current Safari, Chrome, Edge, iPhone, iPad, Android, and common laptop widths.
- [ ] Add database backup and recovery notes for portal records and managed files.

Completion condition: critical customer and publishing flows have automated coverage, known failures are observable, and security checks pass in Preview and Production.

### 7. Deploy, review, and cut over the domain

- [x] Configure Vercel Preview and Production variables for portal auth, Supabase, and the administrator allowlist. Link-check-specific secrets are not yet needed.
- [ ] Deploy a Vercel Preview build and test it on customer devices.
- [ ] Seed Preview with representative data and complete an administrator publish-to-customer smoke test.
- [x] Create and smoke-test the first production deployment without connecting the domain.
- [ ] Back up the current Squarespace site and export its live-resource manifest.
- [ ] Define redirects for useful old brand URLs such as `/champion`, `/glb`, `/underarmour`, and `/pro`.
- [ ] Remove Resort from the old live navigation during cutover.
- [ ] Inventory current DNS records and preserve all email-related MX, SPF, DKIM, and DMARC records.
- [ ] Point only the required web records for `lestersales.net` and `www.lestersales.net` to Vercel.
- [ ] Verify SSL, redirects, password access, every brand page, every file, the Account Application, mobile layouts, and email delivery.
- [ ] Monitor errors and broken links closely after launch.

Completion condition: both apex and `www` serve the Vercel production deployment, company email remains functional, old useful URLs redirect correctly, and every approved resource passes a final live check.

## Immediate next milestone

Complete phases 1 through 4 for one Champion catalog. That proves the complete standalone path:

`LesterSales.net admin → LesterSales.net Supabase → publish → password-protected customer page → protected resource delivery`

Once that vertical slice works, the Prebook Builder, Art Library Manager, and remaining content migration become repeatable work instead of separate architecture problems.

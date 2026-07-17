# LesterSales.net

Local Next.js build of the Lester Sales customer resource portal.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Portal protection is bypassed in local development when no auth variables are set. To exercise the customer access flow, copy `.env.example` to `.env.local`, set both values, and restart the dev server. Production fails closed unless both `PORTAL_PASSWORD` and `PORTAL_SESSION_SECRET` are present.

## Current milestone

- Customer landing page with brand-first navigation
- LesterSales.net horizontal navigation with its own light, compact visual language
- Reusable brand pages with Inline Catalogs, Open Prebooks, and Art Library
- Seven published catalogs across the four in-scope brands, with private cover delivery
- All 55 verified live sales-resource references migrated to Supabase records
- Explicit unpublished-file and empty-section states
- Responsive desktop and mobile layouts
- Supabase-backed customer data with brand-only navigation fallback metadata
- Password-protected pages and downloadable sales files with a signed 12-hour session
- Dedicated customer access screen and safe return-to-resource redirects
- Dedicated LesterSales.net Supabase project with seven portal tables and private Storage
- Private Catalog, Prebook, Art Library, and Link Health tools with separate Supabase administrator authentication
- Catalog pricing/program/workbook attachments with company-link or private-upload sources
- Catalog edit, preview, publish, unpublish, archive, duplicate, reorder, and delete controls
- Protected short-lived delivery for managed PDFs and cover images
- Automated external-link checking; all 27 company-hosted URLs passed the latest migration check

LesterSales.net has its own GitHub repository, Vercel project, and dedicated Supabase project. Local, Vercel Preview, and Vercel Production environments are configured with LesterSales.net-owned credentials. No outside product's code, database, storage, authentication, repository, or deployment resource is used by this application. The first standalone production deployment is live at `https://lester-sales-web.vercel.app`; custom-domain cutover is still pending.

## Content migration path

Brand pages read published content from the dedicated LesterSales.net Supabase project. Typed local data now contains only resilient navigation metadata; no customer sales-resource fixture remains.

The private publisher owned by LesterSales.net now includes:

1. Catalog Manager for cover image, catalog, pricing, programs, workbooks, status, order, and season.
2. Prebook Builder for hero image, deadlines, ship dates, minimums, details, required order files, and automatic deadline closure.
3. Art Library Manager for grouped, ordered brand-specific resources.
4. Link Health for checking every external company-hosted URL and recording availability.
5. Draft, publish, unpublish, duplicate, archive, reorder, and delete controls with pasted-link or private-upload sources.

See `docs/publishing-architecture.md` for the intended Supabase boundary.
See `docs/publisher-resource-sources.md` for the catalog/prebook link and upload contract.
See `docs/live-content-inventory.md` for the published Squarespace resources eligible for migration.
See `docs/launch-plan.md` for the verified, ordered checklist from the current local build through production cutover.

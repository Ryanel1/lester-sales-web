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
- Authentic local Champion and Gear catalog covers and PDFs
- Working catalog links
- Explicit unpublished-file and empty-section states
- Responsive desktop and mobile layouts
- Typed fixture data in `src/data/portal.ts`
- Password-protected pages and downloadable sales files with a signed 12-hour session
- Dedicated customer access screen and safe return-to-resource redirects

LesterSales.net has its own GitHub repository and Vercel project. The local repository is not yet connected to a dedicated LesterSales.net Supabase project, and the portal tables, private Storage bucket, and production environment variables still need to be configured. No outside product's code, database, storage, authentication, repository, or deployment resource is used by this application.

## Content migration path

The UI currently reads typed local data. The component props deliberately match the future publishing model so the storage layer can be replaced without rebuilding the pages.

The next product phase is a private publisher owned by LesterSales.net:

1. Catalog Manager for cover image, catalog, pricing, supporting programs, status, order, and season. Each resource accepts either a pasted company link or an uploaded file.
2. Prebook Builder for hero image, deadlines, ship dates, minimums, details, catalog, price list, and workbook. Catalog, price list, and workbook each accept either a pasted link or an upload.
3. Art Library Manager for grouped brand-specific art resources with the same pasted-link/upload control.
4. Preview, publish, unpublish, duplicate, archive, reorder, and delete controls.

See `docs/publishing-architecture.md` for the intended Supabase boundary.
See `docs/publisher-resource-sources.md` for the catalog/prebook link and upload contract.
See `docs/live-content-inventory.md` for the published Squarespace resources eligible for migration.
See `docs/launch-plan.md` for the verified, ordered checklist from the current local build through production cutover.

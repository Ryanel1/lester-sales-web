# Live content inventory

Verified against the published LesterSales.net brand pages on July 16, 2026.

## Migration boundary

The published website is the migration allowlist. A file is eligible for migration only when a currently published customer-facing page links to it as a catalog, price list, program, workbook, or art resource.

- Do not bulk-copy the Squarespace asset library.
- Do not migrate unattached uploads, draft-page files, deleted-page files, or superseded versions that are not linked from a published page.
- Keep the relationship visible on the live page: supporting pricing and program files stay attached to their catalog; prebook files stay attached to their program.
- Download an eligible file once even if more than one published block references it.
- Validate the downloaded file before import and record its original URL, filename, byte size, and checksum.
- A live reference with a passed deadline is eligible for archival capture but must not publish as an open prebook in the new customer portal.
- Missing or broken live references go to an exception list; do not substitute an asset-library file based only on a similar filename.

Navigation, the account application, and contact links are outside the sales-resource migration.

## Published resource manifest

The four in-scope published brand pages currently contain 55 downloadable sales-resource references.

### Champion (`/champion`) — 27 references

Inline catalog:

- Champion Collegiate Apparel 2026
- Curated Programs
- Bookstore Programs
- Base Pricing
- Highschool Pricing

Art library:

- Front Chest Embroidery
- Tackle Twill
- Tackle Twill W/ Mascot
- Front Chest Screenprint
- Reverse Weave
- Oversized Graphics
- Mom/Dad/Alumni
- More Mom Art
- More Dad Art
- More Alumni Art
- Baseball 2025
- More Baseball
- Left Chest Embroideries
- 90s Catalog Flips
- More Football
- Football 2025

Prebook references retained for archival capture:

- SkyBox Spring 2027: Catalog, Price List, Workbook — booking deadline May 18, 2026
- SkyBox Collection Fall 2026: Catalog, Price List, Workbook — booking deadline October 17, 2025

Both published prebook deadlines have passed as of the verification date. Their files may be captured because the blocks are still live, but neither program should appear in the new portal’s Open Prebooks section.

### Gear & ComfortWash (`/glb`) — 20 references

Gear inline catalog:

- Collegiate Catalog 2026
- Savings Program
- Standard Pricing
- Highschool Pricing

Gear art library:

- Floral Embroidery
- 3-Stripe 3D Front Chest
- Tapestry Embroidery
- Boucle
- Metallic Applique Twill
- Alumni Art Pack
- Teddy Bear Pack
- Dad Art Pack
- Mom Art Pack
- Hot Color Pop

ComfortWash inline catalog:

- Collegiate Catalog 2026
- Standard Pricing
- Highschool Pricing

ComfortWash art library:

- Color Pop
- Wool Applique
- Pastel Pop

### Under Armour (`/underarmour`) — 4 references

- Collegiate Essentials 2026: catalog and standard/highschool pricing
- Headwear and Accessories 2026: catalog and standard/highschool pricing

### Pro Sports (`/pro`) — 4 references

- Under Armour MiLB 2026: catalog and pricing
- Champion MiLB 2026: catalog and pricing

## Link exceptions discovered during inventory

Twelve currently published art links use expired signed CloudFront URLs: one Champion link, eight Gear links, and three ComfortWash links. The live page references are therefore part of the migration manifest, but the signed URLs themselves cannot be retained.

The corresponding canonical Azure Blob path pattern responded successfully in a representative check. Every affected file still needs an individual availability and content check before download. If a canonical source fails, request the current file from the publisher rather than selecting an unreferenced Squarespace asset.

## Migration result

Completed July 16, 2026:

1. Captured the exact published link URL for all 55 references.
2. Replaced twelve expired signed CloudFront URLs with individually checked canonical company URLs.
3. Retained 27 verified company-hosted URLs without duplicating their files.
4. Copied 28 Squarespace-hosted resources into private LesterSales.net Storage with original filename, MIME type, byte size, source URL, and SHA-256.
5. Published seven current catalogs and three art groups across the four brands.
6. Stored both passed Champion prebooks as archived records; neither appears in Open Prebooks.
7. Generated and privately stored current catalog-cover images for every migrated catalog.
8. Removed the 74 MB of duplicated local catalog PDFs after customer delivery was verified against the migrated records.

The reproducible allowlist and import procedure live in `scripts/migrate-live-content.mjs`. `npm run check:links` rechecks all external URLs and updates their database status.

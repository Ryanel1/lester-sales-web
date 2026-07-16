# LesterSales.net

## Register

product

## Purpose

LesterSales.net is a password-protected customer resource portal for current inline catalogs, time-sensitive prebook programs, pricing sheets, workbooks, and brand-specific art libraries. It is not an online store, a corporate brochure, or a document-management dashboard.

The shared password is a lightweight deterrent against casual and competitor browsing. Customers may share it; the portal does not need customer accounts, individual permissions, or high-security access controls.

Customers normally arrive with a brand or selling opportunity already in mind. The portal helps them find the correct current material quickly during or after a sales conversation.

## Information architecture

- The global navigation is organized by brand.
- Every brand page repeats three sections in the same order: Inline Catalogs, Open Prebooks, Art Library.
- A catalog is the primary object; its pricing sheets and programs stay visibly attached to it.
- A prebook adds minimums, booking deadline, ship date, restrictions, catalog, price list, and workbook.
- Every catalog, pricing, program, workbook, and art resource may use either a pasted company link or a managed upload.
- Expired or unpublished entries do not appear in the customer portal.

## Product boundary

LesterSales.net is a standalone product. Its customer portal, private publishing interface, GitHub repository, Vercel project, Supabase project, database tables, Storage buckets, and environment variables are owned and deployed independently.

The initial local site reads typed fixture data. The private LesterSales.net publisher will replace those fixtures with content from the dedicated LesterSales.net Supabase project. The customer-facing layout must not depend on where an individual resource is stored.

The portal owns its interface system outright within this repository. It does not import another product's code, packages, design tokens, components, data, storage, authentication, or deployment infrastructure.

## Principles

1. Brand first.
2. Current materials before historical materials.
3. Catalog art carries the visual personality.
4. Supporting documents remain attached to their catalog or program.
5. Familiar page structure beats feature density.
6. Empty, closed, and unavailable states are explicit.
7. Reliable company-hosted files remain links instead of being duplicated solely for hosting.

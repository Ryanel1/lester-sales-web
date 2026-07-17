# LesterSales.net

## Register

product

## Purpose

LesterSales.net is a password-protected customer resource portal for current inline catalogs, time-sensitive prebook programs, pricing sheets, workbooks, and brand-specific art libraries. It is not an online store, a corporate brochure, or a document-management dashboard.

The shared password is a lightweight deterrent against casual and competitor browsing. Customers may share it; the portal does not need customer accounts, individual permissions, or high-security access controls.

Customers normally arrive with a brand, program, or project already in mind. The portal helps buyers find the correct current materials quickly, work more confidently, and make each step of the process easier.

## Customer promise

Lester Sales values buyers as long-term partners and genuinely wants them to be more successful in their work. The site speaks directly to customers with warmth and respect, prioritizes their time, and makes complicated ordering processes easier. Copy must never frame a customer as a path to a sale or describe resources primarily as tools for closing business. Prefer language such as “support you,” “support your work,” and “help you find what you need.”

## Information architecture

- The global navigation is organized by brand.
- Every brand page repeats three sections in the same order: Inline Catalogs, Art Library, Open Prebooks.
- A catalog is the primary object; its catalog/program files and pricing sheets stay visibly attached in two adjacent columns.
- A prebook adds minimums, booking deadline, ship date, restrictions, catalog, price list, and workbook.
- Every catalog, pricing, program, workbook, and art resource may use either a pasted company link or a managed upload.
- Expired or unpublished entries do not appear in the customer portal.

## Product boundary

LesterSales.net is a standalone product. Its customer portal, private publishing interface, GitHub repository, Vercel project, Supabase project, database tables, Storage buckets, and environment variables are owned and deployed independently.

The initial local site reads typed fixture data. The private LesterSales.net publisher will replace those fixtures with content from the dedicated LesterSales.net Supabase project. The customer-facing layout must not depend on where an individual resource is stored.

The portal owns its interface system outright within this repository. It does not import another product's code, packages, design tokens, components, data, storage, authentication, or deployment infrastructure.

## Principles

1. Customer success before transaction.
2. Brand first.
3. Current materials before historical materials.
4. Catalog art carries the visual personality.
5. Supporting documents remain attached to their catalog or program.
6. Familiar page structure beats feature density.
7. Empty, closed, and unavailable states are explicit and helpful.
8. Reliable company-hosted files remain links instead of being duplicated solely for hosting.

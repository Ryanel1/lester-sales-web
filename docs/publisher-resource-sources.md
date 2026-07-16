# Publisher resource sources

## Decision

Catalogs, price lists, programs, workbooks, art files, cover images, and prebook hero images may come from either of two sources:

1. **Paste company link** — retain a reliable HTTPS URL supplied by the brand or company. Supabase stores the URL; the file remains hosted by its owner.
2. **Upload file** — upload a file that does not have a stable source URL to private Supabase Storage. Supabase stores the metadata and object path.

Vercel hosts the LesterSales.net application and its server configuration. It is not the document repository and the publisher must never write uploaded files to the Vercel filesystem.

## Builder interaction

Every resource row in the Catalog Manager, Prebook Builder, and Art Library Manager has a required `Source` choice. `Paste company link` appears first because reliable company-hosted PDFs are preferred over duplicating large files.

### Paste company link

The builder displays:

- Resource label
- Resource kind: catalog, pricing, program, workbook, or art
- HTTPS URL
- `Test link` action
- Last checked status and time
- Optional internal source note

Saving a pasted link does not download or copy the remote file. `Test link` opens the exact URL in a new tab and performs a server-side availability check when the host permits it. A check failure is a warning while editing and blocks publishing unless the publisher explicitly resolves the link.

URLs containing temporary signing parameters such as `Expires`, `Signature`, or short-lived tokens receive an expiration warning. Prefer the canonical company URL when one exists. The expired CloudFront links found on the current Squarespace site are examples that must not be copied as-is.

### Upload file

The builder displays:

- Resource label
- Resource kind
- File picker or drop zone
- Original filename, type, and size after upload
- `Replace file` and `Remove file` actions

The application uploads directly to a private Supabase Storage bucket using authorized server-generated upload credentials. Publishing is unavailable until the upload completes and its record is saved.

### Catalog and prebook fields

Catalog Manager:

- Cover image: paste image link or upload image
- Catalog PDF: paste company link or upload PDF
- Any number of attached pricing or program resources, each with its own source choice

Prebook Builder:

- Hero image: paste image link or upload image
- Catalog: paste company link or upload PDF
- Price list: paste company link or upload PDF
- Workbook: paste company link or upload PDF
- Additional resources when needed, each with its own source choice

The resource controls are identical across the builders so the publisher does not have to learn separate file workflows.

## Supabase resource fields

Each row in `portal_catalog_resources`, `portal_prebook_resources`, and `portal_art_resources` uses the same source fields:

| Field | Purpose |
| --- | --- |
| `source_type` | Required enum: `external_url` or `storage_object` |
| `external_url` | HTTPS company URL when `source_type = external_url` |
| `storage_bucket` | Private Supabase bucket when `source_type = storage_object` |
| `storage_path` | Object path when `source_type = storage_object` |
| `original_filename` | Original uploaded name, when applicable |
| `mime_type` | Observed or uploaded media type |
| `byte_size` | Uploaded size or remote size when available |
| `sha256` | Checksum for managed uploads and migration deduplication |
| `link_status` | `unchecked`, `available`, `warning`, or `unavailable` |
| `link_checked_at` | Time of the last availability check |
| `source_note` | Optional private publisher note |

A database constraint enforces exactly one source:

- `external_url` is present and storage fields are empty, or
- storage fields are present and `external_url` is empty.

Cover and hero media use the same source pattern on their catalog/prebook record or in a shared media table. The customer-facing data loader resolves either source to the existing `href`, `image`, or hero-image prop before rendering.

## Delivery behavior

- External company link: LesterSales.net opens the stored URL directly in a new tab.
- Supabase file: a protected server route verifies portal access, creates a short-lived signed URL, and redirects to it.
- The customer interface looks the same for both source types.
- External links cannot inherit LesterSales.net password protection after a customer copies the destination URL. Only managed Supabase files remain fully inside the portal access boundary.

## Publishing validation

Before an entry can publish:

- Every required resource has a label, kind, and complete source.
- External sources use `https://` and pass URL parsing.
- The publisher has tested external links or explicitly acknowledged a host that blocks automated checks.
- Managed uploads exist in storage and have completed metadata.
- Prebooks have a valid booking deadline, ship date, and minimums.
- A prebook whose deadline has passed cannot publish as open.

Editing a resource creates a new draft revision. The currently published link or file remains available to customers until the revised entry is published.

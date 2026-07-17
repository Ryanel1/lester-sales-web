# LesterSales.net operations runbook

## Scope and recovery goals

This runbook covers only the standalone LesterSales.net Vercel and Supabase projects. Never restore data, credentials, or Storage objects from SalesLens or any other product.

- Recovery point objective: no more than 24 hours of published-content changes.
- Recovery time objective: restore customer access or a clear unavailable state within 4 hours.
- Owners: the Lester Sales site owner and the person currently responsible for the Vercel/Supabase deployments.

## Backup policy

1. Keep every Supabase migration committed in this repository. The migrations are the source of truth for schema, functions, grants, and Storage bucket configuration.
2. Confirm the dedicated Supabase project has provider-managed daily database backups enabled. If the current plan does not include them, create an encrypted logical backup at least daily.
3. Before every production migration, create a fresh encrypted logical backup and a private Storage snapshot.
4. Retain daily backups for 14 days, monthly backups for 12 months, and the last known-good pre-migration backup for at least 30 days.
5. Store backups outside the repository in an access-controlled company location. Never commit dumps, customer resources, database passwords, service-role keys, or session secrets.
6. Test a restore into a temporary LesterSales.net recovery project once per quarter. Delete that project and its copied credentials after the drill.

### Database backup commands

Run from this repository after confirming `supabase/.temp/project-ref` identifies the LesterSales.net project:

```sh
npx supabase db dump --linked --schema public --file lestersales-schema.sql
npx supabase db dump --linked --data-only --use-copy --schema public --file lestersales-data.sql
```

Encrypt both files immediately, move the encrypted copies to the approved backup location, and securely delete the plaintext files. The `storage` schema metadata is not a backup of the underlying private files.

### Storage snapshot

Snapshot both private buckets:

- `portal-documents`
- `portal-media`

Preserve the full object path for every downloaded object. Record the bucket name, path, byte size, and snapshot time in the backup manifest. Validate at least one PDF, spreadsheet, and cover image from each snapshot before declaring it complete.

## Normal deployment

1. Verify the linked Supabase project is the dedicated LesterSales.net project.
2. Run `npx supabase db push --linked --dry-run` and inspect the exact migration list.
3. Create the pre-migration database and Storage backups above.
4. Apply migrations with `npx supabase db push --linked`.
5. Run lint, typecheck, unit tests, production build, API tests, and browser tests.
6. Deploy the matching Git commit to the LesterSales.net Vercel project.
7. Verify customer login, all four brand pages, one external resource, one managed resource, publisher login, and a draft save.

The database migration must land before application code that calls a new RPC. If the application lands first, access throttling safely falls back to instance-local memory, but publisher saves using a missing RPC will return an error and leave the prior published record unchanged.

## Customer portal incident

The public brand route deliberately shows “Resources are temporarily unavailable” when Supabase configuration or content reads fail. It must not show a legitimate empty-library message during an outage.

1. Check Vercel deployment health and recent structured log events.
2. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` belong to LesterSales.net and are present in the active environment.
3. Check Supabase database and Storage availability.
4. If a recent deployment caused the failure, roll Vercel back to the previous known-good deployment. Do not roll back the database until the migration compatibility has been reviewed.
5. If data is missing or corrupt, disable publisher writes, take a forensic backup, and follow the restore procedure.

Relevant structured events include:

- `portal_content_configuration_missing`
- `portal_brand_read_failed`
- `portal_brand_content_read_failed`
- `portal_catalog_create_failed` / `portal_catalog_update_failed`
- `portal_prebook_create_failed` / `portal_prebook_update_failed`
- `portal_art_group_create_failed` / `portal_art_group_update_failed`
- `portal_storage_reference_check_failed`
- `portal_storage_cleanup_failed`
- `portal_media_signing_failed` / `portal_resource_signing_failed`
- `portal_upload_prepare_failed`
- `portal_link_health_update_failed`
- `portal_rate_limit_read_fallback` / `portal_rate_limit_write_fallback`

## Restore procedure

1. Create a temporary, isolated LesterSales.net recovery project. Never rehearse against production.
2. Apply the repository migrations in order to rebuild the schema and private buckets.
3. Restore the selected database data backup.
4. Upload `portal-documents` and `portal-media` objects to their original paths.
5. Compare row counts for all `portal_*` tables with the backup manifest.
6. Check that every database `storage_bucket` and `storage_path` reference resolves to an object.
7. Deploy the matching application revision with temporary recovery credentials and run the complete smoke test.
8. For a production restoration, take a final forensic backup of the damaged project, document the approved recovery point, restore, rotate the Supabase secret key and portal session secret, update Vercel, and run the complete smoke test again.
9. Record the incident timeline, data-loss window, root cause, validation results, and follow-up work.

## Managed-file cleanup

Successful edits and permanent deletes collect the old managed-object references after the database transaction commits. Before removing a file, the server asks `portal_storage_object_is_referenced` whether any catalog, prebook, art resource, cover, or hero still uses that bucket and path. Shared files used by duplicates therefore remain intact.

Cleanup failures do not roll back a successful content update. They emit a structured error and leave an orphaned private object for manual review. Never bulk-delete Storage objects solely because their filename looks old; compare them against every database reference first.

## Access throttling

Failed shared-password attempts are stored as HMAC hashes in `portal_access_attempts`; raw client addresses are not stored. Eight failures inside ten minutes trigger the temporary block. If Supabase is unavailable or the hardening migration has not yet been applied, the application falls back to its previous instance-local limiter and emits a structured warning.

The table contains only short-lived deterrence data and does not need to be restored during disaster recovery.

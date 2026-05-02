# Property images — architecture notes

> Spec source: `openspec/changes/properties-images/{proposal,design,specs/properties-images/spec.md}.md`.

The `properties-images` capability adds a single primary photo per
property, uploaded from the browser, stored in a private Supabase
Storage bucket, and rendered via short-lived signed URLs.

## Bucket layout

```
property-images/                              <- private bucket
  households/{household_id}/properties/{property_id}/{uuid}.jpg
```

- One bucket for the whole app (D1).
- Path prefix encodes the household so the policy can extract it and
  call `has_household_role()`.
- File ID is a fresh UUID per upload — replacing a photo never
  overwrites the old object, which means signed URLs cached in a CDN
  or in the browser keep working until they expire.
- Always `.jpg` because the compressor always emits JPEG, regardless
  of input MIME (D8).

## RLS strategy (D7)

Storage policies cannot run arbitrary SQL but they can call SQL
functions. We add a `SECURITY DEFINER` helper:

```sql
public.has_household_role_for_storage_path(path text, roles text[])
```

It splits `path` on `/`, validates the prefix matches
`households/<uuid>/properties/<uuid>/<file>`, then delegates to the
existing `has_household_role(uuid, text[])` helper. Any malformed
input returns `false` so a typo can never widen access.

Four policies on `storage.objects`, all scoped to
`bucket_id = 'property-images'`:

| Action  | Allowed roles                  |
|---------|--------------------------------|
| SELECT  | owner, member, viewer          |
| INSERT  | owner, member                  |
| UPDATE  | owner, member                  |
| DELETE  | owner, member                  |

Anonymous users are denied implicitly: the policies are gated on the
`authenticated` role and the helper calls `auth.uid()` via
`has_household_role()`.

## Upload flow

```
[Browser]
  1. User picks a file in PropertyImageEditor.
  2. validateImageFile() — size cap (8 MB) + MIME allowlist (D8).
  3. compressImage() — createImageBitmap → OffscreenCanvas (or
     HTMLCanvasElement fallback) → toBlob('image/jpeg', 0.85),
     scaled so the longest side ≤ 1920 (D5).
  4. supabase.storage.from('property-images').upload(path, blob)
     directly from the browser. The user's session enforces RLS —
     no need to base64-shuffle binary through a server action.
[Server]
  5. setPropertyImagePath(propertyId, path) updates
     properties.image_url. RLS on the row blocks viewers (defence in
     depth on top of the storage policy).
  6. Best-effort delete of the previous Storage object when the row
     used to point at a Storage path. Storage failure is logged and
     ignored — orphan recoverable later (D6).
```

If the row update fails (e.g. RLS denial because the user's role
changed mid-flight), the editor best-effort deletes the just-uploaded
object so we don't leave an orphan.

## Render flow / fallback chain (D3)

`properties.image_url` carries one of two value shapes:

- External URL — starts with `http`, used as-is. Set by the FINN
  parser.
- Storage path — anything else, signed before render with a 1-hour
  TTL via `createSignedUrl()`.

`getImageSrc(supabase, imageUrl)` and `getImageSrcMany(supabase,
imageUrls)` (in `src/lib/properties/imageUrl.ts`) encapsulate this
branching. The list page bulk-signs every Storage path in one
`createSignedUrls` call to avoid the N+1 a per-card sign would
produce.

Card / Oversikt fallback chain:

1. `resolved_image_url` (signed Storage URL or external URL) → render.
2. `<img>` `onError` → swap to placeholder div.
3. null → placeholder from the start.

The placeholder reuses the existing house-emoji on a
`primary-container` background.

## Compression contract

| Input                                     | Output (after compressImage)                |
|-------------------------------------------|---------------------------------------------|
| 4032×3024 JPEG, 4 MB                       | ~1920×1440 JPEG @ ~250–400 KB                |
| 1200×800 PNG, 800 KB                       | 1200×800 JPEG @ ~150–250 KB                  |
| iOS HEIC 4032×3024                         | varies — falls back to error if browser     |
|                                            | cannot decode (HEIC support is not          |
|                                            | universal). User picks another file.        |
| Anything > 8 MB                            | rejected client-side before decode          |

JPEG quality is fixed at 0.85 (D5). Output is always `image/jpeg`
regardless of input MIME — alpha is dropped (rare on property photos).

## Cascade on property delete

`deleteProperty` resolves `image_url` first, runs the row delete, and
then best-effort removes the Storage object when the column held an
uploaded path (FINN external URLs are owned by FINN, not us). Storage
failure is non-fatal — the property delete still succeeds, leaving an
orphan recoverable by a future cleanup job.

## Operational concerns

### Storage usage monitoring

Free-tier Supabase Storage is 1 GB. With the compression contract
above (~300 KB/photo) one tenant can store ~3500 properties before
the limit. Before going to production:

- Configure a Supabase dashboard alert when bucket size crosses
  800 MB (80% threshold).
- If the alert ever fires, either prune orphans (see below) or
  upgrade to a paid plan.

### Orphan files

Three flows can leave orphan objects in the bucket:

1. Replace flow — `setPropertyImagePath` best-effort deletes the old
   object after writing the new one. A network blip leaves the old
   one.
2. Property delete — same best-effort delete on cascade.
3. Upload-then-row-update-fails — the editor cleans up itself, but a
   browser crash after upload but before the server-action call would
   skip cleanup.

For MVP we accept this. A future `cleanup-orphans` cron (out of MVP
scope per the proposal) could enumerate every Storage object and
join against `properties.image_url` — anything in the bucket without
a row pointing at it is fair game to delete.

### HEIC support gaps

`createImageBitmap` does not support HEIC on Firefox or older Safari
builds. On unsupported browsers the compressor throws the
`IMAGE_ERROR_DECODE_FAILED` Norwegian message ("Kunne ikke lese
bildet. Prøv et annet."). iOS Safari 14+ supports HEIC natively, so
the most common upload path (iPhone → mobile Safari) works. Users on
unsupported browsers should convert to JPEG first or pick a JPEG copy
the iPhone usually saves alongside the HEIC.

A future improvement could ship a JS HEIC decoder (libheif-js, ~1.5
MB gz) lazy-loaded on the editor. Not worth the bundle cost in MVP.

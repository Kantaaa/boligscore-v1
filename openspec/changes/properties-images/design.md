> Conventions: see `openspec/conventions.md`.

## Context

Property photos are the single most-impactful UX upgrade after FINN-import. Today the cards show a 🏡 emoji placeholder and the Oversikt tab has no image at all. This change adds the smallest useful slice: one primary image per property, uploaded by the user, stored in Supabase Storage, served with a signed URL.

Constraints:
- **Mobile-first**: users will upload from their phone after a viewing. Compression matters. Multi-MB direct-uploads on 4G ruin the experience.
- **Privacy**: a household's photos must not leak to other households. Storage policies + signed URLs give us defence in depth.
- **Cost**: free tier of Supabase Storage is 1 GB. Compress aggressively so we don't outgrow it before there's revenue to justify a paid plan.
- **Simplicity**: a single primary image keeps schema, UI, and ops boring. Gallery + sort comes later.

## Goals / Non-Goals

**Goals:**
- One primary image per property, uploaded by `owner` or `member`, replaced by the same role.
- Browser-side compression to ≤ 1920px on the longest side, JPEG quality ~85, before upload.
- Storage policies that only let members read/write their own household's images.
- `<PropertyImageEditor>` component on Oversikt — drag-drop or click to select, progress indicator, delete button.
- `<PropertyCard>` renders the image (signed URL) when present, falls back through FINN URL → placeholder.
- All tests run offline (compression unit tests mock File/Image; storage tests skip when Supabase local isn't running).

**Non-Goals:**
- Multi-image galleries — separate `properties-image-gallery` change.
- Image transformations / blur placeholders / WebP variants — Supabase Pro feature.
- EXIF auto-rotate — only fix if a user reports it.
- Drag-to-reorder, primary selection UI — N/A with single image.
- Background upload queue — naive `fetch` upload is fine for MVP.
- Cleanup job for orphaned files (replaced photos that didn't get deleted).

## Decisions

### D1. Single Storage bucket, household-scoped path

**Choice**: one bucket `property-images`. Object path `households/{hid}/properties/{pid}/{uuid}.{ext}`. Storage policies match against the path prefix.

**Alternative considered**: one bucket per household (too many buckets, painful to manage); one global bucket with no prefix structure (impossible to RLS).

**Rationale**: prefix-based scoping mirrors our DB RLS pattern. Easy to reason about, easy to bulk-delete a household's images, easy to write storage policies.

### D2. Private bucket + signed URLs

**Choice**: bucket is private. Image render uses `supabase.storage.from('property-images').createSignedUrl(path, 3600)` — 1-hour TTL. The URL is regenerated on every page load (small RTT cost, negligible) and embedded in the `<img>` tag.

**Alternative considered**: public bucket with hash-of-content URLs.

**Rationale**: privacy. A guest who learns a property URL still can't enumerate family photos. The TTL refreshes every page load so a leaked URL stops working within an hour.

### D3. Single `image_url` column reused

**Choice**: `properties.image_url` (text, nullable) stores the path inside the bucket — NOT a full URL. The signed URL is generated on render. This way: no schema change, no migration, the FINN-import flow keeps working (it stores a full FINN URL; we detect external URLs and use them directly without signing).

**Detection**: `image_url.startsWith('http')` → external (FINN), use as-is. Otherwise → bucket path, sign before render.

**Rationale**: zero migration. The single column carries one of two value shapes; the render path branches on prefix. Simpler than adding a new column or splitting tables.

### D4. Browser-side compression via Canvas API, no dep

**Choice**: a ~50-line helper in `src/lib/images/compress.ts`. Uses `createImageBitmap` (or `Image` fallback), draws to a canvas at scaled-down dimensions, exports as JPEG via `canvas.toBlob('image/jpeg', 0.85)`.

**Alternatives considered**: `browser-image-compression` npm package (~30 KB gzipped, opinionated), `pica` (heavier), Sharp on the server (flips this into a server-side concern, defeats the bandwidth-saving point).

**Rationale**: keep the bundle lean; the Canvas approach is well-supported and good enough for the "downscale a photo before upload" need. No dep maintenance burden.

### D5. Compression target: ≤ 1920px longest side, JPEG quality 0.85

**Choice**: scale so the longer dimension is ≤ 1920px (no upscaling), encode as JPEG quality 0.85. Typical phone photo (3024×4032 @ 4MB) → ~1440×1920 @ ~250-400KB.

**Rationale**: 1920px is enough for the largest reasonable display (full-width on a 4K monitor). 0.85 JPEG quality is the sweet spot — visible artifacts only on flat gradients which are rare in property photos. Numbers tunable.

### D6. Replace flow: upload-new → set image_url → delete-old

**Choice**: when the user replaces the photo, the new file uploads first under a fresh uuid. Once the upload succeeds, we update `image_url`. THEN we attempt to delete the old file. If the delete fails, the old file lingers as garbage — non-blocking. A cleanup job is a future change.

**Rationale**: ensures the user always has a working image. The worst case (delete failure) wastes a few hundred KB of storage, which is recoverable later. The opposite ordering (delete first) risks leaving the property with a broken image link.

### D7. Storage policies enforce membership via DB lookup

**Choice**: storage policies cannot run arbitrary SQL, but they can call SQL functions. We add a `public.is_household_member_path(path text)` SECURITY DEFINER function that extracts the household_id from a path like `households/{hid}/properties/...` and checks membership. Both INSERT and SELECT on objects in `property-images` call this function.

**Rationale**: keeps the membership logic in one place (DB), reused across DB RLS and Storage policies. Path-based scoping is the only viable approach since Storage doesn't have a foreign key to households.

### D8. File type allowlist: jpeg, png, webp, heic

**Choice**: client-side accept attribute lists `image/jpeg,image/png,image/webp,image/heic`. The compression helper converts everything to JPEG on output, so storage is always JPEG.

**Rationale**: covers iOS (heic), Android (jpeg/png/webp), screenshots. No GIFs, no video.

### D9. Upload control lives on Oversikt, not on NyBoligForm

**Choice**: the upload control is a separate component on the Oversikt tab. New properties are created without an image; users add one after via Oversikt.

**Alternative considered**: include the upload in NyBoligForm.

**Rationale**: keeps NyBoligForm focused on text fields. Two-step flow (create → photograph → upload) matches how people actually use it: they create the property after the viewing, then upload photos at home from their phone.

### D10. Failure modes return user-readable Norwegian errors

**Choice**: every failure (compression error, signed-URL fetch fail, upload network error, delete network error) returns a Norwegian message. No raw error codes shown to users.

**Rationale**: trust pattern across the rest of the app.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Orphaned files when replace-flow's delete step fails | Acceptable in MVP. Add `cleanup-orphans` cron in a follow-up if storage usage balloons. |
| Storage policy misconfigured → photos visible across households | Integration test that explicitly attempts cross-household read with a fixture user. Storage policies + the path-based check (D7) close the obvious gap. |
| Compression silently fails on weird input (e.g. iOS HEIC) | `<input accept="image/*">` covers the broad case; HEIC support varies by browser. If `createImageBitmap` throws, fall back to uploading the original (sized check applies — reject if > 8 MB). |
| Slow uploads on poor mobile connection | Show a progress bar (XHR-based upload — Supabase JS supports). User can cancel. No retry queue in MVP. |
| User uploads a NSFW or libelous image | Out of scope; no moderation in MVP. Anyone with admin access (service role) can manually delete via Supabase dashboard if reported. |
| Signed URL TTL expires while user keeps the page open for > 1h | Acceptable: a page reload regenerates. If it becomes annoying, refresh URLs client-side via `setInterval`. |
| `image_url` column carries TWO shapes (path or external URL) | Documented in code with a `getImageSrc()` helper that branches on `startsWith('http')`. Fragile but bounded. Future change can split into `image_path` + `image_external_url` columns. |

## Resolved Decisions

### D11. Default cache-control for storage objects: 7 days

**Choice**: upload sets `cacheControl: '604800'` (7 days). The signed URL TTL is 1 hour, but the underlying object is cacheable.

**Rationale**: photos rarely change after upload. 7 days saves bandwidth on repeat views.

### D12. Max upload size: 8 MB pre-compression

**Choice**: client rejects files > 8 MB before reading. Most phone photos are 4–6 MB.

**Rationale**: defense against accidental video upload, scanned PDFs, etc. After compression files end up ≤ 500 KB.

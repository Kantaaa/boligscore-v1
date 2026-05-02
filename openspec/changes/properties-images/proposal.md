> Conventions: see `openspec/conventions.md`.

## Why

Property cards currently fall back to a placeholder thumbnail unless a FINN URL was extracted (and even then, the FINN CDN URL can expire when a listing is taken down). For properties added manually OR for households that want their own photos (e.g. interior shots from a viewing), there's no way to upload images today. Photos are the single biggest UX upgrade — they make the property list feel real instead of generic.

Scope bounded to **MVP single primary image per property**. A future change can add multi-photo galleries with sort + primary selection; this one keeps the schema and UI minimal so the value lands fast.

## What Changes

- New **Supabase Storage bucket** `property-images` with policies that gate read + write by household membership.
- **Browser-side compression** before upload (max 1920px on the longer side, JPEG quality ~85) to keep transfer sizes sane and response times snappy on mobile.
- **Upload UI** on the property Oversikt tab: a drop-zone / pick-file control that replaces the current image (or sets it for the first time). Owner + member can upload; viewer is read-only. Deleting an image is also one-tap.
- **Property cards on `/app`** render the uploaded image (or the FINN-CDN URL stored on `image_url`, or a placeholder, in that order).
- **No changes to the schema** — `properties.image_url` already exists and remains the single field that points at the rendered image. We just start putting Supabase Storage URLs (or signed URLs) into it instead of leaving it null.
- **Storage object path**: `households/{household_id}/properties/{property_id}/{random_uuid}.{ext}`. The household_id prefix lets RLS scope cleanly; the random uuid prevents accidental overwrites and avoids cache poisoning when a user replaces the photo.
- On image replace: the new file is uploaded first (atomic-ish), then `image_url` is updated, then the old file is deleted. If anything fails midway the old file lingers as garbage — acceptable for MVP, a cleanup job is a follow-up.

## Out of MVP scope (future)

- **Multi-photo gallery** with drag-to-reorder + primary selection. Separate change `properties-image-gallery`.
- **Image transformations** (thumbnails, blurred placeholders) — Supabase has built-in transform on Pro tier, but we'd rather defer than commit to a paid feature here.
- **EXIF rotation correction** on upload — most modern cameras now write upright; we'll fix if it shows up as a real bug.
- **Background sync / queueing** for poor-network uploads. MVP shows progress + retry on failure.
- **Bulk import** from FINN photo galleries.
- **Cleanup job** for orphaned files (uploaded but never linked, or replaced).

## Capabilities

### New Capabilities
- `properties-images`: Supabase Storage bucket + RLS, browser-side image compression, upload/delete UI on Oversikt, image rendering with fallback chain on cards.

### Modified Capabilities
- `properties`: Oversikt tab gains an upload control above the address heading. Property card thumbnail logic changes from "placeholder always" to "uploaded → FINN → placeholder".

## Impact

- **Storage**: new Supabase bucket `property-images` (private). RLS via storage policies.
- **Bandwidth/cost**: one image per property at ≤300KB compressed. For ~1000 properties that's ~300MB stored — comfortably within Supabase free tier (1GB).
- **Schema**: no migration. `image_url` text column is reused.
- **UI**: new `<PropertyImageEditor>` component on Oversikt. `<PropertyCard>` updated to render the image when present.
- **Server**: a server action `setPropertyImage(propertyId, file)` and `clearPropertyImage(propertyId)`. Uploads happen via the Supabase JS client (auth-scoped) so RLS applies.
- **Browser**: a small image-compression helper using Canvas API. ~50 lines of vanilla JS, no dep.
- **Tests**: unit for the compression helper (mocking File/Image); integration for the storage RLS; e2e fixme until dev-users harness lands.
- **Privacy**: bucket is **private**. Images are read via short-lived signed URLs generated at render time. Anyone outside the household never sees the URL OR the image.

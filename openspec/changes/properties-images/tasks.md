> Conventions: see `openspec/conventions.md`.

## 1. Storage bucket + policies

- [x] 1.1 Migration `supabase/migrations/<ts>_property_images_bucket.sql`. Create the bucket via `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('property-images', 'property-images', false, 9000000, ARRAY['image/jpeg','image/png','image/webp','image/heic'])` (idempotent — `ON CONFLICT DO NOTHING`).
- [x] 1.2 SECURITY DEFINER helper `public.has_household_role_for_storage_path(path text, roles text[])` that:
   - Splits the path on `/` to get `[..., 'households', '{hid}', 'properties', '{pid}', '{file}']`.
   - Validates the prefix matches the expected pattern.
   - Calls `has_household_role(hid, roles)` (existing helper).
   - Returns false on any malformed input.
- [x] 1.3 Storage policies (insert into `storage.policies` or via `CREATE POLICY ON storage.objects`):
   - SELECT: `bucket_id = 'property-images' AND has_household_role_for_storage_path(name, ARRAY['owner','member','viewer'])`.
   - INSERT: same as SELECT but roles = `['owner','member']`.
   - UPDATE: same as INSERT (used for replace flow).
   - DELETE: same as INSERT.
- [x] 1.4 Extend `get_property_list()` to return `image_url` so `/app` cards can render uploaded images alongside FINN external URLs.

## 2. Image compression library

- [x] 2.1 Create `src/lib/images/types.ts` exporting `CompressedImage = { blob: Blob; width: number; height: number; bytes: number; mimeType: 'image/jpeg' }`.
- [x] 2.2 Create `src/lib/images/compress.ts` exporting `async compressImage(file: File, opts?: { maxDimension?: number; quality?: number }): Promise<CompressedImage>`. Uses `createImageBitmap` → `OffscreenCanvas` (or HTMLCanvasElement fallback) → `canvas.toBlob('image/jpeg', quality)`. Defaults: maxDimension 1920, quality 0.85.
- [x] 2.3 Create `src/lib/images/validate.ts` exporting `validateImageFile(file: File): { ok: true } | { ok: false; error: string }`. Checks size ≤ 8 MB and MIME type in the allowlist.
- [x] 2.4 Unit tests for both: mock the Image / Canvas APIs (jsdom limitations — may need `@testing-library/jest-dom` or just direct stubbing).

## 3. Server actions

- [x] 3.1 `src/server/properties/setPropertyImagePath.ts`:
   - Accepts `propertyId: string` + `path: string` (the Storage object path written by the browser-side direct upload — see implementation guidance, the client uploads via `supabase.storage.from(...).upload(...)` directly so RLS gates the request via the user's session).
   - Updates `properties.image_url = path`.
   - If the property already had a Storage path, best-effort delete the old object.
   - Returns the new path on success.
- [x] 3.2 `src/server/properties/clearPropertyImage.ts`:
   - Sets `properties.image_url = null`.
   - Best-effort deletes the old Storage object if it was a Storage path (not http://).
- [x] 3.3 Cascade-on-delete: extend the existing `deleteProperty` server action to also best-effort delete the Storage object for the property's `image_url` (when it's a Storage path) BEFORE deleting the row. If Storage delete fails, log + proceed with the row delete (non-blocking).
- [x] 3.4 `src/lib/properties/imageUrl.ts` exporting `getImageSrc(supabase, imageUrl: string | null): Promise<string | null>` — returns external URL as-is, signs Storage paths with 1h TTL, returns null when input is null. Also `getImageSrcMany()` for bulk-signing on the list page.

## 4. UI — PropertyImageEditor on Oversikt

- [x] 4.1 New component `src/components/properties/PropertyImageEditor.tsx`:
   - Renders the current image (signed URL or placeholder).
   - When `canEdit`: drop-zone + click-to-pick file input, accepts only the four allowed MIME types.
   - On file selection: validate → compress → upload via browser-direct `supabase.storage.upload()` → call `setPropertyImagePath` server action → on success, refresh.
   - Progress / spinner state during upload.
   - Delete button when an image exists.
- [x] 4.2 Add the editor at the top of `OversiktView`, above the address heading. Render it in viewer mode (read-only image) when role is `viewer`.
- [x] 4.3 Pass the resolved signed URL (or external URL) from the server page to the client component, so the initial render doesn't need a roundtrip.

## 5. UI — PropertyCard image rendering

- [x] 5.1 Update `PropertyCard` to render the image when present:
   - Server-side resolve `getImageSrc` and pass the URL down (server component preferred — fewer roundtrips than client signing per card).
   - Render `<img>` with `loading="lazy"`, `alt={property.address}`, `className="aspect-[16/10] w-full rounded-lg object-cover bg-surface-muted"`.
   - On `onError`: swap to a placeholder div (the existing 🏡 emoji on a primary-container background).
- [x] 5.2 Resolve `image_url` on the list-server-component side: extend `listProperties` (or wrap its result) to bulk-sign all the Storage paths in one round (one `createSignedUrls` call instead of N).

## 6. Tests

- [ ] 6.1 **Unit (Vitest)**: `validateImageFile` — accepts allowed types under 8 MB, rejects oversized, rejects PDF.
- [ ] 6.2 **Unit**: `compressImage` — mock `createImageBitmap` + `OffscreenCanvas`. Verify maxDimension, quality, output mime.
- [ ] 6.3 **Unit**: `getImageSrc` — null → null, http URL → returned as-is, Storage path → calls `createSignedUrl`.
- [ ] 6.4 **Integration (Vitest + Supabase, gated on TEST_SUPABASE_URL)**: Storage policies — owner/member can upload + read, viewer can read but not upload, non-member denied.
- [ ] 6.5 **E2E (Playwright)**: upload from Oversikt → card renders new image → reload persists → delete → placeholder. `test.fixme()`-marked pending dev-users harness.

## 7. Documentation

- [ ] 7.1 `docs/architecture/property-images.md`: bucket layout, RLS strategy, fallback chain, compression contract.
- [ ] 7.2 Update `properties` proposal "Out of MVP scope" section: remove the image-upload bullet (no longer deferred).
- [ ] 7.3 Update `README.md` "Adding a property" section: mention how to add a photo on Oversikt.

## 8. Operational

- [ ] 8.1 Document in `docs/architecture/property-images.md` that storage usage should be monitored — at 800 MB used (out of 1 GB free tier), set up an alert via Supabase dashboard.
- [ ] 8.2 Note that orphaned files (replaced photos that didn't get deleted) should be cleaned up by a future scheduled job; for MVP, no cleanup.

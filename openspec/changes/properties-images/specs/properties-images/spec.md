## ADDED Requirements

### Requirement: Storage bucket and policies

The system SHALL provision a private Supabase Storage bucket named `property-images`. Object paths SHALL follow `households/{household_id}/properties/{property_id}/{uuid}.{ext}`. Read and write policies SHALL gate access by household membership: only `owner` and `member` roles can upload or delete; only members of any role can read.

#### Scenario: Owner uploads to their household

- **WHEN** an `owner` of household H uploads an object at `households/H/properties/P/<uuid>.jpg`
- **THEN** the upload succeeds
- **AND** the object is private (anonymous request to its public URL fails)

#### Scenario: Member uploads to their household

- **WHEN** a `member` uploads to a path under their household
- **THEN** the upload succeeds

#### Scenario: Viewer cannot upload

- **WHEN** a `viewer` attempts to upload an object under their household's path
- **THEN** the storage policy denies the operation

#### Scenario: Non-member denied

- **WHEN** a user not a member of household H attempts to upload OR read an object under `households/H/...`
- **THEN** the storage policy denies the operation

#### Scenario: Anonymous denied

- **WHEN** an unauthenticated request attempts to read OR write any object in the `property-images` bucket
- **THEN** the storage policy denies the operation

### Requirement: Browser-side image compression

The system SHALL compress images in the browser before upload. The longest dimension SHALL be reduced to no more than 1920px and the encoded format SHALL be JPEG at quality ≈ 0.85. Files larger than 8 MB before compression SHALL be rejected client-side with a clear Norwegian error.

#### Scenario: Large photo compressed

- **WHEN** the user selects a 4032×3024 JPEG that's 4 MB
- **THEN** the upload sends a JPEG ≤ 1920px on the longer side and ≤ ~500 KB

#### Scenario: Already-small photo passes through

- **WHEN** the user selects a 1200×800 PNG that's 800 KB
- **THEN** the longest dimension is preserved (no upscale)
- **AND** the output is encoded as JPEG quality 0.85

#### Scenario: Oversized file rejected

- **WHEN** the user selects a file > 8 MB
- **THEN** the upload is rejected with the message "Bildet er for stort — maks 8 MB før komprimering"
- **AND** no Storage write is attempted

#### Scenario: Unreadable file rejected

- **WHEN** the file can't be decoded as an image (e.g. corrupted)
- **THEN** an inline error displays "Kunne ikke lese bildet. Prøv et annet."

### Requirement: Upload control on Oversikt

The system SHALL render an image upload control on the property Oversikt tab. `owner` and `member` SHALL see a drop-zone / pick-file control plus a delete button when an image already exists. `viewer` SHALL see only the rendered image (no edit affordance).

#### Scenario: Member uploads first image

- **WHEN** a member taps the upload control and selects a JPEG
- **THEN** the file is compressed, uploaded, and the property's `image_url` updates to the new path
- **AND** the page re-renders with the new image visible

#### Scenario: Member replaces existing image

- **WHEN** a member uploads a new image while one already exists
- **THEN** the new file is uploaded first
- **AND** `image_url` is updated to the new path
- **AND** the old file is best-effort deleted from Storage

#### Scenario: Member deletes image

- **WHEN** a member taps the delete button on an existing image
- **THEN** `image_url` is set to NULL
- **AND** the Storage object is best-effort deleted
- **AND** the page re-renders with the placeholder image

#### Scenario: Viewer sees no edit affordance

- **WHEN** a `viewer` opens the Oversikt tab for a property with an image
- **THEN** the image renders but no upload or delete control is visible
- **AND** any direct API call to upload as the viewer is denied by Storage policy

### Requirement: Image rendering with fallback chain

The system SHALL render the property image using the following fallback chain on the property card and Oversikt tab:
1. If `image_url` is a Storage path (does NOT start with `http`), generate a signed URL with 1-hour TTL and render that.
2. If `image_url` starts with `http` (legacy or FINN-CDN URL), render it directly.
3. If `image_url` is null, render the placeholder illustration.

#### Scenario: Storage-backed image renders

- **WHEN** a property has `image_url = 'households/H/properties/P/abc.jpg'`
- **THEN** the card renders the signed URL of that path
- **AND** the URL is regenerated on each render (TTL 1 hour)

#### Scenario: External URL renders directly

- **WHEN** a property has `image_url = 'https://images.finn.no/...'`
- **THEN** the card renders that URL as-is — no signing

#### Scenario: Placeholder fallback

- **WHEN** a property has `image_url = NULL`
- **THEN** the card renders the placeholder illustration

#### Scenario: Render failure falls back gracefully

- **WHEN** the image URL fails to load (404, network error)
- **THEN** the `<img>` `onerror` handler swaps to the placeholder
- **AND** no broken-image icon is shown

### Requirement: File type allowlist

The system SHALL accept only `image/jpeg`, `image/png`, `image/webp`, and `image/heic` MIME types. Other types SHALL be rejected client-side before any Storage interaction.

#### Scenario: Allowed types accepted

- **WHEN** a user selects a JPEG, PNG, WebP, or HEIC file under 8 MB
- **THEN** compression proceeds normally

#### Scenario: Disallowed type rejected

- **WHEN** a user selects a PDF, MP4, or other non-image type
- **THEN** the upload is rejected with the message "Bare bildefiler er støttet (JPEG, PNG, WebP, HEIC)"

### Requirement: Cascade on property delete

Deleting a property SHALL trigger best-effort deletion of any uploaded image associated with it. If the Storage delete fails (network, transient error), the property delete SHALL still succeed; the image becomes an orphan to be cleaned up later.

#### Scenario: Property delete removes the image

- **WHEN** a member deletes a property that has an uploaded image
- **THEN** the property row is deleted (cascading per `properties` capability)
- **AND** the Storage object is best-effort deleted

#### Scenario: Storage delete failure does not block property delete

- **WHEN** the Storage delete call fails (simulated)
- **THEN** the property is still deleted from the database
- **AND** the user sees the normal "Bolig slettet" outcome

### Requirement: Privacy boundary

A user from one household SHALL never be able to view, infer the existence of, or download images belonging to another household — neither via the UI, the Storage URL, nor by guessing object paths.

#### Scenario: Cross-household read denied

- **WHEN** Alice (member of household A) attempts to read a Storage path under household B
- **THEN** the request returns 403 / 404
- **AND** no image bytes are returned

#### Scenario: Signed URL not enumerable

- **WHEN** Alice requests `createSignedUrl` for a path she has access to
- **AND** later attempts to swap the path to one in another household
- **THEN** the second request fails (signed URLs are tied to the original path; the policy still applies on every request)

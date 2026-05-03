"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { compressImage } from "@/lib/images/compress";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_ERROR_DECODE_FAILED,
  IMAGE_ERROR_UPLOAD_FAILED,
} from "@/lib/images/types";
import { validateImageFile } from "@/lib/images/validate";
import {
  BUCKET_NAME,
  UPLOAD_CACHE_CONTROL_SECONDS,
  buildPropertyImagePath,
  jpegExtension,
} from "@/lib/properties/images";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearPropertyImage } from "@/server/properties/clearPropertyImage";
import { setPropertyImagePath } from "@/server/properties/setPropertyImagePath";

/**
 * Property-image upload + delete UI on the Oversikt tab.
 *
 * Behaviour:
 *   - Renders the current image (signed URL passed in by the server
 *     component, or external FINN URL) or a 16:10 placeholder.
 *   - When `canEdit`: drop-zone + picker accepting only JPEG/PNG/WebP/HEIC.
 *   - On selection: validate \u2192 compress \u2192 upload directly to
 *     Supabase Storage from the browser \u2192 call setPropertyImagePath
 *     server action to persist the path on the property row.
 *   - Browser-direct upload means RLS gates the request via the user's
 *     session \u2014 no need to base64-shuffle bytes through a server
 *     action.
 *   - Delete button when an image exists.
 *
 * The component is intentionally self-contained \u2014 the server page
 * passes only the resolved `currentSrc` so the first paint matches.
 * On success we call `router.refresh()` to re-fetch the page.
 */
interface PropertyImageEditorProps {
  propertyId: string;
  householdId: string;
  /** True when the current value is a Storage path (as opposed to FINN URL or null). */
  hasUploadedImage: boolean;
  /** Pre-resolved image URL (signed Storage URL, external URL, or null). */
  currentSrc: string | null;
  canEdit: boolean;
  /** Address used as the alt text. */
  address: string;
}

const ACCEPT_ATTR = ALLOWED_IMAGE_MIME_TYPES.join(",");

export function PropertyImageEditor({
  propertyId,
  householdId,
  hasUploadedImage,
  currentSrc,
  canEdit,
  address,
}: PropertyImageEditorProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const busy = isUploading || isDeleting;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setError(null);

    const v = validateImageFile(file);
    if (!v.ok) {
      setError(v.error);
      return;
    }

    startUpload(async () => {
      let blob: Blob;
      try {
        const compressed = await compressImage(file);
        blob = compressed.blob;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : IMAGE_ERROR_DECODE_FAILED,
        );
        return;
      }

      const fileId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = buildPropertyImagePath({
        householdId,
        propertyId,
        fileId,
        ext: jpegExtension(),
      });

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: String(UPLOAD_CACHE_CONTROL_SECONDS),
          upsert: false,
        });
      if (uploadError) {
        setError(IMAGE_ERROR_UPLOAD_FAILED);
        return;
      }

      const r = await setPropertyImagePath(propertyId, path);
      if (!r.ok) {
        // Best-effort clean up the uploaded object so we don't leave
        // an orphan when the row update is denied (e.g. RLS).
        await supabase.storage.from(BUCKET_NAME).remove([path]);
        setError(r.error);
        return;
      }
      setImgError(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      const r = await clearPropertyImage(propertyId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setImgError(false);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="property-image-editor-heading"
      className="space-y-2"
    >
      <h2 id="property-image-editor-heading" className="sr-only">
        Boligbilde
      </h2>

      <div
        className={[
          "relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-muted shadow-sm",
          canEdit && isDragging
            ? "ring-2 ring-primary"
            : "",
        ].join(" ")}
        onDragOver={(e) => {
          if (!canEdit || busy) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (!canEdit || busy) return;
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
      >
        {currentSrc && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={address}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Placeholder />
        )}

        {busy ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-bg/60 text-sm text-fg"
            role="status"
            aria-live="polite"
          >
            {isDeleting ? "Sletter\u2026" : "Laster opp\u2026"}
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="min-h-touch rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg shadow-sm transition hover:bg-primary-dim disabled:opacity-60"
          >
            {currentSrc ? "Bytt bilde" : "Last opp bilde"}
          </button>
          {currentSrc && hasUploadedImage ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="min-h-touch rounded-full bg-surface-muted px-4 text-sm font-medium text-fg-muted shadow-sm transition hover:bg-surface-strong hover:text-fg disabled:opacity-60"
            >
              Slett bilde
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              // Reset so picking the same file twice fires onChange.
              e.target.value = "";
            }}
          />
          <p className="basis-full text-xs text-fg-muted">
            Maks 8 MB. Bildet komprimeres f\u00f8r opplasting.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-status-bud-inne">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Placeholder() {
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-primary-container text-primary-container-fg"
    >
      <span className="text-5xl">{"\u{1F3E1}"}</span>
    </div>
  );
}

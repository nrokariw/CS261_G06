import imageCompression from "browser-image-compression";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "../constants/config";

const HEIC_TYPES = ["image/heic", "image/heif"];

/**
 * Compress and resize an uploaded image file so mobile camera photos
 * (e.g. iPhone) stay well under backend/proxy size limits.
 */
export async function prepareImageForUpload(file) {
  if (!file) return null;

  const isAllowed = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isHeic = HEIC_TYPES.includes(file.type);
  if (!isAllowed && !isHeic) {
    throw Object.assign(new Error("INVALID_IMAGE_TYPE"), {
      code: "INVALID_IMAGE_TYPE",
    });
  }

  // Keep PNGs as PNG; convert JPEG/WEBP/HEIC to JPEG for reliable size reduction
  const targetType = file.type === "image/png" ? "image/png" : "image/jpeg";

  const compressedBlob = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: targetType,
  });

  if (compressedBlob.size > MAX_IMAGE_SIZE_BYTES) {
    throw Object.assign(new Error("IMAGE_TOO_LARGE"), {
      code: "IMAGE_TOO_LARGE",
    });
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  const ext = targetType === "image/png" ? "png" : "jpg";
  return new File([compressedBlob], `${baseName}.${ext}`, {
    type: targetType,
    lastModified: Date.now(),
  });
}

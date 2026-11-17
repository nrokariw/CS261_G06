export const ITEM_DETAIL_MAX_LENGTH = 500;
export const BORROW_REASON_MAX_LENGTH = 300;
export const MAX_IMAGE_SIZE_MB = 3;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const REDIRECT_DELAY_MS = 650;
export const BRAND_THEME_COLOR = "#EC6426";
export const ITEMS_PER_PAGE = Math.max(
  1,
  Number.parseInt(import.meta.env.VITE_ITEMS_PER_PAGE || "9", 10) || 9,
);

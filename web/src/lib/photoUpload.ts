/** Compress images for testing-period profile uploads (keeps data: URLs usable). */

const MAX_EDGE = 960;
const JPEG_QUALITY = 0.78;

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Resize + JPEG compress; falls back to original data URL. */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-image");
  }
  const raw = await readAsDataUrl(file);
  try {
    const img = await loadImage(raw);
    const { w, h } = fit(img.naturalWidth || img.width, img.naturalHeight || img.height, MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return raw;
  }
}

function fit(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { w: width, h: height };
  const r = Math.min(max / width, max / height);
  return { w: Math.max(1, Math.round(width * r)), h: Math.max(1, Math.round(height * r)) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

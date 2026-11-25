import { toBlob, toPng } from "html-to-image";

export function normalizeWhatsAppPhone(phone: string): string {
  let cleaned = String(phone || "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = `964${cleaned.substring(1)}`;
  if (cleaned.length === 10 && cleaned.startsWith("7")) cleaned = `964${cleaned}`;
  return cleaned;
}

async function waitForImages(el: HTMLElement) {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 1500);
        }),
    ),
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const isBase64 = /;base64/i.test(header || "");
  const mime = header?.match(/data:([^;]+)/)?.[1] || "image/png";
  if (!isBase64) {
    return new Blob([decodeURIComponent(data || "")], { type: mime });
  }
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const captureOptions = (el: HTMLElement, pixelRatio: number) => ({
  pixelRatio,
  backgroundColor: "#ffffff",
  cacheBust: true,
  // Avoid SecurityError when reading cross-origin stylesheets (Google Fonts, etc.)
  skipFonts: true,
  width: el.scrollWidth || el.offsetWidth,
  height: el.scrollHeight || el.offsetHeight,
  style: {
    transform: "none",
    inset: "auto",
    // Stable local stack so Arabic still renders without remote fonts
    fontFamily:
      '"Tajawal", "Segoe UI", Tahoma, Arial, "Noto Sans Arabic", sans-serif',
  },
  filter: (node: unknown) => {
    if (!(node instanceof HTMLElement)) return true;
    return node.dataset.shareIgnore !== "true";
  },
});

export async function captureElementPngBlob(
  el: HTMLElement,
  fileName: string,
  options?: { pixelRatio?: number },
): Promise<{ blob: Blob; file: File }> {
  await waitForImages(el);
  const pixelRatio = Math.max(2, Math.min(options?.pixelRatio ?? 3, 5));

  const touched: Array<{ node: HTMLElement; transform: string; filter: string }> = [];
  let walk: HTMLElement | null = el.parentElement;
  while (walk && walk !== document.body) {
    const style = window.getComputedStyle(walk);
    if (style.transform && style.transform !== "none") {
      touched.push({
        node: walk,
        transform: walk.style.transform,
        filter: walk.style.filter,
      });
      walk.style.transform = "none";
      walk.style.filter = "none";
    }
    walk = walk.parentElement;
  }

  try {
    const opts = captureOptions(el, pixelRatio);

    let blob: Blob | null = null;
    try {
      blob = await toBlob(el, opts);
    } catch {
      blob = null;
    }

    if (!blob) {
      try {
        const dataUrl = await toPng(el, opts);
        blob = dataUrlToBlob(dataUrl);
      } catch {
        blob = null;
      }
    }

    if (!blob) {
      const dataUrl = await toPng(el, {
        pixelRatio: Math.max(2, pixelRatio - 1),
        backgroundColor: "#ffffff",
        cacheBust: true,
        skipFonts: true,
        style: {
          fontFamily:
            '"Tajawal", "Segoe UI", Tahoma, Arial, "Noto Sans Arabic", sans-serif',
        },
      });
      blob = dataUrlToBlob(dataUrl);
    }

    if (!blob || blob.size < 32) throw new Error("invoice_capture_failed");
    const file = new File([blob], fileName, { type: "image/png" });
    return { blob, file };
  } finally {
    for (const item of touched) {
      item.node.style.transform = item.transform;
      item.node.style.filter = item.filter;
    }
  }
}

export type InvoiceShareResult = "shared" | "partial" | "cancelled" | "failed";

/**
 * Share invoice text + PNG only (no download/save dialog).
 */
export async function shareInvoiceTextAndImage(opts: {
  title: string;
  text: string;
  file: File;
  blob: Blob;
  customerPhone?: string;
  openExternalUrl: (url: string) => void;
}): Promise<InvoiceShareResult> {
  const { title, text, file, customerPhone, openExternalUrl } = opts;

  // 1) System share with image + text (WhatsApp appears here)
  try {
    const shareData: ShareData = { title, text, files: [file] };
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(shareData)
    ) {
      await navigator.share(shareData);
      return "shared";
    }
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name) : "";
    if (name === "AbortError") return "cancelled";
  }

  // 2) Capacitor native share sheet
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title,
        text,
        dialogTitle: title,
      });
      return "partial";
    }
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name) : "";
    if (name === "AbortError") return "cancelled";
  }

  // 3) Direct WhatsApp with full invoice text (no save/download)
  openWhatsAppInvoiceText({ text, customerPhone, openExternalUrl });
  return "partial";
}

/** Open WhatsApp with invoice text only (no image, no download). */
export function openWhatsAppInvoiceText(opts: {
  text: string;
  customerPhone?: string;
  openExternalUrl: (url: string) => void;
}) {
  const phone = normalizeWhatsAppPhone(opts.customerPhone || "");
  const encoded = encodeURIComponent(opts.text);
  // Prefer native app scheme so WhatsApp opens directly on mobile
  const nativeUrl = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;
  const webUrl = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCapacitor =
    typeof window !== "undefined" && !!(window as { Capacitor?: unknown }).Capacitor;

  if (isMobile || isCapacitor) {
    try {
      opts.openExternalUrl(nativeUrl);
      // Fallback to wa.me if the scheme doesn't hand off
      window.setTimeout(() => {
        if (typeof document !== "undefined" && document.hasFocus?.()) {
          opts.openExternalUrl(webUrl);
        }
      }, 800);
      return;
    } catch {
      // fall through
    }
  }

  opts.openExternalUrl(webUrl);
}

/** Download invoice PNG to the device (Save). */
export function downloadPngBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

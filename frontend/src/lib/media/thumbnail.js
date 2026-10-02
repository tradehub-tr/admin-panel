/**
 * Yükleme öncesi küçük ön izleme — 96 px'lik `data:` WebP.
 *
 * Panelin CSP'si `blob:` görsele izin vermiyor (img-src 'self' data: https:);
 * `URL.createObjectURL` ile üretilen adres ekranda kırık görünürdü. Küçük bir
 * `data:` adresi hem CSP'ye uyar hem de dosyanın tamamını bellekte bir adrese
 * bağlamaz — serbest bırakma (revoke) gerekmez.
 *
 * Görsel değilse ya da çözülemezse (bozuk, HEIC, tarayıcıda `createImageBitmap`
 * yok) boş metin döner; satır tür simgesiyle kalır.
 */
export async function dataThumbnail(file, size = 96) {
  if (!file?.type?.startsWith("image/") || typeof createImageBitmap !== "function") return "";
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, size / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    return canvas.toDataURL("image/webp", 0.7);
  } catch {
    return "";
  }
}

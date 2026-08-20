/**
 * `@/lib/media/compress.js` ve `@/utils/uploadPolicy` yerine geçen sahte
 * (klasör testleri, T-094).
 *
 * İkisi de yalnız YÜKLEME yolunda kullanılıyor; klasör testleri o yola hiç
 * girmez. Gerçek modüller tarayıcı API'lerine (canvas, Worker) ve ağ
 * çağrısına uzanıyor — Node SSR'da yüklenmeleri hem gereksiz hem kırılgan.
 * Gövdeler bilerek patlıyor: klasör testi yükleme yoluna düşerse görünsün.
 */

export async function prepareMedia() {
  throw new Error("klasör testi yükleme yoluna düştü — prepareMedia çağrılmamalıydı");
}

export async function loadLimits() {
  throw new Error("klasör testi yükleme yoluna düştü — loadLimits çağrılmamalıydı");
}

export function needsChunking() {
  throw new Error("klasör testi yükleme yoluna düştü — needsChunking çağrılmamalıydı");
}

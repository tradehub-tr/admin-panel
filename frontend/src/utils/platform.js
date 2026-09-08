/**
 * Platform tespiti — iOS uygulama (App Store uyum) bayrağı.
 *
 * iOS build'de satış yüzeyleri (paket kartı, fiyat, yükselt/abone-ol CTA'sı,
 * havale/IBAN) render EDİLMEZ (Apple Guideline 3.1.1/3.1.3 anti-steering).
 * İki sinyal (spec AD-1):
 *   1. Capacitor bridge: `window.Capacitor?.getPlatform?.() === "ios"` —
 *      bridge /panel webview'ına her zaman enjekte edilmeyebilir.
 *   2. UA işareti: FE-1'in `capacitor.config.ts` → `ios.appendUserAgent:
 *      "istocApp/ios"` — build-time garantili asıl güvenilir sinyal.
 *
 * UA spoofing güvenlik sınırı DEĞİLDİR; bu bir uyum (compliance) bayrağıdır
 * (spec risks). Asıl enforcement backend'de kalır.
 */
export const IOS_APP_UA_MARK = "istocApp/ios";

export function isIosApp() {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.getPlatform?.() === "ios") return true;
  const ua = window.navigator?.userAgent || "";
  return ua.includes(IOS_APP_UA_MARK);
}

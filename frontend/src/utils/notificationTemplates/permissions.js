// Bildirim şablonları — yetki yardımcıları (saf). TEK karar noktası.
//
// Güvenlik SUNUCUDA sağlanır; buradaki kararlar yalnız görünümü kısar (yetkisiz
// eylem devre dışı + neden metni). Rol tablosu ve Frappe rolü eşlemesi onay
// bekleyen varsayımdır ve `notificationTemplatePolicy.js` içinde durur.

import {
  NOTIFICATION_TEMPLATE_POLICY,
  PERMISSION_REASONS,
} from "../../constants/notificationTemplatePolicy.js";

export const TEMPLATE_ROLES = Object.freeze(Object.keys(NOTIFICATION_TEMPLATE_POLICY.roles));

/**
 * Oturumdan şablon rolünü çözer.
 *
 * @param {{ isAdmin?: boolean, roles?: string[] }} session `auth` store'unun
 *   `isAdmin` ve `userRoles` değerleri
 * @returns {"super-admin" | "icerik-yoneticisi" | "salt-okunur" | null}
 *   `null`: modüle erişim yok.
 */
export function resolveTemplateRole(session, policy = NOTIFICATION_TEMPLATE_POLICY) {
  if (!session) return null;
  if (session.isAdmin) return "super-admin";
  const roles = session.roles || [];
  // En yetkili eşleşme kazanır.
  for (const role of ["icerik-yoneticisi", "salt-okunur"])
    if ((policy.frappeRoles[role] || []).some((r) => roles.includes(r))) return role;
  return null;
}

/** Rolün yetenek listesi (sunucu yanıtı gelmeden önceki yedek). Tanımsız rol → boş. */
export const capabilitiesOf = (role, policy = NOTIFICATION_TEMPLATE_POLICY) => [
  ...(policy.roles[role]?.can || []),
];

/** Rol bu eylemi yapabilir mi? Tanımsız rol/eylem → hayır (fail-secure). */
export function roleCan(role, action, policy = NOTIFICATION_TEMPLATE_POLICY) {
  if (!role || !action) return false;
  return !!policy.roles[role]?.can.includes(action);
}

export const roleLabel = (role, policy = NOTIFICATION_TEMPLATE_POLICY) =>
  policy.roles[role]?.label || "Yetkisiz";

/** Yetkisiz eylemin neden metni; yetki varsa boş dize. */
export const denyReason = (role, action, policy = NOTIFICATION_TEMPLATE_POLICY) =>
  roleCan(role, action, policy) ? "" : PERMISSION_REASONS[action] || "Bu işlem için yetkiniz yok.";

/**
 * Yayın düğmesinin eylemi.
 *   "publish"  : doğrudan yayınlar (yayinla yetkisi)
 *   "request"  : onaya gönderir (düzenler ama yayınlayamaz; onay akışı açıksa)
 *   "none"     : hiçbiri
 */
export function publishMode(role, policy = NOTIFICATION_TEMPLATE_POLICY) {
  if (roleCan(role, "yayinla", policy)) return "publish";
  if (roleCan(role, "duzenle", policy) && policy.approvalFlow) return "request";
  return "none";
}

/** "Bu sürüme dön" yetkisi (politikadaki eyleme bağlı). */
export const canRestore = (role, policy = NOTIFICATION_TEMPLATE_POLICY) =>
  roleCan(role, policy.restoreRequires, policy);

/** Menü ve route için erişim etiketleri (`auth.canAccess` biçimi). */
export function accessTags(policy = NOTIFICATION_TEMPLATE_POLICY) {
  return ["admin", ...Object.values(policy.frappeRoles).flat()];
}

/** Bildirim şablonları modülünün kök yolu (yalnız içerik rolü olan kullanıcının giriş hedefi). */
export const NOTIFICATION_TEMPLATES_HOME = "/bildirim-sablonlari";

/** Yol bildirim şablonları modülünde mi? */
export const isNotificationTemplatesPath = (path) =>
  path === NOTIFICATION_TEMPLATES_HOME ||
  String(path).startsWith(`${NOTIFICATION_TEMPLATES_HOME}/`);

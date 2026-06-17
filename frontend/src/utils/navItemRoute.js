// Navigation item → route çözümleyici (tek kaynak).
//
// Hem SidePanel'deki panel item tıklaması hem de navigation store'un
// switchSection() rail tıklaması bu fonksiyonu kullanır. İki yerde ayrı
// route hesabı, "Mağazam" rail'inin satıcıyı yanlışlıkla dashboard'a
// atmasına yol açıyordu: switchSection sellerOwned doctype'ları için kendi
// kaydının formuna değil generic liste route'una gidiyor, DocTypeListView de
// admin-only liste olduğu için dashboard'a redirect ediyordu.

// Satıcının kendi kaydına doğrudan (form view) yönlenmesi gereken DocType'lar.
// Değer fonksiyonu auth.user üzerinden ilgili kayıt adını döndürür.
// NOT: "User Profile" autoname=field:user olduğu için kayıt adı kullanıcının
// email'idir (seller_profile = satıcı kodu, kayıt adı DEĞİL).
const SELLER_DIRECT_FORM = {
  "User Profile": (user) => user?.email,
  "Admin Seller Profile": (user) => user?.admin_seller_profile?.name,
  "KYB Verification": (user) => user?.kyb_verification,
};

/**
 * sellerOwned bir doctype için satıcının kendi kayıt adını döndürür.
 * (örn. "User Profile" → kullanıcının email'i). Eşleşme yoksa undefined.
 * Hem route çözümleme hem de form erişim kontrolü (DocTypeFormView) bunu kullanır.
 */
export function getSellerOwnRecordName(doctype, user) {
  const getName = SELLER_DIRECT_FORM[doctype];
  return getName ? getName(user) : undefined;
}

function buildQuery(filters) {
  if (!filters || typeof filters !== "object") return "";
  const parts = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Bir navigation item'ı için hedef route'u hesaplar.
 *
 * @param {object} item - { route?, doctype?, sellerOwned?, filters?, report? }
 * @param {object} ctx  - { isAdmin: boolean, user: object } (auth store)
 * @returns {string} route path (eşleşme yoksa "#")
 */
export function resolveNavItemRoute(item, { isAdmin, user } = {}) {
  if (!item) return "#";
  if (item.route) return item.route;
  if (item.doctype && item.sellerOwned && !isAdmin) {
    const recordName = getSellerOwnRecordName(item.doctype, user);
    if (recordName)
      return `/app/${encodeURIComponent(item.doctype)}/${encodeURIComponent(recordName)}`;
  }
  if (item.doctype) return `/app/${encodeURIComponent(item.doctype)}${buildQuery(item.filters)}`;
  if (item.report) return `/app/report/${encodeURIComponent(item.report)}`;
  return "#";
}

// Bildirim şablonları — TEST fixture'ı: olay kataloğu (26 olay).
//
// Kaynak: `desing/bildirim-sablonlari-2026-10-02/assets/olay-sozlesmesi.js` (EVENTS).
// Aynı 26 olay, API biçimine (snake_case) çevrildi. Tümü ÖRNEK veridir; YALNIZ birim
// testleri okur (katalog süzme/sayaç testleri). Uygulama kodu bu dosyayı içe aktarmaz —
// B4'te mock adaptörü kaldırılınca `src/mocks/notifications/` buradan taşındı.

const L4 = { tr: "hazir", en: "hazir", ar: "hazir", ru: "hazir" };
const NONE = {};

const ev = (
  key,
  name,
  category,
  recipients,
  channels,
  defaults,
  delivery,
  langs,
  publish,
  updatedBy,
  updatedAt,
  monthly,
  extra = {}
) => ({
  key,
  name,
  category,
  recipients,
  mandatory: !Object.values(channels).includes("secmeli"),
  why: "",
  channels,
  defaults,
  delivery,
  langs: { ...langs },
  publish: { state: publish[0], version: publish[1] },
  updated_by: updatedBy,
  updated_at: updatedAt,
  monthly_estimate: monthly,
  // Yalnız `order.confirmed` için tam içerik var; kalanı olay adından üretilir.
  representative: key !== "order.confirmed",
  review_state: null,
  revision: 1,
  ...extra,
});

const ch = (inapp, email, push, sms) => ({ inapp, email, push, sms });
const Z = "zorunlu";
const S = "secmeli";
const K = "kapali";
const SA = "Süper admin";
const IY = "İçerik yöneticisi";

export const SEED_EVENTS = [
  // Hesap ve güvenlik: tamamı zorunlu
  ev(
    "identity.otp",
    "Doğrulama kodu",
    "account",
    ["buyer", "seller"],
    ch(K, Z, K, Z),
    NONE,
    "aninda",
    { tr: "hazir", en: "hazir", ar: "bekliyor", ru: "bekliyor" },
    ["yayinda", 4],
    SA,
    "2026-09-07 07:55:00",
    5200,
    { why: "Giriş ve işlem onayı için tek kullanımlık kod; kodsuz işlem tamamlanamaz." }
  ),
  ev(
    "identity.password_reset",
    "Şifre sıfırlama ve hesap güvenliği",
    "account",
    ["buyer", "seller"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    { tr: "hazir", en: "hazir", ar: "bekliyor", ru: "bekliyor" },
    ["yayinda", 2],
    SA,
    "2026-09-07 07:55:00",
    310,
    { why: "Şifre değişimi ve yeni cihaz girişi; hesabı korur." }
  ),
  ev(
    "payment.receipt",
    "Ödeme makbuzu",
    "account",
    ["buyer", "seller"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "eksik" },
    ["yayinda", 3],
    SA,
    "2026-08-11 10:30:00",
    75,
    { why: "Ödemenin kaydıdır; her ödeme sonrası gönderilir. Fatura ayrıca düzenlenir." }
  ),
  ev(
    "account.status",
    "Hesap durumu",
    "account",
    ["buyer", "seller"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    L4,
    ["yayinda", 1],
    SA,
    "2026-06-15 16:40:00",
    35,
    { why: "KYB/KYC sonucu ve askıya alma kararları; hesabın kullanımını doğrudan etkiler." }
  ),
  ev(
    "identity.suspicious_login",
    "Şüpheli giriş",
    "account",
    ["admin"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    L4,
    ["yayinda", 2],
    SA,
    "2026-09-07 07:55:00",
    40,
    { why: "Yönetici hesabına olağan dışı giriş denemesi." }
  ),

  // Siparişler
  ev(
    "order.received",
    "Yeni sipariş",
    "orders",
    ["seller"],
    ch(Z, S, S, K),
    { email: true, push: true },
    "aninda",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 5],
    SA,
    "2026-09-03 11:05:00",
    1200
  ),
  ev(
    "order.confirm_reminder",
    "Sipariş onay hatırlatması",
    "orders",
    ["seller"],
    ch(Z, S, S, K),
    { email: true, push: true },
    "aninda",
    { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    IY,
    "2026-09-20 10:15:00",
    180
  ),
  ev(
    "order.confirmed",
    "Sipariş onaylandı",
    "orders",
    ["buyer"],
    ch(Z, S, S, K),
    { email: true, push: true },
    "ozetlenebilir",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "hazir" },
    ["yayinda-taslak", 3],
    IY,
    "2026-09-12 14:32:00",
    1200
  ),
  ev(
    "order.shipped",
    "Kargoya verildi",
    "orders",
    ["buyer", "seller"],
    ch(Z, S, S, K),
    { email: false, push: true },
    "ozetlenebilir",
    L4,
    ["yayinda", 2],
    IY,
    "2026-08-28 09:10:00",
    1150
  ),
  ev(
    "order.delivered",
    "Teslim edildi",
    "orders",
    ["buyer", "seller"],
    ch(Z, S, S, K),
    { email: false, push: true },
    "ozetlenebilir",
    L4,
    ["yayinda", 1],
    IY,
    "2026-08-28 09:14:00",
    1100
  ),
  ev(
    "order.cancelled",
    "İptal ve iade",
    "orders",
    ["buyer", "seller"],
    ch(Z, S, S, K),
    { email: true, push: true },
    "aninda",
    L4,
    ["yayinda", 1],
    IY,
    "2026-06-15 16:40:00",
    90
  ),

  // Teklif ve RFQ
  ev(
    "rfq.created",
    "Yeni teklif isteği",
    "rfq",
    ["seller"],
    ch(Z, S, S, K),
    { email: true, push: true },
    "ozetlenebilir",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "kopya" },
    ["yayinda", 2],
    IY,
    "2026-09-30 17:21:00",
    640
  ),
  ev(
    "rfq.quoted",
    "Teklif yanıtı geldi",
    "rfq",
    ["buyer"],
    ch(Z, K, S, K),
    { push: true },
    "ozetlenebilir",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 2],
    IY,
    "2026-08-19 13:50:00",
    640
  ),
  ev(
    "rfq.expiring",
    "Teklif süresi doluyor",
    "rfq",
    ["buyer", "seller"],
    ch(Z, K, S, K),
    { push: true },
    "aninda",
    { tr: "hazir", en: "eksik", ar: "eksik", ru: "eksik" },
    ["taslak", 0],
    IY,
    "2026-10-01 09:02:00",
    210
  ),

  // Mağaza ve başvuru
  ev(
    "store.application_result",
    "Başvuru durumu",
    "store",
    ["seller"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    SA,
    "2026-06-15 16:40:00",
    35,
    {
      why: "Satıcı başvurusunun onayı ya da ek belge isteği; mağazanın açılmasını doğrudan etkiler.",
    }
  ),
  ev(
    "store.document_expiring",
    "Belge süresi doluyor",
    "store",
    ["seller"],
    ch(Z, Z, K, K),
    NONE,
    "aninda",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 2],
    IY,
    "2026-09-04 08:45:00",
    60,
    { why: "Süresi dolan belge yenilenmezse satış durabilir." }
  ),
  ev(
    "store.moderation_result",
    "Ürün moderasyon sonucu",
    "store",
    ["seller"],
    ch(Z, S, K, K),
    { email: true },
    "ozetlenebilir",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    IY,
    "2026-07-02 12:00:00",
    420
  ),
  ev(
    "store.showcase_changed",
    "Vitrin değişikliği",
    "store",
    ["seller"],
    ch(Z, S, K, K),
    { email: false },
    "ozetlenebilir",
    { tr: "hazir", en: "eksik", ar: "eksik", ru: "eksik" },
    ["taslak", 0],
    IY,
    "2026-09-29 15:18:00",
    50
  ),

  // Değerlendirmeler
  ev(
    "review.created",
    "Yeni yorum",
    "reviews",
    ["seller"],
    ch(Z, K, S, K),
    { push: true },
    "ozetlenebilir",
    L4,
    ["yayinda", 1],
    IY,
    "2026-07-02 12:00:00",
    480
  ),
  ev(
    "review.replied",
    "Yoruma yanıt",
    "reviews",
    ["buyer", "seller"],
    ch(Z, K, S, K),
    { push: true },
    "ozetlenebilir",
    { tr: "hazir", en: "eksik", ar: "eksik", ru: "eksik" },
    ["taslak", 0],
    IY,
    "2026-09-29 15:18:00",
    300
  ),

  // Lojistik
  ev(
    "shipment.delayed",
    "Kargo gecikti",
    "logistics",
    ["buyer", "seller"],
    ch(Z, S, S, K),
    { email: false, push: true },
    "aninda",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "bekliyor" },
    ["yayinda", 3],
    SA,
    "2026-09-26 18:03:00",
    220
  ),
  ev(
    "shipment.address_issue",
    "Teslimat adresi sorunu",
    "logistics",
    ["buyer", "seller"],
    ch(Z, S, S, S),
    { email: true, push: true, sms: false },
    "aninda",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    IY,
    "2026-09-26 18:20:00",
    65
  ),

  // Abonelik ve ödemeler
  ev(
    "subscription.renewing",
    "Abonelik yenileme hatırlatması",
    "billing",
    ["seller"],
    ch(Z, S, K, K),
    { email: true },
    "aninda",
    { tr: "hazir", en: "hazir", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    SA,
    "2026-08-11 10:30:00",
    75
  ),
  ev(
    "payment.failed",
    "Ödeme başarısız",
    "billing",
    ["buyer", "seller"],
    ch(Z, Z, S, Z),
    { push: true },
    "aninda",
    L4,
    ["yayinda", 2],
    SA,
    "2026-08-22 10:12:00",
    140
  ),

  // Özet e-postaları
  ev(
    "digest.daily",
    "Günlük özet",
    "digest",
    ["buyer", "seller"],
    ch(K, S, K, K),
    { email: true },
    "ozetlenebilir",
    { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    IY,
    "2026-10-01 16:00:00",
    2600
  ),
  ev(
    "digest.weekly",
    "Haftalık özet",
    "digest",
    ["buyer", "seller"],
    ch(K, S, K, K),
    { email: true },
    "ozetlenebilir",
    { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "eksik" },
    ["yayinda", 1],
    IY,
    "2026-10-01 16:05:00",
    410
  ),
];

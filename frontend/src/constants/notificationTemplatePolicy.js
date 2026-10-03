// Bildirim şablonları — ONAY BEKLEYEN kararların TEK yeri.
//
// Buradaki hiçbir değer onaylanmış ürün kuralı DEĞİLDİR (UYGULAMA-PLANI.md
// "Tasarımdan taşınan açık kararlar": T51 yayın yetkisi ve onay akışı, SMS'te ₺).
// Karar çıkınca yalnız bu dosya değişir; ekranlar ve doğrulama buradan okur.
// Asıl yetki denetimi SUNUCUDADIR — bu tablo yalnız görünümü kısar.
//
// Saf veri: Vue ya da `@/` içe aktarımı yok.

export const NOTIFICATION_TEMPLATE_POLICY = Object.freeze({
  /**
   * Rol → yapabildikleri (T51, karar bekliyor).
   *   goruntule | duzenle | yayinla | kanal | test
   * Sunucudaki `notifications/authz.py` `CAPABILITIES` tablosuyla aynı. Ekran sunucunun
   * döndürdüğü `capabilities` listesini kullanır; bu tablo yalnız ilk yanıt gelene kadar yedektir.
   */
  roles: Object.freeze({
    "super-admin": {
      label: "Süper admin",
      can: ["goruntule", "duzenle", "yayinla", "kanal", "test"],
    },
    "icerik-yoneticisi": { label: "İçerik yöneticisi", can: ["goruntule", "duzenle", "test"] },
    "salt-okunur": { label: "Salt okunur", can: ["goruntule"] },
  }),

  /**
   * Frappe rolü → şablon rolü eşlemesi. Backend B2 bu iki rolü seed etti (kimseye atanmadı).
   * `super-admin` ayrıca oturumdaki `is_admin` bayrağından gelir
   * (System Manager / Administrator / Marketplace Admin).
   */
  frappeRoles: Object.freeze({
    "icerik-yoneticisi": ["Notification Content Manager"],
    "salt-okunur": ["Notification Viewer"],
  }),

  /** Yayın yetkisi olmayan düzenleyici "Onaya gönder" kullanır (onay akışı tasarlanmadı). */
  approvalFlow: true,

  /** "Bu sürüme dön" hangi yetkiyi ister (prototip: yayın işlemi sayılır). */
  restoreRequires: "yayinla",

  /** Hazır olmayan çeviri yayını engeller mi? (prototip: hayır, uyarı) */
  missingTranslationBlocksPublish: false,

  /**
   * SMS'te ₺ işareti (karar bekliyor).
   * `sendAsText: true` olursa sağlayıcıya `text` gider ve sayaç da öyle ölçer;
   * `false` iken ₺ Unicode sayılır ve uyarı verilir.
   */
  smsCurrency: Object.freeze({ symbol: "₺", text: "TL", sendAsText: false }),
});

/** Yetkisiz eylemin yanında gösterilen neden metni. */
export const PERMISSION_REASONS = Object.freeze({
  duzenle: "Salt okunur rol içerik düzenleyemez.",
  yayinla: "Yayınlama yetkisi yalnız Süper admin rolünde.",
  kanal: "Kanal kararını yalnız Süper admin değiştirir.",
  test: "Test gönderimi için İçerik yöneticisi ya da Süper admin rolü gerekir.",
});

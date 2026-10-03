// Bildirim şablonları — ortak sözlük (kanal, durum, dil, alan tanımları).
//
// Kaynak: tasarım sözleşmesi `desing/bildirim-sablonlari-2026-10-02/assets/olay-sozlesmesi.js`
// ve `UYGULAMA-PLANI.md` "Ortak kavramlar". Durum DEĞERLERİ (zorunlu, secmeli, kapali …)
// API sözleşmesinin parçasıdır; etiketler arayüz metnidir.
//
// Saf veri: Vue ya da `@/` içe aktarımı yok — `node --test` ve mock aynı dosyayı okur.
// Onay bekleyen ürün kararları burada DEĞİL, `notificationTemplatePolicy.js` içinde.

export const CHANNELS = Object.freeze([
  {
    id: "inapp",
    label: "Uygulama içi",
    short: "Uyg.",
    icon: "bell",
    userToggle: false,
    note: "Her bildirim uygulama içinde görünür; bu kanal kullanıcı tarafından kapatılamaz.",
  },
  {
    id: "email",
    label: "E-posta",
    short: "E-posta",
    icon: "mail",
    userToggle: true,
    note: "İstisna kanaldır, maliyetlidir. Özetlenebilir olaylar günlük/haftalık özete girer.",
  },
  {
    id: "push",
    label: "Push",
    short: "Push",
    icon: "smartphone",
    userToggle: true,
    note: "Mobil uygulama kurulu ve cihaz izni açıksa gönderilir.",
  },
  {
    id: "sms",
    label: "SMS",
    short: "SMS",
    icon: "message-square",
    userToggle: true,
    note: "Yalnız işlem SMS'i: doğrulama kodu ve ödeme/teslimat sorunları.",
  },
]);

export const CHANNEL_IDS = Object.freeze(CHANNELS.map((c) => c.id));

/** Kanal durumu (olay × kanal). */
export const CHANNEL_STATES = Object.freeze({
  zorunlu: {
    label: "Zorunlu",
    icon: "lock",
    desc: "Platform gönderir; kullanıcı kapatamaz.",
  },
  secmeli: {
    label: "Kullanıcı seçer",
    icon: "toggle-left",
    desc: "Platform gönderir; kullanıcı kendi tercihinden açıp kapatabilir.",
  },
  kapali: {
    label: "Platformda kapalı",
    icon: "minus",
    desc: "Bu olay bu kanaldan gönderilmez; kullanıcıya anahtar gösterilmez.",
  },
});

/** Gönderim zamanı (yalnız e-posta kanalını etkiler). */
export const DELIVERY = Object.freeze({
  aninda: {
    label: "Her zaman anında",
    short: "Anında",
    icon: "zap",
    desc: "Acil olay. Özet seçilse bile e-postası bekletilmez.",
  },
  ozetlenebilir: {
    label: "Özete girebilir",
    short: "Özetlenir",
    icon: "inbox",
    desc: "Günlük ya da haftalık özet seçildiyse tek e-postada birleştirilir.",
  },
});

/** Çeviri durumu (olay × dil). Yayın durumundan BAĞIMSIZDIR. */
export const TRANSLATION_STATES = Object.freeze({
  hazir: {
    label: "Hazır",
    short: "hazır",
    icon: "check",
    tone: "ok",
    desc: "Çeviri tamamlandı ve gözden geçirildi.",
  },
  bekliyor: {
    label: "Çeviri bekliyor",
    short: "bekliyor",
    icon: "clock",
    tone: "warn",
    desc: "Çeviri istendi; içerik henüz gelmedi ya da gözden geçirilmedi.",
  },
  kopya: {
    label: "Kaynak dilden kopya",
    short: "kopya",
    icon: "copy",
    tone: "warn",
    desc: "İçerik kaynak dilden kopyalandı, çevrilmedi. Yayınlanırsa kullanıcı kaynak dili görür.",
  },
  eksik: {
    label: "Eksik",
    short: "eksik",
    icon: "triangle-alert",
    tone: "err",
    desc: "Bu dilde içerik yok. Gönderimde yedek dile (TR) düşülür.",
  },
});

/** Çeviri akışının sırası: eksik → kopya → bekliyor → hazır. */
export const TRANSLATION_FLOW = Object.freeze(["eksik", "kopya", "bekliyor", "hazir"]);

/** Akıştaki bir sonraki adımın düğmesi. */
export const TRANSLATION_NEXT = Object.freeze({
  eksik: { label: "Kaynak dilden kopyala", icon: "copy" },
  kopya: { label: "Çeviri iste", icon: "send" },
  bekliyor: { label: "Hazır olarak işaretle", icon: "check" },
  hazir: { label: "Yeniden çeviri iste", icon: "rotate-ccw" },
});

/** Yayın yaşam döngüsü (olay). Çeviri durumundan BAĞIMSIZDIR. */
export const PUBLISH_STATES = Object.freeze({
  yayinda: { label: "Yayında", tone: "ok" },
  "yayinda-taslak": { label: "Yayında · yeni taslak var", tone: "warn" },
  taslak: { label: "Taslak", tone: "warn" },
});

export const SAVE_STATES = Object.freeze({
  temiz: { label: "Kaydedildi" },
  degisti: { label: "Kaydedilmemiş değişiklik" },
  kaydediliyor: { label: "Kaydediliyor" },
  basarisiz: { label: "Kaydedilemedi" },
  cakisma: { label: "Başkası değiştirdi" },
});

export const LANGS = Object.freeze([
  { id: "tr", label: "Türkçe", short: "TR", dir: "ltr", source: true },
  { id: "en", label: "English", short: "EN", dir: "ltr" },
  { id: "ar", label: "العربية", short: "AR", dir: "rtl" },
  { id: "ru", label: "Русский", short: "RU", dir: "ltr" },
]);

export const SOURCE_LANG = "tr";

export const CATEGORIES = Object.freeze([
  { id: "account", title: "Hesap ve güvenlik", module: "Kimlik" },
  { id: "orders", title: "Siparişler", module: "Sipariş" },
  { id: "rfq", title: "Teklif ve RFQ", module: "RFQ" },
  { id: "store", title: "Mağaza ve başvuru", module: "Mağaza" },
  { id: "reviews", title: "Değerlendirmeler", module: "Değerlendirme" },
  { id: "logistics", title: "Lojistik", module: "Lojistik" },
  { id: "billing", title: "Abonelik ve ödemeler", module: "Abonelik" },
  { id: "digest", title: "Özet e-postaları", module: "Özet" },
]);

export const RECIPIENTS = Object.freeze({
  buyer: { label: "Alıcı", icon: "user" },
  seller: { label: "Satıcı", icon: "store" },
  admin: { label: "Yönetici", icon: "shield" },
});

/**
 * Kanal başına düzenlenen alanlar. `id` API'deki alan adıdır
 * (`draft.<kanal>.<dil>.<id>`).
 *   type: input | textarea | html | text (düz metin) | sms
 */
export const FIELDS = Object.freeze({
  email: [
    { id: "subject", label: "Konu", type: "input", max: 78, required: true },
    {
      id: "preheader",
      label: "Ön başlık",
      type: "input",
      max: 110,
      hint: "Gelen kutusunda konunun yanında görünen özet.",
    },
    { id: "html", label: "Gövde", type: "html", required: true },
    {
      id: "text",
      label: "Düz metin",
      type: "text",
      hint: "HTML görüntüleyemeyen istemciler için.",
    },
  ],
  inapp: [
    { id: "title", label: "Başlık", type: "input", max: 80, required: true },
    { id: "message", label: "Mesaj", type: "textarea", max: 200, required: true },
    { id: "action_label", label: "Düğme metni", type: "input", max: 24, half: true },
    {
      id: "action_url",
      label: "Düğme bağlantısı",
      type: "input",
      half: true,
      mono: true,
      url: true,
      hint: "https://… adresi, /yol ya da bir bağlantı değişkeni.",
    },
  ],
  push: [
    { id: "title", label: "Başlık", type: "input", max: 50, required: true },
    { id: "body", label: "Gövde", type: "textarea", max: 120, required: true },
  ],
  sms: [
    {
      id: "text",
      label: "SMS metni",
      type: "sms",
      required: true,
      hint: "Tek metin alanı. Bağlantı ve değişkenler de karakter sayısına girer.",
    },
  ],
});

/** Zorunlu değişken eksikse hatanın gösterildiği alan. */
export const PRIMARY_FIELD = Object.freeze({
  email: "html",
  inapp: "message",
  push: "body",
  sms: "text",
});

/** Olay listesinde sayfa boyu ("Daha fazla göster" adımı). */
export const PAGE_SIZE = 10;

/** Önizleme her zaman gerçek CSS genişliğinde çizilir. */
export const PREVIEW_WIDTH = Object.freeze({ mobile: 360, desktop: 600 });

export const channelOf = (id) => CHANNELS.find((c) => c.id === id) || null;
export const langOf = (id) => LANGS.find((l) => l.id === id) || null;
export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || null;
export const fieldOf = (channel, id) => (FIELDS[channel] || []).find((f) => f.id === id) || null;

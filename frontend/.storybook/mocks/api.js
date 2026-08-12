/**
 * Storybook için `@/utils/api` sahtesi.
 *
 * NEDEN GEREKLİ:
 *   Paylaşılan 27 component'ten yedisi Frappe backend'ine istek atıyor
 *   (LinkInput, RichTextEditor, CategoryTreePicker, CoreDocTypePicker,
 *   SmartFieldDropdown, FilterBuilder, WidgetPreview). Storybook'ta backend
 *   yok; mock olmadan bu component'ler sonsuz "yükleniyor" durumunda kalır ya
 *   da hata fırlatır.
 *
 * NEDEN msw DEĞİL:
 *   `src/utils/api.js` TEK bir default export — tüm istekler oradan geçiyor
 *   (admin-panel CLAUDE.md kuralı). Tek modülü alias'lamak, ağ katmanını
 *   taklit eden bir servis worker kurmaktan hem basit hem daha az kırılgan.
 *   Alias `.storybook/main.js` içinde tanımlı.
 *
 * SÖZLEŞME UYUMU — EN KRİTİK NOKTA:
 *   Yanıt ŞEKİLLERİ gerçek `api.js` ile birebir aynı olmalı. `request()` ham
 *   Frappe yanıtını döndürüyor, yani sarmalama metoda göre değişiyor:
 *
 *     getList / createDoc / updateDoc  →  { data: [...] }     (/api/resource)
 *     getMeta                          →  { message: meta }   (elle sarılıyor)
 *     callMethod / searchLink / getCount → { message: ... }   (/api/method)
 *     uploadFile                       →  string (file_url)   (elle çıkarılıyor)
 *
 *   Şekil saparsa story yalan söyler: tasarım onaylanır, gerçek veriye
 *   bağlanınca ekran boş gelir. Faz B'de mock fixture'larda aynı ilkeyi
 *   uygulamıştık.
 *
 * GECİKME:
 *   Her çağrı küçük bir gecikmeyle döner; yükleniyor durumlarının tasarımda
 *   gerçekten görülebilmesi için. `mockApi.delayMs = 0` ile kapatılabilir.
 */

const DEFAULT_DELAY_MS = 180;

const state = {
  delayMs: DEFAULT_DELAY_MS,
  /** Story'ler bunu değiştirerek hata durumunu tetikleyebilir. */
  failNextCall: false,
};

function wait(ms = state.delayMs) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respond(payload) {
  await wait();
  if (state.failNextCall) {
    state.failNextCall = false;
    const error = new Error("Sunucuya ulaşılamadı (Storybook mock)");
    error.status = 503;
    throw error;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Sabit örnek veri — lojistik bağlamıyla tutarlı
// ---------------------------------------------------------------------------

const LINK_RESULTS = [
  { value: "YK", description: "Yurtiçi Kargo" },
  { value: "AK", description: "Aras Kargo" },
  { value: "MNG", description: "MNG Kargo" },
  { value: "PTT", description: "PTT Kargo" },
  { value: "SK", description: "Sürat Kargo" },
];

const LIST_ROWS = [
  { name: "YK", provider_name: "Yurtiçi Kargo", provider_code: "YK", is_active: 1 },
  { name: "AK", provider_name: "Aras Kargo", provider_code: "AK", is_active: 1 },
  { name: "MNG", provider_name: "MNG Kargo", provider_code: "MNG", is_active: 1 },
];

const META_FIELDS = [
  { fieldname: "provider_name", label: "Sağlayıcı Adı", fieldtype: "Data", reqd: 1 },
  { fieldname: "provider_code", label: "Sağlayıcı Kodu", fieldtype: "Data", reqd: 1 },
  {
    fieldname: "provider_type",
    label: "Sağlayıcı Tipi",
    fieldtype: "Select",
    options: "Kargo\nAmbar\nKurye\nMarketplace",
  },
  { fieldname: "country", label: "Ülke", fieldtype: "Link", options: "Country" },
  // Frappe Check alanı 0/1 TAMSAYI döndürür, boolean değil.
  { fieldname: "is_active", label: "Aktif", fieldtype: "Check" },
];

const CATEGORY_TREE = [
  { value: "kargo", title: "Kargo", expandable: 1 },
  { value: "ambar", title: "Ambar", expandable: 1 },
  { value: "kurye", title: "Kurye", expandable: 0 },
];

// ---------------------------------------------------------------------------
// api.js yüzeyinin sahtesi
// ---------------------------------------------------------------------------

const mockApi = {
  /** Story'lerin davranışı ayarlaması için. */
  get delayMs() {
    return state.delayMs;
  },
  set delayMs(value) {
    state.delayMs = value;
  },
  failOnce() {
    state.failNextCall = true;
  },

  // -- okuma: /api/resource → { data: [...] } --
  getList: (_doctype, _options = {}) => respond({ data: LIST_ROWS }),
  getDoc: (_doctype, name) => respond({ data: { name, ...LIST_ROWS[0] } }),

  // -- /api/method → { message: ... } --
  getCount: () => respond({ message: LIST_ROWS.length }),
  getMeta: (doctype) => respond({ message: { name: doctype, fields: META_FIELDS } }),
  searchLink: (_doctype, query = "") =>
    respond({
      message: LINK_RESULTS.filter((row) =>
        row.description.toLowerCase().includes(String(query).toLowerCase())
      ),
    }),

  // -- yazma: /api/resource → { data: {...} } --
  createDoc: (_doctype, values) => respond({ data: { name: "YENI-001", ...values } }),
  updateDoc: (_doctype, name, values) => respond({ data: { name, ...values } }),
  deleteDoc: () => respond({ message: "ok" }),

  // -- genel çağrı: tüketiciler res.message okuyor --
  callMethod: (method) => {
    const target = String(method);
    if (target.includes("category") || target.includes("tree")) {
      return respond({ message: CATEGORY_TREE });
    }
    return respond({ message: { note: "Storybook mock yanıtı", method: target } });
  },
  callMethodGET: (method) => mockApi.callMethod(method),

  // -- dosya: api.js file_url'i çıkarıp STRING döndürüyor --
  uploadFile: () => respond("/files/storybook-ornek.png"),
  uploadCertDocument: () => respond("/files/storybook-belge.pdf"),

  // -- oturum (component'ler kullanmıyor ama yüzey eksik kalmasın) --
  getLoggedUser: () => respond("storybook@istoc.com"),
  getSessionUser: () => respond({ user: "storybook@istoc.com", full_name: "Storybook" }),
  getCsrfToken: () => "storybook-csrf-token",
  setCsrfToken: () => undefined,
  login: () => respond({ ok: true }),
  logout: () => respond({ ok: true }),
  register: () => respond({ ok: true }),
  forgotPassword: () => respond({ ok: true }),
};

export default mockApi;

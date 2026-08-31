// İade akışı mock'u — 15-FE (admin-panel tarafı).
//
// NEDEN VAR:
//   15-BE'nin uçlarının hiçbiri yazılmadı; `Return Request` DocType'ı bile yok
//   (ölçüldü 31 Ağu). Dört ekran (I1 kuyruk · I2 karar · I3 depo kontrolü ·
//   I4 kapanış) bileşen olarak YAZILI ve Storybook'ta duruyor ama manifestte
//   `ready: false` ile kapalı, `views/logistics/returns/` dizini boş.
//
//   Bu modül o uçların yerine geçen ÇALIŞAN bir taklit: satıcı karar veriyor,
//   depo kalem kalem kontrol ediyor, tutar kalem kararlarından türüyor,
//   yönetici kapatıyor ve kayıt kilitleniyor. Dört ekran AYNI durumu
//   paylaşıyor — karar I2'de verilince I1 sayacı düşüyor, I3 açılıyor.
//
// `FE-MOCK-DISIPLINI.md` §2:
//   §2.1 kalıcılık           → localStorage + resetMockData()
//   §2.2 durum geçişleri     → tek kaynak loadState(); listeler ondan türer
//   §2.3 gerçek çıktı        → iade etiketi (storefront tarafında; panelde
//                              etiket gösterilmiyor, yalnız adı taşınıyor)
//   §2.4 tetiklenebilir hata → setFault(); FAULT_CODES sözleşme §3 ile birebir
//
// VERİ KAYNAĞI: `src/mocks/logistics/return_request.json` — sözleşmeden
// ÜRETİLMİŞ fixture (`gen_logistics_types.py`). Alan adları backend
// yazıldığında da aynı kalır.

// GÖRELİ yol + import niteliği — `@` alias'ı DEĞİL.
//
// `catalogMeta.js` başlığında yazılı tuzak: alias kullanan modül
// `node --test`'ten GÖRÜNMÜYOR ve o yüzden orada saf mantık ayrı dosyaya
// çıkarılmıştı. Burada mantığın kendisi mock — ayıracak bir parça yok.
// Göreli yol ikisini de çözüyor: Vite de Node da okuyor, veri yine
// sözleşmeden üretilen fixture'dan geliyor (elle kopyalanmıyor).
import returnRequestJson from "../mocks/logistics/return_request.json" with { type: "json" };

const STORAGE_KEY = "logistics.mock.returns.v1";
const FAULT_KEY = "logistics.mock.returns.fault";
const faultStore = () => (typeof sessionStorage !== "undefined" ? sessionStorage : localStorage);

/** Oturumdaki satıcı — `asSeller` kapsamı bununla süzülüyor. */
const SELLER_ME = "SEL-00001";

/** Bu süreyi aşan karar bekleyişi operasyonda gecikme sayılıyor. */
export const DECISION_WARN_HOURS = 48;

// ── tohum ────────────────────────────────────────────────────────────

/**
 * Fixture'ı ekranların beklediği şekle getirir.
 *
 * Liste satırı yalnız LIST alanlarını taşıyor (sözleşme §1.1); detayı olan
 * kayda DETAIL alanları ve kalemler ekleniyor. Diğerleri kalemsiz duruyor ve
 * `getReturnRequest` çağrıldığında minimum kalem kümesiyle türetiliyor —
 * fixture DEĞİŞTİRİLMİYOR, üretilmiş dosya.
 */
function seed() {
  const liste = returnRequestJson.default.data.items;
  const detay = returnRequestJson.detail.data;

  return {
    seller: SELLER_ME,
    kayitlar: liste.map((satir) =>
      satir.name === detay.name
        ? { ...satir, ...detay }
        : { ...satir, items: turetilmisKalemler(satir) }
    ),
  };
}

/**
 * Detayı olmayan kayıtlar için kalem üretir.
 *
 * Uydurulmuş alan YOK: alan adları ve tipleri `RETURN_ITEM_FIELDS` ile
 * birebir. Kontrol edilmemiş kalemde `received_qty`/`accepted_qty` `null` —
 * "0" yazmak "depoya hiç ulaşmadı" demek olurdu ve depo ekranı yanlış uyarı
 * verirdi.
 */
function turetilmisKalemler(satir) {
  const kapali = Number(satir.is_closed) === 1;
  return [
    {
      item: "LST-00121",
      item_name: "Pamuklu Kumaş Topu 40m",
      requested_qty: 4,
      received_qty: kapali ? 4 : null,
      accepted_qty: kapali ? 4 : null,
      uom: "Top",
      inspection_result: kapali ? "ok" : null,
      inspection_note: kapali ? "Kontrol tamamlandı." : null,
      unit_refund: 620.0,
    },
  ];
}

// ── kalıcılık ────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const kayitli = JSON.parse(raw);
      if (kayitli?.seller === SELLER_ME) return kayitli;
    }
  } catch {
    // Bozuk/erişilemez depolama — tohuma dön, ekranı kırma.
  }
  const taze = seed();
  saveState(taze);
  return taze;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode: oturum içinde çalışır, yenileyince sıfırlanır.
  }
}

/** Demo verisini tohuma döndürür — DEMO panelindeki "Sıfırla" bunu çağırıyor. */
export function resetMockData() {
  saveState(seed());
  clearFault();
}

// ── tetiklenebilir hatalar (§2.4) ────────────────────────────────────
//
// Kodlar `15-FE-VERI-SOZLESMESI.md` §3 ile BİREBİR. Uydurulmuş bir kod
// mock'ta denenip gerçek uçta hiç gelmezse ekran o dalı hiç sınamamış olur.

export const FAULT_CODES = Object.freeze([
  { code: "PERMISSION_DENIED", scope: "read", label: "Yetki yok" },
  { code: "RETURN_ALREADY_DECIDED", scope: "decide", label: "Zaten karara bağlanmış" },
  { code: "RETURN_CLOSED", scope: "write", label: "Kapanmış kayıt" },
  { code: "DECISION_NOTE_REQUIRED", scope: "decide", label: "Red gerekçesi zorunlu" },
  { code: "ACCEPTED_EXCEEDS_RECEIVED", scope: "inspect", label: "Kabul > ulaşan" },
  { code: "RETURN_NOT_CLOSABLE", scope: "close", label: "Ön koşul eksik" },
  { code: "INTERNAL_ERROR", scope: "read", label: "Beklenmeyen sunucu hatası" },
]);

const MESAJ = {
  PERMISSION_DENIED: "Bu kayıtları görüntüleme yetkiniz yok.",
  RETURN_ALREADY_DECIDED: "Bu iade talebi zaten karara bağlanmış.",
  RETURN_CLOSED: "Bu iade kapatıldı ve artık değiştirilemez.",
  DECISION_NOTE_REQUIRED: "Red kararında gerekçe zorunlu.",
  ACCEPTED_EXCEEDS_RECEIVED: "Kabul edilen miktar, depoya ulaşandan fazla olamaz.",
  RETURN_NOT_CLOSABLE: "Kapanış ön koşulları tamamlanmadı.",
  INTERNAL_ERROR: "Beklenmeyen bir hata oluştu.",
};

export function getFault() {
  try {
    return faultStore().getItem(FAULT_KEY) || null;
  } catch {
    return null;
  }
}

export function setFault(code) {
  try {
    if (code) faultStore().setItem(FAULT_KEY, code);
    else faultStore().removeItem(FAULT_KEY);
  } catch {
    // yok sayılır — hata tetikleyicisi bir kolaylık
  }
}

export function clearFault() {
  setFault(null);
}

function fail(code, message, extra = {}) {
  const err = new Error(message ?? MESAJ[code] ?? MESAJ.INTERNAL_ERROR);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

/**
 * @param scopes Bu çağrının tetikleyebileceği kapsamlar.
 *
 * ÇOKLU kapsam gerekiyor: `RETURN_CLOSED` her YAZMA yolunda anlamlı, yalnız
 * karar verirken değil. Tek kapsamlı sürümde o kod hiçbir fonksiyon
 * tarafından sorgulanmıyordu — DEMO panelinden seçilebiliyor ama hiçbir şey
 * yapmıyordu. "Her FAULT kodu tetiklenebiliyor" testi bunu yakaladı
 * (31 Ağu); denenemeyen bir hata senaryosu, olmayan bir senaryodur.
 */
function throwIfFaulted(...scopes) {
  const kod = getFault();
  const tanim = FAULT_CODES.find((f) => f.code === kod);
  if (!tanim || !scopes.includes(tanim.scope)) return;
  throw fail(kod);
}

// ── yardımcılar ──────────────────────────────────────────────────────

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

/** Vue proxy'si localStorage'a yazılamıyor — düz kopya. */
const plain = (value) => JSON.parse(JSON.stringify(value));

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Sözleşme §1.1 — liste satırı yalnız LIST alanlarını taşır (karar K-6). */
function listeSatiri(k) {
  return {
    name: k.name,
    order: k.order,
    shipment: k.shipment ?? null,
    seller_profile: k.seller_profile,
    buyer: k.buyer,
    status: k.status,
    reason: k.reason,
    requested_at: k.requested_at,
    decided_at: k.decided_at ?? null,
    is_closed: k.is_closed ?? 0,
  };
}

/** Tenant izolasyonu (§6.1) — satıcı yalnız KENDİ satışlarının iadesini görür. */
function kapsam(state, asSeller) {
  return asSeller ? state.kayitlar.filter((k) => k.seller_profile === SELLER_ME) : state.kayitlar;
}

function bul(state, name) {
  const kayit = state.kayitlar.find((k) => k.name === name);
  if (!kayit) throw fail("NOT_FOUND", "İade talebi bulunamadı.");
  return kayit;
}

/** Kapanmış kayıt DEĞİŞTİRİLEMEZ (TUR-116) — her yazma kapısında. */
function kapaliysaDur(kayit) {
  if (Number(kayit.is_closed) === 1) throw fail("RETURN_CLOSED");
}

/**
 * Sözleşme §4.3 — iade tutarı SUNUCUDA türetilir.
 *
 * Operatör elle tutar girmiyor; girse bile yok sayılır. Elle girilen bir
 * rakam kalem kararlarıyla tutarsız kalırdı.
 */
function tutarHesapla(items) {
  return (items ?? []).reduce(
    (t, k) => t + Number(k.accepted_qty ?? 0) * Number(k.unit_refund ?? 0),
    0
  );
}

/** Sözleşme §2.7 — kapanış ön koşulları, hangisinin eksik olduğu ayrı ayrı. */
function kapanisKontrolleri(kayit) {
  const kalemler = kayit.items ?? [];
  return {
    decided: Boolean(kayit.decided_at),
    inspected: kalemler.length > 0 && kalemler.every((k) => Boolean(k.inspection_result)),
    refund: kayit.refund_amount != null,
  };
}

// ── uçların taklidi ──────────────────────────────────────────────────

export const returnsMock = {
  /**
   * Sözleşme §2.2 · `list_return_requests`
   *
   * `status_counts` TÜM kapsamdan sayılıyor, süzülmüş listeden değil —
   * aksi hâlde "Talep edildi 1" filtresine tıklayınca sayaç 1'den 1'e
   * düşer ve kullanıcı diğer durumlarda ne kaldığını göremezdi
   * (aynı tuzak 14-FE kanıt kuyruğunda ölçülmüştü).
   */
  async listReturnRequests({ status = null, page = 1, pageSize = 50, asSeller = false } = {}) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();

    const tumu = kapsam(state, asSeller);
    const status_counts = tumu.reduce((sayac, k) => {
      sayac[k.status] = (sayac[k.status] ?? 0) + 1;
      return sayac;
    }, {});

    const suzulmus = status ? tumu.filter((k) => k.status === status) : tumu;
    const bas = (page - 1) * pageSize;

    return {
      items: suzulmus.slice(bas, bas + pageSize).map(listeSatiri),
      total: suzulmus.length,
      page,
      page_size: pageSize,
      status_counts,
    };
  },

  /** Sözleşme §2.3 · `get_return_request` — LIST + DETAIL + kalemler. */
  async getReturnRequest(name, { asSeller = false } = {}) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();
    const kayit = bul(state, name);
    // Başkasının kaydı "yok" gibi değil YETKİSİZ diye reddediliyor; kaydın
    // varlığını sızdırmamak da doğru davranış.
    if (asSeller && kayit.seller_profile !== SELLER_ME) throw fail("PERMISSION_DENIED");
    return plain(kayit);
  },

  /**
   * Sözleşme §2.5 · `decide_return_request`
   *
   * Onaylanan iade için ters yönlü sevkiyat ve etiket AYNI çağrıda üretiliyor
   * ve yanıtta dönüyor — ekran sonucu aynı yerde gösteriyor (kabul K9).
   * Ayrı bir uç gerekseydi akış ikiye bölünürdü.
   */
  async decideReturnRequest({
    name,
    decision,
    decision_note = null,
    create_return_shipment = true,
  }) {
    await delay();
    throwIfFaulted("decide", "write");
    const state = loadState();
    const kayit = bul(state, name);

    kapaliysaDur(kayit);
    if (kayit.decided_at) throw fail("RETURN_ALREADY_DECIDED");
    if (!["approved", "rejected"].includes(decision)) {
      throw fail("VALIDATION_ERROR", "Geçersiz karar değeri.");
    }
    // Red gerekçesi zorunlu: alıcıya "hayır" deyip sebebini söylememek ilk
    // itiraz sebebi. Onayda serbest.
    if (decision === "rejected" && String(decision_note ?? "").trim().length < 10) {
      throw fail("DECISION_NOTE_REQUIRED");
    }

    const onayli = decision === "approved";
    const iadeSevkiyati = onayli && create_return_shipment ? yeniSevkiyatNo(state) : null;

    Object.assign(kayit, {
      status: decision,
      decided_at: nowStamp(),
      decision_note: decision_note ?? null,
      return_shipment: iadeSevkiyati,
      // Etiket adı sözleşmedeki alan; storefront onu açılabilir bir belgeye
      // çeviriyor (`returnLabelSeed.ts`). Panelde etiket gösterilmiyor.
      return_label_url: iadeSevkiyati ? `iade-${name}` : null,
    });
    saveState(state);
    return plain(kayit);
  },

  /**
   * Sözleşme §2.6 · `save_return_inspection`
   *
   * Kısmi kaydetme serbest — operatör depoda parça parça çalışıyor.
   * Yanıt güncel kalemleri geri döndürüyor: ekran dönen değeri yerine
   * koyuyor, sunucunun düzelttiği bir değer sessizce kaybolmasın.
   */
  async saveReturnInspection({ name, items }) {
    await delay();
    throwIfFaulted("inspect", "write");
    const state = loadState();
    const kayit = bul(state, name);
    kapaliysaDur(kayit);

    for (const gelen of items ?? []) {
      const kalem = (kayit.items ?? []).find((k) => k.item === gelen.item);
      if (!kalem) throw fail("VALIDATION_ERROR", "Bilinmeyen kalem.");

      const ulasan = gelen.received_qty ?? kalem.received_qty;
      const kabul = gelen.accepted_qty ?? kalem.accepted_qty;
      // Sessiz geçilirse OLMAYAN mal için para iadesi ödenir.
      if (ulasan != null && kabul != null && Number(kabul) > Number(ulasan)) {
        throw fail("ACCEPTED_EXCEEDS_RECEIVED", null, { fields: { item: gelen.item } });
      }
      const sonuc = gelen.inspection_result ?? kalem.inspection_result;
      const not = gelen.inspection_note ?? kalem.inspection_note;
      if (sonuc && sonuc !== "ok" && !String(not ?? "").trim()) {
        throw fail("VALIDATION_ERROR", "Sorunlu kalemde not zorunlu.");
      }

      Object.assign(kalem, {
        received_qty: ulasan,
        accepted_qty: kabul,
        inspection_result: sonuc,
        inspection_note: not,
      });
    }

    kayit.refund_amount = tutarHesapla(kayit.items);
    // Durum geçişi (§2.2): kontrol başlayınca kayıt "inceleniyor"a geçiyor;
    // I1 kuyruğundaki rozet ve sayaç bundan türüyor, ayrı bir alan tutulmuyor.
    if (kayit.status === "approved" || kayit.status === "in_transit") {
      kayit.status = "inspecting";
    }
    saveState(state);
    return plain(kayit);
  },

  /**
   * Sözleşme §2.7 · `close_return_request`
   *
   * Geri alınamaz. Ön koşul eksikse HANGİSİNİN eksik olduğu
   * `failed_checks` ile dönüyor — tek genel mesaj ekranda hangi satırın
   * sarı olacağını söylemezdi.
   */
  async closeReturnRequest({ name, trigger_refund = true }) {
    await delay();
    throwIfFaulted("close", "write");
    const state = loadState();
    const kayit = bul(state, name);
    kapaliysaDur(kayit);

    const kontroller = kapanisKontrolleri(kayit);
    const eksik = Object.entries(kontroller)
      .filter(([, gecti]) => !gecti)
      .map(([ad]) => ad);
    if (eksik.length) throw fail("RETURN_NOT_CLOSABLE", null, { failed_checks: eksik });

    Object.assign(kayit, {
      status: "closed",
      is_closed: 1,
      closed_at: nowStamp(),
      closed_by: "operasyon@istoc.com",
      refund_triggered_at: trigger_refund ? nowStamp() : null,
    });
    saveState(state);
    return plain(kayit);
  },
};

/** `SHP-2026-000NN` — mevcut en büyük iade sevkiyatının bir fazlası. */
function yeniSevkiyatNo(state) {
  const enBuyuk = state.kayitlar.reduce((max, k) => {
    const n = Number(
      String(k.return_shipment ?? "")
        .split("-")
        .pop()
    );
    return Number.isFinite(n) && n > max ? n : max;
  }, 50);
  return `SHP-2026-${String(enBuyuk + 1).padStart(5, "0")}`;
}

// Teslim kanıtı / teslimat akışları — ÇALIŞAN TAKLİT (14-FE mock).
//
// Bu dosya sahte veri döndüren bir stub DEĞİL; backend'in yerine geçen bir
// taklittir (docs/lojistik/FE-MOCK-DISIPLINI.md). Dört zorunluluk:
//   · Kalıcılık        → localStorage; yenileyince iş durur, sıfırlama yolu var
//   · Durum geçişleri  → TEK doğruluk kaynağı; kovalar/sayaçlar ondan TÜRETİLİR
//   · Gerçek çıktı     → teslim tutanağı gerçekten açılır (ekran tarafında)
//   · Tetiklenebilir hata → sözleşmedeki her kod denenebilir
//
// Sözleşme: docs/lojistik/14-FE-VERI-SOZLESMESI.md — alan adları BİREBİR.
// Uydurulan alan gerçek uca bağlanınca ekranı bozar.
//
// KAPATMA: uçlar yazıldıkça `api/pod.js` içindeki `MOCK` haritasının ilgili
// satırı `false` yapılır; ekranlarda ve store'da hiçbir değişiklik gerekmez.

import {
  CARRIER_BRANCHES,
  EXCEPTION_CODES,
  MOCK_NOW,
  SEED_EVENTS,
  SEED_FLOWS,
  SEED_PODS,
  SEED_SHIPMENTS,
  SELLER_ME,
} from "./podSeed.js";

const STORAGE_KEY = "logistics.mock.pod.v1";

/**
 * Hata tetikleyicisi `sessionStorage`'da: 13-FE'de `localStorage`'a yazılmıştı
 * ve sekme kapanınca bile kalıyordu — ertesi gün "panel bozuk" diye dönüldü.
 */
const FAULT_KEY = "logistics.mock.pod.fault";
const faultStore = () => (typeof sessionStorage !== "undefined" ? sessionStorage : localStorage);

// ── tohum ────────────────────────────────────────────────────────────

/**
 * TEK DOĞRULUK KAYNAĞI.
 *
 * 13-FE'de kuyruk ayrı bir sabit diziydi: paketleme tamamlansa da sevkiyat
 * eski kovasında kalıyordu. Burada `bucket` alanı tohumdan SİLİNİYOR ve her
 * okumada POD durumundan türetiliyor — iki kaynak olamaz.
 */
function seed() {
  const shipments = {};

  for (const row of SEED_SHIPMENTS) {
    const { bucket: _atilan, ...rest } = row;
    shipments[row.shipment] = { ...rest, flow_type: null };
  }
  for (const [flowType, rows] of Object.entries(SEED_FLOWS)) {
    const tip = flowType === "seller" ? "seller_delivery" : "buyer_pickup";
    for (const row of rows) shipments[row.shipment] = { ...row, flow_type: tip };
  }

  return {
    shipments,
    pods: JSON.parse(JSON.stringify(SEED_PODS)),
    events: JSON.parse(JSON.stringify(SEED_EVENTS)),
    audit: [],
  };
}

// ── kalıcılık ────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Bozuk/erişilemez depolama — tohuma dön, ekranı kırma.
  }
  const fresh = seed();
  saveState(fresh);
  return fresh;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode: oturum içinde çalışır, yenileyince sıfırlanır.
  }
}

/** Demo verisini tohuma döndürür — ekrandaki "Sıfırla" bunu çağırıyor. */
export function resetMockData() {
  saveState(seed());
  clearFault();
}

// ── tetiklenebilir hatalar ───────────────────────────────────────────

/** @returns {"conflict"|"permission"|"payment"|"code"|"recorded"|"internal"|null} */
export function getFault() {
  try {
    return faultStore().getItem(FAULT_KEY) || null;
  } catch {
    return null;
  }
}

export function setFault(kind) {
  try {
    if (kind) faultStore().setItem(FAULT_KEY, kind);
    else faultStore().removeItem(FAULT_KEY);
  } catch {
    // yok sayılır
  }
}

export function clearFault() {
  setFault(null);
}

function fail(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

/**
 * Sözleşme §3'teki her kodu ekranda görülebilir kılar.
 *
 * `scope` ayrımı olmasaydı "ödeme kapısı" hatası kuyruğu da patlatırdı ve
 * tetikleyici açıkken hiçbir ekran açılmazdı.
 */
function throwIfFaulted(scope) {
  const fault = getFault();
  if (!fault) return;
  if (fault === "permission") throw fail("CAPABILITY_REQUIRED", "Bu işlem için yetkiniz yok.");
  if (fault === "internal") throw fail("INTERNAL_ERROR", "Beklenmeyen bir hata oluştu.");
  if (fault === "conflict" && scope === "write")
    throw fail("CONFLICT", "Bu kaydı başka bir kullanıcı sizden sonra değiştirdi.");
  if (fault === "recorded" && scope === "write")
    throw fail("POD_ALREADY_RECORDED", "Bu sevkiyatın teslim kanıtı zaten kaydedilmiş.");
  if (fault === "payment" && scope === "handover")
    throw fail("PAYMENT_REQUIRED", "Teslim öncesi ödeme tamamlanmamış.");
  if (fault === "code" && scope === "handover")
    throw fail("DELIVERY_CODE_NOT_VERIFIED", "Teslim kodu doğrulanmadı.");
}

// ── yardımcılar ──────────────────────────────────────────────────────

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

/**
 * Vue reactive PROXY'yi düz veriye indirger.
 *
 * ÖLÇÜLDÜ (13-FE, E2E 2026-08-18): store yükü proxy olarak gönderiyor, iç içe
 * alanlar `structuredClone`'a girince "could not be cloned" hatası veriyor ve
 * KAYDETME HİÇ ÇALIŞMIYOR. Birim testinde çıkmıyor — orada düz nesne geçiliyor.
 */
function plain(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

/** Mock evreninin "şimdi"si — gerçek saate bağlanmıyor ki tohum tutarlı kalsın. */
function nowStamp() {
  return MOCK_NOW;
}

function toDate(v) {
  return v ? new Date(String(v).replace(" ", "T")) : null;
}

/**
 * Teslimden bu yana geçen saat.
 *
 * SUNUCU HESAPLAR (sözleşme §2.1): istemcinin saati yanlışsa "31 saattir
 * bekliyor" uyarısı yalan söyler.
 */
function hoursSince(iso) {
  const t = toDate(iso);
  if (!t) return null;
  return Math.max(0, Math.round((toDate(MOCK_NOW) - t) / 36e5));
}

// ── türetme: kova ────────────────────────────────────────────────────

/**
 * Kovayı SEVKİYAT + POD'dan türetir. Ayrı `bucket` alanı YOK.
 *
 * Sıra önemli: tutarsızlık, satıcı beyanından önce gelir. Satıcı eksik teslim
 * beyan ettiyse asıl iş "tutarsızlığı çöz"dür, "beyanı doğrula" değil.
 */
function bucketOf(shipment, pod) {
  if (shipment.status !== "Delivered") return null;
  if (!pod) return "awaiting";
  if (pod.has_discrepancy) return "discrepancy";
  if (pod.source === "seller") return "seller_claim";
  return "done";
}

const BUCKET_META = {
  awaiting: { label: "Kanıt bekliyor", hint: "Teslim edildi, kanıt kaydı yok" },
  discrepancy: { label: "Tutarsızlık var", hint: "Eksik/hasarlı — çözülmesi gerekiyor", alarm: true },
  seller_claim: { label: "Satıcı beyanı", hint: "Satıcı kaydetti, operasyon doğrulaması bekliyor" },
  done: { label: "Tamamlandı", hint: "Kanıt tam, tutarsızlık yok" },
};

/** Kuyruğa giren sevkiyatlar — yalnız teslim edilmişler POD bekler. */
function queueScope(state, asSeller) {
  return Object.values(state.shipments)
    .filter((s) => s.status === "Delivered")
    .filter((s) => !asSeller || s.seller_name === SELLER_ME);
}

function queueRow(state, s) {
  const pod = state.pods[s.shipment] || null;
  return {
    shipment: s.shipment,
    order: s.order,
    buyer_name: s.buyer_name,
    seller_name: s.seller_name,
    carrier: s.carrier ?? null,
    status: s.status,
    actual_delivery: s.actual_delivery ?? null,
    bucket: bucketOf(s, pod),
    package_count: s.package_count ?? null,
    pallet_count: s.pallet_count ?? null,
    waybill_number: s.waybill_number ?? null,
    delivery_point: s.delivery_point ?? null,
    hours_since: hoursSince(s.actual_delivery),
    // Listede kaç kolinin eksik olduğu görünsün — kullanıcı detaya girmeden
    // "2 koli eksik"i anlayabilmeli (mockup varyantı: Tutarsızlık).
    delivered_package_count: pod?.delivered_package_count ?? null,
    total_package_count: pod?.total_package_count ?? null,
    exception_code: pod?.exception_code ?? null,
    pod_source: pod?.source ?? null,
  };
}

// ── ana yüzey ────────────────────────────────────────────────────────

export const podMock = {
  /**
   * P1 · Kanıt kuyruğu — kovalar ve liste AYNI yanıtta.
   *
   * Ayrı sayaç isteği liste render'ından sonra dönüyor ve kovalar yerleşince
   * LİSTE KAYIYOR (13-FE'de ölçüldü).
   */
  async getPodQueue({ bucket = null, q = null, carrier = null, seller = null, start = 0, pageLength = 50, asSeller = false } = {}) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();

    const kapsam = queueScope(state, asSeller).map((s) => queueRow(state, s));

    // Kovalar TÜM kapsamdan sayılır, süzülmüş listeden değil — aksi hâlde
    // "Tutarsızlık 2" filtresine tıklayınca sayaç 2'den 2'ye düşerdi ve
    // kullanıcı diğer kovalarda ne kaldığını göremezdi.
    const buckets = Object.entries(BUCKET_META).map(([key, meta]) => ({
      key,
      ...meta,
      count: kapsam.filter((r) => r.bucket === key).length,
    }));

    let rows = kapsam;
    if (bucket) rows = rows.filter((r) => r.bucket === bucket);
    if (carrier) rows = rows.filter((r) => (r.carrier ?? "") === carrier);
    if (seller && !asSeller) rows = rows.filter((r) => r.seller_name === seller);
    if (q) {
      const arama = String(q).toLocaleLowerCase("tr");
      rows = rows.filter((r) =>
        [r.shipment, r.order, r.buyer_name, r.waybill_number].some((v) =>
          String(v ?? "").toLocaleLowerCase("tr").includes(arama)
        )
      );
    }

    rows.sort((a, b) => String(b.actual_delivery ?? "").localeCompare(String(a.actual_delivery ?? "")));

    return {
      buckets,
      rows: rows.slice(start, start + pageLength),
      total: rows.length,
      server_time: nowStamp(),
      // Filtre uygulanmışken boş kalmak ile hiç kayıt olmamak AYRI durumlar;
      // ekran ikisine farklı cümle kuruyor.
      unfiltered_total: kapsam.length,
    };
  },

  /**
   * H2 · Kanıt detayı. POD yoksa HATA DEĞİL, `null` döner — bu bir eksik
   * veridir, hata değil. Ekran "kanıt yok"u sorun olarak gösterir ve tek
   * çıkış yolunu verir.
   */
  async getProofOfDelivery(shipment, { canViewMedia = true, asSeller = false } = {}) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();

    const shp = state.shipments[shipment];
    if (!shp) throw fail("NOT_FOUND", "Sevkiyat bulunamadı.");
    if (asSeller && shp.seller_name !== SELLER_ME) throw fail("CAPABILITY_REQUIRED", "Bu sevkiyat size ait değil.");

    const pod = state.pods[shipment];
    if (!pod) {
      return { shipment, proof_of_delivery: null, shipment_status: shp.status, server_time: nowStamp() };
    }

    const yuk = { ...pod, waybill_number: pod.waybill_number ?? shp.waybill_number ?? null };

    // VERİ MİNİMİZASYONU: yetki yoksa alanlar yanıttan HİÇ ÇIKARILIR.
    // `null` göndermek de maskelemek de dosyayı yine tarayıcıya indirirdi.
    if (!canViewMedia) {
      delete yuk.signature_url;
      delete yuk.photo_url;
      delete yuk.document_url;
    }

    return {
      shipment,
      proof_of_delivery: yuk,
      shipment_status: shp.status,
      media_visible: canViewMedia,
      server_time: nowStamp(),
    };
  },

  /** H2 · Kanıt kaydet. Sözleşme §2.3. */
  async recordProofOfDelivery(payload) {
    await delay(260);
    throwIfFaulted("write");
    const state = loadState();
    const p = plain(payload);

    const shp = state.shipments[p.shipment];
    if (!shp) throw fail("NOT_FOUND", "Sevkiyat bulunamadı.");
    if (shp.status !== "Delivered")
      throw fail("INVALID_STATUS", "Teslim edilmemiş sevkiyata teslim kanıtı kaydedilemez.");
    if (state.pods[p.shipment])
      throw fail("POD_ALREADY_RECORDED", "Bu sevkiyatın teslim kanıtı zaten kaydedilmiş.");

    const hatalar = validatePod(p);
    if (Object.keys(hatalar).length) throw fail("VALIDATION_ERROR", "Eksik veya hatalı alanlar var.", { fields: hatalar });

    // `source` DAMGASINI SUNUCU BELİRLER (sözleşme §6.3). İstemci
    // gönderebilseydi satıcı kendi beyanını operasyon kaydı gibi damgalardı.
    const kaynak = p.asSeller ? "seller" : "operator";

    const pod = {
      shipment: p.shipment,
      delivered_at: p.delivered_at,
      received_by: p.received_by,
      received_by_title: p.received_by_title,
      delivery_code_used: p.delivery_code_used ? 1 : 0,
      signature_url: p.signature_url ?? null,
      photo_url: p.photo_url ?? null,
      document_url: p.document_url ?? null,
      location_source: p.location_source ?? null,
      location_recorded_at: p.location_recorded_at ?? null,
      delivered_package_count: Number(p.delivered_package_count),
      total_package_count: Number(p.total_package_count),
      delivered_pallet_count: p.delivered_pallet_count ?? null,
      returned_pallet_count: p.returned_pallet_count ?? null,
      has_discrepancy: p.has_discrepancy ? 1 : 0,
      exception_code: p.has_discrepancy ? p.exception_code : null,
      discrepancy_note: p.has_discrepancy ? (p.discrepancy_note ?? null) : null,
      waybill_number: shp.waybill_number ?? null,
      delivery_point: p.delivery_point ?? shp.delivery_point ?? null,
      source: kaynak,
      recorded_by: kaynak === "seller" ? SELLER_ME : "Operasyon",
      recorded_at: nowStamp(),
    };

    state.pods[p.shipment] = pod;
    state.audit.push({ shipment: p.shipment, action: "record", at: nowStamp(), by: pod.recorded_by, reason: null });
    saveState(state);

    // DURUM GEÇİŞİ: kova ayrı tutulmuyor, bir sonraki kuyruk okumasında
    // `bucketOf` yeni POD'u görüp sevkiyatı kendiliğinden taşıyor.
    return { proof_of_delivery: pod, created: true, bucket: bucketOf(shp, pod), server_time: nowStamp() };
  },

  /** H2 · Düzeltme — kayıt SİLİNMEZ, denetim izine yazılır. Satıcıda yetki yok. */
  async amendProofOfDelivery(payload) {
    await delay(260);
    throwIfFaulted("write");
    const state = loadState();
    const p = plain(payload);

    if (p.asSeller) throw fail("CAPABILITY_REQUIRED", "Kayıt düzeltme yetkiniz yok.");

    const mevcut = state.pods[p.shipment];
    if (!mevcut) throw fail("NOT_FOUND", "Düzeltilecek teslim kanıtı yok.");

    const hatalar = validatePod(p);
    if (!String(p.reason ?? "").trim()) hatalar.reason = "Düzeltme gerekçesi zorunlu.";
    if (Object.keys(hatalar).length) throw fail("VALIDATION_ERROR", "Eksik veya hatalı alanlar var.", { fields: hatalar });

    // Optimistik kilit: damgayı göndermemek "son yazan kazanır" demek olurdu.
    if (p.modified && p.modified !== mevcut.recorded_at)
      throw fail("CONFLICT", "Bu kaydı başka bir kullanıcı sizden sonra değiştirdi.");

    const guncel = {
      ...mevcut,
      delivered_at: p.delivered_at ?? mevcut.delivered_at,
      received_by: p.received_by ?? mevcut.received_by,
      received_by_title: p.received_by_title ?? mevcut.received_by_title,
      delivered_package_count: Number(p.delivered_package_count ?? mevcut.delivered_package_count),
      total_package_count: Number(p.total_package_count ?? mevcut.total_package_count),
      has_discrepancy: p.has_discrepancy ? 1 : 0,
      exception_code: p.has_discrepancy ? p.exception_code : null,
      discrepancy_note: p.has_discrepancy ? (p.discrepancy_note ?? null) : null,
      // Düzeltme kaydın KAYNAĞINI değiştirmez: satıcı beyanı düzeltilse bile
      // beyanın satıcıdan geldiği bilgisi ihtilafta anlamlı.
      recorded_at: nowStamp(),
    };

    state.pods[p.shipment] = guncel;
    state.audit.push({ shipment: p.shipment, action: "amend", at: nowStamp(), by: "Operasyon", reason: p.reason });
    saveState(state);

    return { proof_of_delivery: guncel, amended: true, server_time: nowStamp() };
  },

  /**
   * H1 · İstasyon olayları. Uç 11-BE'de (Bora); `location` alanı bugün
   * `Shipment Event` DocType'ında YOK — sözleşme §1.2 ile sipariş edildi.
   * Mock alanı üretiyor, ekran beklemeden çalışıyor.
   */
  async listShipmentEvents(shipment) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();
    if (!state.shipments[shipment] && !state.events[shipment]) throw fail("NOT_FOUND", "Sevkiyat bulunamadı.");
    return { events: state.events[shipment] ?? [], server_time: nowStamp() };
  },

  /** D1 / D2 · Teslimat akışları. Satıcı KENDİ kayıtlarını görür (K-M). */
  async listDeliveryFlows({ flowType, q = null, status = null, appointment = null, start = 0, pageLength = 50, asSeller = false } = {}) {
    await delay();
    throwIfFaulted("read");
    const state = loadState();

    let rows = Object.values(state.shipments).filter((s) => s.flow_type === flowType);
    const kapsamToplam = rows.length;
    if (asSeller) rows = rows.filter((s) => s.seller_name === SELLER_ME);

    if (status) rows = rows.filter((s) => s.status === status);
    if (appointment === "none") rows = rows.filter((s) => !s.appointment_at);
    if (appointment === "overdue") rows = rows.filter((s) => isOverdue(s));
    if (q) {
      const arama = String(q).toLocaleLowerCase("tr");
      rows = rows.filter((s) =>
        [s.shipment, s.order, s.buyer_name].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(arama))
      );
    }

    return {
      rows: rows.slice(start, start + pageLength).map((s) => ({ ...s, overdue: isOverdue(s) })),
      total: rows.length,
      unfiltered_total: kapsamToplam,
      server_time: nowStamp(),
    };
  },

  /**
   * D2 · Teslim et. ÜÇ KAPI SUNUCUDA DA DENETLENİR — ekranın butonu
   * çizmemesi yeterli değil (sözleşme §2.7). Başarıda POD kaydı tetiklenir.
   */
  async handOverShipment({ shipment, delivery_code = null, received_by, received_by_title, modified = null, asSeller = false } = {}) {
    await delay(280);
    throwIfFaulted("handover");
    const state = loadState();

    const shp = state.shipments[shipment];
    if (!shp) throw fail("NOT_FOUND", "Sevkiyat bulunamadı.");
    if (asSeller && shp.seller_name !== SELLER_ME) throw fail("CAPABILITY_REQUIRED", "Bu sevkiyat size ait değil.");
    if (shp.status === "Delivered") throw fail("INVALID_STATUS", "Bu sevkiyat zaten teslim edilmiş.");
    if (modified && shp.modified && modified !== shp.modified)
      throw fail("CONFLICT", "Bu kaydı başka bir kullanıcı sizden sonra değiştirdi.");

    if (shp.payment_required_before_delivery && shp.payment_status === "unpaid")
      throw fail("PAYMENT_REQUIRED", "Teslim öncesi ödeme tamamlanmamış.");

    if (shp.delivery_code_required) {
      if (shp.delivery_code_attempts >= 3 || shp.delivery_code_status === "failed")
        throw fail("DELIVERY_CODE_NOT_VERIFIED", "Teslim kodu 3 kez hatalı girildi, kod kilitlendi.");
      if (shp.delivery_code_status !== "verified") {
        // Doğrulanmamışsa kod ŞART. Mock evreninde geçerli kod "4821" —
        // ekran kodu asla göstermez (§6.4), yalnız durumu ve deneme sayısını.
        if (String(delivery_code ?? "") !== "4821") {
          shp.delivery_code_attempts = Number(shp.delivery_code_attempts || 0) + 1;
          if (shp.delivery_code_attempts >= 3) shp.delivery_code_status = "failed";
          saveState(state);
          throw fail("DELIVERY_CODE_NOT_VERIFIED", "Teslim kodu doğrulanmadı.", {
            attempts: shp.delivery_code_attempts,
          });
        }
        shp.delivery_code_status = "verified";
      }
    }

    const hatalar = {};
    if (!String(received_by ?? "").trim()) hatalar.received_by = "Teslim alan kişi zorunlu.";
    if (!String(received_by_title ?? "").trim()) hatalar.received_by_title = "Teslim alanın sıfatı zorunlu.";
    if (Object.keys(hatalar).length) throw fail("VALIDATION_ERROR", "Eksik alanlar var.", { fields: hatalar });

    // DURUM GEÇİŞİ: sevkiyat teslim edildi → kuyruğa "kanıt bekliyor" olarak
    // düşer. Teslim aksiyonu POD'u DOĞURUR; iki iş ayrılamaz (K-F).
    shp.status = "Delivered";
    shp.actual_delivery = nowStamp();
    shp.modified = nowStamp();
    saveState(state);

    return {
      shipment,
      status: shp.status,
      actual_delivery: shp.actual_delivery,
      // Ekran bu bayrağı görünce kanıt kayıt çekmecesini açıyor.
      pod_required: true,
      received_by,
      received_by_title,
      server_time: nowStamp(),
    };
  },

  /** Katalog: istisna kodları bileşene GÖMÜLMEZ (sözleşme §5.1). */
  async getExceptionCodes() {
    await delay(80);
    return { codes: plain(EXCEPTION_CODES) };
  },

  /** K-C: teslim noktası için ayrı EKRAN yok; kart bu kayıttan besleniyor. */
  async getCarrierBranch(name) {
    await delay(80);
    const nokta = CARRIER_BRANCHES[name];
    if (!nokta) throw fail("NOT_FOUND", "Teslim noktası bulunamadı.");
    return { branch: plain(nokta) };
  },

  /** Denetim izi — düzeltmenin iz bıraktığını ekran gösterebilsin. */
  async getPodAudit(shipment) {
    await delay(80);
    const state = loadState();
    return { entries: state.audit.filter((a) => a.shipment === shipment) };
  },
};

// ── doğrulama ────────────────────────────────────────────────────────

/**
 * Alan bazlı doğrulama — tek genel mesaj değil.
 *
 * KISMİ TESLİMDE TUTARSIZLIK ZORUNLU (K-K komşusu, sözleşme §4.3): aksi hâlde
 * sipariş "tam teslim" sayılır ve alacak/iade süreci yanlış işler.
 */
function validatePod(p) {
  const hata = {};
  if (!String(p.delivered_at ?? "").trim()) hata.delivered_at = "Teslim zamanı zorunlu.";
  if (!String(p.received_by ?? "").trim()) hata.received_by = "Teslim alan kişi zorunlu.";
  if (!String(p.received_by_title ?? "").trim()) hata.received_by_title = "Teslim alanın sıfatı zorunlu.";

  const teslim = Number(p.delivered_package_count);
  const toplam = Number(p.total_package_count);
  if (!Number.isFinite(teslim) || teslim < 0) hata.delivered_package_count = "Teslim edilen koli sayısı geçersiz.";
  if (!Number.isFinite(toplam) || toplam <= 0) hata.total_package_count = "Toplam koli sayısı geçersiz.";
  if (Number.isFinite(teslim) && Number.isFinite(toplam) && teslim > toplam)
    hata.delivered_package_count = "Teslim edilen koli sayısı toplamı aşamaz.";

  if (Number.isFinite(teslim) && Number.isFinite(toplam) && teslim < toplam && !p.has_discrepancy)
    hata.has_discrepancy = "Kısmi teslimde tutarsızlık kaydı zorunlu.";

  if (p.has_discrepancy && !String(p.exception_code ?? "").trim())
    hata.exception_code = "Tutarsızlık için istisna kodu zorunlu.";

  return hata;
}

/** Randevu teslimatın en kırılgan bilgisi: geçmiş randevu hâlâ yoldaysa müdahale gerekir. */
function isOverdue(s) {
  if (!s.appointment_at || s.status === "Delivered") return false;
  return toDate(s.appointment_at) < toDate(MOCK_NOW);
}

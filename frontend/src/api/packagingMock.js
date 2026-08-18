// Paketleme/etiket uçlarının GEÇİCİ ama ÇALIŞAN taklidi.
//
// NEDEN "STUB" DEĞİL:
//   FE fazında backend yok (13-BE, 19-BE). Sahte veri döndüren bir stub
//   ekranı render eder ama iş akışını kapatmaz: kaydettiğin kaybolur,
//   tamamladığın listeye yansımaz, ürettiğin belge açılmaz. Bu dosya bunun
//   yerine backend'in DAVRANIŞINI taklit ediyor — kök CLAUDE.md §4.12 ve
//   `docs/lojistik/FE-MOCK-DISIPLINI.md`.
//
//   · Kalıcılık        → localStorage; yenileyince iş durur
//   · Tek kaynak       → kuyruk sevkiyatlardan TÜRETİLİR, ayrı dizi değil
//   · Durum geçişleri  → paketleme tamamlanınca kova değişir, sayaçlar döner
//   · Gerçek çıktı     → barkod çizilir, etiket/irsaliye yazdırılabilir açılır
//   · Tetiklenebilir hata → `setFault()` ile CONFLICT / CARRIER_ERROR üretilir
//
// NASIL KALDIRILACAK:
//   `api/packaging.js` içindeki `USE_MOCK` kapanır, bu dosya silinir.
//   Ekranlar ve store değişmez — mock yalnız api katmanının arkasında yaşar.
//
// SÖZLEŞME DIŞINA ÇIKMAZ:
//   Alan adları `docs/lojistik/13-FE-VERI-SOZLESMESI.md` ile birebir.
//   Uydurulan bir alan gerçek uca bağlanınca ekranı bozar.

// `@/` alias node:test tarafından çözülmüyor. Mock'un iş akışını
// (kaydet → tamamla → etiketle → hazırla) testten koşturabilmek için
// relative import kullanılıyor — `api/shipmentEnvelope.js` deseni.
import { barcodeDataUri } from "../utils/barcode.js";
import { calculateDesi, chargeableWeight } from "../utils/desi.js";
import {
  buildLabelDocument,
  buildPackingSlipDocument,
} from "../views/logistics/labels/labelDocument.js";

const STORAGE_KEY = "logistics.mock.packaging.v1";
/**
 * Hata senaryosu SEKME ömrü kadar yaşar (sessionStorage).
 *
 * ÖLÇÜLDÜ: `localStorage`'dayken kalıcı oluyordu. DEMO paneli admin'e
 * sınırlanınca, daha önce senaryo seçmiş bir satıcı ekranı KİLİTLİ kaldı ve
 * temizleyecek arayüzü kalmadı. Geliştirici anahtarının kalıcı olması için
 * bir sebep yok; sekme kapanınca sıfırlanması doğru davranış.
 */
const FAULT_KEY = "logistics.mock.fault";
const faultStore = () => (typeof sessionStorage !== "undefined" ? sessionStorage : localStorage);
const DIVISOR = 3000;

const PACKAGE_TYPES = [
  { name: "Koli-S", package_name: "Küçük Koli", length_cm: 30, width_cm: 20, height_cm: 15, max_weight_kg: 10, max_desi: 8, is_default: 0 },
  { name: "Koli-M", package_name: "Orta Koli", length_cm: 40, width_cm: 30, height_cm: 25, max_weight_kg: 30, max_desi: 25, is_default: 1 },
  { name: "Koli-L", package_name: "Büyük Koli", length_cm: 60, width_cm: 40, height_cm: 40, max_weight_kg: 40, max_desi: 40, is_default: 0 },
];

/**
 * Palet tipleri — `Pallet Type` KATALOĞUNU taklit ediyor.
 *
 * Burada sabit duruyorlar çünkü DocType henüz yok (19-BE). Gerçek yerleri
 * `Package Type` gibi bir katalog: Lojistik → Kataloglar ekranından
 * yönetilecek, yeni tip oradan eklenecek. Sözleşme §1.6'da tanımlı.
 *
 * Ölçüler Türkiye'de yaygın standartlar; taşıma kapasitesi (dinamik yük)
 * esas alındı — statik istifleme kapasitesi daha yüksektir ama sevkiyatta
 * bağlayıcı olan taşıma değeridir.
 */
const PALLET_TYPES = [
  { name: "Euro Palet (EPAL)", length_cm: 120, width_cm: 80, max_weight_kg: 1000, max_layers: 5, is_default: 1 },
  { name: "Sanayi Paleti (ISO)", length_cm: 120, width_cm: 100, max_weight_kg: 1200, max_layers: 6, is_default: 0 },
  { name: "Yarım Palet", length_cm: 80, width_cm: 60, max_weight_kg: 500, max_layers: 4, is_default: 0 },
  { name: "Plastik Palet", length_cm: 120, width_cm: 100, max_weight_kg: 900, max_layers: 5, is_default: 0 },
  { name: "Kafesli Palet", length_cm: 120, width_cm: 80, max_weight_kg: 1500, max_layers: 3, is_default: 0 },
];

const emptyLabel = () => ({
  status: "None", url: null, barcode_url: null, format: null,
  generated_at: null, printed_at: null, print_count: 0, carrier_tracking: null,
});

/** Başlangıç verisi. Sıfırlama bu tohuma döner. */
function seed() {
  return {
    shipments: {
      "SHP-2026-00042": {
        shipment: "SHP-2026-00042", order: "ORD-2026-01188",
        buyer_name: "Demir Yapı Market A.Ş.", seller_name: "Kaya Hırdavat",
        carrier: "Aras Kargo", status: "Pending",
        modified: "2026-08-18 09:14:22", created_hours_ago: 6,
        is_locked: false, packing_completed_at: null, desi_divisor: DIVISOR,
        items: [
          { row_id: "a1", order_item: "ORD-ITM-001", listing: "LST-A1AC2833", item_name: "Paslanmaz Çelik Vida DIN 933", variation: "M6×40 / A2-70", qty: 2000, uom: "Adet", scan_code: "8690012340011" },
          { row_id: "a2", order_item: "ORD-ITM-002", listing: "LST-E374B154", item_name: "Hidrolik Hortum R2AT", variation: '3/8" / 2 m', qty: 48, uom: "Adet", scan_code: "HYD-R2AT-38-2M" },
          { row_id: "a3", order_item: "ORD-ITM-003", listing: "LST-1C0FBE54", item_name: "Rulman 6204-2RS", variation: "20×47×14 mm", qty: 300, uom: "Adet", scan_code: "8690012340035" },
          // Bilinçli barkodsuz — fallback davranışı varsayılan akışta görünsün.
          { row_id: "a4", order_item: "ORD-ITM-004", listing: "LST-F6680F9B", item_name: "Alüminyum Sigma Profil", variation: "30×30 / 3 m", qty: 60, uom: "Adet", scan_code: null },
        ],
        packages: [
          { row_id: "d1", package_code: "SHP-2026-00042-01", sequence: 1, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 18.5, qty: 1, barcode: "PKG86900456001", contents: [{ shipment_item: "a1", qty: 1400 }], label: { ...emptyLabel(), status: "Printed", format: "thermal_100x150", generated_at: "2026-08-17 16:02:11", printed_at: "2026-08-17 16:03:40", print_count: 2, carrier_tracking: "1234567890" } },
          { row_id: "d2", package_code: "SHP-2026-00042-02", sequence: 2, package_type: "Koli-L", length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 12, qty: 1, barcode: "PKG86900456002", contents: [{ shipment_item: "a2", qty: 48 }], label: { ...emptyLabel(), status: "Generated", format: "thermal_100x150", generated_at: "2026-08-17 16:02:11" } },
          { row_id: "d3", package_code: "SHP-2026-00042-03", sequence: 3, package_type: "Koli-S", length_cm: 30, width_cm: 20, height_cm: 15, weight_kg: 9.2, qty: 1, barcode: "PKG86900456003", contents: [{ shipment_item: "a3", qty: 120 }], label: emptyLabel() },
        ],
        pallets: [
          { row_id: "p1", pallet_code: "PLT-001", pallet_type: "Euro Palet (EPAL)", max_weight_kg: 1000, max_layers: 5, layer_count: 2, packages: ["SHP-2026-00042-01"] },
        ],
      },
      "SHP-2026-00043": {
        shipment: "SHP-2026-00043", order: "ORD-2026-01190",
        buyer_name: "Öz Teknik Ltd. Şti.", seller_name: "Kaya Hırdavat",
        carrier: "Yurtiçi Kargo", status: "Pending",
        modified: "2026-08-18 08:02:10", created_hours_ago: 31,
        is_locked: false, packing_completed_at: null, desi_divisor: DIVISOR,
        items: [
          { row_id: "b1", order_item: "ORD-ITM-010", listing: "LST-1A4793B9", item_name: "Galvaniz Sac Levha", variation: "1000×2000 / 1.5 mm", qty: 12, uom: "Adet", scan_code: null },
          { row_id: "b2", order_item: "ORD-ITM-011", listing: "LST-1F68CB08", item_name: "Elektrot Rutil", variation: "3.25 mm / 5 kg", qty: 20, uom: "Paket", scan_code: null },
        ],
        packages: [], pallets: [],
      },
      "SHP-2026-00044": {
        shipment: "SHP-2026-00044", order: "ORD-2026-01191",
        buyer_name: "Mavi İnşaat San. Tic.", seller_name: "Ada Metal",
        carrier: "MNG Kargo", status: "Pending",
        modified: "2026-08-15 10:00:00", created_hours_ago: 79,
        is_locked: false, packing_completed_at: null, desi_divisor: DIVISOR,
        items: [
          { row_id: "c1", order_item: "ORD-ITM-030", listing: "LST-A1AC2833", item_name: "İnşaat Demiri Ø12", variation: "12 m / S420", qty: 240, uom: "Adet", scan_code: "8690012340077" },
          { row_id: "c2", order_item: "ORD-ITM-031", listing: "LST-E374B154", item_name: "Bağ Teli", variation: "1.5 mm / 50 kg", qty: 8, uom: "Rulo", scan_code: "8690012340084" },
          { row_id: "c3", order_item: "ORD-ITM-032", listing: "LST-1C0FBE54", item_name: "Kalıp Kontrplak", variation: "125×250 / 18 mm", qty: 30, uom: "Adet", scan_code: null },
          { row_id: "c4", order_item: "ORD-ITM-033", listing: "LST-F6680F9B", item_name: "Beton Çivisi", variation: "60 mm / 5 kg", qty: 15, uom: "Kutu", scan_code: "8690012340091" },
          { row_id: "c5", order_item: "ORD-ITM-034", listing: "LST-1F68CB08", item_name: "Su Yalıtım Membranı", variation: "10 m / 3 mm", qty: 22, uom: "Rulo", scan_code: "8690012340107" },
          { row_id: "c6", order_item: "ORD-ITM-035", listing: "LST-1A4793B9", item_name: "Çelik Hasır Q188", variation: "215×500 cm", qty: 40, uom: "Adet", scan_code: null },
          { row_id: "c7", order_item: "ORD-ITM-036", listing: "LST-A1AC2833", item_name: "Kimyasal Dübel", variation: "M10 / 300 ml", qty: 50, uom: "Adet", scan_code: "8690012340114" },
        ],
        packages: [], pallets: [],
      },
      "SHP-2026-00045": {
        shipment: "SHP-2026-00045", order: "ORD-2026-01193",
        buyer_name: "Anadolu Otomotiv", seller_name: "Ada Metal",
        carrier: "Aras Kargo", status: "Pending",
        modified: "2026-08-18 03:00:00", created_hours_ago: 12,
        is_locked: false, packing_completed_at: "2026-08-18 03:10:00", desi_divisor: DIVISOR,
        items: [
          { row_id: "e1", order_item: "ORD-ITM-040", listing: "LST-A1AC2833", item_name: "Fren Balatası Seti", variation: "Ön / Seramik", qty: 40, uom: "Set", scan_code: "8690012340121" },
          { row_id: "e2", order_item: "ORD-ITM-041", listing: "LST-E374B154", item_name: "Yağ Filtresi", variation: "OF-2200", qty: 100, uom: "Adet", scan_code: "8690012340138" },
          { row_id: "e3", order_item: "ORD-ITM-042", listing: "LST-1C0FBE54", item_name: "Triger Kayışı", variation: "128 diş", qty: 25, uom: "Adet", scan_code: "8690012340145" },
        ],
        packages: [1, 2, 3, 4, 5].map((n) => ({
          row_id: `f${n}`, package_code: `SHP-2026-00045-0${n}`, sequence: n,
          package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25,
          weight_kg: 14 + n, qty: 1, barcode: `PKG8690045700${n}`,
          contents: n === 1 ? [{ shipment_item: "e1", qty: 40 }]
            : n === 2 ? [{ shipment_item: "e2", qty: 100 }]
            : n === 3 ? [{ shipment_item: "e3", qty: 25 }] : [],
          label: emptyLabel(),
        })),
        pallets: [],
      },
      // "Hazır" kovasının boş kalmaması için: tüm kalemleri paketli ve
      // etiketli bir sevkiyat. Akışın SON durumunun nasıl göründüğü
      // ekrandan görülebilmeli.
      "SHP-2026-00046": {
        shipment: "SHP-2026-00046", order: "ORD-2026-01195",
        buyer_name: "Ege Plastik A.Ş.", seller_name: "Kaya Hırdavat",
        carrier: "PTT Kargo", status: "Pending",
        modified: "2026-08-18 07:30:00", created_hours_ago: 2,
        is_locked: false, packing_completed_at: "2026-08-18 07:35:00", desi_divisor: DIVISOR,
        items: [
          { row_id: "k1", order_item: "ORD-ITM-050", listing: "LST-E374B154", item_name: "Polietilen Granül", variation: "25 kg / Doğal", qty: 40, uom: "Çuval", scan_code: "8690012340152" },
        ],
        packages: [
          { row_id: "m1", package_code: "SHP-2026-00046-01", sequence: 1, package_type: "Koli-L", length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 25, qty: 1, barcode: "PKG86900460001", contents: [{ shipment_item: "k1", qty: 40 }], label: { ...emptyLabel(), status: "Printed", format: "thermal_100x150", generated_at: "2026-08-18 07:40:00", printed_at: "2026-08-18 07:41:00", print_count: 1, carrier_tracking: "5566778899" } },
        ],
        pallets: [],
      },
      "SHP-2026-00047": {
        shipment: "SHP-2026-00047", order: "ORD-2026-01197",
        buyer_name: "Demir Yapı Market A.Ş.", seller_name: "Ada Metal",
        carrier: "Yurtiçi Kargo", status: "Delivered",
        modified: "2026-08-16 11:40:00", created_hours_ago: 4,
        is_locked: true, packing_completed_at: "2026-08-15 08:50:00", desi_divisor: DIVISOR,
        items: [{ row_id: "g1", order_item: "ORD-ITM-020", listing: "LST-A1AC2833", item_name: "Somun DIN 934", variation: "M6 / A2", qty: 500, uom: "Adet", scan_code: "8690012340099" }],
        packages: [
          { row_id: "h1", package_code: "SHP-2026-00047-01", sequence: 1, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 14, qty: 1, barcode: "PKG86900457001", contents: [{ shipment_item: "g1", qty: 500 }], label: { ...emptyLabel(), status: "Printed", format: "a4_single", generated_at: "2026-08-15 09:00:00", printed_at: "2026-08-15 09:01:00", print_count: 1, carrier_tracking: "9988776655" } },
        ],
        pallets: [],
      },
    },
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
    // Private mode: oturum içinde çalışmaya devam eder, yenileyince sıfırlanır.
  }
}

/** Demo verisini tohuma döndürür — ekrandaki "Sıfırla" bunu çağırıyor. */
export function resetMockData() {
  saveState(seed());
  clearFault();
}

// ── tetiklenebilir hatalar ───────────────────────────────────────────

/** @returns {"conflict"|"carrier"|"permission"|null} */
export function getFault() {
  try {
    // Eski sürüm localStorage'a yazıyordu; kalmış bir kilit varsa temizle.
    if (localStorage.getItem(FAULT_KEY)) localStorage.removeItem(FAULT_KEY);
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

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Sözleşmedeki hata kodlarını ekranda görülebilir kılar. */
function throwIfFaulted(scope) {
  const fault = getFault();
  if (!fault) return;
  if (fault === "permission") {
    throw fail("PERMISSION_DENIED", "Bu işlem için yetkiniz yok.");
  }
  if (fault === "conflict" && scope === "save") {
    throw fail("CONFLICT", "Bu sevkiyatı başka bir kullanıcı sizden sonra değiştirdi.");
  }
  if (fault === "carrier" && scope === "label") {
    throw fail("CARRIER_ERROR", "Taşıyıcı etiketi üretemedi: alıcı posta kodu servis alanı dışında.");
  }
}

// ── türetilmiş alanlar ───────────────────────────────────────────────

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
/**
 * İstemciden gelen yükü düz veriye indirger.
 *
 * ÖLÇÜLDÜ (E2E, 2026-08-18): store `packages`'ı Vue reactive PROXY olarak
 * gönderiyor. Sığ kopya (`{...p}`) iç içe alanları (`contents`) proxy olarak
 * bırakıyordu; dönüş yükü `structuredClone`'a girince "could not be cloned"
 * hatası veriyor ve KAYDETME HİÇ ÇALIŞMIYORDU. Birim testlerinde çıkmadı —
 * orada düz nesne geçiliyor, proxy yok.
 *
 * Gerçek uçta veri zaten JSON'a serialize edilip gidiyor; mock da aynısını
 * yaparak hem hatayı kesiyor hem davranışı sadık taklit ediyor.
 */
function plain(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function packedQty(doc, rowId) {
  return doc.packages.reduce(
    (sum, p) => sum + (p.contents ?? []).filter((c) => c.shipment_item === rowId).reduce((s, c) => s + Number(c.qty || 0), 0),
    0
  );
}

/**
 * Kovayı SEVKİYATTAN türetir — kuyruk artık ayrı bir sabit dizi değil.
 *
 * Eskiden iki kaynak vardı ve birbirinden habersizdi: paketleme tamamlansa
 * bile sevkiyat "Paketlenmedi" kovasında kalıyordu.
 */
function bucketOf(doc) {
  if (!doc.packages.length) return "unpacked";
  const allPacked = doc.items.every((i) => packedQty(doc, i.row_id) >= Number(i.qty || 0));
  if (!allPacked) return "partial";
  const allLabeled = doc.packages.every((p) => p.label?.status === "Printed" || p.label?.status === "Generated");
  return allLabeled ? "ready" : "awaiting_label";
}

/** Sunucunun döndüreceği tam yük: desi, ücret, kod, sıra, barkod, etiket URL'i. */
function buildPayload(doc) {
  const packages = doc.packages.map((p, i) => {
    const desi = calculateDesi(p.length_cm, p.width_cm, p.height_cm, doc.desi_divisor);
    const code = p.package_code || `${doc.shipment}-${String(i + 1).padStart(2, "0")}`;
    const barcode = p.barcode || `PKG${code.replace(/\D/g, "").slice(-11)}`;
    const label = p.label ?? emptyLabel();
    return {
      ...p,
      sequence: i + 1,
      // X/Y etiketi yükte HAZIR geliyor: palet ekranı koliyi yalnız koduyla
      // tanıyor ve `decoratePackages`'ı çalıştırmıyor; etiket orada "?"
      // görünüyordu.
      sequence_label: `${i + 1}/${doc.packages.length}`,
      package_code: code,
      barcode,
      desi,
      chargeable_kg: chargeableWeight(Number(p.weight_kg) || 0, desi),
      label: {
        ...label,
        // Barkod GÖRSELİ her yükte türetiliyor — data URI, saklanmıyor.
        barcode_url: barcodeDataUri(barcode, { width: 220, height: 56 }),
        // Etiket URL'i blob; sayfa ömrü kadar yaşıyor. Kalıcı olan durum
        // ve sayaçlar, adresin kendisi değil.
        url: label.status === "None" || label.status === "Voided" ? null : "pending",
      },
    };
  });

  const totals = packages.reduce(
    (acc, p) => {
      const qty = Number(p.qty ?? 1) || 1;
      acc.total_weight += (Number(p.weight_kg) || 0) * qty;
      acc.total_desi += p.desi * qty;
      acc.chargeable_weight += p.chargeable_kg * qty;
      return acc;
    },
    { package_count: packages.length, total_weight: 0, total_desi: 0, chargeable_weight: 0 }
  );
  totals.total_weight = Math.round(totals.total_weight * 100) / 100;
  totals.chargeable_weight = Math.round(totals.chargeable_weight * 100) / 100;

  const payload = { ...doc, packages, totals, package_types: PACKAGE_TYPES, pallet_types: PALLET_TYPES };

  // Etiketi olan kolilere gerçekten açılabilir bir belge bağla.
  for (const pkg of payload.packages) {
    if (pkg.label.url === "pending") {
      pkg.label.url = buildLabelDocument(payload, [pkg], pkg.label.format || "thermal_100x150");
    }
  }
  return payload;
}

function getDoc(state, shipment) {
  const doc = state.shipments[shipment];
  if (!doc) throw fail("NOT_FOUND", `Sevkiyat bulunamadı: ${shipment}`);
  return doc;
}

function assertWritable(doc) {
  if (doc.is_locked) {
    throw fail("SHIPMENT_LOCKED", "Sevkiyat kapandı — değişiklik yapılamaz.");
  }
}

// ── uçlar ────────────────────────────────────────────────────────────

export const packagingMock = {
  async getPackingQueue({ bucket = null, seller = null, carrier = null, search = null, page = 1, pageSize = 50 } = {}) {
    await delay();
    throwIfFaulted("queue");
    const state = loadState();

    const rows = Object.values(state.shipments)
      // Teslim edilmiş sevkiyat paketleme kuyruğunda işi yok.
      .filter((doc) => !doc.is_locked)
      .map((doc) => ({
        shipment: doc.shipment,
        order: doc.order,
        buyer_name: doc.buyer_name,
        seller_name: doc.seller_name,
        item_count: doc.items.length,
        package_count: doc.packages.length,
        waiting_hours: doc.created_hours_ago,
        carrier: doc.carrier,
        bucket: bucketOf(doc),
        status: doc.status,
      }));

    const buckets = rows.reduce((acc, r) => ({ ...acc, [r.bucket]: (acc[r.bucket] ?? 0) + 1 }), {});

    const needle = String(search ?? "").trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!bucket || r.bucket === bucket) &&
        (!seller || r.seller_name === seller) &&
        (!carrier || r.carrier === carrier) &&
        (!needle ||
          [r.shipment, r.order, r.buyer_name].some((v) => String(v).toLowerCase().includes(needle)))
    );

    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize, buckets };
  },

  async getShipmentPacking(shipment) {
    await delay();
    throwIfFaulted("read");
    return buildPayload(getDoc(loadState(), shipment));
  },

  async saveShipmentPackages(shipment, packages, modified) {
    await delay(300);
    throwIfFaulted("save");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    // Optimistik kilit — gerçek uçta da aynı kural (sözleşme §2.3).
    if (modified && doc.modified && modified !== doc.modified) {
      throw fail("CONFLICT", "Bu sevkiyatı başka bir kullanıcı sizden sonra değiştirdi.");
    }

    doc.packages = plain(packages).map((p, i) => {
      const code = p.package_code || `${shipment}-${String(i + 1).padStart(2, "0")}`;
      const previous = doc.packages.find((old) => old.package_code === code);
      const label = p.label ?? previous?.label ?? emptyLabel();
      // İçerik değiştiyse üretilmiş etiket BAYATLAR — gerçek uçta
      // `content_hash` ile yapılıyor (sözleşme §1.1).
      const contentChanged =
        previous && JSON.stringify(previous.contents ?? []) !== JSON.stringify(p.contents ?? []);
      return {
        ...p,
        package_code: code,
        barcode: p.barcode || previous?.barcode || null,
        label:
          contentChanged && (label.status === "Generated" || label.status === "Printed")
            ? { ...label, status: "Stale" }
            : label,
      };
    });
    doc.modified = now();
    saveState(state);
    return buildPayload(doc);
  },

  /**
   * Paketlemeyi tamamla — kova `awaiting_label`'a geçer.
   *
   * Durum (`status`) burada DEĞİŞMİYOR: sevkiyat ancak etiketler basılınca
   * "Alıma hazır" olur (`markReady`). Paketlemenin bitmesi, kargonun hazır
   * olması demek değil.
   */
  async completePacking(shipment, modified) {
    await delay(260);
    throwIfFaulted("save");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    // Kaydetmeyle aynı optimistik kilit: tamamlamak da bir yazma işlemi.
    if (modified && doc.modified && modified !== doc.modified) {
      throw fail("CONFLICT", "Bu sevkiyatı başka bir kullanıcı sizden sonra değiştirdi.");
    }

    const unpacked = doc.items.filter((i) => packedQty(doc, i.row_id) < Number(i.qty || 0));
    if (unpacked.length) {
      throw fail("VALIDATION_FAILED", `${unpacked.length} kalem paketlenmeden tamamlanamaz.`);
    }
    if (!doc.packages.length) throw fail("VALIDATION_FAILED", "Hiç koli oluşturulmamış.");

    doc.packing_completed_at = now();
    doc.modified = now();
    saveState(state);
    return buildPayload(doc);
  },

  /** Sevkiyatı "Alıma hazır" işaretler — tüm koliler etiketliyse. */
  async markReady(shipment) {
    await delay(240);
    throwIfFaulted("save");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    const missing = doc.packages.filter(
      (p) => !p.label || p.label.status === "None" || p.label.status === "Voided" || p.label.status === "Stale"
    );
    if (!doc.packages.length || missing.length) {
      throw fail("VALIDATION_FAILED", `${missing.length} kolinin geçerli etiketi yok — sevkiyat hazır işaretlenemez.`);
    }

    doc.status = "Ready for Pickup";
    doc.modified = now();
    saveState(state);
    return buildPayload(doc);
  },

  async generateLabels(shipment, packageCodes, format) {
    await delay(380);
    throwIfFaulted("label");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    const stamp = now();
    for (const p of doc.packages) {
      if (!packageCodes.includes(p.package_code)) continue;
      p.label = { ...(p.label ?? emptyLabel()), status: "Generated", format, generated_at: stamp };
    }
    doc.modified = now();
    saveState(state);

    const payload = buildPayload(doc);
    const chosen = payload.packages.filter((p) => packageCodes.includes(p.package_code));
    return {
      labels: chosen.map((p) => ({
        package_code: p.package_code, url: p.label.url,
        barcode_url: p.label.barcode_url, format, generated_at: stamp,
      })),
      batch_url: buildLabelDocument(payload, chosen, format),
    };
  },

  async reprintLabels(shipment, packageCodes, reason, reasonNote) {
    await delay(300);
    throwIfFaulted("label");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    const stamp = now();
    for (const p of doc.packages) {
      if (!packageCodes.includes(p.package_code)) continue;
      const label = p.label ?? emptyLabel();
      p.label = { ...label, status: "Printed", printed_at: stamp, print_count: (label.print_count ?? 0) + 1 };
    }
    doc.modified = now();
    // Denetim izi — gerçek uçta `Shipment Label Log` DocType'ı.
    doc.label_log = [
      ...(doc.label_log ?? []),
      { action: "reprint", package_codes: packageCodes, reason: reason ?? null, reason_note: reasonNote ?? null, timestamp: stamp },
    ];
    saveState(state);

    const payload = buildPayload(doc);
    const chosen = payload.packages.filter((p) => packageCodes.includes(p.package_code));
    return {
      batch_url: buildLabelDocument(payload, chosen, chosen[0]?.label?.format || "thermal_100x150"),
    };
  },

  async voidLabel(shipment, packageCode, reason) {
    await delay();
    throwIfFaulted("label");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    const pkg = doc.packages.find((p) => p.package_code === packageCode);
    if (pkg) pkg.label = { ...(pkg.label ?? emptyLabel()), status: "Voided", carrier_tracking: null };
    doc.label_log = [
      ...(doc.label_log ?? []),
      { action: "void", package_codes: [packageCode], reason: reason ?? null, timestamp: now() },
    ];
    doc.modified = now();
    saveState(state);
    return buildPayload(doc);
  },

  async getPackingSlip(shipment, packageCodes) {
    await delay(240);
    const payload = buildPayload(getDoc(loadState(), shipment));
    const chosen = packageCodes?.length
      ? payload.packages.filter((p) => packageCodes.includes(p.package_code))
      : payload.packages;
    return { url: buildPackingSlipDocument(payload, chosen) };
  },

  // ── palet ──────────────────────────────────────────────────────────

  async getPalletPlan(shipment) {
    await delay();
    const doc = getDoc(loadState(), shipment);
    return { shipment, pallets: decoratePallets(doc), modified: doc.modified, pallet_types: PALLET_TYPES, packages: buildPayload(doc).packages };
  },

  async savePalletPlan(shipment, pallets, modified) {
    await delay(280);
    throwIfFaulted("save");
    const state = loadState();
    const doc = getDoc(state, shipment);
    assertWritable(doc);

    if (modified && doc.modified && modified !== doc.modified) {
      throw fail("CONFLICT", "Bu sevkiyatı başka bir kullanıcı sizden sonra değiştirdi.");
    }

    doc.pallets = plain(pallets).map((p, i) => ({
      row_id: p.row_id ?? `pl${Date.now()}${i}`,
      pallet_code: p.pallet_code || `PLT-${String(i + 1).padStart(3, "0")}`,
      pallet_type: p.pallet_type,
      max_weight_kg: Number(p.max_weight_kg) || 0,
      max_layers: Number(p.max_layers) || 0,
      layer_count: Number(p.layer_count) || 0,
      packages: [...(p.packages ?? [])],
    }));
    doc.modified = now();
    saveState(state);
    return { shipment, pallets: decoratePallets(doc), modified: doc.modified, pallet_types: PALLET_TYPES, packages: buildPayload(doc).packages };
  },
};

/**
 * Palet ölçüleri koli atamalarından TÜRETİLİR.
 *
 * `is_overloaded` sunucunun kararı (sözleşme §2.8) — ekran yeniden
 * hesaplamıyor, mock da kuralı burada uyguluyor.
 */
function decoratePallets(doc) {
  const byCode = new Map(buildPayload(doc).packages.map((p) => [p.package_code, p]));
  return (doc.pallets ?? []).map((pallet) => {
    const loaded = (pallet.packages ?? []).map((code) => byCode.get(code)).filter(Boolean);
    const weight = loaded.reduce((s, p) => s + Number(p.weight_kg || 0) * Number(p.qty ?? 1), 0);
    const desi = loaded.reduce((s, p) => s + p.desi * Number(p.qty ?? 1), 0);
    return {
      ...pallet,
      package_count: loaded.length,
      loaded_weight_kg: Math.round(weight * 10) / 10,
      loaded_desi: desi,
      is_overloaded:
        (pallet.max_weight_kg > 0 && weight > pallet.max_weight_kg) ||
        (pallet.max_layers > 0 && pallet.layer_count > pallet.max_layers)
          ? 1
          : 0,
    };
  });
}

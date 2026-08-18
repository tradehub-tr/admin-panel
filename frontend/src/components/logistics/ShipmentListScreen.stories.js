import shipments from "@/mocks/logistics/shipment.json";

import ShipmentListScreen from "./ShipmentListScreen.vue";

/**
 * **B1 · Sevkiyat listesi** (TUR-117).
 *
 * Gecikme durumdan AYRI gösteriliyor: bir sevkiyat "Yolda" olup aynı anda
 * gecikmiş olabilir. Tek bir "Gecikmiş" durumu uydurmak sözleşmeyi bozardı —
 * backend'de gecikme bir bayrak (`is_delayed`), durum değil.
 *
 * SAYFA NUMARASI VE DURUM FİLTRESİ ekranın state'i değil: `page`/`status`
 * prop'u iniyor, kullanıcı değiştirince `update:page`/`filter-status`
 * çıkıyor. Container onları `?page`/`?status`e yazıyor ve veriyi yeniden
 * çekiyor; story'de de aynı yön geçerli (Storybook olayları action olarak
 * gösterir, ekran kendi kendine değişmez).
 *
 * ARAMA KUTUSU VE SÜTUN SIRALAMASI YOK: `list_shipments` yalnız `status`,
 * `order` ve sayfalama parametrelerini kabul ediyor. Çalışmayan kontrolü
 * göstermektense hiç göstermemek doğru — tasarım incelemesinde bu eksiklik
 * bilinçli.
 */
export default {
  title: "Lojistik/KT1 · Sevkiyat/Liste",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-shipment-list",
  component: ShipmentListScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = shipments.default.data.items;

// Sayaçlar backend'den gelir; burada fixture'dan türetiliyor ki story ile
// tablo birbirini yalanlamasın.
const STATUS_COUNTS = ROWS.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

const MANAGER = { read: true, write: true, create: true, cancel: true };
const OPERATOR = { read: true, write: false, create: false, cancel: false };

export const Default = {
  name: "Dolu liste",
  args: {
    rows: ROWS,
    total: shipments.default.data.total,
    statusCounts: STATUS_COUNTS,
    can: MANAGER,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], total: 0, statusCounts: {}, can: MANAGER },
};

/**
 * Seçili hap (`status`) URL'den iniyor: "Teslim edildi" vurgulu ama sonuç
 * yok → EmptyState "filtreyi temizle" dalına düşüyor. Filtresiz boş liste
 * (`Empty`) ile aynı ekranı göstermek kullanıcıya "hiç kayıt yok" dedirtirdi.
 */
export const FilteredEmpty = {
  name: "Boş · filtre yüzünden",
  args: { rows: [], total: 0, statusCounts: {}, can: MANAGER, status: "Delivered" },
};

/** Toplu seçim — etiket yazdır / durum güncelle alt çubukta. */
export const WithSelection = {
  name: "Toplu seçim",
  args: { ...Default.args, selection: ROWS.slice(0, 3).map((r) => r.name) },
};

/**
 * Logistics Operator: yeni sevkiyat ve toplu aksiyon butonları yok.
 * Disabled değil — hiç render edilmiyorlar.
 */
export const OperatorRole = {
  name: "Rol · operatör",
  args: { ...Default.args, can: OPERATOR },
};

/**
 * Sayfalama çubuğu (DataTable'ın KENDİ `ListPagination`'ı — ekran ikinci bir
 * tane çizmiyor). Sayfa boyutu seçicisi kapalı: boyut container'da sabit,
 * URL yalnız `?page` taşıyor.
 *
 * `total` uçtan gelir, satır sayısından hesaplanmaz; fixture 5 satır taşıdığı
 * için toplam burada elle büyütülüyor — gerçek yanıtın şekli aynı.
 */
export const Paged = {
  name: "Sayfalama · 2. sayfa",
  args: { ...Default.args, total: 128, page: 2, pageSize: 5 },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    rows: [],
    total: 0,
    statusCounts: {},
    error: shipments.error.error,
  },
};

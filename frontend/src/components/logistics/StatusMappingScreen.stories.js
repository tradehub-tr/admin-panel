import mappings from "@/mocks/logistics/carrier_status_mapping.json";

import StatusMappingScreen from "./StatusMappingScreen.vue";

/**
 * **F4 · Durum eşleme yönetimi** (TUR-111, TUR-112).
 *
 * Jenerik katalog ekranı (M1) bu kaydı da listeleyebilir; bu ekran onun
 * ÜSTÜNE bir soru cevaplıyor: *kapsam tam mı?* Fixture'daki eşleme sayısı
 * az olduğu için varsayılan story bilinçli olarak "eksik kapsam" gösteriyor —
 * gerçek durum da bu.
 */
export default {
  title: "Lojistik/KT2 · Taşıyıcı/Durum eşlemesi",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-status-mapping",
  component: StatusMappingScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = mappings.default.data.items;

export const Default = {
  name: "Eksik kapsam",
  args: { carrier: "YK", rows: ROWS, can: { read: true, write: true } },
};

/**
 * Kapsam tam: taşıyıcıdan gelmesi beklenen dokuz iç durumun hepsi eşlenmiş.
 * (Draft ve Cancelled kapsam dışı — iç akışta oluşur, kargo bildirmez.)
 */
export const FullCoverage = {
  name: "Kapsam tam",
  args: {
    carrier: "YK",
    rows: [
      "Pending",
      "Ready for Pickup",
      "Picked Up",
      "In Transit",
      "At Warehouse",
      "Out for Delivery",
      "Delivered",
      "Returned",
      "Failed",
    ].map((status, index) => ({
      name: `YK-${100 + index}`,
      carrier: "YK",
      carrier_status_code: String(100 + index),
      carrier_status_text: `Taşıyıcı durumu ${100 + index}`,
      internal_status: status,
      exception_code: status === "Failed" ? "RECIPIENT_ABSENT" : null,
    })),
    can: { read: true, write: true },
  },
};

/** Aynı iç duruma birden çok taşıyıcı kodu düşebilir — gruplama bunu gösteriyor. */
export const MultipleCodesPerStatus = {
  name: "Bir duruma birden çok kod",
  args: {
    carrier: "YK",
    rows: [
      ...ROWS,
      {
        name: "YK-161",
        carrier: "YK",
        carrier_status_code: "161",
        carrier_status_text: "Dağıtım aracında",
        internal_status: ROWS[0]?.internal_status ?? "In Transit",
        exception_code: null,
      },
    ],
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};

/** Yükleniyor: iskelet, boş tablo değil — yerleşim kaymasın. */
export const Loading = {
  name: "Yükleniyor",
  args: { carrier: "YK", rows: [], loading: true, can: { read: true, write: true } },
};

/**
 * Hiç eşleme yok — ortak `EmptyState` deseni (çıplak `<p>` değil), böylece
 * boş kuyruk her lojistik ekranında aynı görünüyor.
 */
export const Empty = {
  name: "Eşleme yok",
  args: { carrier: "MNG", rows: [], can: { read: true, write: true } },
};

/** Yetki hatası — "Yeniden dene" butonu YOK, yetki denemekle düzelmez. */
export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    carrier: "YK",
    rows: [],
    can: { read: false, write: false },
    error: mappings.error.error,
  },
};

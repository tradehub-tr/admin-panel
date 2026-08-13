import tests from "@/mocks/logistics/connection_test.json";

import ConnectionTestScreen from "./ConnectionTestScreen.vue";

/**
 * **F2 · Bağlantı testi** (TUR-110, TUR-111).
 *
 * Sözleşmedeki örnek veri bilinçli olarak KISMİ BAŞARI: hesap doğrulanıyor,
 * fiyat sorgusu çalışıyor, takip 403 dönüyor. Gerçek hayatta en sık görülen
 * senaryo bu ve tek bir yeşil "bağlantı çalışıyor" göstergesi onu gizlerdi.
 */
export default {
  title: "Lojistik/KT2 · Taşıyıcı/Bağlantı testi",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-connection-test",
  component: ConnectionTestScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const RESULTS = tests.default.data.items;
const ACCOUNT = "Yurtiçi Kargo — Platform";

export const Default = {
  name: "Kısmi başarı (takip düştü)",
  args: { accountName: ACCOUNT, results: RESULTS },
};

/** Hepsi geçti — özet yeşil. */
export const AllPassing = {
  name: "Tümü çalışıyor",
  args: {
    accountName: ACCOUNT,
    results: RESULTS.map((r) => ({
      ...r,
      succeeded: 1,
      http_status: 200,
      error_code: null,
      message: "Başarılı.",
    })),
  },
};

/** Kimlik doğrulama düştü — diğerleri de düşer, özet kırmızı. */
export const AllFailing = {
  name: "Tümü başarısız",
  args: {
    accountName: ACCOUNT,
    results: RESULTS.map((r) => ({
      ...r,
      succeeded: 0,
      http_status: 401,
      error_code: "INVALID_CREDENTIALS",
      message: "Kimlik bilgileri geçersiz.",
    })),
  },
};

/**
 * 200 dönüyor ama 3 saniye sürüyor: "çalışıyor" ama sipariş akışını
 * tıkar. Gecikme sarı gösteriliyor.
 */
export const SlowButWorking = {
  name: "Çalışıyor ama yavaş",
  args: {
    accountName: ACCOUNT,
    results: RESULTS.map((r) => ({
      ...r,
      succeeded: 1,
      http_status: 200,
      duration_ms: 3200,
      error_code: null,
      message: "Başarılı (yavaş).",
    })),
  },
};

export const NeverTested = {
  name: "Hiç test edilmedi",
  args: { accountName: ACCOUNT, results: [] },
};

export const Running = {
  name: "Test ediliyor",
  args: { accountName: ACCOUNT, results: [], running: true },
};

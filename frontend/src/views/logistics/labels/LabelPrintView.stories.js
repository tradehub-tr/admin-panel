import { dugmeyeTikla, ekranStory, EKRAN_PARAMETRELERI, yuklemeyiBekle } from "@story/harness";

import LabelPrintView from "./LabelPrintView.vue";

/**
 * **G2 · Etiket ve belgeler** — 13-FE ile teslim edildi.
 *
 * Tablo + yan önizleme düzeni. Çalışma alanıyla AYNI yükü kullanıyor
 * (`get_shipment_packing`): koli bilgisi iki ayrı uçtan gelseydi aralarında
 * kayma olur ve etiket bayat ağırlık basardı.
 *
 * YENİDEN BASIM GEREKÇESİ (D2 kuralı) yalnız daha önce basılmış koli varsa
 * soruluyor — ilk basım normal akış, gerekçe istemek gereksiz sürtünme
 * olurdu.
 *
 * VOID SATIŞ TARAFINA KAPALI: iptal, taşıyıcıya GERİ ALINAMAZ bir istek
 * gönderiyor; `can.void` yalnız yönetim yetkisiyle açılıyor (etiket üretme
 * ve yeniden basma satıcıda var).
 *
 * PANO GÖRÜNÜMÜ YOK ve bu bilinçli: etiketin iki hâli var (basıldı /
 * basılmadı) ve bu bir durum AKIŞI değil bir bayrak.
 *
 * TAŞIYICI TEKLİFLERİ bloğu fiyatlandırma simülasyonundan besleniyor
 * (20-FE). Teklif yoksa blok hiç çizilmiyor — boş bir tablo göstermek
 * "fiyat bulunamadı" ile "fiyatlandırma kapalı"yı karıştırırdı.
 */
export default {
  title: "Lojistik/Ekranlar/Paketleme/Etiket",
  id: "logistics-screen-label-print",
  component: LabelPrintView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (name) => ({ name: "LogisticsLabels", params: { name } });

/** Kolileri hazır, etiketi henüz üretilmemiş sevkiyat. */
export const EtiketYok = {
  name: "Etiket üretilmemiş",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00045") }),
};

/** Etiketi üretilmiş sevkiyat — önizleme sağda, yazdırma açık. */
export const EtiketUretildi = {
  name: "Etiket üretildi",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00042") }),
};

/** Daha önce basılmış etiket — yeniden basımda gerekçe isteniyor. */
export const EtiketBasildi = {
  name: "Etiket basıldı",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00046") }),
};

/** Kilitli sevkiyat: üret / yazdır / iptal düğmelerinin hiçbiri çizilmiyor. */
export const Kilitli = {
  name: "Kilitli · salt-okunur",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00047") }),
};

/** Tümü seçili — toplu üretim ve yazdırma düğmeleri sayıyı gösteriyor. */
export const TumuSecili = {
  name: "Toplu seçim",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00042") }),
  play: async ({ canvasElement }) => {
    await yuklemeyiBekle(canvasElement);
    const secHepsi = canvasElement.querySelector('thead input[type="checkbox"]');
    secHepsi?.click();
  },
};

/**
 * Satıcı rolü: etiket üretme ve yeniden basma AÇIK (FBM/Trendyol'da satıcının
 * işi), iptal KAPALI.
 */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota("SHP-2026-00042") }),
};

/** Salt-okunur: hiçbir etiket eylemi çizilmiyor, önizleme okunabiliyor. */
export const RolSaltOkunur = {
  name: "Rol · salt-okunur",
  ...ekranStory({ role: "readonly", route: rota("SHP-2026-00042") }),
};

export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00042"),
    hold: ["packaging.fetchPacking:loading"],
  }),
};

/**
 * `CARRIER_ERROR` — taşıyıcı etiketi üretemedi. Ekranın kendi hatası değil,
 * dış sistemin reddi; mesaj sebebi söylüyor ("posta kodu servis alanı
 * dışında") çünkü kullanıcı yapacağı işi ancak o zaman biliyor.
 */
export const HataTasiyici = {
  name: "Hata · taşıyıcı reddetti",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00045"),
    fault: { packaging: "carrier" },
  }),
  play: async ({ canvasElement }) => {
    // Seçim yokken düğme tekil koli için "Etiket oluştur"; toplu seçimde
    // "Etiket üret" oluyor. İkisi de aynı uca gidiyor.
    await dugmeyeTikla(canvasElement, /etiket (üret|oluştur)|generate/i);
  },
};

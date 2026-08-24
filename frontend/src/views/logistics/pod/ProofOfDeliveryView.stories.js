import { elemaniBekle, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import ProofOfDeliveryView from "./ProofOfDeliveryView.vue";

/**
 * **H2 · Teslim kanıtı detayı** — 14-FE ile teslim edildi.
 *
 * Ekran bir sevkiyatın kanıt kaydını gösterir; rota parametresiyle açılıyor
 * (`lojistik/sevkiyatlar/:name/teslim-kaniti`), bu yüzden her varyant kendi
 * sevkiyatını seçiyor.
 *
 * İKİ AYRI "VERİ YOK" DURUMU var ve karıştırılmamalı:
 *   · sevkiyat teslim edilmiş ama kanıt kaydedilmemiş → HATA DEĞİL, eksik
 *     veri; ekran tek çıkış yolunu (kanıt kaydet) gösterir,
 *   · sevkiyat henüz teslim edilmemiş → kanıt beklemek anlamsız, kayıt
 *     düğmesi hiç çizilmez.
 *
 * KANIT GÖRSELLERİ GERÇEK (2026-08-24, §A11): imza, teslim fotoğrafı ve
 * irsaliye `data:` URI olarak yükün İÇİNDE geliyor (`api/podMediaSeed.js`).
 * Önceden üç alan da yer tutucu metin taşıyordu (`"signature_url": "sig"`),
 * ekran doğru davranıp "Görsel yüklenemedi" çiziyordu ama medyanın tasarımı
 * hiç gözden geçirilemiyordu. 14-BE gerçek `file_url` döndürmeye başladığında
 * o modül silinir, ekran değişmez.
 *
 * DÜZELTME YETKİYE BAĞLI: satıcı kendi beyanını sessizce değiştiremesin diye
 * `can.amend` satıcıda false — düğme disabled değil, HİÇ çizilmiyor
 * (`Rol · satıcı` varyantı).
 */
export default {
  title: "Lojistik/Ekranlar/Teslim kanıtı/Kanıt detayı",
  id: "logistics-screen-pod-detail",
  component: ProofOfDeliveryView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (name) => ({ name: "LogisticsProofOfDelivery", params: { name } });

/** Taşıyıcı kaynaklı, eksiksiz teslim edilmiş kanıt. */
export const Kanitli = {
  name: "Kanıt var",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00033") }),
};

/**
 * Eksik teslim: 40 kolinin 38'i. Tutarsızlık ekranda AYRI gösteriliyor —
 * "teslim edildi" ile "eksiksiz teslim edildi" aynı şey değil.
 */
export const KismiTeslim = {
  name: "Kısmi teslim · tutarsızlık",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00038") }),
};

/** Satıcının kendi beyanı — kaynak damgası taşıyıcıdan farklı. */
export const SaticiBeyani = {
  name: "Satıcı beyanı",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00044") }),
};

/** Teslim edilmiş ama kanıt yok — ekran tek çıkış yolunu veriyor. */
export const KanitYok = {
  name: "Kanıt yok · teslim edilmiş",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00041") }),
};

/**
 * Henüz teslim edilmemiş sevkiyat: kayıt düğmesi YOK. Bu ayrım olmasaydı
 * operatör yolda olan bir sevkiyata kanıt yazabilirdi.
 */
export const TeslimEdilmemis = {
  name: "Teslim edilmemiş",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00046") }),
};

/** Kanıt kaydetme çekmecesi — istisna kodları katalogdan geliyor, gömülü değil. */
export const KayitCekmecesi = {
  name: "Kanıt kaydetme çekmecesi",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00041") }),
  play: async ({ canvasElement }) => {
    const dugme = await elemaniBekle(canvasElement, "button.hdr-btn-primary");
    dugme.click();
  },
};

/** Düzeltme çekmecesi — kayıt SİLİNMİYOR, denetim izi bırakıyor. */
export const DuzeltmeCekmecesi = {
  name: "Düzeltme çekmecesi",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00033") }),
  play: async ({ canvasElement }) => {
    const dugme = await elemaniBekle(canvasElement, "button.hdr-btn-primary");
    dugme.click();
  },
};

/**
 * Satıcı rolü: aynı kanıt, ama düzeltme düğmesi yok.
 * (`stores/pod.js` — "düzeltme satıcıda YOK: kendi beyanını sessizce
 * değiştirebilirdi".)
 */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota("SHP-2026-00033") }),
};

export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00033"),
    hold: ["pod.fetchPod:detail.loading"],
  }),
};

/** Olmayan sevkiyat → `NOT_FOUND`. Sözleşmedeki kod ekranda görünüyor. */
export const HataBulunamadi = {
  name: "Hata · bulunamadı",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-99999") }),
};

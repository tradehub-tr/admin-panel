import { elemaniBekle, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import BuyerPickupView from "./BuyerPickupView.vue";

/**
 * **D2 · Alıcı teslim alma** — 14-FE ile teslim edildi.
 *
 * Alıcının gelip teslim aldığı sevkiyatlar. İki kapı ekranda GÖRÜNÜR olarak
 * uygulanıyor:
 *
 *   · **Ödeme kapısı (K-K):** ödeme alınmamışsa "Teslim et" düğmesi HİÇ
 *     RENDER EDİLMİYOR — devre dışı bile değil, yok. Yerine kırmızı durum
 *     şeridi çıkıyor. Uyarıya rağmen tıklanabilen bir düğme günün sonunda
 *     tıklanır; kapı sunucuda da var.
 *   · **Teslim kodu:** kod gerekliyse ve doğrulanmamışsa çekmece kodu
 *     zorunlu alan yapıyor.
 *
 * Teslim başarılı olunca kanıt ekranına yönlendiriliyor: teslim aksiyonu
 * POD'u DOĞURUYOR (K-F), iki iş ayrılamaz.
 */
export default {
  title: "Lojistik/Ekranlar/Teslimat/Alıcı teslim alma",
  id: "logistics-screen-buyer-pickup",
  component: BuyerPickupView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = { name: "LogisticsBuyerPickup" };

/**
 * Dolu liste. Tohumda dört satır var ve ikisi karşıt uçları gösteriyor:
 * `SHP-2026-00048` teslime hazır (ödeme alınmış, kod doğrulanmış),
 * `SHP-2026-00049` ÖDEME ENGELLİ — o satırda teslim düğmesi yerine kırmızı
 * şerit duruyor.
 */
export const Dolu = {
  name: "Dolu liste",
  ...ekranStory({ role: "admin", route: rota }),
};

/** Teslim çekmecesi — teslim alan kişi ve unvanı zorunlu, unvan katalogdan. */
export const TeslimCekmecesi = {
  name: "Teslim çekmecesi",
  ...ekranStory({ role: "admin", route: rota }),
  play: async ({ canvasElement }) => {
    // İlk teslim edilebilir satırın düğmesi — ödeme engelli satırda düğme
    // hiç çizilmediği için seçici onu kendiliğinden atlıyor.
    const dugme = await elemaniBekle(canvasElement, "button.hdr-btn-primary");
    dugme.click();
  },
};

/** Satıcı rolü: kendi kayıtları — "Yıldız Nalbur" satırı listede yok. */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota }),
};

export const Bos = {
  name: "Boş",
  ...ekranStory({ role: "admin", route: rota, empty: ["pod"] }),
};

export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({ role: "admin", route: rota, hold: ["pod.fetchFlow:flows.{0}.loading"] }),
};

export const HataYetki = {
  name: "Hata · yetki yok",
  ...ekranStory({ role: "admin", route: rota, fault: { pod: "permission" } }),
};

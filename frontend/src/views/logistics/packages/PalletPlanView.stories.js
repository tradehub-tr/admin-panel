import { dugmeyeTikla, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import PalletPlanView from "./PalletPlanView.vue";

/**
 * **G3 · Palet planı** — 13-FE ile teslim edildi.
 *
 * Kolileri paletlere dağıtır ve kapasiteyi gösterir. Menüde YOK (parametreli
 * rota); giriş kapısı paketleme çalışma alanındaki "Palet planı" düğmesi.
 *
 * `is_overloaded` SUNUCUDAN geliyor, ekran yeniden hesaplamıyor: kapasite
 * kuralı backend'in kararı (sözleşme §2.8). Atama değişince kayıt yapılır ve
 * dönen yükteki bayrak kullanılır — yerel tahmin yürütülmez. Bu yüzden aşım
 * uyarısı ancak KAYDETTİKTEN sonra belirir; story'de de öyle.
 *
 * Kendi store'u yok: palet, paketleme taslağından bağımsız bir kayıt ve tek
 * ekranlık state'i bileşende duruyor.
 *
 * BİLİNEN BOŞLUK — okuma hatası: `packagingMock.getPalletPlan` bir hata
 * tetikleyicisi çalıştırmıyor (`throwIfFaulted` yalnız kaydetmede). Bu
 * yüzden "hata" varyantı KAYDETME yolundan üretiliyor; okuma hatası ekranı
 * bugün Storybook'ta gösterilemiyor.
 */
export default {
  title: "Lojistik/Ekranlar/Paketleme/Palet planı",
  id: "logistics-screen-pallet-plan",
  component: PalletPlanView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (name) => ({ name: "LogisticsPalletPlan", params: { name } });

/** Paleti olan sevkiyat — kapasite göstergeleri ve atanmış koliler. */
export const Dolu = {
  name: "Palet planı var",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00042") }),
};

/** Hiç palet yok — ekran tek çıkış yolunu veriyor: "Palet ekle". */
export const PaletYok = {
  name: "Palet yok",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00045") }),
};

/** Yeni palet eklendikten sonra: boş palet + atama havuzu yan yana. */
export const PaletEklendi = {
  name: "Palet eklendi",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00045") }),
  play: async ({ canvasElement }) => {
    await dugmeyeTikla(canvasElement, /palet ekle|add pallet/i);
  },
};

/**
 * Salt-okunur: palet ekleme, kaldırma, atama ve kaydetme düğmelerinin
 * hiçbiri çizilmiyor. Plan yine okunabiliyor.
 */
export const RolSaltOkunur = {
  name: "Rol · salt-okunur",
  ...ekranStory({ role: "readonly", route: rota("SHP-2026-00042") }),
};

/** Satıcı kendi sevkiyatının paletini planlayabiliyor. */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota("SHP-2026-00042") }),
};

/**
 * Kaydetme yetki hatası. Okuma başarılı olduğu için plan ekranda duruyor ve
 * hata onun üstüne biniyor — kullanıcının girdiği atama kaybolmuyor.
 */
export const HataKaydetme = {
  name: "Hata · kaydetme yetkisi yok",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00042"),
    fault: { packaging: "permission" },
  }),
  // "Kaydet" değişiklik yokken DEVRE DIŞI (taslak kirli değilse kaydedecek
  // bir şey yok). Bu yüzden önce bir palet ekleniyor, sonra kaydediliyor.
  play: async ({ canvasElement }) => {
    await dugmeyeTikla(canvasElement, /palet ekle|add pallet/i);
    await dugmeyeTikla(canvasElement, /taslağı kaydet|kaydet|save/i);
  },
};

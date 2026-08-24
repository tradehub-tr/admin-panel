import { ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import SellerDeliveryView from "./SellerDeliveryView.vue";

/**
 * **D1 · Satıcı teslimatı** — 14-FE ile teslim edildi.
 *
 * Satıcının kendi aracıyla yaptığı teslimatların listesi. D2 (alıcı teslim
 * alma) ile BİRLEŞTİRİLMEDİ (karar K-N): manifest, menü kalemleri ve rol
 * matrisi iki ayrı ekrana göre kurulu; ortak olan yalnız sunum kabuğu
 * (`DeliveryFlowScreen`).
 *
 * ATANMAMIŞ ALAN BOŞ BIRAKILMIYOR: sürücü ya da plaka yoksa amber "atanmadı"
 * yazıyor — boşluk, "veri yok" ile "henüz atanmadı"yı ayırt ettirmiyor.
 *
 * Arama 400 ms debounce'la gidiyor, süzgeçler anında (ölü arama düzeltmesi,
 * 2026-08-20). Story'ler süzgeçlere dokunmuyor; davranış ekranın kendi
 * denetimlerinde sınanıyor.
 */
export default {
  title: "Lojistik/Ekranlar/Teslimat/Satıcı teslimatı",
  id: "logistics-screen-seller-delivery",
  component: SellerDeliveryView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = { name: "LogisticsSellerDelivery" };

/**
 * Admin görünümü: tüm satıcıların teslimatları. Üç satırdan biri "Yıldız
 * Nalbur"a ait — satıcı varyantında bu satırın DÜŞMESİ tenant süzgecinin
 * çalıştığının kanıtı.
 */
export const Dolu = {
  name: "Dolu liste",
  ...ekranStory({ role: "admin", route: rota }),
};

/**
 * Satıcı rolü: "kendi kayıtlarınız" rozeti + başkasının teslimatı listede
 * YOK. Satıcının neyi görmediği en az neyi gördüğü kadar önemli.
 */
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
  ...ekranStory({
    role: "admin",
    route: rota,
    // `fetchFlow` akış tipini argüman olarak alıyor; `{0}` onu yerine koyuyor.
    hold: ["pod.fetchFlow:flows.{0}.loading"],
  }),
};

export const HataYetki = {
  name: "Hata · yetki yok",
  ...ekranStory({ role: "admin", route: rota, fault: { pod: "permission" } }),
};

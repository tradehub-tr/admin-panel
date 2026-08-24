import { araVeUygula, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import PodQueueView from "./PodQueueView.vue";

/**
 * **H0 · Teslim kanıtı kuyruğu** — 14-FE ile teslim edildi.
 *
 * Bu story PROTOTİP DEĞİL: ekranın kendisi, gerçek `pod` store'u ve gerçek
 * mock zinciri (`api/podMock.js`) ile çalışıyor. Kova sayaçları, filtreler ve
 * pano dağılımı uydurma değil — hepsi tohumdan türetiliyor.
 *
 * KOVALAR VE LİSTE AYNI YANITTAN geliyor (sözleşme §2.1): ayrı bir sayaç
 * isteği liste yerleştikten sonra dönüp listeyi kaydırıyordu.
 *
 * "Hiç kayıt yok" ile "bu filtrede yok" AYRI cümleler kuruyor — ikisini tek
 * boş duruma indirmek kullanıcıya filtreyi unutturur. `Boş · filtre yüzünden`
 * varyantı bu ayrımı gösteriyor.
 */
export default {
  title: "Lojistik/Ekranlar/Teslim kanıtı/Kuyruk",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-screen-pod-queue",
  component: PodQueueView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

export const Dolu = {
  name: "Dolu kuyruk",
  ...ekranStory({ role: "admin" }),
};

/**
 * Mock gecikmesi 180 ms — iskelet göz açıp kapayana kadar geçiyor ve tasarım
 * incelemesinde görülemiyordu. Burada kuyruk çağrısı bilerek askıya alınıyor.
 */
export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({ role: "admin", hold: ["pod.fetchQueue:queue.loading"] }),
};

export const Bos = {
  name: "Boş · hiç kayıt yok",
  ...ekranStory({ role: "admin", empty: ["pod"] }),
};

/**
 * Aynı ekran, farklı cümle: filtre yüzünden boş kalınca "filtreyi temizle"
 * çıkış yolu beliriyor. Filtre depoya değil ekranın kendi state'ine yazılıyor,
 * bu yüzden varyant aramayı doğrudan store filtresine koyuyor.
 */
export const BosFiltreli = {
  name: "Boş · filtre yüzünden",
  ...ekranStory({ role: "admin" }),
  // Filtre store'da değil ekranın kendi `searchDraft` ref'inde: mount'taki
  // `load()` store filtresini ekrandaki kutudan yeniden yazıyor. Bu yüzden
  // varyant kutuyu GERÇEKTEN dolduruyor — hiçbir sevkiyatın taşımadığı bir
  // metinle kapsam dolu, sonuç boş kalıyor.
  play: async ({ canvasElement }) => {
    await araVeUygula(canvasElement, 'input[type="search"]', "ZZZ-eşleşmeyen");
  },
};

/**
 * `CAPABILITY_REQUIRED` — sözleşmedeki gerçek kod, uydurma bir yük değil.
 * `ErrorState` yeniden dene düğmesini çiziyor; mock hatası kalıcı olduğu için
 * tıklamak aynı hatayı verir (gerçek uçtaki davranışın taklidi).
 */
export const HataYetki = {
  name: "Hata · yetki yok",
  ...ekranStory({ role: "admin", fault: { pod: "permission" } }),
};

/**
 * Satıcı rolü. İki fark görünür olmalı:
 *   · başlıkta "kendi kayıtları" rozeti,
 *   · satıcı süzgeci HİÇ ÇİZİLMİYOR (kendi kayıtlarını görüyor, "tüm
 *     satıcılar" seçeneği anlamsız olurdu).
 * Kapsam da dar: tohumdaki "Yıldız Nalbur" kayıtları listede olmamalı.
 */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller" }),
};

/**
 * Pano görünümü dört kovayı birden gösterir; süzgeç hapları PANODA GİZLİ
 * (ikisi yan yana dururken hangisinin geçerli olduğu okunmuyor).
 * Mod ekranın state'i değil, `useResponsiveViewMode` ile diske yazılıyor —
 * varyant onu doğrudan kuruyor. Not: pano yalnız `lg` ve üzeri genişlikte
 * seçilebilir.
 */
export const Pano = {
  name: "Pano · kovalar",
  ...ekranStory({ role: "admin", storage: { "lv-mode:logistics-pod-queue": "kanban" } }),
};

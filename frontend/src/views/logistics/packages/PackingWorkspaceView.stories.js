import { dugmeyeTikla, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import PackingWorkspaceView from "./PackingWorkspaceView.vue";

/**
 * **G1 · Paketleme çalışma alanı** — 13-FE ile teslim edildi.
 *
 * Üç bölgeli düzen: solda atanacak kalemler, ortada koliler, sağda özet ve
 * doğrulama. Operatörün asıl işi burada bitiyor.
 *
 * OTOMATİK KAYDETME YOK — bilinçli: depoda ağ kopuyor ve yarım koli kaydı
 * kirli veri üretir. Değişiklikler taslakta birikir, "Kaydet" açık bir
 * eylemdir ve kaydedilmemiş değişiklikle çıkışta onay istenir.
 *
 * DOĞRULAMA TEK OTORİTE: kart kendi kuralını uydurmuyor, bulgular
 * `validatePacking` motorundan geliyor.
 *
 * KİLİTLİ SEVKİYAT salt-okunur: terminal durumda sunucu da reddediyor, bu
 * yüzden düğmeler devre dışı değil HİÇ çizilmiyor.
 */
export default {
  title: "Lojistik/Ekranlar/Paketleme/Çalışma alanı",
  id: "logistics-screen-packing-workspace",
  component: PackingWorkspaceView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (name) => ({ name: "LogisticsPacking", params: { name } });

/** Henüz hiç koli açılmamış sevkiyat — ilk adım "yeni koli". */
export const KoliYok = {
  name: "Koli yok · başlangıç",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00043") }),
};

/** Kolileri açılmış, kalemleri atanmış sevkiyat. */
export const Paketli = {
  name: "Paketli sevkiyat",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00042") }),
};

/** Paketlemesi tamamlanmış sevkiyat — sonraki adım etiket. */
export const PaketlemeTamam = {
  name: "Paketleme tamamlandı",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00045") }),
};

/**
 * Kilitli sevkiyat: yazma düğmeleri yok. Ekran "salt-okunur" demek yerine
 * yapılamayacak işi hiç göstermiyor.
 */
export const Kilitli = {
  name: "Kilitli · salt-okunur",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00047") }),
};

/**
 * Boş koli eklenince doğrulama bulgusu beliriyor — ölçü ve içerik olmayan
 * koli kaydedilebilir ama TAMAMLANAMAZ ("Kaydet" ile "Tamamla" ayrı kapılar).
 */
export const DogrulamaBulgusu = {
  name: "Doğrulama bulgusu · boş koli",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00043") }),
  play: async ({ canvasElement }) => {
    await dugmeyeTikla(canvasElement, /yeni koli|new package/i);
  },
};

/** Satıcı kendi sevkiyatını kendisi paketliyor — bu ekran onun günlük işi. */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota("SHP-2026-00042") }),
};

/** Salt-okunur operatör: koli açma ve kaydetme düğmeleri hiç çizilmiyor. */
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

export const HataYetki = {
  name: "Hata · yetki yok",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00042"),
    fault: { packaging: "permission" },
  }),
};

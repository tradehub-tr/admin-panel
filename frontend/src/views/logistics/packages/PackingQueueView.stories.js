import { elemaniBekle, ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import PackingQueueView from "./PackingQueueView.vue";

/**
 * **G0 · Paketleme kuyruğu** — 13-FE ile teslim edildi.
 *
 * Operatörün (ve satıcının) giriş kapısı. Sevkiyat detayından da paketlemeye
 * girilebiliyor, ama o rota başka bir sahibin alanında; bağımsız bir kapı
 * olmadan ekran yalnız URL ezberleyene açık kalırdı.
 *
 * FİLTRELER URL SORGUSUNDA (TUR-117 "paylaşılabilir filtre"): operasyonda
 * "şu gecikenlere bak" linki gönderiliyor. Bu yüzden varyantlar filtreyi
 * bileşene prop olarak değil, gerçek rota sorgusuyla kuruyor — gerçek
 * kullanımdaki yol bu.
 *
 * ETİKET DÜĞMESİ TEK SEVKİYATLA sınırlı ve çoklu seçimde sessizce ilkine
 * gitmiyor: devre dışı kalıp nedenini söylüyor. İki sevkiyatın kolisini tek
 * listede karıştırmak, yanlış koliye yanlış adresi basmak demek.
 *
 * TENANT SÜZGECİ ÇALIŞIYOR (2026-08-24, §A12): satıcı rolündeki varyantta
 * "Ada Metal" sevkiyatları listede YOK — kova sayaçlarında bile yok, çünkü
 * kapsam süzgeci sayımdan önce uygulanıyor. Gerçek uçta bu sınır sunucuda
 * (sözleşme §6); mock artık onu taklit ediyor, dolayısıyla "satıcının neyi
 * görmediği" burada gözden geçirilebiliyor.
 */
export default {
  title: "Lojistik/Ekranlar/Paketleme/Kuyruk",
  id: "logistics-screen-packing-queue",
  component: PackingQueueView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (query = {}) => ({ name: "LogisticsPackingQueue", query });

/** Varsayılan kova: paketlenmemiş sevkiyatlar. */
export const Dolu = {
  name: "Dolu kuyruk",
  ...ekranStory({ role: "admin", route: rota() }),
};

/** Etiket bekleyen kova — kova seçimi sorguda, link paylaşılabilir. */
export const KovaEtiketBekliyor = {
  name: "Kova · etiket bekliyor",
  ...ekranStory({ role: "admin", route: rota({ bucket: "awaiting_label" }) }),
};

/**
 * Pano dört kovayı birden gösterir; kova hapları panoda GİZLİ (ikisi aynı
 * işi yapar ve yan yana dururken hangisinin geçerli olduğu okunmaz).
 * Sayfa boyutu da değişiyor: pano tek istekte 200 kayıt çekiyor, liste 50.
 */
export const Pano = {
  name: "Pano · kovalar",
  ...ekranStory({
    role: "admin",
    route: rota(),
    storage: { "lv-mode:logistics-packing-queue": "kanban" },
  }),
};

/**
 * Toplu seçim: bir sevkiyat seçilince etiket düğmesi etkinleşiyor.
 * İkinci seçimde düğme devre dışı kalır ve nedenini söyler.
 */
export const TopluSecim = {
  name: "Toplu seçim · tek sevkiyat",
  ...ekranStory({ role: "admin", route: rota() }),
  play: async ({ canvasElement }) => {
    const kutu = await elemaniBekle(canvasElement, 'tbody input[type="checkbox"]');
    kutu.click();
  },
};

export const Bos = {
  name: "Boş",
  ...ekranStory({ role: "admin", route: rota(), empty: ["packaging"] }),
};

/** Filtre yüzünden boş — "kayıt yok" ile aynı cümleyi kurmuyor. */
export const BosFiltreli = {
  name: "Boş · filtre yüzünden",
  ...ekranStory({ role: "admin", route: rota({ search: "ZZZ-eşleşmeyen" }) }),
};

export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({ role: "admin", route: rota(), hold: ["packaging.fetchQueue:loading"] }),
};

/** `PERMISSION_DENIED` — sözleşmedeki gerçek kod. */
export const HataYetki = {
  name: "Hata · yetki yok",
  ...ekranStory({ role: "admin", route: rota(), fault: { packaging: "permission" } }),
};

/**
 * Satıcı rolü. Görünür fark: DEMO paneli YOK — o bir geliştirici aracı ve
 * satıcıya gösterilseydi satıcı "yetki hatası" senaryosunu seçip kendi
 * ekranını kilitleyebilir, nedenini anlayamazdı (ölçüldü).
 */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota() }),
};

/**
 * Salt-okunur operatör: etiket düğmesi hiç çizilmiyor (`can.generateLabel`
 * false). Devre dışı değil — yok.
 */
export const RolSaltOkunur = {
  name: "Rol · salt-okunur",
  ...ekranStory({ role: "readonly", route: rota() }),
};

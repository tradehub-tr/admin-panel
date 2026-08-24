// Storybook'un lojistik router'ı — rotalar MANİFESTTEN türetiliyor.
//
// NEDEN MANİFESTTEN:
//   Teslim edilmiş dokuz ekranın beşi `route.params.name` okuyor, dokuzu da
//   birbirine `RouterLink :to="{ name: '...' }"` ile bağlanıyor. Rota adları
//   elle yazılsaydı yeni bir ekran eklendiğinde story sessizce kırılırdı:
//   vue-router eşleşmeyen adı yutmaz, `Error: No match for {name:"..."}`
//   fırlatır ve story boş kalır.
//
//   `src/router/logisticsScreens.js` zaten "45 ekranın TEK kaynağı" (dosya
//   başlığı). Story router'ı da oradan besleniyor — ikinci bir liste tutmak
//   o dosyanın kendi gerekçesini çiğnerdi.
//
// NEDEN `ready: false` OLANLAR DA KAYITLI:
//   Ekranlar henüz açılmamış hedeflere de bağlantı çiziyor (ör. sevkiyat
//   detayı). Yalnız hazır olanları kaydetmek, çalışan bir ekranın story'sini
//   kendisiyle ilgisiz bir rota yüzünden düşürürdü. Burada rota kaydı yalnız
//   AD ÇÖZÜMÜ için var: hiçbirine gerçekten gidilmiyor, story bileşeni
//   doğrudan render ediliyor.

import { createMemoryHistory, createRouter } from "vue-router";

import { LOGISTICS_SCREENS } from "../../src/router/logisticsScreens.js";

/** Rota eşleşsin diye yeterli olan boş bileşen — story'de hiç görünmez. */
const Bos = { template: "<div />" };

const logisticsRoutes = LOGISTICS_SCREENS.filter((s) => s.name).map((s) => ({
  path: `/${s.path}`,
  name: s.name,
  component: Bos,
}));

export const storyRouter = createRouter({
  history: createMemoryHistory(),
  routes: [
    ...logisticsRoutes,
    // Lojistik dışı hedefler (dashboard yönlendirmesi vb.) ve parametresiz
    // varsayılan konum.
    { path: "/", name: "StorybookRoot", component: Bos },
    { path: "/:pathMatch(.*)*", name: "StorybookCatchAll", component: Bos },
  ],
});

/** Manifestte bu ad var mı? Story yazarken yazım hatasını erkenden yakalar. */
export const hasRoute = (name) => storyRouter.hasRoute(name);

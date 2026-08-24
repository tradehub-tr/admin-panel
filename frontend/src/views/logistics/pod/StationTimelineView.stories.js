import { ekranStory, EKRAN_PARAMETRELERI } from "@story/harness";

import StationTimelineView from "./StationTimelineView.vue";

/**
 * **H1 · İstasyonlar** — 14-FE ile teslim edildi.
 *
 * Ham olay akışını istasyonlara indirger (`utils/stationTimeline.toStations`):
 * aynı yerdeki ardışık olaylar tek satırda birleşir, bekleme süresi hesaplanır
 * ve 24 saati aşan bekleme vurgulanır. İndirgeme FE'de (sözleşme §7) — sunucu
 * ham liste gönderiyor.
 *
 * ─────────────────────────────────────────────────────────────────────
 * BUGÜN ÜRETİLEMEYEN ÜÇ DURUM — eksik bilerek burada yazılı:
 *
 * Olay akışı bu ekranın kendi mock'undan değil, B6 takip sekmesiyle ORTAK
 * olan `api/shipmentEvents.js`'ten geliyor (sahibi Bora, 11-BE). O mock
 * bugün her sevkiyata AYNI listeyi döndürüyor ve hata tetikleyicisi yok:
 *
 *   · "konum bilgisi henüz taşınmıyor" — `MOCK_EVENTS` her olayda `location`
 *     taşıdığı için `locationUnavailable` hiç true olmuyor. Aynı boşluk
 *     14-FE'nin E2E testini de kırık bırakıyor (`panel-lojistik-pod.spec.ts`
 *     -g "konum HİÇ"); ölçüm ve gerekçe `docs/lojistik/KALAN-ISLER.md` §B.
 *   · "teslim noktası kartı" — kart `location_branch` alanına bağlı, mock
 *     olaylarda o alan yok, dolayısıyla kartı açan düğme hiç çizilmiyor.
 *   · "hata" — mock hata fırlatma yolu sunmuyor (`podMock`/`packagingMock`
 *     gibi bir `setFault` yüzeyi yok).
 *
 * Üçü de 11-BE ile ya da mock'a bir `setFault` yüzeyi eklenince story'ye
 * dönüşecek. O güne kadar burada UYDURULMUYOR: sahte bir olay listesi
 * enjekte etmek, ekranın gerçekte gösteremediği bir hâli gösterirdi.
 * ─────────────────────────────────────────────────────────────────────
 */
export default {
  title: "Lojistik/Ekranlar/Teslim kanıtı/İstasyonlar",
  id: "logistics-screen-station-timeline",
  component: StationTimelineView,
  tags: ["autodocs"],
  parameters: EKRAN_PARAMETRELERI,
};

const rota = (name) => ({ name: "LogisticsStationTimeline", params: { name } });

/**
 * Dolu çizelge. Bekleme süresi olay damgalarından hesaplanıyor; 24 saati
 * aşan istasyon "takıldı" olarak vurgulanıyor.
 */
export const Cizelge = {
  name: "Çizelge",
  ...ekranStory({ role: "admin", route: rota("SHP-2026-00041") }),
};

/** Satıcı da kendi sevkiyatının nerede olduğunu görebiliyor (D1 katmanı). */
export const RolSatici = {
  name: "Rol · satıcı",
  ...ekranStory({ role: "seller", route: rota("SHP-2026-00041") }),
};

export const Yukleniyor = {
  name: "Yükleniyor",
  ...ekranStory({
    role: "admin",
    route: rota("SHP-2026-00041"),
    hold: ["pod.fetchEvents:eventsState.loading"],
  }),
};

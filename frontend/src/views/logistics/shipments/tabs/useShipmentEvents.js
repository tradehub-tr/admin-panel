import { ref } from "vue";

import { toScreenError } from "@/api/logisticsEnvelope";
import { listShipmentEvents } from "@/api/shipmentEvents";
import { useLatestRequest } from "@/composables/useLatestRequest";

/**
 * B6 takip sekmesinin veri katmanı — olay akışı + BAYAT-YANIT KORUMASI.
 *
 * NEDEN VAR (doğrulama turu 2026-09-04): detay ekranı sevkiyat değişiminde
 * remount etmiyor ve sekme `watch(shipment.name) → load` ile kendini
 * tazeliyor. Guard'sız hâlde A→B hızlı geçişte GEÇ dönen A yanıtı B'nin
 * olay listesini eziyordu. Koruma `useLatestRequest` (A2/A3/L1 deseni):
 * yalnız son isteğin sonucu uygulanır, `loading`i yalnız son istek kapatır.
 *
 * NEDEN SFC DIŞINDA: `node --test` SFC'yi yalnız SSR derlemesiyle
 * yükleyebiliyor ve SSR'de `onMounted`/`watch` koşmuyor — yarış sekmenin
 * içinde kalsaydı davranışı test edilemezdi (dataTableRowLink testindeki
 * sınırın aynısı). Davranış testi: `__tests__/shipmentEventsStale.test.js`.
 */
export function useShipmentEvents() {
  const events = ref([]);
  const trackingUrl = ref(null);
  // Computed içinde Date.now() yasak (reaktif değil — workflow.md §3);
  // "şimdi" her taze yanıtta bir kez damgalanır, sessizlik şeridi ona göre
  // hesaplanır. Bayat yanıt damgayı da GÜNCELLEMEZ.
  const loadedAt = ref(0);

  const { loading, error, run } = useLatestRequest({ mapError: toScreenError });

  /**
   * Olay akışını yükler.
   *
   * @param {string | null | undefined} shipmentName Sevkiyat adı — boşsa
   *   fetch atılmaz (shipment henüz yüklenmemiş; canlıda gereksiz hata
   *   gösterirdi).
   * @returns {Promise<boolean>} Yanıt uygulandıysa `true`, bayat düşürüldü
   *   ya da ad boşsa `false`.
   */
  async function load(shipmentName) {
    if (!shipmentName) return false;
    return run(() => listShipmentEvents(shipmentName), {
      apply: (data) => {
        events.value = data?.items ?? [];
        trackingUrl.value = data?.tracking_url ?? null;
        loadedAt.value = Date.now();
      },
      onError: () => {
        // Hata ekranının altında ÖNCEKİ sevkiyatın olayları/takip linki
        // durmasın (store'daki fetchCatalog gerekçesinin aynısı).
        events.value = [];
        trackingUrl.value = null;
      },
    });
  }

  return { events, trackingUrl, loadedAt, loading, error, load };
}

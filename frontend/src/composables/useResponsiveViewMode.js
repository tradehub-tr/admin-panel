import { ref, watch } from "vue";

import { useBreakpoint } from "@/composables/useBreakpoint";

/**
 * Görünüm modu + "mobilde kompakt liste zorunlu" davranışı.
 *
 * NEDEN AYRI COMPOSABLE:
 *   Aynı 14 satır `views/doctype/DocTypeListView.vue` ve
 *   `components/logistics/CatalogListScreen.vue` içinde birebir duruyordu:
 *   mobile geçince modu `list`'e zorla, desktop'a dönünce kullanıcının
 *   seçtiği modu geri getir. Kopyalanan mantık, "desktop tercihi" değişkenini
 *   de kopyalıyordu; bir tarafta düzeltilen davranış diğerinde kalıyordu.
 *
 * NEDEN `useListViewMode` DEĞİL:
 *   O composable BAŞKA bir işi çözüyor — modu `localStorage`'a yazıp
 *   oturumlar arasında hatırlamak. İkisini birleştirmek yanlış olurdu:
 *   burada mod kullanıcı seçimi olmadan da (ekran daralınca) değişiyor ve
 *   `useListViewMode`'un watch'ı o ZORLANMIŞ değeri kalıcı yazardı — telefonda
 *   bir kez açan kullanıcı masaüstüne döndüğünde tablo yerine kompakt listeye
 *   düşerdi. Kalıcılık istenirse burada desktop tercihi saklanmalı, zorlanan
 *   değer değil; o gün geldiğinde bu composable genişletilir.
 *
 * @param {"table"|"grid"|"kanban"|"cards"} [desktopFallback] Masaüstü başlangıç modu.
 * @param {string} [compactMode] Mobilde zorlanan mod.
 * @returns {{viewMode: import("vue").Ref<string>}} Template'e bağlanacak mod.
 */
export function useResponsiveViewMode(desktopFallback = "table", compactMode = "list") {
  const viewMode = ref(desktopFallback);
  const { isLg } = useBreakpoint();

  // Kullanıcının masaüstündeki son seçimi. `ref` DEĞİL — kimse izlemiyor,
  // reaktif yapmak boşuna Proxy/effect maliyeti olurdu.
  let desktopViewMode = desktopFallback;

  watch(
    isLg,
    (desktop) => {
      if (!desktop) {
        if (viewMode.value !== compactMode) desktopViewMode = viewMode.value;
        viewMode.value = compactMode;
      } else if (viewMode.value === compactMode) {
        viewMode.value = desktopViewMode;
      }
    },
    { immediate: true }
  );

  return { viewMode };
}

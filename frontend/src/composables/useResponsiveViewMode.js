import { ref, watch } from "vue";

// NOT: bu import BİLEREK göreli ve `.js` uzantılı — `router/logisticsScreens.js`
// ile aynı gerekçe. `node --test` bu modülü Vite olmadan doğrudan yüklüyor ve
// `@/` alias'ı orada çözülmüyor; uzantılı göreli yolu hem Node hem Vite anlıyor.
// (Kardeş dosya zaten aynı dizinde — alias hiçbir şey kazandırmıyordu.)
import { useBreakpoint } from "./useBreakpoint.js";

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
 *   oturumlar arasında hatırlamak. İkisini körlemesine birleştirmek yanlış
 *   olurdu: burada mod kullanıcı seçimi olmadan da (ekran daralınca) değişiyor
 *   ve `useListViewMode`'un watch'ı o ZORLANMIŞ değeri kalıcı yazardı —
 *   telefonda bir kez açan kullanıcı masaüstüne döndüğünde tablo yerine
 *   kompakt listeye düşerdi.
 *
 *   Kalıcılık `storageKey` ile İSTEĞE BAĞLI olarak burada çözülüyor ve yalnız
 *   MASAÜSTÜ tercihi yazılıyor; zorlanan değer hiç diske gitmiyor. Anahtar
 *   biçimi `useListViewMode` ile aynı (`lv-mode:<anahtar>`) — iki composable
 *   arasında geçen bir ekran kullanıcının seçimini kaybetmesin.
 *
 * @param {"table"|"grid"|"kanban"|"cards"} [desktopFallback] Masaüstü başlangıç modu.
 * @param {string} [compactMode] Mobilde zorlanan mod.
 * @param {string|null} [storageKey] Verilirse masaüstü tercihi `lv-mode:<key>`
 *   altında saklanır. Verilmezse davranış eskisiyle birebir aynı (kalıcılık yok).
 * @returns {{viewMode: import("vue").Ref<string>}} Template'e bağlanacak mod.
 */
export function useResponsiveViewMode(desktopFallback = "table", compactMode = "list", storageKey = null) {
  const viewMode = ref(readStored(storageKey) ?? desktopFallback);
  const { isLg } = useBreakpoint();

  // Kullanıcının masaüstündeki son seçimi. `ref` DEĞİL — kimse izlemiyor,
  // reaktif yapmak boşuna Proxy/effect maliyeti olurdu.
  let desktopViewMode = viewMode.value;

  /**
   * KALICILIK — yalnız masaüstü tercihi yazılıyor.
   *
   * Bu watch, ekran boyutu watch'ından ÖNCE kuruluyor. Sıra kasıtlı: aksi
   * hâlde dar ekranda açılışta zorlanan `list`, dinleyici daha kurulmadan
   * atandığı için hiç görülmez ve kod "yanlışlıkla" doğru çalışır. Koruma
   * gerçekten iş görsün diye zorlanan değer de bu dinleyiciden geçiyor ve
   * `isLg` kontrolüyle eleniyor — testte mutasyonla doğrulanabilir olması
   * bunu gerektiriyor (`__tests__/useResponsiveViewMode.test.js`).
   */
  watch(viewMode, (mode) => {
    if (!isLg.value) return;
    desktopViewMode = mode;
    writeStored(storageKey, mode);
  });

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

/** `useListViewMode` ile aynı sözlük — iki composable aynı anahtarı okuyor. */
const VALID_MODES = ["table", "grid", "kanban", "list", "cards"];

function readStored(storageKey) {
  if (!storageKey) return null;
  try {
    const saved = localStorage.getItem(`lv-mode:${storageKey}`);
    return VALID_MODES.includes(saved) ? saved : null;
  } catch {
    // Private mode / kısıtlı depolama — varsayılana düş, ekranı kırma.
    return null;
  }
}

function writeStored(storageKey, mode) {
  if (!storageKey || !VALID_MODES.includes(mode)) return;
  try {
    localStorage.setItem(`lv-mode:${storageKey}`, mode);
  } catch {
    // Yazılamadıysa yalnız hatırlama kaybolur; ekran çalışmaya devam eder.
  }
}

import { onMounted, onBeforeUnmount } from "vue";
import { useTourStore } from "@/stores/tour";

/**
 * Sayfa-içi onboarding turu. Bir view, içeriğindeki alanları (tablo/form/filtre…)
 * tanıtmak için bu composable'ı çağırır. Adımlar `data-tour` anchor'larını hedefler.
 *
 *   usePageTour("category-management", () => [
 *     { target: '[data-tour="cat-add"]', title: t("..."), desc: t("...") },
 *     ...
 *   ]);
 *
 * - View mount olunca adımlar store'a kaydedilir (Yardım(?) bunları yeniden başlatır)
 *   ve sayfa ilk kez görülüyorsa tur otomatik başlar (kısa gecikme → DOM hazır).
 * - View unmount olunca kayıt temizlenir.
 *
 * @param {string} key  sayfaya özgü benzersiz anahtar (örn. route adı/path)
 * @param {() => Array} getSteps  adım listesi döndüren fonksiyon (reaktif/i18n için)
 */
export function usePageTour(key, getSteps) {
  const tour = useTourStore();
  let alive = true;

  onMounted(() => {
    const steps = getSteps();
    tour.registerPage(key, steps);
    // DOM/alanlar render olsun diye kısa gecikme.
    setTimeout(() => {
      if (alive) tour.maybeAutoStartPage(key, steps);
    }, 550);
  });

  onBeforeUnmount(() => {
    alive = false;
    tour.unregisterPage(key);
  });

  return {
    start: () => tour.startPageTour(key, getSteps()),
  };
}

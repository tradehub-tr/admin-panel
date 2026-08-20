import { computed, nextTick, toValue } from "vue";

// Göreli yol bilinçli: bu dosya derleyici/alias olmadan doğrudan `node` ile
// yüklenip test ediliyor (`__tests__/cardGridWindow.test.js` gerçek bir Vue
// uygulaması kurup DOM'a basıyor). Aynı kalıp `src/composables/useRum.js`'te de
// var. `.vue` dosyaları alias kullanmaya devam ediyor.
import { useVirtualGrid } from "../../composables/useVirtualGrid.js";

/**
 * Kart ızgarası için pencereleme sarmalayıcısı.
 *
 * `useVirtualGrid` yalnız MATEMATİĞİ verir: hangi aralık basılacak, üstte/altta
 * ne kadar boşluk kalacak. Onu bir ızgaraya bağlarken her çağıranın tekrar
 * yazdığı üç parça var — dilim, dilimin mutlak başlangıcı (`offset`) ve
 * dolgu stili. Üçü de burada, tek yerde.
 *
 * `offset` neden ayrı bir değer: pencerelemeden sonra `v-for` indeksi artık
 * kalemin listedeki yeri DEĞİL. Seçim, klavye imleci, `aria-posinset` ve detay
 * açma hep MUTLAK indeksle çalışmalı; çağıran `offset + i` yazar.
 *
 * @param {import("vue").Ref<HTMLElement|null>} containerRef Izgara kabı (`display:grid`).
 * @param {object} opts
 * @param {() => Array} opts.items       Tam liste (getter ya da ref).
 * @param {() => boolean} [opts.enabled] Bu görünüm kipinde pencereleme anlamlı mı.
 * @param {number} [opts.threshold]      Bu sayının ÜSTÜNDE pencereleme açılır.
 * @param {number} [opts.overscan]
 */
export function useCardGridWindow(
  containerRef,
  { items, enabled = () => true, threshold = 24, overscan = 2 } = {}
) {
  const all = () => toValue(items) || [];

  /**
   * Kısa listede pencereleme AÇILMAZ: kazancı yok, bedeli var. Matematiğin
   * şartı sabit satır yüksekliği; onu sağlamak için kart içeriği kısıtlanıyor
   * (bkz. `MediaCard` `uniform`). Bir ekran dolusu kart için bu kısıt bedava
   * değil, gereksiz.
   */
  const windowed = computed(() => Boolean(toValue(enabled)) && all().length > threshold);

  const vg = useVirtualGrid(containerRef, {
    total: () => all().length,
    enabled: () => windowed.value,
    overscan,
  });

  /** DOM'a basılacak dilim — ölçüm yapılmadıysa liste tam basılır. */
  const visible = computed(() =>
    vg.active.value ? all().slice(vg.start.value, vg.end.value) : all()
  );

  /** Dilimin ilk kaleminin listedeki mutlak indeksi. */
  const offset = computed(() => (vg.active.value ? vg.start.value : 0));

  /**
   * Basılmayan satırların yeri. Toplam yükseklik değişmediği için kaydırma
   * çubuğu zıplamaz; kutunun İÇİNE dolgu koyulur, dış ölçü sabit kalır.
   */
  const padStyle = computed(() =>
    vg.active.value
      ? { paddingTop: `${vg.padTop.value}px`, paddingBottom: `${vg.padBottom.value}px` }
      : null
  );

  /**
   * Verilen mutlak indeksteki hücreyi DOM'a bastır ve düğümünü döndür.
   *
   * Klavye imleci pencere dışına çıkabilir; o kart basılmamışsa çağıranın
   * `scrollIntoView` diyebileceği bir düğüm yoktur ve imleç sessizce kaybolur.
   * Önce `pin` ile pencere o kalemi kapsayacak kadar açılır, DOM güncellendikten
   * SONRA düğüm aranır.
   *
   * @returns {Promise<HTMLElement|null>}
   */
  async function reveal(index) {
    vg.pin(index);
    await nextTick();
    return containerRef.value?.querySelector(`[data-cell="${index}"]`) || null;
  }

  return {
    windowed,
    visible,
    offset,
    padStyle,
    /** Ölçülen sütun sayısı — pencereleme kapalıyken 1. */
    columns: vg.columns,
    /** Ölçüm yapıldı ve pencere kuruldu mu. */
    active: vg.active,
    reveal,
  };
}

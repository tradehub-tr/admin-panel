import { onMounted, ref, watch } from "vue";

/**
 * Medya listelerinin satır yoğunluğu (MOGEM-625 · kalıp C).
 *
 * NEDEN YOĞUNLUK, NEDEN YERLEŞİM DEĞİL:
 *   Medya ekranları dokunmatikte zaten tek sütun (`useResponsiveViewMode`
 *   `list` modunu zorluyor). Dar ekranda kazanılacak şey sütun sayısı değil,
 *   EKRANA SIĞAN SATIR SAYISI. Ölçüldü (768px tablet): uygulama kabuğu
 *   ray + panel ile 280px yiyor, içerik sütunu 488px kalıyor — yani tablette
 *   yatayda yapılacak bir şey yok, kazanç dikeyde.
 *
 *   "Sıkı" kademesi satır yüksekliğini 52px'ten 40px'e indiriyor: 768×1024
 *   bir tablette görünen satır sayısı 11'den 15'e çıkıyor, telefonda 7'den
 *   9'a. Yerleşim hiç değişmediği için kırılacak yeni bir yüzey de yok.
 *
 * NEDEN CSS CUSTOM PROPERTY:
 *   Satır bileşenleri yoğunluğu BİLMEZ; yalnız `var(--m-row-py)` gibi bir
 *   ölçü okur (`media.scss` → `@mixin density-row`). Böylece yeni bir medya
 *   listesi yazan kişi yoğunluk mantığını tekrar kurmuyor, mixin'i çağırıyor.
 *   Alternatif olan `:class="{ 'x--siki': dense }"` her bileşende ikinci bir
 *   kural seti demekti ve scoped stil özgüllüğüyle çakışma riski taşıyordu
 *   (panel geneli tuzak: scoped `[data-v]` eki Tailwind'in sınıflarını eziyor).
 *
 * DOKUNMA HEDEFİ KORUNUYOR:
 *   "Sıkı" kademede bile satır 40px; içindeki düğme/onay kutusu 44px'lik
 *   dokunma alanını `@mixin tap-target` ile koruyor. Yoğunluk okunabilirliği
 *   sıkıştırır, dokunulabilirliği değil.
 *
 * @param {string} [storageKey] Verilirse tercih `m-density:<key>` altında
 *   saklanır. Verilmezse oturum boyunca yaşar (ekranlar arası taşınmaz).
 */

/** Kademe → CSS custom property haritası. Tek doğruluk kaynağı. */
const KADEMELER = {
  rahat: {
    "--m-row-py": "0.75rem",
    "--m-row-px": "0.75rem",
    "--m-row-gap": "0.75rem",
    "--m-row-min-h": "3.25rem",
    "--m-thumb": "2.5rem",
  },
  siki: {
    "--m-row-py": "0.4rem",
    "--m-row-px": "0.625rem",
    "--m-row-gap": "0.5rem",
    "--m-row-min-h": "2.5rem",
    "--m-thumb": "1.875rem",
  },
};

export const DENSITY_MODES = Object.keys(KADEMELER);

const GECERLI = new Set(DENSITY_MODES);

export function useMediaDensity(storageKey = null) {
  const density = ref(oku(storageKey) ?? "rahat");

  /**
   * Kök elemana yazılacak stil nesnesi. Template'te
   * `:style="densityVars"` ile bağlanır — `document.documentElement`e
   * yazmıyoruz çünkü iki medya ekranı aynı anda açık olabilir (detay
   * sheet'i liste üstünde) ve global yazım birini diğerinin ölçüsüne
   * mahkûm ederdi.
   */
  const densityVars = ref(KADEMELER[density.value]);

  watch(density, (mod) => {
    if (!GECERLI.has(mod)) return;
    densityVars.value = KADEMELER[mod];
    yaz(storageKey, mod);
  });

  // İlk değer `ref` kurulumunda okundu; `onMounted` yalnız SSR/testte
  // `localStorage` erişilemezse sessizce atlanması için var.
  onMounted(() => {
    const kayitli = oku(storageKey);
    if (kayitli && kayitli !== density.value) density.value = kayitli;
  });

  return { density, densityVars, DENSITY_MODES };
}

function oku(storageKey) {
  if (!storageKey) return null;
  try {
    const v = localStorage.getItem(`m-density:${storageKey}`);
    return GECERLI.has(v) ? v : null;
  } catch {
    // Private mode / kısıtlı depolama — varsayılana düş, ekranı kırma.
    return null;
  }
}

function yaz(storageKey, mod) {
  if (!storageKey) return;
  try {
    localStorage.setItem(`m-density:${storageKey}`, mod);
  } catch {
    // Yazılamadıysa yalnız hatırlama kaybolur; ekran çalışmaya devam eder.
  }
}

import { computed, ref } from "vue";

/**
 * Crop Studio geri al / yinele — **anlık görüntü yığını**, komut deseni değil.
 *
 * Durum küçük: 7 sayı + slot/profil anahtarı ≈ 100 bayt. 50 adım ≈ 5 KB.
 * Komut deseninin ters-işlem karmaşıklığını bu boyut için ödemeye değmez
 * (faz10-crop-studio.md §5).
 *
 * ### Yığın neden şişmiyor
 *
 * Ham `pointermove` saniyede 120+ olay üretir; her birini yığına atmak 20
 * adımlık geçmişi yarım saniyede tüketir. Kural: **yığına yazma jest başına
 * bir kez** — sürükleme sırasında yalnız canlı durum güncellenir, `pointerup`
 * geldiğinde `commit()` çağrılır.
 *
 * Klavye okları için birleştirme (coalescing): aynı etiketli ardışık adımlar
 * `COALESCE_MS` içinde tek adımda toplanır. Metin editörlerinin davranışı;
 * aksi hâlde 20 adımlık geçmiş 20 piksellik bir ince ayara gider.
 *
 * **Pencere SAKLANMAZ** — türetilmiş değerdir (`base`/`win` her karede
 * geometriden üretilir). Saklansaydı durumla tutarsızlaşabilirdi.
 */

/** T-103 asgarisi 20; 50 seçildi — 50 adım ≈ 5 KB, ödenebilir. */
export const MAX_STEPS = 50;
export const COALESCE_MS = 400;

/** Saklanan alanlar. Buraya alan eklemek geçmişin sözleşmesini değiştirir. */
const FIELDS = ["zoom", "centerX", "centerY", "focalX", "focalY", "lockedAR", "overrideRect"];

/** Yığına giren her şey kopyalanır — dışarıdaki ref'ler yığını mutasyona uğratamaz. */
export function snapshot(state) {
  const out = {};
  for (const key of FIELDS) {
    const v = state?.[key];
    out[key] = v && typeof v === "object" ? { ...v } : (v ?? null);
  }
  return out;
}

export function sameSnapshot(a, b) {
  for (const key of FIELDS) {
    const x = a?.[key];
    const y = b?.[key];
    if (x && y && typeof x === "object" && typeof y === "object") {
      if (x.x !== y.x || x.y !== y.y || x.w !== y.w || x.h !== y.h) return false;
      continue;
    }
    if (x !== y) return false;
  }
  return true;
}

/**
 * @param {object}   initial          Başlangıç durumu.
 * @param {object}   [opts]
 * @param {function} [opts.now]       Saat — testler enjekte eder.
 * @param {number}   [opts.max]
 */
export function useCropHistory(initial, { now = () => Date.now(), max = MAX_STEPS } = {}) {
  const stack = ref([snapshot(initial)]);
  const cursor = ref(0);
  let lastLabel = null;
  let lastAt = -Infinity;

  const canUndo = computed(() => cursor.value > 0);
  const canRedo = computed(() => cursor.value < stack.value.length - 1);
  const depth = computed(() => stack.value.length);
  const current = computed(() => stack.value[cursor.value]);

  /**
   * Bir jesti geçmişe yaz.
   *
   * @param {object} state
   * @param {string|null} [label] Aynı etiketli ardışık adımlar `COALESCE_MS`
   *   içinde birleşir (ok tuşu ince ayarı). `null` = asla birleşme.
   * @returns {boolean} Yeni bir adım açıldı mı.
   */
  function commit(state, label = null) {
    const snap = snapshot(state);
    if (sameSnapshot(snap, stack.value[cursor.value])) return false;

    const t = now();
    const coalesce = label !== null && label === lastLabel && t - lastAt < COALESCE_MS;
    lastLabel = label;
    lastAt = t;

    if (coalesce && cursor.value > 0) {
      // Aynı jestin devamı: yeni adım AÇMA, mevcut adımın üstüne yaz.
      stack.value = [...stack.value.slice(0, cursor.value), snap];
      return false;
    }

    // Yinele dalı burada ölür — yeni bir değişiklikten sonra ileri gidilemez.
    const kept = stack.value.slice(0, cursor.value + 1);
    kept.push(snap);
    const overflow = kept.length - max;
    stack.value = overflow > 0 ? kept.slice(overflow) : kept;
    cursor.value = stack.value.length - 1;
    return true;
  }

  function undo() {
    if (!canUndo.value) return null;
    cursor.value -= 1;
    lastLabel = null;
    return current.value;
  }

  function redo() {
    if (!canRedo.value) return null;
    cursor.value += 1;
    lastLabel = null;
    return current.value;
  }

  /** Slot/profil değişince geçmiş sıfırlanır — farklı kadraj bağlamı. */
  function reset(state) {
    stack.value = [snapshot(state)];
    cursor.value = 0;
    lastLabel = null;
    lastAt = -Infinity;
  }

  return { canUndo, canRedo, depth, current, commit, undo, redo, reset };
}

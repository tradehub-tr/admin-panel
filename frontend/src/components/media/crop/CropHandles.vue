<template>
  <div class="chandles" :style="frameStyle">
    <!-- Gövde: sürükleme alanı ve klavyeyle kadrajı taşıma. Tutamaklardan
         ÖNCE gelir; Tab sırası "önce bütün, sonra parça". -->
    <button
      type="button"
      class="chandles__body"
      role="slider"
      :aria-label="t('cropStudio.handle.body')"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(sourceW)"
      :aria-valuenow="Math.round(win.x)"
      :aria-valuetext="valueText"
      @pointerdown="onPointerDown('body', $event)"
      @keydown="onKeydown('body', $event)"
    ></button>

    <span
      v-for="h in HANDLES"
      :key="h"
      class="chandles__grip"
      :class="[`chandles__grip--${h}`, { 'chandles__grip--tiny': tooTight }]"
      :style="gripStyle(h)"
      role="slider"
      tabindex="0"
      :aria-label="t(`cropStudio.handle.${h}`)"
      :aria-orientation="orientation(h)"
      :aria-valuemin="0"
      :aria-valuemax="valueMax(h)"
      :aria-valuenow="valueNow(h)"
      :aria-valuetext="valueText"
      @pointerdown="onPointerDown(h, $event)"
      @keydown="onKeydown(h, $event)"
    ></span>

    <!-- Odak noktası pencereden BAĞIMSIZ bir tutamaktır: sürüklenince
         `cropWindow` yeniden çalışır ve pencere odağa göre kayar. -->
    <button
      type="button"
      class="chandles__focal"
      :style="focalStyle"
      :aria-label="t('cropStudio.handle.focal')"
      :title="t('cropStudio.handle.focal')"
      @pointerdown="onPointerDown('focal', $event)"
      @keydown="onKeydown('focal', $event)"
    >
      <span class="chandles__focal-dot"></span>
    </button>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import { HANDLES, isCorner } from "@/lib/media/crop/cropHandles";

  /**
   * 8 tutamak + gövde + odak. **DOM, canvas değil.**
   *
   * Klavye erişimi (`tabindex`, `role="slider"`), isabet alanı büyütme ve odak
   * halkası DOM'da bedavaya gelir; canvas'a çizilen bir tutamağın
   * erişilebilirliği sıfırdan yazılır. Görsel ve karartma canvas'ta kalır.
   *
   * ### Ekran pikseli ↔ kaynak pikseli
   *
   * Bu bileşen **tek çevirici**dir: `scale` (CSS px / kaynak px) ile fareyi
   * kaynak pikseline çevirir ve yukarıya öyle verir. Geometriye ASLA ekran
   * pikseli girmez.
   *
   * ### ARIA notu
   *
   * `role="slider"` `aria-valuenow` ister. Kenar tutamaklarında bu, taşınan
   * kenarın kaynak pikseli cinsinden konumudur ve `aria-orientation` eksenini
   * söyler. Köşe tutamakları iki ekseni birden taşır; onlarda `aria-valuenow`
   * kadraj genişliğidir ve asıl bilgi `aria-valuetext`'te (canlı kadraj
   * boyutu) durur. ÖLÇÜLMEDİ: gerçek ekran okuyucuyla (NVDA/VoiceOver)
   * dinleme yapılmadı — tarayıcı doğrulaması bu görevin kapsamı dışındaydı.
   */
  const props = defineProps({
    /** Kadraj penceresi — KAYNAK pikseli. */
    win: { type: Object, required: true },
    /** Taban bölge — KAYNAK pikseli. */
    base: { type: Object, required: true },
    sourceW: { type: Number, required: true },
    sourceH: { type: Number, required: true },
    /** Odak noktası, 0-1 normalize. */
    focalX: { type: Number, default: 0.5 },
    focalY: { type: Number, default: 0.5 },
    /** CSS px / kaynak px. Bileşenin tek ölçek bilgisi. */
    scale: { type: Number, required: true },
  });

  const emit = defineEmits(["drag", "drag-start", "drag-end", "nudge"]);
  const { t } = useI18n();

  /** Ekranda 24 px'in altına inen tutamak gizlenir: isabet alanları çakışır.
      Bu bir UI eşiğidir, geometri eşiği (MIN_EDGE_PX) DEĞİL — karıştırma. */
  const HIT_PX = 24;
  const tooTight = computed(
    () => props.win.w * props.scale < HIT_PX * 2 || props.win.h * props.scale < HIT_PX * 2
  );

  const px = (v) => `${v * props.scale}px`;

  const frameStyle = computed(() => ({
    left: px(props.win.x - props.base.x),
    top: px(props.win.y - props.base.y),
    width: px(props.win.w),
    height: px(props.win.h),
  }));

  const focalStyle = computed(() => ({
    left: px(props.focalX * props.sourceW - props.win.x),
    top: px(props.focalY * props.sourceH - props.win.y),
  }));

  const POS = {
    nw: [0, 0],
    n: [50, 0],
    ne: [100, 0],
    e: [100, 50],
    se: [100, 100],
    s: [50, 100],
    sw: [0, 100],
    w: [0, 50],
  };
  const gripStyle = (h) => ({ left: `${POS[h][0]}%`, top: `${POS[h][1]}%` });

  const orientation = (h) => (h === "n" || h === "s" ? "vertical" : "horizontal");

  function valueMax(h) {
    if (isCorner(h)) return Math.round(props.base.w);
    return Math.round(orientation(h) === "vertical" ? props.sourceH : props.sourceW);
  }

  function valueNow(h) {
    if (isCorner(h)) return Math.round(props.win.w);
    if (h === "n") return Math.round(props.win.y);
    if (h === "s") return Math.round(props.win.y + props.win.h);
    if (h === "w") return Math.round(props.win.x);
    return Math.round(props.win.x + props.win.w);
  }

  const valueText = computed(() =>
    t("cropStudio.live.size", { w: Math.round(props.win.w), h: Math.round(props.win.h) })
  );

  // ── Pointer Events — fare, kalem ve dokunma TEK yol ──────────────

  const dragging = ref(null);
  let last = null;

  function onPointerDown(handle, event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget?.focus?.();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    dragging.value = handle;
    last = { x: event.clientX, y: event.clientY };
    emit("drag-start", handle);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(event) {
    if (!dragging.value || !last) return;
    // Ekran pikseli → kaynak pikseli. Çeviri BURADA, tek satırda.
    const dx = (event.clientX - last.x) / props.scale;
    const dy = (event.clientY - last.y) / props.scale;
    last = { x: event.clientX, y: event.clientY };
    emit("drag", dragging.value, dx, dy);
  }

  function onPointerUp() {
    if (!dragging.value) return;
    // Geçmişe yazma BURADA, jest başına bir kez — `pointermove` başına değil.
    emit("drag-end", dragging.value);
    dragging.value = null;
    last = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  }

  function onKeydown(handle, event) {
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    // Olay yukarı çıkmasın: Medya Gezgini de `window`'da ok tuşu dinliyor
    // (`useMediaShortcuts`) ve kadraj oynatırken ızgarada da geziniyor olurduk.
    event.stopPropagation();
    emit("nudge", handle, event.key, event.shiftKey);
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .chandles {
    position: absolute;
    box-shadow: 0 0 0 1px rgb(255 255 255 / 90%);
  }

  .chandles__body {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
    cursor: move;

    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
    }
  }

  .chandles__grip {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border: 1px solid $l-text-700;
    border-radius: 2px;
    background: #fff;
    cursor: grab;
    touch-action: none;

    // İsabet alanı görünenden büyük — 14 px bir kutuyu parmakla tutturmak zor.
    &::after {
      position: absolute;
      inset: -8px;
      content: "";
    }

    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
    }
  }

  // Kadraj ekranda daraldığında tutamak isabet alanları çakışır; tutamak
  // gizlenir, gövde sürüklemesi ve klavye ince ayarı çalışmaya devam eder.
  .chandles__grip--tiny {
    display: none;
  }

  .chandles__grip--nw,
  .chandles__grip--se {
    cursor: nwse-resize;
  }

  .chandles__grip--ne,
  .chandles__grip--sw {
    cursor: nesw-resize;
  }

  .chandles__grip--n,
  .chandles__grip--s {
    cursor: ns-resize;
  }

  .chandles__grip--e,
  .chandles__grip--w {
    cursor: ew-resize;
  }

  .chandles__focal {
    position: absolute;
    width: 26px;
    height: 26px;
    margin: -13px 0 0 -13px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: crosshair;
    touch-action: none;

    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
      border-radius: 50%;
    }
  }

  .chandles__focal-dot {
    position: absolute;
    inset: 8px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: $brand;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 45%);
  }
</style>

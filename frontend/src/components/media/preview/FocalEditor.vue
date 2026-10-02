<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import { formatPercent } from "@/lib/media/preview/places.js";
  import messages from "@/lib/media/preview/messages.js";

  /**
   * Odak noktası seçici (spec §4.2 sağ sütun, §5 2.5.7). Sürüklemeye üç
   * alternatif: tıklama/dokunma, sayı kutuları (telefonda −/+), ok tuşları.
   * Koordinatlar GÖRSEL uzayıdır: kutu `dir="ltr"`, işaret yüzde left/top ile
   * — Arapça arayüzde aynalanmaz. `disabled` (pencere yüklenirken): yükleme
   * sonucu bir hareketi ezmesin diye bütün denetimler kapanır.
   */
  const props = defineProps({
    src: { type: String, required: true },
    imageRatio: { type: Number, default: 0 },
    focal: { type: Object, required: true },
    frame: { type: Object, default: null },
    compact: { type: Boolean, default: false },
    imageAlt: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  });
  const emit = defineEmits(["set", "nudge", "center", "suggest", "natural"]);
  const { t, locale } = useI18n({ messages });

  const box = ref(null);
  let dragging = false;

  const xPct = computed(() => Math.round(props.focal.x * 100));
  const yPct = computed(() => Math.round(props.focal.y * 100));
  const fx = computed(() => formatPercent(props.focal.x, locale.value));
  const fy = computed(() => formatPercent(props.focal.y, locale.value));
  const boxStyle = computed(() => ({
    aspectRatio: props.imageRatio > 0 ? String(props.imageRatio) : "16 / 9",
  }));
  const handleLayer = computed(() => ({
    left: `${xPct.value}%`,
    top: `${yPct.value}%`,
  }));
  const frameLayer = computed(() =>
    props.frame
      ? { transform: `translate(${props.frame.left * 100}%, ${props.frame.top * 100}%)` }
      : null
  );
  const frameBox = computed(() =>
    props.frame
      ? { width: `${props.frame.width * 100}%`, height: `${props.frame.height * 100}%` }
      : null
  );

  function fromEvent(ev) {
    const r = box.value?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
  }
  function onBoxClick(ev) {
    if (props.disabled || ev.target.closest?.(".fe__handle")) return;
    const p = fromEvent(ev);
    if (p) emit("set", p.x, p.y);
  }
  function onPointerDown(ev) {
    if (props.disabled) return;
    dragging = true;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  }
  function onPointerMove(ev) {
    if (!dragging || props.disabled) return;
    const p = fromEvent(ev);
    if (p) emit("set", p.x, p.y);
  }
  function onPointerUp() {
    dragging = false;
  }
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  function onKey(ev) {
    if (props.disabled) return;
    if (KEYS[ev.key]) {
      ev.preventDefault();
      emit("nudge", KEYS[ev.key][0], KEYS[ev.key][1], ev.shiftKey);
    } else if (ev.key === "Home") {
      ev.preventDefault();
      emit("center");
    }
  }
  function onNumber(axis, ev) {
    if (props.disabled) return;
    const n = Number(ev.target.value);
    const v =
      ev.target.value === "" || !Number.isFinite(n) ? 0.5 : Math.min(100, Math.max(0, n)) / 100;
    if (axis === "x") emit("set", v, props.focal.y);
    else emit("set", props.focal.x, v);
  }
  function onLoad(ev) {
    emit("natural", { w: ev.target.naturalWidth || 0, h: ev.target.naturalHeight || 0 });
  }
</script>

<template>
  <div class="fe" :class="{ 'fe--compact': compact, 'fe--disabled': disabled }">
    <div ref="box" class="fe__box" dir="ltr" :style="boxStyle" @click="onBoxClick">
      <div class="fe__clip">
        <img class="fe__img" :src="src" :alt="imageAlt" @load="onLoad" />
        <div v-if="frame" class="fe__layer" :style="frameLayer" aria-hidden="true">
          <span class="fe__frame" :style="frameBox" />
        </div>
      </div>
      <div class="fe__layer fe__layer--handle" :style="handleLayer">
        <button
          type="button"
          class="fe__handle"
          :disabled="disabled"
          :aria-label="t('imagePlacement.focal.handle', { x: fx, y: fy })"
          @keydown="onKey"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <span class="fe__dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="!compact" class="fe__inputs">
      <label class="fe__label">
        {{ t("imagePlacement.focal.x") }}
        <input
          class="fe__input"
          type="number"
          min="0"
          max="100"
          step="1"
          :value="xPct"
          :disabled="disabled"
          @change="onNumber('x', $event)"
        />
      </label>
      <label class="fe__label">
        {{ t("imagePlacement.focal.y") }}
        <input
          class="fe__input"
          type="number"
          min="0"
          max="100"
          step="1"
          :value="yPct"
          :disabled="disabled"
          @change="onNumber('y', $event)"
        />
      </label>
    </div>
    <div v-else class="fe__steppers">
      <div class="fe__stepper">
        <span class="fe__step-label">{{ t("imagePlacement.focal.xShort") }}</span>
        <div class="fe__step-row">
          <button
            type="button"
            class="fe__step"
            :disabled="disabled"
            :aria-label="t('imagePlacement.focal.decX')"
            @click="emit('nudge', -1, 0, false)"
          >
            −
          </button>
          <span class="fe__step-value" aria-hidden="true"
            ><bdi>{{ fx }}</bdi></span
          >
          <button
            type="button"
            class="fe__step"
            :disabled="disabled"
            :aria-label="t('imagePlacement.focal.incX')"
            @click="emit('nudge', 1, 0, false)"
          >
            +
          </button>
        </div>
      </div>
      <div class="fe__stepper">
        <span class="fe__step-label">{{ t("imagePlacement.focal.yShort") }}</span>
        <div class="fe__step-row">
          <button
            type="button"
            class="fe__step"
            :disabled="disabled"
            :aria-label="t('imagePlacement.focal.decY')"
            @click="emit('nudge', 0, -1, false)"
          >
            −
          </button>
          <span class="fe__step-value" aria-hidden="true"
            ><bdi>{{ fy }}</bdi></span
          >
          <button
            type="button"
            class="fe__step"
            :disabled="disabled"
            :aria-label="t('imagePlacement.focal.incY')"
            @click="emit('nudge', 0, 1, false)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div class="fe__actions">
      <button type="button" class="fe__btn" :disabled="disabled" @click="emit('suggest')">
        {{ t("imagePlacement.focal.suggest") }}
      </button>
      <button
        v-if="!compact"
        type="button"
        class="fe__btn"
        :disabled="disabled"
        @click="emit('center')"
      >
        {{ t("imagePlacement.focal.center") }}
      </button>
    </div>
    <p v-if="!compact" class="fe__hint">{{ t("imagePlacement.focal.keyboard") }}</p>
  </div>
</template>

<style scoped>
  .fe {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: #1d1c19;
  }
  .fe__box {
    position: relative;
    width: calc(100% - 24px);
    margin-inline: 12px;
    cursor: crosshair;
    touch-action: none;
  }
  .fe__clip {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 8px;
  }
  .fe__img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
    pointer-events: none;
  }
  .fe__layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  /* Only the 44px handle moves. A translated image-sized layer creates
     invisible horizontal overflow and an unnecessary panel scrollbar. */
  .fe__layer--handle {
    inset: auto;
    width: 0;
    height: 0;
  }
  .fe__frame {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    border: 2px dashed #ffffff;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.55),
      inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  }
  .fe__handle {
    position: absolute;
    top: 0;
    left: 0;
    width: 44px;
    height: 44px;
    margin: -22px 0 0 -22px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    pointer-events: auto;
  }
  .fe__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f5b800;
    box-shadow: 0 0 0 3px #1a1a1a;
  }
  .fe--compact .fe__dot {
    width: 14px;
    height: 14px;
  } /* pano 4 */
  .fe--compact .fe__clip {
    border-radius: 10px;
  }
  .fe--disabled .fe__box {
    cursor: progress;
  }
  .fe__handle:disabled {
    cursor: progress;
  }
  .fe__inputs,
  .fe__actions,
  .fe__steppers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .fe--compact .fe__actions {
    grid-template-columns: 1fr;
  }
  .fe--compact .fe__steppers {
    gap: 12px;
  }
  .fe--compact .fe__btn {
    font-size: 16px;
  }
  .fe__label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
  }
  .fe__input {
    height: 44px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid #8a867c;
    border-radius: 10px;
    font: inherit;
    font-weight: 500;
    color: #1d1c19;
    background: #ffffff;
  }
  .fe__btn:disabled,
  .fe__step:disabled,
  .fe__input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .fe__btn {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid #e6e3dc;
    background: #ffffff;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    color: #1d1c19;
    cursor: pointer;
  }
  .fe__stepper {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fe__step-label {
    font-size: 15px;
    font-weight: 600;
  }
  /* Pano 4: tek çerçeveli grup, içinde çerçevesiz −/+ (kenar #8a867c: beyaza 3,63:1, SC 1.4.11). */
  .fe__step-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #8a867c;
    border-radius: 12px;
  }
  .fe__step {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    font: inherit;
    font-size: 22px;
    color: #1d1c19;
    cursor: pointer;
  }
  .fe__step-value {
    font-size: 16px;
    font-weight: 700;
    unicode-bidi: isolate;
  }
  .fe__hint {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #3a3833;
  }
  .fe__handle:focus-visible,
  .fe__btn:focus-visible,
  .fe__input:focus-visible,
  .fe__step:focus-visible {
    outline: 3px solid #1a1a1a;
    outline-offset: 2px;
  }
  /* İşaret görselin piksellerinin üstünde: koyu görselde #1a1a1a halka kaybolur.
     Beyaz hale 2 px ofset boşluğunu doldurur → her zeminde ≥ 3:1 (WCAG 2.4.13). */
  .fe__handle:focus-visible {
    box-shadow: 0 0 0 2px #ffffff;
  }
  @media (prefers-reduced-motion: reduce) {
    .fe__layer {
      transition: none;
    }
  }
</style>

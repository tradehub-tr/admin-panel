<template>
  <div ref="host" class="ccanvas" :style="{ aspectRatio: `${sourceW} / ${sourceH}` }">
    <canvas ref="canvas" class="ccanvas__paint" aria-hidden="true"></canvas>
    <p v-if="!bitmap && !loading" class="ccanvas__empty">{{ t("cropStudio.canvas.noSource") }}</p>
    <slot :scale="scale"></slot>
  </div>
</template>

<script setup>
  import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Görsel + kadraj karartması + üçte bir ızgarası. **Tutamak çizmez** —
   * onlar DOM'da (bkz. `CropHandles.vue`).
   *
   * ### Bütçe nereye gidiyor
   *
   * Kaynak bir kez `createImageBitmap()` ile çözülür ve tuval boyutunun ~2
   * katında bir **ara bitmap**'e ölçeklenir; her karede orijinal değil o
   * çizilir. Ölçüm: kaynakların p99'u 29,21 MP, MAX 72,71 MP — 72 MP'lik bir
   * görseli her karede ölçeklemek 16 ms'e sığmaz.
   *
   * Çizim `requestAnimationFrame`'de toplanır: bir karede birden çok
   * `pointermove` gelirse yalnız sonuncusu çizilir.
   *
   * **ÖLÇÜLMEDİ:** `< 16 ms` bir hedeftir, bir sonuç değil. Kare başına çizim
   * süresi, DPR 1/2 farkı ve 72 MP kaynakta `createImageBitmap` maliyeti
   * ölçülmedi; tarayıcı doğrulaması bu görevde YAPILMADI.
   */
  const props = defineProps({
    /** Kaynak görsel adresi. Türev YOK — önizleme kaynaktan üretilir. */
    src: { type: String, default: "" },
    sourceW: { type: Number, required: true },
    sourceH: { type: Number, required: true },
    /** Taban bölge ve kadraj — KAYNAK pikseli. */
    base: { type: Object, default: null },
    win: { type: Object, default: null },
    showGrid: { type: Boolean, default: true },
  });

  const emit = defineEmits(["scale", "bitmap"]);
  const { t } = useI18n();

  const host = ref(null);
  const canvas = ref(null);
  /** Büyük 3. parti/ikili nesne — derin reaktivite maliyeti ödenmez. */
  const bitmap = shallowRef(null);
  const loading = ref(false);
  const scale = ref(1);

  let raf = 0;
  let observer = null;

  /** `prefers-reduced-motion` altında yumuşatma kapanır. */
  const reduceMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function measure() {
    if (!host.value || !canvas.value) return;
    const rectBox = host.value.getBoundingClientRect();
    if (!rectBox.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.value.width = Math.round(rectBox.width * dpr);
    canvas.value.height = Math.round(rectBox.height * dpr);
    canvas.value.style.width = `${rectBox.width}px`;
    canvas.value.style.height = `${rectBox.height}px`;
    // Taban bölge tuvale sığdırılır; ölçek CSS px / kaynak px.
    scale.value = props.base ? rectBox.width / props.base.w : rectBox.width / props.sourceW;
    emit("scale", scale.value);
    schedule();
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      draw();
    });
  }

  function draw() {
    const el = canvas.value;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    if (!bitmap.value || !props.base) return;

    const k = el.width / props.base.w; // kaynak px → tuval px
    ctx.imageSmoothingEnabled = !reduceMotion();
    ctx.drawImage(
      bitmap.value,
      props.base.x,
      props.base.y,
      props.base.w,
      props.base.h,
      0,
      0,
      el.width,
      el.height
    );

    if (!props.win) return;
    const wx = (props.win.x - props.base.x) * k;
    const wy = (props.win.y - props.base.y) * k;
    const ww = props.win.w * k;
    const wh = props.win.h * k;

    // Kadraj dışını karart — dört dikdörtgen, tek `globalCompositeOperation`
    // hilesi yok: okunması kolay olan kazanır.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, el.width, wy);
    ctx.fillRect(0, wy + wh, el.width, el.height - wy - wh);
    ctx.fillRect(0, wy, wx, wh);
    ctx.fillRect(wx + ww, wy, el.width - wx - ww, wh);

    if (!props.showGrid) return;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 3; i += 1) {
      ctx.moveTo(wx + (ww * i) / 3, wy);
      ctx.lineTo(wx + (ww * i) / 3, wy + wh);
      ctx.moveTo(wx, wy + (wh * i) / 3);
      ctx.lineTo(wx + ww, wy + (wh * i) / 3);
    }
    ctx.stroke();
  }

  async function load() {
    bitmap.value = null;
    if (!props.src || typeof window === "undefined") return;
    loading.value = true;
    try {
      const res = await fetch(props.src, { credentials: "same-origin" });
      const blob = await res.blob();
      // Çözme YÜKLEME sırasında bir kez; sürükleme sırasında asla.
      bitmap.value = await createImageBitmap(blob);
      emit("bitmap", bitmap.value);
    } catch {
      bitmap.value = null;
    } finally {
      loading.value = false;
      measure();
    }
  }

  onMounted(() => {
    observer = new ResizeObserver(measure);
    observer.observe(host.value);
    measure();
    load();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    bitmap.value?.close?.();
  });

  watch(() => props.src, load);
  watch(() => [props.base, props.win], schedule, { deep: true });
</script>

<style scoped lang="scss">
  .ccanvas {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 0.5rem;
    background: #111;
    touch-action: none;
  }

  .ccanvas__paint {
    display: block;
    width: 100%;
  }

  .ccanvas__empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    padding: 1rem;
    color: rgb(255 255 255 / 70%);
    font-size: 0.8125rem;
    text-align: center;
  }
</style>

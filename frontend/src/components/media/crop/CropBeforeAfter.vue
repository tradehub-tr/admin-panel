<template>
  <section class="cba" :aria-label="t('cropStudio.beforeAfter.title')">
    <header class="cba__head">
      <h3 class="cba__title">{{ t("cropStudio.beforeAfter.title") }}</h3>
      <!-- Oran zorlanıyorsa kullanıcı bunu KAYDETMEDEN önce görmeli: serbest
           çizdiği kutu ile sunucunun üreteceği oran-uyumlu kutu ayrışıyor
           (rapor 65 C/E sapması). Zorlama yoksa satır sessiz. -->
      <span v-if="ratioForced" class="cba__flag">
        {{
          targetLabel
            ? t("cropStudio.beforeAfter.forcedTo", { ratio: targetLabel })
            : t("cropStudio.beforeAfter.forced")
        }}
      </span>
      <span v-else class="cba__ok">{{ t("cropStudio.beforeAfter.same") }}</span>
    </header>

    <div class="cba__pair">
      <figure class="cba__cell">
        <div class="cba__frame">
          <canvas
            ref="beforeCanvas"
            class="cba__canvas"
            :width="beforeCell.w"
            :height="beforeCell.h"
            :aria-label="t('cropStudio.beforeAfter.beforeAlt')"
          ></canvas>
        </div>
        <figcaption class="cba__caption">
          <span class="cba__label">{{ t("cropStudio.beforeAfter.before") }}</span>
          <span v-if="beforePx" class="cba__size">{{ beforePx[2] }}×{{ beforePx[3] }}</span>
        </figcaption>
      </figure>

      <AppIcon name="arrow-right" :size="18" class="cba__arrow" aria-hidden="true" />

      <figure class="cba__cell">
        <div class="cba__frame">
          <canvas
            ref="afterCanvas"
            class="cba__canvas cba__canvas--after"
            :width="afterCell.w"
            :height="afterCell.h"
            :aria-label="t('cropStudio.beforeAfter.afterAlt')"
          ></canvas>
        </div>
        <figcaption class="cba__caption">
          <span class="cba__label cba__label--after">{{ t("cropStudio.beforeAfter.after") }}</span>
          <span v-if="afterPx" class="cba__size">{{ afterPx[2] }}×{{ afterPx[3] }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * ÖNCE / SONRA karşılaştırması — oran zorlamasını KAYDETMEDEN önce göster.
   *
   * "Önce" kullanıcının çizdiği kadraj (`beforeWin`), "Sonra" sunucunun
   * üreteceği oran-uyumlu kadraj (`afterWin`, `useCropStudio.afterWin`).
   * Serbest kırpmada ikisi ayrışır; oran kilitliyken çakışır ve satır bunu
   * "aynı" diye söyler (rapor 65 C/E sapması, T-105 kullanıcı isteği).
   *
   * Çizim `CropPreviewStrip` ile aynı bütçede: kaynak bir kez
   * `createImageBitmap` ile çözülür (kabuk çözer, `bitmap` prop'u ile gelir),
   * her kare `requestAnimationFrame`'de toplanır. **ÖLÇÜLMEDİ:** kare süresi
   * tarayıcıda ölçülmedi.
   */
  const props = defineProps({
    /** `createImageBitmap` sonucu; yoksa tuval boş kalır. */
    bitmap: { type: Object, default: null },
    sourceW: { type: Number, required: true },
    sourceH: { type: Number, required: true },
    /** Kullanıcının çizdiği kadraj — KAYNAK pikseli. */
    beforeWin: { type: Object, default: null },
    /** Oran-zorlanmış kadraj — KAYNAK pikseli. */
    afterWin: { type: Object, default: null },
    /** "Önce" tam piksel kutusu `[x,y,w,h]` — boyut etiketi için. */
    beforePx: { type: Array, default: null },
    /** "Sonra" tam piksel kutusu `[x,y,w,h]`. */
    afterPx: { type: Array, default: null },
    /** Oran zorlaması ikisini gerçekten ayırıyor mu. */
    ratioForced: { type: Boolean, default: false },
    /** Hedef oran etiketi (ör. "1:1", "16:9") — bilgilendirme için. */
    targetLabel: { type: String, default: "" },
  });

  /** Yerel iletiler — proje deseni (`CropPreviewStrip.vue` gerekçesi). */
  const { t } = useI18n({
    messages: {
      tr: {
        cropStudio: {
          beforeAfter: {
            title: "Önce / Sonra",
            before: "Önce (senin seçimin)",
            after: "Sonra (kaydedilecek)",
            beforeAlt: "Çizdiğin kadraj",
            afterAlt: "Sunucunun üreteceği oran-uyumlu kadraj",
            forced: "Oran zorlanıyor — kaydedilecek kadraj seçtiğinden farklı.",
            forcedTo: "Oran {ratio}'e zorlanıyor — kaydedilecek kadraj seçtiğinden farklı.",
            same: "Seçtiğin kadraj oranla uyumlu — sonra = önce.",
          },
        },
      },
      en: {
        cropStudio: {
          beforeAfter: {
            title: "Before / After",
            before: "Before (your selection)",
            after: "After (what is saved)",
            beforeAlt: "The crop you drew",
            afterAlt: "The ratio-conformed crop the server will produce",
            forced: "Ratio is being forced — the saved crop differs from your selection.",
            forcedTo: "Ratio forced to {ratio} — the saved crop differs from your selection.",
            same: "Your selection matches the ratio — after = before.",
          },
        },
      },
      ru: {
        cropStudio: {
          beforeAfter: {
            title: "До / После",
            before: "До (ваш выбор)",
            after: "После (что сохранится)",
            beforeAlt: "Нарисованный вами кадр",
            afterAlt: "Кадр с соблюдением пропорций, который создаст сервер",
            forced: "Пропорция навязывается — сохранённый кадр отличается от выбранного.",
            forcedTo: "Пропорция приведена к {ratio} — сохранённый кадр отличается от выбранного.",
            same: "Ваш выбор соответствует пропорции — после = до.",
          },
        },
      },
      ar: {
        cropStudio: {
          beforeAfter: {
            title: "قبل / بعد",
            before: "قبل (اختيارك)",
            after: "بعد (ما سيُحفظ)",
            beforeAlt: "الإطار الذي رسمته",
            afterAlt: "الإطار المتوافق مع النسبة الذي سينتجه الخادم",
            forced: "يُفرَض ضبط النسبة — الإطار المحفوظ يختلف عن اختيارك.",
            forcedTo: "النسبة مضبوطة على {ratio} — الإطار المحفوظ يختلف عن اختيارك.",
            same: "اختيارك متوافق مع النسبة — بعد = قبل.",
          },
        },
      },
    },
  });

  const MAX_CELL = 150;

  /** Pencerenin kendi oranını koruyan hücre ölçüsü. */
  function cellFor(winBox) {
    const w = winBox?.w || props.sourceW;
    const h = winBox?.h || props.sourceH;
    const ar = h ? w / h : 1;
    return ar >= 1
      ? { w: MAX_CELL, h: Math.max(1, Math.round(MAX_CELL / ar)) }
      : { w: Math.max(1, Math.round(MAX_CELL * ar)), h: MAX_CELL };
  }

  const beforeCell = computed(() => cellFor(props.beforeWin));
  const afterCell = computed(() => cellFor(props.afterWin));

  const beforeCanvas = ref(null);
  const afterCanvas = ref(null);
  let raf = 0;

  function drawInto(el, winBox) {
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    if (!props.bitmap || !winBox) return;
    ctx.drawImage(
      props.bitmap,
      winBox.x,
      winBox.y,
      winBox.w,
      winBox.h,
      0,
      0,
      el.width,
      el.height
    );
  }

  function schedule() {
    if (raf || typeof requestAnimationFrame === "undefined") return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      drawInto(beforeCanvas.value, props.beforeWin);
      drawInto(afterCanvas.value, props.afterWin);
    });
  }

  onMounted(schedule);
  onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf);
  });

  watch(() => [props.bitmap, props.beforeWin, props.afterWin], schedule, { deep: true });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cba__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .cba__title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .cba__flag {
    color: $c-warning;
    font-size: 0.75rem;
  }

  .cba__ok {
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cba__pair {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .cba__cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
  }

  .cba__frame {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 150px;
  }

  .cba__canvas {
    display: block;
    border: 1px solid $l-border;
    border-radius: 0.25rem;
    background: #111;

    @include dark {
      border-color: $d-border;
    }
  }

  .cba__canvas--after {
    border-color: $brand;
  }

  .cba__arrow {
    flex: 0 0 auto;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cba__caption {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-size: 0.6875rem;
  }

  .cba__label {
    font-weight: 600;
  }

  .cba__label--after {
    color: $brand;
  }

  .cba__size {
    color: $l-text-500;
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>

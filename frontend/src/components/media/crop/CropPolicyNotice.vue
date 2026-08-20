<template>
  <section class="cnotice" :aria-label="t('cropStudio.notice.title')">
    <p v-if="!warnings.length" class="cnotice__ok">
      <AppIcon name="check" :size="14" />
      {{ t("cropStudio.notice.clean") }}
    </p>

    <ul v-else class="cnotice__list" role="list">
      <li v-for="w in warnings" :key="`${w.id}-${JSON.stringify(w.params)}`" :class="cls(w)">
        <AppIcon :name="icon(w)" :size="14" />
        <span>{{ t(`cropStudio.warn.${w.id}`, w.params) }}</span>
      </li>
    </ul>

    <!-- Kadraj boyutu ve engeller ekran okuyucuya duyurulur; görsel bilgi
         yalnız canvas'ta kalırsa klavye kullanıcısı kadrajı hiç öğrenemez. -->
    <p class="cnotice__live" aria-live="polite">{{ liveText }}</p>
  </section>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { SEVERITY } from "@/lib/media/crop/cropWarnings";

  /**
   * Politika uyarıları. Kuralları ÜRETMEZ — `cropWarnings`'in çıktısını
   * gösterir. "Engelle" yalnız profilin istediği piksel üretilemediğinde
   * çıkar; kalanı uyarıdır, çünkü kullanıcıyı kendi görselinden kilitlemek
   * uyumsuz bir görselden kötüdür.
   */
  const props = defineProps({
    warnings: { type: Array, default: () => [] },
    /** `[left, top, w, h]` — sunucunun keseceği tam piksel kutusu. */
    pixelBox: { type: Array, default: null },
  });

  /**
   * Yerel iletiler — güvenli alan ve kalibrasyon uyarıları için.
   * `src/i18n/locales/*.js` bu görevde başka bir ajanın dosyası; yeni
   * anahtarlar bileşen kapsamında durur ve eksik anahtar köke düşer
   * (`fallbackRoot`), yani mevcut `cropStudio.warn.*` metinleri değişmez.
   *
   * `suggestionUncalibrated` metni bilinçli olarak açık sözlü: eşik ölçülmedi
   * ve bunu söylemeyen bir arayüz, güven yüzdesine hak etmediği bir yetke
   * verir (`SMARTCROP_CONFIDENCE_THRESHOLD` notu, T-041'den devralındı).
   */
  const { t } = useI18n({
    messages: {
      tr: {
        cropStudio: {
          warn: {
            safeBand:
              "Odak, güvenli alanın ({axis}) dışında — dar ekranda ortadaki %{pct} dışı kesilebilir.",
            safeBandActive:
              "Bu slotta güvenli alan tanımlı: ortadaki %{pct} ({axis}) her ekranda görünür.",
            suggestionUncalibrated:
              "Otomatik öneri {source} tarafında hesaplandı; karşılaştırıldığı eşik ({threshold}) KALİBRE EDİLMEDİ. Sebep: {reason}.",
          },
        },
      },
      en: {
        cropStudio: {
          warn: {
            safeBand:
              "Focal point sits outside the safe area ({axis}) — anything beyond the centre {pct}% may be cut on narrow screens.",
            safeBandActive:
              "This slot defines a safe area: the centre {pct}% ({axis}) is visible on every screen.",
            suggestionUncalibrated:
              "Automatic suggestion computed on the {source} side; the threshold it is compared against ({threshold}) is NOT CALIBRATED. Reason: {reason}.",
          },
        },
      },
      ru: {
        cropStudio: {
          warn: {
            safeBand:
              "Точка фокуса вне безопасной зоны ({axis}) — за пределами центральных {pct}% возможна обрезка на узких экранах.",
            safeBandActive:
              "Для этого слота задана безопасная зона: центральные {pct}% ({axis}) видны на любом экране.",
            suggestionUncalibrated:
              "Автоподсказка рассчитана на стороне {source}; порог сравнения ({threshold}) НЕ ОТКАЛИБРОВАН. Причина: {reason}.",
          },
        },
      },
      ar: {
        cropStudio: {
          warn: {
            safeBand:
              "نقطة التركيز خارج المنطقة الآمنة ({axis}) — قد يُقتطع ما يتجاوز الوسط {pct}% على الشاشات الضيقة.",
            safeBandActive:
              "هذه الفتحة تحدد منطقة آمنة: الوسط {pct}% ({axis}) ظاهر على كل الشاشات.",
            suggestionUncalibrated:
              "حُسب الاقتراح التلقائي في جهة {source}؛ العتبة المقارَن بها ({threshold}) غير معايَرة. السبب: {reason}.",
          },
        },
      },
    },
  });

  const ICONS = {
    [SEVERITY.BLOCK]: "octagon-x",
    [SEVERITY.WARN]: "triangle-alert",
    [SEVERITY.INFO]: "info",
  };

  const cls = (w) => `cnotice__item cnotice__item--${w.severity}`;
  const icon = (w) => ICONS[w.severity] || "info";

  const liveText = computed(() => {
    if (!props.pixelBox) return "";
    const [, , w, h] = props.pixelBox;
    const blocked = props.warnings.some((x) => x.severity === SEVERITY.BLOCK);
    const size = t("cropStudio.live.size", { w, h });
    return blocked ? `${size} — ${t("cropStudio.live.blocked")}` : size;
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cnotice {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    font-size: 0.8125rem;
  }

  .cnotice__list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cnotice__item {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border-radius: 0.375rem;
    line-height: 1.35;
  }

  .cnotice__item--block {
    background: rgb(239 68 68 / 12%);
    color: $c-error;
  }

  .cnotice__item--warn {
    background: rgb(245 158 11 / 12%);
    color: $c-warning;
  }

  .cnotice__item--info {
    background: $l-bg-muted;
    color: $l-text-600;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  .cnotice__ok {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    color: $c-success;
  }

  .cnotice__live {
    margin: 0;
    color: $l-text-500;
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>

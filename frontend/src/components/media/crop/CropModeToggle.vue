<template>
  <div class="cmode" role="radiogroup" :aria-label="t('cropStudio.mode.title')">
    <span :id="labelId" class="cmode__label">{{ t("cropStudio.mode.title") }}</span>
    <div class="cmode__group" :aria-labelledby="labelId">
      <button
        type="button"
        class="cmode__chip"
        role="radio"
        :aria-checked="mode === 'auto'"
        :class="{ 'cmode__chip--on': mode === 'auto' }"
        :disabled="busy"
        :title="t('cropStudio.mode.autoHint')"
        @click="emit('change', 'auto')"
      >
        <AppIcon name="sparkles" :size="14" />
        {{ t("cropStudio.mode.auto") }}
      </button>
      <button
        type="button"
        class="cmode__chip"
        role="radio"
        :aria-checked="mode === 'manual'"
        :class="{ 'cmode__chip--on': mode === 'manual' }"
        :title="t('cropStudio.mode.manualHint')"
        @click="emit('change', 'manual')"
      >
        <AppIcon name="pencil" :size="14" />
        {{ t("cropStudio.mode.manual") }}
      </button>
    </div>
    <!-- Kip ne yapar açıkça yazılır: "Otomatik" bir odak ÖNERİSİDİR, yüz/nesne
         tespiti değil; "Manuel" kullanıcının kendi kadrajıdır. -->
    <p class="cmode__hint">
      {{ mode === "auto" ? t("cropStudio.mode.autoHint") : t("cropStudio.mode.manualHint") }}
    </p>
  </div>
</template>

<script setup>
  import { useId } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Ayarlama kipi seçici — AÇIK "Otomatik / Manuel" toggle (T-105 isteği).
   *
   * Kip mantığı zaten vardı (`focusSuggest` önerisi + `CropHandles` elle
   * ayar) ama görünür bir seçici yoktu; kullanıcı otomatik önerinin bir
   * düğmenin arkasında olduğunu görmüyordu. Bu bileşen yalnız durumu gösterir
   * ve niyeti yukarı iletir — öneriyi kendisi HESAPLAMAZ (o kabuğun işi,
   * çünkü sunucu ucu ve bitmap orada).
   */
  defineProps({
    /** `"auto" | "manual"` — kabuğun (`useCropStudio.mode`) tuttuğu kip. */
    mode: { type: String, default: "manual" },
    /** Öneri hesaplanırken toggle kilitlenir — çift tetiklemeyi önler. */
    busy: { type: Boolean, default: false },
  });

  const emit = defineEmits(["change"]);

  /** Yerel iletiler — proje deseni (`CropPreviewStrip.vue` gerekçesi). */
  const { t } = useI18n({
    messages: {
      tr: {
        cropStudio: {
          mode: {
            title: "Ayarlama",
            auto: "Otomatik",
            manual: "Manuel",
            autoHint: "Otomatik odak önerisi uygulanır — yüz/nesne tespiti değil, ucuz bir taban öneri.",
            manualHint: "Kadrajı tutamaklarla kendin ayarlarsın.",
          },
        },
      },
      en: {
        cropStudio: {
          mode: {
            title: "Adjust",
            auto: "Automatic",
            manual: "Manual",
            autoHint: "Applies an automatic focus suggestion — not face/object detection, a cheap baseline.",
            manualHint: "You set the crop yourself with the handles.",
          },
        },
      },
      ru: {
        cropStudio: {
          mode: {
            title: "Настройка",
            auto: "Автоматически",
            manual: "Вручную",
            autoHint: "Применяется автоматическая подсказка фокуса — не распознавание лиц/объектов, простая база.",
            manualHint: "Кадр настраивается вручную маркерами.",
          },
        },
      },
      ar: {
        cropStudio: {
          mode: {
            title: "الضبط",
            auto: "تلقائي",
            manual: "يدوي",
            autoHint: "يُطبَّق اقتراح تركيز تلقائي — ليس كشف الوجوه/الأجسام، بل أساس بسيط.",
            manualHint: "تضبط الإطار بنفسك عبر المقابض.",
          },
        },
      },
    },
  });

  const labelId = `cmode-${useId()}`;
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cmode {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
  }

  .cmode__label {
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cmode__group {
    display: inline-flex;
    gap: 0.25rem;
  }

  .cmode__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border: 1px solid $l-border;
    border-radius: 0.375rem;
    background: $l-bg;
    color: $l-text-700;
    cursor: pointer;
    transition: background $t-fast;

    &:hover:not(:disabled) {
      background: $l-bg-muted;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 1px;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;

      &:hover:not(:disabled) {
        background: $d-bg-hover;
      }
    }
  }

  .cmode__chip--on {
    border-color: $brand;
    background: $brand;
    color: #fff;

    @include dark {
      background: $brand;
      color: #fff;
    }
  }

  .cmode__hint {
    flex-basis: 100%;
    margin: 0;
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>

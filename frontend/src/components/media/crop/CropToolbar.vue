<template>
  <div class="ctoolbar" role="toolbar" :aria-label="t('cropStudio.toolbar.title')">
    <div class="ctoolbar__group">
      <span :id="ratioLabelId" class="ctoolbar__label">{{ t("cropStudio.toolbar.ratio") }}</span>
      <div class="ctoolbar__ratios" role="radiogroup" :aria-labelledby="ratioLabelId">
        <button
          type="button"
          class="ctoolbar__chip"
          role="radio"
          :aria-checked="lockedRatio === null"
          :class="{ 'ctoolbar__chip--on': lockedRatio === null }"
          @click="emit('ratio', null)"
        >
          {{ t("cropStudio.toolbar.free") }}
        </button>
        <button
          v-for="o in options"
          :key="o.id"
          type="button"
          class="ctoolbar__chip"
          role="radio"
          :aria-checked="lockedRatio === o.targetAR"
          :class="{ 'ctoolbar__chip--on': lockedRatio === o.targetAR }"
          :title="t('cropStudio.toolbar.ratioTitle', { size: `${o.width}×${o.height}` })"
          @click="emit('ratio', o.targetAR)"
        >
          {{ o.label }}
          <!-- Etiket ile gerçek oran ayrışıyorsa kullanıcı bunu GÖRMELİ:
               '16:9' yazan bir düğme 1000×563'ü kırpıyor olabilir. -->
          <sup v-if="o.labelMisleading" :title="t('cropStudio.toolbar.approx')">*</sup>
        </button>
        <p v-if="!options.length" class="ctoolbar__none">{{ t("cropStudio.toolbar.noRatio") }}</p>
      </div>
    </div>

    <div class="ctoolbar__group">
      <label class="ctoolbar__label" :for="zoomId">{{ t("cropStudio.toolbar.zoom") }}</label>
      <input
        :id="zoomId"
        class="ctoolbar__zoom"
        type="range"
        :min="ZOOM_MIN"
        :max="ZOOM_MAX"
        step="0.01"
        :value="zoom"
        :aria-valuetext="`${zoom.toFixed(2)}×`"
        @input="emit('zoom', Number($event.target.value))"
        @change="emit('commit', 'zoom')"
      />
      <output class="ctoolbar__zoomval">{{ zoom.toFixed(2) }}×</output>
    </div>

    <div class="ctoolbar__group ctoolbar__group--end">
      <button
        type="button"
        class="ctoolbar__btn"
        :disabled="!canUndo"
        :aria-label="t('cropStudio.toolbar.undo')"
        :title="t('cropStudio.toolbar.undo')"
        @click="emit('undo')"
      >
        <AppIcon name="undo-2" :size="15" />
      </button>
      <button
        type="button"
        class="ctoolbar__btn"
        :disabled="!canRedo"
        :aria-label="t('cropStudio.toolbar.redo')"
        :title="t('cropStudio.toolbar.redo')"
        @click="emit('redo')"
      >
        <AppIcon name="redo-2" :size="15" />
      </button>
      <button
        type="button"
        class="ctoolbar__btn"
        :aria-label="t('cropStudio.toolbar.reset')"
        :title="t('cropStudio.toolbar.reset')"
        @click="emit('reset')"
      >
        <AppIcon name="rotate-ccw" :size="15" />
      </button>
      <button
        type="button"
        class="ctoolbar__btn ctoolbar__btn--wide"
        :disabled="suggesting"
        @click="emit('suggest')"
      >
        <AppIcon name="wand-sparkles" :size="15" />
        {{ t("cropStudio.toolbar.suggest") }}
      </button>
    </div>

    <!-- Rozet: öneri OTOMATİKTİR, yüz/nesne tespiti DEĞİLDİR. Kullanıcı
         kadraja dokununca düşer (`approved_by_user = 1`). -->
    <p v-if="suggestion && !approvedByUser" class="ctoolbar__badge">
      <AppIcon name="sparkles" :size="13" />
      {{ t("cropStudio.toolbar.suggestBadge", { pct: Math.round(suggestion.confidence * 100) }) }}
      <span v-if="suggestion.confidence < threshold" class="ctoolbar__badge-weak">
        {{ t("cropStudio.toolbar.suggestWeak") }}
      </span>
    </p>
  </div>
</template>

<script setup>
  import { useId } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { ZOOM_MAX, ZOOM_MIN } from "@/lib/media/crop/geometry";

  /**
   * Oran kilidi, zoom kaydırıcısı, geri/ileri, sıfırla, otomatik öneri.
   *
   * Oran seçenekleri profilin `width`/`height` sayılarından gelir — etiketten
   * DEĞİL. Etiket ile sayı ayrışıyorsa düğmede yıldız çıkar ve ipucu bunu
   * söyler (faz10-crop-studio.md Bulgu 1).
   */
  defineProps({
    options: { type: Array, default: () => [] },
    lockedRatio: { type: Number, default: null },
    zoom: { type: Number, required: true },
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false },
    suggestion: { type: Object, default: null },
    approvedByUser: { type: Boolean, default: false },
    suggesting: { type: Boolean, default: false },
    threshold: { type: Number, default: 0.5 },
  });

  const emit = defineEmits(["ratio", "zoom", "commit", "undo", "redo", "reset", "suggest"]);
  const { t } = useI18n();

  const zoomId = `czoom-${useId()}`;
  const ratioLabelId = `cratio-${useId()}`;
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .ctoolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
  }

  .ctoolbar__group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ctoolbar__group--end {
    margin-left: auto;
  }

  .ctoolbar__label {
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .ctoolbar__ratios {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .ctoolbar__chip,
  .ctoolbar__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.55rem;
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

  .ctoolbar__chip--on {
    border-color: $brand;
    background: $brand;
    color: #fff;

    @include dark {
      background: $brand;
      color: #fff;
    }
  }

  .ctoolbar__none {
    margin: 0;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .ctoolbar__zoom {
    width: 9rem;
  }

  .ctoolbar__zoomval {
    min-width: 3rem;
    font-variant-numeric: tabular-nums;
  }

  .ctoolbar__badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    margin: 0;
    color: $brand;
  }

  .ctoolbar__badge-weak {
    color: $c-warning;
  }
</style>

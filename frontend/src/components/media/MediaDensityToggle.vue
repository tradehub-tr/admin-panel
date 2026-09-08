<template>
  <div class="mdens" role="group" :aria-label="t('mediaDensity.aria')">
    <button
      v-for="mod in MODLAR"
      :key="mod.id"
      type="button"
      class="mdens__btn"
      :class="{ 'mdens__btn--on': modelValue === mod.id }"
      :title="mod.label"
      :aria-pressed="modelValue === mod.id"
      @click="$emit('update:modelValue', mod.id)"
    >
      <AppIcon :name="mod.icon" :size="14" />
      <span class="mdens__lbl">{{ mod.label }}</span>
    </button>
  </div>
</template>

<script setup>
  /**
   * Liste yoğunluğu anahtarı (MOGEM-625 · kalıp C).
   *
   * `ViewModeToggle` ile aynı görsel dil — yan yana durduklarında iki ayrı
   * bileşen gibi görünmemeleri gerekiyor. Farkı: bu anahtar YERLEŞİMİ değil
   * yoğunluğu değiştirir ve dokunmatikte de anlamlıdır, o yüzden
   * `isDesktop` kapısının arkasında DEĞİL.
   *
   * Etiket dar ekranda gizlenir, ikon kalır (araç şeridinde aramayla yan yana
   * sığsın) — `mo__funnel-text` ile aynı kalıp.
   */
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { DENSITY_MODES } from "@/composables/useMediaDensity.js";

  defineProps({
    modelValue: { type: String, default: "rahat" },
  });

  defineEmits(["update:modelValue"]);

  const { t } = useI18n();

  // İkonlar `iconRegistry`de KAYITLI olanlardan seçildi. `rows-3`/`rows-4`
  // anlamca daha iyiydi ama kayıtlı değil ve `resolveAppIcon` kayıtsız adda
  // `null` dönüyor — `<component :is="null">` hiçbir şey çizmez, yani ikon
  // sessizce kaybolurdu (panelde bu tuzağın karşılığı yok, kontrol edildi).
  const TANIM = {
    rahat: { icon: "layout-list", label: () => t("mediaDensity.rahat") },
    siki: { icon: "menu", label: () => t("mediaDensity.siki") },
  };

  const MODLAR = computed(() =>
    DENSITY_MODES.map((id) => ({ id, icon: TANIM[id].icon, label: TANIM[id].label() }))
  );
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mdens {
    display: flex;
    align-items: center;
    flex: none;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    overflow: hidden;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .mdens__btn {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    // `view-mode-btn` ile aynı ölçü: min-* + padding, sabit yükseklik değil —
    // %200 metin büyütmede ikon kırpılmasın (WCAG 1.4.4).
    min-height: 32px;
    padding: 4px 9px;
    border: 0;
    background: transparent;
    font-family: inherit;
    font-weight: 500;
    color: $l-text-500;
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
    @include media.text("xs");
    @include media.focus-ring;
    @include media.press(0.96);

    & + & {
      border-inline-start: 1px solid $l-border;

      @include dark {
        border-inline-start-color: $d-border-inner;
      }
    }

    @include media.hoverable {
      &:hover:not(.mdens__btn--on) {
        background: $l-bg-muted;
        color: $l-text-700;
      }
    }

    @include dark {
      background: $d-bg-card;
      color: $d-text-muted;
    }
  }

  // Sarı zeminde beyaz 1.84:1 veriyordu; `$brand-ink` 9.73:1 (WCAG 1.4.11) —
  // `view-mode-btn.active` ile birebir aynı çözüm.
  .mdens__btn--on {
    background: $brand;
    color: $brand-ink;

    @include dark {
      background: $brand;
      color: $brand-ink;
    }
  }

  // Dar ekranda yalnız ikon: araç şeridinde arama alanıyla yan yana sığmalı.
  @media (max-width: media.$m-bp-md) {
    .mdens__lbl {
      @include media.sr-only;
    }

    .mdens__btn {
      padding: 4px 10px;
    }
  }
</style>

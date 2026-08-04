<template>
  <div v-if="chips.length" class="mchips" role="status" :aria-label="t('media.filters.active')">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="mchips__chip"
      @click="emit('clear', chip.key)"
    >
      <span class="mchips__label">{{ chip.label }}</span>
      <AppIcon name="x" :size="13" />
      <span class="mchips__sr">{{ t("media.filters.removeChip", { label: chip.label }) }}</span>
    </button>

    <button
      v-if="chips.length > 1"
      type="button"
      class="mchips__reset"
      @click="emit('clear', 'all')"
    >
      {{ t("media.filters.reset") }}
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Aktif filtreleri tek satırda gösterir; her çip tek tıkla kaldırılır.
   * Filtre rayı katlanmış/mobil drawer'dayken hangi filtrelerin açık olduğu
   * görünür kalsın diye (Notion/Figma deseni).
   */
  const props = defineProps({
    state: { type: Object, required: true },
    labels: { type: Object, required: true },
  });
  const emit = defineEmits(["clear"]);

  const { t } = useI18n();

  /** Etiketli (label'ı sözlükten gelen) basit filtreler. */
  const SIMPLE = ["kind", "usage", "owner", "orientation", "date", "size"];

  const chips = computed(() => {
    const out = [];
    const s = props.state;

    if (s.search.trim())
      out.push({ key: "search", label: t("media.filters.chipSearch", { q: s.search.trim() }) });

    for (const key of SIMPLE) {
      if (s[key] && s[key] !== "all") out.push({ key, label: props.labels[key][s[key]] });
    }

    // Format çipi ham uzantı gösterir (WEBP, PDF …) — sözlüğe gerek yok.
    if (s.format && s.format !== "all") out.push({ key: "format", label: s.format });

    for (const tag of s.tags || []) out.push({ key: `tag:${tag}`, label: `#${tag}` });

    if (s.archived) out.push({ key: "archived", label: t("media.filters.archived") });
    return out;
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mchips {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
    margin-bottom: media.$s-4;
  }

  .mchips__chip {
    position: relative;
    border: 1px solid transparent;
    cursor: pointer;
    @include media.chip("info");
    @include media.focus-ring;
    @include media.press(0.94);

    @include media.hoverable {
      &:hover {
        border-color: currentcolor;
      }
    }
  }

  .mchips__label {
    max-width: 14rem;
    @include media.truncate;
  }

  .mchips__reset {
    @include media.button("ghost");
    @include media.focus-ring;

    min-height: auto;
    padding: 0 media.$s-1;
    @include media.text("xs");
    text-decoration: underline;
  }

  .mchips__sr {
    @include media.sr-only;
  }
</style>

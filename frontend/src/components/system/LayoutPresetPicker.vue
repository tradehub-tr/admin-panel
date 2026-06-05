<template>
  <div class="preset-picker">
    <button
      v-for="p in presets"
      :key="p.key"
      type="button"
      class="preset-card"
      :title="t(`showcase.presetNames.${p.key}`)"
      @click="$emit('apply', { columns: p.columns, slots: p.slots })"
    >
      <div class="preset-thumb" :style="{ gridTemplateColumns: `repeat(${p.columns}, 1fr)` }">
        <span
          v-for="(s, i) in p.slots"
          :key="i"
          :style="{ gridColumn: `span ${s[0]}`, gridRow: `span ${s[1]}` }"
        />
      </div>
      <span class="preset-name">{{ t(`showcase.presetNames.${p.key}`) }}</span>
    </button>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();
  defineEmits(["apply"]);

  // slot = [col_span, row_span]. Storefront span'leri responsive (mobil 1 / tablet 2 / desktop N).
  const presets = [
    {
      key: "journal5",
      columns: 4,
      slots: [
        [1, 2],
        [1, 2],
        [2, 1],
        [1, 1],
        [1, 1],
      ],
    },
    {
      key: "trio",
      columns: 3,
      slots: [
        [1, 1],
        [1, 1],
        [1, 1],
      ],
    },
    {
      key: "showcase",
      columns: 4,
      slots: [
        [2, 2],
        [2, 1],
        [1, 1],
        [1, 1],
      ],
    },
    {
      key: "feature",
      columns: 3,
      slots: [
        [2, 2],
        [1, 1],
        [1, 1],
        [1, 1],
      ],
    },
  ];
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .preset-picker {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .preset-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    padding: 10px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color $t-base;

    &:hover {
      border-color: $brand;
    }

    @include dark {
      background-color: $d-bg-card;
      border-color: $d-border;
      &:hover {
        border-color: $brand;
      }
    }
  }

  .preset-thumb {
    display: grid;
    grid-auto-rows: 14px;
    grid-auto-flow: row dense;
    gap: 3px;
    width: 104px;

    span {
      background: rgba($brand, 0.28);
      border-radius: 2px;
    }
  }

  .preset-name {
    font-size: 11px;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
</style>

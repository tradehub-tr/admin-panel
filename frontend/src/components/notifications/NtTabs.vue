<script setup>
  /**
   * Sekme listesi. Sekmeler SARILIR — hiçbir genişlikte kesilmez, gizli
   * kaydırma yoktur. Hata bayrağı ve durum eki renkle birlikte metin/ikon taşır.
   */
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useTablistKeys } from "@/composables/notifications/useTablistKeys";

  const props = defineProps({
    /**
     * [{ id, label, icon?, lock?, errors?, meta?, metaTone?, metaIcon?, lang?, ariaLabel? }]
     */
    tabs: { type: Array, required: true },
    label: { type: String, required: true },
    /** Sekme id öneki: `${prefix}-${id}` */
    prefix: { type: String, required: true },
    /** Bağlı tabpanel'in id'si */
    panel: { type: String, default: "" },
    /** underline | pill */
    look: { type: String, default: "underline" },
  });
  const model = defineModel({ type: String, required: true });

  const { onKeydown } = useTablistKeys(
    () => props.tabs.map((t) => t.id),
    (id) => (model.value = id),
    (id) => document.getElementById(`${props.prefix}-${id}`)
  );
</script>

<template>
  <div
    class="nt-tabs"
    :class="`nt-tabs--${look}`"
    role="tablist"
    :aria-label="label"
    @keydown="onKeydown($event, model)"
  >
    <button
      v-for="tab in tabs"
      :id="`${prefix}-${tab.id}`"
      :key="tab.id"
      type="button"
      role="tab"
      class="nt-tab"
      :aria-selected="model === tab.id"
      :aria-controls="panel || undefined"
      :aria-label="tab.ariaLabel"
      :tabindex="model === tab.id ? 0 : -1"
      :lang="tab.lang"
      @click="model = tab.id"
    >
      <AppIcon v-if="tab.icon" :name="tab.icon" :size="15" />
      <span>{{ tab.label }}</span>
      <template v-if="tab.lock">
        <AppIcon name="lock" :size="12" class="nt-tab__lock" />
        <span class="nt-sr">, zorunlu</span>
      </template>
      <span v-if="tab.meta" class="nt-tab__meta" :class="tab.metaTone ? `is-${tab.metaTone}` : ''">
        <AppIcon v-if="tab.metaIcon" :name="tab.metaIcon" :size="12" />{{ tab.meta }}
      </span>
      <template v-if="tab.errors">
        <span class="nt-tab__flag" aria-hidden="true" />
        <span v-if="!tab.ariaLabel" class="nt-sr">, {{ tab.errors }} hata</span>
      </template>
    </button>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .nt-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--nt-fg-2);
    font: inherit;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: var(--nt-bg-muted);
    }

    &[aria-selected="true"] {
      border-color: var(--nt-brand-line);
      background: var(--nt-brand-bg);
      color: var(--nt-fg);
      box-shadow: inset 0 -2px 0 $brand;
    }

    @media (max-width: 767px) {
      min-height: 44px;
    }
  }

  .nt-tabs--pill .nt-tab[aria-selected="true"] {
    border-color: var(--nt-field-line);
    background: var(--nt-bg);
    box-shadow: none;
  }

  .nt-tab__lock {
    color: var(--nt-muted);
  }

  .nt-tab__meta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 500;
    color: var(--nt-muted);

    &.is-warn {
      color: var(--nt-warn-fg);
    }

    &.is-err {
      color: var(--nt-err-fg);
    }
  }

  .nt-tab__flag {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--nt-err-line);
  }
</style>

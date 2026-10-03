<script setup>
  /**
   * Yan yana seçenekli tekli seçim (gerçek radyo düğmeleri).
   * `fieldset/legend` çağıranındır; burada yalnız seçenek satırı çizilir.
   * Seçili durum renkle birlikte onay ikonuyla da gösterilir.
   */
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    name: { type: String, required: true },
    /** [{ value, label, title?, disabled? }] */
    options: { type: Array, required: true },
    disabled: { type: Boolean, default: false },
  });
  const model = defineModel({ type: String, default: "" });
</script>

<template>
  <div class="nt-choice" :style="{ '--nt-choice-n': options.length }">
    <label
      v-for="opt in options"
      :key="opt.value"
      class="nt-choice__opt"
      :class="{ 'is-on': model === opt.value, 'is-off': disabled || opt.disabled }"
      :title="opt.title"
    >
      <input
        type="radio"
        class="nt-choice__input"
        :name="name"
        :value="opt.value"
        :checked="model === opt.value"
        :disabled="disabled || opt.disabled"
        @change="model = opt.value"
      />
      <AppIcon v-if="model === opt.value" name="check" :size="14" />
      <span>{{ opt.label }}</span>
    </label>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-choice {
    display: grid;
    grid-template-columns: repeat(var(--nt-choice-n), minmax(0, 1fr));
    border: 1px solid var(--nt-field-line);
    border-radius: 8px;
    overflow: hidden;
  }

  .nt-choice__opt {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 36px;
    padding: 4px 8px;
    background: var(--nt-bg);
    color: var(--nt-fg-2);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.25;
    text-align: center;
    cursor: pointer;

    & + & {
      border-inline-start: 1px solid var(--nt-field-line);
    }

    &.is-on {
      background: var(--nt-brand-bg);
      color: var(--nt-fg);
    }

    &.is-off {
      cursor: not-allowed;
    }

    &.is-off:not(.is-on) {
      background: var(--nt-bg-muted);
      color: var(--nt-muted);
    }

    &:has(.nt-choice__input:focus-visible) {
      z-index: 1;
      outline: 2px solid $c-info;
      outline-offset: -2px;
    }

    @media (max-width: 767px) {
      min-height: 44px;
      font-size: 13px;
    }
  }

  .nt-choice__input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
</style>

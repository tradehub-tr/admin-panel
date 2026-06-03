<script setup>
  import { computed } from "vue";

  const props = defineProps({
    onValue: { type: [Boolean, String, Number], default: true },
    offValue: { type: [Boolean, String, Number], default: false },
    label: { type: String, default: "" },
    description: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  });

  const model = defineModel({ type: [Boolean, String, Number], default: false });

  const isOn = computed(() => model.value === props.onValue);

  function toggle() {
    if (props.disabled) return;
    model.value = isOn.value ? props.offValue : props.onValue;
  }
</script>

<template>
  <div class="switch-row">
    <div v-if="label || description" class="switch-text">
      <div v-if="label" class="switch-title">{{ label }}</div>
      <div v-if="description" class="switch-desc">{{ description }}</div>
    </div>
    <button
      type="button"
      role="switch"
      class="switch"
      :class="{ on: isOn }"
      :aria-checked="isOn"
      :aria-label="label || undefined"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="switch-thumb" />
    </button>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .switch-title {
    font-size: 13.5px;
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .switch-desc {
    font-size: 11.5px;
    color: $l-text-500;
    margin-top: 3px;
    max-width: 280px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .switch {
    position: relative;
    flex-shrink: 0;
    width: 46px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: $l-text-300;
    cursor: pointer;
    appearance: none;
    transition: background $t-slow;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px rgba($brand, 0.4);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.on {
      background: $brand;
      box-shadow: 0 0 14px $brand-glow;
    }

    @include dark {
      background: $d-border;

      &.on {
        background: $brand;
      }
    }
  }

  .switch-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: transform $t-slow;

    .switch.on & {
      transform: translateX(20px);
    }
  }
</style>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    options: {
      type: Array,
      required: true,
      validator: (opts) => opts.every((o) => "value" in o && "label" in o),
    },
  });

  const model = defineModel({ type: [String, Number, Boolean], default: null });

  const activeIndex = computed(() => props.options.findIndex((o) => o.value === model.value));

  const thumbStyle = computed(() => {
    const count = props.options.length || 1;
    const idx = activeIndex.value < 0 ? 0 : activeIndex.value;
    // left/width yerine transform (GPU, reflow yok). Thumb genişliği = segmentW - 4px,
    // translateX(idx * (100% + 4px)) = idx * segmentW → tam hizalanır.
    return {
      width: `calc(${100 / count}% - 4px)`,
      transform: `translateX(calc(${idx} * (100% + 4px)))`,
      opacity: activeIndex.value < 0 ? 0 : 1,
    };
  });

  const activeDesc = computed(() => props.options[activeIndex.value]?.desc || "");

  function select(value) {
    model.value = value;
  }
</script>

<template>
  <div class="segmented-wrap">
    <div class="seg" role="radiogroup">
      <span class="seg-thumb" :style="thumbStyle" />
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="seg-btn"
        :class="{ active: model === opt.value }"
        :aria-pressed="model === opt.value"
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
    <p v-if="activeDesc" class="seg-desc">{{ activeDesc }}</p>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .seg {
    position: relative;
    display: flex;
    width: 100%;
    gap: 2px;
    padding: 4px;
    background: $l-bg-muted;
    border: 1px solid $l-border-alt;
    border-radius: 10px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .seg-btn {
    position: relative;
    z-index: 2;
    flex: 1;
    padding: 9px 10px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: $l-text-500;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: color $t-slow;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px rgba($brand, 0.4);
    }

    &.active {
      color: #fff;
    }

    @include dark {
      color: $d-text-muted;

      &.active {
        color: #fff;
      }
    }
  }

  .seg-thumb {
    position: absolute;
    z-index: 1;
    top: 4px;
    bottom: 4px;
    left: 2px;
    border-radius: 7px;
    background: $brand;
    box-shadow: 0 0 14px $brand-glow;
    transition:
      transform $t-spring,
      opacity $t-base;
  }

  .seg-desc {
    margin: 10px 0 0;
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    // Hazır şekiller — çoğu ekran için bunlar yeter.
    variant: {
      type: String,
      default: "text",
      validator: (v) =>
        ["text", "title", "line", "card", "kpi", "row", "avatar", "circle", "button"].includes(v),
    },
    // Tek satırlık override'lar (variant üstüne).
    width: { type: String, default: "" },
    height: { type: String, default: "" },
    radius: { type: String, default: "" },
    // Kaç adet üst üste (liste iskeletleri için).
    count: { type: Number, default: 1 },
  });

  const items = computed(() => Array.from({ length: Math.max(1, props.count) }));

  const style = computed(() => {
    const s = {};
    if (props.width) s.width = props.width;
    if (props.height) s.height = props.height;
    if (props.radius) s.borderRadius = props.radius;
    return s;
  });
</script>

<template>
  <span
    v-for="(_, i) in items"
    :key="i"
    class="sk"
    :class="`sk--${variant}`"
    :style="style"
    aria-hidden="true"
  />
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  // Opacity nabzı — layout/paint tetiklemez (background-position shimmer YASAK).
  // Hareket global prefers-reduced-motion ile zaten kısılır.
  .sk {
    display: block;
    background: $l-bg-muted;
    border-radius: 8px;
    animation: skPulse 1.5s ease-in-out infinite;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  // Satır aralığı — art arda gelen text/line iskeletleri nefes alsın.
  .sk + .sk {
    margin-top: 8px;
  }

  .sk--text {
    height: 12px;
    width: 100%;
  }

  .sk--title {
    height: 20px;
    width: 40%;
  }

  .sk--line {
    height: 12px;
    width: 100%;
  }

  .sk--card {
    height: 120px;
    width: 100%;
    border-radius: 12px;
  }

  .sk--kpi {
    height: 88px;
    width: 100%;
    border-radius: 12px;
  }

  .sk--row {
    height: 48px;
    width: 100%;
    border-radius: 8px;
  }

  .sk--avatar {
    height: 40px;
    width: 40px;
    border-radius: 50%;
  }

  .sk--circle {
    height: 32px;
    width: 32px;
    border-radius: 50%;
  }

  .sk--button {
    height: 36px;
    width: 96px;
    border-radius: 8px;
  }

  @keyframes skPulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.45;
    }
  }
</style>

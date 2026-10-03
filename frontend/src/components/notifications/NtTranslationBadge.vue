<script setup>
  /** Çeviri durumu rozeti: "3/4 dil". Ton ikonla da ayrışır. */
  import NtBadge from "./NtBadge.vue";

  defineProps({
    /** `translationSummary(event)` çıktısı */
    summary: { type: Object, required: true },
  });

  const ICON = { ok: "check", warn: "clock", err: "triangle-alert" };
</script>

<template>
  <NtBadge :tone="summary.tone" :icon="ICON[summary.tone]">
    <span class="nt-num">{{ summary.count }}</span>
  </NtBadge>
</template>

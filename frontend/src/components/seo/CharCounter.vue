<script setup>
  import { computed } from "vue";

  const props = defineProps({
    value: { type: String, default: "" },
    max: { type: Number, required: true },
  });

  const length = computed(() => (props.value || "").length);
  const percent = computed(() => length.value / props.max);

  const colorClass = computed(() => {
    if (percent.value > 1) return "text-red-500";
    if (percent.value > 0.8) return "text-orange-500";
    return "text-gray-400";
  });
</script>

<template>
  <div class="text-xs mt-1 flex justify-between" :class="colorClass">
    <span>{{ length }} / {{ max }} karakter</span>
    <span v-if="percent > 1">Önerilen sınır aşıldı</span>
  </div>
</template>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    check: { type: Object, required: true },
  });

  const icon = computed(() => {
    switch (props.check.status) {
      case "pass":
        return "✓";
      case "warn":
        return "⚠";
      case "fail":
        return "✗";
      case "na":
        return "−";
      default:
        return "?";
    }
  });

  const colorClass = computed(() => {
    switch (props.check.status) {
      case "pass":
        return "text-green-600";
      case "warn":
        return "text-orange-500";
      case "fail":
        return "text-red-500";
      case "na":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  });
</script>

<template>
  <div class="flex items-start gap-2 py-1.5">
    <span class="font-mono text-sm w-4 flex-shrink-0 text-center" :class="colorClass">{{
      icon
    }}</span>
    <div class="flex-1 min-w-0">
      <div class="text-sm" :class="colorClass">
        {{ check.label }}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">
        {{ check.message }}
      </div>
      <div v-if="check.suggestion" class="text-xs text-blue-600 mt-0.5">
        💡 {{ check.suggestion }}
      </div>
    </div>
  </div>
</template>

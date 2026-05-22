<script setup>
  import SeoCheckItem from "./SeoCheckItem.vue";

  defineProps({
    group: { type: Object, required: true },
    // group: { label, score, max, checks }
  });
</script>

<template>
  <div class="border-t border-gray-100 first:border-t-0 pt-3 pb-2">
    <div class="flex items-center justify-between mb-1">
      <h4 class="text-sm font-semibold text-gray-700">
        {{ group.label }}
      </h4>
      <span class="text-xs text-gray-500 font-mono"> {{ group.score }}/{{ group.max }} </span>
    </div>
    <div class="space-y-0.5">
      <SeoCheckItem v-for="check in group.checks" :key="check.id" :check="check" />
    </div>
  </div>
</template>

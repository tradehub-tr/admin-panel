<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import SeoChecklistGroup from "./SeoChecklistGroup.vue";

  const { t } = useI18n();

  const props = defineProps({
    analysis: { type: Object, required: true },
    // analysis: { total, grade, byCategory, checks }
  });

  const expanded = ref(false);

  const gradeLabel = computed(() => {
    switch (props.analysis.grade) {
      case "iyi":
        return t("seoScoreBar.gradeGood");
      case "orta":
        return t("seoScoreBar.gradeMedium");
      case "gelistirilmeli":
        return t("seoScoreBar.gradePoor");
      default:
        return "—";
    }
  });

  const barColorClass = computed(() => {
    const total = props.analysis.total;
    if (total >= 70) return "bg-green-500";
    if (total >= 40) return "bg-yellow-500";
    return "bg-red-500";
  });

  const textColorClass = computed(() => {
    const total = props.analysis.total;
    if (total >= 70) return "text-green-600";
    if (total >= 40) return "text-yellow-600";
    return "text-red-600";
  });

  const orderedGroups = computed(() => {
    const order = ["keyword", "length", "readability", "structure", "technical"];
    return order.map((key) => props.analysis.byCategory[key]).filter((g) => g);
  });
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <!-- Pill / header -->
    <button
      type="button"
      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-sm font-semibold" :class="textColorClass">
          {{ t("seoScoreBar.score") }}
        </span>
        <span class="text-lg font-bold" :class="textColorClass"> {{ analysis.total }}/100 </span>
        <span class="text-xs px-2 py-0.5 rounded-full text-white" :class="barColorClass">
          {{ gradeLabel }}
        </span>
      </div>

      <!-- Bar -->
      <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-300"
          :class="barColorClass"
          :style="{ width: `${analysis.total}%` }"
        ></div>
      </div>

      <span class="text-xs text-gray-500 flex-shrink-0">
        {{ expanded ? t("seoScoreBar.collapse") : t("seoScoreBar.expand") }}
      </span>
    </button>

    <!-- Açılır panel -->
    <div v-if="expanded" class="px-4 py-2 border-t border-gray-100">
      <SeoChecklistGroup v-for="group in orderedGroups" :key="group.label" :group="group" />
    </div>
  </div>
</template>

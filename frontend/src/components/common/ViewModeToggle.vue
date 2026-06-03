<template>
  <div class="view-mode-toggle">
    <button
      v-for="mode in modes"
      :key="mode.id"
      class="view-mode-btn"
      :class="{ active: modelValue === mode.id }"
      :title="mode.label"
      @click="$emit('update:modelValue', mode.id)"
    >
      <AppIcon :name="mode.icon" :size="15" />
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  defineProps({
    modelValue: { type: String, default: "table" },
  });

  defineEmits(["update:modelValue"]);

  const modes = computed(() => [
    { id: "table", icon: "table", label: t("viewModeToggle.tableView") },
    { id: "grid", icon: "layout-grid", label: t("viewModeToggle.cardView") },
    { id: "kanban", icon: "columns-3", label: t("viewModeToggle.kanbanView") },
    { id: "list", icon: "list", label: t("viewModeToggle.listView") },
  ]);
</script>

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

  const props = defineProps({
    modelValue: { type: String, default: "table" },
    // Gösterilecek modlar — alt küme + sıra. Default 4 mod (geriye uyumlu).
    modes: {
      type: Array,
      default: () => ["table", "grid", "kanban", "list"],
      validator: (v) => v.every((m) => ["table", "grid", "kanban", "list", "cards"].includes(m)),
    },
  });

  defineEmits(["update:modelValue"]);

  const MODE_DEFS = {
    table: { icon: "table", label: () => t("viewModeToggle.tableView") },
    grid: { icon: "layout-grid", label: () => t("viewModeToggle.cardView") },
    kanban: { icon: "columns-3", label: () => t("viewModeToggle.kanbanView") },
    list: { icon: "list", label: () => t("viewModeToggle.listView") },
    cards: { icon: "folder-tree", label: () => t("viewModeToggle.cardsView") },
  };

  const modes = computed(() =>
    props.modes.map((id) => ({ id, icon: MODE_DEFS[id].icon, label: MODE_DEFS[id].label() }))
  );
</script>

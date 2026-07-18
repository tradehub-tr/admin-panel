<template>
  <div class="kanban-board">
    <div
      v-for="col in columns"
      :key="col.value"
      class="kanban-col"
      :class="{ 'drag-over': dragOverCol === col.value }"
      @dragover.prevent="onDragOver(col.value, $event)"
      @dragleave="onDragLeave(col.value)"
      @drop="onDrop(col.value)"
    >
      <div class="kanban-col-header">
        <div class="kanban-col-title">
          <span class="kanban-col-dot" :style="{ background: col.color || '#94a3b8' }"></span>
          <span>{{ col.label }}</span>
        </div>
        <span class="kanban-col-count">{{ (groups[col.value] || []).length }}</span>
      </div>

      <slot name="column-extra" :column="col" :items="groups[col.value] || []" />

      <div class="kanban-col-body">
        <div
          v-for="item in groups[col.value] || []"
          :key="item.name"
          class="kanban-card"
          :class="{ dragging: draggingItem?.name === item.name }"
          :draggable="draggable"
          @dragstart="onDragStart(item, $event)"
          @dragend="onDragEnd"
          @click="$emit('item-click', item)"
        >
          <slot name="card" :item="item">
            <div class="kanban-card-title">{{ item[titleField] || item.name }}</div>
          </slot>
        </div>
        <div v-if="!(groups[col.value] || []).length" class="kanban-col-empty">
          {{ emptyText || t("kanbanBoard.noRecordsInColumn") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  const props = defineProps({
    items: { type: Array, default: () => [] },
    // [{ value, label, color }]
    columns: { type: Array, required: true },
    statusField: { type: String, default: "status" },
    titleField: { type: String, default: "name" },
    draggable: { type: Boolean, default: true },
    emptyText: { type: String, default: "" },
  });

  const emit = defineEmits(["item-click", "status-change"]);

  const draggingItem = ref(null);
  const dragOverCol = ref(null);

  const groups = computed(() => {
    const m = {};
    for (const col of props.columns) m[col.value] = [];
    for (const it of props.items) {
      const s = it[props.statusField] ?? props.columns[0]?.value;
      (m[s] ?? (m.__other = m.__other || [])).push(it);
    }
    return m;
  });

  function onDragStart(item, ev) {
    if (!props.draggable) return;
    draggingItem.value = item;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", item.name);
  }

  function onDragEnd() {
    draggingItem.value = null;
    dragOverCol.value = null;
  }

  function onDragOver(colValue, ev) {
    if (!props.draggable) return;
    ev.dataTransfer.dropEffect = "move";
    dragOverCol.value = colValue;
  }

  function onDragLeave(colValue) {
    if (dragOverCol.value === colValue) dragOverCol.value = null;
  }

  function onDrop(colValue) {
    if (!draggingItem.value) return;
    const item = draggingItem.value;
    if (item[props.statusField] !== colValue) emit("status-change", { item, newStatus: colValue });
    draggingItem.value = null;
    dragOverCol.value = null;
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .kanban-board {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  .kanban-col {
    flex: 0 0 280px;
    background: $l-bg-soft;
    border: 1px solid $l-border;
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    max-height: 70vh;
    transition:
      border-color $t-fast,
      background $t-fast;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &.drag-over {
      border-color: $brand;
      background: rgba($brand, 0.06);
    }
  }
  .kanban-col-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .kanban-col-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .kanban-col-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex: none;
  }
  .kanban-col-count {
    font-size: 0.6875rem;
    font-weight: 600;
    color: $l-text-500;
    background: $l-bg-muted;
    border-radius: 999px;
    padding: 0.0625rem 0.5rem;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-hover;
    }
  }
  .kanban-col-body {
    padding: 0.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .kanban-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    padding: 0.625rem;
    cursor: pointer;
    transition:
      border-color $t-fast,
      box-shadow $t-fast;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
    }
    &:hover {
      border-color: $brand;
    }
    &.dragging {
      opacity: 0.5;
    }
  }
  .kanban-card-title {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .kanban-col-empty {
    font-size: 0.6875rem;
    color: $l-text-400;
    text-align: center;
    padding: 1.5rem 0;
    @include dark {
      color: $d-text-faint;
    }
  }
</style>

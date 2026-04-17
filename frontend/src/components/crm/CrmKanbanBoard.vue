<template>
  <div class="crm-kanban">
    <div
      v-for="col in columns"
      :key="col.value"
      class="crm-kanban-col"
      :class="{ 'drag-over': dragOverCol === col.value }"
      @dragover.prevent="onDragOver(col.value, $event)"
      @dragleave="onDragLeave(col.value)"
      @drop="onDrop(col.value)"
    >
      <div class="crm-kanban-col-header">
        <div class="crm-kanban-col-title">
          <span class="crm-kanban-col-dot" :style="{ background: col.color || '#94a3b8' }"></span>
          <span>{{ col.label }}</span>
        </div>
        <span class="crm-kanban-col-count">{{ (groups[col.value] || []).length }}</span>
      </div>
      <div v-if="showTotal" class="crm-kanban-col-total">
        Toplam: <CurrencyAmount :amount="columnTotal(col.value)" :currency="currency" />
      </div>
      <div class="crm-kanban-col-body">
        <div
          v-for="item in (groups[col.value] || [])"
          :key="item.name"
          class="crm-kanban-card"
          :class="{ dragging: draggingItem?.name === item.name }"
          draggable="true"
          @dragstart="onDragStart(item, $event)"
          @dragend="onDragEnd"
          @click="$emit('item-click', item)"
        >
          <div class="crm-kanban-card-title">
            {{ cardTitle(item) }}
          </div>
          <div v-if="item.organization" class="text-[11px] text-gray-500 dark:text-gray-400 mb-1 truncate">
            {{ item.organization }}
          </div>
          <div class="crm-kanban-card-meta">
            <span v-if="valueOf(item)" class="crm-kanban-card-value">
              <CurrencyAmount :amount="valueOf(item)" :currency="item.currency || currency" />
            </span>
            <span v-else>&nbsp;</span>
            <span v-if="item.deal_owner || item.lead_owner">
              <UserAvatar :email="item.deal_owner || item.lead_owner" size="sm" />
            </span>
          </div>
        </div>
        <div v-if="!(groups[col.value] || []).length" class="text-[11px] text-gray-400 text-center py-6">
          Bu aşamada kayıt yok
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CurrencyAmount from './CurrencyAmount.vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  statusField: { type: String, default: 'status' },
  titleField: { type: String, default: 'name' },
  valueField: { type: String, default: 'deal_value' },
  currency: { type: String, default: 'TRY' },
  showTotal: { type: Boolean, default: true },
})

const emit = defineEmits(['item-click', 'status-change'])

const draggingItem = ref(null)
const dragOverCol = ref(null)

const groups = computed(() => {
  const m = {}
  for (const col of props.columns) m[col.value] = []
  for (const it of props.items) {
    const s = it[props.statusField] || (props.columns[0]?.value)
    if (m[s]) m[s].push(it)
    else {
      if (!m['__other']) m['__other'] = []
      m['__other'].push(it)
    }
  }
  return m
})

function cardTitle(item) {
  if (props.titleField !== 'name') return item[props.titleField] || item.name
  // Lead icin
  if (item.lead_name) return item.lead_name
  if (item.first_name || item.last_name) return [item.first_name, item.last_name].filter(Boolean).join(' ')
  return item.organization || item.name
}

function valueOf(item) {
  return Number(item[props.valueField] || item.deal_value || item.expected_deal_value || item.annual_revenue || 0)
}

function columnTotal(colValue) {
  const rows = groups.value[colValue] || []
  return rows.reduce((sum, it) => sum + valueOf(it), 0)
}

function onDragStart(item, ev) {
  draggingItem.value = item
  ev.dataTransfer.effectAllowed = 'move'
  ev.dataTransfer.setData('text/plain', item.name)
}

function onDragEnd() {
  draggingItem.value = null
  dragOverCol.value = null
}

function onDragOver(colValue, ev) {
  ev.dataTransfer.dropEffect = 'move'
  dragOverCol.value = colValue
}

function onDragLeave(colValue) {
  if (dragOverCol.value === colValue) dragOverCol.value = null
}

function onDrop(colValue) {
  if (!draggingItem.value) return
  const item = draggingItem.value
  if (item[props.statusField] !== colValue) {
    emit('status-change', { item, newStatus: colValue })
  }
  draggingItem.value = null
  dragOverCol.value = null
}
</script>

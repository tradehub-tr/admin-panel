<template>
  <KanbanBoard
    :items="items"
    :columns="columns"
    :status-field="statusField"
    :empty-text="t('crmKanbanBoard.noRecordsInStage')"
    @item-click="$emit('item-click', $event)"
    @status-change="$emit('status-change', $event)"
  >
    <template v-if="showTotal" #column-extra="{ column }">
      <div class="crm-kanban-col-total">
        {{ t("crmKanbanBoard.total") }}:
        <CurrencyAmount :amount="columnTotal(column.value)" :currency="currency" />
      </div>
    </template>

    <template #card="{ item }">
      <div class="crm-kanban-card-title">{{ cardTitle(item) }}</div>
      <div
        v-if="item.organization"
        class="text-[11px] text-gray-500 dark:text-gray-400 mb-1 truncate"
      >
        {{ item.organization }}
      </div>
      <div class="crm-kanban-card-meta">
        <span v-if="valueOf(item)" class="crm-kanban-card-value">
          <CurrencyAmount :amount="valueOf(item)" :currency="item.currency || currency" />
        </span>
        <span v-else>&nbsp;</span>
        <span v-if="item.deal_owner || item.lead_owner || item.assigned_to">
          <UserAvatar :email="item.deal_owner || item.lead_owner || item.assigned_to" size="sm" />
        </span>
      </div>
    </template>
  </KanbanBoard>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import CurrencyAmount from "./CurrencyAmount.vue";
  import UserAvatar from "./UserAvatar.vue";

  const { t } = useI18n();

  const props = defineProps({
    items: { type: Array, default: () => [] },
    columns: { type: Array, required: true },
    statusField: { type: String, default: "status" },
    titleField: { type: String, default: "name" },
    valueField: { type: String, default: "deal_value" },
    currency: { type: String, default: "TRY" },
    showTotal: { type: Boolean, default: true },
  });

  defineEmits(["item-click", "status-change"]);

  const grouped = computed(() => {
    const m = {};
    for (const col of props.columns) m[col.value] = [];
    for (const it of props.items) (m[it[props.statusField]] ||= []).push(it);
    return m;
  });

  function cardTitle(item) {
    if (props.titleField !== "name") return item[props.titleField] || item.name;
    if (item.lead_name) return item.lead_name;
    if (item.first_name || item.last_name)
      return [item.first_name, item.last_name].filter(Boolean).join(" ");
    return item.organization || item.name;
  }

  function valueOf(item) {
    return Number(
      item[props.valueField] ||
        item.deal_value ||
        item.expected_deal_value ||
        item.annual_revenue ||
        0
    );
  }

  function columnTotal(colValue) {
    return (grouped.value[colValue] || []).reduce((sum, it) => sum + valueOf(it), 0);
  }
</script>

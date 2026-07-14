<template>
  <div class="card overflow-hidden p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th
              v-for="col in dt.visibleColumns.value"
              :key="col.key"
              class="tbl-th"
              :style="{
                textAlign: col.align || 'left',
                minWidth: col.minWidth ? col.minWidth + 'px' : null,
                overflow: 'visible',
              }"
            >
              <div
                class="flex items-center gap-1.5"
                :class="
                  col.align === 'right'
                    ? 'justify-end'
                    : col.align === 'center'
                      ? 'justify-center'
                      : 'justify-start'
                "
              >
                <!-- Sıralama (Shift+tık → çoklu) -->
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                  :title="col.sortable ? 'Sırala (çoklu için Shift+tık)' : ''"
                  @click="col.sortable && dt.toggleSort(col.sortKey || col.key, $event.shiftKey)"
                >
                  <span>{{ col.label }}</span>
                  <template v-if="col.sortable">
                    <AppIcon
                      v-if="sortState(col.sortKey || col.key)"
                      :name="sortState(col.sortKey || col.key).desc ? 'chevron-down' : 'chevron-up'"
                      :size="13"
                      class="text-brand-800"
                    />
                    <AppIcon
                      v-else
                      name="chevrons-up-down"
                      :size="13"
                      class="text-gray-400 dark:text-gray-500"
                    />
                    <span
                      v-if="dt.sorting.value.length > 1 && sortState(col.sortKey || col.key)"
                      class="text-[10px] text-brand-800 font-semibold"
                    >
                      {{ sortState(col.sortKey || col.key).index + 1 }}
                    </span>
                  </template>
                </button>

                <!-- Sütun filtresi (funnel) — popover body'ye Teleport edilir
                     (tablo overflow'u kırpmasın diye). -->
                <button
                  v-if="col.filter"
                  type="button"
                  class="flex items-center justify-center rounded p-1"
                  :class="
                    dt.isFilterActive(col, dt.filters[col.key])
                      ? 'text-brand-800 bg-brand-50 dark:bg-brand-900/25'
                      : 'text-gray-400 dark:text-gray-400 hover:text-brand-800 dark:hover:text-brand-600'
                  "
                  title="Bu sütunu filtrele"
                  @click="toggleFilter(col, $event)"
                >
                  <AppIcon name="filter" :size="13" />
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="row in rows"
            :key="row[rowKey]"
            class="tbl-row"
            :class="{ 'cursor-pointer': clickable }"
            @click="clickable && $emit('row-click', row)"
          >
            <td
              v-for="col in dt.visibleColumns.value"
              :key="col.key"
              class="tbl-td"
              :style="{ textAlign: col.align || 'left' }"
              @click="col.key === 'action' && $event.stopPropagation()"
            >
              <slot :name="`cell-${col.key}`" :row="row" :col="col">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ListPagination
      v-if="total > 0"
      :model-value="dt.page.value"
      :total="total"
      :page-size="dt.pageSize.value"
      :page-size-options="pageSizeOptions"
      @update:model-value="dt.setPage($event)"
      @update:page-size="dt.setPageSize($event)"
    />

    <!-- Sütun filtre popover'ı — body'ye teleport (tablo overflow kırpmasın) -->
    <Teleport to="body">
      <template v-if="openCol">
        <div class="fixed inset-0 z-[60]" @click="openKey = null" />
        <div
          class="fixed z-[61] w-64 rounded-xl border border-gray-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161f] shadow-xl p-4 text-left"
          :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
        >
          <div class="mb-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">
            {{ openCol.label }}
          </div>
          <DtFilterControl
            :field="openCol"
            :model-value="dt.filters[openCol.key]"
            @update:model-value="dt.setFilter(openCol.key, $event)"
          />
          <button
            v-if="dt.isFilterActive(openCol, dt.filters[openCol.key])"
            type="button"
            class="hdr-btn-outlined w-full justify-center mt-3"
            @click="dt.setFilter(openCol.key, undefined)"
          >
            Filtreyi temizle
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import DtFilterControl from "@/components/common/datatable/DtFilterControl.vue";

  const props = defineProps({
    dt: { type: Object, required: true },
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    rowKey: { type: String, default: "name" },
    clickable: { type: Boolean, default: false },
    pageSizeOptions: { type: Array, default: () => [10, 20, 50, 100] },
  });

  defineEmits(["row-click"]);

  const openKey = ref(null);
  const panelPos = ref({ top: 0, left: 0 });
  const openCol = computed(() =>
    props.dt.visibleColumns.value.find((c) => c.key === openKey.value)
  );
  const sortState = (key) => props.dt.sortStateFor(key);

  // Funnel popover'ı tetikleyen butonun ekran konumuna göre yerleştir
  // (Teleport ile body'ye taşındığından fixed koordinat gerekiyor).
  function toggleFilter(col, e) {
    if (openKey.value === col.key) {
      openKey.value = null;
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const width = 264;
    const left =
      col.align === "right"
        ? Math.max(8, r.right - width)
        : Math.min(r.left, window.innerWidth - width - 8);
    panelPos.value = { top: r.bottom + 4, left };
    openKey.value = col.key;
  }
</script>

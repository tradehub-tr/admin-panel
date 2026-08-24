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
              :aria-sort="ariaSort(col)"
              :style="{
                textAlign: col.align || 'left',
                minWidth: col.minWidth ? col.minWidth + 'px' : null,
                overflow: 'visible',
              }"
            >
              <!-- head-<key> slot: özel başlık (ör. select-all checkbox). Fallback =
                   varsayılan sıralama/filtre başlığı → mevcut davranış korunur. -->
              <slot :name="`head-${col.key}`" :col="col">
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
                    :title="col.sortable ? t('a11y.sortHint') : ''"
                    @click="col.sortable && dt.toggleSort(col.sortKey || col.key, $event.shiftKey)"
                  >
                    <span>{{ col.label }}</span>
                    <template v-if="col.sortable">
                      <AppIcon
                        v-if="sortState(col.sortKey || col.key)"
                        :name="
                          sortState(col.sortKey || col.key).desc ? 'chevron-down' : 'chevron-up'
                        "
                        :size="13"
                        class="text-brand-800"
                      />
                      <!-- Pasif sıralama ikonu: gray-400 beyazda 2.54:1 idi — grafik
                         nesne eşiği ≥3:1 (WCAG 1.4.11), gray-500 iki temada da geçer. -->
                      <AppIcon
                        v-else
                        name="chevrons-up-down"
                        :size="13"
                        class="text-gray-500 dark:text-gray-400"
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
                        : 'text-gray-500 dark:text-gray-400 hover:text-brand-800 dark:hover:text-brand-600'
                    "
                    :aria-label="t('a11y.filterColumn', { column: col.label })"
                    :aria-expanded="openKey === col.key"
                    :aria-controls="openKey === col.key ? filterPanelId : undefined"
                    @click="toggleFilter(col, $event)"
                  >
                    <AppIcon name="filter" :size="13" />
                  </button>
                </div>
              </slot>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <!-- Satırın implicit `row` rolü KORUNUR: `<tr>`'ye role/tabindex
               basılmaz. Önceki tur klavye erişimi için `role="button"`
               vermişti; bu td'lerin `cell` rolünü, th/td başlık ilişkisini ve
               aria-sort ile kurulan tablo gezinme modelini yıkıyordu.
               Klavye yolu artık ilk hücredeki gerçek buton: "stretched link"
               deseniyle satırı kaplar (tr position:relative + overlay).
               `@click` satırda fare kolaylığı olarak kalır. -->
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
              @click="(col.key === 'action' || col.key === 'select') && $event.stopPropagation()"
            >
              <button
                v-if="clickable && col.key === rowLinkKey"
                type="button"
                class="dt-row-link"
                @click.stop="$emit('row-click', row)"
              >
                <span class="sr-only">{{ rowLinkText(row) }}</span>
              </button>
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

    <!-- Sütun filtre popover'ı — body'ye teleport (tablo overflow kırpmasın).
         Teleport odak sırasını tetikleyiciden kopardığı için katman kendi
         odak sözleşmesini kurar: role=dialog, açılışta ilk kontrole odak,
         Tab içeride döner, Esc kapatır ve odağı tetikleyiciye iade eder
         (WCAG 2.1.2 / 2.4.3 / 4.1.2). Scrim yalnız fare içindir. -->
    <Teleport to="body">
      <template v-if="openCol">
        <div class="fixed inset-0 z-[60]" aria-hidden="true" @click="closeFilter(false)" />
        <div
          :id="filterPanelId"
          ref="filterPanelRef"
          role="dialog"
          tabindex="-1"
          :aria-labelledby="filterTitleId"
          class="fixed z-[61] w-64 rounded-xl border border-gray-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161f] shadow-xl p-4 text-left"
          :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
          @keydown.esc.stop.prevent="closeFilter(true)"
          @keydown.tab="trapTabKey($event, filterPanelRef)"
        >
          <div
            :id="filterTitleId"
            class="mb-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100"
          >
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
            @click="clearFilter(openCol.key)"
          >
            {{ t("a11y.clearFilter") }}
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, computed, watch, nextTick, useId } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import DtFilterControl from "@/components/common/datatable/DtFilterControl.vue";
  import { focusablesIn, trapTabKey, restoreFocus } from "@/components/common/focusTrap";
  import { PAGE_MAIN_ID } from "@/router/pageTitle";

  const props = defineProps({
    dt: { type: Object, required: true },
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    rowKey: { type: String, default: "name" },
    clickable: { type: Boolean, default: false },
    pageSizeOptions: { type: Array, default: () => [10, 20, 50, 100] },
    /**
     * Satırı açan gizli butonun erişilebilir adı. String ya da `(row) => string`.
     * Verilmezse `a11y.openRecord` + `row[rowKey]` kullanılır — yani mevcut
     * çağıranların hiçbiri değişmeden doğru ada kavuşur (geriye uyumlu).
     */
    rowLinkLabel: { type: [String, Function], default: null },
  });

  defineEmits(["row-click"]);

  const { t } = useI18n();

  const openKey = ref(null);
  const panelPos = ref({ top: 0, left: 0 });
  const filterPanelId = useId();
  const filterTitleId = useId();
  const filterPanelRef = ref(null);
  let filterTriggerEl = null;
  const openCol = computed(() =>
    props.dt.visibleColumns.value.find((c) => c.key === openKey.value)
  );
  const sortState = (key) => props.dt.sortStateFor(key);

  // Satırı açan buton hangi hücreye konacak: seçim kutusu ve eylem menüsü
  // hücreleri kendi kontrollerini taşıdığından atlanır.
  const rowLinkKey = computed(() => {
    const cols = props.dt.visibleColumns.value;
    return (cols.find((c) => c.key !== "select" && c.key !== "action") || cols[0])?.key;
  });

  function rowLinkText(row) {
    const label = props.rowLinkLabel;
    if (typeof label === "function") return label(row);
    if (label) return label;
    return t("a11y.openRecord", { name: row?.[props.rowKey] ?? "" });
  }

  // Sıralanabilir başlığın anlık yönü ekran okuyucuya bildirilir (WCAG 1.3.1).
  // Aktif olmayan sütunda attribute hiç basılmaz.
  function ariaSort(col) {
    if (!col.sortable) return undefined;
    const s = sortState(col.sortKey || col.key);
    return s ? (s.desc ? "descending" : "ascending") : undefined;
  }

  // Funnel popover'ı tetikleyen butonun ekran konumuna göre yerleştir
  // (Teleport ile body'ye taşındığından fixed koordinat gerekiyor).
  function toggleFilter(col, e) {
    if (openKey.value === col.key) {
      closeFilter(false);
      return;
    }
    filterTriggerEl = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    const width = 264;
    const left =
      col.align === "right"
        ? Math.max(8, r.right - width)
        : Math.min(r.left, window.innerWidth - width - 8);
    panelPos.value = { top: r.bottom + 4, left };
    openKey.value = col.key;
  }

  // `restore=true` yalnız Esc/kapat düğmesi içindir; dışarı tıklamada odak
  // kullanıcının tıkladığı yerde kalmalı.
  function closeFilter(restore = false) {
    openKey.value = null;
    if (restore) restoreFocus(filterTriggerEl, document.getElementById(PAGE_MAIN_ID));
    filterTriggerEl = null;
  }

  // Temizle düğmesi filtre pasifleşince KENDİSİ kayboluyor; odak body'ye
  // düşmesin diye panelin ilk kontrolüne alınır (WCAG 2.4.3).
  async function clearFilter(key) {
    props.dt.setFilter(key, undefined);
    await nextTick();
    focusablesIn(filterPanelRef.value)[0]?.focus();
  }

  // Diyalog açılınca odak içeri girer (Teleport yüzünden Tab sırası kopuk).
  watch(openKey, async (key) => {
    if (!key) return;
    await nextTick();
    const first = focusablesIn(filterPanelRef.value)[0];
    (first || filterPanelRef.value)?.focus?.();
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  // ── Stretched link ──────────────────────────────────────────
  // Satırın kaydını açan GERÇEK buton ilk hücrede durur, mutlak konumla tüm
  // satırı kaplar. Böylece `<tr>` semantiği (row/cell) bozulmadan satır hem
  // klavyeyle hem fareyle etkinleşir; odak halkası satır boyunda çizilir.
  tbody tr.tbl-row {
    position: relative;
  }

  .dt-row-link {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: inherit;

    &:focus-visible {
      outline: 2px solid $c-info;
      outline-offset: -2px;
    }
  }

  // Hücrelerdeki gerçek kontroller (seçim kutusu, kebab, iç link) overlay'in
  // ÜSTÜNDE kalır — aksi hâlde tıklama satır açmaya giderdi. Slot içeriği
  // parent scope'unda derlendiği için `:deep` şart.
  .tbl-td :deep(a),
  .tbl-td :deep(button:not(.dt-row-link)),
  .tbl-td :deep(input),
  .tbl-td :deep(select),
  .tbl-td :deep(textarea),
  .tbl-td :deep([role="button"]) {
    position: relative;
    z-index: 1;
  }

  /* ── Mobil (≤767px): tablo kendi kabında kayar, İLK KOLON SABİT ──
     Yana kaydırırken hangi satırda olduğun (ürün/ad) kaybolmaz (L-5). */

  @media (max-width: 767px) {
    table :is(th, td):first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      background: $l-bg;
      box-shadow: 6px 0 8px -6px rgba(#000, 0.12);

      @include dark {
        background: $d-bg-card;
      }
    }

    thead th:first-child {
      background: $l-bg-soft;

      @include dark {
        background: #1a1a25;
      }
    }

    table :is(th, td) {
      padding-left: 10px;
      padding-right: 10px;
    }
  }
</style>

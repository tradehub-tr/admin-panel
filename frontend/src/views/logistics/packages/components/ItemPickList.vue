<template>
  <section class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {{ t("logistics.packing.itemsToPack") }}
      </h2>
      <span
        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
        :class="pendingCount
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'"
      >
        {{ pendingCount ? t("logistics.packing.pendingCount", { count: pendingCount }) : t("logistics.packing.allPacked") }}
      </span>
    </div>

    <p v-if="!rows.length" class="py-6 text-center text-sm text-slate-600 dark:text-slate-400">
      {{ t("logistics.item.empty") }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.row_id"
        class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="min-w-0 grow">
            <p class="truncate text-sm font-medium">{{ row.item_name }}</p>
            <p class="text-[11px] text-slate-600 dark:text-slate-400">
              {{ row.variation }}
              <template v-if="row.is_scannable">
                · <code class="font-mono">{{ row.scan_code }}</code>
              </template>
              <!-- Barkodsuz kalem: sözleşme §4.3. Kod yokken sessiz kalmak
                   operatöre "neden okutamıyorum" dedirtir. -->
              <span
                v-else
                class="ms-1 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              >
                {{ t("logistics.packing.noBarcode") }}
              </span>
            </p>
          </div>
          <span
            class="text-xs tabular-nums"
            :class="row.remaining > 0 ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'"
          >
            {{ row.packed_qty }} / {{ row.qty }} {{ row.uom }}
          </span>
        </div>

        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            class="h-full rounded-full transition-[width] duration-300"
            :class="row.remaining ? 'bg-indigo-500' : 'bg-emerald-500'"
            :style="{ width: `${row.percent}%` }"
          />
        </div>

        <!-- Miktar kutusu VARSAYILAN OLARAK KAPALI. Vakaların çoğunda kalanın
             tamamı tek koliye giriyor; her kalemde açık duran bir sayı alanı
             40 kalemlik listede 40 input demek ve asıl eylemi gölgeliyor.
             Butonun içindeki sayı ne atanacağını zaten söylüyor. -->
        <div v-if="canWrite && row.remaining > 0" class="mt-2 flex flex-wrap items-center gap-2">
          <input
            v-if="qtyOpen[row.row_id]"
            :ref="(el) => registerQtyInput(row.row_id, el)"
            :value="draftQty[row.row_id] ?? row.remaining"
            type="number"
            min="1"
            :max="row.remaining"
            class="form-input w-20 py-1 text-xs"
            :aria-label="t('logistics.packing.assignQty')"
            @input="setDraft(row.row_id, $event.target.value)"
          />
          <button
            type="button"
            class="th-btn-outline text-xs"
            :disabled="!hasPackages"
            @click="assign(row)"
          >
            {{ t("logistics.packing.toActiveQty", { qty: qtyOf(row) }) }}
          </button>
          <button type="button" class="th-btn-outline text-xs" @click="assignToNew(row)">
            {{ t("logistics.packing.toNew") }}
          </button>
          <button
            type="button"
            class="th-btn-outline text-xs"
            :aria-expanded="Boolean(qtyOpen[row.row_id])"
            :aria-label="t('logistics.packing.changeQty')"
            :title="t('logistics.packing.changeQty')"
            @click="toggleQty(row.row_id)"
          >
            <span aria-hidden="true">…</span>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
  import { computed, nextTick, ref } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Kalem listesi — B1 (miktar) yolunun arayüzü.
   *
   * Sıralama `buildItemRows`'ta: eksik kalemler ÜSTTE. Operatör "sırada ne
   * var" diye bakıyor; tamamlananların arasında kalanı aramak 40 kalemlik
   * listede zaman kaybettirir.
   */
  const props = defineProps({
    /** `buildItemRows` çıktısı. */
    rows: { type: Array, default: () => [] },
    canWrite: { type: Boolean, default: false },
    hasPackages: { type: Boolean, default: false },
  });

  const emit = defineEmits(["assign", "assign-new"]);
  const { t } = useI18n();

  /** Kalem başına girilen miktar. Boş bırakılırsa kalanın tamamı atanıyor. */
  const draftQty = ref({});
  /** Miktar kutusu açık olan kalemler — varsayılan kapalı. */
  const qtyOpen = ref({});

  const qtyInputs = new Map();

  function registerQtyInput(rowId, el) {
    if (el) qtyInputs.set(rowId, el);
    else qtyInputs.delete(rowId);
  }

  /**
   * Kutuyu açar ve odağı içine verir.
   *
   * Odak verilmezse kullanıcı "…"e bastıktan sonra bir de kutuya tıklamak
   * zorunda kalıyor — iki tıklamayla eski hâlden kötü olurdu.
   */
  function toggleQty(rowId) {
    const open = !qtyOpen.value[rowId];
    qtyOpen.value = { ...qtyOpen.value, [rowId]: open };
    if (open) nextTick(() => qtyInputs.get(rowId)?.select?.());
  }

  const pendingCount = computed(() => props.rows.filter((r) => r.remaining > 0).length);

  function setDraft(rowId, value) {
    draftQty.value = { ...draftQty.value, [rowId]: Number(value) || 0 };
  }

  function qtyOf(row) {
    const draft = draftQty.value[row.row_id];
    return Math.min(draft || row.remaining, row.remaining);
  }

  function assign(row) {
    emit("assign", { rowId: row.row_id, qty: qtyOf(row) });
    resetDraft(row.row_id);
  }

  function assignToNew(row) {
    emit("assign-new", { rowId: row.row_id, qty: qtyOf(row) });
    resetDraft(row.row_id);
  }

  /** Atama bitince miktar tüketildi: kutu kapanır, taslak sıfırlanır. */
  function resetDraft(rowId) {
    draftQty.value = { ...draftQty.value, [rowId]: undefined };
    qtyOpen.value = { ...qtyOpen.value, [rowId]: false };
  }
</script>

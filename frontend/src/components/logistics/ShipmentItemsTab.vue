<template>
  <div>
    <table v-if="items.length" class="w-full text-sm">
      <thead class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
        <tr>
          <th class="py-2">{{ t("logistics.item.product") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.ordered") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.shipped") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.remaining") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.returned") }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr v-for="item in items" :key="item.item">
          <td class="py-2">
            <div class="font-medium">{{ item.item_name }}</div>
            <code class="text-xs text-slate-400">{{ item.item }}</code>
          </td>
          <td class="py-2 text-end tabular-nums">{{ fmt(item.ordered_qty) }} {{ item.uom }}</td>
          <td class="py-2 text-end tabular-nums font-medium">{{ fmt(item.shipped_qty) }}</td>
          <!-- Kalan miktar vurgulu: TUR-106 "toplam sevk miktarı siparişi aşmaz"
               invariant'ının operasyondaki görünen yüzü -->
          <td class="py-2 text-end tabular-nums" :class="item.remaining_qty > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400'">
            {{ fmt(item.remaining_qty) }}
          </td>
          <td class="py-2 text-end tabular-nums" :class="item.returned_qty > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'">
            {{ fmt(item.returned_qty) }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="hasRemaining" class="border-t border-slate-200 dark:border-slate-700">
        <tr>
          <td colspan="5" class="pt-3 text-xs text-amber-700 dark:text-amber-400">
            {{ t("logistics.item.partialHint") }}
          </td>
        </tr>
      </tfoot>
    </table>
    <p v-else class="py-6 text-center text-sm text-slate-500">{{ t("logistics.item.empty") }}</p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /** **B3 · Ürünler sekmesi** — kalan miktar TUR-106 invariant'ının görünen yüzü. */
  const props = defineProps({ items: { type: Array, default: () => [] } });
  const { t } = useI18n();

  const hasRemaining = computed(() => props.items.some((i) => Number(i.remaining_qty) > 0));
  const fmt = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString());
</script>

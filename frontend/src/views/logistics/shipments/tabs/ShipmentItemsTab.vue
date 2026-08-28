<template>
  <div>
    <table v-if="rows.length" class="w-full text-sm">
      <thead class="border-b border-gray-200 text-left text-xs text-gray-600 dark:border-gray-700">
        <tr>
          <th class="py-2">{{ t("logistics.item.product") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.ordered") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.shipped") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.remaining") }}</th>
          <th class="py-2 text-end">{{ t("logistics.item.returned") }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr v-for="row in rows" :key="row.key">
          <td class="py-2">
            <div class="font-medium">{{ row.itemName }}</div>
            <code class="text-xs text-gray-600">{{ row.item }}</code>
          </td>
          <td class="py-2 text-end tabular-nums">{{ row.orderedLabel }}</td>
          <td class="py-2 text-end tabular-nums font-medium">{{ row.shippedLabel }}</td>
          <!-- Kalan miktar vurgulu: TUR-106 "toplam sevk miktarı siparişi aşmaz"
               invariant'ının operasyondaki görünen yüzü. Vurgu YALNIZ miktar
               BİLİNİYOR ve sıfırdan büyükken açılır; bilinmiyorsa hücre "—"
               gösterir — "0" basıp vurguyu söndürmek invariant'ı sessizce
               kapatıyordu (QA denetimi 2026-08-28). -->
          <td class="py-2 text-end tabular-nums" :class="row.remainingClass">
            {{ row.remainingLabel }}
          </td>
          <td class="py-2 text-end tabular-nums" :class="row.returnedClass">
            {{ row.returnedLabel }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="hasRemaining" class="border-t border-gray-200 dark:border-gray-700">
        <tr>
          <td colspan="5" class="pt-3 text-xs text-amber-700 dark:text-amber-400">
            {{ t("logistics.item.partialHint") }}
          </td>
        </tr>
      </tfoot>
    </table>
    <p v-else class="py-6 text-center text-sm text-gray-600">{{ t("logistics.item.empty") }}</p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { formatQty, toFiniteNumber } from "@/utils/format";

  /**
   * **B3 · Ürünler sekmesi** — kalan miktar TUR-106 invariant'ının görünen yüzü.
   *
   * Biçimleme `utils/format.js`ten (`formatQty`): yerel kopya boş/maskelenmiş
   * miktarı "0", `"abc"`i "NaN" basıyordu ve locale'i tarayıcıya bırakıyordu.
   *
   * Satırlar `computed` ile ÖN-BİÇİMLENDİRİLİYOR: template'ten fonksiyon
   * çağırmak her render'da tüm hücreleri yeniden biçimlerdi
   * (`.claude/rules/vue-reactivity.md` §2).
   */
  const props = defineProps({ items: { type: Array, default: () => [] } });
  const { t } = useI18n();

  const MUTED_CLASS = "text-gray-600 dark:text-gray-400";

  const rows = computed(() =>
    props.items.map((item) => {
      const remaining = toFiniteNumber(item.remaining_qty);
      const returned = toFiniteNumber(item.returned_qty);
      const ordered = formatQty(item.ordered_qty);
      const hasRemainingQty = remaining !== null && remaining > 0;
      return {
        key: item.item,
        item: item.item,
        itemName: item.item_name,
        hasRemainingQty,
        // Birim yalnız miktarla BİRLİKTE anlamlı: boş uom'da " Adet" değil,
        // eksik miktarda "— Adet" değil sade "—" basılır.
        orderedLabel: item.uom && ordered !== "—" ? `${ordered} ${item.uom}` : ordered,
        shippedLabel: formatQty(item.shipped_qty),
        remainingLabel: formatQty(item.remaining_qty),
        remainingClass: hasRemainingQty
          ? "text-amber-700 dark:text-amber-400 font-medium"
          : MUTED_CLASS,
        returnedLabel: formatQty(item.returned_qty),
        returnedClass:
          returned !== null && returned > 0 ? "text-red-600 dark:text-red-400" : MUTED_CLASS,
      };
    })
  );

  const hasRemaining = computed(() => rows.value.some((r) => r.hasRemainingQty));
</script>

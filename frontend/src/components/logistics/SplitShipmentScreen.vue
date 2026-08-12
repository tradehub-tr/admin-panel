<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.split.title", { order: orderName }) }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.split.subtitle", { count: shipments.length }) }}
      </p>
    </header>

    <!-- TUR-106 kabul kriteri: "Toplam sevk miktarı sipariş miktarını AŞMAZ."
         İhlal varsa sessiz kalmak yerine en üstte uyarı. -->
    <div
      v-if="overShipped.length"
      class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
      role="alert"
    >
      {{ t("logistics.split.overShipped", { items: overShipped.join(", ") }) }}
    </div>

    <!-- Sipariş kalemleri: ne kadarı sevk edildi, ne kadarı kaldı -->
    <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h2 class="mb-3 text-sm font-semibold">{{ t("logistics.split.orderItems") }}</h2>
      <div v-for="line in itemSummary" :key="line.item" class="mb-3 last:mb-0">
        <div class="flex items-baseline justify-between text-sm">
          <span class="font-medium">{{ line.item_name }}</span>
          <span class="tabular-nums text-xs text-slate-500">
            {{ line.shipped }} / {{ line.ordered }} {{ line.uom }}
          </span>
        </div>
        <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            class="h-full rounded-full"
            :class="line.shipped > line.ordered ? 'bg-red-500' : 'bg-indigo-500'"
            :style="{ width: `${Math.min(100, (line.shipped / line.ordered) * 100)}%` }"
          />
        </div>
      </div>
    </section>

    <!-- Sevkiyatlar: her satıcı YALNIZ kendi grubunu görür (TUR-106 AC) -->
    <section class="space-y-2">
      <h2 class="text-sm font-semibold">{{ t("logistics.split.shipments") }}</h2>
      <article
        v-for="shipment in shipments"
        :key="shipment.name"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
      >
        <code class="font-mono text-sm font-medium">{{ shipment.name }}</code>
        <StatusBadge :status="shipment.status" />
        <span class="text-xs text-slate-500">{{ shipment.carrier || t("logistics.shipment.noCarrier") }}</span>
        <span class="text-xs text-slate-500">{{ shipment.package_count }} {{ t("logistics.split.packages") }}</span>
        <button type="button" class="th-btn-outline ms-auto text-xs" @click="$emit('open', shipment)">
          {{ t("logistics.split.open") }}
        </button>
      </article>
    </section>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import StatusBadge from "./StatusBadge.vue";

  /**
   * **B9 · Bölünmüş sevkiyat görünümü** (TUR-106).
   *
   * Bir sipariş birden fazla sevkiyata bölündüğünde kalan miktarın
   * takibi kritik. TUR-106 kabul kriteri "toplam sevk miktarı sipariş
   * miktarını aşmaz" diyor — ihlal varsa ekran sessiz kalmıyor, en üstte
   * uyarı gösteriyor. Sessizce doğru görünmek en tehlikeli hata.
   */
  const props = defineProps({
    orderName: { type: String, required: true },
    shipments: { type: Array, default: () => [] },
  });
  defineEmits(["open"]);

  const { t } = useI18n();

  /** Sevkiyatlardaki kalemleri sipariş bazında toplar. */
  const itemSummary = computed(() => {
    const acc = new Map();
    for (const shipment of props.shipments) {
      for (const item of shipment.items ?? []) {
        const existing = acc.get(item.item) ?? {
          item: item.item,
          item_name: item.item_name,
          uom: item.uom,
          ordered: Number(item.ordered_qty) || 0,
          shipped: 0,
        };
        existing.shipped += Number(item.shipped_qty) || 0;
        acc.set(item.item, existing);
      }
    }
    return [...acc.values()];
  });

  const overShipped = computed(() =>
    itemSummary.value.filter((l) => l.shipped > l.ordered).map((l) => l.item_name)
  );
</script>

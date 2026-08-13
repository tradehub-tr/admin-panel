<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.packing.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.packing.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-outline text-sm" @click="$emit('add-package')">
        {{ t("logistics.packing.addPackage") }}
      </button>
    </header>

    <!-- TUR-114 değişmezi: paketlenmemiş kalem kalmışsa sevkiyat eksik.
         Bu uyarı en üstte, çünkü paketleri tamamlamış görünen bir ekranda
         alta gizlenmiş "3 kalem kaldı" satırı fark edilmez. -->
    <div
      v-if="unpacked.length"
      class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
      role="alert"
    >
      {{ t("logistics.packing.unpackedWarning", { count: unpacked.length }) }}
    </div>
    <div
      v-else
      class="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
    >
      {{ t("logistics.packing.allPacked") }}
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Sol: paketlenecek kalemler -->
      <section class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.packing.itemsToPack") }}</h2>
        <ul v-if="itemRows.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <li v-for="row in itemRows" :key="row.item" class="p-3">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <span class="text-sm font-medium">{{ row.item_name }}</span>
              <span class="text-xs tabular-nums" :class="row.remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'">
                {{ row.packed }} / {{ row.shipped_qty }} {{ row.uom }}
              </span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${row.percent}%` }" />
            </div>
            <button
              v-if="can.write && row.remaining > 0"
              type="button"
              class="th-btn-outline mt-2 text-xs"
              @click="$emit('assign-item', { item: row.item, qty: row.remaining })"
            >
              {{ t("logistics.packing.assignRemaining", { qty: row.remaining }) }}
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">{{ t("logistics.item.empty") }}</p>
      </section>

      <!-- Sağ: paketler -->
      <section class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.packing.packages") }}</h2>
        <ul v-if="packages.length" class="space-y-2">
          <li
            v-for="pkg in packages"
            :key="pkg.package_code"
            class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">
                {{ pkg.sequence_label }}
              </span>
              <code class="font-mono text-xs">{{ pkg.package_code }}</code>
              <span class="text-xs text-slate-500">{{ pkg.package_type }}</span>
              <span class="ms-auto text-xs tabular-nums text-slate-500">
                {{ pkg.weight_kg }} kg · {{ t("logistics.package.desi") }} {{ pkg.desi }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ pkg.length_cm }}×{{ pkg.width_cm }}×{{ pkg.height_cm }} cm
            </p>
            <div v-if="can.write" class="mt-2 flex gap-2">
              <button type="button" class="th-btn-outline text-xs" @click="$emit('edit-package', pkg)">
                {{ t("logistics.legOps.edit") }}
              </button>
              <button type="button" class="th-btn-outline text-xs" @click="$emit('remove-package', pkg)">
                {{ t("logistics.packing.removePackage") }}
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">{{ t("logistics.package.empty") }}</p>

        <!-- X/Y numaralandırması sözleşmeye göre paket sayısıyla tutarlı
             olmalı; bozulursa kargo şubesinde eksik koli aranır. -->
        <p v-if="sequenceMismatch" class="text-xs text-red-600 dark:text-red-400" role="alert">
          {{ t("logistics.packing.sequenceMismatch") }}
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **G1 · Paketleme çalışma alanı** (TUR-114).
   *
   * İki sütun: sevk edilecek kalemler ve oluşturulan paketler. Kalemlerin
   * ne kadarının paketlendiği yüzde çubuğuyla; paketlenmemiş kalem kalmışsa
   * en ÜSTTE uyarı — alta gizlenmiş bir "3 kalem kaldı" satırı fark edilmez.
   *
   * Kalem→paket dağılımı `packedQuantities` ile dışarıdan geliyor; sözleşmede
   * paket-kalem bağı henüz yok (Faz F), ekran onu uydurmuyor.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    items: { type: Array, default: () => [] },
    packages: { type: Array, default: () => [] },
    /** `{ "LST-00121": 8 }` — kalem başına paketlenmiş miktar. */
    packedQuantities: { type: Object, default: () => ({}) },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["add-package", "edit-package", "remove-package", "assign-item"]);

  const { t } = useI18n();

  const itemRows = computed(() =>
    props.items.map((item) => {
      const shipped = Number(item.shipped_qty) || 0;
      const packed = Number(props.packedQuantities[item.item] ?? 0);
      return {
        ...item,
        packed,
        remaining: Math.max(0, shipped - packed),
        percent: shipped ? Math.min(100, (packed / shipped) * 100) : 0,
      };
    })
  );

  const unpacked = computed(() => itemRows.value.filter((row) => row.remaining > 0));

  /** "2/5" etiketindeki toplam, gerçek paket sayısıyla uyuşmalı. */
  const sequenceMismatch = computed(() =>
    props.packages.some((pkg) => {
      const total = Number(String(pkg.sequence_label).split("/")[1]);
      return Number.isFinite(total) && total !== props.packages.length;
    })
  );
</script>

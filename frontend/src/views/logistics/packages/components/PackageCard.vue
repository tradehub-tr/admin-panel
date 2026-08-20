<template>
  <article
    class="rounded-lg border p-3 transition-colors"
    :class="[
      isActive ? 'border-amber-400 ring-2 ring-amber-200 dark:ring-amber-900/40' : 'border-slate-200 dark:border-slate-700',
      hasWarning && !isActive ? 'border-amber-300 dark:border-amber-800' : '',
    ]"
  >
    <button
      type="button"
      class="flex w-full flex-wrap items-center gap-2 text-start"
      :aria-pressed="isActive"
      @click="$emit('activate')"
    >
      <span class="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        {{ pkg.sequence_label }}
      </span>
      <code v-if="pkg.package_code" class="font-mono text-xs font-semibold">{{ pkg.package_code }}</code>
      <span v-else class="text-xs italic text-slate-600 dark:text-slate-400">{{ t("logistics.packing.unsavedPackage") }}</span>
      <span class="ms-auto text-[11px] text-slate-600 dark:text-slate-400">{{ typeLabel }}</span>
    </button>

    <div class="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs">
      <span class="tabular-nums text-slate-600 dark:text-slate-400">
        {{ pkg.length_cm }}×{{ pkg.width_cm }}×{{ pkg.height_cm }} cm
      </span>
      <span class="tabular-nums">
        <b>{{ pkg.weight_kg }} kg</b> ·
        {{ t("logistics.package.desi") }}
        <b :class="pkg.is_desi_dominant ? 'text-amber-700 dark:text-amber-400' : ''">{{ pkg.desi }}</b>
      </span>
    </div>

    <!-- Desi ağırlıktan büyükse ücreti O belirliyor. Operasyon hangisinin
         belirleyici olduğunu görmeli — fatura ona göre geliyor. -->
    <p v-if="pkg.is_desi_dominant" class="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
      {{ t("logistics.package.desiDominant", { kg: pkg.chargeable_kg }) }}
    </p>

    <p
      v-for="warning in warnings"
      :key="warning.code"
      class="mt-1 text-[11px] text-amber-700 dark:text-amber-400"
    >
      ⚠ {{ warning.message }}
    </p>

    <div class="mt-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
      <p v-if="!contentLines.length" class="text-red-700 dark:text-red-400">
        {{ t("logistics.packing.emptyPackage") }}
      </p>
      <ul v-else class="space-y-0.5">
        <li v-for="line in contentLines" :key="line.rowId" class="flex items-center justify-between gap-2">
          <span class="truncate text-slate-600 dark:text-slate-300">{{ line.name }}</span>
          <span class="flex items-center gap-1.5">
            <span class="tabular-nums text-slate-600 dark:text-slate-400">{{ line.qty }} {{ line.uom }}</span>
            <button
              v-if="canWrite"
              type="button"
              class="text-slate-600 dark:text-slate-400 transition-colors hover:text-red-500"
              :aria-label="t('logistics.packing.removeContent', { item: line.name })"
              @click="$emit('unassign', line.rowId)"
            >
              ×
            </button>
          </span>
        </li>
      </ul>
    </div>

    <!-- "Düzenle" birincil eylem — ölçü ve tip girmek kartın asıl işi.
         Çoğalt ve sil aynı ağırlıkta durunca üçü de aynı öneme sahip
         görünüyordu; 20 kolilik sevkiyatta bu 60 buton eder. -->
    <div v-if="canWrite" class="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" class="th-btn-outline text-xs" @click="$emit('edit')">
        {{ t("logistics.legOps.edit") }}
      </button>
      <PopMenu :label="t('logistics.packing.moreActions')" class="ms-auto">
        <button type="button" class="menu-item" role="menuitem" @click="$emit('duplicate')">
          {{ t("logistics.packing.duplicate") }}
        </button>
        <button type="button" class="menu-item" role="menuitem" @click="$emit('remove')">
          {{ t("logistics.packing.removePackage") }}
        </button>
      </PopMenu>
    </div>
  </article>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import PopMenu from "./PopMenu.vue";

  /**
   * Koli kartı — çalışma alanının orta sütunu.
   *
   * Uyarılar DIŞARIDAN geliyor (`findings`): doğrulama motoru tek otorite,
   * kart kendi kuralını uydurmuyor. Aksi hâlde kart ile özet paneli farklı
   * şeyler söyleyebilirdi.
   */
  const props = defineProps({
    /** `decoratePackages` çıktısındaki satır. */
    pkg: { type: Object, required: true },
    /** Sevkiyat kalemleri — içerik satırlarının adını çözmek için. */
    items: { type: Array, default: () => [] },
    /** Bu koliye ait doğrulama bulguları. */
    findings: { type: Array, default: () => [] },
    isActive: { type: Boolean, default: false },
    canWrite: { type: Boolean, default: false },
    packageTypes: { type: Array, default: () => [] },
  });

  defineEmits(["activate", "edit", "duplicate", "remove", "unassign"]);
  const { t } = useI18n();

  const typeLabel = computed(() => {
    const type = props.packageTypes.find((x) => x.name === props.pkg.package_type);
    return type?.package_name ?? props.pkg.package_type ?? "";
  });

  const warnings = computed(() => props.findings.filter((f) => f.level === "warning"));
  const hasWarning = computed(() => warnings.value.length > 0);

  const contentLines = computed(() =>
    (props.pkg.contents ?? []).map((c) => {
      const item = props.items.find((i) => i.row_id === c.shipment_item);
      return {
        rowId: c.shipment_item,
        name: item?.item_name ?? c.shipment_item,
        uom: item?.uom ?? "",
        qty: c.qty,
      };
    })
  );
</script>

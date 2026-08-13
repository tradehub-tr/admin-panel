<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.statusMapping.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.statusMapping.subtitle") }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-primary text-sm" @click="$emit('create')">
        {{ t("logistics.statusMapping.new") }}
      </button>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <template v-else>
      <!-- KAPSAM UYARISI: eşlemesi olmayan iç durum, o taşıyıcıdan gelen
           olayın hiçbir zaman o duruma çevrilemeyeceği anlamına gelir.
           TUR-112 "kaynak olay standart duruma izlenebilir biçimde
           çevrilir" kriteri ancak kapsam tamsa sağlanır. -->
      <div
        v-if="uncoveredStatuses.length"
        class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        role="alert"
      >
        <p class="font-medium">{{ t("logistics.statusMapping.gapTitle", { carrier: carrier }) }}</p>
        <p class="mt-1">{{ uncoveredStatuses.map(statusLabel).join(", ") }}</p>
      </div>

      <div v-else class="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        {{ t("logistics.statusMapping.fullCoverage", { carrier: carrier }) }}
      </div>

      <p v-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
        {{ t("logistics.statusMapping.empty") }}
      </p>

      <!-- İç duruma göre gruplanmış: "hangi taşıyıcı kodu bu duruma
           düşüyor" sorusu, düz listede tarayarak cevaplanamaz. -->
      <section v-for="group in grouped" v-else :key="group.status" class="space-y-2">
        <div class="flex items-center gap-2">
          <StatusBadge :status="group.status" :show-dot="false" />
          <span class="text-xs text-slate-500">
            {{ t("logistics.statusMapping.codeCount", { count: group.items.length }) }}
          </span>
        </div>

        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <li v-for="row in group.items" :key="row.name" class="flex flex-wrap items-center gap-3 p-3 text-sm">
            <code class="min-w-16 font-mono text-xs font-semibold">{{ row.carrier_status_code }}</code>
            <span class="min-w-0 grow text-slate-600 dark:text-slate-300">{{ row.carrier_status_text || "—" }}</span>

            <!-- Bir eşleme hem duruma hem istisnaya bağlanabilir: "teslim
                 edilemedi" hem Failed hem RECIPIENT_ABSENT demektir. -->
            <span
              v-if="row.exception_code"
              class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            >
              {{ row.exception_code }}
            </span>

            <button v-if="can.write" type="button" class="th-btn-outline text-xs" @click="$emit('edit', row)">
              {{ t("logistics.legOps.edit") }}
            </button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { SHIPMENT_STATUS_TONE } from "./constants";

  /**
   * **F4 · Durum eşleme yönetimi** (TUR-111, TUR-112).
   *
   * Jenerik katalog ekranı (M1) bu kaydı da listeleyebilir; bu ekran onun
   * yerine değil, ÜSTÜNE bir soru cevaplıyor: *kapsam tam mı?* Eşlemesi
   * olmayan bir iç durum, taşıyıcıdan gelen hiçbir olayın o duruma
   * çevrilemeyeceği anlamına gelir — düz listede görünmez.
   */
  const props = defineProps({
    carrier: { type: String, required: true },
    /** `carrier_status_mapping` katalog satırları. */
    rows: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "edit", "retry"]);

  const { t, te } = useI18n();

  /**
   * Taşıyıcıdan olay olarak GELMESİ beklenmeyen durumlar kapsam dışı:
   * Draft ve Cancelled iç akışta oluşur, kargo firması bildirmez.
   */
  const NOT_EXPECTED_FROM_CARRIER = ["Draft", "Cancelled"];

  const grouped = computed(() => {
    const byStatus = new Map();
    for (const row of props.rows) {
      if (!byStatus.has(row.internal_status)) byStatus.set(row.internal_status, []);
      byStatus.get(row.internal_status).push(row);
    }
    return Object.keys(SHIPMENT_STATUS_TONE)
      .filter((status) => byStatus.has(status))
      .map((status) => ({ status, items: byStatus.get(status) }));
  });

  const uncoveredStatuses = computed(() => {
    const covered = new Set(props.rows.map((row) => row.internal_status));
    return Object.keys(SHIPMENT_STATUS_TONE).filter(
      (status) => !covered.has(status) && !NOT_EXPECTED_FROM_CARRIER.includes(status)
    );
  });

  function statusLabel(status) {
    const key = `logistics.status.${status}`;
    return te(key) ? t(key) : status;
  }
</script>

<template>
  <div>
    <!-- Page Header — panel deseni (DocTypeListView ile aynı) -->
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.statusMapping.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.statusMapping.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Oluşturma `create` iznine bakar, `write`a değil — catalogCan ikisini
             ayrı veriyor ve backend de create'i ayrıca soruyor. -->
        <button v-if="can.create" type="button" class="hdr-btn-primary" @click="$emit('create')">
          <AppIcon name="plus" :size="14" />
          <span>{{ t("logistics.statusMapping.new") }}</span>
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Veri gelene kadar boş tablo göstermek "eşleme yok" diye okunuyordu;
         kapsam uyarısı da erken hesaplanıp yanlış çıkıyordu. (Ali, 13-FE) -->
    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="6" />
    </div>

    <template v-else>
      <!-- KAPSAM UYARISI: eşlemesi olmayan iç durum, o taşıyıcıdan gelen
           olayın hiçbir zaman o duruma çevrilemeyeceği anlamına gelir.
           TUR-112 "kaynak olay standart duruma izlenebilir biçimde
           çevrilir" kriteri ancak kapsam tamsa sağlanır. -->
      <div
        class="rounded p-3 mb-5 text-xs border flex items-start gap-2"
        :class="
          hasGap
            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
        "
        :role="hasGap ? 'alert' : null"
      >
        <AppIcon
          :name="hasGap ? 'triangle-alert' : 'info'"
          :size="14"
          class="mt-0.5 shrink-0"
          :class="
            hasGap ? 'text-amber-700 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
          "
        />
        <div class="min-w-0">
          <p :class="hasGap ? 'font-bold' : ''">
            {{
              hasGap
                ? t("logistics.statusMapping.gapTitle", { carrier })
                : t("logistics.statusMapping.fullCoverage", { carrier })
            }}
          </p>

          <div v-if="hasGap" class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge
              v-for="status in uncoveredStatuses"
              :key="status"
              :status="status"
              :show-dot="false"
            />
          </div>

          <!-- Kapsam dışı bırakılan durumlar ham enum (`Draft`) olarak değil,
               `StatusBadge` üzerinden `logistics.status.*` çevirisiyle. -->
          <div class="mt-2 flex flex-wrap items-center gap-1.5 opacity-80">
            <span v-if="notExpectedText">{{ notExpectedText }}</span>
            <StatusBadge
              v-for="status in NOT_EXPECTED_FROM_CARRIER"
              :key="status"
              :status="status"
              :show-dot="false"
            />
          </div>
        </div>
      </div>

      <EmptyState
        v-if="!rows.length"
        :filtered="false"
        :entity="t('logistics.catalogEntity.carrier_status_mapping')"
      />

      <!-- İç duruma göre gruplanmış: "hangi taşıyıcı kodu bu duruma
           düşüyor" sorusu, düz listede tarayarak cevaplanamaz. -->
      <section v-for="group in grouped" v-else :key="group.status" class="mb-5">
        <div class="flex items-center gap-2 mb-2">
          <StatusBadge :status="group.status" :show-dot="false" />
          <span class="text-xs text-gray-600 dark:text-gray-400">
            {{ t("logistics.statusMapping.codeCount", { count: group.items.length }) }}
          </span>
        </div>

        <div class="card p-0 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th w-40">{{ t("logistics.field.carrier_status_code") }}</th>
                <th class="tbl-th">{{ t("logistics.field.carrier_status_text") }}</th>
                <th class="tbl-th w-48">{{ t("logistics.field.exception_code") }}</th>
                <th class="tbl-th w-28"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in group.items"
                :key="row.name"
                class="tbl-row border-b border-gray-50 dark:border-white/5"
              >
                <td class="tbl-td font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {{ row.carrier_status_code }}
                </td>
                <td class="tbl-td text-gray-700 dark:text-gray-300">
                  {{ row.carrier_status_text || "—" }}
                </td>
                <td class="tbl-td">
                  <!-- Bir eşleme hem duruma hem istisnaya bağlanabilir: "teslim
                       edilemedi" hem Failed hem RECIPIENT_ABSENT demektir. -->
                  <span
                    v-if="row.exception_code"
                    class="badge bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    {{ row.exception_code }}
                  </span>
                  <span v-else class="text-gray-600 dark:text-gray-400">—</span>
                </td>
                <td class="tbl-td text-right">
                  <button
                    v-if="can.write"
                    type="button"
                    class="hdr-btn-outlined"
                    @click="$emit('edit', row)"
                  >
                    <AppIcon name="pencil" :size="14" />
                    <span>{{ t("logistics.legOps.edit") }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
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
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /**
     * KATALOG izni (`store.catalogCan("carrier_status_mapping")`), sevkiyat
     * capability'si DEĞİL. Şekil `{read, write, create, delete}`; bu ekran
     * yalnız `write` okuyor, o yüzden fazlası zararsız.
     */
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "edit", "retry"]);

  const { t, te } = useI18n();

  /**
   * Taşıyıcıdan olay olarak GELMESİ beklenmeyen durumlar kapsam dışı:
   * Draft ve Cancelled iç akışta oluşur, kargo firması bildirmez.
   */
  const NOT_EXPECTED_FROM_CARRIER = ["Draft", "Cancelled"];

  /** Açıklama cümlesi; anahtar yoksa yalnız rozetler kalır (ham İngilizce yok). */
  const NOT_EXPECTED_KEY = "logistics.statusMapping.notExpected";
  const notExpectedText = computed(() => (te(NOT_EXPECTED_KEY) ? t(NOT_EXPECTED_KEY) : ""));

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

  const hasGap = computed(() => uncoveredStatuses.value.length > 0);
</script>

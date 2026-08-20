<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.pod.queue.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.queue.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="store.asSeller" class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {{ t("logistics.delivery.ownRecords") }}
        </span>
        <button type="button" class="hdr-btn-outlined list-iconify" @click="load">
          <AppIcon name="refresh-cw" :size="14" />
          <span>{{ t("logistics.queue.refresh") }}</span>
        </button>
      </div>
    </div>

    <!-- Kovalar ve liste AYNI yanıttan (sözleşme §2.1): ayrı sayaç isteği
         liste yerleştikten sonra dönüp listeyi kaydırıyordu. -->
    <StatusFilterPills
      v-model="bucketModel"
      :options="bucketOptions"
      wrapper-class="flex items-center gap-2 flex-wrap mb-4"
    />

    <div class="card mb-5 !p-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-0 lg:min-w-[200px]">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 pointer-events-none"
          />
          <input
            v-model="searchDraft"
            type="search"
            :placeholder="t('logistics.pod.queue.searchPlaceholder')"
            class="form-input-sm !pl-9"
            @keyup.enter="load"
          />
        </div>
        <!-- Taşıyıcı listesi SABİT DEĞİL, gelen satırlardan türetiliyor. -->
        <AppSelect v-model="carrierFilter" :options="carrierOptions" class="lg:min-w-[170px]" />
        <!-- Satıcı süzgeci satıcı rolünde HİÇ ÇİZİLMİYOR: kendi kayıtlarını
             görüyor, "tüm satıcılar" seçeneği anlamsız olurdu. -->
        <AppSelect
          v-if="!store.asSeller"
          v-model="sellerFilter"
          :options="sellerOptions"
          class="lg:min-w-[170px]"
        />
      </div>
    </div>

    <ErrorState v-if="queue.error" :error="queue.error" @retry="load" />

    <div v-else-if="queue.loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="6" />
    </div>

    <!-- "Kayıt yok" ile "bu filtrede yok" AYRI cümleler kuruyor. -->
    <div v-else-if="!queue.rows.length" class="card p-8 text-center">
      <p class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
        {{ isFiltered ? t("logistics.pod.queue.emptyFiltered") : t("logistics.pod.queue.emptyNone") }}
      </p>
      <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {{ isFiltered ? t("logistics.pod.queue.emptyFilteredHint") : t("logistics.pod.queue.emptyNoneHint") }}
      </p>
      <button v-if="isFiltered" type="button" class="hdr-btn-outlined mt-4" @click="clearFilters">
        {{ t("logistics.pod.queue.clearFilters") }}
      </button>
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr>
            <th class="tbl-th">{{ t("logistics.pod.queue.colShipment") }}</th>
            <th class="tbl-th">{{ t("logistics.pod.queue.colBuyer") }}</th>
            <th v-if="!store.asSeller" class="tbl-th">{{ t("logistics.pod.queue.colSeller") }}</th>
            <th class="tbl-th">{{ t("logistics.pod.queue.colCarrier") }}</th>
            <th class="tbl-th">{{ t("logistics.pod.fields.deliveredAt") }}</th>
            <th class="tbl-th">{{ t("logistics.pod.detail.evidence") }}</th>
            <th class="tbl-th"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in queue.rows"
            :key="row.shipment"
            class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <td class="tbl-td font-mono text-[12px]">{{ row.shipment }}</td>
            <td class="tbl-td">{{ row.buyer_name }}</td>
            <td v-if="!store.asSeller" class="tbl-td">{{ row.seller_name }}</td>
            <td class="tbl-td">{{ row.carrier || t("logistics.pod.queue.noCarrier") }}</td>
            <td class="tbl-td">
              {{ row.actual_delivery }}
              <!-- 24 saati aşan bekleme vurgulanıyor; süre SUNUCUDAN geliyor. -->
              <span
                v-if="row.hours_since != null && row.hours_since > WARN_HOURS && row.bucket === 'awaiting'"
                class="block text-[11px] font-semibold text-amber-700 dark:text-amber-300"
              >
                {{ t("logistics.pod.queue.waitingHours", { hours: row.hours_since }) }}
              </span>
            </td>
            <td class="tbl-td">
              <span :class="bucketClass(row.bucket)">{{ t(`logistics.pod.bucket.${row.bucket}`) }}</span>
              <!-- Kaç kolinin eksik olduğu LİSTEDEN okunuyor; detaya girmeye
                   gerek kalmıyor. -->
              <span
                v-if="row.total_package_count && row.delivered_package_count < row.total_package_count"
                class="ms-1 text-[11px] text-red-600 dark:text-red-400"
              >
                {{ row.delivered_package_count }}/{{ row.total_package_count }}
              </span>
            </td>
            <td class="tbl-td text-right">
              <RouterLink
                :to="{ name: POD_ROUTE, params: { name: row.shipment } }"
                class="text-[12px] text-brand-800 dark:text-brand-400 hover:underline"
              >
                {{ t("logistics.pod.queue.openDetail") }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { RouterLink } from "vue-router";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { DWELL_WARN_HOURS as WARN_HOURS } from "@/utils/stationTimeline";
  import { usePodStore } from "@/stores/pod";

  const { t } = useI18n();
  /** Route adı SABİT — "ulaşılmaz ekran" denetimi çift tırnaklı ad arıyor. */
  const POD_ROUTE = "LogisticsProofOfDelivery";

  const store = usePodStore();
  const { queue, filters } = storeToRefs(store);

  const searchDraft = ref("");
  const carrierFilter = ref("");
  const sellerFilter = ref("");

  const bucketModel = computed({
    get: () => filters.value.bucket ?? "",
    set: (v) => store.setBucket(v || null),
  });

  const bucketOptions = computed(() => [
    { value: "", label: t("logistics.pod.queue.allBuckets"), count: queue.value.total },
    ...queue.value.buckets.map((b) => ({
      value: b.key,
      label: t(`logistics.pod.bucket.${b.key}`),
      count: b.count,
      title: t(`logistics.pod.bucket.${b.key}Hint`),
    })),
  ]);

  /** Seçim listeleri gelen veriden türetiliyor — sabit dizi değil. */
  const carrierOptions = computed(() => [
    { value: "", label: t("logistics.pod.queue.allCarriers") },
    ...[...new Set(queue.value.rows.map((r) => r.carrier).filter(Boolean))].map((c) => ({ value: c, label: c })),
  ]);
  const sellerOptions = computed(() => [
    { value: "", label: t("logistics.pod.queue.allSellers") },
    ...[...new Set(queue.value.rows.map((r) => r.seller_name).filter(Boolean))].map((s) => ({ value: s, label: s })),
  ]);

  const isFiltered = computed(
    () => !!(filters.value.bucket || filters.value.search || filters.value.carrier || filters.value.seller)
  );

  const BUCKET_CLASS = {
    awaiting: "px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    discrepancy: "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    seller_claim: "px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    done: "px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  };
  const bucketClass = (b) => BUCKET_CLASS[b] ?? BUCKET_CLASS.awaiting;

  function load() {
    store.ensurePermissions();
    filters.value.search = searchDraft.value;
    filters.value.carrier = carrierFilter.value || null;
    filters.value.seller = sellerFilter.value || null;
    return store.fetchQueue();
  }

  function clearFilters() {
    searchDraft.value = "";
    carrierFilter.value = "";
    sellerFilter.value = "";
    return store.fetchQueue({ reset: true });
  }

  watch([carrierFilter, sellerFilter], load);
  onMounted(load);
</script>

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
        <!-- Mobilde görünüm seçimi YOK — dar ekranda tablo da pano da
             okunmuyor, `useResponsiveViewMode` kompakt listeye zorluyor. -->
        <ViewModeToggle
          v-model="viewMode"
          :modes="['table', 'grid', 'kanban', 'list']"
          class="hidden lg:flex"
        />
        <button type="button" class="hdr-btn-outlined list-iconify" @click="load">
          <AppIcon name="refresh-cw" :size="14" />
          <span>{{ t("logistics.queue.refresh") }}</span>
        </button>
      </div>
    </div>

    <!-- Kovalar ve liste AYNI yanıttan (sözleşme §2.1): ayrı sayaç isteği
         liste yerleştikten sonra dönüp listeyi kaydırıyordu. -->
    <!-- Panoda GİZLİ: pano zaten dört kovayı birden gösteriyor. İkisi yan
         yana dururken hangisinin geçerli olduğu okunmuyor. -->
    <StatusFilterPills
      v-if="!isKanban"
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
            class="form-input-sm !pl-9 w-full"
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

    <template v-else>
      <!-- ══ PANO ══ Dört kovayı birden gösterir: "bugün ne kadar iş var"
           sorusu tek bakışta cevaplanır. Süzgeç tek kova gösterirken pano
           dağılımı gösteriyor — ikisi farklı soru. -->
      <template v-if="isKanban">
        <p
          class="mb-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
        >
          <AppIcon name="lock" :size="12" />
          {{ t("logistics.pod.queue.kanbanReadonly") }}
        </p>

        <!-- SESSİZ KIRPMA YASAK. Bu ekranda sayfalama yok, ama sunucu kendi
             üst sınırını uygulayabilir; `total` ile gelen satır sayısı
             ayrışırsa kullanıcı panoyu "hepsi bu" diye okumamalı. -->
        <p
          v-if="kanbanTruncated"
          class="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          role="status"
        >
          {{ t("logistics.pod.queue.kanbanTruncated", { shown: queue.rows.length, total: queue.total }) }}
        </p>

        <div class="list-kanban">
          <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
            <div class="kanban-col-header">
              <span>{{ col.label }}</span>
              <span class="kanban-col-count">{{ col.rows.length }}</span>
            </div>
            <div class="kanban-col-body">
              <!-- Kart SÜRÜKLENMİYOR: kova sevkiyatın verisinden hesaplanıyor
                   (kanıt var mı, tutarsızlık var mı). Başka sütuna sürüklemek
                   kanıt kaydetmez; kart bir sonraki yüklemede eski yerine
                   döner ve kullanıcı işi yaptığını sanır. Tıklama detaya gider. -->
              <RouterLink
                v-for="row in col.rows"
                :key="row.shipment"
                :to="{ name: POD_ROUTE, params: { name: row.shipment } }"
                class="kanban-card block w-full text-start"
              >
                <span class="kanban-card-title block font-mono">{{ row.shipment }}</span>
                <span class="block truncate">{{ row.buyer_name }}</span>
                <span class="kanban-card-meta mt-1 block truncate">
                  {{ row.carrier || t("logistics.pod.queue.noCarrier") }}
                </span>
                <span
                  v-if="bekliyorMu(row)"
                  class="mt-1 block text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  {{ t("logistics.pod.queue.waitingHours", { hours: row.hours_since }) }}
                </span>
                <span v-else-if="eksikKoli(row)" class="mt-1 block text-[11px] text-red-600 dark:text-red-400">
                  {{ row.delivered_package_count }}/{{ row.total_package_count }}
                </span>
              </RouterLink>
              <p
                v-if="!col.rows.length"
                class="px-2 py-6 text-center text-[11px] italic text-gray-600 dark:text-gray-400"
              >
                {{ t("logistics.pod.queue.kanbanEmptyColumn") }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <!-- ══ KART ══ Dar pencerede tablonun yatay kaymasını bitirir. -->
      <div v-else-if="viewMode === 'grid'" class="list-grid !p-0">
        <RouterLink
          v-for="row in queue.rows"
          :key="row.shipment"
          :to="{ name: POD_ROUTE, params: { name: row.shipment } }"
          class="list-grid-card block"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <span class="font-mono text-[12px] font-semibold">{{ row.shipment }}</span>
            <span :class="bucketClass(row.bucket)">{{ t(`logistics.pod.bucket.${row.bucket}`) }}</span>
          </div>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pod.queue.colBuyer") }}</dt>
            <dd class="truncate font-medium">{{ row.buyer_name }}</dd>
            <template v-if="!store.asSeller">
              <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pod.queue.colSeller") }}</dt>
              <dd class="truncate font-medium">{{ row.seller_name }}</dd>
            </template>
            <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pod.queue.colCarrier") }}</dt>
            <dd class="truncate font-medium">{{ row.carrier || t("logistics.pod.queue.noCarrier") }}</dd>
            <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.deliveredAt") }}</dt>
            <dd class="font-medium">{{ row.actual_delivery }}</dd>
          </dl>
          <p
            v-if="bekliyorMu(row)"
            class="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
          >
            {{ t("logistics.pod.queue.waitingHours", { hours: row.hours_since }) }}
          </p>
          <p v-else-if="eksikKoli(row)" class="mt-2 text-[11px] text-red-600 dark:text-red-400">
            {{ row.delivered_package_count }}/{{ row.total_package_count }}
          </p>
        </RouterLink>
      </div>

      <!-- ══ LİSTE ══ Dar ekranda zorunlu olan kompakt görünüm. -->
      <div v-else-if="viewMode === 'list'" class="card !p-0 overflow-hidden">
        <RouterLink
          v-for="row in queue.rows"
          :key="row.shipment"
          :to="{ name: POD_ROUTE, params: { name: row.shipment } }"
          class="flex items-start justify-between gap-3 border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          <div class="min-w-0">
            <span class="block font-mono text-[12px] font-semibold">{{ row.shipment }}</span>
            <span class="block truncate text-[13px]">{{ row.buyer_name }}</span>
            <span
              v-if="bekliyorMu(row)"
              class="block text-[11px] font-semibold text-amber-700 dark:text-amber-300"
            >
              {{ t("logistics.pod.queue.waitingHours", { hours: row.hours_since }) }}
            </span>
            <span v-else-if="eksikKoli(row)" class="block text-[11px] text-red-600 dark:text-red-400">
              {{ row.delivered_package_count }}/{{ row.total_package_count }}
            </span>
          </div>
          <span :class="bucketClass(row.bucket)">{{ t(`logistics.pod.bucket.${row.bucket}`) }}</span>
        </RouterLink>
      </div>

      <!-- ══ TABLO ══ Varsayılan: en yoğun bilgi, sütun karşılaştırması. -->
      <div v-else class="card !p-0 overflow-x-auto">
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
    </template>
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
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useResponsiveViewMode } from "@/composables/useResponsiveViewMode.js";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { DWELL_WARN_HOURS as WARN_HOURS } from "@/utils/stationTimeline";
  import { usePodStore } from "@/stores/pod";

  const { t } = useI18n();
  /** Route adı SABİT — "ulaşılmaz ekran" denetimi çift tırnaklı ad arıyor. */
  const POD_ROUTE = "LogisticsProofOfDelivery";

  const store = usePodStore();
  const { queue, filters } = storeToRefs(store);

  // Mod EKRANIN KENDİ state'i değil: mobilde kompakt listeye zorlama ve
  // masaüstü tercihinin hatırlanması ortak composable'da çözülü. Üçüncü
  // parametre kalıcılık anahtarı — yalnız MASAÜSTÜNDE seçilen mod diske
  // yazılıyor, telefonda zorlanan liste yazılmıyor.
  const { viewMode } = useResponsiveViewMode("table", "list", "logistics-pod-queue");
  const isKanban = computed(() => viewMode.value === "kanban");

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

  /**
   * Pano sütunları. Kovalar `queue.buckets`'tan, kartlar `queue.rows`'tan —
   * ikisi de AYNI yanıttan geliyor (sözleşme §2.1). Sütun listesi ayrı bir
   * sabit dizi DEĞİL: sunucu bir kova eklerse pano kendiliğinden gösterir.
   */
  const kanbanColumns = computed(() =>
    queue.value.buckets.map((b) => ({
      key: b.key,
      label: t(`logistics.pod.bucket.${b.key}`),
      rows: queue.value.rows.filter((r) => r.bucket === b.key),
    }))
  );

  /**
   * Panonun eksik kayıtla açılması. Bu ekranda sayfalama yok — ama sunucu
   * kendi üst sınırını uygularsa `total` ile gelen satır sayısı ayrışır.
   * Sessizce kırpmak panoyu "hepsi bu" diye okutur.
   */
  const kanbanTruncated = computed(() => queue.value.total > queue.value.rows.length);

  /** 24 saati aşan kanıt beklemesi — süre SUNUCUDAN geliyor, burada hesaplanmıyor. */
  const bekliyorMu = (row) =>
    row.hours_since != null && row.hours_since > WARN_HOURS && row.bucket === "awaiting";

  const eksikKoli = (row) =>
    !!row.total_package_count && row.delivered_package_count < row.total_package_count;

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

  // Panoya geçerken seçili kova TEMİZLENİYOR: süzgeç gizlendiği için
  // kullanıcı onu kaldıramaz ve pano tek kovayı gösterip dördünü
  // gösteriyormuş gibi durur.
  watch(isKanban, (pano) => {
    if (pano && filters.value.bucket) store.setBucket(null);
  });
  onMounted(load);
</script>

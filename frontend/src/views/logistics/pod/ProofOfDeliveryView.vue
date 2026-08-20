<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.pod.detail.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400 font-mono">{{ shipment }}</p>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink
          :to="{ name: 'LogisticsShipmentDetail', params: { name: shipment } }"
          class="hdr-btn-outlined"
        >
          {{ t("logistics.pod.detail.openShipment") }}
        </RouterLink>
        <!-- Düzeltme yetkisi yoksa buton HİÇ çizilmiyor: satıcı kendi
             beyanını sessizce değiştirebilirdi. -->
        <button
          v-if="store.hasPod && store.can.amend && !editing"
          type="button"
          class="hdr-btn-primary"
          @click="editing = 'amend'"
        >
          {{ t("logistics.pod.record.amendTitle") }}
        </button>
      </div>
    </div>

    <ErrorState v-if="detail.error && !detail.saving" :error="detail.error" @retry="load" />

    <div v-else-if="detail.loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="5" />
    </div>

    <template v-else>
      <!-- KANIT YOK: hata ekranı DEĞİL. Bu bir eksik veridir ve ekranın işi
           tek çıkış yolunu göstermek — "kanıt kaydet". -->
      <div v-if="!store.hasPod && !editing" class="card p-8 text-center">
        <p class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
          {{ isDelivered ? t("logistics.pod.detail.noneTitle") : t("logistics.pod.detail.notDelivered") }}
        </p>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {{ isDelivered ? t("logistics.pod.detail.noneHint") : t("logistics.pod.detail.notDeliveredHint") }}
        </p>
        <button v-if="isDelivered" type="button" class="hdr-btn-primary mt-4" @click="editing = 'record'">
          {{ t("logistics.pod.record.title") }}
        </button>
      </div>

      <PodRecordDrawer
        v-else-if="editing"
        :shipment="shipment"
        :amend="editing === 'amend'"
        :initial="editing === 'amend' ? detail.pod : null"
        :exception-codes="store.exceptionCodes"
        :server-errors="serverFieldErrors"
        :saving="detail.saving"
        :default-total-packages="defaultTotal"
        @cancel="editing = null"
        @submit="save"
      />

      <div v-else class="space-y-4">
        <PodEvidenceCard :pod="detail.pod" :media-visible="detail.mediaVisible" :exception-codes="store.exceptionCodes" />

        <!-- Düzeltme İZ BIRAKIYOR: kayıt silinmiyor, denetim izi görünür. -->
        <div v-if="audit.length" class="card !p-4">
          <h2 class="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {{ t("logistics.pod.detail.auditTitle") }}
          </h2>
          <ul class="space-y-1.5">
            <li v-for="(a, i) in audit" :key="i" class="text-xs text-gray-600 dark:text-gray-400">
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {{ a.action === "amend" ? t("logistics.pod.detail.auditAmend") : t("logistics.pod.detail.auditRecord") }}
              </span>
              · {{ a.at }} · {{ a.by }}
              <template v-if="a.reason"> — {{ a.reason }}</template>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { RouterLink, useRoute } from "vue-router";
  import { storeToRefs } from "pinia";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { useToast } from "@/composables/useToast";
  import { usePodStore } from "@/stores/pod";

  import PodEvidenceCard from "./components/PodEvidenceCard.vue";
  import PodRecordDrawer from "./components/PodRecordDrawer.vue";

  const { t } = useI18n();
  const route = useRoute();
  const toast = useToast();
  const store = usePodStore();
  const { detail, audit } = storeToRefs(store);

  const shipment = computed(() => String(route.params.name ?? ""));
  /** null | "record" | "amend" */
  const editing = ref(null);

  const isDelivered = computed(() => detail.value.shipmentStatus === "Delivered");
  const defaultTotal = computed(() => Number(detail.value.pod?.total_package_count ?? 1));

  /** Sunucudan gelen alan bazlı hatalar forma iniyor — tek genel mesaj değil. */
  const serverFieldErrors = computed(() => detail.value.error?.details?.fields ?? null);

  async function load() {
    // Yetki gelmeden `can.amend` false döner ve düzeltme düğmesi çizilmez.
    await store.ensurePermissions().catch(() => {});
    await store.fetchPod(shipment.value);
    await store.loadExceptionCodes();
    if (store.hasPod) await store.fetchAudit(shipment.value);
  }

  async function save(payload) {
    const duzeltme = editing.value === "amend";
    try {
      await (duzeltme ? store.amendPod(payload) : store.recordPod(payload));
      toast.success(t(duzeltme ? "logistics.pod.record.amended" : "logistics.pod.record.saved"));
      editing.value = null;
      await store.fetchAudit(shipment.value);
    } catch (e) {
      // Alan bazlı hata formda kalıyor; genel hata toast'a düşüyor.
      if (!e?.details?.fields) toast.error(e.message);
    }
  }

  watch(shipment, load);
  onMounted(load);
</script>

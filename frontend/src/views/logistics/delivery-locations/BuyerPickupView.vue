<template>
  <!-- D2 · Alıcı teslim alma. K-K: ödeme alınmamışsa "Teslim et" düğmesi
       HİÇ RENDER EDİLMEZ — devre dışı da değil, yok. Uyarıya rağmen
       tıklanabilen buton günün sonunda tıklanır. Kapı sunucuda da var. -->
  <div>
    <DeliveryFlowScreen
      v-model:search="search"
      v-model:status="status"
      v-model:appointment="appointment"
      :title="t('logistics.delivery.buyer.title')"
      :subtitle="t('logistics.delivery.buyer.subtitle')"
      :empty-title="t('logistics.delivery.buyer.empty')"
      :surface="surface"
      :as-seller="store.asSeller"
      @refresh="load"
    >
      <template #row-detail="{ row }">
        <dl class="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.delivery.pickupPerson") }}</dt>
            <dd class="text-[13px] text-gray-900 dark:text-gray-100">{{ row.pickup_person || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.delivery.point.title") }}</dt>
            <dd class="text-[13px]">
              <button
                v-if="row.pickup_location"
                type="button"
                class="text-brand-600 dark:text-brand-400 hover:underline"
                @click="openBranch(row.pickup_location)"
              >
                {{ row.pickup_location }}
              </button>
              <span v-else class="text-gray-900 dark:text-gray-100">—</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.pod.fields.totalPackages") }}</dt>
            <dd class="text-[13px] text-gray-900 dark:text-gray-100">{{ row.package_count ?? "—" }}</dd>
          </div>
        </dl>
      </template>

      <template #row-actions="{ row }">
        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <!-- ÖDEME KAPISI: buton çizilmiyor, yerine durum şeridi. -->
          <div
            v-if="isPaymentBlocked(row)"
            class="flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 p-2 w-full"
          >
            <AppIcon name="triangle-alert" :size="14" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p class="text-[13px] font-semibold text-red-700 dark:text-red-300">
                {{ t("logistics.delivery.payment.blocked") }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.payment.blockedHint") }}</p>
            </div>
          </div>

          <button
            v-else-if="row.status !== 'Delivered' && store.can.handOver"
            type="button"
            class="hdr-btn-primary"
            @click="openHandOver(row)"
          >
            {{ t("logistics.delivery.handOver") }}
          </button>
        </div>
      </template>
    </DeliveryFlowScreen>

    <DeliveryPointCard v-if="branch" :branch="branch" class="mt-4" />

    <!-- Teslim formu — kod istenip istenmediği kaydın durumundan geliyor. -->
    <div v-if="handOverRow" class="card !p-4 mt-4 space-y-3">
      <h2 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ t("logistics.delivery.handOverTitle") }}
        <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ handOverRow.shipment }}</span>
      </h2>

      <div v-if="needsCode" class="max-w-xs">
        <label class="form-label" for="handover-code">{{ t("logistics.delivery.deliveryCode") }} *</label>
        <input id="handover-code" v-model="codeInput" type="text" inputmode="numeric" class="form-input" />
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.delivery.deliveryCodeHint") }}</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 max-w-xl">
        <div>
          <label class="form-label" for="handover-received">{{ t("logistics.pod.fields.receivedBy") }} *</label>
          <input id="handover-received" v-model="receivedBy" type="text" class="form-input" />
        </div>
        <div>
          <label class="form-label" for="handover-title">{{ t("logistics.pod.fields.receivedByTitle") }} *</label>
          <AppSelect id="handover-title" v-model="receivedByTitle" :options="titleOptions" />
        </div>
      </div>

      <p v-if="handOverError" class="text-xs text-red-600 dark:text-red-400">{{ handOverError }}</p>

      <div class="flex items-center gap-2">
        <button type="button" class="hdr-btn-primary" :disabled="handingOver || !canSubmit" @click="submitHandOver">
          {{ t("logistics.delivery.handOverSubmit") }}
        </button>
        <button type="button" class="hdr-btn-outlined" @click="closeHandOver">
          {{ t("logistics.pod.record.cancel") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import { useToast } from "@/composables/useToast";
  import { usePodStore } from "@/stores/pod";

  import DeliveryFlowScreen from "./components/DeliveryFlowScreen.vue";
  import DeliveryPointCard from "./components/DeliveryPointCard.vue";

  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const store = usePodStore();

  const search = ref("");
  const status = ref("");
  const appointment = ref("");
  const branch = ref(null);

  const surface = computed(() => store.flows.buyer_pickup);

  /** Ödeme kapısı — buton bu koşulda HİÇ çizilmiyor (K-K). */
  const isPaymentBlocked = (row) => !!row.payment_required_before_delivery && row.payment_status === "unpaid";

  const handOverRow = ref(null);
  const codeInput = ref("");
  const receivedBy = ref("");
  const receivedByTitle = ref("");
  const handingOver = ref(false);
  const handOverError = ref("");

  const needsCode = computed(
    () => !!handOverRow.value?.delivery_code_required && handOverRow.value.delivery_code_status !== "verified"
  );
  const canSubmit = computed(
    () => !!receivedBy.value.trim() && !!receivedByTitle.value && (!needsCode.value || !!codeInput.value.trim())
  );

  const titleOptions = computed(() =>
    ["purchasing", "warehouse", "driver", "authorized", "other"].map((k) => ({
      value: t(`logistics.pod.title.${k}`),
      label: t(`logistics.pod.title.${k}`),
    }))
  );

  function openHandOver(row) {
    handOverRow.value = row;
    codeInput.value = "";
    receivedBy.value = row.pickup_person ?? "";
    receivedByTitle.value = "";
    handOverError.value = "";
  }

  function closeHandOver() {
    handOverRow.value = null;
  }

  /**
   * Teslim başarılı olunca POD kaydına yönlendiriliyor: teslim aksiyonu POD'u
   * DOĞURUYOR (K-F), iki iş ayrılamaz. Kullanıcıyı kuyruğa bırakmak "şimdi ne
   * yapacağım" sorusunu doğururdu.
   */
  async function submitHandOver() {
    handingOver.value = true;
    handOverError.value = "";
    try {
      const sonuc = await store.handOver({
        shipment: handOverRow.value.shipment,
        delivery_code: needsCode.value ? codeInput.value : null,
        received_by: receivedBy.value,
        received_by_title: receivedByTitle.value,
      });
      toast.success(t("logistics.delivery.handedOver"));
      closeHandOver();
      if (sonuc.pod_required) {
        toast.info(t("logistics.delivery.podNext"));
        router.push({ name: "LogisticsProofOfDelivery", params: { name: sonuc.shipment } });
      }
    } catch (e) {
      handOverError.value = e.message;
      await load();
    } finally {
      handingOver.value = false;
    }
  }

  async function openBranch(name) {
    branch.value = await store.loadBranch(name);
  }

  let searchTimer;

  const load = () => {
    // Enter/yenile anında geldiyse bekleyen debounce iptal — çift istek atma.
    clearTimeout(searchTimer);
    store.ensurePermissions().catch(() => {});
    return store.fetchFlow("buyer_pickup", {
      search: search.value || null,
      status: status.value || null,
      appointment: appointment.value || null,
    });
  };

  // ÖLÜ ARAMA düzeltmesi (tam denetim 2026-08-20): `search` watch'ta yoktu —
  // aramaya yazılan hiçbir fetch tetiklemiyordu, kutu yalnız Enter'la
  // çalışıyordu. CatalogListScreen `params-change` deseniyle aynı: arama
  // 400 ms debounce'la gider (her tuşta istek atılmaz), süzgeçler anında.
  watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 400);
  });
  watch([status, appointment], load);
  onMounted(load);
  onUnmounted(() => clearTimeout(searchTimer));
</script>

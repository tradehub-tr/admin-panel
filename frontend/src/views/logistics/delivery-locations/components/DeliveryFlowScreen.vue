<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">{{ title }}</h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- K-M: satıcı bu ekranı GÖRÜYOR ve kendi kayıtlarını görüyor.
             Rozet, listenin neden kısa olduğunu söylüyor. -->
        <span v-if="asSeller" class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {{ t("logistics.delivery.ownRecords") }}
        </span>
        <button type="button" class="hdr-btn-outlined list-iconify" @click="$emit('refresh')">
          <AppIcon name="refresh-cw" :size="14" />
          <span>{{ t("logistics.queue.refresh") }}</span>
        </button>
      </div>
    </div>

    <div class="card mb-5 !p-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-0 lg:min-w-[200px]">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            :value="search"
            type="search"
            :placeholder="t('logistics.delivery.searchPlaceholder')"
            class="form-input-sm !pl-9"
            @input="$emit('update:search', $event.target.value)"
            @keyup.enter="$emit('refresh')"
          />
        </div>
        <!-- Durum listesi gelen satırlardan türetiliyor — sabit dizi değil. -->
        <AppSelect
          :model-value="status"
          :options="statusOptions"
          class="lg:min-w-[170px]"
          @update:model-value="$emit('update:status', $event)"
        />
        <AppSelect
          :model-value="appointment"
          :options="appointmentOptions"
          class="lg:min-w-[170px]"
          @update:model-value="$emit('update:appointment', $event)"
        />
      </div>
    </div>

    <ErrorState v-if="surface.error" :error="surface.error" @retry="$emit('refresh')" />

    <div v-else-if="surface.loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="4" />
    </div>

    <div v-else-if="!surface.rows.length" class="card p-8 text-center">
      <p class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
        {{ isFiltered ? t("logistics.delivery.emptyFiltered") : emptyTitle }}
      </p>
      <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.delivery.emptyHint") }}</p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="row in surface.rows"
        :key="row.shipment"
        class="card !p-4"
        :class="rowTone(row)"
      >
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <p class="font-mono text-[12px] text-gray-500 dark:text-gray-400">{{ row.shipment }}</p>
            <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{{ row.buyer_name }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ row.order }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.delivery.appointment") }}</p>
            <p
              class="text-[13px]"
              :class="row.overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'"
            >
              <template v-if="row.appointment_at">
                {{ row.appointment_at }}
                <span v-if="row.appointment_window"> · {{ row.appointment_window }}</span>
                <span v-if="row.overdue"> · {{ t("logistics.delivery.overdue") }}</span>
              </template>
              <template v-else>{{ t("logistics.delivery.noAppointment") }}</template>
            </p>
          </div>
        </div>

        <slot name="row-detail" :row="row" />

        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <!-- Teslim kodunun DEĞERİ hiçbir yerde gösterilmiyor; yalnız durum
               ve başarısız deneme sayısı. Panelde göstermek kodu tek
               kullanımlık olmaktan çıkarırdı. -->
          <span :class="codeClass(row)">{{ t(`logistics.delivery.code.${row.delivery_code_status}`) }}</span>
          <span v-if="row.delivery_code_attempts > 0" class="text-xs font-semibold text-red-600 dark:text-red-400">
            {{ t("logistics.delivery.code.attempts", { count: row.delivery_code_attempts }) }}
          </span>
          <span :class="paymentClass(row)">{{ t(`logistics.delivery.payment.${row.payment_status}`) }}</span>
        </div>

        <slot name="row-actions" :row="row" />
      </article>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";

  const props = defineProps({
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    emptyTitle: { type: String, required: true },
    /** `store.flows[flowType]` — kendi yükleniyor/hata durumunu taşıyor. */
    surface: { type: Object, required: true },
    asSeller: { type: Boolean, default: false },
    search: { type: String, default: "" },
    status: { type: String, default: "" },
    appointment: { type: String, default: "" },
  });
  defineEmits(["refresh", "update:search", "update:status", "update:appointment"]);

  const { t } = useI18n();

  const statusOptions = computed(() => [
    { value: "", label: t("logistics.delivery.allStatuses") },
    ...[...new Set(props.surface.rows.map((r) => r.status).filter(Boolean))].map((s) => ({ value: s, label: s })),
  ]);

  const appointmentOptions = computed(() => [
    { value: "", label: t("logistics.delivery.allAppointments") },
    { value: "overdue", label: t("logistics.delivery.appointmentOverdue") },
    { value: "none", label: t("logistics.delivery.appointmentNone") },
  ]);

  const isFiltered = computed(() => !!(props.search || props.status || props.appointment));

  /** Randevusu geçmiş kayıt kırmızı, eksik atama amber — renk bilgi taşıyor. */
  function rowTone(row) {
    if (row.overdue) return "border-red-300 dark:border-red-500/40";
    if (row.shipment_type === "Seller Delivery" && (!row.driver_name || !row.vehicle_plate))
      return "border-amber-300 dark:border-amber-500/40";
    return "";
  }

  const CODE_CLASS = {
    verified: "px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    pending: "px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    failed: "px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    not_required: "px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  };
  const codeClass = (row) => CODE_CLASS[row.delivery_code_status] ?? CODE_CLASS.not_required;

  const PAY_CLASS = {
    paid: "px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    unpaid: "px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    waived: "px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  };
  const paymentClass = (row) => PAY_CLASS[row.payment_status] ?? PAY_CLASS.waived;
</script>

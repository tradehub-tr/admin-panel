<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.sellerDelivery.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.sellerDelivery.subtitle") }}
        </p>
      </div>
      <button
        v-if="can.write"
        type="button"
        class="ms-auto th-btn-outline text-sm"
        @click="$emit('override')"
      >
        {{ t("logistics.sellerDelivery.override") }}
      </button>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="96px" />
    </div>

    <p v-else-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.sellerDelivery.empty") }}
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="row in rows"
        :key="row.name"
        class="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="font-mono text-sm font-medium underline-offset-2 hover:underline" @click="$emit('open', row)">
            {{ row.name }}
          </button>
          <StatusBadge :status="row.status" />
          <span class="text-xs text-slate-500">{{ row.order }}</span>

          <!-- Randevu, teslimatın en kırılgan bilgisi: geçmiş bir randevu
               hâlâ "Yolda" durumundaysa operasyon müdahale etmeli. -->
          <span
            v-if="row.appointment_at"
            class="ms-auto rounded px-2 py-0.5 text-xs font-medium"
            :class="appointmentClass(row)"
          >
            {{ formatDateTime(row.appointment_at) }}
            <template v-if="row.appointment_window"> · {{ row.appointment_window }}</template>
          </span>
          <span v-else class="ms-auto text-xs text-amber-600 dark:text-amber-400">
            {{ t("logistics.sellerDelivery.noAppointment") }}
          </span>
        </div>

        <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs text-slate-500">{{ t("logistics.sellerDelivery.driver") }}</dt>
            <dd :class="row.driver_name ? '' : 'text-amber-600 dark:text-amber-400'">
              {{ row.driver_name || t("logistics.sellerDelivery.unassigned") }}
              <span v-if="row.driver_phone" class="block text-xs text-slate-500">{{ row.driver_phone }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">{{ t("logistics.sellerDelivery.plate") }}</dt>
            <dd class="font-mono" :class="row.vehicle_plate ? '' : 'text-amber-600 dark:text-amber-400'">
              {{ row.vehicle_plate || t("logistics.sellerDelivery.unassigned") }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">{{ t("logistics.sellerDelivery.deliveryCode") }}</dt>
            <dd>
              <!-- Kodun DEĞERİ hiç gelmiyor (sözleşme): yalnız durumu.
                   Teslim kodunu panelde göstermek onu tek kullanımlık
                   olmaktan çıkarırdı. -->
              <StatusBadge
                :status="row.delivery_code_status"
                :tone="DELIVERY_CODE_TONE[row.delivery_code_status]"
                :label="t(`logistics.deliveryCode.${row.delivery_code_status}`)"
                :show-dot="false"
              />
              <span
                v-if="row.delivery_code_attempts > 0"
                class="ms-2 text-xs text-red-600 dark:text-red-400"
              >
                {{ t("logistics.sellerDelivery.failedAttempts", { count: row.delivery_code_attempts }) }}
              </span>
            </dd>
          </div>
        </dl>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { DELIVERY_CODE_TONE } from "./constants";

  /**
   * **D1 · Satıcı teslimatı izleme + override** (TUR-108).
   *
   * Satıcı kendi aracıyla teslim ediyor: taşıyıcı ve takip numarası yok,
   * yerine sürücü/plaka/randevu var. Atanmamış alanlar sarı — çünkü
   * teslimat günü gelip sürücü atanmamışsa bu bir eksiklik, "boş veri" değil.
   *
   * Teslim kodunun DEĞERİ hiçbir zaman ekrana gelmiyor; sözleşme yalnız
   * `delivery_code_status` döndürüyor.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
    /** "Şu an" — geçmiş randevuyu işaretlemek için. Test edilebilirlik açısından props. */
    now: { type: String, default: "" },
  });

  defineEmits(["open", "override", "retry"]);

  const { t } = useI18n();

  const TERMINAL_FOR_APPOINTMENT = ["Delivered", "Returned", "Cancelled", "Failed"];

  function appointmentClass(row) {
    const missed =
      props.now &&
      row.appointment_at < props.now &&
      !TERMINAL_FOR_APPOINTMENT.includes(row.status);
    return missed
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

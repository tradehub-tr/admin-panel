<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.pickup.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.pickup.subtitle") }}</p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 3" :key="i" variant="rect" height="110px" />
    </div>

    <p v-else-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.pickup.empty") }}
    </p>

    <ul v-else class="space-y-3">
      <li v-for="row in rows" :key="row.name" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="font-mono text-sm font-medium underline-offset-2 hover:underline" @click="$emit('open', row)">
            {{ row.name }}
          </button>
          <StatusBadge :status="row.status" />
          <span class="text-xs text-slate-500">{{ row.pickup_location || t("logistics.pickup.noLocation") }}</span>
          <span v-if="row.appointment_at" class="ms-auto text-xs text-slate-500">
            {{ formatDateTime(row.appointment_at) }}
            <template v-if="row.appointment_window"> · {{ row.appointment_window }}</template>
          </span>
        </div>

        <!-- ÖDEME KAPISI: TUR-108 "ödeme şartlı teslimde ödeme yapılmadan
             teslim edilemez". Bu satır uyarı değil, kapı — teslim butonu
             ödeme tamamlanana kadar hiç render edilmiyor. -->
        <div
          v-if="row.payment_required_before_delivery"
          class="mt-3 flex flex-wrap items-center gap-2 rounded p-2 text-sm"
          :class="paymentBlocked(row)
            ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'"
          role="status"
        >
          <StatusBadge
            :status="row.payment_status"
            :tone="PAYMENT_STATUS_TONE[row.payment_status]"
            :label="t(`logistics.paymentStatus.${row.payment_status}`)"
            :show-dot="false"
          />
          <span>
            {{ paymentBlocked(row) ? t("logistics.pickup.paymentBlocked") : t("logistics.pickup.paymentCleared") }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <div class="text-sm">
            <span class="text-xs text-slate-500">{{ t("logistics.sellerDelivery.deliveryCode") }}: </span>
            <StatusBadge
              :status="row.delivery_code_status"
              :tone="DELIVERY_CODE_TONE[row.delivery_code_status]"
              :label="t(`logistics.deliveryCode.${row.delivery_code_status}`)"
              :show-dot="false"
            />
          </div>

          <!-- Teslim kanıtı yalnız teslim edilmiş kayıtlarda anlamlı -->
          <button
            v-if="row.status === 'Delivered'"
            type="button"
            class="th-btn-outline text-xs"
            @click="$emit('view-pod', row)"
          >
            {{ t("logistics.pickup.viewPod") }}
          </button>

          <button
            v-if="can.write && canHandOver(row)"
            type="button"
            class="th-btn-primary ms-auto text-xs"
            @click="$emit('hand-over', row)"
          >
            {{ t("logistics.pickup.handOver") }}
          </button>
          <span v-else-if="can.write && row.status !== 'Delivered'" class="ms-auto text-xs text-slate-500">
            {{ t("logistics.pickup.handOverBlocked") }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { DELIVERY_CODE_TONE, PAYMENT_STATUS_TONE } from "./constants";

  /**
   * **D2 · Alıcı teslim alma izleme** (TUR-108).
   *
   * Ödeme şartlı teslimde ekran "uyarı gösterip yine de izin verme" yolunu
   * seçmiyor: teslim butonu ödeme tamamlanana kadar HİÇ render edilmiyor.
   * Uyarıya rağmen tıklanabilen bir buton, günün sonunda tıklanır.
   */
  defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["open", "hand-over", "view-pod", "retry"]);

  const { t } = useI18n();

  function paymentBlocked(row) {
    return row.payment_required_before_delivery && row.payment_status !== "paid" && row.payment_status !== "waived";
  }

  function canHandOver(row) {
    if (row.status !== "Ready for Pickup") return false;
    if (paymentBlocked(row)) return false;
    // Kod isteniyorsa doğrulanmadan teslim yok (TUR-108)
    return row.delivery_code_status !== "pending" && row.delivery_code_status !== "failed";
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }
</script>

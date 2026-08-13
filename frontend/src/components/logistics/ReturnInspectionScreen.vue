<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.inspection.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.inspection.subtitle", { request: request.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div
      v-else-if="request.is_closed"
      class="rounded border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
    >
      {{ t("logistics.inspection.closedBlocked") }}
    </div>

    <template v-else>
      <!-- Eksik gelen kalem, depo kontrolünün asıl yakaladığı durum:
           alıcı 3 gönderdiğini söylüyor, depoya 2 ulaşıyor. En üstte,
           çünkü para iadesi tutarı buna göre kısılıyor. -->
      <div
        v-if="shortReceipts.length"
        class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        role="alert"
      >
        {{ t("logistics.inspection.shortReceipt", { items: shortReceipts.join(", ") }) }}
      </div>

      <ul class="space-y-3">
        <li v-for="row in rows" :key="row.item" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium">{{ row.item_name }}</span>
            <StatusBadge
              v-if="row.inspection_result"
              :status="row.inspection_result"
              :tone="INSPECTION_RESULT_TONE[row.inspection_result]"
              :label="t(`logistics.inspectionResult.${row.inspection_result}`)"
              :show-dot="false"
            />
            <span class="ms-auto text-xs tabular-nums text-slate-500">
              {{ t("logistics.inspection.unitRefund") }}: {{ money(row.unit_refund) }}
            </span>
          </div>

          <!-- Üç miktar yan yana: istenen → ulaşan → kabul edilen.
               Aradaki her düşüş bir sebep gerektiriyor. -->
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <div class="rounded border border-slate-100 p-2 dark:border-slate-800">
              <p class="text-xs text-slate-500">{{ t("logistics.inspection.requested") }}</p>
              <p class="mt-0.5 text-sm font-medium tabular-nums">{{ row.requested_qty }} {{ row.uom }}</p>
            </div>
            <label class="block rounded border border-slate-100 p-2 dark:border-slate-800">
              <span class="block text-xs text-slate-500">{{ t("logistics.inspection.received") }}</span>
              <input
                :value="row.received_qty"
                type="number"
                min="0"
                :max="row.requested_qty"
                class="form-input mt-0.5"
                :disabled="!can.write"
                @input="update(row.item, 'received_qty', $event.target.value)"
              />
            </label>
            <label class="block rounded border border-slate-100 p-2 dark:border-slate-800">
              <span class="block text-xs text-slate-500">{{ t("logistics.inspection.accepted") }}</span>
              <input
                :value="row.accepted_qty"
                type="number"
                min="0"
                :max="row.received_qty ?? row.requested_qty"
                class="form-input mt-0.5"
                :class="row.acceptedExceedsReceived ? 'border-red-400' : ''"
                :disabled="!can.write"
                @input="update(row.item, 'accepted_qty', $event.target.value)"
              />
            </label>
          </div>

          <!-- Kabul edilen, ulaşandan fazla olamaz — sessiz geçilirse
               para iadesi olmayan mal için ödenir. -->
          <p v-if="row.acceptedExceedsReceived" class="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {{ t("logistics.inspection.acceptedExceeds") }}
          </p>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">{{ t("logistics.inspection.result") }}</span>
              <AppSelect
                :model-value="row.inspection_result"
                :options="resultOptions"
                :disabled="!can.write"
                @update:model-value="update(row.item, 'inspection_result', $event)"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">
                {{ t("logistics.inspection.note") }}
                <template v-if="row.noteRequired"> *</template>
              </span>
              <input
                :value="row.inspection_note"
                type="text"
                class="form-input"
                :class="row.noteMissing ? 'border-red-400' : ''"
                :disabled="!can.write"
                @input="update(row.item, 'inspection_note', $event.target.value)"
              />
            </label>
          </div>
          <!-- "ok" dışı her sonuç bir açıklama istiyor: "hasarlı" tek
               başına ne alıcıya ne muhasebeye yeter. -->
          <p v-if="row.noteMissing" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ t("logistics.inspection.noteRequired") }}
          </p>
        </li>
      </ul>

      <!-- Hesaplanan iade tutarı: kabul edilen × birim. Operatörün elle
           tutar girmesi yerine türetiliyor ki kalem kararlarıyla tutarsız
           bir rakam oluşmasın. -->
      <div class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <span class="text-sm text-slate-500">{{ t("logistics.inspection.computedRefund") }}</span>
        <strong class="text-lg tabular-nums">{{ money(computedRefund) }}</strong>
        <button
          v-if="can.write"
          type="button"
          class="ms-auto th-btn-primary text-sm"
          :disabled="saving || !canSubmit"
          @click="$emit('save', { items: payload, refund_amount: computedRefund })"
        >
          {{ saving ? t("logistics.form.saving") : t("logistics.inspection.save") }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { INSPECTION_RESULT_TONE } from "./constants";

  /**
   * **I3 · Depo kontrol ekranı** (TUR-116).
   *
   * Üç miktar ayrı: istenen → ulaşan → kabul edilen. Aradaki her düşüş bir
   * sebep gerektiriyor ve para iadesi tutarı bu kalem kararlarından
   * TÜRETİLİYOR — operatörün elle tutar girmesi, kalem kararlarıyla
   * tutarsız bir rakama yol açardı.
   *
   * Sunum katmanı: değişiklikleri `update` event'iyle yukarı veriyor,
   * kendi kopyasını tutmuyor.
   */
  const props = defineProps({
    request: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  const emit = defineEmits(["update", "save", "retry"]);

  const { t } = useI18n();

  const resultOptions = computed(() =>
    Object.keys(INSPECTION_RESULT_TONE).map((value) => ({
      value,
      label: t(`logistics.inspectionResult.${value}`),
    }))
  );

  const rows = computed(() =>
    (props.request.items ?? []).map((item) => {
      const received = item.received_qty;
      const accepted = item.accepted_qty;
      const noteRequired = Boolean(item.inspection_result) && item.inspection_result !== "ok";
      return {
        ...item,
        acceptedExceedsReceived:
          received != null && accepted != null && Number(accepted) > Number(received),
        noteRequired,
        noteMissing: noteRequired && !String(item.inspection_note ?? "").trim(),
      };
    })
  );

  const shortReceipts = computed(() =>
    rows.value
      .filter((row) => row.received_qty != null && Number(row.received_qty) < Number(row.requested_qty))
      .map((row) => row.item_name)
  );

  const computedRefund = computed(() =>
    rows.value.reduce(
      (sum, row) => sum + Number(row.accepted_qty ?? 0) * Number(row.unit_refund ?? 0),
      0
    )
  );

  const canSubmit = computed(() =>
    rows.value.every((row) => !row.acceptedExceedsReceived && !row.noteMissing)
  );

  const payload = computed(() =>
    rows.value.map(({ item, received_qty, accepted_qty, inspection_result, inspection_note }) => ({
      item, received_qty, accepted_qty, inspection_result, inspection_note,
    }))
  );

  function update(item, field, value) {
    const numeric = field === "received_qty" || field === "accepted_qty";
    emit("update", { item, field, value: numeric ? Number(value) : value });
  }

  const money = (v) =>
    Number(v ?? 0).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.closure.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.closure.subtitle", { request: request.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Kapanmış: özet + kilit. TUR-116 "kapanınca DEĞİŞTİRİLEMEZ" —
         bu ekranda aksiyon hiç yok, geçmiş var. -->
    <template v-else-if="request.is_closed">
      <div class="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
        <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          {{ t("logistics.closure.closedTitle") }}
        </p>
        <p class="mt-1 text-xs text-emerald-700/90 dark:text-emerald-400/90">
          {{ t("logistics.closure.closedBy", {
            user: request.closed_by || "—",
            at: formatTime(request.closed_at),
          }) }}
        </p>
      </div>

      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div v-for="fact in closedFacts" :key="fact.key" class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ fact.label }}</dt>
          <dd class="mt-0.5 font-medium" :class="fact.tone">{{ fact.value }}</dd>
        </div>
      </dl>

      <p class="text-xs text-slate-500">{{ t("logistics.closure.immutableNote") }}</p>
    </template>

    <template v-else>
      <!-- Kapanış ön koşulları: her biri ayrı satır ve ayrı sebep.
           Tek bir "kapatılamaz" mesajı, hangi adımın eksik olduğunu
           söylemezdi. -->
      <ul class="space-y-2">
        <li
          v-for="check in checks"
          :key="check.key"
          class="flex items-start gap-3 rounded-lg border p-3 text-sm"
          :class="check.passed
            ? 'border-emerald-200 dark:border-emerald-800'
            : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'"
        >
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            :class="check.passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'"
            aria-hidden="true"
          >
            {{ check.passed ? "✓" : "!" }}
          </span>
          <span>
            {{ check.label }}
            <span v-if="!check.passed" class="block text-xs">{{ check.hint }}</span>
          </span>
        </li>
      </ul>

      <div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span class="text-sm text-slate-500">{{ t("logistics.closure.refundAmount") }}</span>
          <strong class="text-xl tabular-nums">{{ money(request.refund_amount) }}</strong>
        </div>
        <p class="mt-1 text-xs text-slate-500">{{ t("logistics.closure.refundHint") }}</p>
      </div>

      <label class="flex items-start gap-2 text-sm">
        <input v-model="triggerRefund" type="checkbox" class="mt-0.5" :disabled="!canClose" />
        <span>
          {{ t("logistics.closure.triggerRefund") }}
          <span class="block text-xs text-slate-500">{{ t("logistics.closure.triggerRefundHint") }}</span>
        </span>
      </label>

      <!-- Geri alınamaz eylem: onay kutusu bilinçli sürtünme. Tek tıkla
           kapanan bir kayıt, yanlışlıkla kapatılır ve düzeltilemez. -->
      <label class="flex items-start gap-2 rounded border border-slate-300 p-3 text-sm dark:border-slate-600">
        <input v-model="confirmed" type="checkbox" class="mt-0.5" :disabled="!canClose" />
        <span class="font-medium">{{ t("logistics.closure.confirm") }}</span>
      </label>

      <div class="flex gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button
          type="button"
          class="th-btn-primary text-sm"
          :disabled="saving || !canSubmit"
          @click="$emit('close-request', { trigger_refund: triggerRefund })"
        >
          {{ saving ? t("logistics.form.saving") : t("logistics.closure.close") }}
        </button>
      </div>
      <p v-if="!canClose" class="text-xs text-amber-700 dark:text-amber-400">
        {{ t("logistics.closure.blockedHint") }}
      </p>
    </template>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";

  /**
   * **I4 · İade kapanışı** (TUR-116).
   *
   * Kapanış GERİ ALINAMAZ — TUR-116 kabul kriteri: *"kapanınca
   * değiştirilemez."* Bu yüzden ekranda iki sürtünme var: ön koşullar
   * ayrı ayrı listeleniyor (tek bir "kapatılamaz" mesajı hangi adımın
   * eksik olduğunu söylemezdi) ve bilinçli bir onay kutusu var.
   *
   * Kapandıktan sonra ekran aksiyon değil GEÇMİŞ gösteriyor.
   */
  const props = defineProps({
    request: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["close-request", "cancel", "retry"]);

  const { t } = useI18n();

  const triggerRefund = ref(true);
  const confirmed = ref(false);

  const checks = computed(() => {
    const r = props.request;
    const inspected = (r.items ?? []).every((item) => Boolean(item.inspection_result));
    return [
      {
        key: "decided",
        label: t("logistics.closure.checkDecided"),
        hint: t("logistics.closure.checkDecidedHint"),
        passed: Boolean(r.decided_at),
      },
      {
        key: "inspected",
        label: t("logistics.closure.checkInspected"),
        hint: t("logistics.closure.checkInspectedHint"),
        passed: (r.items ?? []).length > 0 && inspected,
      },
      {
        key: "refund",
        label: t("logistics.closure.checkRefund"),
        hint: t("logistics.closure.checkRefundHint"),
        passed: r.refund_amount != null,
      },
    ];
  });

  const canClose = computed(() => checks.value.every((check) => check.passed));
  const canSubmit = computed(() => canClose.value && confirmed.value);

  const closedFacts = computed(() => {
    const r = props.request;
    return [
      { key: "refund", label: t("logistics.closure.refundAmount"), value: money(r.refund_amount), tone: "" },
      {
        key: "triggered",
        label: t("logistics.closure.refundTriggered"),
        value: r.refund_triggered_at ? formatTime(r.refund_triggered_at) : t("logistics.closure.notTriggered"),
        tone: r.refund_triggered_at ? "" : "text-amber-700 dark:text-amber-400",
      },
      {
        key: "returnShipment",
        label: t("logistics.closure.returnShipment"),
        value: r.return_shipment || "—",
        tone: "font-mono",
      },
      {
        key: "exchange",
        label: t("logistics.closure.exchangeShipment"),
        value: r.exchange_shipment || "—",
        tone: "font-mono",
      },
    ];
  });

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
</script>

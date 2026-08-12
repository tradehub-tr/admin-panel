<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.pricingRules.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.pricingRules.subtitle") }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-primary text-sm" @click="$emit('create')">
        {{ t("logistics.rates.new") }}
      </button>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <template v-else>
      <!-- ÇAKIŞMA: aynı önceliğe sahip iki kural, hangisinin kazanacağını
           belirsiz bırakır. TUR-121 "deterministik çözülür" diyor —
           belirsizlik sözleşme ihlali, kozmetik bir sorun değil. -->
      <div
        v-if="duplicatePriorities.length"
        class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
        role="alert"
      >
        <p class="font-medium">{{ t("logistics.pricingRules.conflictTitle") }}</p>
        <p class="mt-1">
          {{ t("logistics.pricingRules.conflictDetail", { priorities: duplicatePriorities.join(", ") }) }}
        </p>
      </div>

      <!-- Gölgede kalan kural: daha yüksek öncelikli ve ölçütü DAHA GENİŞ
           bir kural varsa bu kural hiç uygulanmaz. Sessiz kalırsa yönetici
           "tanımladım ama çalışmıyor" der. -->
      <div
        v-if="shadowedRules.length"
        class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
      >
        {{ t("logistics.pricingRules.shadowed", { rules: shadowedRules.join(", ") }) }}
      </div>

      <p v-if="!ordered.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
        {{ t("logistics.pricingRules.empty") }}
      </p>

      <!-- Değerlendirme SIRASI görsel olarak: kurallar yukarıdan aşağı
           denenir, ilk eşleşen kazanır. Tablo bu sırayı anlatmazdı. -->
      <ol v-else class="space-y-2">
        <li
          v-for="(rule, index) in ordered"
          :key="rule.name"
          class="rounded-lg border p-4"
          :class="ruleClass(rule)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-700">
              {{ index + 1 }}
            </span>
            <span class="text-sm font-medium">{{ rule.rule_name }}</span>
            <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-700">
              {{ t("logistics.pricingRules.priority") }} {{ rule.priority }}
            </code>
            <span v-if="!rule.is_active" class="text-xs text-slate-400">
              {{ t("logistics.catalog.passive") }}
            </span>

            <div v-if="can.write" class="ms-auto flex gap-2">
              <button type="button" class="th-btn-outline text-xs" @click="$emit('edit', rule)">
                {{ t("logistics.legOps.edit") }}
              </button>
            </div>
          </div>

          <!-- Ölçütler ETİKET ETİKET: tek bir cümleye sıkıştırmak, hangi
               koşulun neden eşleştiğini simülasyonda takip edilemez kılar. -->
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="criterion in criteriaOf(rule)"
              :key="criterion"
              class="rounded bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-700"
            >
              {{ criterion }}
            </span>
            <span v-if="!criteriaOf(rule).length" class="text-[11px] text-amber-700 dark:text-amber-400">
              {{ t("logistics.pricingRules.catchAll") }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{{ t("logistics.cost.carrierCost") }}: {{ money(rule.base_cost) }}</span>
            <span>{{ t("logistics.cost.customerCharge") }}: {{ money(rule.base_charge) }}</span>
            <span v-if="rule.per_desi_charge">
              {{ t("logistics.pricingRules.perDesi", { amount: money(rule.per_desi_charge) }) }}
            </span>
            <span v-if="rule.valid_until" class="ms-auto">
              {{ t("logistics.pricingRules.validUntil", { date: rule.valid_until }) }}
            </span>
          </div>
        </li>
      </ol>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";

  /**
   * **K2 · Kural yönetimi** (TUR-121).
   *
   * TUR-121 kabul kriteri: *"Kural çakışması deterministik çözülür ve
   * açıklanabilir olmalıdır."* Ekran bunu iki şekilde kovalıyor:
   *
   *   1. Aynı önceliğe sahip iki kural → KIRMIZI uyarı. Belirsizlik bir
   *      sözleşme ihlali, kozmetik sorun değil.
   *   2. Daha yüksek öncelikli ve ölçütsüz (catch-all) bir kural varsa
   *      altındakiler hiç uygulanmaz → SARI uyarı. Sessiz kalırsa yönetici
   *      "tanımladım ama çalışmıyor" der.
   *
   * Liste değil SIRALI liste: kurallar yukarıdan aşağı denenir.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "edit", "retry"]);

  const { t } = useI18n();

  const ordered = computed(() =>
    [...props.rows].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
  );

  const activeRules = computed(() => ordered.value.filter((r) => r.is_active));

  /** Aynı önceliği paylaşan aktif kurallar — sıralama belirsiz kalır. */
  const duplicatePriorities = computed(() => {
    const seen = new Map();
    for (const rule of activeRules.value) {
      seen.set(rule.priority, (seen.get(rule.priority) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, count]) => count > 1).map(([priority]) => priority);
  });

  /**
   * Ölçütü olmayan bir kural HER gönderiye uyar. Böyle bir kuraldan sonra
   * gelen (daha büyük öncelik sayılı) kurallar asla değerlendirilmez.
   */
  const shadowedRules = computed(() => {
    const catchAllIndex = activeRules.value.findIndex((rule) => !criteriaOf(rule).length);
    if (catchAllIndex === -1) return [];
    return activeRules.value.slice(catchAllIndex + 1).map((rule) => rule.rule_name);
  });

  function ruleClass(rule) {
    if (!rule.is_active) return "border-slate-200 opacity-60 dark:border-slate-700";
    if (duplicatePriorities.value.includes(rule.priority)) {
      return "border-red-300 dark:border-red-800";
    }
    if (shadowedRules.value.includes(rule.rule_name)) {
      return "border-amber-300 dark:border-amber-800";
    }
    return "border-slate-200 dark:border-slate-700";
  }

  function criteriaOf(rule) {
    const parts = [];
    if (rule.carrier) parts.push(`${t("logistics.manual.carrier")}: ${rule.carrier}`);
    if (rule.carrier_service) parts.push(rule.carrier_service);
    if (rule.shipping_method) parts.push(rule.shipping_method);
    if (rule.min_desi != null || rule.max_desi != null) {
      parts.push(t("logistics.rates.desiRange", { min: rule.min_desi ?? "0", max: rule.max_desi ?? "∞" }));
    }
    if (rule.min_weight_kg != null || rule.max_weight_kg != null) {
      parts.push(t("logistics.rates.weightRange", {
        min: rule.min_weight_kg ?? "0",
        max: rule.max_weight_kg ?? "∞",
      }));
    }
    if (rule.zone) parts.push(t("logistics.rates.zone", { zone: rule.zone }));
    if (rule.origin_city) parts.push(rule.origin_city);
    if (rule.destination_city) parts.push(rule.destination_city);
    if (rule.min_order_total != null) {
      parts.push(t("logistics.rates.orderTotal", { amount: money(rule.min_order_total) }));
    }
    return parts;
  }

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>

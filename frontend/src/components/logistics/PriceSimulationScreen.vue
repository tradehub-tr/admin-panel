<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.simulation.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.simulation.subtitle") }}</p>
    </header>

    <form class="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3 dark:border-slate-700" @submit.prevent="$emit('simulate', input)">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.simulation.desi") }}</span>
        <input v-model.number="input.desi" type="number" step="0.1" min="0" class="form-input" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.simulation.weight") }}</span>
        <input v-model.number="input.weight_kg" type="number" step="0.1" min="0" class="form-input" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.simulation.orderTotal") }}</span>
        <input v-model.number="input.order_total" type="number" step="0.01" min="0" class="form-input" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.simulation.zone") }}</span>
        <input v-model="input.zone" type="text" class="form-input" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.manual.carrier") }}</span>
        <LinkInput v-model="input.carrier" doctype="Logistics Provider" />
      </label>
      <div class="flex items-end">
        <button type="submit" class="th-btn-primary w-full text-sm" :disabled="running">
          {{ running ? t("logistics.simulation.running") : t("logistics.simulation.run") }}
        </button>
      </div>
    </form>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <p v-else-if="!quote" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.simulation.noResult") }}
    </p>

    <template v-else>
      <!-- Sonuç: alış ve satış AYRI (TUR-121). Tek bir "kargo ücreti"
           kutusu bu ayrımı yok ederdi. -->
      <div class="grid gap-3 sm:grid-cols-3">
        <article v-for="card in resultCards" :key="card.key" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-1 text-xl font-semibold tabular-nums" :class="card.tone">{{ card.value }}</p>
        </article>
      </div>

      <!-- AÇIKLANABİLİRLİK: hangi kural uygulandı ve hangileri ELENDİ.
           TUR-121'in "açıklanabilir olmalı" kriteri, sonucu göstermekle
           değil, gerekçeyi göstermekle karşılanır. -->
      <section class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.simulation.explanation") }}</h2>

        <div class="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
          <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {{ t("logistics.simulation.appliedRule") }}: {{ quote.applied_rule || "—" }}
          </p>
          <p v-if="quote.rule_priority != null" class="mt-0.5 text-xs text-emerald-700/90 dark:text-emerald-400/90">
            {{ t("logistics.pricingRules.priority") }} {{ quote.rule_priority }}
          </p>
        </div>

        <ul v-if="evaluations.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <li v-for="row in evaluations" :key="row.rule" class="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              :class="row.matched ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-600'"
              aria-hidden="true"
            >
              {{ row.matched ? "✓" : "—" }}
            </span>
            <span class="min-w-0 grow">{{ row.rule }}</span>
            <!-- Elenme SEBEBİ: "eşleşmedi" tek başına yöneticinin kuralı
                 düzeltmesine yaramaz. -->
            <span class="text-xs" :class="row.matched ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'">
              {{ row.matched ? t("logistics.simulation.matched") : row.reason }}
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-slate-500">{{ t("logistics.simulation.noEvaluations") }}</p>
      </section>

      <!-- Ek ücretler ayrı kalemler: toplam içinde eriyen bir yakıt farkı
           müşteri itirazında açıklanamaz. -->
      <section v-if="surcharges.length" class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.simulation.surcharges") }}</h2>
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <li v-for="row in surcharges" :key="row.key" class="flex items-baseline justify-between p-3 text-sm">
            <span>{{ surchargeLabel(row.key) }}</span>
            <span class="tabular-nums">{{ money(row.value) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed, reactive } from "vue";
  import { useI18n } from "vue-i18n";

  import LinkInput from "@/components/common/LinkInput.vue";

  import ErrorState from "./ErrorState.vue";

  /**
   * **K3 · Fiyat simülasyonu** (TUR-121).
   *
   * TUR-121'in "açıklanabilir olmalı" kriteri, sonucu göstermekle değil
   * GEREKÇEYİ göstermekle karşılanıyor: hangi kural uygulandı, hangileri
   * neden elendi. "Eşleşmedi" tek başına yöneticinin kuralı düzeltmesine
   * yaramaz — elenme sebebi yazılı olmalı.
   */
  const props = defineProps({
    /** `price_quote` sözleşmesindeki tek sonuç. */
    quote: { type: Object, default: null },
    /** `[{ rule, matched, reason }]` — kural değerlendirme izi. */
    evaluations: { type: Array, default: () => [] },
    running: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["simulate", "retry"]);

  const { t, te } = useI18n();

  /**
   * Ek ücret anahtarları taşıyıcıdan geliyor ve kapalı bir küme değil —
   * çevirisi olmayan bir anahtar uydurulmuyor, ham hâliyle gösteriliyor.
   */
  function surchargeLabel(key) {
    const path = `logistics.surcharge.${key}`;
    return te(path) ? t(path) : key;
  }

  const input = reactive({
    desi: 42,
    weight_kg: 38.5,
    order_total: 4200,
    zone: "TR-IC",
    carrier: "YK",
  });

  const margin = computed(() =>
    props.quote ? Number(props.quote.customer_charge ?? 0) - Number(props.quote.carrier_cost ?? 0) : 0
  );

  const resultCards = computed(() => [
    {
      key: "cost",
      label: t("logistics.cost.carrierCost"),
      value: money(props.quote?.carrier_cost),
      tone: "",
    },
    {
      key: "charge",
      label: t("logistics.cost.customerCharge"),
      value: money(props.quote?.customer_charge),
      tone: "",
    },
    {
      key: "margin",
      label: t("logistics.cost.margin"),
      value: money(margin.value),
      tone: margin.value < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400",
    },
  ]);

  const surcharges = computed(() =>
    Object.entries(props.quote?.surcharges ?? {})
      .filter(([, value]) => Number(value) !== 0)
      .map(([key, value]) => ({ key, value }))
  );

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>

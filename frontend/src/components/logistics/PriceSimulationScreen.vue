<template>
  <div>
    <div class="mb-4">
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ asSeller ? t("logistics.simulation.sellerTitle") : t("logistics.simulation.title") }}
      </h1>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ t("logistics.simulation.subtitle") }}
      </p>
    </div>

    <slot name="devpanel" />

    <!-- İki sekme, iki kullanıcı: kural yazan yönetici serbest deneme yapıyor,
         şikayet araştıran destek gerçek siparişi seçiyor. İkincisi olmasaydı
         değerler başka ekranlardan elle kopyalanırdı (§K5). -->
    <div
      class="mb-3.5 inline-flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800"
    >
      <button
        v-for="tab in TABS"
        :key="tab"
        type="button"
        class="rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors"
        :class="
          mode === tab
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
        "
        :aria-pressed="mode === tab"
        @click="$emit('update:mode', tab)"
      >
        {{ t(`logistics.simulation.tab${tab === "free" ? "Free" : "Real"}`) }}
      </button>
    </div>

    <div class="card mb-4 p-4">
      <div v-if="mode === 'real'" class="grid items-end gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.shipment") }}</span>
          <select
            :value="shipment"
            class="form-input"
            @change="$emit('update:shipment', $event.target.value)"
          >
            <option v-for="s in shipments" :key="s.shipment" :value="s.shipment">
              {{ s.shipment }} · {{ s.destination_city }}
            </option>
          </select>
        </label>
        <div class="flex gap-2">
          <button type="button" class="hdr-btn-primary" :disabled="running" @click="$emit('run')">
            {{ running ? t("logistics.simulation.running") : t("logistics.simulation.calculate") }}
          </button>
        </div>
      </div>

      <div v-else class="grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.desi") }}</span>
          <input v-model.number="form.desi" type="number" step="0.1" min="0" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.weight") }}</span>
          <input
            v-model.number="form.weight_kg"
            type="number"
            step="0.1"
            min="0"
            class="form-input"
          />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.zone") }}</span>
          <select v-model="form.zone" class="form-input">
            <option :value="null">{{ t("logistics.pricingForm.none") }}</option>
            <option v-for="z in zones" :key="z.name" :value="z.name">{{ z.zone_name }}</option>
          </select>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.orderTotal") }}</span>
          <input
            v-model.number="form.order_total"
            type="number"
            step="1"
            min="0"
            class="form-input"
          />
        </label>
        <label v-if="!asSeller" class="block">
          <span class="form-label">{{ t("logistics.simulation.seller") }}</span>
          <select v-model="form.seller_profile" class="form-input">
            <option :value="null">{{ t("logistics.simulation.allSellers") }}</option>
            <option v-for="s in sellers" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.origin") }}</span>
          <input v-model="form.origin_city" type="text" class="form-input" />
        </label>
        <div>
          <button
            type="button"
            class="hdr-btn-primary w-full"
            :disabled="running"
            @click="$emit('run', { ...form })"
          >
            {{ running ? t("logistics.simulation.running") : t("logistics.simulation.calculate") }}
          </button>
        </div>
      </div>

      <!-- Gerçek siparişte değerler SUNUCUDA çözülüyor; ekran onları
           doğrulamıyor, yalnız neyin kullanıldığını gösteriyor. -->
      <div v-if="mode === 'real' && input" class="mt-3">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="chip in inputChips"
            :key="chip"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
          >
            <span class="font-bold">✓</span>{{ chip }}
          </span>
        </div>
        <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
          {{ t("logistics.simulation.autofillHint") }}
        </p>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('run')" />

    <div v-else-if="running" class="card p-5" :aria-busy="true">
      <Skeleton v-for="i in 3" :key="i" variant="rect" height="56px" class="mb-2" />
    </div>

    <div v-else-if="!quotes.length" class="card p-8 text-center">
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {{ t("logistics.simulation.noResult") }}
      </p>
    </div>

    <template v-else>
      <!-- Hiçbir kural eşleşmediğinde ekran BOŞ sonuç göstermiyor: neden
           uymadığını sırayla anlatıyor ve çıkış yolu veriyor. -->
      <div
        v-if="!anyAvailable"
        class="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <AppIcon name="triangle-alert" :size="15" class="mt-0.5 shrink-0" />
        <div>
          <p class="font-bold">{{ t("logistics.simulation.noRuleMatched") }}</p>
          <p class="mt-0.5">{{ t("logistics.simulation.noRuleMatchedHint") }}</p>
          <button
            v-if="can.write"
            type="button"
            class="hdr-btn-primary mt-2.5"
            @click="$emit('create-rule')"
          >
            {{ t("logistics.simulation.createRule") }}
          </button>
        </div>
      </div>

      <h2
        class="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.simulation.quotes") }}
      </h2>
      <CarrierQuoteTable :quotes="quotes" :recommended="recommended" :show-cost="showCost" />

      <div v-if="winner" class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="card p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">
            {{ t("logistics.simulation.buyerPays") }}
          </p>
          <p class="mt-1 text-lg font-bold tabular-nums">{{ money(winner.total_with_tax) }}</p>
          <p class="text-[11px] text-gray-600 dark:text-gray-400">
            {{ money(winner.customer_charge) }} + {{ money(winner.tax_amount) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">
            {{ t("logistics.simulation.carrierPaid") }}
          </p>
          <p class="mt-1 text-lg font-bold tabular-nums">
            <MaskedValue :value="winner.carrier_cost" :hint="maskHint" />
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.rates.margin") }}</p>
          <p class="mt-1 text-lg font-bold tabular-nums">
            <MaskedValue :value="winner.margin" :hint="maskHint" positive />
          </p>
        </div>
      </div>

      <div class="mb-2 mt-5 flex items-center justify-between">
        <h2 class="text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {{ t("logistics.simulation.why") }}
        </h2>
        <button type="button" class="hdr-btn-outlined" @click="$emit('export-csv')">
          <AppIcon name="download" :size="13" />
          <span>{{ t("logistics.simulation.exportCsv") }}</span>
        </button>
      </div>

      <!-- AÇIKLANABİLİRLİK: elenen her kuralın SEBEBİ yazılı. "Eşleşmedi" tek
           başına yöneticinin kuralı düzeltmesine yaramaz (prototip kararı #9).
           Metin ARAYÜZÜN kendi sözlüğünden geliyor (koda göre); sunucunun
           gönderdiği ayrıntı ikinci satırda (sözleşme §8). -->
      <ul v-if="evaluations.length" class="card divide-y divide-gray-100 p-0 dark:divide-gray-800">
        <li
          v-for="row in evaluations"
          :key="row.rule"
          class="flex items-start gap-2.5 p-3 text-xs"
          :class="rowClass(row)"
        >
          <span
            class="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
            :class="markClass(row)"
          >
            {{ row.matched ? "✓" : row.reason_code === "OVERRIDDEN_BY_MANDATORY" ? "✕" : "—" }}
          </span>
          <span class="min-w-0 grow">
            <span class="flex flex-wrap items-center gap-2">
              <b class="text-[12.5px]">{{ row.rule_name }}</b>
              <StatusBadge
                :status="row.layer"
                tone="neutral"
                :label="layerLabel(row.layer)"
                :show-dot="false"
              />
            </span>
            <span class="mt-0.5 block" :class="reasonClass(row)">
              {{
                row.matched
                  ? t("logistics.reason.applied")
                  : t(`logistics.reason.${row.reason_code}`)
              }}
              <span class="text-gray-600 dark:text-gray-400">· {{ row.reason }}</span>
              <code
                v-if="row.reason_code"
                class="ms-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                {{ row.reason_code }}
              </code>
            </span>
          </span>
        </li>
      </ul>
      <p v-else class="text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.simulation.noEvaluations") }}
      </p>
      <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.simulation.whyHint") }}
      </p>
    </template>
  </div>
</template>

<script setup>
  import { computed, reactive } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import CarrierQuoteTable from "./CarrierQuoteTable.vue";
  import ErrorState from "./ErrorState.vue";
  import MaskedValue from "./MaskedValue.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **K3 · Fiyat simülasyonu** (TUR-121).
   *
   * TUR-121'in "açıklanabilir olmalı" kriteri, sonucu göstermekle DEĞİL
   * gerekçeyi göstermekle karşılanıyor: hangi kural uygulandı, hangileri
   * neden elendi.
   *
   * Sonuç tek satır değil — kullanılabilir HER taşıyıcı hesabı yan yana
   * (20-FE K4/K5). Aynı tablo K8 etiket akışında da kullanılıyor.
   */
  const props = defineProps({
    quotes: { type: Array, default: () => [] },
    evaluations: { type: Array, default: () => [] },
    recommended: { type: String, default: null },
    input: { type: Object, default: null },
    mode: { type: String, default: "free" },
    shipment: { type: String, default: null },
    shipments: { type: Array, default: () => [] },
    zones: { type: Array, default: () => [] },
    sellers: { type: Array, default: () => [] },
    running: { type: Boolean, default: false },
    error: { type: Object, default: null },
    asSeller: { type: Boolean, default: false },
    showCost: { type: Boolean, default: true },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["run", "export-csv", "create-rule", "update:mode", "update:shipment"]);

  const { t } = useI18n();
  const TABS = ["free", "real"];

  /**
   * Serbest deneme girdisi — bileşenin KENDİ durumu.
   *
   * Store'a taşınmadı: bu bir arama kutusu gibi geçici bir form durumu ve
   * her tuş vuruşunda store yazmak gereksiz. `run` olayıyla kopyası gidiyor.
   */
  const form = reactive({
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: null,
    origin_city: "İstanbul",
  });

  const anyAvailable = computed(() => props.quotes.some((q) => q.available));
  const winner = computed(
    () => props.quotes.find((q) => q.carrier_account === props.recommended) ?? null
  );

  const maskHint = computed(() =>
    winner.value?.account_owner
      ? t("logistics.rates.maskedOwn")
      : t("logistics.rates.maskedPlatform")
  );

  /** Sunucunun DOLDURDUĞU değerler — ekran hesaplamıyor, gösteriyor. */
  const inputChips = computed(() => {
    const i = props.input;
    if (!i) return [];
    return [
      `${i.desi} desi · ${i.weight_kg} kg`,
      `${i.origin_city ?? "—"} → ${i.destination_city ?? "—"} (${i.zone_label ?? i.zone ?? "—"})`,
      money(i.order_total),
    ];
  });

  const layerLabel = (layer) =>
    ({
      platform_mandatory: t("logistics.pricingRules.layerMandatory"),
      seller: t("logistics.pricingRules.layerSeller"),
      platform: t("logistics.pricingRules.layerPlatform"),
    })[layer] ?? layer;

  const rowClass = (row) => {
    if (row.matched) return "bg-emerald-50 dark:bg-emerald-900/20";
    if (row.reason_code === "OVERRIDDEN_BY_MANDATORY") return "bg-red-50 dark:bg-red-900/20";
    return "";
  };

  const markClass = (row) => {
    if (row.matched) return "bg-emerald-700 text-white";
    if (row.reason_code === "OVERRIDDEN_BY_MANDATORY") return "bg-red-700 text-white";
    return "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  };

  const reasonClass = (row) => {
    if (row.matched) return "font-semibold text-emerald-800 dark:text-emerald-300";
    if (row.reason_code === "OVERRIDDEN_BY_MANDATORY")
      return "font-semibold text-red-800 dark:text-red-300";
    return "text-gray-700 dark:text-gray-300";
  };

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
</script>

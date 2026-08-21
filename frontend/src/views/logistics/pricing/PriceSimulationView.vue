<template>
  <PriceSimulationScreen
    v-model:mode="mode"
    v-model:shipment="shipment"
    :quotes="store.simulation?.quotes ?? []"
    :evaluations="store.evaluations"
    :recommended="store.simulation?.recommended ?? null"
    :input="store.simulation?.input ?? null"
    :shipments="store.shipments"
    :zones="store.zones"
    :sellers="sellers"
    :running="store.simulating"
    :error="store.error"
    :as-seller="store.asSeller"
    :show-cost="showCost"
    :can="can"
    @run="run"
    @export-csv="exportCsv"
    @create-rule="goCreate"
  >
    <template #devpanel>
      <!-- `auth.isAdmin` ŞART: panel bir geliştirici aracı. Satıcı "Yetki
           hatası" senaryosunu seçip kendi ekranını kilitleyebiliyor ve
           nedenini anlayamıyor — 13-FE'de ölçüldü, `MockDevPanel` orada
           aynı kapıyla korunuyor (PackingQueueView.vue:149). -->
      <PricingDevPanel
        v-if="auth.isAdmin && USE_MOCK"
        class="mb-4"
        @changed="store.resetSimulation()"
      />
    </template>
  </PriceSimulationScreen>
</template>

<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";

  import { USE_MOCK } from "@/api/logisticsPricing";
  import PriceSimulationScreen from "@/components/logistics/PriceSimulationScreen.vue";
  import PricingDevPanel from "@/components/logistics/PricingDevPanel.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePricingStore } from "@/stores/pricing";

  /**
   * **K3 container** — simülasyonu gerçek veriye bağlar.
   *
   * CSV gerçekten iniyor (Blob): `FE-MOCK-DISIPLINI` §2.3 "üretilen belge
   * gerçekten açılabilir olmalı" — `#yer-tutucu` bağlantı yasak.
   */
  const router = useRouter();
  const auth = useAuthStore();
  const store = usePricingStore();
  const logistics = useLogisticsStore();

  const mode = ref("free");
  const shipment = ref(null);

  const can = computed(() => ({
    read: true,
    write: logistics.can.pricingWrite ?? logistics.can.write,
  }));

  /** Kazanan teklif satıcının kendi hesabındansa maliyeti o görür. */
  const showCost = computed(() => {
    const kazanan = store.recommendedQuote;
    if (!kazanan) return true;
    return store.asSeller ? Boolean(kazanan.account_owner) : !kazanan.account_owner;
  });

  /** Satıcı seçici — kurallardan türetiliyor, ayrı bir uç açılmadı. */
  const sellers = computed(() => {
    const harita = new Map();
    for (const r of store.rules) {
      if (r.seller_profile) harita.set(r.seller_profile, r.owner_label);
    }
    return [...harita].map(([value, label]) => ({ value, label }));
  });

  function run(payload) {
    const girdi = mode.value === "real" ? { shipment: shipment.value } : payload;
    return store.runSimulation(girdi, store.scope);
  }

  /**
   * CSV dışa aktarım — gerçek dosya.
   *
   * Excel Türkçe yerelde noktalı virgülü ayraç sayıyor; virgülle üretilen
   * dosya tek sütuna düşüyor ve "bozuk indi" diye geri geliyor.
   */
  function exportCsv() {
    const quotes = store.simulation?.quotes ?? [];
    if (!quotes.length) return;
    const basliklar = [
      "carrier_account",
      "carrier",
      "customer_charge",
      "tax_amount",
      "total_with_tax",
      "applied_rule",
      "available",
    ];
    const satirlar = quotes.map((q) => basliklar.map((k) => q[k] ?? "").join(";"));
    const icerik = "﻿" + [basliklar.join(";"), ...satirlar].join("\n");
    const blob = new Blob([icerik], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiyat-simulasyonu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const goCreate = () =>
    router.push({ name: "LogisticsPricingRuleForm", params: { name: "yeni" } });

  onMounted(async () => {
    await logistics.fetchPermissions();
    await store.fetchLookups(store.scope);
    await store.fetchRules(store.scope);
    shipment.value = store.shipments[0]?.shipment ?? null;
  });
</script>

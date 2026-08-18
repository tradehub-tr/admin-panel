<template>
  <div class="space-y-4">
    <!-- Taşıyıcı seçimi URL'de: kapsam uyarısı taşıyıcı BAZINDA anlamlı,
         paylaşılan link doğru taşıyıcıyı açmalı. -->
    <StatusFilterPills v-model="carrier" :options="carrierOptions" @change="load" />

    <StatusMappingScreen
      :carrier="carrier"
      :rows="rows"
      :error="store.error"
      :loading="store.loading"
      :can="store.can"
      @retry="load"
    />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import StatusMappingScreen from "@/components/logistics/StatusMappingScreen.vue";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **F4 container** — durum eşlemesi.
   *
   * Veri jenerik katalog ucundan geliyor (`carrier_status_mapping` on
   * kataloğun biri), ama ekran katalog listesi DEĞİL: taşıyıcı bazında
   * kapsam denetimi yapıyor. Bu yüzden satırlar taşıyıcıya göre filtrelenip
   * veriliyor.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();

  const CATALOG_KEY = "carrier_status_mapping";
  const providers = ref([]);

  const carrier = computed({
    get: () => String(route.query.carrier || providers.value[0]?.value || ""),
    set: (value) => router.replace({ query: { ...route.query, carrier: value } }),
  });

  const carrierOptions = computed(() => providers.value);

  /** Store tüm eşlemeleri tutuyor; ekran tek taşıyıcınınkini istiyor. */
  const rows = computed(() =>
    store.catalogRows.filter((row) => !carrier.value || row.carrier === carrier.value)
  );

  function load() {
    store.fetchCatalog(CATALOG_KEY, { pageSize: 200 });
  }

  onMounted(async () => {
    await store.fetchPermissions();
    // Taşıyıcı listesi sağlayıcı kataloğundan — eşleme tablosundan türetmek
    // hiç eşlemesi olmayan taşıyıcıyı listeden düşürürdü, oysa asıl
    // gösterilmesi gereken durum o.
    await store.fetchCatalog("logistics_provider", { pageSize: 200 });
    providers.value = store.catalogRows.map((row) => ({
      value: row.name,
      label: row.provider_name || row.name,
    }));
    load();
  });

  watch(() => route.query.carrier, load);
</script>

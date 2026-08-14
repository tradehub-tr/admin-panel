<template>
  <div class="space-y-4">
    <!-- Katalog seçici: on katalog tek ekranı paylaşıyor, hangisinde
         olduğumuz URL'de (?catalog=) tutuluyor ki link paylaşılabilsin. -->
    <StatusFilterPills v-model="activeKey" :options="catalogOptions" @change="onCatalogChange" />

    <CatalogListScreen
      :catalog-key="activeKey"
      :title="activeTitle"
      :rows="store.catalogRows"
      :total="store.catalogTotal"
      :loading="store.loading"
      :error="store.error"
      :can="store.can"
      @create="openForm(null)"
      @open="openForm($event.name)"
      @retry="load"
    />
  </div>
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import CatalogListScreen from "@/components/logistics/CatalogListScreen.vue";
  import { getCatalogMeta, humanize } from "@/components/logistics/catalogMeta";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **M1 container** — jenerik katalog listesini gerçek veriye bağlar.
   *
   * Katalog seçimi query string'de (`?catalog=logistics_provider`): tasarım
   * incelemesinde ve operasyonda link paylaşılıyor, seçim bileşen state'inde
   * kalırsa paylaşılan link hep ilk kataloğu açardı.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();

  /** Sözleşmeden gelen katalog anahtarları — liste burada tutulmuyor. */
  const catalogOptions = computed(() =>
    store.catalogKeys.map((key) => ({ value: key, label: humanize(key) }))
  );

  const activeKey = computed({
    get: () => String(route.query.catalog || store.catalogKeys[0] || "logistics_provider"),
    set: (value) => router.replace({ query: { ...route.query, catalog: value } }),
  });

  const activeTitle = computed(() => {
    // Meta yoksa (bilinmeyen anahtar) ekranın throw etmesini engelle —
    // humanize her zaman okunabilir bir başlık üretir.
    try {
      getCatalogMeta(activeKey.value);
    } catch {
      return humanize(activeKey.value);
    }
    return humanize(activeKey.value);
  });

  function load() {
    if (activeKey.value) store.fetchCatalog(activeKey.value);
  }

  function onCatalogChange() {
    load();
  }

  function openForm(name) {
    router.push({
      name: "LogisticsCatalogForm",
      params: { catalogKey: activeKey.value, ...(name ? { name } : {}) },
    });
  }

  onMounted(async () => {
    await Promise.all([store.fetchPermissions(), store.fetchCatalogKeys()]);
    load();
  });

  // Geri/ileri tuşuyla katalog değişince de veri tazelensin.
  watch(() => route.query.catalog, load);
</script>

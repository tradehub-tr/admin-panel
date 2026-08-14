<template>
  <CatalogFormScreen
    :catalog-key="catalogKey"
    :title="title"
    :model-value="store.currentItem ?? {}"
    :loading="store.loading"
    :saving="store.saving"
    :error="store.error"
    :can="store.can"
    @save="save"
    @cancel="goBack"
    @retry="load"
  />
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import CatalogFormScreen from "@/components/logistics/CatalogFormScreen.vue";
  import { humanize } from "@/components/logistics/catalogMeta";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **M2 container** — jenerik katalog formunu gerçek veriye bağlar.
   *
   * `name` parametresi yoksa YENİ kayıt: store'daki `currentItem`
   * temizleniyor, aksi hâlde önceki kaydın alanları yeni forma sızardı.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const catalogKey = computed(() => String(route.params.catalogKey));
  const recordName = computed(() => (route.params.name ? String(route.params.name) : null));
  const title = computed(() => humanize(catalogKey.value));

  function load() {
    if (recordName.value) {
      store.fetchCatalogItem(catalogKey.value, recordName.value);
    } else {
      store.currentItem = {};
      store.clearError();
    }
  }

  async function save(values) {
    try {
      const saved = await store.saveCatalogItem(catalogKey.value, recordName.value, values);
      toast.success("Kayıt kaydedildi");
      // Yeni kayıtta URL'yi kaydın adına taşı — sayfa yenilenirse aynı
      // kayıt açılsın, "yeni kayıt" formuna dönmesin.
      if (!recordName.value && saved?.name) {
        router.replace({
          name: "LogisticsCatalogForm",
          params: { catalogKey: catalogKey.value, name: saved.name },
        });
      }
    } catch {
      toast.error(store.error?.message || "Kaydedilemedi");
    }
  }

  function goBack() {
    router.push({ name: "LogisticsCatalogList", query: { catalog: catalogKey.value } });
  }

  onMounted(async () => {
    await store.fetchPermissions();
    load();
  });

  watch(() => [route.params.catalogKey, route.params.name], load);
</script>

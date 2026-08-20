<template>
  <CatalogFormScreen
    :catalog-key="catalogKey"
    :title="title"
    :model-value="store.currentItem ?? {}"
    :loading="store.loading"
    :saving="store.saving"
    :error="store.error"
    :can="catalogPerms"
    @save="save"
    @cancel="goBack"
    @retry="load"
  />
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import CatalogFormScreen from "@/components/logistics/CatalogFormScreen.vue";
  import { catalogTitle, humanize } from "@/components/logistics/catalogMeta";
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
  const { t, te } = useI18n();

  const catalogKey = computed(() => String(route.params.catalogKey));
  const recordName = computed(() => (route.params.name ? String(route.params.name) : null));

  /** Katalog başlığı Türkçe (`doctypeNames`); bilinmeyen anahtarda humanize. */
  const title = computed(() => {
    try {
      return catalogTitle(catalogKey.value, t, te);
    } catch {
      return humanize(catalogKey.value);
    }
  });

  /**
   * "Kaydet" düğmesi BU kataloğun `write` iznine bakar — eskiden
   * `store.can.write`'a, yani `shipment.write` capability'sine bakıyordu ve
   * bir kataloğu düzenleme yetkisiyle semantik olarak ilgisizdi.
   * Route'la katalog değiştiğinde tazelensin diye `computed`.
   */
  const catalogPerms = computed(() => store.catalogCan(catalogKey.value));

  function load() {
    if (recordName.value) {
      store.fetchCatalogItem(catalogKey.value, recordName.value);
    } else {
      // State mutasyonu action'da (state-management §2) — view store'un
      // alanına doğrudan yazmıyor.
      store.resetCurrentItem();
      store.clearError();
    }
  }

  async function save(values) {
    try {
      const saved = await store.saveCatalogItem(catalogKey.value, recordName.value, values);
      toast.success(t("logistics.toast.saved"));
      // Yeni kayıtta URL'yi kaydın adına taşı — sayfa yenilenirse aynı
      // kayıt açılsın, "yeni kayıt" formuna dönmesin.
      if (!recordName.value && saved?.name) {
        router.replace({
          name: "LogisticsCatalogForm",
          params: { catalogKey: catalogKey.value, name: saved.name },
        });
      }
    } catch {
      toast.error(store.error?.message || t("logistics.toast.saveFailed"));
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

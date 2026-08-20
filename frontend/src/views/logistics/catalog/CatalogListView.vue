<template>
  <!-- `:key` ZORUNLU: `useDataTable` alan listesini bir kez okur; katalog
       değiştiğinde bileşen yeniden kurulmazsa sütunlar eski katalogda kalır.
       Yeniden kurulum aynı zamanda bir kataloğun arama/filtre/sayfa
       durumunun diğerine taşınmasını da engelliyor (bilinçli). -->
  <CatalogListScreen
    :key="activeKey"
    v-model:selection="selection"
    :catalog-key="activeKey"
    :title="activeTitle"
    :rows="store.catalogRows"
    :total="store.catalogTotal"
    :loading="store.loading"
    :error="store.error"
    :can="catalogPerms"
    @create="openForm(null)"
    @open="openForm($event.name)"
    @retry="load"
    @refresh="load"
    @params-change="onParamsChange"
    @bulk-toggle-active="bulkToggleActive"
    @clear-selection="selection = []"
  >
    <!-- Katalog seçici: on katalog tek ekranı paylaşıyor, hangisinde
         olduğumuz URL'de (?catalog=) tutuluyor ki link paylaşılabilsin.
         Kendi kabında duruyor — altındaki Aktif/Pasif pill'leriyle
         karışmasın. -->
    <template #subheader>
      <div class="card mb-4 !p-2 flex items-center gap-2 overflow-x-auto">
        <AppIcon name="layers" :size="13" class="ms-1 shrink-0 text-gray-600 dark:text-gray-400" />
        <StatusFilterPills
          v-model="activeKey"
          :options="catalogOptions"
          wrapper-class="flex items-center gap-2 flex-nowrap"
        />
      </div>
    </template>
  </CatalogListScreen>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import CatalogListScreen from "@/components/logistics/CatalogListScreen.vue";
  import { catalogTitle, humanize } from "@/components/logistics/catalogMeta";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **M1 container** — jenerik katalog listesini gerçek veriye bağlar.
   *
   * Katalog seçimi query string'de (`?catalog=logistics_provider`): tasarım
   * incelemesinde ve operasyonda link paylaşılıyor, seçim bileşen state'inde
   * kalırsa paylaşılan link hep ilk kataloğu açardı.
   *
   * SAYFALAMA/ARAMA/SIRALAMA SUNUCUDA: ekran `params-change` ile ne istediğini
   * bildiriyor, burada olduğu gibi `fetchCatalog`'a geçiyoruz. Eskiden
   * parametresiz çağrılıyordu; 2. sayfaya tıklamak hiç istek üretmiyordu.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const { t, te } = useI18n();

  /**
   * Toplu eylem seçimi. Ekran kendi başına da tutabilirdi (`defineModel`
   * yerel değere düşüyor) ama toplu pasifleştirme bittiğinde seçimi
   * TEMİZLEMEK gerekiyor — o karar container'ın.
   */
  const selection = ref([]);

  /**
   * Katalog başlığı — `doctypeNames` üzerinden Türkçe. Anahtar sözleşmede
   * yoksa `getCatalogMeta` fırlatıyor; ekran patlamasın diye humanize'a düş.
   */
  function safeTitle(key) {
    try {
      return catalogTitle(key, t, te);
    } catch {
      return humanize(key);
    }
  }

  /**
   * Sözleşmeden gelen katalog anahtarları — liste burada tutulmuyor.
   *
   * `store.catalogKeys` STRING DİZİSİ (`stores/logistics.js` normalize ediyor).
   * Uç bir nesne döndürüyor (`{catalogs:[{key,…}]}`); ham hâli buraya
   * sızdığında bu `.map` çağrısı `TypeError` fırlatıyor ve seçici kırılıyordu.
   */
  const catalogOptions = computed(() =>
    store.catalogKeys.map((key) => ({ value: key, label: safeTitle(key) }))
  );

  const activeKey = computed({
    get: () => String(route.query.catalog || store.catalogKeys[0] || "logistics_provider"),
    set: (value) => router.replace({ query: { ...route.query, catalog: value } }),
  });

  /**
   * Ekranın yetkisi AKTİF KATALOĞUN doctype izinlerinden gelir — `store.can`
   * sevkiyat capability'lerini anlatır ve katalog CRUD'u ile ilgisizdir.
   * Katalog değiştikçe yeniden hesaplansın diye `computed` içinde çağrılıyor.
   */
  const catalogPerms = computed(() => store.catalogCan(activeKey.value));

  const activeTitle = computed(() => safeTitle(activeKey.value));

  /**
   * Ekranın son bildirdiği liste parametreleri. Boş nesne = uç kendi
   * varsayılanını kullanır (`listCatalog`: 1. sayfa, 50 kayıt).
   */
  let params = {};

  function load() {
    if (activeKey.value) store.fetchCatalog(activeKey.value, params);
  }

  function onParamsChange(next) {
    params = next;
    load();
  }

  /**
   * Toplu pasifleştirme. Uç tek kayıt alıyor (`set_catalog_item_active`);
   * döngü ve kısmi başarı store'da (`setCatalogActive`), burada yalnız
   * geri bildirim ve seçimi temizleme var.
   *
   * Başarılı kayıtlar geri alınamadığı için kısmi başarıda da seçim
   * temizleniyor: liste tazelendi, eski adlar artık farklı bir durumu
   * gösteriyor olabilir.
   */
  async function bulkToggleActive({ names, isActive }) {
    const ok = await store.setCatalogActive(activeKey.value, names, isActive, params);
    selection.value = [];
    if (ok) toast.success(t("logistics.toast.saved"));
    else toast.error(store.error?.message || t("logistics.toast.saveFailed"));
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

  // Katalog değişince (pill ya da geri/ileri tuşu) ekran yeniden kuruluyor;
  // parametreler de sıfırlanmalı, yoksa yeni katalog eskisinin 3. sayfasından
  // açılırdı.
  watch(
    () => route.query.catalog,
    () => {
      params = {};
      // Seçim de sıfırlanmalı: adlar kataloğa özel, taşınırsa toplu eylem
      // yanlış kataloğun kayıtlarına gitmeye çalışırdı.
      selection.value = [];
      load();
    }
  );
</script>

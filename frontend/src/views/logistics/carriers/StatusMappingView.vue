<template>
  <div class="space-y-4">
    <!-- Taşıyıcı seçimi URL'de: kapsam uyarısı taşıyıcı BAZINDA anlamlı,
         paylaşılan link doğru taşıyıcıyı açmalı.
         `@change="load"` YOK: yazılabilir computed zaten `?carrier=`i
         değiştiriyor ve aşağıdaki `watch` tek tetikleyici. İkisi birlikte
         her hap tıklamasında AYNI isteği iki kez gönderiyordu. -->
    <StatusFilterPills v-model="carrier" :options="carrierOptions" />

    <StatusMappingScreen
      :carrier="carrier"
      :rows="rows"
      :loading="store.loading"
      :error="store.error"
      :can="catalogPerms"
      @retry="load"
      @create="openMapping()"
      @edit="openMapping($event.name)"
    />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import StatusMappingScreen from "@/components/logistics/StatusMappingScreen.vue";
  import { listCatalog } from "@/api/logistics";
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

  /**
   * Yetki `store.can` DEĞİL, katalog izni.
   *
   * `carrier_status_mapping` bir KATALOG; `store.can.write` ise sevkiyat
   * capability'si (`shipment.write`). İkisini karıştırmak, eşleme düzenleme
   * butonunu sevkiyat yazma yetkisine bağlıyordu — semantik olarak ilgisiz
   * iki kapı. Backend `doctype_permissions`ı zaten katalog anahtarı bazında
   * veriyor ve şekli ekranın beklediğiyle aynı: {read, write, create, delete}.
   */
  const catalogPerms = computed(() => store.catalogCan(CATALOG_KEY));

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

  /**
   * Sağlayıcı listesi UCA DOĞRUDAN soruluyor, store'un `catalogRows`
   * slotundan değil.
   *
   * O slot TEK ve paylaşılmış: `fetchCatalog("logistics_provider")` çağrısı
   * onu sağlayıcılarla dolduruyor, hemen ardından gelen eşleme çağrısı
   * üzerine yazıyordu. Aradaki her render (ve ikinci çağrı hata alırsa
   * kalıcı olarak) eşleme tablosunda sağlayıcı satırlarını gösteriyordu.
   * Taşıyıcı listesi bu ekranın YEREL bir ihtiyacı — CarrierAccountView
   * deseni: kendi isteğini kendi ref'ine yazar.
   *
   * Taşıyıcı listesi eşleme tablosundan türetilmiyor: hiç eşlemesi olmayan
   * taşıyıcıyı listeden düşürürdü, oysa asıl gösterilmesi gereken durum o.
   */
  async function loadProviders() {
    try {
      const data = await listCatalog("logistics_provider", { pageSize: 200 });
      providers.value = (data?.items ?? []).map((row) => ({
        value: row.name,
        label: row.provider_name || row.name,
      }));
    } catch (e) {
      // Haplar boş kalır, eşleme tablosu yine de yüklenir: sağlayıcı listesi
      // bir kolaylık, ekranın asıl verisi değil.
      providers.value = [];
      console.error("[StatusMappingView] sağlayıcı listesi alınamadı", e);
    }
  }

  /**
   * Eşlemeler bir KATALOG (`carrier_status_mapping`) — oluşturma/düzenleme
   * için ayrı ekran yok ve gerekmiyor: M2 katalog formu (`ready: true`)
   * bu kaydı zaten düzenliyor. Butonları öldürmek yerine oraya bağlamak
   * ölü buton yasağının doğru çözümü.
   *
   * Rotanın zorunlu parametresi yalnız `catalogKey` (`:name?` opsiyonel) —
   * router parametre testi bunu doğruluyor.
   */
  function openMapping(name) {
    router.push({
      name: "LogisticsCatalogForm",
      params: { catalogKey: "carrier_status_mapping", ...(name ? { name } : {}) },
    });
  }

  onMounted(async () => {
    await store.fetchPermissions();
    await loadProviders();
    load();
  });

  watch(() => route.query.carrier, load);
</script>

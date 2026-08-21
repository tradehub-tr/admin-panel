<template>
  <ShippingRateScreen
    v-model:search="filters.search"
    v-model:zone="filters.zone"
    v-model:account="filters.account"
    v-model:active-only="filters.activeOnly"
    :rows="store.rules"
    :total="t('docTypeList.recordsFound', { count: store.total })"
    :zones="store.zones"
    :accounts="store.accounts"
    :loading="store.loading"
    :error="store.error"
    :as-seller="store.asSeller"
    :seller-name="store.sellerName"
    :can="can"
    @create="goCreate"
    @open="goEdit"
    @retry="load"
    @clear-filters="clearFilters"
    @quick-charge="quickCharge"
  >
    <template #devpanel>
      <!-- `auth.isAdmin` ŞART: panel bir geliştirici aracı. Satıcı "Yetki
           hatası" senaryosunu seçip kendi ekranını kilitleyebiliyor ve
           nedenini anlayamıyor — 13-FE'de ölçüldü, `MockDevPanel` orada
           aynı kapıyla korunuyor (PackingQueueView.vue:149). -->
      <PricingDevPanel v-if="auth.isAdmin && USE_MOCK" class="mb-4" @changed="load" />
    </template>
  </ShippingRateScreen>
</template>

<script setup>
  import { computed, onMounted, reactive, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import { USE_MOCK } from "@/api/logisticsPricing";
  import PricingDevPanel from "@/components/logistics/PricingDevPanel.vue";
  import ShippingRateScreen from "@/components/logistics/ShippingRateScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePricingStore } from "@/stores/pricing";

  /**
   * **K1 container** — tarifeleri gerçek veriye bağlar.
   *
   * Yetki `stores/logistics.js`'ten: fiyat capability'leri (`pricing_rule.*`)
   * 20-BE'de eklenecek; o güne kadar 13-FE'nin köprü deseni uygulanıyor —
   * tanımlıysa onu kullan, değilse mevcut yazma yetkisine düş. Köprü olmasa
   * düğmeler KALICI olarak gizli kalırdı.
   */
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const auth = useAuthStore();
  const store = usePricingStore();
  const logistics = useLogisticsStore();

  const filters = reactive({ search: "", zone: null, account: null, activeOnly: false });

  const can = computed(() => ({
    read: true,
    write: logistics.can.pricingWrite ?? logistics.can.write,
  }));

  async function load() {
    await store.fetchRules({
      search: filters.search || null,
      zone: filters.zone,
      carrierAccount: filters.account,
      isActive: filters.activeOnly ? 1 : null,
      ...store.scope,
    });
  }

  function clearFilters() {
    Object.assign(filters, { search: "", zone: null, account: null, activeOnly: false });
  }

  const goCreate = () =>
    router.push({ name: "LogisticsPricingRuleForm", params: { name: "yeni" } });
  const goEdit = (row) =>
    router.push({ name: "LogisticsPricingRuleForm", params: { name: row.name } });

  /**
   * Satır içi fiyat değişikliği.
   *
   * YALNIZ tek kademeli kuralda açık (ekran öyle çiziyor): çok kademelide
   * "hangi kademe" belirsiz olurdu. Kaydettikten sonra liste tazeleniyor —
   * değişiklik çakışma/gölgeleme uyarılarını değiştirmiş olabilir.
   */
  async function quickCharge({ row, value }) {
    const detay = await store.fetchRule(row.name, store.scope).then(() => store.rule);
    if (!detay) return;
    const tiers = detay.tiers.map((tier, i) => (i === 0 ? { ...tier, base_charge: value } : tier));
    const ok = await store.save({ name: row.name, values: { ...detay, tiers }, ...store.scope });
    if (ok) toast.success(t("logistics.toast.saved"));
    else toast.error(store.error?.message ?? t("logistics.toast.saveFailed"));
  }

  onMounted(async () => {
    await logistics.fetchPermissions();
    await store.fetchLookups(store.scope);
    await load();
  });

  // Filtre değişince yeniden yükle — sunucu tarafı süzgeç (sözleşme §2.1).
  watch(filters, load, { deep: true });
</script>

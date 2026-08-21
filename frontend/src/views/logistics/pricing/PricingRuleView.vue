<template>
  <PricingRuleScreen
    :by-layer="store.byLayer"
    :total="store.total"
    :accounts="store.accounts"
    :loading="store.loading"
    :error="store.error"
    :as-seller="store.asSeller"
    :seller-name="store.sellerName"
    :can="can"
    @create="goCreate"
    @open="goEdit"
    @remove="goDelete"
    @reorder="reorder"
    @retry="load"
    @clear-filters="load"
  >
    <template #devpanel>
      <!-- `auth.isAdmin` ŞART: panel bir geliştirici aracı. Satıcı "Yetki
           hatası" senaryosunu seçip kendi ekranını kilitleyebiliyor ve
           nedenini anlayamıyor — 13-FE'de ölçüldü, `MockDevPanel` orada
           aynı kapıyla korunuyor (PackingQueueView.vue:149). -->
      <PricingDevPanel v-if="auth.isAdmin && USE_MOCK" class="mb-4" @changed="load" />
    </template>
  </PricingRuleScreen>
</template>

<script setup>
  import { computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import { USE_MOCK } from "@/api/logisticsPricing";
  import PricingDevPanel from "@/components/logistics/PricingDevPanel.vue";
  import PricingRuleScreen from "@/components/logistics/PricingRuleScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePricingStore } from "@/stores/pricing";

  /**
   * **K2 container** — değerlendirme sırasını gerçek veriye bağlar.
   *
   * Silme AYRI EKRANA gidiyor (K4'ün `delete` modu): kullanımdaki kuralın
   * silinemeyeceğini ve pasifleştirmenin önerildiğini bir onay kutusunda
   * anlatmak mümkün değil.
   */
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const auth = useAuthStore();
  const store = usePricingStore();
  const logistics = useLogisticsStore();

  const can = computed(() => ({
    read: true,
    write: logistics.can.pricingWrite ?? logistics.can.write,
  }));

  const load = () => store.fetchRules(store.scope);

  const goCreate = () =>
    router.push({ name: "LogisticsPricingRuleForm", params: { name: "yeni" } });
  const goEdit = (rule) =>
    router.push({ name: "LogisticsPricingRuleForm", params: { name: rule.name } });
  const goDelete = (rule) =>
    router.push({
      name: "LogisticsPricingRuleForm",
      params: { name: rule.name },
      query: { sil: "1" },
    });

  /**
   * Sürükleyerek sıralama → öncelik yazma.
   *
   * TEK istek: kural kural `save` çağırmak yanlıştı — liste yükü alt
   * tabloları taşımadığı için her kayıt "En az bir kademe gerekli" ile
   * reddediliyor ve sürükleme sessizce kayboluyordu (ölçüldü 2026-08-21).
   * Ayrıca ortada kalan bir hata öncelikleri YARIM uygulanmış bırakırdı.
   * Öncelikleri sunucu 10'ar veriyor (sözleşme §2.3b): araya kural eklemek
   * için 11, 12 gibi ara değerler kalıyor.
   */
  async function reorder({ layer, order }) {
    const ok = await store.reorder({ layer, order }, store.scope);
    if (ok) toast.success(t("logistics.toast.saved"));
    else toast.error(store.error?.message ?? t("logistics.toast.saveFailed"));
    await load();
  }

  onMounted(async () => {
    await logistics.fetchPermissions();
    await store.fetchLookups(store.scope);
    await load();
  });
</script>

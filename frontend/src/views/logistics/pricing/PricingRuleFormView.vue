<template>
  <PricingRuleFormScreen
    v-model:model="draft"
    :mode="mode"
    :zones="store.zones"
    :accounts="store.accounts"
    :methods="store.methods"
    :field-errors="store.fieldErrors"
    :in-use-count="inUseCount"
    :saving="store.saving"
    :loading="store.loading"
    :can="can"
    :as-seller="store.asSeller"
    :read-only="readOnly"
    :show-cost="showCost"
    @pick-template="applyTemplate"
    @save="save"
    @cancel="goBack"
    @ask-delete="mode = 'delete'"
    @confirm-delete="remove"
    @deactivate="deactivate"
  />
</template>

<script setup>
  import { computed, onMounted, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import PricingRuleFormScreen from "@/components/logistics/PricingRuleFormScreen.vue";
  import { emptyRule, RULE_TEMPLATES } from "@/constants/pricingTemplates";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePricingStore } from "@/stores/pricing";

  /**
   * **K4 container** — kural oluşturma / düzenleme / silme.
   *
   * TASLAK ÜZERİNDE çalışıyor: form alanları store'daki kaydı değil, onun
   * `reactive` kopyasını değiştiriyor. Kaydet denene kadar gerçek kayıt
   * duruyor; "Vazgeç" gerçekten vazgeçiyor.
   */
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const store = usePricingStore();
  const logistics = useLogisticsStore();

  const YENI = "yeni";

  const can = computed(() => ({
    read: true,
    write: logistics.can.pricingWrite ?? logistics.can.write,
  }));

  const draft = reactive(emptyRule());
  const mode = ref("form");
  const inUseCount = ref(0);

  /**
   * BAŞKASININ kuralı — açılır ama düzenlenemez (analiz §6.1).
   *
   * Platform, satıcının kuralına bakabiliyor ama alış maliyetini göremediği
   * için düzenleyemez de. Elinde kalan tek müdahale pasifleştirme.
   */
  const readOnly = computed(() => {
    if (!draft.name) return false;
    return store.asSeller
      ? draft.seller_profile !== store.sellerName
      : Boolean(draft.seller_profile);
  });

  /** Alış alanları: kuralın sahibiysen görürsün, değilsen alan hiç gelmiyor. */
  const showCost = computed(() =>
    store.asSeller ? draft.seller_profile === store.sellerName : !draft.seller_profile
  );

  function applyTemplate(key) {
    const tpl = RULE_TEMPLATES.find((x) => x.key === key);
    Object.assign(draft, emptyRule(tpl?.values ?? {}));
    if (store.asSeller) draft.seller_profile = store.sellerName;
    mode.value = "form";
  }

  async function load() {
    const name = route.params.name;
    if (!name || name === YENI) {
      Object.assign(draft, emptyRule());
      if (store.asSeller) draft.seller_profile = store.sellerName;
      // Yeni kayıt ŞABLON seçimiyle başlıyor — boş form ikinci planda.
      mode.value = "template";
      return;
    }
    await store.fetchRule(name, store.scope);
    if (store.rule) Object.assign(draft, JSON.parse(JSON.stringify(store.rule)));
    mode.value = route.query.sil ? "delete" : "form";
  }

  async function save(values) {
    const ok = await store.save({
      name: values.name || null,
      values: JSON.parse(JSON.stringify(values)),
      ...store.scope,
    });
    if (!ok) {
      toast.error(store.error?.message ?? t("logistics.toast.saveFailed"));
      return;
    }
    toast.success(t("logistics.toast.saved"));
    goBack();
  }

  async function remove() {
    const ok = await store.remove(draft.name, store.scope);
    if (!ok) {
      // Sunucu kaç sevkiyatın kullandığını söylüyor; ekran onu gösteriyor.
      inUseCount.value = store.error?.details?.fields?.in_use_count ?? 0;
      toast.error(store.error?.message ?? t("logistics.toast.saveFailed"));
      return;
    }
    toast.success(t("logistics.toast.saved"));
    goBack();
  }

  async function deactivate() {
    const ok = await store.save({
      name: draft.name,
      values: { ...JSON.parse(JSON.stringify(draft)), is_active: 0 },
      ...store.scope,
    });
    if (ok) {
      toast.success(t("logistics.toast.saved"));
      goBack();
    } else {
      toast.error(store.error?.message ?? t("logistics.toast.saveFailed"));
    }
  }

  const goBack = () => router.push({ name: "LogisticsPricingRules" });

  onMounted(async () => {
    await logistics.fetchPermissions();
    await store.fetchLookups(store.scope);
    await load();
  });

  watch(() => route.params.name, load);
</script>

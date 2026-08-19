<template>
  <LogisticsSettingsScreen
    :settings="store.settings"
    :feature-flags="store.featureFlags"
    :loading="store.loading"
    :error="store.error"
    :can="can"
    @update-setting="updateSetting"
    @toggle-flag="toggleFlag"
    @retry="store.fetchSettings"
  />
</template>

<script setup>
  import { computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";

  import LogisticsSettingsScreen from "@/components/logistics/LogisticsSettingsScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **M3 container** — lojistik ayarları.
   *
   * Ana anahtar (`logistics_enabled`) da diğer ayarlar gibi
   * `update_logistics_settings` ile yazılıyor; alt bayraklar ise ayrı uçtan
   * (`set_feature_flag`) — ikisi farklı alanlar, backend sözleşmesi böyle.
   */
  const store = useLogisticsStore();
  const toast = useToast();
  const { t } = useI18n();

  /**
   * `can.write` NEDEN `store.can`'den GELMİYOR.
   *
   * `store.can.write` `shipment.write` capability'si — sevkiyat düzenleme
   * yetkisi; lojistik AYARLARIYLA ilgisi yok. Backend'in gerçek kapısı rol:
   * "Logistics Settings" Single DocType'ında yalnız **System Manager** ve
   * **Marketplace Admin** write taşır (logistics_settings.json).
   *
   * G0 matrisi (2026-08-19) bu kapıyı FE'de de aynı kaynağa bağladı: store
   * artık yanıttaki `roles` sözlüğünü saklıyor ve backend `marketplace_admin`
   * bayrağını bildiriyor — önceki `can.manage` YAKLAŞIKLIĞI (Carrier
   * Integration Manager'a yanlışlıkla yazma butonu çiziyordu) kalktı.
   *
   * Güvenlik sınırı değil: yetkisiz kullanıcı anahtarı çevirse bile backend
   * yazmayı reddediyor, ekran hatayı toast ile gösteriyor.
   */
  const can = computed(() => ({
    ...store.can,
    write: Boolean(store.roles.system_manager || store.roles.marketplace_admin),
  }));

  async function updateSetting({ key, value }) {
    try {
      await store.saveSetting(key, value);
      toast.success(t("logistics.toast.settingSaved"));
    } catch {
      toast.error(store.error?.message || t("logistics.toast.settingSaveFailed"));
    }
  }

  async function toggleFlag({ flag, enabled }) {
    try {
      await store.toggleFlag(flag, enabled);
    } catch {
      toast.error(store.error?.message || t("logistics.toast.flagToggleFailed"));
    }
  }

  onMounted(async () => {
    await store.fetchPermissions();
    store.fetchSettings();
  });
</script>

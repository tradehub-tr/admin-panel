<template>
  <LogisticsSettingsScreen
    :settings="store.settings"
    :feature-flags="store.featureFlags"
    :loading="store.loading"
    :error="store.error"
    :can="store.can"
    @update-setting="updateSetting"
    @toggle-flag="toggleFlag"
    @retry="store.fetchSettings"
  />
</template>

<script setup>
  import { onMounted } from "vue";

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

  async function updateSetting({ key, value }) {
    try {
      await store.saveSetting(key, value);
      toast.success("Ayar kaydedildi");
    } catch {
      toast.error(store.error?.message || "Ayar kaydedilemedi");
    }
  }

  async function toggleFlag({ flag, enabled }) {
    try {
      await store.toggleFlag(flag, enabled);
    } catch {
      toast.error(store.error?.message || "Bayrak değiştirilemedi");
    }
  }

  onMounted(async () => {
    await store.fetchPermissions();
    store.fetchSettings();
  });
</script>

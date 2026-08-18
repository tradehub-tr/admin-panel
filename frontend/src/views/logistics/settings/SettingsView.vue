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
   * Ekran tek bir bayrak okuyor (`can.write`) ve onu ayarları yazma yetkisi
   * sanıyor. `store.can.write` ise `shipment.write` capability'si — bir
   * sevkiyatı düzenleme yetkisi; lojistik AYARLARIYLA hiç ilgisi yok.
   *
   * BACKEND'DEKİ GERÇEK KAPI (okundu, değiştirilmedi):
   * `logistics_admin.update_logistics_settings` ve `set_feature_flag`
   * `@logistics_endpoint()`'i PARAMETRESİZ kullanıyor — flag yok, rol yok,
   * capability yok. Tek kapı Frappe'nin DocType izni: `doc.save()`
   * "Logistics Settings" üzerinde `write` istiyor ve o Single DocType'ta
   * yalnız **System Manager** ile **Marketplace Admin** rollerinin write'ı
   * var (logistics_settings.json permissions).
   *
   * FE'DEKİ EN YAKIN SİNYAL: `get_logistics_permissions` yanıtı `roles`
   * sözlüğünü (`system_manager` dahil) döndürüyor, ama `stores/logistics.js`
   * onu SAKLAMIYOR — `capabilities` ve `doctype_permissions` alınıyor,
   * `roles` düşüyor. `doctype_permissions` da yalnız KATALOG doctype'larını
   * kapsıyor, "Logistics Settings" orada yok. Bu yüzden şimdilik
   * `can.manage` (`carrier_credential.manage`) kullanılıyor: sevkiyat
   * düzenlemekle değil, LOJİSTİK YÖNETİMİYLE ilgili tek capability o.
   * Yaklaşık bir sinyal, tam eşleşme değil — store `roles.system_manager`i
   * saklamaya başladığında burası ona bağlanmalı (3. tura bırakıldı).
   *
   * Zaten güvenlik sınırı değil: yetkisiz kullanıcı anahtarı çevirse bile
   * backend yazmayı reddediyor, ekran hatayı toast ile gösteriyor.
   */
  const can = computed(() => ({ ...store.can, write: store.can.manage }));

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

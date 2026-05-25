/**
 * Tracking Settings Admin Store
 *
 * 2 endpoint:
 *   - get_tracking_settings (GET) — tüm tracker ayarlarını oku
 *   - save_tracking_settings (POST, { settings }) — güncelle
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const ENDPOINT_GET = "tradehub_core.api.tracking.get_tracking_settings";
const ENDPOINT_SAVE = "tradehub_core.api.tracking.save_tracking_settings";

export const useTrackingSettingsStore = defineStore("trackingSettings", () => {
  const settings = ref(null);
  const loading = ref(false);
  const saving = ref(false);
  const dirty = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.callMethodGET(ENDPOINT_GET);
      settings.value = res?.message ?? null;
    } catch (e) {
      error.value = e?.message || "Ayarlar yüklenemedi";
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    saving.value = true;
    error.value = null;
    try {
      await api.callMethod(ENDPOINT_SAVE, { settings: settings.value });
      dirty.value = false;
      return { ok: true };
    } catch (e) {
      error.value = e?.message || "Kaydedilemedi";
      return { ok: false };
    } finally {
      saving.value = false;
    }
  }

  function markDirty() {
    dirty.value = true;
  }

  return {
    settings,
    loading,
    saving,
    dirty,
    error,
    load,
    save,
    markDirty,
  };
});

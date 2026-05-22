/**
 * Social Proof Admin Settings Store
 *
 * 3 endpoint:
 *   - get_admin_settings (GET)
 *   - update_admin_settings (POST, { payload })
 *   - get_admin_preview_signals (POST, { threshold_overrides })
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const ENDPOINT_GET = "tradehub_core.api.social_proof.get_admin_settings";
const ENDPOINT_UPDATE = "tradehub_core.api.social_proof.update_admin_settings";
const ENDPOINT_PREVIEW = "tradehub_core.api.social_proof.get_admin_preview_signals";

// Backend `frappe.throw` mesajındaki anahtar kelime → form alanı eşlemesi.
// 6 threshold + 2 ttl = 8 alan.
const FIELD_ERROR_MAP = [
  ["sales", "sales"],
  ["favorites", "favorites"],
  ["cart_now", "cart_now"],
  ["views_24h", "views_24h"],
  ["distinct_buyers", "distinct_buyers"],
  ["seller_orders", "seller_orders"],
  ["Önbellek", "cache_ttl_seconds"],
  ["dedup", "view_dedup_seconds"],
];

export const useSocialProofSettingsStore = defineStore("socialProofSettings", () => {
  // ── state ─────────────────────────────────────────────
  const settings = ref(null);
  const samples = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const previewLoading = ref(false);
  const dirty = ref(false);
  const error = ref(null);
  const fieldErrors = ref({});

  // ── actions ───────────────────────────────────────────
  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.callMethodGET(ENDPOINT_GET);
      settings.value = res?.message ?? null;
      await fetchPreview();
    } catch (e) {
      error.value = e?.message || "Ayarlar yüklenemedi";
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    try {
      await api.callMethod(ENDPOINT_UPDATE, { payload: settings.value });
      dirty.value = false;
      await fetchPreview();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Kaydedilemedi";
      error.value = msg;
      mapFieldError(msg);
      return { ok: false };
    } finally {
      saving.value = false;
    }
  }

  async function fetchPreview() {
    if (!settings.value) return;
    previewLoading.value = true;
    try {
      const res = await api.callMethod(ENDPOINT_PREVIEW, {
        threshold_overrides: settings.value.thresholds,
      });
      samples.value = res?.message?.samples ?? res?.samples ?? [];
    } catch {
      samples.value = [];
    } finally {
      previewLoading.value = false;
    }
  }

  function markDirty() {
    dirty.value = true;
    fieldErrors.value = {};
  }

  function mapFieldError(message) {
    if (!message) return;
    for (const [needle, field] of FIELD_ERROR_MAP) {
      if (message.includes(needle)) {
        fieldErrors.value = { ...fieldErrors.value, [field]: message };
        return;
      }
    }
  }

  return {
    // state
    settings,
    samples,
    loading,
    saving,
    previewLoading,
    dirty,
    error,
    fieldErrors,
    // actions
    load,
    save,
    fetchPreview,
    markDirty,
  };
});

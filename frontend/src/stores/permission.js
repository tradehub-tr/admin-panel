// FAZ 1.6 — Permission Console Pinia store.
//
// Süper Admin'in yetki yönetim ekranı state'i:
//   - overview (özet istatistikler)
//   - roles (rol profilleri listesi)
//   - users (tüm kullanıcılar)
//   - plans (subscription planlar)
//   - audit logs (ADL/RCL/POL)
//
// Backend: tradehub_core.api.v1.permission_console.*
//
// Detay: docs/yetki/TradeHub-Yetkilendirme-Mimarisi-v2.md

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/utils/api";

const API_BASE = "tradehub_core.api.v1.permission_console";

export const usePermissionStore = defineStore("permission", () => {
  // ── State ─────────────────────────────────────────────
  const overview = ref(null);
  const roles = ref([]);
  const selectedRole = ref(null);
  const users = ref([]);
  const plans = ref([]);
  const selectedPlan = ref(null);
  const decisionLogs = ref([]);
  const roleChangeLogs = ref([]);
  const overrideLogs = ref([]);
  const featureCatalogKeys = ref([]);

  const loading = ref(false);
  const error = ref(null);

  // ── Getters ───────────────────────────────────────────
  const platformRoles = computed(() => roles.value.filter((r) => r.category === "platform"));
  const sellerRoles = computed(() => roles.value.filter((r) => r.category === "seller"));
  const buyerRoles = computed(() => roles.value.filter((r) => r.category === "buyer"));
  const customRoles = computed(() => roles.value.filter((r) => r.category === "custom"));

  const activeUsersCount = computed(() => users.value.filter((u) => u.enabled).length);
  const inactiveUsersCount = computed(() => users.value.filter((u) => !u.enabled).length);

  // ── Helpers ───────────────────────────────────────────
  function _wrapAsync(label, fn) {
    return async (...args) => {
      loading.value = true;
      error.value = null;
      try {
        return await fn(...args);
      } catch (err) {
        error.value = err.message || `${label} başarısız`;
        throw err;
      } finally {
        loading.value = false;
      }
    };
  }

  function _frappeCall(method, params = null) {
    const fullMethod = `${API_BASE}.${method}`;
    // POST kullanırız (CSRF + permission_console write endpoint'leri var)
    return api.callMethod(fullMethod, params || {});
  }

  function _frappeGet(method, params = null) {
    const fullMethod = `${API_BASE}.${method}`;
    return api.callMethodGET(fullMethod, params || {});
  }

  // ── Actions ───────────────────────────────────────────
  const fetchOverview = _wrapAsync("Özet bilgi", async () => {
    const res = await _frappeGet("get_overview");
    overview.value = res?.message || res;
    return overview.value;
  });

  const fetchRoles = _wrapAsync("Roller", async () => {
    const res = await _frappeGet("list_roles");
    roles.value = res?.message || res || [];
    return roles.value;
  });

  const fetchRoleDetail = _wrapAsync("Rol detayı", async (name) => {
    const res = await _frappeGet("get_role_profile_detail", { name });
    selectedRole.value = res?.message || res;
    return selectedRole.value;
  });

  const fetchUsers = _wrapAsync("Kullanıcılar", async (filters = {}) => {
    const res = await _frappeGet("list_users", filters);
    users.value = res?.message || res || [];
    return users.value;
  });

  const fetchPlans = _wrapAsync("Planlar", async () => {
    const res = await _frappeGet("list_subscription_plans");
    plans.value = res?.message || res || [];
    return plans.value;
  });

  const fetchPlanDetail = _wrapAsync("Plan detayı", async (planCode) => {
    const res = await _frappeGet("get_plan_detail", { plan_code: planCode });
    selectedPlan.value = res?.message || res;
    return selectedPlan.value;
  });

  const updatePlan = _wrapAsync("Plan güncelle", async (planCode, capabilityFlags, quotaLimits) => {
    const payload = { plan_code: planCode };
    if (capabilityFlags !== undefined) payload.capability_flags = capabilityFlags;
    if (quotaLimits !== undefined) payload.quota_limits = quotaLimits;
    const res = await _frappeCall("update_plan_capabilities", payload);
    return res?.message || res;
  });

  // FAZ 4.1 — Dinamik Pricing
  const fetchPlanFullDetail = _wrapAsync("Plan tam detayı", async (planCode) => {
    const res = await _frappeGet("get_plan_full_detail", { plan_code: planCode });
    selectedPlan.value = res?.message || res;
    return selectedPlan.value;
  });

  const updatePricingPlan = _wrapAsync(
    "Pricing plan güncelle",
    async (planCode, { display, capabilityFlags, quotaLimits, pricingFeatures } = {}) => {
      const payload = { plan_code: planCode };
      if (display !== undefined) payload.display = display;
      if (capabilityFlags !== undefined) payload.capability_flags = capabilityFlags;
      if (quotaLimits !== undefined) payload.quota_limits = quotaLimits;
      if (pricingFeatures !== undefined) payload.pricing_features = pricingFeatures;
      const res = await _frappeCall("update_pricing_plan", payload);
      return res?.message || res;
    }
  );

  const fetchFeatureCatalogKeys = _wrapAsync("Feature Catalog", async () => {
    const res = await _frappeGet("list_feature_catalog_keys");
    featureCatalogKeys.value = res?.message || res || [];
    return featureCatalogKeys.value;
  });

  const fetchDecisionLogs = _wrapAsync("Karar log'ları", async (filters = {}) => {
    const res = await _frappeGet("list_decision_logs", filters);
    decisionLogs.value = res?.message || res || [];
    return decisionLogs.value;
  });

  const fetchRoleChangeLogs = _wrapAsync("Rol değişim log'ları", async (filters = {}) => {
    const res = await _frappeGet("list_role_change_logs", filters);
    roleChangeLogs.value = res?.message || res || [];
    return roleChangeLogs.value;
  });

  const fetchOverrideLogs = _wrapAsync("Override log'ları", async (filters = {}) => {
    const res = await _frappeGet("list_override_logs", filters);
    overrideLogs.value = res?.message || res || [];
    return overrideLogs.value;
  });

  function clearError() {
    error.value = null;
  }

  return {
    // state
    overview,
    roles,
    selectedRole,
    users,
    plans,
    selectedPlan,
    decisionLogs,
    roleChangeLogs,
    overrideLogs,
    featureCatalogKeys,
    loading,
    error,
    // getters
    platformRoles,
    sellerRoles,
    buyerRoles,
    customRoles,
    activeUsersCount,
    inactiveUsersCount,
    // actions
    fetchOverview,
    fetchRoles,
    fetchRoleDetail,
    fetchUsers,
    fetchPlans,
    fetchPlanDetail,
    fetchPlanFullDetail,
    updatePlan,
    updatePricingPlan,
    fetchFeatureCatalogKeys,
    fetchDecisionLogs,
    fetchRoleChangeLogs,
    fetchOverrideLogs,
    clearError,
  };
});

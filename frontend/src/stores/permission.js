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
  // Faz B — Feature Catalog yönetim ekranı verisi
  const featureCatalog = ref({ features: [], categories: [] });
  // Faz J — Plan Feature matrix (admin Paket İçeriği sekmesi)
  const planFeaturesMatrix = ref(null); // { plans: [...], categories: [...] }

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

  const updateUser = _wrapAsync("Kullanıcı güncelle", async (user, payload = {}) => {
    const res = await _frappeCall("update_user", { user, ...payload });
    return res?.message || res;
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
    async (
      planCode,
      { display, capabilityFlags, quotaLimits, pricingFeatures, quotaTiers } = {}
    ) => {
      const payload = { plan_code: planCode };
      if (display !== undefined) payload.display = display;
      if (capabilityFlags !== undefined) payload.capability_flags = capabilityFlags;
      if (quotaLimits !== undefined) payload.quota_limits = quotaLimits;
      if (pricingFeatures !== undefined) payload.pricing_features = pricingFeatures;
      if (quotaTiers !== undefined) payload.quota_tiers = quotaTiers;
      const res = await _frappeCall("update_pricing_plan", payload);
      return res?.message || res;
    }
  );

  // ── Trial Ayarları (global: hangi paket + kaç gün + aktif) ──
  const getTrialSettings = _wrapAsync("Trial ayarları", async () => {
    const res = await _frappeGet("get_trial_settings");
    return res?.message || res || {};
  });

  const updateTrialSettings = _wrapAsync(
    "Trial ayarları kaydı",
    async ({ enabled, planCode, days, ctaLabel } = {}) => {
      const res = await _frappeCall("update_trial_settings", {
        enabled: enabled ? 1 : 0,
        plan_code: planCode || "",
        days: Number(days) || 0,
        cta_label: ctaLabel || "",
      });
      return res?.message || res || {};
    }
  );

  const fetchFeatureCatalogKeys = _wrapAsync("Feature Catalog", async () => {
    const res = await _frappeGet("list_feature_catalog_keys");
    featureCatalogKeys.value = res?.message || res || [];
    return featureCatalogKeys.value;
  });

  // Faz J — Plan Feature matrix endpoint'leri (plan_features modülü)
  const fetchPlanFeaturesMatrix = _wrapAsync("Plan Feature matris", async () => {
    const res = await api.callMethodGET("tradehub_core.api.v1.plan_features.list_plan_features");
    planFeaturesMatrix.value = res?.message || res;
    return planFeaturesMatrix.value;
  });

  const bulkUpdatePlanFeatures = _wrapAsync("Plan Feature kaydet", async (updates) => {
    const res = await api.callMethod(
      "tradehub_core.api.v1.plan_features.bulk_update_plan_features",
      { updates: JSON.stringify(updates) }
    );
    return res?.message || res;
  });

  // Faz K — Feature Catalog CRUD (feature_catalog modülü)
  // Matris satırlarının kendisini (özellikleri) ekler/günceller/siler.
  const fetchFeatureCatalog = _wrapAsync("Özellik kataloğu", async () => {
    const res = await api.callMethodGET(
      "tradehub_core.api.v1.feature_catalog.list_feature_catalog"
    );
    featureCatalog.value = res?.message || res || { features: [], categories: [] };
    return featureCatalog.value;
  });

  const reorderFeatureCatalog = _wrapAsync("Özellik sıralama", async (orders) => {
    const res = await api.callMethod("tradehub_core.api.v1.feature_catalog.reorder_features", {
      orders: JSON.stringify(orders),
    });
    return res?.message || res;
  });

  const createFeatureCatalog = _wrapAsync("Özellik oluştur", async (payload) => {
    const res = await api.callMethod(
      "tradehub_core.api.v1.feature_catalog.create_feature",
      payload
    );
    return res?.message || res;
  });

  const updateFeatureCatalog = _wrapAsync("Özellik güncelle", async (payload) => {
    const res = await api.callMethod(
      "tradehub_core.api.v1.feature_catalog.update_feature",
      payload
    );
    return res?.message || res;
  });

  const deleteFeatureCatalog = _wrapAsync("Özellik sil", async (featureKey, hard = 0) => {
    const res = await api.callMethod("tradehub_core.api.v1.feature_catalog.delete_feature", {
      feature_key: featureKey,
      hard,
    });
    return res?.message || res;
  });

  const restoreFeatureCatalog = _wrapAsync("Özellik geri al", async (featureKey) => {
    const res = await api.callMethod("tradehub_core.api.v1.feature_catalog.restore_feature", {
      feature_key: featureKey,
    });
    return res?.message || res;
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

  // ── Role Profile CRUD (Süper Admin) ────────────────────
  const assignableRoles = ref([]);

  const fetchAssignableRoles = _wrapAsync("Atanabilir roller", async () => {
    const res = await _frappeGet("list_assignable_roles");
    assignableRoles.value = res?.message || res || [];
    return assignableRoles.value;
  });

  const createRoleProfile = _wrapAsync(
    "Rol profili oluştur",
    async (roleProfile, rolesList, parentProfile) => {
      const payload = {
        role_profile: roleProfile,
        roles: rolesList || [],
      };
      if (parentProfile) payload.parent_profile = parentProfile;
      const res = await _frappeCall("create_role_profile", payload);
      await fetchRoles();
      return res?.message || res;
    }
  );

  const updateRoleProfile = _wrapAsync("Rol profili güncelle", async (name, rolesList) => {
    const res = await _frappeCall("update_role_profile", {
      name,
      roles: rolesList || [],
    });
    await fetchRoles();
    if (selectedRole.value?.name === name) {
      await fetchRoleDetail(name);
    }
    return res?.message || res;
  });

  const deleteRoleProfile = _wrapAsync("Rol profili sil", async (name) => {
    const res = await _frappeCall("delete_role_profile", { name });
    if (selectedRole.value?.name === name) {
      selectedRole.value = null;
    }
    await fetchRoles();
    return res?.message || res;
  });

  // ── Subscription Plan CRUD (Süper Admin) ───────────────
  const createSubscriptionPlan = _wrapAsync("Plan oluştur", async (payload) => {
    const res = await _frappeCall("create_subscription_plan", payload);
    await fetchPlans();
    return res?.message || res;
  });

  const deleteSubscriptionPlan = _wrapAsync("Plan sil", async (planCode) => {
    const res = await _frappeCall("delete_subscription_plan", { plan_code: planCode });
    if (selectedPlan.value?.plan_code === planCode) {
      selectedPlan.value = null;
    }
    await fetchPlans();
    return res?.message || res;
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
    planFeaturesMatrix,
    assignableRoles,
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
    updateUser,
    fetchPlans,
    fetchPlanDetail,
    fetchPlanFullDetail,
    updatePlan,
    updatePricingPlan,
    getTrialSettings,
    updateTrialSettings,
    fetchFeatureCatalogKeys,
    fetchPlanFeaturesMatrix,
    bulkUpdatePlanFeatures,
    featureCatalog,
    fetchFeatureCatalog,
    reorderFeatureCatalog,
    createFeatureCatalog,
    updateFeatureCatalog,
    deleteFeatureCatalog,
    restoreFeatureCatalog,
    fetchDecisionLogs,
    fetchRoleChangeLogs,
    fetchOverrideLogs,
    fetchAssignableRoles,
    createRoleProfile,
    updateRoleProfile,
    deleteRoleProfile,
    createSubscriptionPlan,
    deleteSubscriptionPlan,
    clearError,
  };
});

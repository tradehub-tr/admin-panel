<template>
  <div class="permission-console">
    <!-- Header -->
    <header class="pc-header">
      <div>
        <h1 class="pc-title">{{ t("permissionConsole.title") }}</h1>
        <p class="pc-subtitle">
          {{ t("permissionConsole.subtitle") }}
        </p>
      </div>
      <button
        type="button"
        class="btn-refresh"
        :disabled="overviewLoading"
        :aria-busy="overviewLoading"
        @click="refresh"
      >
        <RefreshCw :size="14" :class="{ spin: overviewLoading }" />
        {{ t("permissionConsole.refresh") }}
      </button>
    </header>

    <!-- Overview KPI cards -->
    <section class="overview-grid" :aria-busy="overviewLoading">
      <article class="kpi-card kpi--users">
        <header class="kpi-head">
          <Users :size="16" />
          <span>{{ t("permissionConsole.activeUsers") }}</span>
        </header>
        <div class="kpi-value">{{ overview?.enabled_users ?? "—" }}</div>
        <footer class="kpi-foot">
          /{{ overview?.total_users ?? 0 }} {{ t("permissionConsole.total") }}
        </footer>
      </article>

      <article class="kpi-card kpi--sellers">
        <header class="kpi-head">
          <Store :size="16" />
          <span>{{ t("permissionConsole.sellers") }}</span>
        </header>
        <div class="kpi-value">{{ overview?.total_sellers ?? "—" }}</div>
        <footer class="kpi-foot">
          {{ overview?.active_subscriptions ?? 0 }} {{ t("permissionConsole.activeSubscriptions") }}
        </footer>
      </article>

      <article class="kpi-card kpi--plans">
        <header class="kpi-head">
          <CreditCard :size="16" />
          <span>{{ t("permissionConsole.plan") }}</span>
        </header>
        <div class="kpi-value">{{ overview?.total_plans ?? "—" }}</div>
        <footer class="kpi-foot">{{ t("permissionConsole.activePackage") }}</footer>
      </article>

      <article class="kpi-card kpi--decisions">
        <header class="kpi-head">
          <Activity :size="16" />
          <span>{{ t("permissionConsole.decisions24h") }}</span>
        </header>
        <div class="kpi-value">{{ overview?.decisions_24h ?? "—" }}</div>
        <footer class="kpi-foot">
          {{ overview?.denies_24h ?? 0 }} {{ t("permissionConsole.denied") }}
        </footer>
      </article>

      <article
        class="kpi-card kpi--alerts"
        :class="{ 'is-alert': (overview?.high_severity_24h ?? 0) > 0 }"
      >
        <header class="kpi-head">
          <ShieldAlert :size="16" />
          <span>HIGH (24h)</span>
        </header>
        <div class="kpi-value">{{ overview?.high_severity_24h ?? "—" }}</div>
        <footer class="kpi-foot">{{ t("permissionConsole.suspiciousEvent") }}</footer>
      </article>

      <article class="kpi-card kpi--roles">
        <header class="kpi-head">
          <UserCog :size="16" />
          <span>{{ t("permissionConsole.roleChanges7d") }}</span>
        </header>
        <div class="kpi-value">{{ overview?.role_changes_7d ?? "—" }}</div>
        <footer class="kpi-foot">
          {{ overview?.overrides_7d ?? 0 }} {{ t("permissionConsole.override") }}
        </footer>
      </article>
    </section>

    <!-- Tabs -->
    <nav class="pc-tabs" role="tablist" :aria-label="t('permissionConsole.tabsAriaLabel')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :class="['tab-btn', { 'is-active': activeTab === tab.id }]"
        @click="setActiveTab(tab.id)"
      >
        <component :is="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </nav>

    <!-- Tab content -->
    <div class="tab-content card" role="tabpanel">
      <PermissionOverviewTab v-if="activeTab === 'overview'" @switch-tab="setActiveTab" />
      <RolesTab v-else-if="activeTab === 'roles'" @switch-tab="setActiveTab" />
      <CapabilityMatrixTab v-else-if="activeTab === 'capabilities'" />
      <ModuleMatrixTab v-else-if="activeTab === 'modules'" />
      <div v-else-if="activeTab === 'masking'" class="embed-host">
        <ComplianceMaskMatrixView />
      </div>
      <div v-else-if="activeTab === 'simulator'" class="embed-host">
        <AuthorizationSimulatorView />
      </div>
      <div v-else-if="activeTab === 'anomaly'" class="embed-host">
        <AnomalyDashboardView />
      </div>
      <PlansTab v-else-if="activeTab === 'plans'" />
      <FeatureCatalogTab v-else-if="activeTab === 'feature-catalog'" />
      <PlanComparisonTab v-else-if="activeTab === 'comparison'" />
      <UsersTab v-else-if="activeTab === 'users'" />
      <AuditLogTab v-else-if="activeTab === 'audit'" />
    </div>

    <!-- Error toast -->
    <Transition name="toast">
      <div v-if="error" class="error-toast" role="alert">
        <AlertCircle :size="16" />
        <span>{{ error }}</span>
        <button
          type="button"
          class="error-close"
          :aria-label="t('permissionConsole.close')"
          @click="clearError"
        >
          <X :size="14" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { storeToRefs } from "pinia";
  import {
    Shield,
    ShieldCheck,
    LayoutGrid,
    LayoutDashboard,
    EyeOff,
    ScanSearch,
    AlertTriangle,
    CreditCard,
    Tags,
    Table,
    Users,
    Store,
    Activity,
    ShieldAlert,
    UserCog,
    FileSearch,
    AlertCircle,
    RefreshCw,
    X,
  } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";
  import RolesTab from "@/views/permission/RolesTab.vue";
  import PermissionOverviewTab from "@/components/system/PermissionOverviewTab.vue";
  import CapabilityMatrixTab from "@/components/system/CapabilityMatrixTab.vue";
  import ModuleMatrixTab from "@/components/system/ModuleMatrixTab.vue";
  import ComplianceMaskMatrixView from "@/views/system/ComplianceMaskMatrixView.vue";
  import AuthorizationSimulatorView from "@/views/system/AuthorizationSimulatorView.vue";
  import AnomalyDashboardView from "@/views/system/AnomalyDashboardView.vue";
  import PlansTab from "@/views/permission/PlansTab.vue";
  import FeatureCatalogTab from "@/views/permission/FeatureCatalogTab.vue";
  import PlanComparisonTab from "@/views/permission/PlanComparisonTab.vue";
  import UsersTab from "@/views/permission/UsersTab.vue";
  import AuditLogTab from "@/views/permission/AuditLogTab.vue";

  const { t } = useI18n();
  const store = usePermissionStore();
  const { overview, error } = storeToRefs(store);
  const overviewLoading = ref(false);

  const tabs = [
    { id: "overview", label: t("permissionConsole.tabOverview"), icon: LayoutDashboard },
    { id: "roles", label: t("permissionConsole.tabRoles"), icon: Shield },
    { id: "capabilities", label: t("permissionConsole.tabCapabilities"), icon: ShieldCheck },
    { id: "modules", label: t("permissionConsole.tabModules"), icon: LayoutGrid },
    { id: "masking", label: t("permissionConsole.tabMasking"), icon: EyeOff },
    { id: "simulator", label: t("permissionConsole.tabSimulator"), icon: ScanSearch },
    { id: "anomaly", label: t("permissionConsole.tabAnomaly"), icon: AlertTriangle },
    { id: "plans", label: t("permissionConsole.tabPlans"), icon: CreditCard },
    { id: "feature-catalog", label: t("permissionConsole.tabFeatureCatalog"), icon: Tags },
    { id: "comparison", label: t("permissionConsole.tabComparison"), icon: Table },
    { id: "users", label: t("permissionConsole.tabUsers"), icon: Users },
    { id: "audit", label: t("permissionConsole.tabAudit"), icon: FileSearch },
  ];

  const VALID_TABS = new Set(tabs.map((t) => t.id));
  const DEFAULT_TAB = "overview";

  // Sprint 6 — tab seçimi URL query'sinde persist:
  //   /permission-console?tab=capabilities → deep link + browser back/forward
  // NOT: vue-router useRoute/useRouter Vite Rollup tree-shake'ine takılıyor
  // (build çıktısında drop ediliyor) → native History API ile bypass.

  function readQuery() {
    const out = {};
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of sp.entries()) out[k] = v;
    return out;
  }

  function writeQuery(next) {
    const sp = new URLSearchParams();
    for (const k in next) {
      if (next[k] !== undefined && next[k] !== null && next[k] !== "") {
        sp.set(k, next[k]);
      }
    }
    const qs = sp.toString();
    const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(window.history.state, "", url);
  }

  function resolveTabFromQuery() {
    const q = readQuery().tab;
    return typeof q === "string" && VALID_TABS.has(q) ? q : DEFAULT_TAB;
  }

  const activeTab = ref(resolveTabFromQuery());

  /**
   * Tab değiştir + opsiyonel context query parametreleri.
   *   setActiveTab("capabilities")
   *   setActiveTab("capabilities", { profile: "Seller Manager" }) // RolesTab → CapabilityMatrixTab
   */
  function setActiveTab(id, context = null) {
    if (!VALID_TABS.has(id)) return;
    activeTab.value = id;
    const current = readQuery();
    if (id === DEFAULT_TAB && !context) {
      if (current.tab) {
        const { tab: _tab, ...rest } = current;
        writeQuery(rest);
      }
      return;
    }
    const next = { ...current, tab: id };
    // Context query'leri (profile, module vs.) ekle veya temizle
    if (context && typeof context === "object") {
      for (const k in context) {
        if (context[k]) next[k] = context[k];
        else delete next[k];
      }
    }
    writeQuery(next);
  }

  // Browser back/forward veya başka bir yerden gelen query değişimini yakala
  function onPopState() {
    const next = readQuery().tab;
    const resolved = typeof next === "string" && VALID_TABS.has(next) ? next : DEFAULT_TAB;
    if (resolved !== activeTab.value) {
      activeTab.value = resolved;
    }
  }
  onMounted(() => window.addEventListener("popstate", onPopState));
  onUnmounted(() => window.removeEventListener("popstate", onPopState));

  function clearError() {
    store.clearError?.();
  }

  async function refresh() {
    overviewLoading.value = true;
    try {
      await store.fetchOverview();
    } catch {
      // Hata banner üzerinden görünür
    } finally {
      overviewLoading.value = false;
    }
  }

  onMounted(refresh);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .permission-console {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  // ── Header ────────────────────────────────────────────────
  .pc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .pc-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: $l-text-900;
    letter-spacing: -0.01em;

    @include dark {
      color: $d-text-max;
    }
  }
  .pc-subtitle {
    margin: 0.25rem 0 0;
    color: $l-text-500;
    font-size: 0.875rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Refresh button ────────────────────────────────────────
  .btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    background: $l-bg;
    border: 1px solid $l-border;
    color: $l-text-700;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-base;

    &:hover:not(:disabled) {
      border-color: $brand;
      color: $brand;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spin {
      animation: pc-spin 0.8s linear infinite;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;

      &:hover:not(:disabled) {
        border-color: $brand-light;
        color: $brand-light;
      }
    }
  }
  @keyframes pc-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // ── KPI grid ──────────────────────────────────────────────
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.85rem;
  }

  .kpi-card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 1rem 1.1rem;
  }

  .kpi-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .kpi-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: $l-text-900;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $d-text-max;
    }
  }

  .kpi-foot {
    font-size: 0.72rem;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // Renk vurguları (sade — sol border accent)
  .kpi--users {
    border-left: 3px solid $brand;
  }
  .kpi--sellers {
    border-left: 3px solid $c-info;
  }
  .kpi--plans {
    border-left: 3px solid #8b5cf6;
  }
  .kpi--decisions {
    border-left: 3px solid $c-success;
  }
  .kpi--alerts {
    border-left: 3px solid $c-warning;

    &.is-alert {
      border-left-color: $c-error;
      background: rgba($c-error, 0.04);

      .kpi-value {
        color: $c-error;
      }
      @include dark {
        background: rgba($c-error, 0.08) !important;
      }
    }
  }
  .kpi--roles {
    border-left: 3px solid $brand-light;
  }

  // ── Tabs ──────────────────────────────────────────────────
  .pc-tabs {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    border-bottom: 1px solid $l-border;
    overflow-x: auto;

    @include dark {
      border-bottom-color: $d-border;
    }
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: transparent;
    border: none;
    padding: 0.7rem 1rem;
    color: $l-text-500;
    font-size: 0.875rem;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: all $t-base;

    &:hover:not(.is-active) {
      // Hover state token-bazlı: light mode'da marka rengi tonunda subtle bg,
      // dark mode'da elevated panel rengi — yazı her durumda okunabilir kalır.
      background: rgba($brand, 0.08);
      color: $brand;
    }
    &.is-active {
      color: $brand;
      border-bottom-color: $brand;
    }

    @include dark {
      color: $d-text-muted;

      &:hover:not(.is-active) {
        background: $d-bg-hover;
        color: $brand-light;
      }
      &.is-active {
        color: $brand-light;
        border-bottom-color: $brand-light;
      }
    }
  }

  // ── Tab content ───────────────────────────────────────────
  .tab-content {
    min-height: 400px;
    padding: 1.25rem;
  }

  // Embed edilen mevcut view'lar (ComplianceMaskMatrixView, AuthorizationSimulatorView,
  // AnomalyDashboardView) kendi padding + max-width ile geliyor. Tab içinde çift
  // padding'i sıfırla, max-width sınırını kaldır.
  .embed-host {
    margin: -1.25rem;

    :deep(.compliance-matrix-page),
    :deep(.auth-simulator-page),
    :deep(.anomaly-dashboard) {
      padding: 1.25rem;
      max-width: none;
    }
  }

  // ── Error toast ───────────────────────────────────────────
  .error-toast {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    max-width: 420px;
    padding: 0.75rem 1rem;
    background: $l-bg;
    border: 1px solid $c-error;
    border-left: 3px solid $c-error;
    color: $c-error;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(#000, 0.1);

    @include dark {
      background: $d-bg-card;
      box-shadow: 0 6px 24px rgba(#000, 0.5);
    }
  }
  .error-close {
    margin-left: auto;
    background: transparent;
    border: none;
    color: $c-error;
    cursor: pointer;
    padding: 0.15rem;
    display: inline-flex;
    border-radius: 4px;

    &:hover {
      background: rgba($c-error, 0.1);
    }
  }

  // Toast transition
  .toast-enter-active,
  .toast-leave-active {
    transition: all $t-spring;
  }
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 720px) {
    .permission-console {
      padding: 1rem;
    }
    .overview-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .kpi-value {
      font-size: 1.5rem;
    }
    .tab-btn {
      padding: 0.6rem 0.7rem;
      font-size: 0.8rem;
    }
  }
  @media (max-width: 420px) {
    .overview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

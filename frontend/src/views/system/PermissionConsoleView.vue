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
        data-tour="perm-refresh"
        :disabled="overviewLoading"
        :aria-busy="overviewLoading"
        @click="refresh"
      >
        <RefreshCw :size="14" :class="{ spin: overviewLoading }" />
        {{ t("permissionConsole.refresh") }}
      </button>
    </header>

    <!-- V1 mobil: üstte yapışkan yatay chip rail — dikey ray ≤980px'te buna dönüşür -->
    <nav
      ref="chipRail"
      class="chip-rail"
      role="tablist"
      :aria-label="t('permissionConsole.tabsAriaLabel')"
    >
      <template v-for="(group, gi) in tabGroups" :key="group.label">
        <button
          v-for="tab in group.tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="['chip', { 'is-active': activeTab === tab.id }]"
          @click="setActiveTab(tab.id)"
        >
          <component :is="tab.icon" :size="14" />
          {{ tab.label }}
        </button>
        <span v-if="gi < tabGroups.length - 1" class="chip-sep" aria-hidden="true"></span>
      </template>
    </nav>

    <!-- Overview KPI cards — mobilde yatay kaydırmalı karusel (V3) -->
    <section
      ref="kpiRail"
      class="overview-grid"
      :aria-busy="overviewLoading"
      @scroll.passive="onKpiScroll"
    >
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

    <!-- Karusel sayfa noktaları (yalnız mobil görünür) -->
    <div class="kpi-dots" aria-hidden="true">
      <span v-for="i in KPI_COUNT" :key="i" :class="{ 'is-on': kpiPage === i - 1 }" />
    </div>

    <!-- Tabs (dikey ray) + içerik -->
    <div class="pc-body">
      <nav
        class="pc-tabs"
        role="tablist"
        data-tour="perm-tabs"
        :aria-label="t('permissionConsole.tabsAriaLabel')"
      >
        <div v-for="group in tabGroups" :key="group.label" class="pc-tab-group">
          <span class="pc-group-label">{{ group.label }}</span>
          <button
            v-for="tab in group.tabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :class="['tab-btn', { 'is-active': activeTab === tab.id }]"
            @click="setActiveTab(tab.id)"
          >
            <component :is="tab.icon" :size="16" />
            {{ tab.label }}
          </button>
        </div>
      </nav>

      <!-- Tab content -->
      <div class="tab-content card" role="tabpanel" data-tour="perm-content">
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
        <PlansTab v-else-if="activeTab === 'plans'" @switch-tab="setActiveTab" />
        <FeatureCatalogTab v-else-if="activeTab === 'feature-catalog'" />
        <PlanComparisonTab v-else-if="activeTab === 'comparison'" />
        <UsersTab v-else-if="activeTab === 'users'" />
        <AuditLogTab v-else-if="activeTab === 'audit'" />
      </div>
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
  import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
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
  import { usePageTour } from "@/composables/usePageTour";
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

  // Sayfa-içi onboarding: sekme çubuğu → aktif sekme içeriği → verileri yenile.
  usePageTour("permission-console", () => [
    {
      target: '[data-tour="perm-tabs"]',
      title: t("tourSteps.page.permTabs_t"),
      desc: t("tourSteps.page.permTabs_d"),
    },
    {
      target: '[data-tour="perm-content"]',
      title: t("tourSteps.page.permContent_t"),
      desc: t("tourSteps.page.permContent_d"),
    },
    {
      target: '[data-tour="perm-refresh"]',
      title: t("tourSteps.page.permRefresh_t"),
      desc: t("tourSteps.page.permRefresh_d"),
    },
  ]);

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

  // Dikey ray gruplaması — sekmeler mantıksal başlıklar altında toplanır.
  const TAB_GROUPS = [
    { labelKey: "groupGeneral", ids: ["overview"] },
    { labelKey: "groupAccess", ids: ["roles", "capabilities", "modules"] },
    { labelKey: "groupSecurity", ids: ["masking", "simulator", "anomaly"] },
    { labelKey: "groupPlans", ids: ["plans", "feature-catalog", "comparison"] },
    { labelKey: "groupManagement", ids: ["users", "audit"] },
  ];
  const tabById = Object.fromEntries(tabs.map((tb) => [tb.id, tb]));
  const tabGroups = TAB_GROUPS.map((g) => ({
    label: t(`permissionConsole.${g.labelKey}`),
    tabs: g.ids.map((id) => tabById[id]).filter(Boolean),
  }));

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

  // ── V1 mobil: chip rail — aktif sekmeyi görünür alana ortala ──
  const chipRail = ref(null);

  function centerActiveChip() {
    const rail = chipRail.value;
    const chip = rail?.querySelector(".is-active");
    // Desktop'ta rail display:none → clientWidth 0, hiçbir şey yapma.
    if (!rail || !chip || !rail.clientWidth) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({
      left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  watch(activeTab, () => nextTick(centerActiveChip));
  onMounted(() => nextTick(centerActiveChip));

  // ── V3 mobil: KPI karuseli sayfa noktaları ────────────────
  const KPI_COUNT = 6;
  const kpiRail = ref(null);
  const kpiPage = ref(0);

  function onKpiScroll() {
    const el = kpiRail.value;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    kpiPage.value = Math.min(KPI_COUNT - 1, Math.round((el.scrollLeft / max) * (KPI_COUNT - 1)));
  }

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
  @use "sass:color";
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
    transition: border-color $t-base, color $t-base;

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
    border-left: 3px solid #f5b800;
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

  // ── KPI karusel noktaları (yalnız mobilde görünür) ────────
  .kpi-dots {
    display: none;
    justify-content: center;
    gap: 5px;
    margin-top: -0.5rem;

    span {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: $l-border;
      // Bilinçli dot→pill morph: width kasıtlı (küçük gösterge, seyrek değişir).
      transition:
        width $t-base,
        border-radius $t-base,
        background-color $t-base;

      &.is-on {
        width: 16px;
        border-radius: 3px;
        background: $brand;
      }

      @include dark {
        background: $d-border;

        &.is-on {
          background: $brand;
        }
      }
    }
  }

  // ── Tabs (dikey ray) + içerik iki kolonlu yapı ────────────
  .pc-body {
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .pc-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid $l-border;
    border-radius: 12px;
    position: sticky;
    top: 1rem;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }
  }

  .pc-tab-group {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    & + & {
      margin-top: 0.35rem;
      padding-top: 0.6rem;
      border-top: 1px solid $l-border;

      @include dark {
        border-top-color: $d-border;
      }
    }
  }

  .pc-group-label {
    padding: 0.25rem 0.75rem 0.4rem;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    background: transparent;
    border: none;
    padding: 0.55rem 0.75rem;
    color: $l-text-500;
    font-size: 0.85rem;
    font-weight: 500;
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    position: relative;
    transition: background-color $t-base, color $t-base;

    svg {
      flex: 0 0 auto;
    }

    &:hover:not(.is-active) {
      // Hover state token-bazlı: light mode'da marka rengi tonunda subtle bg,
      // dark mode'da elevated panel rengi — yazı her durumda okunabilir kalır.
      background: rgba($brand, 0.08);
      color: $brand;
    }
    &.is-active {
      background: rgba($brand, 0.14);
      color: $brand;
      font-weight: 600;

      // Sol kenar mor şerit (aktif sekme göstergesi)
      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        border-radius: 0 3px 3px 0;
        background: $brand;
      }
    }

    @include dark {
      color: $d-text-muted;

      &:hover:not(.is-active) {
        background: $d-bg-hover;
        color: $brand-light;
      }
      &.is-active {
        background: rgba($brand, 0.16);
        color: $brand-light;

        &::before {
          background: $brand-light;
        }
      }
    }
  }

  // ── Tab content ───────────────────────────────────────────
  .tab-content {
    min-height: 400px;
    padding: 1.25rem;
    // Flex column içinde geniş içerik (CapabilityMatrixTab/ModuleMatrixTab
    // tabloları) kartı kendi genişliğine büyütüyordu; min-width:0 kartı
    // konsol genişliğine sabitler, tablo kendi .matrix-scroll'unda kayar.
    min-width: 0;
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

  // ── V1 mobil: yapışkan yatay chip rail ────────────────────
  // Yalnız ≤980px'te görünür; scroll konteynerinin üstüne yapışır.
  // Kenarlarda mask ile yumuşak solma — kaydırılabilirlik ipucu.
  .chip-rail {
    display: none;
    position: sticky;
    top: 0;
    z-index: 20;
    gap: 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
    background: rgba($l-bg, 0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid $l-border-alt;
    mask-image: linear-gradient(
      90deg,
      transparent,
      #000 1rem,
      #000 calc(100% - 1.5rem),
      transparent
    );

    &::-webkit-scrollbar {
      display: none;
    }

    @include dark {
      background: rgba($d-bg, 0.94);
      border-bottom-color: $d-border-inner;
    }
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    flex: 0 0 auto;
    white-space: nowrap;
    border: 1px solid $l-border;
    border-radius: 999px;
    background: $l-bg;
    color: $l-text-700;
    padding: 0.42rem 0.8rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color $t-base, border-color $t-base, color $t-base;

    svg {
      flex: 0 0 auto;
      color: $l-text-400;
    }

    // Aktif: mürekkep zemin + altın ikon (V1)
    &.is-active {
      background: $l-text-900;
      border-color: $l-text-900;
      color: #f7f5f0;

      svg {
        color: $brand;
      }
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;

      svg {
        color: $d-text-faint;
      }

      &.is-active {
        background: $brand;
        border-color: $brand;
        color: $brand-ink;

        svg {
          color: $brand-ink;
        }
      }
    }
  }

  .chip-sep {
    flex: 0 0 1px;
    align-self: stretch;
    margin: 0.3rem 0.15rem;
    background: $l-border;

    @include dark {
      background: $d-border;
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
    transition: opacity $t-spring, transform $t-spring;
  }
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  // ── Dar ekran (V1): dikey ray gizlenir, bölüm seçimi üstteki
  //    yapışkan chip rail'e taşınır ───────────────────────────
  @media (max-width: 980px) {
    .pc-body {
      grid-template-columns: 1fr;
    }
    .pc-tabs {
      display: none;
    }
    .chip-rail {
      display: flex;
      // Konsol padding'ini iptal ederek tam genişlik (KPI karuseliyle aynı desen)
      margin: -0.5rem -1.5rem 0;
      padding: 0.55rem 1.5rem;
    }
  }

  // ── Mobile (V3): KPI'lar tek satır kaydırmalı karusel ─────
  @media (max-width: 720px) {
    // page-content zaten 16px yan boşluk veriyor; konsolun kendi padding'i
    // tab-content ve overview padding'leriyle üst üste binip içeriği
    // 320px'te ~184px'e sıkıştırıyordu. Negatif margin ile page-content
    // padding'inin çoğunu geri alıp kartı neredeyse tam genişliğe çek
    // (kart kenarı ekrandan ~8px içeride kalır).
    .permission-console {
      padding: 0.75rem 0.25rem 1rem;
      margin: 0 -0.75rem;
      gap: 0.85rem;
    }

    .chip-rail {
      margin: -0.25rem -0.25rem 0;
      padding: 0.55rem 0.5rem;
    }

    .tab-content {
      padding: 0.75rem;
    }

    .overview-grid {
      display: flex;
      gap: 0.65rem;
      margin: 0 -0.25rem;
      padding: 0 0.25rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .kpi-card {
      flex: 0 0 9.75rem;
      scroll-snap-align: start;
      border-radius: 14px;
      padding: 0.8rem 0.85rem;
    }

    // Yan şerit vurgusu yerine tam çerçeve + renkli ikon çipi
    .kpi--users,
    .kpi--sellers,
    .kpi--plans,
    .kpi--decisions,
    .kpi--alerts,
    .kpi--roles {
      border-left: 1px solid $l-border-alt;

      @include dark {
        border-left-color: $d-border;
      }
    }
    .kpi--alerts.is-alert {
      border-color: rgba($c-error, 0.45);
    }

    .kpi-head {
      gap: 0.5rem;
      font-size: 0.62rem;
      line-height: 1.3;

      svg {
        box-sizing: content-box;
        padding: 0.3rem;
        border-radius: 8px;
      }
    }
    .kpi--users .kpi-head svg,
    .kpi--plans .kpi-head svg {
      background: rgba($brand, 0.16);
      color: color.adjust($brand, $lightness: -22%);

      @include dark {
        color: $brand-light;
      }
    }
    .kpi--sellers .kpi-head svg {
      background: rgba($c-info, 0.13);
      color: $c-info;
    }
    .kpi--decisions .kpi-head svg {
      background: rgba($c-success, 0.13);
      color: $c-success;
    }
    .kpi--alerts .kpi-head svg {
      background: rgba($c-warning, 0.15);
      color: $c-warning;
    }
    .kpi--roles .kpi-head svg {
      background: rgba($l-text-500, 0.12);
      color: $l-text-500;

      @include dark {
        background: rgba($d-text-muted, 0.15);
        color: $d-text-muted;
      }
    }

    .kpi-value {
      font-size: 1.35rem;
    }

    .kpi-dots {
      display: flex;
    }
  }
</style>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("crmDashboard.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("crmDashboard.subtitle") }}</p>
      </div>
      <div class="crm-hdr-actions flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("crmDashboard.refresh") }}</span>
        </button>
        <button class="hdr-btn-outlined" @click="$router.push('/crm/leads')">
          <AppIcon name="user-plus" :size="14" /><span>{{ t("crmDashboard.leads") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="$router.push('/crm/deals?view=kanban')">
          <AppIcon name="kanban-square" :size="14" /><span>{{ t("crmDashboard.pipeline") }}</span>
        </button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" data-tour="crmd-kpis">
      <router-link v-for="k in kpis" :key="k.key" :to="k.route" class="crm-kpi no-underline">
        <div class="flex items-center justify-between">
          <span class="crm-kpi-label">{{ k.label }}</span>
          <AppIcon :name="k.icon" :size="16" :class="k.iconCls" />
        </div>
        <span class="crm-kpi-value mt-2">{{ k.value }}</span>
        <span v-if="k.sub" class="crm-kpi-delta">{{ k.sub }}</span>
      </router-link>
    </div>

    <!-- Pipeline bar + Recent activities -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card p-5 lg:col-span-2" data-tour="crmd-pipeline">
        <div class="flex items-center justify-between mb-3">
          <h3 class="crm-section-title mb-0">{{ t("crmDashboard.dealFunnel") }}</h3>
          <router-link
            to="/crm/deals?view=kanban"
            class="text-[11px] text-brand-700 hover:underline"
            >{{ t("crmDashboard.kanbanLink") }}</router-link
          >
        </div>

        <div v-if="loadingPipeline" class="py-2">
          <Skeleton variant="kpi" :count="4" />
        </div>
        <div v-else-if="!pipeline.length" class="crm-empty">
          <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
          <h3>{{ t("crmDashboard.noDeals") }}</h3>
          <p>{{ t("crmDashboard.noDealsHint") }}</p>
        </div>
        <div v-else>
          <div class="crm-pipeline mb-4">
            <div
              v-for="(seg, i) in pipeline"
              :key="seg.status"
              class="crm-pipeline-seg"
              :style="{ flex: Math.max(seg.count, 0.3), background: colorFor(seg.status, i) }"
              :title="`${seg.status}: ${t('crmDashboard.itemsCount', { n: seg.count })} · ${format(seg.value)}`"
            >
              {{ seg.count }}
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div
              v-for="(seg, i) in pipeline"
              :key="seg.status"
              class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5"
            >
              <span
                class="w-2 h-2 rounded-full"
                :style="{ background: colorFor(seg.status, i) }"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-semibold truncate">
                  {{ seg.status || t("crmDashboard.unknown") }}
                </div>
                <div class="text-[10px] text-gray-400">
                  {{ t("crmDashboard.recordsCount", { n: seg.count }) }} · {{ format(seg.value) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-5" data-tour="crmd-recent">
        <div class="flex items-center justify-between mb-3">
          <h3 class="crm-section-title mb-0">{{ t("crmDashboard.recentActivities") }}</h3>
        </div>
        <div v-if="loadingRecent" class="py-2">
          <Skeleton variant="row" :count="6" />
        </div>
        <div v-else-if="!recent.length" class="crm-empty">
          <div class="icon"><AppIcon name="activity" :size="22" /></div>
          <h3>{{ t("crmDashboard.noActivity") }}</h3>
        </div>
        <div v-else class="space-y-2">
          <router-link
            v-for="r in recent.slice(0, 10)"
            :key="r.name"
            :to="refLink(r)"
            class="block p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-brand-50/40 dark:hover:bg-brand-500/10 transition-colors"
          >
            <div class="flex items-center gap-2 mb-1">
              <UserAvatar :email="r.owner" size="sm" />
              <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                {{ (r.owner || t("crmDashboard.system")).split("@")[0] }}
              </span>
              <span class="text-[10px] text-gray-400 ml-auto">
                <RelativeTime :value="r.creation" />
              </span>
            </div>
            <p class="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
              {{ stripHtml(r.content) }}
            </p>
            <div class="text-[10px] text-brand-700 mt-1">
              {{ refLabel(r) }}
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useCrmDashboardStore } from "@/stores/crmDashboard";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const dashboard = useCrmDashboardStore();

  // Sayfa-içi onboarding: KPI kartları → satış hunisi → son aktiviteler.
  usePageTour("crm-dashboard", () => [
    {
      target: '[data-tour="crmd-kpis"]',
      title: t("tourSteps.page.crmdKpis_t"),
      desc: t("tourSteps.page.crmdKpis_d"),
    },
    {
      target: '[data-tour="crmd-pipeline"]',
      title: t("tourSteps.page.crmdPipeline_t"),
      desc: t("tourSteps.page.crmdPipeline_d"),
    },
    {
      target: '[data-tour="crmd-recent"]',
      title: t("tourSteps.page.crmdRecent_t"),
      desc: t("tourSteps.page.crmdRecent_d"),
    },
  ]);

  const pipeline = ref([]);
  const recent = ref([]);
  const loadingPipeline = ref(false);
  const loadingRecent = ref(false);

  const counts = ref({
    openLeads: 0,
    wonDeals: 0,
    totalDeals: 0,
    openTasks: 0,
  });

  const kpis = computed(() => [
    {
      key: "leads",
      label: t("crmDashboard.kpiOpenLeads"),
      icon: "user-plus",
      iconCls: "text-brand-700",
      value: counts.value.openLeads,
      route: "/crm/leads",
      sub: t("crmDashboard.kpiOpenLeadsSub"),
    },
    {
      key: "deals",
      label: t("crmDashboard.kpiActiveDeals"),
      icon: "trending-up",
      iconCls: "text-blue-500",
      value: counts.value.totalDeals,
      route: "/crm/deals",
    },
    {
      key: "won",
      label: t("crmDashboard.kpiWon"),
      icon: "check-circle",
      iconCls: "text-emerald-500",
      value: counts.value.wonDeals,
      route: "/crm/deals?status=Won",
    },
    {
      key: "tasks",
      label: t("crmDashboard.kpiPendingTasks"),
      icon: "list-todo",
      iconCls: "text-amber-500",
      value: counts.value.openTasks,
      route: "/crm/tasks",
    },
  ]);

  const PIPELINE_COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#6366f1",
    "#14b8a6",
    "#f97316",
  ];
  function colorFor(status, i) {
    return PIPELINE_COLORS[i % PIPELINE_COLORS.length];
  }

  function format(v) {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(Number(v || 0));
    } catch {
      return v;
    }
  }

  function stripHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/<[^>]+>/g, "")
      .trim()
      .substring(0, 140);
  }

  function refLink(r) {
    const dt = r.reference_doctype;
    const name = r.reference_name;
    if (dt === "CRM Lead") return `/crm/leads/${encodeURIComponent(name)}`;
    if (dt === "CRM Deal") return `/crm/deals/${encodeURIComponent(name)}`;
    return `/app/${encodeURIComponent(dt)}/${encodeURIComponent(name)}`;
  }

  function refLabel(r) {
    return `${r.reference_doctype || "-"}: ${r.reference_name || "-"}`;
  }

  async function load() {
    loadingPipeline.value = true;
    loadingRecent.value = true;
    try {
      const [openLeads, wonDeals, totalDeals, openTasks] = await Promise.all([
        api.getCount("CRM Lead", [["status", "not in", ["Junk", "Unqualified"]]]),
        api.getCount("CRM Deal", [["status", "=", "Won"]]),
        api.getCount("CRM Deal", [["status", "not in", ["Won", "Lost"]]]),
        api.getCount("CRM Task", [["status", "not in", ["Done", "Canceled"]]]),
      ]);
      counts.value = {
        openLeads: openLeads.message || 0,
        wonDeals: wonDeals.message || 0,
        totalDeals: totalDeals.message || 0,
        openTasks: openTasks.message || 0,
      };
    } catch {
      /* yoksay */
    }
    try {
      pipeline.value = await dashboard.fetchPipelineByStatus();
    } catch {
      /* yoksay */
    } finally {
      loadingPipeline.value = false;
    }
    try {
      recent.value = await dashboard.fetchRecentActivities(12);
    } catch {
      /* yoksay */
    } finally {
      loadingRecent.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  /* Mobil: 320px'te üç metinli başlık butonu (~330px) kullanılabilir ~288px'i
     aştığı için yatay taşma oluşuyor — wrap ile alt satıra kırılmasına izin ver. */
  @media (max-width: 767px) {
    .crm-hdr-actions {
      flex-wrap: wrap;
    }

    /* Kart içi p-5 (20px) dar ekranda içeriği gereksiz sıkıştırıyor → ~12px'e indir. */
    [data-tour="crmd-pipeline"],
    [data-tour="crmd-recent"] {
      padding: 0.75rem;
    }
  }
</style>

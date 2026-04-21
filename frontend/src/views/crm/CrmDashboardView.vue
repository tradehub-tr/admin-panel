<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM Özet</h1>
        <p class="text-xs text-gray-400">Satış hunisi, görevler ve son aktiviteler</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hdr-btn-outlined" @click="$router.push('/crm/leads')">
          <AppIcon name="user-plus" :size="14" /><span>Talepler</span>
        </button>
        <button class="hdr-btn-primary" @click="$router.push('/crm/deals?view=kanban')">
          <AppIcon name="kanban-square" :size="14" /><span>Pipeline</span>
        </button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="crm-section-title mb-0">Anlaşma Hunisi</h3>
          <router-link
            to="/crm/deals?view=kanban"
            class="text-[11px] text-violet-500 hover:underline"
            >Kanban →</router-link
          >
        </div>

        <div v-if="loadingPipeline" class="text-center py-8">
          <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
        </div>
        <div v-else-if="!pipeline.length" class="crm-empty">
          <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
          <h3>Henüz anlaşma yok</h3>
          <p>Yeni bir lead oluşturup dönüştür.</p>
        </div>
        <div v-else>
          <div class="crm-pipeline mb-4">
            <div
              v-for="(seg, i) in pipeline"
              :key="seg.status"
              class="crm-pipeline-seg"
              :style="{ flex: Math.max(seg.count, 0.3), background: colorFor(seg.status, i) }"
              :title="`${seg.status}: ${seg.count} adet · ${format(seg.value)}`"
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
                  {{ seg.status || "Bilinmiyor" }}
                </div>
                <div class="text-[10px] text-gray-400">
                  {{ seg.count }} kayıt · {{ format(seg.value) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="crm-section-title mb-0">Son Aktiviteler</h3>
        </div>
        <div v-if="loadingRecent" class="text-center py-8">
          <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
        </div>
        <div v-else-if="!recent.length" class="crm-empty">
          <div class="icon"><AppIcon name="activity" :size="22" /></div>
          <h3>Aktivite yok</h3>
        </div>
        <div v-else class="space-y-2">
          <router-link
            v-for="r in recent.slice(0, 10)"
            :key="r.name"
            :to="refLink(r)"
            class="block p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-violet-50/40 dark:hover:bg-violet-500/10 transition-colors"
          >
            <div class="flex items-center gap-2 mb-1">
              <UserAvatar :email="r.owner" size="sm" />
              <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                {{ (r.owner || "sistem").split("@")[0] }}
              </span>
              <span class="text-[10px] text-gray-400 ml-auto">
                <RelativeTime :value="r.creation" />
              </span>
            </div>
            <p class="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
              {{ stripHtml(r.content) }}
            </p>
            <div class="text-[10px] text-violet-500 mt-1">
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
  import { useCrmDashboardStore } from "@/stores/crmDashboard";
  import { useCrmStore } from "@/stores/crm";
  import { useCrmTaskStore } from "@/stores/crmTasks";
  import AppIcon from "@/components/common/AppIcon.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import api from "@/utils/api";

  const dashboard = useCrmDashboardStore();
  const crm = useCrmStore();
  const tasks = useCrmTaskStore();

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
      label: "Açık Talepler",
      icon: "user-plus",
      iconCls: "text-violet-500",
      value: counts.value.openLeads,
      route: "/crm/leads",
      sub: "Yeni + Takip + İletişim",
    },
    {
      key: "deals",
      label: "Aktif Anlaşmalar",
      icon: "trending-up",
      iconCls: "text-blue-500",
      value: counts.value.totalDeals,
      route: "/crm/deals",
    },
    {
      key: "won",
      label: "Kazanılan",
      icon: "check-circle",
      iconCls: "text-emerald-500",
      value: counts.value.wonDeals,
      route: "/crm/deals?status=Won",
    },
    {
      key: "tasks",
      label: "Bekleyen Görevler",
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

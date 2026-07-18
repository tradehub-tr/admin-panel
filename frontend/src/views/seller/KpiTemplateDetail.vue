<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
          @click="goBack"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <span
          class="text-[11px] font-mono font-semibold text-brand-800 bg-brand-50 dark:text-brand-500 dark:bg-brand-500/10 px-2.5 py-1 rounded-md"
          >{{ doc.template_code || docName }}</span
        >
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ doc.template_name || doc.name || t("kpiTemplateDetail.defaultTitle") }}
        </h1>
      </div>
      <span class="tpl-status-badge" :class="getTplStatusCls(doc.status)">
        <span class="tpl-dot"></span>{{ getTplStatusLabel(doc.status) }}
      </span>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-brand-700"></i>
    </div>

    <template v-else>
      <!-- Quick Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-brand-800">{{ doc.weight || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("kpiTemplateDetail.weight") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-blue-600">{{ doc.passing_score || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("kpiTemplateDetail.passingScore") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-emerald-600">{{ doc.total_weight || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("kpiTemplateDetail.totalWeight") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-amber-600">{{ doc.usage_count || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("kpiTemplateDetail.usage") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-sky-600">
            {{ (doc.average_score || 0).toFixed(1) }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("kpiTemplateDetail.avgScore") }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-0.5 border-b border-gray-200 mb-5" data-tour="ktd-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="detail-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <i :class="tab.icon" class="mr-1.5 text-[10px]"></i>{{ tab.label }}
        </button>
      </div>

      <!-- Tab: Detaylar -->
      <div v-if="activeTab === 'details'">
        <div class="card mb-5" data-tour="ktd-form">
          <h3 class="section-title">
            <i class="fas fa-info-circle text-brand-700 mr-2"></i
            >{{ t("kpiTemplateDetail.basicInfo") }}
          </h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.templateName") }}</label
              ><input :value="doc.template_name || doc.name" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.templateCode") }}</label
              ><input :value="doc.template_code || '-'" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.targetType") }}</label
              ><input :value="doc.target_type || '-'" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.status") }}</label>
              <div class="mt-1">
                <span class="tpl-status-badge" :class="getTplStatusCls(doc.status)"
                  ><span class="tpl-dot"></span>{{ getTplStatusLabel(doc.status) }}</span
                >
              </div>
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.version") }}</label
              ><input :value="doc.version || '-'" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.isDefault") }}</label
              ><input
                :value="doc.is_default ? t('kpiTemplateDetail.yes') : t('kpiTemplateDetail.no')"
                class="form-input"
                readonly
              />
            </div>
          </div>
        </div>
        <div class="card" data-tour="ktd-config">
          <h3 class="section-title">
            <i class="fas fa-sliders text-blue-500 mr-2"></i
            >{{ t("kpiTemplateDetail.evaluationSettings") }}
          </h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.evaluationPeriod") }}</label
              ><input :value="getPeriodLabel(doc.evaluation_period)" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.evaluationFrequency") }}</label
              ><input :value="getFreqLabel(doc.evaluation_frequency)" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.minOrders") }}</label
              ><input :value="doc.min_orders_required || 0" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.minDaysActive") }}</label
              ><input :value="doc.min_days_active || 0" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.scoringCurve") }}</label
              ><input :value="doc.scoring_curve || '-'" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.autoEvaluate") }}</label
              ><input
                :value="doc.auto_evaluate ? t('kpiTemplateDetail.yes') : t('kpiTemplateDetail.no')"
                class="form-input"
                readonly
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Bildirimler -->
      <div v-if="activeTab === 'notifications'">
        <div class="card">
          <h3 class="section-title">
            <i class="fas fa-bell text-amber-500 mr-2"></i
            >{{ t("kpiTemplateDetail.notificationSettings") }}
          </h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.notifyOnEvaluation") }}</label
              ><input
                :value="
                  doc.notify_on_evaluation ? t('kpiTemplateDetail.yes') : t('kpiTemplateDetail.no')
                "
                class="form-input"
                readonly
              />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.notifyOnThresholdBreach") }}</label
              ><input
                :value="
                  doc.notify_on_threshold_breach
                    ? t('kpiTemplateDetail.yes')
                    : t('kpiTemplateDetail.no')
                "
                class="form-input"
                readonly
              />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.notificationRecipients") }}</label
              ><input :value="doc.notification_recipients || '-'" class="form-input" readonly />
            </div>
            <div>
              <label class="form-label">{{ t("kpiTemplateDetail.lastEvaluation") }}</label
              ><input :value="formatDateTime(doc.last_evaluated_at)" class="form-input" readonly />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Açıklama -->
      <div v-if="activeTab === 'description'">
        <div class="card">
          <h3 class="section-title">
            <i class="fas fa-note-sticky text-gray-500 mr-2"></i
            >{{ t("kpiTemplateDetail.description") }}
          </h3>
          <div class="mt-3 p-3 bg-gray-50 rounded-lg min-h-[80px]">
            <p class="text-xs text-gray-600 whitespace-pre-wrap">
              {{ doc.description || t("kpiTemplateDetail.noDescription") }}
            </p>
          </div>
          <div v-if="doc.applicable_levels" class="mt-4">
            <label class="form-label">{{ t("kpiTemplateDetail.applicableLevels") }}</label>
            <p class="text-xs text-gray-600 mt-1">{{ doc.applicable_levels }}</p>
          </div>
          <div v-if="doc.applicable_categories" class="mt-4">
            <label class="form-label">{{ t("kpiTemplateDetail.applicableCategories") }}</label>
            <p class="text-xs text-gray-600 mt-1">{{ doc.applicable_categories }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const route = useRoute();

  // Sayfa-içi onboarding: tablar → temel bilgi formu → değerlendirme ayarları.
  usePageTour("kpi-template-detail", () => [
    {
      target: '[data-tour="ktd-tabs"]',
      title: t("tourSteps.page.ktdTabs_t"),
      desc: t("tourSteps.page.ktdTabs_d"),
    },
    {
      target: '[data-tour="ktd-form"]',
      title: t("tourSteps.page.ktdForm_t"),
      desc: t("tourSteps.page.ktdForm_d"),
    },
    {
      target: '[data-tour="ktd-config"]',
      title: t("tourSteps.page.ktdConfig_t"),
      desc: t("tourSteps.page.ktdConfig_d"),
    },
  ]);
  const router = useRouter();
  const loading = ref(false);
  const doc = ref({});
  const activeTab = ref("details");
  const docName = computed(() => decodeURIComponent(route.params.name || ""));

  const tabs = computed(() => [
    { key: "details", label: t("kpiTemplateDetail.tabDetails"), icon: "fas fa-file-lines" },
    { key: "notifications", label: t("kpiTemplateDetail.tabNotifications"), icon: "fas fa-bell" },
    {
      key: "description",
      label: t("kpiTemplateDetail.tabDescription"),
      icon: "fas fa-note-sticky",
    },
  ]);

  function goBack() {
    router.push("/app/kpi-template-list");
  }

  async function loadDoc() {
    loading.value = true;
    try {
      const res = await api.getDoc("KPI Template", docName.value);
      doc.value = res.data || {};
    } catch {
      doc.value = { name: docName.value };
    } finally {
      loading.value = false;
    }
  }

  function getTplStatusCls(s) {
    return (
      { Active: "tpl-active", Inactive: "tpl-inactive", Deprecated: "tpl-deprecated" }[s] ||
      "tpl-inactive"
    );
  }
  function getTplStatusLabel(s) {
    return (
      {
        Active: t("kpiTemplateDetail.statusActive"),
        Inactive: t("kpiTemplateDetail.statusInactive"),
        Deprecated: t("kpiTemplateDetail.statusDeprecated"),
      }[s] ||
      s ||
      "-"
    );
  }
  function getPeriodLabel(p) {
    return (
      {
        Daily: t("kpiTemplateDetail.daily"),
        Weekly: t("kpiTemplateDetail.weekly"),
        Monthly: t("kpiTemplateDetail.monthly"),
        Quarterly: t("kpiTemplateDetail.quarterly"),
        Yearly: t("kpiTemplateDetail.yearly"),
      }[p] ||
      p ||
      "-"
    );
  }
  function getFreqLabel(f) {
    return (
      {
        Daily: t("kpiTemplateDetail.daily"),
        Weekly: t("kpiTemplateDetail.weekly"),
        Monthly: t("kpiTemplateDetail.monthly"),
        Quarterly: t("kpiTemplateDetail.quarterly"),
      }[f] ||
      f ||
      "-"
    );
  }
  function formatDateTime(dt) {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("tr-TR");
  }

  watch(() => route.params.name, loadDoc);
  onMounted(loadDoc);
</script>

<style scoped>
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
  }
  .detail-tab {
    font-size: 12px;
    font-weight: 500;
    padding: 10px 16px;
    color: #9ca3af;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    cursor: pointer;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
  }
  .detail-tab:hover {
    color: #6b7280;
  }
  .detail-tab.active {
    color: #8a6a00;
    border-bottom-color: #f5b800;
    font-weight: 600;
  }
  .tpl-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .tpl-status-badge .tpl-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .tpl-active {
    background: var(--th-kpi-active-bg);
    color: var(--th-kpi-active-fg);
  }
  .tpl-active .tpl-dot {
    background: var(--th-kpi-active-dot);
  }
  .tpl-inactive {
    background: var(--th-kpi-draft-bg);
    color: var(--th-kpi-draft-fg);
  }
  .tpl-inactive .tpl-dot {
    background: var(--th-kpi-draft-dot);
  }
  .tpl-deprecated {
    background: var(--th-kpi-critical-bg);
    color: var(--th-kpi-critical-fg);
  }
  .tpl-deprecated .tpl-dot {
    background: var(--th-kpi-critical-dot);
  }

  /* Mobil: 3 tab (~310px) 320px ekranda kullanılabilir alanı aşıyor —
     tab satırı yatay kaydırılabilir olsun, tab'lar küçülüp kırpılmasın */
  @media (max-width: 767px) {
    [data-tour="ktd-tabs"] {
      overflow-x: auto;
      flex-wrap: nowrap;
      scrollbar-width: none;
    }
    [data-tour="ktd-tabs"]::-webkit-scrollbar {
      display: none;
    }
    .detail-tab {
      white-space: nowrap;
      flex-shrink: 0;
      padding: 10px 10px;
    }
  }
</style>

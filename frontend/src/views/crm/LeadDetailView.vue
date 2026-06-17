<template>
  <div>
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <CrmEntityLayout
      v-else
      :title="isNew ? t('leadDetail.newLead') : form.lead_name || fullName || form.email || name"
      :subtitle="!isNew ? name : ''"
      :status-value="form.status"
      :status-label="statusLabel"
      :status-color="statusColor"
      :tabs="tabs"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
    >
      <template #actions>
        <button
          v-if="!isNew && form.status !== 'Qualified'"
          class="hdr-btn-outlined"
          :disabled="converting"
          data-tour="ledd-convert"
          @click="convertToDeal"
        >
          <AppIcon name="trending-up" :size="14" />
          <span>{{ converting ? t("leadDetail.converting") : t("leadDetail.convertToDeal") }}</span>
        </button>
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{
            saving ? t("leadDetail.saving") : t("leadDetail.save")
          }}</span>
        </button>
      </template>

      <!-- Sol: Kisi + kurum ozeti -->
      <template #side-left>
        <div class="card p-4 flex flex-col items-center text-center" data-tour="ledd-header">
          <UserAvatar :email="form.email" :name="fullName" size="lg" />
          <h3
            class="mt-3 text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate max-w-full"
          >
            {{ fullName || form.email || "—" }}
          </h3>
          <p v-if="form.job_title" class="text-[11px] text-gray-500 truncate max-w-full">
            {{ form.job_title }}
          </p>
          <p v-if="form.organization" class="text-[11px] text-violet-500 mt-1 truncate max-w-full">
            {{ form.organization }}
          </p>
        </div>

        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("leadDetail.contact") }}</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">{{ t("leadDetail.email") }}</label>
              <input
                v-model="form.email"
                type="email"
                class="form-input"
                :placeholder="t('leadDetail.emailPlaceholder')"
              />
            </div>
            <div>
              <label class="form-label">{{ t("leadDetail.phone") }}</label>
              <input
                v-model="form.mobile_no"
                class="form-input"
                :placeholder="t('leadDetail.phonePlaceholder')"
              />
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("leadDetail.segmentation") }}</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">{{ t("leadDetail.industry") }}</label>
              <select v-model="form.industry" class="form-input">
                <option value="">—</option>
                <option v-for="i in meta.industries" :key="i.name" :value="i.name">
                  {{ i.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">{{ t("leadDetail.territory") }}</label>
              <select v-model="form.territory" class="form-input">
                <option value="">—</option>
                <option v-for="terr in meta.territories" :key="terr.name" :value="terr.name">
                  {{ terr.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <!-- Orta: tabs -->
      <template #main>
        <div v-if="activeTab === 'details'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">{{ t("leadDetail.firstName") }}</label>
            <input v-model="form.first_name" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.lastName") }}</label>
            <input v-model="form.last_name" class="form-input" />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">{{ t("leadDetail.organization") }}</label>
            <input
              v-model="form.organization"
              class="form-input"
              :placeholder="t('leadDetail.companyNamePlaceholder')"
            />
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.jobTitle") }}</label>
            <input v-model="form.job_title" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.employeeCount") }}</label>
            <select v-model="form.no_of_employees" class="form-input">
              <option value="">—</option>
              <option v-for="opt in employeeRangeOptions" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.annualRevenue") }}</label>
            <input v-model.number="form.annual_revenue" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.source") }}</label>
            <select v-model="form.source" class="form-input">
              <option value="">—</option>
              <option v-for="s in meta.leadSources" :key="s.name" :value="s.name">
                {{ s.name }}
              </option>
            </select>
            <p v-if="!meta.leadSources.length" class="text-[10px] text-amber-500 mt-1">
              {{ t("leadDetail.noSourceDefined") }}
            </p>
          </div>
          <div>
            <label class="form-label">{{ t("leadDetail.status") }}</label>
            <select v-model="form.status" class="form-input">
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-else-if="activeTab === 'activity'" data-tour="ledd-activity">
          <CommentBox :placeholder="t('leadDetail.commentPlaceholder')" @submit="addComment" />
          <div class="mt-4">
            <ActivityTimeline :items="activities" :loading="loadingActivities" />
          </div>
        </div>

        <div v-else-if="activeTab === 'tasks'">
          <TasksTab :doctype="'CRM Lead'" :docname="name" />
        </div>

        <div v-else-if="activeTab === 'notes'">
          <NotesTab :doctype="'CRM Lead'" :docname="name" />
        </div>
      </template>

      <!-- Sag: sahip, SLA, linkler -->
      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("leadDetail.owner") }}</h3>
          <div
            v-if="form.lead_owner"
            class="flex items-center gap-2 px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg dark:bg-white/5 dark:border-white/10"
          >
            <UserAvatar :email="form.lead_owner" size="sm" />
            <span class="truncate text-gray-700 dark:text-gray-200">
              {{ ownerLabel }}
            </span>
          </div>
          <div v-else class="text-[12px] text-gray-400 italic">
            {{ t("leadDetail.unassigned") }}
          </div>
        </div>

        <SlaIndicator
          :response-by="form.response_by"
          :resolution-by="form.resolution_by"
          :responded-on="form.first_responded_on"
        />

        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("leadDetail.quickInfo") }}</h3>
          <div class="text-[11px] text-gray-500 space-y-2">
            <div>{{ t("leadDetail.created") }}: <RelativeTime :value="form.creation" /></div>
            <div>{{ t("leadDetail.updated") }}: <RelativeTime :value="form.modified" /></div>
          </div>
        </div>
      </template>
    </CrmEntityLayout>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { useCrmStore } from "@/stores/crm";
  import { useCrmMetaStore } from "@/stores/crmMeta";
  import { useCrmActivityStore } from "@/stores/crmActivities";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import CrmEntityLayout from "@/components/crm/CrmEntityLayout.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import ActivityTimeline from "@/components/crm/ActivityTimeline.vue";
  import CommentBox from "@/components/crm/CommentBox.vue";
  import SlaIndicator from "@/components/crm/SlaIndicator.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import TasksTab from "./tabs/TasksTab.vue";
  import NotesTab from "./tabs/NotesTab.vue";

  const { t } = useI18n();
  const crm = useCrmStore();
  const meta = useCrmMetaStore();
  const activityStore = useCrmActivityStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

  // Sayfa-içi onboarding: lead başlığı/özeti → fırsata dönüştür → aktivite/zaman çizelgesi.
  usePageTour("lead-detail", () => [
    {
      target: '[data-tour="ledd-header"]',
      title: t("tourSteps.page.leddHeader_t"),
      desc: t("tourSteps.page.leddHeader_d"),
    },
    {
      target: '[data-tour="ledd-convert"]',
      title: t("tourSteps.page.leddConvert_t"),
      desc: t("tourSteps.page.leddConvert_d"),
    },
    {
      target: '[data-tour="ledd-activity"]',
      title: t("tourSteps.page.leddActivity_t"),
      desc: t("tourSteps.page.leddActivity_d"),
    },
  ]);

  const name = computed(() => route.params.name);
  const isNew = computed(() => name.value === "new");

  const activeTab = ref("details");
  const loading = ref(false);
  const saving = ref(false);
  const converting = ref(false);

  const form = ref({
    first_name: "",
    last_name: "",
    lead_name: "",
    email: "",
    mobile_no: "",
    organization: "",
    job_title: "",
    no_of_employees: "",
    annual_revenue: null,
    industry: "",
    territory: "",
    status: "New",
    source: "",
    lead_owner: "",
    response_by: null,
    resolution_by: null,
    first_responded_on: null,
    creation: null,
    modified: null,
  });

  const activities = ref([]);
  const loadingActivities = ref(false);

  const statusOptions = computed(() => [
    { value: "New", label: t("leadDetail.statusNew") },
    { value: "Contacted", label: t("leadDetail.statusContacted") },
    { value: "Nurture", label: t("leadDetail.statusNurture") },
    { value: "Qualified", label: t("leadDetail.statusQualified") },
    { value: "Unqualified", label: t("leadDetail.statusUnqualified") },
    { value: "Junk", label: t("leadDetail.statusJunk") },
  ]);

  const statusLabel = computed(
    () => statusOptions.value.find((s) => s.value === form.value.status)?.label || form.value.status
  );

  const statusColor = computed(() => {
    const s = meta.leadStatuses.find((x) => x.name === form.value.status);
    return s?.color || "";
  });

  const fullName = computed(() => {
    if (form.value.lead_name) return form.value.lead_name;
    const parts = [form.value.first_name, form.value.last_name].filter(Boolean);
    return parts.join(" ");
  });

  const employeeRangeOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

  const ownerLabel = computed(() => {
    const email = form.value.lead_owner;
    if (!email) return "";
    const u = meta.users.find((x) => (x.email || x.name) === email);
    return u?.full_name || email;
  });

  const tabs = computed(() => [
    { value: "details", label: t("leadDetail.tabDetails"), icon: "info" },
    { value: "activity", label: t("leadDetail.tabActivity"), icon: "activity" },
    { value: "tasks", label: t("leadDetail.tabTasks"), icon: "check-square" },
    { value: "notes", label: t("leadDetail.tabNotes"), icon: "sticky-note" },
  ]);

  async function loadDoc() {
    if (isNew.value) return;
    loading.value = true;
    try {
      const doc = await crm.fetchLead(name.value);
      Object.assign(form.value, doc);
    } catch (e) {
      toast.error(e.message || t("leadDetail.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function loadActivities() {
    if (isNew.value) return;
    loadingActivities.value = true;
    try {
      activities.value = await activityStore.fetchActivities("CRM Lead", name.value);
    } finally {
      loadingActivities.value = false;
    }
  }

  async function save() {
    saving.value = true;
    try {
      if (isNew.value) {
        const created = await crm.createLead(form.value);
        toast.success(t("leadDetail.leadCreated"));
        router.replace(`/crm/leads/${encodeURIComponent(created.name)}`);
      } else {
        await crm.updateLead(name.value, form.value);
        toast.success(t("leadDetail.changesSaved"));
      }
    } catch (e) {
      toast.error(e.message || t("leadDetail.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function convertToDeal() {
    converting.value = true;
    try {
      const res = await crm.convertLeadToDeal(name.value);
      const dealName = res?.message?.name || res?.message;
      toast.success(t("leadDetail.convertedToDeal"));
      if (dealName) router.push(`/crm/deals/${encodeURIComponent(dealName)}`);
    } catch (e) {
      toast.error(e.message || t("leadDetail.convertFailed"));
    } finally {
      converting.value = false;
    }
  }

  async function addComment(content) {
    try {
      await activityStore.addComment("CRM Lead", name.value, `<p>${content}</p>`);
      toast.success(t("leadDetail.commentAdded"));
      await loadActivities();
    } catch (e) {
      toast.error(e.message || t("leadDetail.commentFailed"));
    }
  }

  watch(activeTab, (t) => {
    if (t === "activity" && !activities.value.length) loadActivities();
  });

  onMounted(async () => {
    await meta.loadAll();
    await loadDoc();
  });
</script>

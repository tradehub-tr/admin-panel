<template>
  <div>
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <CrmEntityLayout
      v-else
      :title="isNew ? 'Yeni Lead' : form.lead_name || fullName || form.email || name"
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
          @click="convertToDeal"
        >
          <AppIcon name="trending-up" :size="14" />
          <span>{{ converting ? "Dönüştürülüyor..." : "Fırsata Dönüştür" }}</span>
        </button>
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{ saving ? "Kaydediliyor..." : "Kaydet" }}</span>
        </button>
      </template>

      <!-- Sol: Kisi + kurum ozeti -->
      <template #side-left>
        <div class="card p-4 flex flex-col items-center text-center">
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
          <h3 class="crm-section-title">İletişim</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">E-posta</label>
              <input
                v-model="form.email"
                type="email"
                class="form-input"
                placeholder="ornek@sirket.com"
              />
            </div>
            <div>
              <label class="form-label">Telefon</label>
              <input v-model="form.mobile_no" class="form-input" placeholder="+90 555 ..." />
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h3 class="crm-section-title">Segmentasyon</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">Sektör</label>
              <select v-model="form.industry" class="form-input">
                <option value="">—</option>
                <option v-for="i in meta.industries" :key="i.name" :value="i.name">
                  {{ i.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Bölge</label>
              <select v-model="form.territory" class="form-input">
                <option value="">—</option>
                <option v-for="t in meta.territories" :key="t.name" :value="t.name">
                  {{ t.name }}
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
            <label class="form-label">Ad</label>
            <input v-model="form.first_name" class="form-input" />
          </div>
          <div>
            <label class="form-label">Soyad</label>
            <input v-model="form.last_name" class="form-input" />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Kurum</label>
            <input v-model="form.organization" class="form-input" placeholder="Şirket adı" />
          </div>
          <div>
            <label class="form-label">Pozisyon</label>
            <input v-model="form.job_title" class="form-input" />
          </div>
          <div>
            <label class="form-label">Çalışan Sayısı</label>
            <input v-model.number="form.no_of_employees" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">Yıllık Gelir</label>
            <input v-model.number="form.annual_revenue" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">Kaynak</label>
            <select v-model="form.source" class="form-input">
              <option value="">—</option>
              <option v-for="s in meta.leadSources" :key="s.name" :value="s.name">
                {{ s.name }}
              </option>
              <option v-if="!meta.leadSources.length" value="Manual">Manuel</option>
            </select>
          </div>
          <div>
            <label class="form-label">Durum</label>
            <select v-model="form.status" class="form-input">
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-else-if="activeTab === 'activity'">
          <CommentBox placeholder="Lead'e yorum ekle..." @submit="addComment" />
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

        <div v-else-if="activeTab === 'calls'">
          <CallsTab :doctype="'CRM Lead'" :docname="name" />
        </div>
      </template>

      <!-- Sag: sahip, SLA, linkler -->
      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">Sahip</h3>
          <UserPicker v-model="form.lead_owner" :users="meta.users" placeholder="Sahip seç" />
        </div>

        <SlaIndicator
          :response-by="form.response_by"
          :resolution-by="form.resolution_by"
          :responded-on="form.first_responded_on"
        />

        <div class="card p-4">
          <h3 class="crm-section-title">Kısa Bilgi</h3>
          <div class="text-[11px] text-gray-500 space-y-2">
            <div>Oluşturuldu: <RelativeTime :value="form.creation" /></div>
            <div>Güncellendi: <RelativeTime :value="form.modified" /></div>
          </div>
        </div>
      </template>
    </CrmEntityLayout>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useCrmStore } from "@/stores/crm";
  import { useCrmMetaStore } from "@/stores/crmMeta";
  import { useCrmActivityStore } from "@/stores/crmActivities";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import CrmEntityLayout from "@/components/crm/CrmEntityLayout.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import UserPicker from "@/components/crm/UserPicker.vue";
  import ActivityTimeline from "@/components/crm/ActivityTimeline.vue";
  import CommentBox from "@/components/crm/CommentBox.vue";
  import SlaIndicator from "@/components/crm/SlaIndicator.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import TasksTab from "./tabs/TasksTab.vue";
  import NotesTab from "./tabs/NotesTab.vue";
  import CallsTab from "./tabs/CallsTab.vue";

  const crm = useCrmStore();
  const meta = useCrmMetaStore();
  const activityStore = useCrmActivityStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

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
    no_of_employees: null,
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

  const statusOptions = [
    { value: "New", label: "Yeni" },
    { value: "Contacted", label: "İletişime Geçildi" },
    { value: "Nurture", label: "Takip" },
    { value: "Qualified", label: "Nitelikli" },
    { value: "Unqualified", label: "Reddedildi" },
    { value: "Junk", label: "Spam" },
  ];

  const statusLabel = computed(
    () => statusOptions.find((s) => s.value === form.value.status)?.label || form.value.status
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

  const tabs = computed(() => [
    { value: "details", label: "Detay", icon: "info" },
    { value: "activity", label: "Aktivite", icon: "activity" },
    { value: "tasks", label: "Görevler", icon: "check-square" },
    { value: "notes", label: "Notlar", icon: "sticky-note" },
    { value: "calls", label: "Aramalar", icon: "phone-call" },
  ]);

  async function loadDoc() {
    if (isNew.value) return;
    loading.value = true;
    try {
      const doc = await crm.fetchLead(name.value);
      Object.assign(form.value, doc);
    } catch (e) {
      toast.error(e.message || "Lead yüklenemedi");
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
        toast.success("Lead oluşturuldu");
        router.replace(`/crm/leads/${encodeURIComponent(created.name)}`);
      } else {
        await crm.updateLead(name.value, form.value);
        toast.success("Değişiklikler kaydedildi");
      }
    } catch (e) {
      toast.error(e.message || "Kaydetme başarısız");
    } finally {
      saving.value = false;
    }
  }

  async function convertToDeal() {
    converting.value = true;
    try {
      const res = await crm.convertLeadToDeal(name.value);
      const dealName = res?.message?.name || res?.message;
      toast.success("Lead fırsata dönüştürüldü");
      if (dealName) router.push(`/crm/deals/${encodeURIComponent(dealName)}`);
    } catch (e) {
      toast.error(e.message || "Dönüştürme başarısız");
    } finally {
      converting.value = false;
    }
  }

  async function addComment(content) {
    try {
      await activityStore.addComment("CRM Lead", name.value, `<p>${content}</p>`);
      toast.success("Yorum eklendi");
      await loadActivities();
    } catch (e) {
      toast.error(e.message || "Yorum eklenemedi");
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

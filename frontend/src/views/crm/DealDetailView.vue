<template>
  <div>
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <CrmEntityLayout
      v-else
      :title="form.organization || form.name || 'Yeni Anlaşma'"
      :subtitle="!isNew ? name : ''"
      :status-value="form.status"
      :status-label="form.status"
      :status-color="statusColor"
      :tabs="tabs"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
    >
      <template #actions>
        <button
          v-if="!isNew && form.status !== 'Won'"
          class="hdr-btn-outlined"
          style="color: #10b981; border-color: rgba(16, 185, 129, 0.4)"
          @click="closeDeal('Won')"
        >
          <AppIcon name="check-circle" :size="14" /><span>Kazanıldı</span>
        </button>
        <button
          v-if="!isNew && form.status !== 'Lost'"
          class="hdr-btn-outlined"
          style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4)"
          @click="openLostDialog = true"
        >
          <AppIcon name="x-circle" :size="14" /><span>Kaybedildi</span>
        </button>
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{ saving ? "Kaydediliyor..." : "Kaydet" }}</span>
        </button>
      </template>

      <!-- Sol Panel: kurum bilgisi, iletisim -->
      <template #side-left>
        <div class="card p-4">
          <h3 class="crm-section-title">Kurum</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">Kurum</label>
              <input v-model="form.organization" class="form-input" placeholder="Şirket adı" />
            </div>
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
            <div>
              <label class="form-label">Çalışan Sayısı</label>
              <select v-model="form.no_of_employees" class="form-input">
                <option value="">—</option>
                <option v-for="opt in employeeRangeOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Yıllık Gelir</label>
              <input v-model.number="form.annual_revenue" type="number" class="form-input" />
            </div>
          </div>
        </div>
      </template>

      <!-- Orta Panel: tabs + form -->
      <template #main>
        <div v-if="activeTab === 'details'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Durum</label>
              <select v-model="form.status" class="form-input">
                <option v-for="s in meta.dealStatuses" :key="s.name" :value="s.name">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Olasılık %</label>
              <input
                v-model.number="form.probability"
                type="number"
                min="0"
                max="100"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">Anlaşma Değeri</label>
              <input v-model.number="form.deal_value" type="number" class="form-input" />
            </div>
            <div>
              <label class="form-label">Beklenen Değer</label>
              <input v-model.number="form.expected_deal_value" type="number" class="form-input" />
            </div>
            <div>
              <label class="form-label">Para Birimi</label>
              <input v-model="form.currency" class="form-input" placeholder="TRY" />
            </div>
            <div>
              <label class="form-label">Beklenen Kapanış</label>
              <input v-model="form.expected_closure_date" type="date" class="form-input" />
            </div>
            <div v-if="form.closed_date" class="md:col-span-2">
              <label class="form-label">Kapanış Tarihi</label>
              <input v-model="form.closed_date" type="date" class="form-input" />
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'activity'">
          <CommentBox placeholder="Anlaşmaya yorum ekle..." @submit="addComment" />
          <div class="mt-4">
            <ActivityTimeline :items="activities" :loading="loadingActivities" />
          </div>
        </div>

        <div v-else-if="activeTab === 'tasks'">
          <TasksTab :doctype="'CRM Deal'" :docname="name" />
        </div>

        <div v-else-if="activeTab === 'notes'">
          <NotesTab :doctype="'CRM Deal'" :docname="name" />
        </div>
      </template>

      <!-- Sag Panel: sahip, sla, linked records -->
      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">Sahip</h3>
          <div
            v-if="form.deal_owner"
            class="flex items-center gap-2 px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg dark:bg-white/5 dark:border-white/10"
          >
            <UserAvatar :email="form.deal_owner" size="sm" />
            <span class="truncate text-gray-700 dark:text-gray-200">
              {{ ownerLabel }}
            </span>
          </div>
          <div v-else class="text-[12px] text-gray-400 italic">Atanmadı</div>
        </div>

        <SlaIndicator
          :response-by="form.response_by"
          :resolution-by="form.resolution_by"
          :responded-on="form.first_responded_on"
        />

        <div class="card p-4">
          <h3 class="crm-section-title">Linked Lead</h3>
          <div v-if="form.lead_link">
            <router-link
              :to="`/crm/leads/${encodeURIComponent(form.lead_link)}`"
              class="text-[12px] text-violet-500 hover:underline"
            >
              {{ form.lead_link }}
            </router-link>
          </div>
          <div v-else class="text-[11px] text-gray-400">Bağlantılı lead yok</div>
        </div>
      </template>
    </CrmEntityLayout>

    <!-- Lost Reason Dialog -->
    <QuickCreateDrawer
      v-model="openLostDialog"
      title="Anlaşmayı Kaybet"
      submit-label="Kaybet"
      :saving="saving"
      @submit="() => closeDeal('Lost')"
    >
      <div class="space-y-3">
        <p class="text-xs text-gray-500">Bu anlaşmanın neden kaybedildiğini seç:</p>
        <div>
          <label class="form-label">Neden</label>
          <select v-model="form.lost_reason" class="form-input">
            <option value="">— Seç —</option>
            <option v-for="r in meta.lostReasons" :key="r.name" :value="r.name">
              {{ r.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label">Not</label>
          <textarea
            v-model="lostNote"
            rows="3"
            class="form-input"
            placeholder="Ek açıklama..."
          ></textarea>
        </div>
      </div>
    </QuickCreateDrawer>
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
  import ActivityTimeline from "@/components/crm/ActivityTimeline.vue";
  import CommentBox from "@/components/crm/CommentBox.vue";
  import SlaIndicator from "@/components/crm/SlaIndicator.vue";
  import QuickCreateDrawer from "@/components/crm/QuickCreateDrawer.vue";
  import TasksTab from "./tabs/TasksTab.vue";
  import NotesTab from "./tabs/NotesTab.vue";

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
  const openLostDialog = ref(false);
  const lostNote = ref("");

  const form = ref({
    organization: "",
    status: "",
    deal_owner: "",
    deal_value: 0,
    expected_deal_value: 0,
    probability: 50,
    currency: "TRY",
    expected_closure_date: "",
    closed_date: "",
    industry: "",
    territory: "",
    no_of_employees: "",
    annual_revenue: null,
    lost_reason: "",
    lead_link: "",
    response_by: null,
    resolution_by: null,
    first_responded_on: null,
  });

  const activities = ref([]);
  const loadingActivities = ref(false);
  const taskCount = ref(0);
  const noteCount = ref(0);

  const tabs = computed(() => [
    { value: "details", label: "Detay", icon: "info" },
    { value: "activity", label: "Aktivite", icon: "activity" },
    { value: "tasks", label: "Görevler", icon: "check-square", count: taskCount.value },
    { value: "notes", label: "Notlar", icon: "sticky-note", count: noteCount.value },
  ]);

  const statusColor = computed(() => {
    const s = meta.dealStatuses.find((x) => x.name === form.value.status);
    return s?.color || "";
  });

  const employeeRangeOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

  const ownerLabel = computed(() => {
    const email = form.value.deal_owner;
    if (!email) return "";
    const u = meta.users.find((x) => (x.email || x.name) === email);
    return u?.full_name || email;
  });

  async function loadDoc() {
    if (isNew.value) return;
    loading.value = true;
    try {
      const doc = await crm.fetchDeal(name.value);
      Object.assign(form.value, doc);
    } catch (e) {
      toast.error(e.message || "Anlaşma yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  async function loadActivities() {
    if (isNew.value) return;
    loadingActivities.value = true;
    try {
      activities.value = await activityStore.fetchActivities("CRM Deal", name.value);
    } finally {
      loadingActivities.value = false;
    }
  }

  async function save() {
    saving.value = true;
    try {
      if (isNew.value) {
        const created = await crm.createDeal(form.value);
        toast.success("Anlaşma oluşturuldu");
        router.replace(`/crm/deals/${encodeURIComponent(created.name)}`);
      } else {
        await crm.updateDeal(name.value, form.value);
        toast.success("Kaydedildi");
      }
    } catch (e) {
      toast.error(e.message || "Kaydetme başarısız");
    } finally {
      saving.value = false;
    }
  }

  async function closeDeal(outcome) {
    saving.value = true;
    try {
      const patch = { status: outcome, closed_date: new Date().toISOString().slice(0, 10) };
      if (outcome === "Lost" && form.value.lost_reason) patch.lost_reason = form.value.lost_reason;
      await crm.updateDeal(name.value, patch);
      form.value.status = outcome;
      form.value.closed_date = patch.closed_date;
      toast.success(
        outcome === "Won" ? "Kazanıldı olarak işaretlendi" : "Kaybedildi olarak işaretlendi"
      );
      if (outcome === "Lost") openLostDialog.value = false;
      if (outcome === "Lost" && lostNote.value.trim()) {
        await activityStore.addComment(
          "CRM Deal",
          name.value,
          `<p>Kayıp notu: ${lostNote.value.trim()}</p>`
        );
        lostNote.value = "";
      }
    } catch (e) {
      toast.error(e.message || "İşlem başarısız");
    } finally {
      saving.value = false;
    }
  }

  async function addComment(content) {
    try {
      await activityStore.addComment("CRM Deal", name.value, `<p>${content}</p>`);
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
    if (isNew.value) {
      form.value.status = meta.dealStatuses[0]?.name || "Qualification";
      return;
    }
    await loadDoc();
  });
</script>

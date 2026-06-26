<template>
  <div>
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <CrmEntityLayout
      v-else
      :title="displayName"
      :subtitle="!isNew ? name : ''"
      :tabs="tabs"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
    >
      <template #actions>
        <button class="hdr-btn-primary" data-tour="ctd-save" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{
            saving ? t("contactDetail.saving") : t("contactDetail.save")
          }}</span>
        </button>
      </template>

      <template #side-left>
        <div class="card p-4 flex flex-col items-center text-center" data-tour="ctd-header">
          <UserAvatar :email="form.email_id" :name="form.full_name" :image="form.image" size="lg" />
          <h3
            class="mt-3 text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate max-w-full"
          >
            {{ displayName }}
          </h3>
          <p v-if="form.designation" class="text-[11px] text-gray-500 truncate max-w-full">
            {{ form.designation }}
          </p>
        </div>

        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("contactDetail.contactSection") }}</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">{{ t("contactDetail.email") }}</label>
              <input v-model="form.email_id" type="email" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t("contactDetail.mobile") }}</label>
              <input v-model="form.mobile_no" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t("contactDetail.phone") }}</label>
              <input v-model="form.phone" class="form-input" />
            </div>
          </div>
        </div>
      </template>

      <template #main>
        <div
          v-if="activeTab === 'details'"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-tour="ctd-tabs"
        >
          <div>
            <label class="form-label">{{ t("contactDetail.firstName") }}</label>
            <input v-model="form.first_name" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("contactDetail.lastName") }}</label>
            <input v-model="form.last_name" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("contactDetail.gender") }}</label>
            <select v-model="form.gender" class="form-input">
              <option value="">—</option>
              <option value="Male">{{ t("contactDetail.genderMale") }}</option>
              <option value="Female">{{ t("contactDetail.genderFemale") }}</option>
              <option value="Other">{{ t("contactDetail.genderOther") }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("contactDetail.companyName") }}</label>
            <input v-model="form.company_name" class="form-input" />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">{{ t("contactDetail.designation") }}</label>
            <input v-model="form.designation" class="form-input" />
          </div>
        </div>

        <div v-else-if="activeTab === 'deals'">
          <div v-if="loadingLinked" class="text-center py-6">
            <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
          </div>
          <div v-else-if="!linkedDeals.length" class="crm-empty">
            <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
            <h3>{{ t("contactDetail.noLinkedDeals") }}</h3>
          </div>
          <div v-else class="space-y-2">
            <router-link
              v-for="d in linkedDeals"
              :key="d.name"
              :to="`/crm/deals/${encodeURIComponent(d.name)}`"
              class="block p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-violet-300 transition-all"
            >
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-semibold">{{ d.organization || d.name }}</span>
                <StatusPill :status="d.status" :label="d.status" />
              </div>
              <div class="text-[11px] text-gray-400 mt-1 font-mono">{{ d.name }}</div>
            </router-link>
          </div>
        </div>
      </template>

      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("contactDetail.infoSection") }}</h3>
          <div class="text-[11px] text-gray-500 space-y-2">
            <div>{{ t("contactDetail.createdAt") }}: <RelativeTime :value="form.creation" /></div>
            <div>{{ t("contactDetail.updatedAt") }}: <RelativeTime :value="form.modified" /></div>
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
  import { useCrmContactStore } from "@/stores/crmContacts";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import CrmEntityLayout from "@/components/crm/CrmEntityLayout.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: kişi başlık/iletişim paneli → ayrıntı/sekme alanı → kaydet.
  usePageTour("contact-detail", () => [
    {
      target: '[data-tour="ctd-header"]',
      title: t("tourSteps.page.ctdHeader_t"),
      desc: t("tourSteps.page.ctdHeader_d"),
    },
    {
      target: '[data-tour="ctd-tabs"]',
      title: t("tourSteps.page.ctdTabs_t"),
      desc: t("tourSteps.page.ctdTabs_d"),
    },
    {
      target: '[data-tour="ctd-save"]',
      title: t("tourSteps.page.ctdSave_t"),
      desc: t("tourSteps.page.ctdSave_d"),
    },
  ]);

  const store = useCrmContactStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

  const name = computed(() => route.params.name);
  const isNew = computed(() => name.value === "new");

  const loading = ref(false);
  const saving = ref(false);
  const activeTab = ref("details");

  const form = ref({
    first_name: "",
    last_name: "",
    full_name: "",
    email_id: "",
    mobile_no: "",
    phone: "",
    company_name: "",
    designation: "",
    gender: "",
    image: "",
    creation: null,
    modified: null,
  });

  const linkedDeals = ref([]);
  const loadingLinked = ref(false);

  const tabs = computed(() => [
    { value: "details", label: t("contactDetail.tabDetails"), icon: "info" },
    {
      value: "deals",
      label: t("contactDetail.tabDeals"),
      icon: "trending-up",
      count: linkedDeals.value.length || null,
    },
  ]);

  const displayName = computed(() => {
    if (form.value.full_name) return form.value.full_name;
    const parts = [form.value.first_name, form.value.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : form.value.email_id || name.value;
  });

  async function loadDoc() {
    if (isNew.value) return;
    loading.value = true;
    try {
      const doc = await store.fetchContact(name.value);
      Object.assign(form.value, doc);
      // Frappe flat email_id/mobile_no/phone alanlarını her zaman
      // doldurmuyor; primary child satırlardan türet.
      const emails = doc.email_ids || [];
      const primaryEmail = emails.find((e) => e.is_primary) || emails[0];
      form.value.email_id = primaryEmail?.email_id || "";
      const phones = doc.phone_nos || [];
      const primaryMobile = phones.find((p) => p.is_primary_mobile_no);
      const primaryPhone = phones.find((p) => p.is_primary_phone);
      form.value.mobile_no = primaryMobile?.phone || "";
      form.value.phone = primaryPhone?.phone || "";
    } catch (e) {
      toast.error(e.message || t("contactDetail.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function loadLinked() {
    if (isNew.value) return;
    loadingLinked.value = true;
    try {
      linkedDeals.value = await store.getLinkedDeals(name.value);
    } finally {
      loadingLinked.value = false;
    }
  }

  async function save() {
    saving.value = true;
    try {
      if (isNew.value) {
        const created = await store.createContact(form.value);
        toast.success(t("contactDetail.created"));
        router.replace(`/crm/contacts/${encodeURIComponent(created.name)}`);
      } else {
        await store.updateContact(name.value, form.value);
        toast.success(t("contactDetail.saved"));
        // Frappe Contact email/telefonu child table'da tutuyor; PUT
        // sonrası flat email_id/mobile_no/phone alanlarının doğru değerle
        // hidratlanması için doc'u tekrar oku.
        await loadDoc();
      }
    } catch (e) {
      toast.error(e.message || t("contactDetail.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  watch(activeTab, (t) => {
    if (t === "deals" && !linkedDeals.value.length) loadLinked();
  });

  onMounted(loadDoc);
</script>

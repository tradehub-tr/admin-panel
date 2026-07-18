<template>
  <div>
    <div v-if="loading" class="card p-4">
      <Skeleton variant="title" />
      <Skeleton variant="text" :count="5" />
    </div>

    <CrmEntityLayout
      v-else
      :title="form.organization_name || form.name || t('organizationDetail.newOrg')"
      :subtitle="!isNew ? name : ''"
      :tabs="tabs"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
    >
      <template #actions>
        <button class="hdr-btn-primary" data-tour="ogd-save" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{
            saving ? t("organizationDetail.saving") : t("organizationDetail.save")
          }}</span>
        </button>
      </template>

      <template #side-left>
        <div class="card p-4" data-tour="ogd-header">
          <h3 class="crm-section-title">{{ t("organizationDetail.general") }}</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">{{ t("organizationDetail.orgName") }}</label>
              <input v-model="form.organization_name" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t("organizationDetail.website") }}</label>
              <input v-model="form.website" class="form-input" placeholder="ornek.com" />
            </div>
            <div>
              <label class="form-label">{{ t("organizationDetail.industry") }}</label>
              <select v-model="form.industry" class="form-input">
                <option value="">—</option>
                <option v-for="i in meta.industries" :key="i.name" :value="i.name">
                  {{ i.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">{{ t("organizationDetail.territory") }}</label>
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

      <template #main>
        <div
          v-if="activeTab === 'details'"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-tour="ogd-tabs"
        >
          <div>
            <label class="form-label">{{ t("organizationDetail.employeeCount") }}</label>
            <select v-model="form.no_of_employees" class="form-input">
              <option value="">—</option>
              <option v-for="opt in employeeRangeOptions" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("organizationDetail.annualRevenue") }}</label>
            <input v-model.number="form.annual_revenue" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("organizationDetail.currency") }}</label>
            <input v-model="form.currency" class="form-input" placeholder="TRY" />
          </div>
          <div>
            <label class="form-label">{{ t("organizationDetail.exchangeRate") }}</label>
            <input
              v-model.number="form.exchange_rate"
              type="number"
              step="0.0001"
              class="form-input"
            />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">{{ t("organizationDetail.addressLine") }}</label>
            <input v-model="form.address_line_1" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("organizationDetail.city") }}</label>
            <input v-model="form.city" class="form-input" />
          </div>
          <div>
            <label class="form-label">{{ t("organizationDetail.country") }}</label>
            <input v-model="form.country" class="form-input" />
          </div>
        </div>

        <div v-else-if="activeTab === 'deals'">
          <div v-if="loadingDeals" class="text-center py-6">
            <AppIcon name="loader" :size="20" class="text-brand-700 animate-spin" />
          </div>
          <div v-else-if="!deals.length" class="crm-empty">
            <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
            <h3>{{ t("organizationDetail.noDeals") }}</h3>
          </div>
          <div v-else class="space-y-2">
            <router-link
              v-for="d in deals"
              :key="d.name"
              :to="`/crm/deals/${encodeURIComponent(d.name)}`"
              class="block p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-brand-300 transition-all"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[13px] font-semibold">{{ d.name }}</div>
                  <div class="text-[11px] text-gray-500">
                    <CurrencyAmount :amount="d.deal_value" :currency="d.currency || 'TRY'" />
                  </div>
                </div>
                <StatusPill :status="d.status" :label="d.status" />
              </div>
            </router-link>
          </div>
        </div>

        <div v-else-if="activeTab === 'leads'">
          <div v-if="loadingLeads" class="text-center py-6">
            <AppIcon name="loader" :size="20" class="text-brand-700 animate-spin" />
          </div>
          <div v-else-if="!leads.length" class="crm-empty">
            <div class="icon"><AppIcon name="user-plus" :size="22" /></div>
            <h3>{{ t("organizationDetail.noLeads") }}</h3>
          </div>
          <div v-else class="space-y-2">
            <router-link
              v-for="l in leads"
              :key="l.name"
              :to="`/crm/leads/${encodeURIComponent(l.name)}`"
              class="block p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-brand-300 transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <div class="text-[13px] font-semibold truncate">
                    {{
                      l.lead_name || `${l.first_name || ""} ${l.last_name || ""}`.trim() || l.email
                    }}
                  </div>
                  <div class="text-[11px] text-gray-500">{{ l.email }}</div>
                </div>
                <StatusPill :status="l.status" :label="l.status" />
              </div>
            </router-link>
          </div>
        </div>
      </template>

      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">{{ t("organizationDetail.info") }}</h3>
          <div class="text-[11px] text-gray-500 space-y-2">
            <div>{{ t("organizationDetail.created") }} <RelativeTime :value="form.creation" /></div>
            <div>{{ t("organizationDetail.updated") }} <RelativeTime :value="form.modified" /></div>
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
  import { useCrmOrganizationStore } from "@/stores/crmOrganizations";
  import { useCrmMetaStore } from "@/stores/crmMeta";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import CrmEntityLayout from "@/components/crm/CrmEntityLayout.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";

  const { t } = useI18n();
  const store = useCrmOrganizationStore();
  const meta = useCrmMetaStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

  // Sayfa-içi onboarding: kuruluş bilgisi → ayrıntı/sekmeler → kaydet.
  usePageTour("organization-detail", () => [
    {
      target: '[data-tour="ogd-header"]',
      title: t("tourSteps.page.ogdHeader_t"),
      desc: t("tourSteps.page.ogdHeader_d"),
    },
    {
      target: '[data-tour="ogd-tabs"]',
      title: t("tourSteps.page.ogdTabs_t"),
      desc: t("tourSteps.page.ogdTabs_d"),
    },
    {
      target: '[data-tour="ogd-save"]',
      title: t("tourSteps.page.ogdSave_t"),
      desc: t("tourSteps.page.ogdSave_d"),
    },
  ]);

  const name = computed(() => route.params.name);
  const isNew = computed(() => name.value === "new");

  const loading = ref(false);
  const saving = ref(false);
  const activeTab = ref("details");

  const form = ref({
    organization_name: "",
    website: "",
    industry: "",
    territory: "",
    no_of_employees: "",
    annual_revenue: null,
    currency: "TRY",
    exchange_rate: null,
    address_line_1: "",
    city: "",
    country: "",
    creation: null,
    modified: null,
  });

  const employeeRangeOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

  const deals = ref([]);
  const leads = ref([]);
  const loadingDeals = ref(false);
  const loadingLeads = ref(false);

  const tabs = computed(() => [
    { value: "details", label: t("organizationDetail.tabDetails"), icon: "info" },
    {
      value: "deals",
      label: t("organizationDetail.tabDeals"),
      icon: "trending-up",
      count: deals.value.length || null,
    },
    {
      value: "leads",
      label: t("organizationDetail.tabLeads"),
      icon: "user-plus",
      count: leads.value.length || null,
    },
  ]);

  async function loadDoc() {
    if (isNew.value) return;
    loading.value = true;
    try {
      const doc = await store.fetchOrganization(name.value);
      Object.assign(form.value, doc);
    } catch (e) {
      toast.error(e.message || t("organizationDetail.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function loadDeals() {
    loadingDeals.value = true;
    try {
      const res = await api.getList("CRM Deal", {
        fields: ["name", "status", "deal_value", "currency", "modified"],
        filters: [["organization", "=", form.value.organization_name || name.value]],
        order_by: "modified desc",
        limit_page_length: 50,
      });
      deals.value = res.data || [];
    } finally {
      loadingDeals.value = false;
    }
  }

  async function loadLeads() {
    loadingLeads.value = true;
    try {
      const res = await api.getList("CRM Lead", {
        fields: ["name", "first_name", "last_name", "lead_name", "email", "status"],
        filters: [["organization", "=", form.value.organization_name || name.value]],
        order_by: "modified desc",
        limit_page_length: 50,
      });
      leads.value = res.data || [];
    } finally {
      loadingLeads.value = false;
    }
  }

  async function save() {
    saving.value = true;
    try {
      if (isNew.value) {
        const created = await store.createOrganization(form.value);
        toast.success(t("organizationDetail.orgCreated"));
        router.replace(`/crm/organizations/${encodeURIComponent(created.name)}`);
      } else {
        await store.updateOrganization(name.value, form.value);
        toast.success(t("organizationDetail.saved"));
      }
    } catch (e) {
      toast.error(e.message || t("organizationDetail.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  watch(activeTab, (t) => {
    if (t === "deals" && !deals.value.length) loadDeals();
    if (t === "leads" && !leads.value.length) loadLeads();
  });

  onMounted(async () => {
    await meta.loadAll();
    await loadDoc();
  });
</script>

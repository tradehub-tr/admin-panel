<template>
  <div class="space-y-4">
    <!-- Twilio -->
    <div class="card p-5">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center"
          >
            <AppIcon name="phone" :size="18" class="text-red-500" />
          </div>
          <div>
            <h3 class="text-[14px] font-bold text-gray-900 dark:text-gray-100">Twilio</h3>
            <p class="text-[11px] text-gray-400">{{ t("integrationsSettings.twilioDesc") }}</p>
          </div>
        </div>
        <span v-if="twilio.enabled" class="crm-pill crm-pill-success">{{
          t("integrationsSettings.active")
        }}</span>
        <span v-else class="crm-pill">{{ t("integrationsSettings.inactive") }}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="form-label">Account SID</label>
          <input v-model="twilio.account_sid" class="form-input" />
        </div>
        <div>
          <label class="form-label">Auth Token</label>
          <input v-model="twilio.auth_token" type="password" class="form-input" />
        </div>
        <div>
          <label class="form-label">Api Key</label>
          <input v-model="twilio.api_key" class="form-input" />
        </div>
        <div>
          <label class="form-label">Api Secret</label>
          <input v-model="twilio.api_secret" type="password" class="form-input" />
        </div>
      </div>
      <label class="flex items-center gap-2 mt-3">
        <input v-model="twilio.enabled" type="checkbox" class="accent-brand-500" />
        <span class="text-[13px]">{{ t("integrationsSettings.enable") }}</span>
      </label>
      <div class="mt-4 flex justify-end">
        <button class="hdr-btn-primary" :disabled="savingTwilio" @click="saveTwilio">
          <AppIcon name="save" :size="13" /><span>{{ t("integrationsSettings.saveTwilio") }}</span>
        </button>
      </div>
    </div>

    <!-- Exotel -->
    <div class="card p-5">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center"
          >
            <AppIcon name="phone-call" :size="18" class="text-blue-500" />
          </div>
          <div>
            <h3 class="text-[14px] font-bold text-gray-900 dark:text-gray-100">Exotel</h3>
            <p class="text-[11px] text-gray-400">{{ t("integrationsSettings.exotelDesc") }}</p>
          </div>
        </div>
        <span v-if="exotel.enabled" class="crm-pill crm-pill-success">{{
          t("integrationsSettings.active")
        }}</span>
        <span v-else class="crm-pill">{{ t("integrationsSettings.inactive") }}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="form-label">API Key</label>
          <input v-model="exotel.api_key" class="form-input" />
        </div>
        <div>
          <label class="form-label">API Token</label>
          <input v-model="exotel.api_token" type="password" class="form-input" />
        </div>
        <div>
          <label class="form-label">Account SID</label>
          <input v-model="exotel.account_sid" class="form-input" />
        </div>
        <div>
          <label class="form-label">Subdomain</label>
          <input v-model="exotel.subdomain" class="form-input" placeholder="api.exotel.com" />
        </div>
      </div>
      <label class="flex items-center gap-2 mt-3">
        <input v-model="exotel.enabled" type="checkbox" class="accent-brand-500" />
        <span class="text-[13px]">{{ t("integrationsSettings.enable") }}</span>
      </label>
      <div class="mt-4 flex justify-end">
        <button class="hdr-btn-primary" :disabled="savingExotel" @click="saveExotel">
          <AppIcon name="save" :size="13" /><span>{{ t("integrationsSettings.saveExotel") }}</span>
        </button>
      </div>
    </div>

    <!-- ERPNext -->
    <div class="card p-5">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"
          >
            <AppIcon name="refresh-cw" :size="18" class="text-emerald-500" />
          </div>
          <div>
            <h3 class="text-[14px] font-bold text-gray-900 dark:text-gray-100">
              {{ t("integrationsSettings.erpnextTitle") }}
            </h3>
            <p class="text-[11px] text-gray-400">{{ t("integrationsSettings.erpnextDesc") }}</p>
          </div>
        </div>
      </div>
      <label
        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer"
      >
        <input v-model="erpnext.enabled" type="checkbox" class="accent-brand-500" />
        <div>
          <div class="text-[13px] font-semibold">{{ t("integrationsSettings.enableSync") }}</div>
          <div class="text-[11px] text-gray-400">
            {{ t("integrationsSettings.enableSyncHint") }}
          </div>
        </div>
      </label>
      <div class="mt-4 flex justify-end">
        <button class="hdr-btn-primary" :disabled="savingErpnext" @click="saveErpnext">
          <AppIcon name="save" :size="13" /><span>{{ t("integrationsSettings.saveErpnext") }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useCrmSettingsStore } from "@/stores/crmSettings";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const store = useCrmSettingsStore();
  const toast = useToast();

  const twilio = ref({
    enabled: false,
    account_sid: "",
    auth_token: "",
    api_key: "",
    api_secret: "",
  });
  const exotel = ref({
    enabled: false,
    api_key: "",
    api_token: "",
    account_sid: "",
    subdomain: "",
  });
  const erpnext = ref({ enabled: false });

  const savingTwilio = ref(false);
  const savingExotel = ref(false);
  const savingErpnext = ref(false);

  async function loadAll() {
    try {
      const t = await store.fetchTwilioSettings();
      if (t) Object.assign(twilio.value, t);
    } catch {
      /* yoksay */
    }
    try {
      const e = await store.fetchExotelSettings();
      if (e) Object.assign(exotel.value, e);
    } catch {
      /* yoksay */
    }
    try {
      const r = await store.fetchErpnextSettings();
      if (r) Object.assign(erpnext.value, r);
    } catch {
      /* yoksay */
    }
  }

  async function saveTwilio() {
    savingTwilio.value = true;
    try {
      await store.updateTwilioSettings({ ...twilio.value });
      toast.success(t("integrationsSettings.twilioSaved"));
    } catch (e) {
      toast.error(e.message || t("integrationsSettings.saveFailed"));
    } finally {
      savingTwilio.value = false;
    }
  }

  async function saveExotel() {
    savingExotel.value = true;
    try {
      await store.updateExotelSettings({ ...exotel.value });
      toast.success(t("integrationsSettings.exotelSaved"));
    } catch (e) {
      toast.error(e.message || t("integrationsSettings.saveFailed"));
    } finally {
      savingExotel.value = false;
    }
  }

  async function saveErpnext() {
    savingErpnext.value = true;
    try {
      await store.updateErpnextSettings({ ...erpnext.value });
      toast.success(t("integrationsSettings.erpnextSaved"));
    } catch (e) {
      toast.error(e.message || t("integrationsSettings.saveFailed"));
    } finally {
      savingErpnext.value = false;
    }
  }

  onMounted(loadAll);
</script>

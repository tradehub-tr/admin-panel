<template>
  <div class="card p-5">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">
          {{ t("slaSettings.title") }}
        </h2>
        <p class="text-xs text-gray-400">
          {{ t("slaSettings.subtitle") }}
        </p>
      </div>
      <router-link to="/app/CRM Service Level Agreement/new" class="hdr-btn-primary">
        <AppIcon name="plus" :size="13" /><span>{{ t("slaSettings.newSla") }}</span>
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-brand-700 animate-spin" />
    </div>
    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="clock" :size="20" /></div>
      <h3>{{ t("slaSettings.empty") }}</h3>
      <p>{{ t("slaSettings.emptyHint") }}</p>
    </div>
    <div v-else class="space-y-2">
      <router-link
        v-for="s in items"
        :key="s.name"
        :to="`/app/CRM Service Level Agreement/${encodeURIComponent(s.name)}`"
        class="block p-4 rounded-lg border border-gray-200 dark:border-white/10 hover:border-brand-300 transition-all"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                {{ s.sla_name || s.name }}
              </h4>
              <span v-if="s.default" class="crm-pill crm-pill-brand">{{
                t("slaSettings.default")
              }}</span>
              <span class="crm-pill" :class="s.enabled ? 'crm-pill-success' : ''">
                {{ s.enabled ? t("slaSettings.active") : t("slaSettings.inactive") }}
              </span>
            </div>
            <p v-if="s.description" class="text-[11px] text-gray-500 mt-1 line-clamp-1">
              {{ s.description }}
            </p>
          </div>
          <AppIcon name="chevron-right" :size="16" class="text-gray-300" />
        </div>
      </router-link>
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

  const items = ref([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      items.value = await store.fetchSlaList();
    } catch (e) {
      toast.error(e.message || t("slaSettings.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
</script>

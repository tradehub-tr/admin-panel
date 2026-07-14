<template>
  <div class="card p-5">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">
          {{ t("assignmentRulesSettings.title") }}
        </h2>
        <p class="text-xs text-gray-400">{{ t("assignmentRulesSettings.subtitle") }}</p>
      </div>
      <router-link to="/app/Assignment Rule/new" class="hdr-btn-primary">
        <AppIcon name="plus" :size="13" /><span>{{ t("assignmentRulesSettings.newRule") }}</span>
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-brand-700 animate-spin" />
    </div>
    <div v-else-if="!rules.length" class="crm-empty">
      <div class="icon"><AppIcon name="git-merge" :size="20" /></div>
      <h3>{{ t("assignmentRulesSettings.empty") }}</h3>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="r in rules"
        :key="r.name"
        class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-white/10"
      >
        <div class="flex items-center gap-3 min-w-0">
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="!r.disabled"
              class="accent-brand-500"
              @change="toggle(r, $event.target.checked)"
            />
          </label>
          <div class="min-w-0">
            <h4 class="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">
              {{ r.rule_name || r.name }}
            </h4>
            <p class="text-[11px] text-gray-500 truncate">
              {{ r.document_type || "-" }} ·
              {{ r.description || t("assignmentRulesSettings.noDescription") }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="text-gray-400 hover:text-brand-700"
            :title="t('assignmentRulesSettings.duplicate')"
            @click="duplicate(r)"
          >
            <AppIcon name="copy" :size="15" />
          </button>
          <router-link
            :to="`/app/Assignment Rule/${encodeURIComponent(r.name)}`"
            class="text-gray-400 hover:text-brand-700"
            :title="t('assignmentRulesSettings.edit')"
          >
            <AppIcon name="pencil" :size="15" />
          </router-link>
        </div>
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

  const rules = ref([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      rules.value = await store.fetchAssignmentRules();
    } catch (e) {
      toast.error(e.message || t("assignmentRulesSettings.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function toggle(rule, enabled) {
    try {
      await store.toggleAssignmentRule(rule.name, !enabled);
      rule.disabled = enabled ? 0 : 1;
      toast.success(
        enabled
          ? t("assignmentRulesSettings.ruleEnabled")
          : t("assignmentRulesSettings.ruleDisabled")
      );
    } catch (e) {
      toast.error(e.message || t("assignmentRulesSettings.updateFailed"));
    }
  }

  async function duplicate(rule) {
    try {
      await store.duplicateAssignmentRule(rule.name);
      toast.success(t("assignmentRulesSettings.ruleDuplicated"));
      await load();
    } catch (e) {
      toast.error(e.message || t("assignmentRulesSettings.duplicateFailed"));
    }
  }

  onMounted(load);
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5 gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button class="hdr-btn-outlined" @click="$router.back()">
          <AppIcon name="arrow-left" :size="14" /><span>{{ t("crmEntityLayout.back") }}</span>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
            {{ title }}
          </h1>
          <div v-if="subtitle" class="flex items-center gap-2 mt-0.5">
            <p class="text-[10px] text-gray-400 font-mono">{{ subtitle }}</p>
            <StatusPill
              v-if="statusLabel"
              :status="statusValue"
              :label="statusLabel"
              :color="statusColor"
            />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- 3-panel grid -->
    <div class="crm-entity-grid">
      <aside class="crm-entity-side">
        <slot name="side-left" />
      </aside>

      <main class="crm-entity-main">
        <!-- Tabs -->
        <div v-if="tabs.length" class="crm-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="crm-tab"
            :class="{ active: activeTab === tab.value }"
            @click="$emit('update:activeTab', tab.value)"
          >
            <AppIcon v-if="tab.icon" :name="tab.icon" :size="13" />
            <span>{{ tab.label }}</span>
            <span v-if="tab.count !== undefined && tab.count !== null" class="count">{{
              tab.count
            }}</span>
          </button>
        </div>

        <!-- Tab content -->
        <div class="card p-5">
          <slot name="main" />
        </div>
      </main>

      <aside class="crm-entity-side">
        <slot name="side-right" />
      </aside>
    </div>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import StatusPill from "./StatusPill.vue";

  const { t } = useI18n();

  defineProps({
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    statusValue: { type: String, default: "" },
    statusLabel: { type: String, default: "" },
    statusColor: { type: String, default: "" },
    tabs: { type: Array, default: () => [] },
    activeTab: { type: String, default: "" },
  });

  defineEmits(["update:activeTab"]);
</script>

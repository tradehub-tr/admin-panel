<template>
  <div class="th-filter-bar-wrapper">
    <!-- Module Navigation Tabs -->
    <div v-if="!hideModuleTabs" class="th-module-tabs">
      <router-link
        v-for="mod in modules"
        :key="mod.route"
        :to="mod.route"
        class="th-module-tab"
        :class="{ active: isActive(mod.route) }"
      >
        <i :class="[mod.icon, 'text-[10px]']"></i>
        <span>{{ mod.label }}</span>
      </router-link>
    </div>

    <!-- Filter Row: Date Presets + Cross-filters + Actions -->
    <div class="th-filter-bar">
      <!-- Date Preset Selector -->
      <div class="th-tab-group">
        <button
          v-for="preset in presets"
          :key="preset.value"
          class="th-tab-btn"
          :class="{ active: filterStore.dateRange.preset === preset.value }"
          @click="filterStore.setPreset(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>

      <!-- Cross-filter Active Indicator -->
      <div v-if="crossFilterStore.hasFilters" class="flex items-center gap-2">
        <div
          v-for="filter in crossFilterStore.filterList"
          :key="filter.widgetId"
          class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
          style="background: var(--th-brand-50); color: var(--th-brand-500)"
        >
          <span>{{ filter.label || filter.field }}: {{ filter.value }}</span>
          <button
            class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            @click="crossFilterStore.clearFilter(filter.widgetId)"
          >
            <i class="fas fa-xmark text-[8px]"></i>
          </button>
        </div>
        <button
          class="text-[11px] font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          style="color: var(--th-neutral)"
          @click="crossFilterStore.clearAll()"
        >
          {{ t("globalFilterBar.clearAll") }}
        </button>
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Right-side actions -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { useFilterStore } from "@/stores/dashboard/useFilterStore";
  import { useCrossFilterStore } from "@/stores/dashboard/useCrossFilterStore";

  defineProps({
    hideModuleTabs: { type: Boolean, default: false },
  });

  const { t } = useI18n();
  const route = useRoute();
  const filterStore = useFilterStore();
  const crossFilterStore = useCrossFilterStore();

  const modules = computed(() => [
    { label: t("globalFilterBar.overview"), icon: "fas fa-grid-2", route: "/dashboard" },
    { label: t("globalFilterBar.orders"), icon: "fas fa-bag-shopping", route: "/dashboard/orders" },
    {
      label: t("globalFilterBar.payments"),
      icon: "fas fa-credit-card",
      route: "/dashboard/payments",
    },
    { label: t("globalFilterBar.sellers"), icon: "fas fa-store", route: "/dashboard/sellers" },
    { label: t("globalFilterBar.catalog"), icon: "fas fa-cube", route: "/dashboard/catalog" },
    {
      label: t("globalFilterBar.logistics"),
      icon: "fas fa-truck-fast",
      route: "/dashboard/logistics",
    },
    { label: t("globalFilterBar.marketing"), icon: "fas fa-rocket", route: "/dashboard/marketing" },
    {
      label: t("globalFilterBar.compliance"),
      icon: "fas fa-shield-halved",
      route: "/dashboard/compliance",
    },
  ]);

  const presets = computed(() => [
    { value: "7d", label: t("globalFilterBar.preset7d") },
    { value: "30d", label: t("globalFilterBar.preset30d") },
    { value: "90d", label: t("globalFilterBar.preset90d") },
    { value: "365d", label: t("globalFilterBar.preset365d") },
  ]);

  function isActive(modRoute) {
    if (modRoute === "/dashboard") {
      return route.path === "/dashboard";
    }
    return route.path.startsWith(modRoute);
  }
</script>

<style scoped>
  .th-filter-bar-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .th-module-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    background: var(--th-surface-elevated);
    border-radius: 10px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .th-module-tabs::-webkit-scrollbar {
    display: none;
  }

  .th-module-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 7px;
    white-space: nowrap;
    color: var(--th-neutral);
    text-decoration: none;
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }
  .th-module-tab:hover {
    color: #374151;
    background: rgba(108, 93, 211, 0.04);
  }

  .th-module-tab.active {
    background: var(--th-surface-card);
    color: var(--th-brand-500);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  :global(html.dark) .th-module-tabs {
    background: var(--th-surface-card);
  }
  :global(html.dark) .th-module-tab {
    color: #6b7280;
  }
  :global(html.dark) .th-module-tab:hover {
    color: #d1d5db;
    background: rgba(108, 93, 211, 0.08);
  }
  :global(html.dark) .th-module-tab.active {
    background: rgba(108, 93, 211, 0.15);
    color: #a78bfa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
</style>

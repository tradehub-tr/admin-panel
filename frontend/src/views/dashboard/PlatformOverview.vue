<template>
  <DynamicDashboard
    dashboard-key="platform_overview"
    :title="t('platformOverview.title')"
    :subtitle="t('platformOverview.subtitle')"
    :show-seller-filter="true"
  />
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import DynamicDashboard from "./DynamicDashboard.vue";

  const { t } = useI18n();
</script>

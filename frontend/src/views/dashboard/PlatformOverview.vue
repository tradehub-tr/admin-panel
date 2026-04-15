<template>
  <DynamicDashboard
    dashboard-key="platform_overview"
    title="Platform Genel Bakışı"
    subtitle="Platform geneli metrikler — canlı veri"
    :show-seller-filter="true"
  />
</template>

<script setup>
import DynamicDashboard from './DynamicDashboard.vue'
</script>

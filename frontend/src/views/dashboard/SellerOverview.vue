<template>
  <div>
    <SellerKybBanner />
    <DynamicDashboard
      dashboard-key="seller_overview"
      title="Mağaza Panelim"
      subtitle="Kendi mağazanıza ait canlı metrikler"
      scope="__me__"
    />
  </div>
</template>

<script setup>
  import DynamicDashboard from "./DynamicDashboard.vue";
  import SellerKybBanner from "@/components/SellerKybBanner.vue";
</script>

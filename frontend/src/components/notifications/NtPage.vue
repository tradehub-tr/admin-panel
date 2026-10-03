<script setup>
  /** Bildirim şablonları ekranlarının ortak kökü: modülün stil dilini (`.nt`) yükler. */
</script>

<template>
  <div class="nt nt-page">
    <slot />
  </div>
</template>

<style lang="scss">
  @use "@/assets/scss/notification-templates";

  .nt-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 1320px;
    margin: 0 auto;
  }
</style>

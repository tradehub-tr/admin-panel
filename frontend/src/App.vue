<template>
  <router-view />

  <!-- Rota değişiminin ekran okuyucuya duyurulduğu TEK canlı bölge
       (WCAG 2.4.3 / 4.1.3). Metni `router.afterEach` yazıyor; burada
       durmasının sebebi uygulama kökünün her rotada — panelde de giriş
       ekranında da — monte olması. -->
  <p class="sr-only" role="status" aria-live="polite">{{ pageAnnouncement }}</p>
</template>

<script setup>
  import { watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";

  import { useRouteAnnouncement } from "@/composables/useRouteAnnouncement";

  /**
   * Sekme başlığı gezinmede `router.afterEach`te yazılıyor; DİL değişimi
   * gezinme değil — başlık aksi hâlde eski dilde kalırdı. Duyuru burada
   * tekrarlanmıyor: dili değiştiren kullanıcı zaten sayfayı bilmiyor değil.
   *
   * Kaynak `@/router` DEĞİL, composable (SOLID denetimi 2026-08-24):
   * uygulama kökü 1300 satırlık rota tablosuna bağlanmamalı.
   */
  const { applyPageTitle, pageAnnouncement } = useRouteAnnouncement();
  const route = useRoute();
  const { locale } = useI18n();

  watch(locale, () => applyPageTitle(route));
</script>

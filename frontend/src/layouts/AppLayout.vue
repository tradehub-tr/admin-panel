<template>
  <div class="h-full font-sans bg-[#f6f6f9] text-gray-800 antialiased">
    <!-- Kabuk scroll etmez; yalnızca içerik kolonu kendi içinde scroll eder -->
    <div class="flex h-full overflow-hidden">
      <!-- ≥768px: IconRail + SidePanel. <768px: ikisi de kalkar, MobileTabBar gelir. -->
      <IconRail v-if="isLg" />
      <SidePanel v-if="isLg" />

      <!-- Main content: kalan alanı doldurur, scroll bu kolonda -->
      <div class="flex-1 min-w-0 flex flex-col h-full overflow-y-auto app-content-col">
        <AppHeader />
        <NotificationPanel />

        <main class="flex-1 p-4 xl:p-6 page-content">
          <SellerTrialBanner class="mb-2" />
          <router-view />
        </main>

        <AppFooter />
      </div>
    </div>

    <!-- Mobil alt gezinme: rail/panel'in <768px karşılığı -->
    <MobileTabBar v-if="!isLg" />

    <ToastContainer />

    <!-- Rehberli onboarding turu (her menü/bölüm) -->
    <GuidedTour />

    <!-- Floating Storefront Button (Satıcı / Admin kullanıcılar için).
         Mobilde içeriğin üzerinde yüzdüğü için gösterilmez; oradaki karşılığı
         MobileTabBar'ın "Daha" sheet'indeki Mağaza satırıdır. -->
    <a
      v-if="showStorefrontBtn && isLg"
      :href="storefrontUrl"
      target="_blank"
      rel="noopener noreferrer"
      :title="t('appLayout.goToStorefront')"
      class="th-goto-storefront-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
        style="flex-shrink: 0; margin-top: 1px"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
      <span>{{ t("appLayout.storefront") }}</span>
    </a>
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, watch } from "vue";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { useNavigationStore } from "@/stores/navigation";
  import { useAuthStore } from "@/stores/auth";
  import { useNotificationStore } from "@/stores/notification";
  import IconRail from "@/components/layout/IconRail.vue";
  import SidePanel from "@/components/layout/SidePanel.vue";
  import MobileTabBar from "@/components/layout/MobileTabBar.vue";
  import AppHeader from "@/components/layout/AppHeader.vue";
  import AppFooter from "@/components/layout/AppFooter.vue";
  import NotificationPanel from "@/components/layout/NotificationPanel.vue";
  import ToastContainer from "@/components/layout/ToastContainer.vue";
  import GuidedTour from "@/components/layout/GuidedTour.vue";
  import { useTourStore } from "@/stores/tour";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import SellerTrialBanner from "@/components/SellerTrialBanner.vue";

  const { t } = useI18n();
  // <768px: rail + panel yerine MobileTabBar render edilir.
  const { isLg } = useBreakpoint();
  const route = useRoute();
  const nav = useNavigationStore();
  const auth = useAuthStore();
  const notifications = useNotificationStore();
  const tour = useTourStore();

  // Sidebar (rail + panel) aktif bölümü her zaman URL'i takip etsin. Dashboard
  // hızlı linkleri, breadcrumb ve router.push switchSection çağırmadığı için
  // aksi hâlde rail/panel önceki bölümde takılı kalıyordu.
  watch(
    () => route.path,
    () => nav.syncActiveFromRoute(route.path, route.meta?.section),
    { immediate: true }
  );

  // Her bölüme (sayfa grubuna) ilk girişte o bölümün kısa onboarding turunu başlat.
  // Aktif bölüm değişince, sürmekte olan farklı bölüm turu varsa kapatılır.
  watch(
    () => nav.activeSection,
    (sec) => {
      if (!sec) return;
      if (tour.active && tour.sectionId !== sec) tour.end();
      setTimeout(() => tour.maybeAutoStart(sec), 450);
    }
  );

  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5500/";
  const showStorefrontBtn = computed(() => auth.isSeller || auth.isAdmin);

  onMounted(async () => {
    // Sprint 6 — DB-driven sidebar: TH Module Registry/Policy fetch.
    // Hata olursa store fallback olarak hard-coded navigation.js'i kullanır.
    await nav.loadDbSections();
    nav.syncActiveFromRoute(route.path, route.meta?.section);
    notifications.startPolling();
    // İlk yüklemede aktif bölümün turunu başlat (DOM/sidebar hazır olsun diye gecikmeli).
    setTimeout(() => tour.maybeAutoStart(nav.activeSection), 700);
  });

  onUnmounted(() => {
    notifications.stopPolling();
  });
</script>

<style scoped>
  .th-goto-storefront-btn {
    position: fixed;
    bottom: 88px;
    right: 20px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: #2c3e50;
    color: #ffffff;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    transition: background 0.15s ease;
    line-height: 1;
  }
  .th-goto-storefront-btn:hover {
    background: #1a252f;
  }
</style>

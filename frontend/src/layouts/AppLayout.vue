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

        <!-- `id` + `tabindex="-1"`: rota değişiminde odak buraya taşınıyor
             (router `afterEach`, WCAG 2.4.3). Tab sırasına GİRMEZ — negatif
             tabindex yalnız programatik odağı açar. -->
        <main :id="PAGE_MAIN_ID" tabindex="-1" class="flex-1 p-4 xl:p-6 page-content">
          <SellerTrialBanner class="mb-2" />
          <DunningBanner class="mb-2" />
          <!-- Sayfa girişi: yalnız GİRİŞ animasyonlu (opacity + 6px yukarı, 180ms).
               Çıkış anında — `@leave` done()'u eşzamanlı çağırır, eski sayfa aynı
               tick'te DOM'dan kalkar; iki sayfa üst üste binmez, gezinme beklemez.
               `:key` YOK: yalnız query/param değişen rotada bileşen yeniden
               kullanılır (eski davranış); geçiş yalnız eşleşen bileşen değişince. -->
          <router-view v-slot="{ Component }">
            <Transition name="page" appear @leave="onPageLeave">
              <component :is="Component" />
            </Transition>
          </router-view>
        </main>

        <AppFooter />
      </div>
    </div>

    <!-- Mobil alt gezinme: rail/panel'in <768px karşılığı -->
    <MobileTabBar v-if="!isLg" />

    <ToastContainer />

    <!-- Medya yükleme tepsisi: kuyruk medya store'unda (genel), yüklemeler sayfa
         değişince sürüyor. Store hiç kurulmadıysa yükleme de yoktur — bileşen
         (ve store paketi) ancak o zaman indirilir. -->
    <MediaUploadTrayHost v-if="mediaStoreReady" />

    <!-- Rehberli onboarding turu (her menü/bölüm) -->
    <GuidedTour />

    <!-- Floating Storefront Button (Satıcı / Admin kullanıcılar için).
         Mobilde içeriğin üzerinde yüzdüğü için gösterilmez; oradaki karşılığı
         MobileTabBar'ın "Daha" sheet'indeki Mağaza satırıdır. -->
    <a
      v-if="showStorefrontBtn && isLg"
      :href="storefrontHref"
      target="_blank"
      rel="noopener noreferrer"
      :title="t('appLayout.goToStorefront')"
      class="th-goto-storefront-btn"
    >
      <AppIcon name="shopping-cart" :size="15" :stroke-width="1.8" class="shrink-0 mt-px" />
      <span>{{ t("appLayout.storefront") }}</span>
    </a>
  </div>
</template>

<script setup>
  import { computed, defineAsyncComponent, onMounted, onUnmounted, watch } from "vue";
  import { getActivePinia } from "pinia";
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
  import AppIcon from "@/components/common/AppIcon.vue";
  import { PAGE_MAIN_ID } from "@/constants/layout";
  import { useTourStore } from "@/stores/tour";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import SellerTrialBanner from "@/components/SellerTrialBanner.vue";
  import DunningBanner from "@/components/DunningBanner.vue";
  import { storefrontBase } from "@/utils/storefrontUrl";

  const MediaUploadTrayHost = defineAsyncComponent(
    () => import("@/components/media/MediaUploadTrayHost.vue")
  );
  const pinia = getActivePinia();
  const mediaStoreReady = computed(() => Boolean(pinia?.state.value.media));

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

  // `utils/storefrontUrl` bu değişkeni tek yerde okumak için yazıldı ("aynı
  // ortam değişkeni panelin altı ayrı yerinde elle okunuyordu"); bu iki
  // yerleşim bileşeni onu atlayıp KENDİ yedeğini taşıyordu. Yedekler de
  // aynı değildi: util `window.location.origin` derken burası
  // `http://localhost:5500/` diyordu — yerel build'de panelden vitrine
  // giden düğme var olmayan bir porta gidiyordu (ölçüldü 7 Eyl).
  const storefrontHref = storefrontBase() || "/";

  // Çıkan sayfa beklemeden kaldırılır (bkz. template'teki <Transition>).
  function onPageLeave(_el, done) {
    done();
  }
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

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  /* Programatik odak halkası çizilmesin: `<main>` Tab ile ulaşılamıyor
     (tabindex="-1"), görünür halka burada bilgi taşımaz — klavye odağının
     gerçek göstergesi içerideki ilk etkileşimli öğe. */
  .page-content:focus {
    outline: none;
  }

  /* Sayfa girişi — ease-out: hareketin hızlı kısmı kullanıcının baktığı anda.
     Yalnız transform + opacity (compositor). */
  .page-enter-active {
    transition:
      opacity $d-page $ease-out,
      transform $d-page $ease-out;
  }
  .page-enter-from {
    opacity: 0;
    transform: translateY(6px);
  }

  /* Azaltılmış hareket: kayma yok, global kural süreyi zaten ~0'a çekiyor. */
  @media (prefers-reduced-motion: reduce) {
    .page-enter-from {
      transform: none;
    }
  }

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

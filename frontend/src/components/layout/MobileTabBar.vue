<template>
  <!-- Mobil (<768px) alt gezinme: 4 birincil bölüm + Daha. Rail/panel'in yerini alır. -->
  <nav class="m-tabbar" :aria-label="t('mobileNav.menu')">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="m-tab"
      :class="{ active: nav.activeSection === tab.id }"
      @click="openSection(tab.id)"
    >
      <span class="m-tab-icon"><AppIcon :name="tab.icon" :size="18" /></span>
      <span class="m-tab-label">{{ t(tab.label) }}</span>
    </button>
    <button class="m-tab" :class="{ active: moreHasActive }" @click="openMore">
      <span class="m-tab-icon"><AppIcon name="ellipsis" :size="18" /></span>
      <span class="m-tab-label">{{ t("mobileNav.more") }}</span>
    </button>
  </nav>

  <Transition name="fade">
    <div v-if="sheetOpen" class="m-sheet-backdrop" aria-hidden="true" @click="closeSheet"></div>
  </Transition>

  <Transition name="m-sheet">
    <div v-if="sheetOpen" class="m-sheet" role="dialog" aria-modal="true">
      <div class="m-sheet-grab" aria-hidden="true"></div>

      <!-- Bölüm modu: seçilen bölümün grupları ve sayfaları -->
      <template v-if="sheetSection">
        <div class="m-sheet-head">
          <span class="m-sheet-ic"><AppIcon :name="sheetSection.icon" :size="16" /></span>
          <span class="m-sheet-title">{{ t(sheetSection.label) }}</span>
          <span class="m-sheet-count">{{
            t("mobileNav.pageCount", { n: countFor(sheetSection.id) })
          }}</span>
          <button class="m-sheet-close" :aria-label="t('side.closePanel')" @click="closeSheet">
            <AppIcon name="x" :size="15" />
          </button>
        </div>
        <div class="m-sheet-body">
          <template v-for="(group, gi) in sheetGroups" :key="gi">
            <div
              v-if="group.title"
              class="m-group-label"
              :style="{ '--group-color': group.color || '#d39c00' }"
            >
              <span class="m-group-dot"></span>{{ t(group.title) }}
            </div>
            <button
              v-for="item in group.items"
              :key="item.label"
              class="m-item"
              :class="{ active: isItemActive(item) }"
              @click="go(item)"
            >
              <AppIcon :name="item.icon" :size="15" class="m-item-icon" />
              <span class="m-item-label">{{ t(item.label) }}</span>
              <AppIcon
                v-if="item.locked"
                name="lock"
                :size="12"
                class="m-item-lock"
                :title="t('feed.upgradeBadge')"
              />
              <AppIcon name="chevron-right" :size="14" class="m-item-chev" />
            </button>
          </template>
        </div>
      </template>

      <!-- Daha modu: kalan bölümler + yardımcı eylemler -->
      <template v-else>
        <div class="m-sheet-head">
          <span class="m-sheet-title">{{ t("mobileNav.allSections") }}</span>
          <button class="m-sheet-close" :aria-label="t('side.closePanel')" @click="closeSheet">
            <AppIcon name="x" :size="15" />
          </button>
        </div>
        <div class="m-sheet-body">
          <div class="m-sec-grid">
            <button
              v-for="s in moreSections"
              :key="s.id"
              class="m-sec-card"
              :class="{ active: nav.activeSection === s.id }"
              @click="openSection(s.id)"
            >
              <AppIcon :name="s.icon" :size="18" />
              <span>{{ t(s.label) }}</span>
              <span class="m-sec-count">{{ t("mobileNav.pageCount", { n: countFor(s.id) }) }}</span>
            </button>
          </div>
          <div class="m-more-actions">
            <a
              v-if="showStorefront"
              :href="storefrontUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="m-item"
              @click="closeSheet"
            >
              <AppIcon name="shopping-cart" :size="15" class="m-item-icon" />
              <span class="m-item-label">{{ t("appLayout.storefront") }}</span>
              <AppIcon name="external-link" :size="13" class="m-item-chev" />
            </a>
            <button class="m-item" @click="restartTour">
              <AppIcon name="circle-question-mark" :size="15" class="m-item-icon" />
              <span class="m-item-label">{{ t("tourSteps.restart") }}</span>
            </button>
            <button class="m-item" @click="toggleTheme">
              <AppIcon
                :name="currentTheme === 'dark' ? 'sun' : 'moon'"
                :size="15"
                class="m-item-icon"
              />
              <span class="m-item-label">{{ t("userMenuDropdown.theme") }}</span>
            </button>
            <button class="m-item" @click="handleLogout">
              <AppIcon name="log-out" :size="15" class="m-item-icon" />
              <span class="m-item-label">{{ t("userMenuDropdown.logout") }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </Transition>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import {
    adminRailSections,
    sellerRailSections,
    adminMobileTabSections,
    sellerMobileTabSections,
  } from "@/data/navigation";
  import { useNavigationStore } from "@/stores/navigation";
  import { useAuthStore } from "@/stores/auth";
  import { useTourStore } from "@/stores/tour";
  import { useTheme } from "@/composables/useTheme";
  import { resolveNavItemRoute } from "@/utils/navItemRoute";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const nav = useNavigationStore();
  const auth = useAuthStore();
  const tour = useTourStore();
  const route = useRoute();
  const router = useRouter();
  const { currentTheme, setTheme } = useTheme();

  const sheetOpen = ref(false);
  // null → "Daha" modu; dolu → bölüm modu (rail section objesi)
  const sheetSection = ref(null);

  const isSellerOnly = computed(() => auth.isSeller && !auth.isAdmin);
  const railSections = computed(() =>
    isSellerOnly.value ? sellerRailSections : adminRailSections
  );
  const tabIds = computed(() =>
    isSellerOnly.value ? sellerMobileTabSections : adminMobileTabSections
  );
  const tabs = computed(() =>
    tabIds.value.map((id) => railSections.value.find((s) => s.id === id)).filter(Boolean)
  );
  const moreSections = computed(() =>
    railSections.value.filter((s) => !tabIds.value.includes(s.id))
  );
  const moreHasActive = computed(() => !tabIds.value.includes(nav.activeSection));

  // Mağaza linki: desktop'taki floating buton mobilde gizli, karşılığı burada.
  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5500/";
  const showStorefront = computed(() => auth.isSeller || auth.isAdmin);

  const sheetGroups = computed(() =>
    sheetSection.value ? nav.groupsFor(sheetSection.value.id) : []
  );

  function countFor(sectionId) {
    return nav.groupsFor(sectionId).reduce((n, g) => n + (g.items?.length || 0), 0);
  }

  function openSection(sectionId) {
    sheetSection.value = railSections.value.find((s) => s.id === sectionId) || null;
    sheetOpen.value = true;
  }

  function openMore() {
    sheetSection.value = null;
    sheetOpen.value = true;
  }

  function closeSheet() {
    sheetOpen.value = false;
    sheetSection.value = null;
  }

  function getItemRoute(item) {
    return resolveNavItemRoute(item, { isAdmin: auth.isAdmin, user: auth.user });
  }

  function isItemActive(item) {
    const itemPath = getItemRoute(item);
    if (route.path === itemPath) return true;
    if (item.doctype && route.path.startsWith(`/app/${encodeURIComponent(item.doctype)}/`))
      return true;
    return false;
  }

  function go(item) {
    const target = getItemRoute(item);
    if (!target || target === "#") return;
    nav.setActiveItem(item.doctype || item.report || item.route);
    router.push(target).catch(() => {});
    closeSheet();
  }

  function restartTour() {
    closeSheet();
    tour.restartContext(nav.activeSection);
  }

  function toggleTheme() {
    setTheme(currentTheme.value === "dark" ? "light" : "dark");
  }

  async function handleLogout() {
    closeSheet();
    await auth.logout();
    router.push("/login");
  }

  // Route değişince (tarayıcı geri tuşu dahil) açık sheet kapanır.
  watch(() => route.path, closeSheet);

  function onKeydown(e) {
    if (e.key === "Escape" && sheetOpen.value) closeSheet();
  }

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

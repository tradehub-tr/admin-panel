<template>
  <!-- Mobil overlay backdrop: panel içeriğin üzerine açıldığında arkayı karartır -->
  <Transition name="fade">
    <div
      v-if="isOverlay && sidebar.panelVisible"
      class="sidebar-panel-backdrop"
      aria-hidden="true"
      @click="sidebar.closePanel()"
    ></div>
  </Transition>

  <aside
    id="sidePanel"
    class="sidebar-panel border-r sidebar-panel-border flex flex-col transition-all duration-200 flex-shrink-0 overflow-hidden"
    :class="isOverlay ? 'sidebar-panel--overlay' : 'h-full'"
    :style="{ width: sidebar.panelVisible ? '220px' : '0px' }"
  >
    <!-- Panel Header -->
    <div
      class="flex items-center justify-between h-[56px] px-4 border-b sidebar-panel-border flex-shrink-0"
    >
      <span class="sidebar-panel-title tracking-tight truncate">{{ t(nav.sectionTitle) }}</span>
      <button
        class="rounded-md flex items-center justify-center sidebar-panel-close-btn transition-all flex-shrink-0"
        :title="t('side.closePanel')"
        @click="sidebar.togglePanel()"
      >
        <AppIcon name="chevrons-left" :size="14" />
      </button>
    </div>

    <!-- Panel Content (overflow-x-hidden: uzun başlıklar x-scroll oluşturmasın) -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden panel-scroll py-3">
      <template v-for="(group, idx) in nav.currentGroups" :key="idx">
        <!-- Group Title (clickable accordion header) -->
        <div
          v-if="group.title"
          class="panel-group-title"
          :style="{ '--group-color': group.color || '#d39c00' }"
          @click="nav.toggleGroup(group.title)"
        >
          <div class="panel-group-title-left">
            <div class="panel-group-color-bar"></div>
            <span>{{ t(group.title) }}</span>
          </div>
          <div class="panel-group-title-right">
            <span class="pg-count" :style="{ '--group-color': group.color || '#d39c00' }">{{
              group.items.length
            }}</span>
            <svg
              class="panel-group-chevron"
              :class="{ open: nav.isGroupOpen(group.title) }"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <!-- Group Items -->
        <div
          class="panel-group"
          :class="{
            collapsible: !!group.title,
            open: !group.title || nav.isGroupOpen(group.title),
          }"
        >
          <router-link
            v-for="item in group.items"
            :key="item.label"
            :to="getItemRoute(item)"
            class="panel-item"
            :class="{ active: isItemActive(item) }"
            :data-tour-item="item.route || item.doctype || item.report || item.label"
            @click="handleItemClick(item)"
          >
            <AppIcon :name="item.icon" :size="15" class="panel-item-icon" />
            <span class="panel-item-label">{{ t(item.label) }}</span>
            <AppIcon
              v-if="item.locked"
              name="lock"
              :size="12"
              class="panel-item-lock"
              :title="t('feed.upgradeBadge')"
            />
          </router-link>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup>
  import { computed, onMounted, onUnmounted } from "vue";
  import { useNavigationStore } from "@/stores/navigation";
  import { useAuthStore } from "@/stores/auth";
  import { useSidebarStore } from "@/stores/sidebar";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { resolveNavItemRoute } from "@/utils/navItemRoute";

  const { t } = useI18n();
  const nav = useNavigationStore();
  const auth = useAuthStore();
  const sidebar = useSidebarStore();
  const route = useRoute();

  // <768px: panel akışta yer kaplamak yerine içeriğin üzerine overlay açılır.
  const { isLg } = useBreakpoint();
  const isOverlay = computed(() => !isLg.value);

  function onKeydown(e) {
    if (e.key === "Escape" && isOverlay.value && sidebar.panelVisible) sidebar.closePanel();
  }

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onUnmounted(() => document.removeEventListener("keydown", onKeydown));

  function getItemRoute(item) {
    return resolveNavItemRoute(item, { isAdmin: auth.isAdmin, user: auth.user });
  }

  function isItemActive(item) {
    const currentPath = route.path;
    const itemPath = getItemRoute(item);
    if (currentPath === itemPath) return true;
    // Form view'dayken de sidebar item'ı aktif göster
    if (item.doctype && currentPath.startsWith(`/app/${encodeURIComponent(item.doctype)}/`))
      return true;
    return false;
  }

  function handleItemClick(item) {
    nav.setActiveItem(item.doctype || item.report || item.route);
    // Overlay modunda seçim yapılınca panel kapanır, içerik görünür kalır.
    if (isOverlay.value) sidebar.closePanel();
  }
</script>

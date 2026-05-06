<template>
  <div
    class="w-[60px] h-screen sticky top-0 z-50 sidebar-rail flex flex-col items-center border-r sidebar-rail-border flex-shrink-0"
  >
    <TenantSwitcher />

    <div class="flex-1 w-full flex flex-col items-center py-3 gap-1 overflow-y-auto rail-scroll">
      <button
        v-for="section in railSections"
        :key="section.id"
        class="rail-icon"
        :class="{ active: nav.activeSection === section.id }"
        :data-section="section.id"
        @click="nav.switchSection(section.id)"
      >
        <AppIcon :name="section.icon" :size="18" />
        <span class="rail-label">{{ section.label }}</span>
      </button>
    </div>

    <div class="w-full flex flex-col items-center gap-1 py-3 border-t sidebar-rail-border">
      <button class="rail-icon" @click="toast.info('Yardım merkezi açılıyor...')">
        <AppIcon name="circle-question-mark" :size="18" />
        <span class="rail-label">Yardım</span>
      </button>
      <button class="rail-icon" @click.stop="toggleOverlay('railQuickLinks')">
        <AppIcon name="grid-3x3" :size="18" />
        <span class="rail-label">Linkler</span>
      </button>
      <div class="rail-icon rail-avatar-btn">
        <input
          ref="avatarFileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="hidden"
          @change="onAvatarSelected"
        />
        <div class="rail-avatar-frame relative">
          <button
            type="button"
            class="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[#6c5dd3]/50 transition-all flex items-center justify-center cursor-pointer p-0 border-0"
            :title="auth.user?.full_name || 'Hesap'"
            @click.stop="toggleOverlay('railUserMenu')"
          >
            <img
              v-if="auth.user?.user_image"
              :src="auth.user.user_image"
              alt=""
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold"
            >
              {{ tenant.activeTenant?.initials || "AK" }}
            </div>
          </button>
          <button
            type="button"
            class="rail-camera-btn absolute -bottom-2 -right-2 rounded-full bg-slate-800 dark:bg-slate-100 hover:bg-violet-600 dark:hover:bg-violet-500 dark:hover:text-white border-2 border-white dark:border-slate-800 text-white dark:text-slate-800 cursor-pointer shadow-md transition-colors disabled:opacity-60 disabled:cursor-wait z-10"
            :disabled="uploadingAvatar"
            :title="uploadingAvatar ? 'Yükleniyor…' : 'Avatarı Değiştir'"
            @click.stop="triggerAvatarUpload"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="display: block; flex-shrink: 0"
            >
              <path
                d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
              />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </button>
        </div>
        <span class="rail-label">Hesap</span>
      </div>
    </div>

    <!-- Dropdown Components -->
    <UserMenuDropdown
      :open="activeOverlay === 'railUserMenu'"
      :current-theme="currentTheme"
      @navigate="navigateTo"
      @logout="handleLogout"
      @set-theme="handleSetTheme"
    />
    <QuickLinksDropdown :open="activeOverlay === 'railQuickLinks'" @navigate="navigateTo" />
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import { adminRailSections, sellerRailSections } from "@/data/navigation";
  import { useNavigationStore } from "@/stores/navigation";
  import { useTenantStore } from "@/stores/tenant";
  import { useAuthStore } from "@/stores/auth";
  import { useToast } from "@/composables/useToast";
  import { useTheme } from "@/composables/useTheme";
  import { useOverlay } from "@/composables/useOverlay";
  import TenantSwitcher from "@/components/navigation/TenantSwitcher.vue";
  import UserMenuDropdown from "@/components/navigation/UserMenuDropdown.vue";
  import QuickLinksDropdown from "@/components/navigation/QuickLinksDropdown.vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const nav = useNavigationStore();
  const tenant = useTenantStore();
  const auth = useAuthStore();
  const avatarFileInput = ref(null);
  const uploadingAvatar = ref(false);

  // Rol bazlı rail sections
  const railSections = computed(() =>
    auth.isSeller && !auth.isAdmin ? sellerRailSections : adminRailSections
  );
  const toast = useToast();
  const router = useRouter();
  const { currentTheme, setTheme } = useTheme();
  const { active: activeOverlay, toggle: toggleOverlay, close: closeOverlays } = useOverlay();

  function handleSetTheme(theme) {
    setTheme(theme);
    closeOverlays();
    toast.info(`Tema: ${theme === "dark" ? "Koyu" : "Açık"}`);
  }

  function navigateTo(path) {
    closeOverlays();
    router.push(path);
  }

  async function handleLogout() {
    closeOverlays();
    await auth.logout();
    router.push("/login");
  }

  function triggerAvatarUpload() {
    if (uploadingAvatar.value) return;
    closeOverlays();
    avatarFileInput.value?.click();
  }

  async function onAvatarSelected(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    uploadingAvatar.value = true;
    try {
      await auth.uploadProfileImage(file);
      toast.success("Profil fotoğrafı güncellendi.");
    } catch (err) {
      toast.error(err?.message || "Profil fotoğrafı yüklenemedi.");
    } finally {
      uploadingAvatar.value = false;
      input.value = "";
    }
  }

  function handleOutsideClick(e) {
    const inside = e.target.closest('[class*="absolute bottom"]');
    const rail = e.target.closest(".rail-icon") || e.target.closest(".rail-avatar-btn");
    const header = e.target.closest(".hdr-icon-btn") || e.target.closest("#notificationPanel");
    if (!inside && !rail && !header) closeOverlays();
  }

  onMounted(() => document.addEventListener("click", handleOutsideClick));
  onUnmounted(() => document.removeEventListener("click", handleOutsideClick));
</script>

<template>
  <div class="sle-root">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          @click="$router.push('/dashboard')"
        >
          <i class="fas fa-arrow-left text-xs"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">
            {{ t("storefrontLayoutEditor.pageTitle") }}
          </h1>
          <p class="text-xs text-gray-400">{{ t("storefrontLayoutEditor.pageSubtitle") }}</p>
        </div>
      </div>
      <!-- Masaüstü eylemler: mobilde sabit alt çubuğa taşınır (hidden lg:flex) -->
      <div class="hidden lg:flex items-center gap-2 flex-shrink-0 flex-wrap">
        <a
          v-if="sellerCode"
          :href="storefrontUrl"
          target="_blank"
          class="hdr-btn-outlined text-xs"
          data-tour="sle-preview"
        >
          <i class="fas fa-external-link mr-1.5"></i>{{ t("storefrontLayoutEditor.preview") }}
        </a>
        <span
          v-if="!canEdit"
          class="text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded"
          :title="t('storefrontLayoutEditor.noEditPermission')"
        >
          <i class="fas fa-lock mr-1"></i>{{ t("storefrontLayoutEditor.viewOnly") }}
        </span>
        <button
          class="hdr-btn-outlined"
          :class="{ 'opacity-50': !hasChanges || !canEdit }"
          :disabled="!hasChanges || !canEdit"
          @click="resetLayout"
        >
          <i class="fas fa-undo mr-1.5 text-xs"></i>{{ t("storefrontLayoutEditor.reset") }}
        </button>
        <button
          class="hdr-btn-primary"
          :class="{ 'opacity-50': !canEdit }"
          :disabled="saving || !canEdit"
          data-tour="sle-save"
          @click="saveLayout"
        >
          <i
            :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'"
            class="mr-1.5 text-xs"
          ></i>
          {{ saving ? t("storefrontLayoutEditor.saving") : t("storefrontLayoutEditor.save") }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-brand-700"></i>
      <p class="text-sm text-gray-400 mt-3">{{ t("storefrontLayoutEditor.loading") }}</p>
    </div>

    <!-- No Seller -->
    <div v-else-if="!sellerCode" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <i class="fas fa-store text-2xl text-gray-500"></i>
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">
        {{ t("storefrontLayoutEditor.noSellerTitle") }}
      </h3>
      <p class="text-xs text-gray-400">{{ t("storefrontLayoutEditor.noSellerDesc") }}</p>
    </div>

    <!-- Editor -->
    <template v-else>
      <!-- Mobil (<lg) segment kontrol: Sayfam (canvas) / Bölüm Ekle (palet) -->
      <div class="lg:hidden mb-4">
        <div class="sle-seg">
          <button
            type="button"
            :class="{ on: mobileTab === 'page' }"
            @click="mobileTab = 'page'"
          >
            <i class="fas fa-layer-group"></i>
            {{ t("storefrontLayoutEditor.tabMyPage") }}
            <span class="n">{{ sections.length }}</span>
          </button>
          <button
            type="button"
            :class="{ on: mobileTab === 'add' }"
            @click="mobileTab = 'add'"
          >
            <i class="fas fa-plus"></i>
            {{ t("storefrontLayoutEditor.tabAddSection") }}
            <span class="n">{{ availableSections.length }}</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <!-- LEFT: Section Palette · mobilde "Bölüm Ekle" sekmesi -->
        <div
          class="col-span-12 lg:col-span-3 lg:block"
          :class="{ hidden: mobileTab !== 'add' }"
          data-tour="sle-palette"
        >
          <div class="card lg:sticky lg:top-4">
            <h3 class="text-sm font-bold text-gray-900 mb-3">
              <i class="fas fa-puzzle-piece text-brand-700 mr-2"></i
              >{{ t("storefrontLayoutEditor.sections") }}
            </h3>
            <!-- Masaüstü: sürükle/çift-tık ipucu · Mobil: dokun-ekle ipucu -->
            <p class="text-[10px] text-gray-400 mb-3 hidden lg:block">
              {{ t("storefrontLayoutEditor.sectionsHint") }}
            </p>
            <p class="text-[11px] text-gray-500 mb-3 lg:hidden">
              {{ t("storefrontLayoutEditor.sectionsHintMobile") }}
            </p>

            <draggable
              :list="availableSections"
              :group="{ name: 'sections', pull: 'clone', put: false }"
              :clone="cloneSection"
              item-key="type"
              :sort="false"
              class="grid grid-cols-2 gap-2 lg:block lg:space-y-1.5"
            >
              <template #item="{ element }">
                <div
                  class="flex items-center gap-2 px-3 py-3 lg:py-2 border border-gray-200 rounded-lg lg:cursor-grab hover:border-brand-400 hover:bg-brand-50/30 active:bg-brand-50 bg-white transition-all"
                  @click="onPaletteTap(element.type)"
                  @dblclick="addSection(element.type)"
                >
                  <i :class="element.icon" class="text-xs flex-shrink-0" :style="{ color: element.color }"></i>
                  <span class="text-[11px] font-medium text-gray-700 truncate">{{ element.label }}</span>
                  <i class="fas fa-plus text-[10px] text-brand-600 ml-auto lg:hidden"></i>
                </div>
              </template>
            </draggable>

            <!-- Theme Settings -->
            <div class="mt-5 pt-4 border-t border-gray-100">
              <h3 class="text-sm font-bold text-gray-900 mb-3">
                <i class="fas fa-palette text-amber-500 mr-2"></i
                >{{ t("storefrontLayoutEditor.theme") }}
              </h3>
              <div class="space-y-3">
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("storefrontLayoutEditor.primaryColor")
                  }}</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input
                      v-model="theme.primaryColor"
                      type="color"
                      class="w-7 h-7 rounded border cursor-pointer"
                    />
                    <input
                      v-model="theme.primaryColor"
                      type="text"
                      class="form-input text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("storefrontLayoutEditor.accentColor")
                  }}</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input
                      v-model="theme.accentColor"
                      type="color"
                      class="w-7 h-7 rounded border cursor-pointer"
                    />
                    <input
                      v-model="theme.accentColor"
                      type="text"
                      class="form-input text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("storefrontLayoutEditor.navBackground")
                  }}</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input
                      v-model="theme.navBgColor"
                      type="color"
                      class="w-7 h-7 rounded border cursor-pointer"
                    />
                    <input
                      v-model="theme.navBgColor"
                      type="text"
                      class="form-input text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Active Sections (sortable) · mobilde "Sayfam" sekmesi -->
        <div
          class="col-span-12 lg:col-span-9 lg:block"
          :class="{ hidden: mobileTab !== 'page' }"
          data-tour="sle-canvas"
        >
          <!-- Fixed: Store Header (silinemez ama duzenlenebilir — logo, slogan, header bg) -->
          <div
            class="mb-2 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden"
          >
            <div
              class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
              @click="headerExpanded = !headerExpanded"
            >
              <i class="fas fa-lock text-[10px] text-gray-400"></i>
              <span class="text-xs font-medium text-gray-600 flex-1">{{
                t("storefrontLayoutEditor.storeHeaderFixed")
              }}</span>
              <span class="text-[14px] text-gray-400 leading-none w-4 text-center">
                {{ headerExpanded ? "▲" : "▼" }}
              </span>
            </div>

            <div
              v-show="headerExpanded"
              class="border-t border-gray-200 px-4 py-3 bg-white space-y-4"
            >
              <!-- Logo Upload -->
              <div>
                <label class="text-[10px] font-semibold text-gray-500 uppercase block mb-2">{{
                  t("storefrontLayoutEditor.companyLogo")
                }}</label>
                <div class="flex items-center gap-3">
                  <div
                    class="relative w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0"
                  >
                    <img
                      v-if="storeHeader.logo"
                      :src="resolveStoreHeaderUrl(storeHeader.logo)"
                      alt="Logo"
                      class="w-full h-full object-cover"
                    />
                    <i v-else class="fas fa-building text-2xl text-gray-300"></i>

                    <!-- tradehub-upload-ui pattern: bar overlay -->
                    <div
                      v-if="logoUpload.status.value === 'uploading'"
                      class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                    >
                      <div
                        class="h-full bg-white rounded-full transition-all duration-300"
                        :style="{ width: Math.max(4, logoUpload.progress.value) + '%' }"
                      ></div>
                    </div>
                    <Transition name="fade">
                      <div
                        v-if="logoUpload.status.value === 'success'"
                        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-[11px] font-bold pointer-events-none"
                      >
                        ✓
                      </div>
                    </Transition>
                  </div>
                  <div class="flex-1">
                    <input
                      ref="logoInputEl"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="onHeaderFileChange($event, 'logo')"
                    />
                    <button
                      type="button"
                      :disabled="headerUploading.logo"
                      class="text-[11px] px-3 py-1.5 border border-brand-300 text-brand-800 rounded hover:bg-brand-50 disabled:opacity-50"
                      @click="$refs.logoInputEl.click()"
                    >
                      <i class="fas fa-cloud-arrow-up mr-1.5"></i>
                      {{
                        headerUploading.logo
                          ? t("storefrontLayoutEditor.uploading")
                          : storeHeader.logo
                            ? t("storefrontLayoutEditor.changeLogo")
                            : t("storefrontLayoutEditor.uploadLogo")
                      }}
                    </button>
                    <button
                      v-if="storeHeader.logo"
                      type="button"
                      class="text-[11px] ml-1 px-2 py-1.5 text-red-500 hover:bg-red-50 rounded"
                      @click="
                        storeHeader.logo = '';
                        saveStoreHeader();
                      "
                    >
                      {{ t("storefrontLayoutEditor.remove") }}
                    </button>
                    <p class="text-[10px] text-gray-400 mt-1">
                      {{ t("storefrontLayoutEditor.logoHint") }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Slogan -->
              <div>
                <label class="text-[10px] font-semibold text-gray-500 uppercase block mb-1">{{
                  t("storefrontLayoutEditor.sloganOptional")
                }}</label>
                <input
                  v-model="storeHeader.slogan"
                  type="text"
                  class="form-input text-xs"
                  :placeholder="t('storefrontLayoutEditor.sloganPlaceholder')"
                  @blur="saveStoreHeader()"
                />
              </div>

              <!-- Save status -->
              <div class="text-[10px] text-gray-400 italic">
                <span v-if="headerSaving"
                  ><i class="fas fa-spinner fa-spin mr-1"></i
                  >{{ t("storefrontLayoutEditor.saving") }}</span
                >
                <span v-else-if="headerSavedAt">{{ t("storefrontLayoutEditor.saved") }}</span>
              </div>
            </div>
          </div>

          <!-- Draggable Sections: paletten drop kabul eder + kartlar drag-handle (☰)
               ile kendi arasında yeniden sıralanır (masaüstü + mobil) -->
          <draggable
            v-model="sections"
            :group="{ name: 'sections', pull: false, put: true }"
            item-key="id"
            :sort="true"
            animation="200"
            ghost-class="opacity-30"
            handle=".sle-drag-handle"
            class="space-y-2 min-h-[200px]"
            @change="onSectionChange"
          >
            <template #item="{ element, index }">
              <LayoutSectionCard
                :section="element"
                @toggle="toggleSection(index)"
                @remove="removeSection(index)"
              />
            </template>
          </draggable>

          <!-- Drop zone hint (masaüstü: sürükle · mobil: Bölüm Ekle sekmesine yönlendir) -->
          <div
            v-if="sections.length === 0"
            class="border-2 border-dashed border-gray-300 rounded-lg p-10 lg:p-12 text-center mt-2"
          >
            <i class="fas fa-arrows-alt text-3xl text-gray-300 mb-3 block"></i>
            <p class="text-sm text-gray-400 hidden lg:block">
              {{ t("storefrontLayoutEditor.dropHint") }}
            </p>
            <p class="text-sm text-gray-400 lg:hidden mb-3">
              {{ t("storefrontLayoutEditor.emptyHintMobile") }}
            </p>
            <button
              type="button"
              class="hdr-btn-primary lg:hidden mx-auto"
              @click="mobileTab = 'add'"
            >
              <i class="fas fa-plus mr-1.5 text-xs"></i>{{ t("storefrontLayoutEditor.tabAddSection") }}
            </button>
          </div>

          <!-- Fixed: Footer -->
          <div
            class="mt-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50"
          >
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <i class="fas fa-lock text-[10px]"></i>
              <span class="font-medium">{{ t("storefrontLayoutEditor.footerFixed") }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Mobil (≤767px) sabit kaydet çubuğu: Önizle + Sıfırla + Kaydet (onaylı save-bar kalıbı).
         Görünürlük scoped SCSS'te (display:none → @media ≤767 flex); lg:hidden kullanılmaz. -->
    <div v-if="!loading && sellerCode" class="sle-mobile-save-bar">
      <a
        v-if="sellerCode"
        :href="storefrontUrl"
        target="_blank"
        class="sle-save-bar__preview"
        :aria-label="t('storefrontLayoutEditor.preview')"
      >
        <i class="fas fa-external-link"></i>
        <span>{{ t("storefrontLayoutEditor.preview") }}</span>
      </a>
      <button
        type="button"
        class="sle-save-bar__reset"
        :disabled="!hasChanges || !canEdit"
        :aria-label="t('storefrontLayoutEditor.reset')"
        @click="resetLayout"
      >
        <i class="fas fa-undo"></i>
      </button>
      <button
        type="button"
        class="hdr-btn-primary sle-save-bar__save"
        :disabled="saving || !canEdit"
        @click="saveLayout"
      >
        <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'" class="text-xs"></i>
        <span>{{ saving ? t("storefrontLayoutEditor.saving") : t("storefrontLayoutEditor.save") }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import api from "@/utils/api";
  import LayoutSectionCard from "@/components/seller/LayoutSectionCard.vue";

  // tradehub-upload-ui pattern: logo upload için bar overlay + ✓ mark
  const logoUpload = useImageUploadProgress();

  const { t } = useI18n();

  // Sayfa-içi onboarding: palette → canvas → önizleme → kaydet.
  usePageTour("storefront-layout", () => [
    {
      target: '[data-tour="sle-palette"]',
      title: t("tourSteps.page.slePalette_t"),
      desc: t("tourSteps.page.slePalette_d"),
    },
    {
      target: '[data-tour="sle-canvas"]',
      title: t("tourSteps.page.sleCanvas_t"),
      desc: t("tourSteps.page.sleCanvas_d"),
    },
    {
      target: '[data-tour="sle-preview"]',
      title: t("tourSteps.page.slePreview_t"),
      desc: t("tourSteps.page.slePreview_d"),
    },
    {
      target: '[data-tour="sle-save"]',
      title: t("tourSteps.page.sleSave_t"),
      desc: t("tourSteps.page.sleSave_d"),
    },
  ]);
  const { success, error } = useToast();
  const auth = useAuthStore();

  // Yazma yetkisi: backend `seller_profile.write` capability'sine bağlı
  // (require_seller_capability `update_my_admin_seller_profile`'da). UI'da
  // bu flag false ise Save butonu disabled — read-only mod.
  const canEdit = computed(() => {
    const caps = auth.user?.capabilities || [];
    return caps.includes("seller_profile.write") || !!auth.user?.is_admin;
  });

  // Mobil (<lg) V2: "Sayfam" (canvas) / "Bölüm Ekle" (palet) segment sekmeleri
  const { isLg } = useBreakpoint();
  const mobileTab = ref("page");

  // ─── State ──────────────────────────────────────────────
  const loading = ref(true);
  const saving = ref(false);
  const sellerCode = ref("");
  const sections = ref([]);
  const originalSections = ref("");
  const theme = ref({
    primaryColor: "#1e3a5f",
    accentColor: "#f59e0b",
    bgColor: "#ffffff",
    navBgColor: "#1e3a5f",
    navTextColor: "#ffffff",
  });

  // Magaza Basligi (sabit section — silinemez ama duzenlenebilir)
  const headerExpanded = ref(false);
  const headerSaving = ref(false);
  const headerSavedAt = ref(0);
  const headerUploading = ref({ logo: false });
  const storeHeader = ref({ logo: "", slogan: "" });

  let nextId = 100;

  // ─── Available Sections (palette) ───────────────────────
  const SECTION_META = {
    hero_banner: {
      label: t("storefrontLayoutEditor.sectionHeroBanner"),
      icon: "fas fa-images",
      color: "#6366f1",
    },
    category_grid: {
      label: t("storefrontLayoutEditor.sectionCategoryGrid"),
      icon: "fas fa-th-large",
      color: "#f59e0b",
    },
    hot_products: {
      label: t("storefrontLayoutEditor.sectionHotProducts"),
      icon: "fas fa-fire",
      color: "#ef4444",
    },
    category_listing: {
      label: t("storefrontLayoutEditor.sectionCategoryListing"),
      icon: "fas fa-list",
      color: "#3b82f6",
    },
    company_info: {
      label: t("storefrontLayoutEditor.sectionCompanyInfo"),
      icon: "fas fa-building",
      color: "#6b7280",
    },
    certificates: {
      label: t("storefrontLayoutEditor.sectionCertificates"),
      icon: "fas fa-certificate",
      color: "#10b981",
    },
    why_choose_us: {
      label: t("storefrontLayoutEditor.sectionWhyChooseUs"),
      icon: "fas fa-star",
      color: "#f59e0b",
    },
    gallery: {
      label: t("storefrontLayoutEditor.sectionGallery"),
      icon: "fas fa-photo-video",
      color: "#8b5cf6",
    },
    company_introduction: {
      label: t("storefrontLayoutEditor.sectionCompanyIntroduction"),
      icon: "fas fa-info-circle",
      color: "#06b6d4",
    },
    contact_form: {
      label: t("storefrontLayoutEditor.sectionContactForm"),
      icon: "fas fa-envelope",
      color: "#ec4899",
    },
  };

  const availableSections = ref(
    Object.entries(SECTION_META).map(([type, meta]) => ({
      type,
      ...meta,
    }))
  );

  const storefrontUrl = computed(() => {
    const base = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173";
    return `${base}/pages/seller/seller-shop.html?seller=${sellerCode.value}`;
  });

  const hasChanges = computed(() => {
    return JSON.stringify(sections.value) !== originalSections.value;
  });

  // ─── Default section settings ───────────────────────────
  const DEFAULT_SETTINGS = {
    hero_banner: { mode: "slider", autoplay: true, delay: 5000, bgColor: "", slides: [] },
    category_grid: { columns: 4, bgColor: "" },
    hot_products: { title: "", bgColor: "", count: 8 },
    category_listing: { showSort: true, viewModes: ["grid", "list"], columns: 4, bgColor: "" },
    company_info: { bgColor: "" },
    certificates: { layout: "carousel", columns: 4, bgColor: "" },
    why_choose_us: { bgColor: "" },
    gallery: { columns: 4, lightbox: true, bgColor: "" },
    company_introduction: { bgColor: "" },
    contact_form: { bgColor: "" },
  };

  // ─── Methods ────────────────────────────────────────────
  function cloneSection(original) {
    return {
      id: nextId++,
      type: original.type,
      order: sections.value.length + 1,
      enabled: true,
      settings: { ...(DEFAULT_SETTINGS[original.type] || {}) },
    };
  }

  function addSection(type) {
    sections.value.push({
      id: nextId++,
      type,
      order: sections.value.length + 1,
      enabled: true,
      settings: { ...(DEFAULT_SETTINGS[type] || {}) },
    });
  }

  // Palet dokunuşu: mobilde tek dokunuş ekler + "Sayfam" sekmesine döner.
  // Masaüstünde sürükle/çift-tık birincil olduğundan tek tık yok sayılır.
  function onPaletteTap(type) {
    if (isLg.value) return;
    addSection(type);
    mobileTab.value = "page";
  }

  function toggleSection(index) {
    sections.value[index].enabled = !sections.value[index].enabled;
  }

  function removeSection(index) {
    sections.value.splice(index, 1);
    reorderSections();
  }

  function reorderSections() {
    sections.value.forEach((s, i) => {
      s.order = i + 1;
    });
  }

  function onSectionChange() {
    reorderSections();
  }

  function resetLayout() {
    if (!confirm(t("storefrontLayoutEditor.resetConfirm"))) return;
    sections.value = JSON.parse(originalSections.value);
  }

  async function saveLayout() {
    saving.value = true;
    try {
      // Clean sections for API (remove palette metadata)
      const cleanSections = sections.value.map((s, i) => ({
        type: s.type,
        order: i + 1,
        enabled: s.enabled,
        settings: s.settings || {},
      }));

      await api.callMethod("tradehub_core.api.seller.save_storefront_layout", {
        seller_code: sellerCode.value,
        sections: JSON.stringify(cleanSections),
        theme_config: JSON.stringify(theme.value),
      });

      originalSections.value = JSON.stringify(sections.value);
      success(t("storefrontLayoutEditor.layoutSaved"));
    } catch {
      error(t("storefrontLayoutEditor.saveError"));
    }
    saving.value = false;
  }

  // ─── Magaza Basligi handlers ────────────────────────────
  function resolveStoreHeaderUrl(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"))
      return url;
    const base = import.meta.env.VITE_API_BASE || "";
    return base + url;
  }

  async function onHeaderFileChange(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      error(t("storefrontLayoutEditor.fileTooLarge"));
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      error(t("storefrontLayoutEditor.onlyImages"));
      event.target.value = "";
      return;
    }
    headerUploading.value[field] = true;
    if (field === "logo") logoUpload.start();
    try {
      const fileUrl = await api.uploadFile(file, "Home");
      if (fileUrl) {
        storeHeader.value[field] = fileUrl;
        await saveStoreHeader();
      }
      if (field === "logo") await logoUpload.finish();
    } catch {
      if (field === "logo") logoUpload.fail();
      error(t("storefrontLayoutEditor.imageUploadError"));
    } finally {
      headerUploading.value[field] = false;
      event.target.value = "";
    }
  }

  async function saveStoreHeader() {
    headerSaving.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller.update_my_admin_seller_profile", {
        logo: storeHeader.value.logo || "",
        slogan: storeHeader.value.slogan || "",
      });
      headerSavedAt.value = Date.now();
    } catch {
      error(t("storefrontLayoutEditor.headerSaveError"));
    } finally {
      headerSaving.value = false;
    }
  }

  // Backend yan etkileri (session aging, sub-user invite commit timing) zaman
  // zaman ilk denemede null döndürebilir. Tek-shot retry (~200ms delay) intermittent
  // empty-state'i kapatır; ana fix backend tarafında (positive-only cache).
  async function _fetchSellerProfileWithRetry() {
    let profile = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await api.callMethod("tradehub_core.api.seller.get_my_admin_seller_profile");
      profile = res?.message;
      if (profile?.seller_code) return profile;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return profile;
  }

  async function loadLayout() {
    loading.value = true;
    try {
      // Get seller profile first (with one retry for intermittent null)
      const profile = await _fetchSellerProfileWithRetry();
      if (profile?.seller_code) {
        sellerCode.value = profile.seller_code;
      }
      if (profile) {
        storeHeader.value = {
          logo: profile.logo || "",
          slogan: profile.slogan || "",
        };
      }

      if (!sellerCode.value) {
        loading.value = false;
        return;
      }

      // Get existing layout
      const layoutRes = await api.callMethod("tradehub_core.api.seller.get_storefront_layout", {
        seller_code: sellerCode.value,
      });

      const layoutData = layoutRes?.message;
      if (layoutData?.sections) {
        sections.value = layoutData.sections.map((s, i) => {
          // DEFAULT_SETTINGS ile merge et — eski layout'larda yeni alanlari (slides vb.) garanti eder
          const merged = { ...(DEFAULT_SETTINGS[s.type] || {}), ...(s.settings || {}) };
          return {
            id: nextId++,
            type: s.type,
            order: s.order || i + 1,
            enabled: s.enabled !== false,
            settings: merged,
          };
        });
      } else {
        // Default sections
        sections.value = [
          {
            id: nextId++,
            type: "hero_banner",
            order: 1,
            enabled: true,
            settings: { ...DEFAULT_SETTINGS.hero_banner },
          },
          {
            id: nextId++,
            type: "category_grid",
            order: 2,
            enabled: true,
            settings: { ...DEFAULT_SETTINGS.category_grid },
          },
          {
            id: nextId++,
            type: "hot_products",
            order: 3,
            enabled: true,
            settings: { ...DEFAULT_SETTINGS.hot_products },
          },
          {
            id: nextId++,
            type: "category_listing",
            order: 4,
            enabled: true,
            settings: { ...DEFAULT_SETTINGS.category_listing },
          },
        ];
      }

      if (layoutData?.theme) {
        Object.assign(theme.value, layoutData.theme);
      }

      originalSections.value = JSON.stringify(sections.value);
    } catch {
      // Use defaults if API fails
      sections.value = [
        {
          id: nextId++,
          type: "hero_banner",
          order: 1,
          enabled: true,
          settings: { ...DEFAULT_SETTINGS.hero_banner },
        },
        {
          id: nextId++,
          type: "category_grid",
          order: 2,
          enabled: true,
          settings: { ...DEFAULT_SETTINGS.category_grid },
        },
        {
          id: nextId++,
          type: "hot_products",
          order: 3,
          enabled: true,
          settings: { ...DEFAULT_SETTINGS.hot_products },
        },
        {
          id: nextId++,
          type: "category_listing",
          order: 4,
          enabled: true,
          settings: { ...DEFAULT_SETTINGS.category_listing },
        },
      ];
      originalSections.value = JSON.stringify(sections.value);
    }
    loading.value = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────
  onMounted(loadLayout);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  $m-tabbar-h: 64px; /* mobile-nav.scss ile senkron */
  $m-savebar-h: 62px;

  /* Mobil segment kontrol (Sayfam / Bölüm Ekle) */
  .sle-seg {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: $l-bg-muted;
    border-radius: 12px;

    @include dark {
      background: $d-bg-hover;
    }

    button {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 9px 6px;
      border: none;
      border-radius: 9px;
      background: transparent;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 600;
      color: $l-text-500;
      transition:
        background $t-base,
        color $t-base;

      .n {
        font-size: 10px;
        font-weight: 700;
        opacity: 0.65;
      }

      &.on {
        background: $l-bg;
        color: $l-text-900;
        box-shadow: 0 1px 3px rgba(#000, 0.1);

        @include dark {
          background: $d-bg-card;
          color: $d-text-hi;
        }
      }
    }
  }

  /* Sabit alt kaydet çubuğu — SocialProof mobile-save-bar kalıbı.
     Masaüstünde render edilmez: yalnızca ≤767px görünür. Toggle SCSS ile
     yapılır (Tailwind `lg:hidden` DEĞİL) — scoped `[data-v-*]` özgüllüğü
     `.lg\:hidden` utility'sini yendiğinden masaüstünde çubuk açık kalıyordu. */
  .sle-mobile-save-bar {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(#{$m-tabbar-h} + env(safe-area-inset-bottom));
    z-index: 40; /* tab bar (50) altında, içerik üstünde */
    align-items: center;
    gap: 8px;
    min-height: $m-savebar-h;
    padding: 9px 14px;
    background: $l-bg;
    border-top: 1px solid $l-border;

    @include dark {
      background: $d-panel-bg;
      border-top-color: $d-border;
    }
  }

  /* Mobilde: çubuğu göster + içerik sabit çubuğun altında kalmasın */
  @media (max-width: 767px) {
    .sle-root {
      padding-bottom: calc(#{$m-savebar-h} + 16px);
    }

    .sle-mobile-save-bar {
      display: flex;
    }
  }

  .sle-save-bar__preview {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    min-height: 44px;
    border: 1px solid $l-border;
    border-radius: 11px;
    font-size: 12.5px;
    font-weight: 600;
    color: $l-text-600;

    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
    }
  }

  .sle-save-bar__reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border: 1px solid $l-border;
    border-radius: 11px;
    color: $l-text-600;
    background: $l-bg;

    &:disabled {
      opacity: 0.4;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
      background: $d-bg-card;
    }
  }

  .sle-save-bar__save {
    flex: 1;
    min-height: 44px;
    justify-content: center;
  }
</style>

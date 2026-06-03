<template>
  <div
    class="border rounded-lg transition-all"
    :class="
      section.enabled
        ? 'border-gray-200 bg-white'
        : 'border-dashed border-gray-300 bg-gray-50 opacity-60'
    "
  >
    <!-- Header Row (tiklayarak ayarlari ac/kapa) -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
      @click="expanded = !expanded"
    >
      <!-- Icon + Label -->
      <i :class="meta.icon" class="text-sm flex-shrink-0" :style="{ color: meta.color }"></i>
      <span class="text-xs font-bold text-gray-800 flex-1 truncate">{{ meta.label }}</span>

      <!-- Toggle Switch -->
      <button
        class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        :class="section.enabled ? 'bg-violet-500' : 'bg-gray-300'"
        :title="section.enabled ? t('layoutSectionCard.close') : t('layoutSectionCard.open')"
        @click.stop="$emit('toggle')"
      >
        <div
          class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          :class="section.enabled ? 'left-[18px]' : 'left-0.5'"
        ></div>
      </button>

      <!-- Remove (cop ikonu — Unicode + FA fallback, font yuklu olmasa bile gorunur) -->
      <button
        class="px-2 py-1 text-[11px] font-bold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-md transition-colors flex-shrink-0 flex items-center gap-1 leading-none"
        :title="t('layoutSectionCard.removeSection')"
        @click.stop="$emit('remove')"
      >
        <i class="fas fa-trash text-[10px]"></i>
        <span>{{ t("layoutSectionCard.delete") }}</span>
      </button>

      <!-- Expand/Collapse chevron (Unicode okla — gorsel ipucu) -->
      <span class="text-[14px] text-gray-400 flex-shrink-0 leading-none w-4 text-center">
        {{ expanded ? "▲" : "▼" }}
      </span>
    </div>

    <!-- Settings Panel (expanded) -->
    <div v-show="expanded" class="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
      <!-- Hero Banner Settings -->
      <template v-if="section.type === 'hero_banner'">
        <div>
          <label class="form-label">{{ t("layoutSectionCard.displayMode") }}</label>
          <select v-model="section.settings.mode" class="form-input text-xs">
            <option value="slider">{{ t("layoutSectionCard.modeSlider") }}</option>
            <option value="static">{{ t("layoutSectionCard.modeStatic") }}</option>
          </select>
          <p v-if="section.settings.mode === 'static'" class="text-[10px] text-amber-600 mt-1">
            {{ t("layoutSectionCard.staticModeNote") }}
          </p>
        </div>

        <div v-if="section.settings.mode === 'slider'" class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <input
              v-model="section.settings.autoplay"
              type="checkbox"
              class="form-checkbox rounded text-violet-600"
            />
            <span class="text-xs text-gray-700">{{ t("layoutSectionCard.autoplay") }}</span>
          </label>
          <div v-if="section.settings.autoplay" class="flex items-center">
            <input
              v-model.number="section.settings.delay"
              type="number"
              min="1000"
              step="500"
              class="form-input text-xs w-20"
            />
            <span class="text-[10px] text-gray-400 ml-1">ms</span>
          </div>
        </div>

        <!-- Slaytlar Editoru -->
        <div class="border-t border-gray-200 pt-3">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-gray-700">
              {{ t("layoutSectionCard.slides") }}
              <span class="text-gray-400 font-normal">({{ slides.length }})</span>
            </label>
            <button
              type="button"
              class="text-[11px] font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 rounded hover:bg-violet-50"
              @click="addSlide"
            >
              {{ t("layoutSectionCard.addSlide") }}
            </button>
          </div>

          <div
            v-if="slides.length === 0"
            class="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg"
          >
            <p class="text-xs text-gray-400">{{ t("layoutSectionCard.noSlides") }}</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(slide, sIdx) in slides"
              :key="slide.id"
              class="border border-gray-200 rounded-lg p-3 bg-white space-y-2"
            >
              <!-- Slayt basligi + sirala/sil butonlari -->
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-gray-600">{{
                  t("layoutSectionCard.slideNumber", { n: sIdx + 1 })
                }}</span>
                <div class="flex items-center gap-1">
                  <button
                    :disabled="sIdx === 0"
                    type="button"
                    class="w-6 h-6 text-[10px] text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    :title="t('layoutSectionCard.moveUp')"
                    @click="moveSlide(sIdx, -1)"
                  >
                    ▲
                  </button>
                  <button
                    :disabled="sIdx === slides.length - 1"
                    type="button"
                    class="w-6 h-6 text-[10px] text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    :title="t('layoutSectionCard.moveDown')"
                    @click="moveSlide(sIdx, 1)"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded"
                    :title="t('layoutSectionCard.deleteSlide')"
                    @click="removeSlide(sIdx)"
                  >
                    {{ t("layoutSectionCard.delete") }}
                  </button>
                </div>
              </div>

              <!-- Gorsel -->
              <div class="flex items-start gap-2">
                <div
                  class="relative w-24 h-16 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center"
                >
                  <img
                    v-if="slide.image"
                    :src="resolveImageUrl(slide.image)"
                    alt=""
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-[10px] text-gray-400">{{
                    t("layoutSectionCard.noImage")
                  }}</span>

                  <!-- tradehub-upload-ui pattern: bar overlay -->
                  <div
                    v-if="uploadStatus[slide.id] === 'uploading'"
                    class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                  >
                    <div
                      class="h-full bg-white rounded-full transition-all duration-300"
                      :style="{ width: Math.max(4, uploadProgress[slide.id] || 0) + '%' }"
                    ></div>
                  </div>
                  <Transition name="fade">
                    <div
                      v-if="uploadStatus[slide.id] === 'success'"
                      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-xs font-bold pointer-events-none"
                    >
                      ✓
                    </div>
                  </Transition>
                </div>
                <div class="flex-1 space-y-1">
                  <input
                    :ref="(el) => (fileInputs[slide.id] = el)"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onSlideFileChange($event, slide)"
                  />
                  <button
                    type="button"
                    :disabled="uploading[slide.id]"
                    class="text-[11px] px-2 py-1 border border-violet-300 text-violet-700 rounded hover:bg-violet-50 disabled:opacity-50"
                    @click="triggerFileInput(slide.id)"
                  >
                    {{
                      uploading[slide.id]
                        ? t("layoutSectionCard.uploading")
                        : slide.image
                          ? t("layoutSectionCard.changeImage")
                          : t("layoutSectionCard.uploadImage")
                    }}
                  </button>
                  <button
                    v-if="slide.image"
                    type="button"
                    class="text-[11px] px-2 py-1 text-red-500 hover:bg-red-50 rounded ml-1"
                    @click="slide.image = ''"
                  >
                    {{ t("layoutSectionCard.removeImage") }}
                  </button>
                  <p class="text-[10px] text-gray-400">{{ t("layoutSectionCard.imageHint") }}</p>
                </div>
              </div>

              <!-- Metin alanlari -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.slideTitle")
                  }}</label>
                  <input
                    v-model="slide.title"
                    type="text"
                    class="form-input text-xs"
                    :placeholder="t('layoutSectionCard.optional')"
                  />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.slideSubtitle")
                  }}</label>
                  <input
                    v-model="slide.subtitle"
                    type="text"
                    class="form-input text-xs"
                    :placeholder="t('layoutSectionCard.optional')"
                  />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.buttonText")
                  }}</label>
                  <input
                    v-model="slide.ctaText"
                    type="text"
                    class="form-input text-xs"
                    :placeholder="t('layoutSectionCard.optional')"
                  />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.buttonLink")
                  }}</label>
                  <input
                    v-model="slide.ctaLink"
                    type="text"
                    class="form-input text-xs"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.textPosition")
                  }}</label>
                  <select v-model="slide.textPosition" class="form-input text-xs">
                    <option value="left">{{ t("layoutSectionCard.positionLeft") }}</option>
                    <option value="center">{{ t("layoutSectionCard.positionCenter") }}</option>
                    <option value="right">{{ t("layoutSectionCard.positionRight") }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">{{
                    t("layoutSectionCard.textColor")
                  }}</label>
                  <select v-model="slide.textColor" class="form-input text-xs">
                    <option value="white">{{ t("layoutSectionCard.colorWhite") }}</option>
                    <option value="dark">{{ t("layoutSectionCard.colorDark") }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Category Grid Settings -->
      <template v-if="section.type === 'category_grid'">
        <div>
          <label class="form-label">{{ t("layoutSectionCard.columnCount") }}</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">{{ t("layoutSectionCard.columns3") }}</option>
            <option :value="4">{{ t("layoutSectionCard.columns4") }}</option>
            <option :value="6">{{ t("layoutSectionCard.columns6") }}</option>
          </select>
        </div>
      </template>

      <!-- Hot Products Settings -->
      <template v-if="section.type === 'hot_products'">
        <div>
          <label class="form-label">{{ t("layoutSectionCard.heading") }}</label>
          <input
            v-model="section.settings.title"
            type="text"
            class="form-input text-xs"
            :placeholder="t('layoutSectionCard.popularProducts')"
          />
        </div>
        <div>
          <label class="form-label">{{ t("layoutSectionCard.productCount") }}</label>
          <select v-model.number="section.settings.count" class="form-input text-xs">
            <option :value="6">6</option>
            <option :value="8">8</option>
            <option :value="12">12</option>
          </select>
        </div>
      </template>

      <!-- Category Listing Settings -->
      <template v-if="section.type === 'category_listing'">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2">
            <input
              v-model="section.settings.showSort"
              type="checkbox"
              class="form-checkbox rounded text-violet-600"
            />
            <span class="text-xs text-gray-700">{{ t("layoutSectionCard.sorting") }}</span>
          </label>
        </div>
        <div>
          <label class="form-label">{{ t("layoutSectionCard.viewOptions") }}</label>
          <div class="flex gap-2">
            <label class="flex items-center gap-1.5">
              <input
                v-model="section.settings.viewModes"
                type="checkbox"
                value="grid"
                class="form-checkbox rounded text-violet-600"
              />
              <span class="text-xs">{{ t("layoutSectionCard.grid") }}</span>
            </label>
            <label class="flex items-center gap-1.5">
              <input
                v-model="section.settings.viewModes"
                type="checkbox"
                value="list"
                class="form-checkbox rounded text-violet-600"
              />
              <span class="text-xs">{{ t("layoutSectionCard.list") }}</span>
            </label>
          </div>
        </div>
        <div>
          <label class="form-label">{{ t("layoutSectionCard.columnCount") }}</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </div>
      </template>

      <!-- Certificates Settings -->
      <template v-if="section.type === 'certificates'">
        <div>
          <label class="form-label">{{ t("layoutSectionCard.view") }}</label>
          <select v-model="section.settings.layout" class="form-input text-xs">
            <option value="carousel">{{ t("layoutSectionCard.carousel") }}</option>
            <option value="grid">{{ t("layoutSectionCard.grid") }}</option>
          </select>
        </div>
      </template>

      <!-- Gallery Settings -->
      <template v-if="section.type === 'gallery'">
        <div>
          <label class="form-label">{{ t("layoutSectionCard.columnCount") }}</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </div>
        <label class="flex items-center gap-2">
          <input
            v-model="section.settings.lightbox"
            type="checkbox"
            class="form-checkbox rounded text-violet-600"
          />
          <span class="text-xs text-gray-700">{{ t("layoutSectionCard.lightbox") }}</span>
        </label>
      </template>

      <!-- Common: Background Color (all types) -->
      <div>
        <label class="form-label">{{ t("layoutSectionCard.backgroundColor") }}</label>
        <div class="flex items-center gap-2">
          <input
            v-model="section.settings.bgColor"
            type="color"
            class="w-8 h-8 rounded border border-gray-200 cursor-pointer"
          />
          <input
            v-model="section.settings.bgColor"
            type="text"
            class="form-input text-xs w-24"
            placeholder="#ffffff"
          />
          <button
            v-if="section.settings.bgColor"
            class="text-xs text-gray-400 hover:text-red-500"
            @click="section.settings.bgColor = ''"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  // `section`, parent'ın reactive sections[] array'inden referans olarak gelir.
  // defineModel ile model olarak işaretlendiği için nested mutation eslint'in
  // vue/no-mutating-props rule'una takılmaz; reference semantics sayesinde
  // parent state otomatik güncellenir.
  import { ref, computed, watchEffect, reactive } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();

  const section = defineModel("section", { type: Object, required: true });

  defineEmits(["toggle", "remove"]);

  const expanded = ref(false);
  const { error: toastError } = useToast();

  // ─── Hero Banner: slaytlar yonetimi ──────────────────────
  const fileInputs = reactive({});
  const uploading = reactive({});
  // tradehub-upload-ui pattern — slide.id key'li progress state map
  const uploadStatus = reactive({}); // slideId → 'idle' | 'uploading' | 'success'
  const uploadProgress = reactive({}); // slideId → 0-100
  const uploadIntervals = {}; // slideId → interval id (cleanup için)

  // hero_banner için eksik state'i garantiye al (computed içinde side-effect yasak)
  watchEffect(() => {
    if (section.value.type === "hero_banner") {
      if (!section.value.settings) section.value.settings = {};
      if (!Array.isArray(section.value.settings.slides)) section.value.settings.slides = [];
    }
  });

  // Slides array — pure read (watchEffect initialize'ı garanti ediyor)
  const slides = computed(() =>
    Array.isArray(section.value.settings?.slides) ? section.value.settings.slides : []
  );

  function generateSlideId() {
    return "slide-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function addSlide() {
    slides.value.push({
      id: generateSlideId(),
      image: "",
      title: "",
      subtitle: "",
      ctaText: "",
      ctaLink: "",
      textPosition: "left",
      textColor: "white",
    });
  }

  function removeSlide(idx) {
    slides.value.splice(idx, 1);
  }

  function moveSlide(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.value.length) return;
    const arr = slides.value;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  }

  function triggerFileInput(slideId) {
    const el = fileInputs[slideId];
    if (el) el.click();
  }

  async function onSlideFileChange(event, slide) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Boyut kontrolu (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError(t("layoutSectionCard.fileTooLarge"));
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toastError(t("layoutSectionCard.onlyImageFiles"));
      event.target.value = "";
      return;
    }

    uploading[slide.id] = true;
    // tradehub-upload-ui pattern: bar overlay + ✓ mark
    uploadStatus[slide.id] = "uploading";
    uploadProgress[slide.id] = 0;
    const sid = slide.id;
    const tick = () => {
      if (uploadStatus[sid] !== "uploading") return false;
      uploadProgress[sid] = Math.min((uploadProgress[sid] || 0) + 10 + Math.random() * 8, 85);
      return true;
    };
    tick();
    uploadIntervals[sid] = window.setInterval(() => {
      if (!tick()) window.clearInterval(uploadIntervals[sid]);
    }, 100);

    try {
      // 'Home' Frappe varsayilan klasoru — her zaman vardir.
      // Fiziksel dosya yine /files/<uuid>/<isim> altinda saklanir.
      const fileUrl = await api.uploadFile(file, "Home");
      if (fileUrl) {
        slide.image = fileUrl;
      }
      window.clearInterval(uploadIntervals[sid]);
      uploadProgress[sid] = 100;
      await new Promise((r) => window.setTimeout(r, 350));
      uploadStatus[sid] = "success";
      window.setTimeout(() => {
        uploadStatus[sid] = "idle";
        uploadProgress[sid] = 0;
      }, 1500);
    } catch (e) {
      window.clearInterval(uploadIntervals[sid]);
      uploadStatus[sid] = "idle";
      uploadProgress[sid] = 0;
      toastError(t("layoutSectionCard.uploadError", { error: e.message || e }));
    } finally {
      uploading[slide.id] = false;
      event.target.value = "";
    }
  }

  // Backend'den gelen /files/... yollarini tarayicida gorebilmek icin VITE_API_BASE prefix'i
  function resolveImageUrl(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"))
      return url;
    const base = import.meta.env.VITE_API_BASE || "";
    return base + url;
  }

  const SECTION_META = {
    hero_banner: { label: "metaHeroBanner", icon: "fas fa-images", color: "#6366f1" },
    category_grid: { label: "metaCategoryGrid", icon: "fas fa-th-large", color: "#f59e0b" },
    hot_products: { label: "metaHotProducts", icon: "fas fa-fire", color: "#ef4444" },
    category_listing: { label: "metaCategoryListing", icon: "fas fa-list", color: "#3b82f6" },
    company_info: { label: "metaCompanyInfo", icon: "fas fa-building", color: "#6b7280" },
    certificates: { label: "metaCertificates", icon: "fas fa-certificate", color: "#10b981" },
    why_choose_us: { label: "metaWhyChooseUs", icon: "fas fa-star", color: "#f59e0b" },
    gallery: { label: "metaGallery", icon: "fas fa-photo-video", color: "#8b5cf6" },
    company_introduction: {
      label: "metaCompanyIntroduction",
      icon: "fas fa-info-circle",
      color: "#06b6d4",
    },
    contact_form: { label: "metaContactForm", icon: "fas fa-envelope", color: "#ec4899" },
  };

  const meta = computed(() => {
    const entry = SECTION_META[section.value.type];
    if (entry) {
      return { ...entry, label: t(`layoutSectionCard.${entry.label}`) };
    }
    return {
      label: section.value.type,
      icon: "fas fa-puzzle-piece",
      color: "#9ca3af",
    };
  });
</script>

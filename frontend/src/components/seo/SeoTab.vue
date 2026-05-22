<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useSeoEditorStore } from "@/stores/seoEditor";
  import { getConfigFor } from "@/constants/seoDoctypeConfig";
  import { useToast } from "@/composables/useToast";
  import SeoFormFields from "./SeoFormFields.vue";
  import GoogleSerpPreview from "./GoogleSerpPreview.vue";
  import FacebookOgPreview from "./FacebookOgPreview.vue";
  import OgImageUpload from "./OgImageUpload.vue";
  import SeoScoreBar from "./SeoScoreBar.vue";
  import { analyze } from "@/utils/seoAnalyzer";
  import { normalizeForSlug } from "@/utils/turkishTextHelpers";

  const props = defineProps({
    doctype: { type: String, required: true },
    recordName: { type: String, required: true },
    fallbackTitle: { type: String, default: "" },
    fallbackDescription: { type: String, default: "" },
  });

  const store = useSeoEditorStore();
  const toast = useToast();
  const config = computed(() => getConfigFor(props.doctype));

  onMounted(async () => {
    if (props.recordName) {
      await store.load(props.doctype, props.recordName);
    }
  });

  watch(
    () => props.recordName,
    async (newName) => {
      if (newName) await store.load(props.doctype, newName);
    }
  );

  // Auto-slug: meta_title veya fallbackTitle (Listing.title vb.) değişince
  // slug boşsa otomatik türet. User slug'a tek seferlik dokunsa da koruma.
  // Backend before_validate hook'u da aynı işi yapar — UI'da gerçek zamanlı önizleme.
  // `immediate: true` ile SeoTab mount olduğunda fallbackTitle doluysa hemen tetiklenir.
  const slugKey = computed(() => (config.value?.slugField === "url_slug" ? "url_slug" : "slug"));
  watch(
    () => store.fields.meta_title || props.fallbackTitle,
    (source) => {
      if (!source) return;
      if (store.fields[slugKey.value]) return;
      store.fields[slugKey.value] = normalizeForSlug(source);
    },
    { immediate: true }
  );

  // Auto-alt-text (Listing): primary_image_alt boşsa meta_title/fallbackTitle'dan doldur.
  // User dokunduktan sonra otomatik müdahale durur.
  watch(
    () => store.fields.meta_title || props.fallbackTitle,
    (source) => {
      if (props.doctype !== "Listing") return;
      if (!source) return;
      if (store.fields.primary_image_alt) return;
      store.fields.primary_image_alt = source;
    },
    { immediate: true }
  );

  const previewUrl = computed(() => {
    const slug = config.value?.slugField === "url_slug" ? store.fields.url_slug : store.fields.slug;
    // Lokal dev'de window.location.origin = http://localhost; production'da istoc.com
    return `${window.location.origin}${config.value?.urlPrefix ?? ""}/${slug || "slug"}`;
  });

  const previewTitle = computed(
    () => store.fields.og_title_override || store.fields.meta_title || props.fallbackTitle
  );

  const previewDescription = computed(
    () =>
      store.fields.og_description_override ||
      store.fields.meta_description ||
      props.fallbackDescription
  );

  // SEO analyzer reactive — store.fields değişince yeniden hesaplanır
  const analysis = computed(() =>
    analyze({
      title: props.fallbackTitle,
      meta_title: store.fields.meta_title,
      meta_description: store.fields.meta_description,
      description: props.fallbackDescription,
      slug: config.value?.slugField === "url_slug" ? store.fields.url_slug : store.fields.slug,
      focus_keyword: store.fields.focus_keyword,
      primary_image_alt: store.fields.primary_image_alt || "",
      og_image: store.fields.og_image,
      noindex: store.fields.noindex,
    })
  );

  async function onSave() {
    const result = await store.save();
    if (result.ok) {
      toast.success("SEO ayarları kaydedildi");
    } else {
      toast.error(result.error || "Kaydetme başarısız");
    }
  }

  function onReset() {
    store.reset();
    toast.info("Değişiklikler geri alındı");
  }
</script>

<template>
  <div class="seo-tab">
    <div v-if="store.loading" class="text-center py-8 text-gray-500">Yükleniyor...</div>

    <div v-else-if="store.error" class="text-center py-8 text-red-500">
      {{ store.error }}
    </div>

    <div v-else class="space-y-4">
      <!-- Üst: SEO Skor pill (her zaman görünür) -->
      <SeoScoreBar :analysis="analysis" />

      <!-- Form + Preview grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Sol kolon: Form -->
        <div class="space-y-4">
          <SeoFormFields :doctype="doctype" />
          <OgImageUpload v-model="store.fields.og_image" />

          <!-- OG image boş + ürün için fallback bilgisi -->
          <p
            v-if="!store.fields.og_image && doctype === 'Listing'"
            class="text-xs text-gray-500 -mt-2"
          >
            Boş bırakırsanız ürünün ana görseli otomatik olarak 1200×630'a uyarlanır.
          </p>

          <!-- Listing: ana görsel alt metni (erişilebilirlik + SEO) -->
          <div v-if="doctype === 'Listing'" class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">
                Ana Görsel Alt Metni
                <span class="text-gray-400 font-normal">(erişilebilirlik için)</span>
              </label>
              <button
                v-if="fallbackTitle || store.fields.meta_title"
                type="button"
                class="text-xs text-blue-600 hover:underline"
                @click="store.fields.primary_image_alt = store.fields.meta_title || fallbackTitle"
              >
                Başlıktan doldur
              </button>
            </div>
            <input
              v-model="store.fields.primary_image_alt"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="örn. Mavi kadın gömlek önden görünüm"
            />
            <p class="text-xs text-gray-400">
              Hedef anahtar kelimeyi içermesi SEO skoru için olumlu.
            </p>
          </div>

          <div class="flex gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              class="hdr-btn-primary"
              :disabled="store.saving || !store.dirty"
              @click="onSave"
            >
              {{ store.saving ? "Kaydediliyor..." : "Kaydet" }}
            </button>
            <button
              type="button"
              class="hdr-btn-outlined"
              :disabled="!store.dirty"
              @click="onReset"
            >
              Sıfırla
            </button>
          </div>
        </div>

        <!-- Sağ kolon: Preview -->
        <div class="space-y-4">
          <GoogleSerpPreview
            :title="previewTitle"
            :description="previewDescription"
            :url="previewUrl"
          />
          <FacebookOgPreview
            :title="previewTitle"
            :description="previewDescription"
            :image="store.fields.og_image"
            :url="previewUrl"
          />
        </div>
      </div>
    </div>
  </div>
</template>

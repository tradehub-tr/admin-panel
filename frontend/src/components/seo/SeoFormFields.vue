<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useSeoEditorStore } from "@/stores/seoEditor";
  import { getConfigFor } from "@/constants/seoDoctypeConfig";
  import CharCounter from "./CharCounter.vue";
  import SlugInput from "./SlugInput.vue";
  import LangToggle from "./LangToggle.vue";

  const props = defineProps({
    doctype: { type: String, required: true },
  });

  const { t } = useI18n();
  const store = useSeoEditorStore();
  const showAdvanced = ref(false);
  const config = getConfigFor(props.doctype);

  // Lang-aware field key: TR → 'meta_title', EN → 'meta_title_en'
  function fieldKeyFor(base) {
    return store.currentLang === "en" ? `${base}_en` : base;
  }

  // Slug field key (Product Category 'url_slug' vs others 'slug')
  const slugFieldKey = computed(() => {
    const base = config.slugField; // 'slug' veya 'url_slug'
    return store.currentLang === "en" ? `${base}_en` : base;
  });
</script>

<template>
  <div class="space-y-4">
    <!-- Lang toggle (Faz 7) -->
    <div class="flex items-center justify-between border-b border-gray-100 pb-3">
      <span class="text-xs text-gray-500">{{ t("seoFormFields.language") }}:</span>
      <LangToggle v-model="store.currentLang" />
    </div>

    <!-- Meta Title -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        {{ t("seoFormFields.metaTitle") }}
        <span v-if="store.currentLang === 'en'" class="text-xs text-blue-600">(EN)</span>
      </label>
      <input
        v-model="store.fields[fieldKeyFor('meta_title')]"
        type="text"
        class="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        :class="store.metaTitleOverLimit ? 'border-red-300' : 'border-gray-200'"
        :placeholder="t('seoFormFields.metaTitlePlaceholder')"
      />
      <CharCounter :value="store.fields[fieldKeyFor('meta_title')]" :max="70" />
    </div>

    <!-- Meta Description -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        {{ t("seoFormFields.metaDescription") }}
        <span v-if="store.currentLang === 'en'" class="text-xs text-blue-600">(EN)</span>
      </label>
      <textarea
        v-model="store.fields[fieldKeyFor('meta_description')]"
        rows="3"
        class="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
        :class="store.metaDescOverLimit ? 'border-red-300' : 'border-gray-200'"
        :placeholder="t('seoFormFields.metaDescriptionPlaceholder')"
      ></textarea>
      <CharCounter :value="store.fields[fieldKeyFor('meta_description')]" :max="160" />
    </div>

    <!-- Slug -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        {{ t("seoFormFields.urlSlug") }}
        <span class="text-xs text-gray-400">{{ config.urlPrefix }}/...</span>
        <span v-if="store.currentLang === 'en'" class="text-xs text-blue-600">(EN)</span>
        <span class="text-xs text-gray-400 font-normal"
          >— {{ t("seoFormFields.urlSlugAutoHint") }}</span
        >
      </label>
      <SlugInput v-model="store.fields[slugFieldKey]" :disabled="true" />
    </div>

    <!-- Focus Keyword -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        {{ t("seoFormFields.focusKeyword") }}
        <span class="text-xs text-gray-400">{{ t("seoFormFields.focusKeywordHint") }}</span>
      </label>
      <input
        v-model="store.fields.focus_keyword"
        type="text"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        :placeholder="t('seoFormFields.focusKeywordPlaceholder')"
      />
    </div>

    <!-- Noindex -->
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="store.fields.noindex"
        type="checkbox"
        :true-value="1"
        :false-value="0"
        class="w-4 h-4 rounded"
      />
      <span class="text-sm text-gray-700">{{ t("seoFormFields.noindexLabel") }}</span>
    </label>

    <!-- Advanced toggle -->
    <button
      type="button"
      class="text-sm text-blue-600 hover:underline"
      @click="showAdvanced = !showAdvanced"
    >
      {{ showAdvanced ? t("seoFormFields.hideAdvanced") : t("seoFormFields.showAdvanced") }}
    </button>

    <div v-if="showAdvanced" class="space-y-4 pl-2 border-l-2 border-gray-100">
      <!-- OG Title Override -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ t("seoFormFields.ogTitle") }}
          <span v-if="store.currentLang === 'en'" class="text-xs text-blue-600">(EN)</span>
        </label>
        <input
          v-model="store.fields[fieldKeyFor('og_title_override')]"
          type="text"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          :placeholder="t('seoFormFields.ogTitlePlaceholder')"
        />
      </div>

      <!-- OG Desc Override -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ t("seoFormFields.ogDescription") }}
          <span v-if="store.currentLang === 'en'" class="text-xs text-blue-600">(EN)</span>
        </label>
        <textarea
          v-model="store.fields[fieldKeyFor('og_description_override')]"
          rows="2"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          :placeholder="t('seoFormFields.ogDescriptionPlaceholder')"
        ></textarea>
      </div>

      <!-- Canonical URL Override -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ t("seoFormFields.canonicalUrlOverride") }}
        </label>
        <input
          v-model="store.fields.canonical_url_override"
          type="text"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          :placeholder="t('seoFormFields.canonicalUrlPlaceholder')"
        />
      </div>

      <!-- Robots Directive -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ t("seoFormFields.robotsDirectiveOverride") }}
        </label>
        <select
          v-model="store.fields.robots_directive_override"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">{{ t("seoFormFields.robotsSiteDefault") }}</option>
          <option value="index,follow">index, follow</option>
          <option value="noindex,follow">noindex, follow</option>
          <option value="index,nofollow">index, nofollow</option>
          <option value="noindex,nofollow">noindex, nofollow</option>
        </select>
      </div>
    </div>
  </div>
</template>

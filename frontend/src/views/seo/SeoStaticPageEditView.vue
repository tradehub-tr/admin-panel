<script setup>
  import { computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import SeoTab from "@/components/seo/SeoTab.vue";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();

  // URL'den encoded path al
  const pagePath = computed(() => decodeURIComponent(route.params.path || ""));
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors flex-shrink-0"
          @click="router.back()"
        >
          ←
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">{{ t("seoStaticPageEdit.title") }}</h1>
          <p class="text-xs text-gray-400 font-mono">{{ pagePath }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a
          v-if="pagePath"
          :href="pagePath"
          target="_blank"
          rel="noopener"
          class="text-xs text-gray-500 hover:text-gray-700"
        >
          {{ t("seoStaticPageEdit.openInStorefront") }} ↗
        </a>
      </div>
    </div>

    <div
      v-if="!pagePath"
      class="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500"
    >
      {{ t("seoStaticPageEdit.invalidPath") }}
    </div>
    <div v-else class="bg-white rounded-lg border border-gray-200 p-5">
      <SeoTab doctype="Static Page SEO" :record-name="pagePath" />
    </div>
  </div>
</template>

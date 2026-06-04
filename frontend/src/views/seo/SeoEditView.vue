<script setup>
  import { computed } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { getConfigFor } from "@/constants/seoDoctypeConfig";
  import SeoTab from "@/components/seo/SeoTab.vue";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();

  // Route param: doctypeKey ('listing' | 'product-category' | 'brand' | 'seller')
  // → backend doctype isminin URL-safe versiyonu
  const DOCTYPE_KEY_MAP = {
    listing: "Listing",
    "product-category": "Product Category",
    brand: "Brand",
    seller: "Admin Seller Profile",
  };

  const doctype = computed(() => DOCTYPE_KEY_MAP[route.params.doctypeKey] || "");
  const recordName = computed(() => route.params.name || "");
  const config = computed(() => getConfigFor(doctype.value));

  const valid = computed(() => doctype.value && recordName.value);
</script>

<template>
  <div>
    <!-- Header -->
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
          <h1 class="text-[15px] font-bold text-gray-900">{{ t("seoEdit.title") }}</h1>
          <p class="text-xs text-gray-400">{{ config?.label || doctype }} · {{ recordName }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="!valid"
      class="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500"
    >
      {{ t("seoEdit.invalidParam") }} <code>/seo/:doctypeKey/:name</code>
      <br />
      doctypeKey: listing / product-category / brand / seller
    </div>

    <div v-else class="bg-white rounded-lg border border-gray-200 p-5">
      <SeoTab :doctype="doctype" :record-name="recordName" />
    </div>
  </div>
</template>

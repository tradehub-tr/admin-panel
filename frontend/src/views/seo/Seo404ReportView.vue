<script setup>
  import { onMounted, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useSeoRedirectsStore } from "@/stores/seoRedirects";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: filtre → 404 tablosu → yönlendirme oluştur.
  usePageTour("seo-404-report", () => [
    {
      target: '[data-tour="s404-filter"]',
      title: t("tourSteps.page.s404Filter_t"),
      desc: t("tourSteps.page.s404Filter_d"),
    },
    {
      target: '[data-tour="s404-table"]',
      title: t("tourSteps.page.s404Table_t"),
      desc: t("tourSteps.page.s404Table_d"),
    },
    {
      target: '[data-tour="s404-redirect"]',
      title: t("tourSteps.page.s404Redirect_t"),
      desc: t("tourSteps.page.s404Redirect_d"),
    },
  ]);

  const store = useSeoRedirectsStore();
  const { logs404, loading, saving, total404Hits } = storeToRefs(store);
  const toast = useToast();
  const { viewMode } = useListViewMode("seo-404", "table");

  const showResolved = ref(false);
  const quickResolveTarget = ref({}); // logName → targetPath input

  onMounted(() => store.fetch404s(0));

  async function refreshList() {
    await store.fetch404s(showResolved.value ? 1 : 0);
  }

  async function onQuickResolve(log) {
    const target = quickResolveTarget.value[log.name];
    if (!target || !target.startsWith("/")) {
      toast.error(t("seo404Report.targetMustStartWithSlash"));
      return;
    }
    try {
      await store.quickResolve404({ logName: log.name, targetPath: target });
      quickResolveTarget.value[log.name] = "";
      toast.success(t("seo404Report.redirectCreated", { source: log.path, target }));
    } catch (e) {
      toast.error(e.message || t("seo404Report.redirectCreateFailed"));
    }
  }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900">
          {{ t("seo404Report.title", { n: total404Hits }) }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("seo404Report.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2" data-tour="s404-filter">
        <label class="flex items-center gap-1 text-xs text-gray-600">
          <input v-model="showResolved" type="checkbox" class="w-3 h-3" @change="refreshList" />
          {{ t("seo404Report.showResolved") }}
        </label>
        <ViewModeToggle v-model="viewMode" :modes="['table', 'list']" />
        <router-link to="/seo/redirects" class="hdr-btn-outlined" data-tour="s404-redirect">
          {{ t("seo404Report.goToRedirects") }}
        </router-link>
      </div>
    </div>

    <div v-if="loading && logs404.length === 0" class="text-center py-8 text-gray-500">
      {{ t("seo404Report.loading") }}
    </div>

    <div
      v-if="logs404.length > 0 && viewMode === 'table'"
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-tour="s404-table"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr class="text-left">
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seo404Report.colPath") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seo404Report.colHits") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seo404Report.colLastSeen") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seo404Report.colReferer") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700 w-1/3">
              {{ t("seo404Report.colAddRedirect") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs404"
            :key="log.name"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="px-4 py-2 font-mono text-xs text-gray-700 truncate max-w-xs">
              {{ log.path }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              <span class="font-bold">{{ log.hit_count }}</span>
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              {{ log.last_hit_at }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-500 truncate max-w-xs">
              {{ log.last_referer || "—" }}
            </td>
            <td class="px-4 py-2">
              <div v-if="!log.resolved" class="flex gap-1">
                <input
                  v-model="quickResolveTarget[log.name]"
                  type="text"
                  class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                  :placeholder="t('seo404Report.targetPlaceholder')"
                />
                <button
                  type="button"
                  class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  :disabled="saving || !quickResolveTarget[log.name]"
                  @click="onQuickResolve(log)"
                >
                  {{ t("seo404Report.addRedirectBtn") }}
                </button>
              </div>
              <span v-else class="text-xs text-green-600">{{ t("seo404Report.resolved") }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else-if="logs404.length > 0 && viewMode === 'list'"
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <div
        v-for="log in logs404"
        :key="log.name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
      >
        <span class="font-mono text-xs text-gray-700 truncate flex-1 min-w-0">{{ log.path }}</span>
        <span class="text-xs text-gray-600 flex-none">
          <span class="font-bold">{{ log.hit_count }}</span> {{ t("seo404Report.colHits") }}
        </span>
        <span class="text-xs text-gray-500 flex-none">{{ log.last_hit_at }}</span>
        <div v-if="!log.resolved" class="flex gap-1 flex-none w-72">
          <input
            v-model="quickResolveTarget[log.name]"
            type="text"
            class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
            :placeholder="t('seo404Report.targetPlaceholder')"
          />
          <button
            type="button"
            class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            :disabled="saving || !quickResolveTarget[log.name]"
            @click="onQuickResolve(log)"
          >
            {{ t("seo404Report.addRedirectBtn") }}
          </button>
        </div>
        <span v-else class="text-xs text-green-600 flex-none w-72 text-right">{{
          t("seo404Report.resolved")
        }}</span>
      </div>
    </div>

    <div v-else-if="!loading" class="text-center py-12 text-gray-500">
      {{ t("seo404Report.empty") }}
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  /* Mobil: 5 sütunlu tablo, sabit w-72 blok ve tek satırlık header 320-767px'e sığmıyor */
  @media (max-width: 767px) {
    // Header tek satırda sıkışıyor (başlık + checkbox + toggle + link) → alt alta diz
    .mb-6.justify-between {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    // Filtre/aksiyon satırı dar ekranda gerekirse ikinci satıra sarsın
    [data-tour="s404-filter"] {
      flex-wrap: wrap;
    }

    // Geniş tablo: kırpmak yerine yatay kaydır (Tailwind .overflow-hidden'ı ezmek için !important)
    [data-tour="s404-table"] {
      overflow-x: auto !important;

      table {
        min-width: 640px; // 5 sütun ezilmesin, kaydırarak okunsun
      }

      th,
      td {
        // Mobilde kompakt hücre yan boşluğu (~12px)
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }

    // List modu: sabit w-72 (288px) input+buton bloğu 320px'i taşırıyor →
    // satırı sardır, bloğu tam genişlikte alt satıra indir
    .overflow-hidden > .flex {
      flex-wrap: wrap;
    }
    .overflow-hidden > .flex > .w-72 {
      width: 100%;
    }
  }
</style>

<script setup>
  import { ref, computed, watch } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { listStaticPages } from "@/api/seo";
  import { useListViewMode } from "@/composables/useListViewMode";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const { t } = useI18n();
  const router = useRouter();

  // Tablo/grid/list aynı veriyi farklı düzende gösterir (sekme bağımsız, mod korunur).
  const { viewMode } = useListViewMode("seo-pages", "table");

  // Yönetilen 4 SEO doctype — sidebar'dan tek bir overview ile hepsi düzenlenir.
  const DOCTYPES = [
    {
      value: "Listing",
      label: "Ürünler",
      slugField: "slug",
      titleField: "title",
      urlPrefix: "/urun",
      editKey: "listing",
    },
    {
      value: "Product Category",
      label: "Kategoriler",
      slugField: "url_slug",
      titleField: "category_name",
      urlPrefix: "/kategori",
      editKey: "product-category",
    },
    {
      value: "Brand",
      label: "Markalar",
      slugField: "slug",
      titleField: "brand_name",
      urlPrefix: "/marka",
      editKey: "brand",
    },
    {
      value: "Admin Seller Profile",
      label: "Mağazalar",
      slugField: "slug",
      titleField: "seller_name",
      urlPrefix: "/magaza",
      editKey: "seller",
    },
    {
      value: "Static Page SEO",
      label: "Statik Sayfalar",
      slugField: "page_path",
      titleField: "page_title",
      urlPrefix: "",
      editKey: "static",
    },
  ];

  const selectedDoctype = ref(DOCTYPES[0]);
  const search = ref("");
  const filter = ref("all"); // 'all' | 'missing_meta' | 'missing_desc' | 'noindex'
  const loading = ref(false);
  const rows = ref([]);
  const page = ref(1);
  const pageSize = 20;
  const total = ref(0);

  async function loadPages() {
    loading.value = true;
    try {
      const dt = selectedDoctype.value;

      // Faz 4c: Static Page SEO için özel endpoint (registry-based)
      if (dt.value === "Static Page SEO") {
        const all = await listStaticPages();
        const filtered = (all || []).filter((row) => {
          if (
            search.value &&
            !(row.title || "").toLowerCase().includes(search.value.toLowerCase()) &&
            !(row.path || "").toLowerCase().includes(search.value.toLowerCase())
          )
            return false;
          if (filter.value === "missing_meta" && row.meta_title) return false;
          if (filter.value === "missing_desc" && row.meta_description) return false;
          if (filter.value === "noindex" && !row.noindex) return false;
          return true;
        });
        total.value = filtered.length;
        const startIdx = (page.value - 1) * pageSize;
        rows.value = filtered.slice(startIdx, startIdx + pageSize).map((r) => ({
          name: r.path,
          page_path: r.path,
          page_title: r.title,
          meta_title: r.meta_title,
          meta_description: r.meta_description,
          noindex: r.noindex,
        }));
        return;
      }

      const fields = ["name", dt.titleField, dt.slugField, "meta_title", "meta_description"];
      fields.push("noindex", "modified");

      // Frappe filters array formatında: [[field, op, value], ...]
      const filters = [];
      if (search.value) {
        filters.push([dt.titleField, "like", `%${search.value}%`]);
      }
      if (filter.value === "missing_meta") {
        filters.push(["meta_title", "in", ["", null]]);
      } else if (filter.value === "missing_desc") {
        filters.push(["meta_description", "in", ["", null]]);
      } else if (filter.value === "noindex") {
        filters.push(["noindex", "=", 1]);
      }

      const res = await api.getList(dt.value, {
        fields,
        filters,
        limit_page_length: pageSize,
        limit_start: (page.value - 1) * pageSize,
        order_by: "modified desc",
      });
      rows.value = res.data || [];
      const countRes = await api.getCount(dt.value, filters);
      total.value = countRes?.message ?? countRes ?? 0;
    } catch (e) {
      console.error("SEO pages load error:", e);
      rows.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function openEdit(row) {
    if (selectedDoctype.value.value === "Static Page SEO") {
      router.push(`/seo/static/${encodeURIComponent(row.page_path)}`);
      return;
    }
    router.push(`/seo/${selectedDoctype.value.editKey}/${encodeURIComponent(row.name)}`);
  }

  function openStorefront(row) {
    if (selectedDoctype.value.value === "Static Page SEO") {
      window.open(`${window.location.origin}${row.page_path}`, "_blank");
      return;
    }
    const slug = row[selectedDoctype.value.slugField];
    if (!slug) return;
    const url = `${window.location.origin}${selectedDoctype.value.urlPrefix}/${slug}`;
    window.open(url, "_blank");
  }

  // Sayfa/Filter/Search/Doctype değişince yeniden yükle
  watch([() => selectedDoctype.value.value, filter, page], loadPages, { immediate: true });

  let searchTimer = null;
  watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      loadPages();
    }, 400);
  });

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

  function pickDoctype(dt) {
    selectedDoctype.value = dt;
    page.value = 1;
  }

  function truncate(s, n = 60) {
    if (!s) return "—";
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString();
  }

  // Display label for a doctype tab, keyed off its stable editKey.
  function dtLabel(dt) {
    return t(`seoPages.dt_${dt.editKey}`, dt.label);
  }
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900">{{ t("seoPages.title") }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ t("seoPages.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="router.push('/seo/redirects')">
          {{ t("seoPages.urlRedirects") }}
        </button>
        <button class="hdr-btn-outlined" @click="router.push('/seo/404s')">
          {{ t("seoPages.logs404") }}
        </button>
      </div>
    </div>

    <!-- Doctype tabs -->
    <div class="flex border-b border-gray-200 mb-4 overflow-x-auto">
      <button
        v-for="dt in DOCTYPES"
        :key="dt.value"
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
        :class="
          selectedDoctype.value === dt.value
            ? 'border-violet-500 text-violet-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="pickDoctype(dt)"
      >
        {{ dtLabel(dt) }}
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col sm:flex-row gap-2 mb-4">
      <input
        v-model="search"
        type="text"
        :placeholder="t('seoPages.searchPlaceholder', { label: dtLabel(selectedDoctype) })"
        class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <select
        v-model="filter"
        class="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="all">{{ t("seoPages.filterAll") }}</option>
        <option value="missing_meta">{{ t("seoPages.filterMissingMeta") }}</option>
        <option value="missing_desc">{{ t("seoPages.filterMissingDesc") }}</option>
        <option value="noindex">{{ t("seoPages.filterNoindex") }}</option>
      </select>
      <ViewModeToggle v-model="viewMode" :modes="['table', 'grid', 'list']" />
    </div>

    <!-- Loading / Empty -->
    <div v-if="loading" class="text-center py-12 text-sm text-gray-400">
      {{ t("seoPages.loading") }}
    </div>
    <div
      v-else-if="rows.length === 0"
      class="text-center py-12 text-sm text-gray-400 bg-white rounded-lg border border-gray-200"
    >
      {{ t("seoPages.empty") }}
    </div>

    <!-- Table -->
    <div
      v-else-if="viewMode === 'table'"
      class="overflow-x-auto bg-white rounded-lg border border-gray-200"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3 text-left font-semibold">{{ t("seoPages.colTitle") }}</th>
            <th class="px-4 py-3 text-left font-semibold">{{ t("seoPages.colSlug") }}</th>
            <th class="px-4 py-3 text-left font-semibold">{{ t("seoPages.colMetaTitle") }}</th>
            <th class="px-4 py-3 text-center font-semibold">{{ t("seoPages.colMetaDesc") }}</th>
            <th class="px-4 py-3 text-center font-semibold">{{ t("seoPages.colNoindex") }}</th>
            <th class="px-4 py-3 text-right font-semibold">{{ t("seoPages.colAction") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="row in rows" :key="row.name" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">
                {{ row[selectedDoctype.titleField] || row.name }}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">{{ row.name }}</div>
            </td>
            <td class="px-4 py-3 text-gray-600 font-mono text-xs">
              {{ row[selectedDoctype.slugField] || "—" }}
            </td>
            <td class="px-4 py-3 text-gray-700">{{ truncate(row.meta_title) }}</td>
            <td class="px-4 py-3 text-center">
              <span
                v-if="row.meta_description"
                class="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"
                >{{ t("seoPages.present") }}</span
              >
              <span
                v-else
                class="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700"
                >{{ t("seoPages.empty2") }}</span
              >
            </td>
            <td class="px-4 py-3 text-center">
              <span
                v-if="row.noindex"
                class="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700"
                >{{ t("seoPages.hidden") }}</span
              >
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button
                v-if="row[selectedDoctype.slugField]"
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 mr-3"
                :title="t('seoPages.openStorefront')"
                @click="openStorefront(row)"
              >
                ↗
              </button>
              <button
                type="button"
                class="text-xs text-violet-600 hover:underline font-medium"
                @click="openEdit(row)"
              >
                {{ t("seoPages.editSeo") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid (card) -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div
        v-for="row in rows"
        :key="row.name"
        class="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 hover:border-violet-300 transition-colors"
      >
        <div class="min-w-0">
          <div class="font-medium text-sm text-gray-900 truncate">
            {{ row[selectedDoctype.titleField] || row.name }}
          </div>
          <div class="text-xs text-gray-400 font-mono truncate mt-0.5">
            {{ row[selectedDoctype.slugField] || row.name }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <span
            class="inline-block px-2 py-0.5 text-[11px] rounded-full"
            :class="
              row.meta_title && row.meta_description
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            "
          >
            {{
              row.meta_title && row.meta_description ? t("seoPages.present") : t("seoPages.empty2")
            }}
          </span>
          <span class="inline-block px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-600">
            {{ dtLabel(selectedDoctype) }}
          </span>
          <span
            v-if="row.noindex"
            class="inline-block px-2 py-0.5 text-[11px] rounded-full bg-amber-100 text-amber-700"
          >
            {{ t("seoPages.hidden") }}
          </span>
        </div>

        <div class="flex items-center justify-between mt-auto pt-1">
          <span v-if="row.modified" class="text-[11px] text-gray-400">{{
            formatDate(row.modified)
          }}</span>
          <span v-else></span>
          <div class="flex items-center gap-3 whitespace-nowrap">
            <button
              v-if="row[selectedDoctype.slugField]"
              type="button"
              class="text-xs text-gray-500 hover:text-gray-700"
              :title="t('seoPages.openStorefront')"
              @click="openStorefront(row)"
            >
              ↗
            </button>
            <button
              type="button"
              class="text-xs text-violet-600 hover:underline font-medium"
              @click="openEdit(row)"
            >
              {{ t("seoPages.editSeo") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact list -->
    <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        v-for="row in rows"
        :key="row.name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors"
      >
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-gray-900 truncate">
            {{ row[selectedDoctype.titleField] || row.name }}
          </div>
          <div class="text-[10px] text-gray-400 font-mono truncate">
            {{ row[selectedDoctype.slugField] || row.name }}
          </div>
        </div>
        <span
          class="inline-block px-2 py-0.5 text-[10px] rounded-full flex-none"
          :class="
            row.meta_title && row.meta_description
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          "
        >
          {{
            row.meta_title && row.meta_description ? t("seoPages.present") : t("seoPages.empty2")
          }}
        </span>
        <span
          v-if="row.noindex"
          class="inline-block px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 flex-none"
        >
          {{ t("seoPages.hidden") }}
        </span>
        <button
          type="button"
          class="text-xs text-violet-600 hover:underline font-medium flex-none"
          @click="openEdit(row)"
        >
          {{ t("seoPages.editSeo") }}
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > pageSize"
      class="flex items-center justify-between mt-4 text-sm text-gray-500"
    >
      <span>
        {{ t("seoPages.totalLabel") }} <strong class="text-gray-900">{{ total }}</strong>
        {{ t("seoPages.recordsPageLabel") }} <strong class="text-gray-900">{{ page }}</strong> /
        {{ totalPages }}
      </span>
      <div class="flex gap-2">
        <button type="button" class="hdr-btn-outlined !py-1" :disabled="page <= 1" @click="page--">
          {{ t("seoPages.previous") }}
        </button>
        <button
          type="button"
          class="hdr-btn-outlined !py-1"
          :disabled="page >= totalPages"
          @click="page++"
        >
          {{ t("seoPages.next") }}
        </button>
      </div>
    </div>
  </div>
</template>

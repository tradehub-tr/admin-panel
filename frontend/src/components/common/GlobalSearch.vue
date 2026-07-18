<template>
  <div
    class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/8 max-h-[400px] overflow-y-auto z-50"
  >
    <template v-if="filteredResults.length === 0">
      <div class="p-6 text-center">
        <AppIcon name="search" :size="24" class="text-gray-300 mb-2" />
        <p class="text-sm text-gray-400">{{ t("globalSearch.noResults") }}</p>
      </div>
    </template>
    <template v-else>
      <template v-for="(items, category) in groupedResults" :key="category">
        <div class="search-result-category">{{ category }}</div>
        <div
          v-for="item in items"
          :key="item.label"
          class="search-result-item"
          @mousedown.prevent="handleClick(item)"
        >
          <div class="result-icon bg-brand-50 text-brand-700">
            <AppIcon :name="item.icon" :size="14" />
          </div>
          <div class="result-text">
            <!-- item.labelText, searchData i18n key'inin çevirisi; highlight() yalnız <mark> tag'i ekler -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="title" v-html="highlight(item.labelText)"></div>
            <div class="subtitle">
              {{ item.doctype || item.report || "" }} &middot; {{ item.sectionText }}
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { searchData } from "@/data/navigation";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  const props = defineProps({
    query: { type: String, default: "" },
  });

  const emit = defineEmits(["select"]);
  const router = useRouter();

  // searchData carries i18n KEY strings (label/sectionLabel). Translate to the
  // active locale first, then match & display. `tx` = translate-or-passthrough:
  // returns "" for empty/missing keys instead of echoing the key back.
  const tx = (key) => (key ? t(key) : "");

  // Pre-translate once per query/locale so we don't call t() repeatedly while
  // filtering & rendering (computed cache + reactive on locale change).
  const translatedData = computed(() =>
    searchData.map((item) => ({
      ...item,
      labelText: tx(item.label),
      sectionText: tx(item.sectionTitle || item.sectionLabel),
      groupText: tx(item.groupTitle),
    }))
  );

  const filteredResults = computed(() => {
    const q = props.query.toLowerCase();
    if (q.length < 2) return [];
    return translatedData.value
      .filter(
        (item) =>
          item.labelText.toLowerCase().includes(q) ||
          (item.doctype || "").toLowerCase().includes(q) ||
          (item.report || "").toLowerCase().includes(q) ||
          item.sectionText.toLowerCase().includes(q) ||
          item.groupText.toLowerCase().includes(q)
      )
      .slice(0, 30);
  });

  const groupedResults = computed(() => {
    const groups = {};
    filteredResults.value.forEach((item) => {
      const cat = item.sectionText || t("globalSearch.other");
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  });

  // XSS koruması: item.label / item.doctype gibi backend kontrollü string'ler
  // (Customize Form üzerinden enjekte edilebilir) doğrudan v-html'e gitmemeli.
  // text'i önce escape, sonra <mark> wrap. Query'yi de escape — kullanıcı
  // arama kutusuna `<img src=x onerror=...>` yazıp kendi tarayıcısını
  // patlatabilir teorikte (self-XSS), pratikte de log/snapshot'a sızar.
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function highlight(text) {
    const safe = escapeHtml(text);
    const q = (props.query || "").toLowerCase();
    if (!q) return safe;
    const lower = String(text ?? "").toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return safe;
    // Orijinal string üzerinde index'leri hesapla, parçaları escape edip mark sar
    const original = String(text ?? "");
    return (
      escapeHtml(original.substring(0, idx)) +
      '<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">' +
      escapeHtml(original.substring(idx, idx + q.length)) +
      "</mark>" +
      escapeHtml(original.substring(idx + q.length))
    );
  }

  function handleClick(item) {
    emit("select", item);
    const slug = (item.doctype || item.report || "").toLowerCase().replace(/\s+/g, "-");
    if (item.route) {
      router.push(item.route);
    } else if (item.doctype) {
      router.push(`/app/${slug}`);
    } else if (item.report) {
      router.push(`/app/report/${slug}`);
    }
  }
</script>

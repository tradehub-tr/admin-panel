<script setup>
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import MediaSeoDrawer from "@/components/media/MediaSeoDrawer.vue";
  import MediaSeoScorecard from "@/components/media/MediaSeoScorecard.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useMediaSeo } from "@/composables/useMediaSeo";
  import { useToast } from "@/composables/useToast";
  import { formatSize } from "@/utils/mediaFormat";

  const { t } = useI18n();
  const toast = useToast();
  const s = useMediaSeo();

  // Toplu işler katalogu değiştiriyor: alt metni üretmek geri alınabilir ama
  // 1.788 kayda dokunuyor. Karantinadan çıkarmayla aynı iki adımlı onay.
  const confirming = ref("");
  // Arama girdisi ayrı tutuluyor: her tuşta sunucuya gitmesin, Enter'da gitsin.
  const searchInput = ref("");

  const VIEW_MODES = ["table", "grid", "list", "kanban"];
  const { viewMode } = useListViewMode("media-seo-view", "table");
  // `useBreakpoint` `isDesktop` döndürmüyor — `isXl` döndürüyor. Önce
  // `{ isDesktop }` diye alınmıştı: undefined'ın `.value`'su render'da patlıyor,
  // ekran "yükleniyor"da kalıyor, geçiş düğmesi hiç çizilmiyordu.
  const { isXl: isDesktop } = useBreakpoint();
  // Telefonda dört sütunlu kanban okunmuyor; mod seçimi korunur ama çizim
  // listeye düşer (MediaAuditView ile aynı karar).
  const effectiveMode = computed(() => (isDesktop.value ? viewMode.value : "list"));

  /** Kanban sütunları: en ağır bulguya göre. Operatörün sorusu "neyi önce
   *  düzelteyim" — sütunlar o sırayı gösteriyor. */
  const kanbanGroups = computed(() => {
    const kova = { error: [], warn: [], ok: [] };
    for (const row of s.visibleItems.value) kova[worst(row)].push(row);
    return [
      { id: "error", label: t("mediaSeo.kanban.error"), items: kova.error },
      { id: "warn", label: t("mediaSeo.kanban.warn"), items: kova.warn },
      { id: "ok", label: t("mediaSeo.kanban.ok"), items: kova.ok },
    ].filter((c) => c.items.length);
  });

  /** Küçük önizleme — yalnız görsel uzantılarında. Video/PDF'te kırık
   *  resim yerine ikon gösterilir. */
  function isImage(url) {
    return /\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i.test(url || "");
  }

  const filtersOpen = ref(false);
  const searchEl = ref(null);

  onMounted(() => {
    s.load();
    window.addEventListener("keydown", onKey);
  });
  onUnmounted(() => window.removeEventListener("keydown", onKey));

  /** Klavye: Esc çekmeceleri kapatır, "/" aramaya odaklanır, "f" huniyi açar
   *  — /media-audit ile aynı üç kısayol. Girdi içindeyken devre dışı. */
  function onKey(e) {
    if (e.key === "Escape") {
      if (filtersOpen.value) filtersOpen.value = false;
      else if (s.selected.value) s.closeDrawer();
      return;
    }
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "/") {
      e.preventDefault();
      searchEl.value?.focus();
    }
    if (e.key === "f") filtersOpen.value = true;
  }

  // Arama yazarken 300 ms bekleyip sunucuya gidiyor (her tuşta değil).
  let searchTimer = null;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => s.applySearch(searchInput.value), 300);
  }

  const filterGroups = computed(() => [
    {
      id: "scope",
      label: t("mediaSeo.filter.scope"),
      value: s.scope.value,
      set: (v) => s.setScope(v),
      options: ["catalog", "recent", "all"].map((id) => ({ id, label: t(`mediaSeo.scope.${id}`) })),
    },
    {
      id: "code",
      label: t("mediaSeo.filter.code"),
      value: s.filterCode.value,
      set: setCode,
      options: [
        { id: "", label: t("mediaSeo.filter.allCodes"), count: s.total.value },
        ...s.counters.value.map((c) => ({
          id: c.code,
          label: t(`mediaSeo.finding.${c.code}`),
          count: c.count,
          dot: c.code === "missing_alt" ? "danger" : "warn",
        })),
      ],
    },
  ]);

  const chips = computed(() => {
    const out = [];
    if (s.search.value) out.push({ key: "search", label: `"${s.search.value}"` });
    if (s.scope.value !== "catalog") out.push({ key: "scope", label: t(`mediaSeo.scope.${s.scope.value}`) });
    if (s.filterCode.value) out.push({ key: "code", label: t(`mediaSeo.finding.${s.filterCode.value}`) });
    if (s.deep.value) out.push({ key: "deep", label: t("mediaSeo.deep") });
    return out;
  });
  const activeFilterCount = computed(() => chips.value.length);

  function clearChip(key) {
    if (key === "all" || key === "search") {
      searchInput.value = "";
      if (key === "search") return s.applySearch("");
    }
    if (key === "all" || key === "scope") s.scope.value = "catalog";
    if (key === "all" || key === "code") s.filterCode.value = "";
    if (key === "all" || key === "deep") s.deep.value = false;
    if (key === "all") s.search.value = "";
    s.page.value = 1;
    return s.load();
  }

  /** `setFilter` aynı koda basınca kapatıyor (sayaç şeridi için doğru);
   *  radyo düğmesinde "aynı seçeneğe tekrar basmak" kapatma değildir. */
  function setCode(v) {
    if (v === s.filterCode.value) return;
    s.setFilter(v);
  }

  async function doGenerate(row) {
    try {
      const r = await s.generateAlt(row.file_url);
      if (r?.written) toast.success(t("mediaSeo.toast.generated", { alt: r.alt }));
      // "Yazılmadı" bir hata değil: metin zaten var, bağlam yok ya da insan
      // yazmış. Sebebi VE mevcut metni söylemezsek operatör düğmenin bozuk
      // olduğunu sanıyor (oldu: toplu doldurmadan sonra her satır "değişmedi").
      else {
        const sebep = (r?.reason || "").split(":")[0] || "unchanged";
        toast.info(t(`mediaSeo.skip.${sebep}`) + (r?.alt ? ` — "${r.alt}"` : ""));
      }
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doBackfillAlt() {
    confirming.value = "";
    try {
      const r = await s.backfillAlt(500);
      toast.success(t("mediaSeo.toast.backfilled", { n: r?.written ?? 0, s: r?.skipped ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doBackfillDim() {
    confirming.value = "";
    try {
      const r = await s.backfillDimensions(500);
      toast.success(t("mediaSeo.toast.dimensions", { n: r?.written ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doSave(values) {
    try {
      await s.saveFields(values);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  /** Satırın alt metni — yük artık metnin kendisini taşıyor (`alt`), boşsa
   *  "—". Eskiden yalnız ✓/— vardı ve "Metin üret" bir şey yaptı mı
   *  görünmüyordu. */
  function altOf(row) {
    return row.alt || "—";
  }

  function scoreClass(v) {
    if (v == null) return "";
    if (v >= 85) return "ms__score--good";
    if (v >= 60) return "ms__score--mid";
    return "ms__score--bad";
  }

  /** Kart sayıları TÜM kapsamın özetinden okunuyor, görünen sayfadan değil:
   *  50 satırdan sayarsak "1.986 dosyada 12 hata" yerine "12 hata" derdik. */
  const errorCount = computed(() => Number(s.summary.value?.missing_alt || 0));
  const withAltCount = computed(() => Math.max(0, s.total.value - errorCount.value));
  const warnCount = computed(() =>
    ["missing_title", "missing_caption", "missing_license", "poor_filename", "suspicious_alt"].reduce(
      (acc, k) => acc + Number(s.summary.value?.[k] || 0),
      0
    )
  );

  /** Satırın en ağır bulgusu — rozet rengini o belirler. */
  function worst(row) {
    const f = row.findings || [];
    if (f.some((x) => x.severity === "error")) return "error";
    return f.length ? "warn" : "ok";
  }
</script>

<template>
  <section class="ms">
    <header class="ms__head">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("mediaSeo.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t("mediaSeo.subtitle") }}</p>
      </div>
      <!-- `v-if` ile kaldırılıyor, Tailwind `hidden` ile değil: scoped stilin
           [data-v] eki `.hidden`'ı ezip bloğu telefonda geri getiriyor. -->
      <div v-if="isDesktop" class="ms__head-actions">
        <template v-if="confirming === 'alt'">
          <button type="button" class="hdr-btn-danger" :disabled="!!s.acting.value" @click="doBackfillAlt">
            {{ t("mediaSeo.action.backfillAltConfirm") }}
          </button>
          <button type="button" class="hdr-btn-outlined" @click="confirming = ''">
            {{ t("common.cancel") }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="hdr-btn-outlined"
          :disabled="!!s.acting.value"
          @click="confirming = 'alt'"
        >
          <AppIcon name="wand-sparkles" :size="14" />
          {{ t("mediaSeo.action.backfillAlt") }}
        </button>

        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="!!s.acting.value"
          @click="doBackfillDim"
        >
          <AppIcon name="ruler" :size="14" />
          {{ t("mediaSeo.action.backfillDimensions") }}
        </button>
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="s.loading.value"
          @click="s.load({ refresh: true })"
        >
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("mediaSeo.action.rescan") }}
        </button>
      </div>
    </header>

    <!-- ── Özet kartları — /media-audit ile aynı desen ── -->
    <div class="ms__stats">
      <div class="ms__stat">
        <span class="ms__stat-label">{{ t("mediaSeo.stat.scanned") }}</span>
        <strong>{{ s.total.value }}</strong>
        <small>{{ t("mediaSeo.stat.scannedNote") }}</small>
      </div>
      <div class="ms__stat ms__stat--danger">
        <span class="ms__stat-label">{{ t("mediaSeo.stat.errors") }}</span>
        <strong>{{ errorCount }}</strong>
        <small>{{ t("mediaSeo.stat.errorsNote") }}</small>
        <div v-if="errorCount" class="ms__stat-acts">
          <button type="button" class="ms__mini ms__mini--danger" @click="s.setFilter('missing_alt')">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaSeo.stat.showMissingAlt") }}
          </button>
        </div>
      </div>
      <div class="ms__stat ms__stat--good">
        <span class="ms__stat-label">{{ t("mediaSeo.stat.withAlt") }}</span>
        <strong>{{ withAltCount }}</strong>
        <small>{{ t("mediaSeo.stat.withAltNote") }}</small>
      </div>
      <div class="ms__stat ms__stat--warn">
        <span class="ms__stat-label">{{ t("mediaSeo.stat.warnings") }}</span>
        <strong>{{ warnCount }}</strong>
        <small>{{ t("mediaSeo.stat.warningsNote") }}</small>
      </div>
    </div>

    <MediaSeoScorecard :score="s.score.value" :total="s.total.value" />

    <!-- Sayaç şeridi: tıklayınca liste o bulguya daralır. Tek bakışta
         "en çok neyi eksik" görünsün diye çoktan aza sıralı. -->
    <div v-if="s.counters.value.length" class="ms__counters">
      <button
        v-for="c in s.counters.value"
        :key="c.code"
        type="button"
        class="ms__counter"
        :class="{ 'ms__counter--active': s.filterCode.value === c.code }"
        @click="s.setFilter(c.code)"
      >
        <strong>{{ c.count }}</strong>
        <span>{{ t(`mediaSeo.finding.${c.code}`) }}</span>
      </button>
    </div>

    <!-- ── Araç şeridi — /media-audit ile aynı kalıp: arama · huni · görünüm ── -->
    <div class="mtoolbar-wrap">
      <div class="card ms__toolbar">
        <div class="ms__search">
          <AppIcon name="search" :size="13" class="ms__search-icon" />
          <input
            ref="searchEl"
            v-model="searchInput"
            type="text"
            class="form-input-sm w-full !pl-9"
            :placeholder="t('mediaSeo.searchPlaceholder')"
            @input="onSearch"
            @keyup.enter="s.applySearch(searchInput)"
          />
          <button
            v-if="searchInput"
            type="button"
            class="ms__search-clear"
            :aria-label="t('mediaSeo.filter.reset')"
            @click="clearChip('search')"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button
          type="button"
          class="hdr-btn-outlined ms__funnel"
          :class="{ 'ms__funnel--on': activeFilterCount }"
          @click="filtersOpen = true"
        >
          <AppIcon name="filter" :size="13" />
          <span>{{ t("mediaSeo.filter.title") }}</span>
          <span v-if="activeFilterCount" class="ms__funnel-count">{{ activeFilterCount }}</span>
        </button>

        <ViewModeToggle v-if="isDesktop" v-model="viewMode" :modes="VIEW_MODES" />
      </div>
    </div>

    <MediaFilterChips :chips="chips" @clear="clearChip" />

    <div v-if="s.loading.value" class="ms__empty">{{ t("common.loading") }}</div>
    <div v-else-if="s.error.value" class="ms__empty ms__empty--err">{{ s.error.value }}</div>
    <div v-else-if="!s.visibleItems.value.length" class="ms__empty">
      {{ t("mediaSeo.empty") }}
    </div>

    <table v-else-if="effectiveMode === 'table'" class="ms__table">
      <thead>
        <tr>
          <th>{{ t("mediaSeo.col.file") }}</th>
          <th>{{ t("mediaSeo.col.alt") }}</th>
          <th>{{ t("mediaSeo.col.size") }}</th>
          <th>{{ t("mediaSeo.col.findings") }}</th>
          <th>{{ t("mediaSeo.col.score") }}</th>
          <th class="ms__col-actions">{{ t("mediaSeo.col.actions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in s.visibleItems.value"
          :key="row.file_url"
          class="ms__row"
          :class="{ 'ms__row--selected': s.selected.value?.file_url === row.file_url }"
          @click="s.select(row)"
        >
          <td>
            <span class="ms__file">{{ row.file_name || "—" }}</span>
            <code class="ms__url">{{ row.file_url }}</code>
          </td>
          <td>
            <span class="ms__alt" :class="{ 'ms__alt--none': !row.alt }" :title="row.alt || ''">
              {{ altOf(row) }}
            </span>
            <small v-if="row.alt_source" class="ms__altsrc">{{ t(`mediaSeo.source.${row.alt_source}`) }}</small>
          </td>
          <td class="ms__num">{{ formatSize(row.file_size) }}</td>
          <td>
            <span class="ms__badge" :class="`ms__badge--${worst(row)}`">
              {{
                worst(row) === "ok"
                  ? t("mediaSeo.clean")
                  : t("mediaSeo.findingCount", { n: (row.findings || []).length })
              }}
            </span>
          </td>
          <td class="ms__num">
            <span class="ms__score" :class="scoreClass(row.score?.overall)">
              {{ row.score?.overall ?? "—" }}
            </span>
          </td>
          <td class="ms__col-actions" @click.stop>
            <button
              type="button"
              class="ms__link"
              :disabled="s.acting.value === row.file_url"
              @click="doGenerate(row)"
            >
              {{ t("mediaSeo.action.generate") }}
            </button>
            <button type="button" class="ms__link" @click="s.select(row)">
              {{ t("mediaSeo.action.edit") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ── Izgara: küçük önizleme + not; görsel taramak için ── -->
    <div v-else-if="effectiveMode === 'grid'" class="ms__grid">
      <button
        v-for="row in s.visibleItems.value"
        :key="row.file_url"
        type="button"
        class="card ms__gcard"
        :class="`ms__tone--${worst(row)}`"
        @click="s.select(row)"
      >
        <img
          v-if="isImage(row.file_url)"
          class="ms__gthumb"
          :src="row.file_url"
          :alt="row.file_name"
          loading="lazy"
          decoding="async"
          width="120"
          height="120"
        />
        <span v-else class="ms__gthumb ms__gthumb--ph">
          <AppIcon name="file" :size="18" />
        </span>
        <span class="ms__gname">{{ row.file_name || "—" }}</span>
        <span class="ms__galt" :title="row.alt || ''">{{ altOf(row) }}</span>
        <span class="ms__gmeta">
          <span class="ms__score" :class="scoreClass(row.score?.overall)">{{ row.score?.overall ?? "—" }}</span>
          <span class="ms__badge" :class="`ms__badge--${worst(row)}`">
            {{ worst(row) === "ok" ? t("mediaSeo.clean") : (row.findings || []).length }}
          </span>
        </span>
      </button>
    </div>

    <!-- ── Liste: tek satırda dosya + bulgu adları; mobil varsayılanı ── -->
    <div v-else-if="effectiveMode === 'list'" class="card ms__list">
      <div
        v-for="row in s.visibleItems.value"
        :key="row.file_url"
        class="ms__lrow"
        :class="`ms__tone--${worst(row)}`"
        @click="s.select(row)"
      >
        <span class="ms__lname">
          {{ row.file_name || "—" }}
          <small class="ms__galt" :title="row.alt || ''">{{ altOf(row) }}</small>
        </span>
        <span class="ms__lfindings">
          <span v-for="f in (row.findings || []).slice(0, 3)" :key="f.code" class="ms__chip">
            {{ t(`mediaSeo.finding.${f.code}`) }}
          </span>
          <span v-if="(row.findings || []).length > 3" class="ms__chip">
            +{{ (row.findings || []).length - 3 }}
          </span>
          <span v-if="!(row.findings || []).length" class="ms__chip ms__chip--ok">
            {{ t("mediaSeo.clean") }}
          </span>
        </span>
        <span class="ms__score" :class="scoreClass(row.score?.overall)">{{ row.score?.overall ?? "—" }}</span>
      </div>
    </div>

    <!-- ── Kanban: aciliyete göre üç sütun; "neyi önce düzelteyim" ── -->
    <div v-else class="ms__kanban">
      <section v-for="col in kanbanGroups" :key="col.id" class="card ms__kcol">
        <header class="ms__kcol-head">
          <span>{{ col.label }}</span>
          <span class="ms__kcol-count">{{ col.items.length }}</span>
        </header>
        <div class="ms__kcol-body">
          <div
            v-for="row in col.items"
            :key="row.file_url"
            class="ms__kcard"
            :class="`ms__tone--${col.id}`"
            @click="s.select(row)"
          >
            <span class="ms__kname">{{ row.file_name || "—" }}</span>
            <span class="ms__galt" :title="row.alt || ''">{{ altOf(row) }}</span>
            <span class="ms__kmeta">
              <span class="ms__score" :class="scoreClass(row.score?.overall)">{{ row.score?.overall ?? "—" }}</span>
              <span class="ms__kcount">{{ (row.findings || []).length }}</span>
            </span>
          </div>
        </div>
      </section>
    </div>

    <div v-if="!s.loading.value && s.filteredTotal.value" class="ms__foot">
      <span class="ms__count">
        {{ t("mediaSeo.showing", { n: s.filteredTotal.value, total: s.total.value }) }}
      </span>
      <!-- `ListPagination` sözleşmesi: `modelValue` (sayfa) + `total` (SATIR
           sayısı, sayfa sayısı değil). Önce `page`/`page-count` geçilmişti ve
           bileşen NaN gösteriyordu — sayfa sayısını kendisi hesaplıyor. -->
      <ListPagination
        :model-value="s.page.value"
        :total="s.filteredTotal.value"
        :page-size="s.pageSize.value"
        :page-size-options="[25, 50, 100]"
        @update:model-value="s.goPage"
        @update:page-size="s.setPageSize"
      />
    </div>

    <!-- ── Filtre çekmecesi — MediaAuditView ile aynı kalıp ── -->
    <Teleport to="body">
      <Transition name="dt-drawer">
        <div v-if="filtersOpen" class="fixed inset-0 z-[70]">
          <div class="absolute inset-0 bg-black/40" @click="filtersOpen = false" />
          <aside
            class="absolute right-0 top-0 h-full w-[380px] max-w-[92vw] flex flex-col bg-white dark:bg-[#16161f] shadow-2xl"
          >
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a2a35]">
              <div class="flex items-center gap-2">
                <AppIcon name="filter" :size="16" class="text-brand-800" />
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{ t("mediaSeo.filter.title") }}</span>
                <span
                  v-if="activeFilterCount"
                  class="px-1.5 rounded-full text-[11px] bg-brand-50 text-brand-800 dark:bg-brand-900/25 dark:text-brand-300"
                >
                  {{ activeFilterCount }}
                </span>
              </div>
              <button
                type="button"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#22222c]"
                :aria-label="t('common.close')"
                @click="filtersOpen = false"
              >
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <div v-for="g in filterGroups" :key="g.id" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">{{ g.label }}</label>
                <div class="flex flex-col gap-1.5">
                  <label
                    v-for="opt in g.options"
                    :key="String(opt.id)"
                    class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                  >
                    <input type="radio" :name="`ms-f-${g.id}`" :checked="g.value === opt.id" @change="g.set(opt.id)" />
                    <span v-if="opt.dot" class="ms__dot" :class="`ms__dot--${opt.dot}`" />
                    {{ opt.label }}
                    <span v-if="opt.count !== undefined" class="ms__optcount">{{ opt.count }}</span>
                  </label>
                </div>
              </div>

              <div class="mb-5">
                <label class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300">
                  <input v-model="s.deep.value" type="checkbox" @change="s.load({ refresh: true })" />
                  {{ t("mediaSeo.deep") }}
                </label>
                <p class="mt-1 text-[12px] text-gray-400 dark:text-gray-500">{{ t("mediaSeo.deepHint") }}</p>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-gray-200 dark:border-[#2a2a35] flex gap-2">
              <button type="button" class="hdr-btn-outlined flex-1" @click="clearChip('all')">
                {{ t("mediaSeo.filter.reset") }}
              </button>
              <button type="button" class="hdr-btn-primary flex-1" @click="filtersOpen = false">
                {{ t("mediaSeo.filter.apply") }}
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <MediaSeoDrawer
      :row="s.selected.value"
      :fields="s.selectedFields.value"
      :saving="s.savingFields.value"
      @close="s.closeDrawer()"
      @save="doSave"
    />
  </section>
</template>


<style scoped lang="scss">
  /* Panel stil standardı: `hdr-btn-*`, `card`, `gray-*` (bkz. scss.md §8).
     Burada yalnız bu ekrana özel olanlar: sayaç şeridi, tablo, rozet. */
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .ms {
    padding: media.$s-4;
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  .ms__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
  }

  .ms__head-actions {
    display: flex;
    gap: media.$s-2;
    align-items: center;
    flex-wrap: wrap;
  }


  .ms__alt {
    display: block;
    max-width: 22rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include media.text("sm");

    &--none {
      color: $l-text-400;
    }
  }

  .ms__altsrc {
    @include media.text("xs");
    color: $l-text-400;
  }

  // ── Araç şeridi ──────────────────────────────────────────────────
  .mtoolbar-wrap {
    position: sticky;
    // Header (56px) aynı scroll kabında sticky; 0 verilirse arkasına girer.
    top: media.$m-sticky-top;
    z-index: 20;
    margin-bottom: media.$s-3;
  }

  .ms__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    flex-wrap: wrap;
  }

  .ms__search {
    position: relative;
    flex: 1 1 14rem;
    min-width: 12rem;
  }

  .ms__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $l-text-300;
  }

  .ms__search-clear {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    @include media.icon-button;
  }

  .ms__funnel--on {
    border-color: $brand;
    color: $brand;
  }

  .ms__funnel-count {
    @include media.chip("brand");
    margin-left: 0.3rem;
  }

  .ms__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: 0 0 auto;
    &--danger {
      background: $c-error;
    }
    &--warn {
      background: $c-warning;
    }
  }

  .ms__optcount {
    margin-inline-start: auto;
    @include media.text("xs");
    color: $l-text-400;
  }

  /* Ton — dört görünümde de aynı anlam: kırmızı hata, sarı fırsat, yeşil temiz. */
  .ms__tone--error {
    border-inline-start: 3px solid $c-error;
  }
  .ms__tone--warn {
    border-inline-start: 3px solid $c-warning;
  }
  .ms__tone--ok {
    border-inline-start: 3px solid $c-success;
  }

  .ms__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: media.$s-3;
  }

  .ms__gcard {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-2;
    text-align: start;
    cursor: pointer;
    border: 1px solid $l-border;
    background: $l-bg;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .ms__gthumb {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: media.$r-sm;
    background: $l-bg-muted;

    &--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      color: $l-text-400;
    }
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .ms__gname {
    @include media.text("xs");
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ms__galt {
    display: block;
    @include media.text("xs");
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-muted;
    }
  }

  .ms__gmeta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-1;
  }

  .ms__list {
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .ms__lrow {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    border-bottom: 1px solid $l-border;
    cursor: pointer;
    @include media.text("sm");

    &:last-child {
      border-bottom: 0;
    }
    &:hover {
      background: $l-bg-soft;
    }
    @include dark {
      border-color: $d-border;
      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .ms__lname {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .ms__lfindings {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .ms__chip {
    padding: media.$s-05 media.$s-1;
    border-radius: media.$r-sm;
    background: $l-bg-muted;
    @include media.text("xs");
    color: $l-text-600;

    &--ok {
      background: media.$tint-success;
      color: $c-success;
    }
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .ms__kanban {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: media.$s-3;
    align-items: start;
  }

  .ms__kcol {
    padding: media.$s-2;
  }

  .ms__kcol-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @include media.text("sm");
    font-weight: 700;
    padding-block-end: media.$s-2;
  }

  .ms__kcol-count {
    @include media.text("xs");
    color: $l-text-400;
  }

  .ms__kcol-body {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    max-height: 32rem;
    overflow-y: auto;
  }

  .ms__kcard {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    padding: media.$s-2;
    border-radius: media.$r-sm;
    background: $l-bg-soft;
    cursor: pointer;
    @include media.text("xs");

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .ms__kname {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ms__kmeta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ms__kcount {
    color: $l-text-400;
  }

  .ms__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-3;
    flex-wrap: wrap;
  }

  .ms__count {
    @include media.text("xs");
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }



  .ms__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: media.$s-3;
  }

  .ms__stat {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    padding: media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;

    strong {
      @include media.text("display");
      font-weight: 700;
      line-height: 1;
    }
    small {
      @include media.text("xs");
      color: $l-text-400;
    }
    &--danger strong {
      color: $c-error;
    }
    &--good strong {
      color: $c-success;
    }
    &--warn strong {
      color: $c-warning;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      small {
        color: $d-text-faint;
      }
    }
  }

  .ms__stat-label {
    @include media.text("xs");
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .ms__stat-acts {
    margin-block-start: media.$s-1;
  }

  .ms__mini {
    display: inline-flex;
    align-items: center;
    gap: media.$s-05;
    background: none;
    border: 0;
    color: $brand;
    cursor: pointer;
    @include media.text("xs");
    padding: 0;

    &--danger {
      color: $c-error;
    }
  }

  .ms__counters {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .ms__counter {
    display: flex;
    align-items: baseline;
    gap: media.$s-1;
    padding: media.$s-1 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;
    cursor: pointer;
    @include media.text("xs");

    strong {
      @include media.text("body");
      font-weight: 700;
    }
    &--active {
      border-color: $brand;
      color: $brand;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      &.ms__counter--active {
        border-color: $brand-light;
        color: $brand-light;
      }
    }
  }

  .ms__empty {
    padding: media.$s-6;
    text-align: center;
    color: $l-text-400;
    @include media.text("body");
    &--err {
      color: $c-error;
    }
    @include dark {
      color: $d-text-faint;
    }
  }

  .ms__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: media.$s-2;
      text-align: start;
      border-bottom: 1px solid $l-border;
      vertical-align: top;
    }
    th {
      color: $l-text-500;
      font-weight: 600;
    }
    @include dark {
      th,
      td {
        border-color: $d-border;
      }
      th {
        color: $d-text-muted;
      }
    }
  }

  .ms__row {
    cursor: pointer;
    &:hover {
      background: $l-bg-soft;
    }
    &--selected {
      background: rgb(124 58 237 / 8%);
    }
    @include dark {
      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .ms__file {
    display: block;
    font-weight: 600;
  }

  .ms__url {
    display: block;
    @include media.text("xs");
    color: $l-text-400;
    word-break: break-all;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ms__num {
    white-space: nowrap;
  }

  .ms__badge {
    display: inline-block;
    padding: media.$s-05 media.$s-2;
    border-radius: media.$r-sm;
    @include media.text("xs");
    font-weight: 600;
    background: $l-bg-muted;
    color: $l-text-600;

    &--error {
      background: media.$tint-danger;
      color: $c-error;
    }
    &--warn {
      background: media.$tint-warning;
      color: $c-warning;
    }
    &--ok {
      background: media.$tint-success;
      color: $c-success;
    }
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .ms__score {
    font-weight: 700;
    &--good {
      color: $c-success;
    }
    &--mid {
      color: $c-warning;
    }
    &--bad {
      color: $c-error;
    }
  }

  .ms__col-actions {
    text-align: end;
    white-space: nowrap;
  }

  .ms__link {
    background: none;
    border: 0;
    color: $brand;
    cursor: pointer;
    @include media.text("xs");
    padding: media.$s-05 media.$s-1;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>

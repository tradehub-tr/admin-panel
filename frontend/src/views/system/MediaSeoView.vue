<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";

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
  function extOf(row) {
    const m = /\.([a-z0-9]+)$/i.exec(row.file_name || row.file_url || "");
    return (m?.[1] || "?").toUpperCase().slice(0, 4);
  }

  const filtersOpen = ref(false);
  const searchEl = ref(null);

  onMounted(() => {
    s.load();
    s.loadPipelineStatus().catch(() => {});
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
    if (s.scope.value !== "catalog")
      out.push({ key: "scope", label: t(`mediaSeo.scope.${s.scope.value}`) });
    if (s.filterCode.value)
      out.push({ key: "code", label: t(`mediaSeo.finding.${s.filterCode.value}`) });
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

  /** `by_lang` sözlüğünü "en: 12, ar: 0, ru: 0" gibi kısa bir özete çevirir —
   *  toast tek toplam sayı yerine dil kırılımını da göstersin diye. */
  function summarizeByLang(byLang) {
    return Object.entries(byLang || {})
      .map(([lang, r]) => `${lang}: ${r?.written ?? 0}`)
      .join(", ");
  }

  async function doBackfillLocalization() {
    confirming.value = "";
    try {
      // `backfillAlt` ile aynı tavan (500) — emsalden farklı büyük görünen
      // 2000 aslında TEK istekte dil başına ayrı uygulanıyor (`langs` × limit),
      // yani 3 dilde 6000 satıra kadar tek HTTP turu demekti. `count` burada
      // "dil başına limit" — backend `backfill_localization`'ın semantiği bu.
      const r = await s.backfillLocalization(500);
      toast.success(
        t("mediaSeo.toast.localized", {
          n: r?.written ?? 0,
          s: r?.skipped ?? 0,
          byLang: summarizeByLang(r?.by_lang),
        })
      );
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doRenditionBackfill() {
    try {
      const r = await s.startRenditionBackfill(100);
      toast.success(t("mediaSeo.toast.renditions", { n: r?.queued ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doRetryRenditions() {
    try {
      const r = await s.retryFailedRenditions(50);
      toast.success(t("mediaSeo.toast.retried", { n: r?.queued ?? 0 }));
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

  async function doSaveOverride(usage, values) {
    try {
      await s.saveOverride(usage, values);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doClearOverride(usage) {
    try {
      await s.clearOverride(usage);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doSetIndexability(visibility) {
    try {
      await s.setIndexability(visibility);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doRegeneratePoster(row) {
    try {
      await s.regeneratePoster(row);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doUploadCaptions(row, vttText) {
    try {
      await s.uploadCaptions(row, vttText);
      toast.success(t("mediaSeo.toast.saved"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doChangeWatchSlug(row, slug) {
    try {
      await s.changeWatchSlug(row, slug);
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

  function gscoreClass(v) {
    return scoreClass(v).replace("ms__score", "ms__gscore");
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
    [
      "missing_title",
      "missing_caption",
      "missing_license",
      "poor_filename",
      "suspicious_alt",
    ].reduce((acc, k) => acc + Number(s.summary.value?.[k] || 0), 0)
  );

  // ── Başlık üç nokta menüsü (ikincil eylemler) ─────────────────────
  const menuOpen = ref(false);
  function menuRun(fn) {
    menuOpen.value = false;
    fn();
  }
  function closeHeadMenu(event) {
    if (!event.target.closest?.(".ms__menu")) menuOpen.value = false;
  }
  watch(menuOpen, (open) => {
    if (open) document.addEventListener("click", closeHeadMenu);
    else document.removeEventListener("click", closeHeadMenu);
  });
  onUnmounted(() => document.removeEventListener("click", closeHeadMenu));

  // ── Kahraman kart: hazırlık halkası (Medya sayfasıyla aynı dil) ───
  const readyPct = computed(() =>
    s.total.value ? Math.round((withAltCount.value / s.total.value) * 100) : 0
  );
  const RING_C = 2 * Math.PI * 38;
  const ringDash = computed(() => `${(readyPct.value / 100) * RING_C} ${RING_C}`);

  function pctOf(part, whole) {
    return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  }

  const pipelinePct = computed(() => {
    const ps = s.pipelineStatus.value;
    return ps ? pctOf(ps.ready || 0, ps.total || 0) : 0;
  });

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
          <button
            type="button"
            class="hdr-btn-danger"
            :disabled="!!s.acting.value"
            @click="doBackfillAlt"
          >
            {{ t("mediaSeo.action.backfillAltConfirm") }}
          </button>
          <button type="button" class="hdr-btn-outlined" @click="confirming = ''">
            {{ t("common.cancel") }}
          </button>
        </template>
        <template v-else-if="confirming === 'loc'">
          <button
            type="button"
            class="hdr-btn-danger"
            :disabled="!!s.acting.value"
            @click="doBackfillLocalization"
          >
            {{ t("mediaSeo.action.backfillLocalizationConfirm") }}
          </button>
          <button type="button" class="hdr-btn-outlined" @click="confirming = ''">
            {{ t("common.cancel") }}
          </button>
        </template>
        <!-- İkincil eylemler üç noktada: başlık kalabalığı tek + menüye iner. -->
        <div v-else class="ms__menu" @keydown.escape="menuOpen = false">
          <button
            type="button"
            class="ms__menu-btn"
            :aria-label="t('mediaSeo.moreAria')"
            :aria-expanded="menuOpen"
            @click.stop="menuOpen = !menuOpen"
          >
            <AppIcon name="more-vertical" :size="15" />
          </button>
          <ul v-if="menuOpen" class="ms__menu-list" role="menu" @click.stop>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class="ms__menu-item"
                :disabled="!!s.acting.value"
                @click="menuRun(() => (confirming = 'alt'))"
              >
                <AppIcon name="wand-sparkles" :size="14" />
                {{ t("mediaSeo.action.backfillAlt") }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class="ms__menu-item"
                :disabled="!!s.acting.value"
                @click="menuRun(() => (confirming = 'loc'))"
              >
                <AppIcon name="languages" :size="14" />
                {{ t("mediaSeo.action.backfillLocalization") }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class="ms__menu-item"
                :disabled="!!s.acting.value"
                @click="menuRun(doBackfillDim)"
              >
                <AppIcon name="ruler" :size="14" />
                {{ t("mediaSeo.action.backfillDimensions") }}
              </button>
            </li>
          </ul>
        </div>
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

    <!-- ── Kahraman + beyaz kartlar: Medya sayfasıyla aynı aile dili ── -->
    <div class="ms__hero-wrap">
      <div class="ms__hero">
        <svg
          class="ms__hero-ring"
          viewBox="0 0 92 92"
          role="img"
          :aria-label="`${t('mediaSeo.hero.label')}: %${readyPct}`"
        >
          <circle class="ms__hero-ring-track" cx="46" cy="46" r="38" />
          <circle
            class="ms__hero-ring-val"
            cx="46"
            cy="46"
            r="38"
            :stroke-dasharray="ringDash"
            transform="rotate(-90 46 46)"
          />
          <text class="ms__hero-ring-num" x="46" y="52">%{{ readyPct }}</text>
        </svg>
        <div class="ms__hero-body">
          <span class="ms__k-label">{{ t("mediaSeo.hero.label") }}</span>
          <strong>{{ withAltCount }}</strong>
          <small>{{ t("mediaSeo.hero.note", { total: s.total.value }) }}</small>
        </div>
      </div>

      <div class="ms__wcards">
        <div class="ms__wcard">
          <span class="ms__k-label">{{ t("mediaSeo.stat.scanned") }}</span>
          <strong>{{ s.total.value }}</strong>
          <small>{{ t("mediaSeo.stat.scannedNote") }}</small>
          <div class="ms__meter"><i class="ms__meter-fill--brand" style="width: 100%" /></div>
        </div>
        <div class="ms__wcard">
          <span class="ms__k-label">{{ t("mediaSeo.stat.errors") }}</span>
          <strong class="ms__n-danger">{{ errorCount }}</strong>
          <button
            v-if="errorCount"
            type="button"
            class="ms__quiet"
            @click="s.setFilter('missing_alt')"
          >
            {{ t("mediaSeo.stat.showMissingAlt") }} →
          </button>
          <small v-else>{{ t("mediaSeo.stat.errorsNote") }}</small>
          <div class="ms__meter">
            <i
              class="ms__meter-fill--danger"
              :style="{ width: `${pctOf(errorCount, s.total.value)}%` }"
            />
          </div>
        </div>
        <div class="ms__wcard">
          <span class="ms__k-label">{{ t("mediaSeo.stat.warnings") }}</span>
          <strong class="ms__n-warn">{{ warnCount }}</strong>
          <small>{{ t("mediaSeo.stat.warningsNote") }}</small>
          <div class="ms__meter">
            <i
              class="ms__meter-fill--warn"
              :style="{ width: `${pctOf(warnCount, s.total.value)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Görsel türev hattı — belirgin metre + gerçek eylem düğmesi ── -->
    <div v-if="s.pipelineStatus.value" class="ms__pipeline">
      <div class="ms__pipeline-top">
        <span class="ms__k-label">{{ t("mediaSeo.pipeline.title") }}</span>
        <span class="ms__pipeline-nums">
          {{ s.pipelineStatus.value.ready }} / {{ s.pipelineStatus.value.total }}
        </span>
      </div>
      <div class="ms__pipeline-bar">
        <i :style="{ width: `${pipelinePct}%` }" />
      </div>
      <div class="ms__pipeline-foot">
        <span class="ms__chip">
          {{ t("mediaSeo.pipeline.missingChip", { n: s.pipelineStatus.value.missing }) }}
        </span>
        <span class="ms__chip ms__chip--good">
          {{ t("mediaSeo.pipeline.queueChip", { n: s.pipelineStatus.value.queue_depth }) }}
        </span>
        <span class="ms__chip" :class="s.pipelineStatus.value.failed ? 'ms__chip--danger' : ''">
          {{ t("mediaSeo.pipeline.failedChip", { n: s.pipelineStatus.value.failed }) }}
        </span>
        <button
          v-if="s.pipelineStatus.value.failed"
          class="hdr-btn-outlined ms__pipeline-btn"
          :disabled="!!s.acting.value"
          @click="doRetryRenditions"
        >
          {{ t("mediaSeo.action.retryFailed") }}
        </button>
        <button
          class="hdr-btn-outlined ms__pipeline-btn"
          :disabled="!!s.acting.value || !s.pipelineStatus.value.missing"
          @click="doRenditionBackfill"
        >
          {{ t("mediaSeo.action.buildRenditions") }}
        </button>
      </div>
    </div>

    <MediaSeoScorecard :score="s.score.value" :total="s.total.value" />

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
        <!-- Yoğun denetim satırı: küçük resim türevden, ham yol tooltip'te,
             satıra tıklamak düzenleme çekmecesini açar (ayrı Düzenle linki
             bu yüzden kalktı); "Metin üret" imleçli cihazda hover'da belirir. -->
        <tr
          v-for="row in s.visibleItems.value"
          :key="row.file_url"
          class="ms__row"
          :class="{ 'ms__row--selected': s.selected.value?.file_url === row.file_url }"
          @click="s.select(row)"
        >
          <td>
            <div class="ms__fcell" :title="row.file_url">
              <img
                v-if="row.thumb_url || canRenderThumb(row.file_url)"
                class="ms__fthumb"
                :src="row.thumb_url || row.file_url"
                :alt="row.file_name"
                loading="lazy"
                decoding="async"
              />
              <span v-else class="ms__fthumb ms__fthumb--ph">{{ extOf(row) }}</span>
              <span class="ms__file">{{ row.file_name || "—" }}</span>
            </div>
          </td>
          <td>
            <span
              class="ms__alt"
              :class="{ 'ms__alt--none': !row.alt }"
              :title="
                row.alt_source
                  ? `${row.alt || ''} · ${t(`mediaSeo.source.${row.alt_source}`)}`
                  : row.alt || ''
              "
            >
              {{ altOf(row) }}
            </span>
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
              class="ms__genbtn"
              :disabled="s.acting.value === row.file_url"
              @click="doGenerate(row)"
            >
              {{ t("mediaSeo.action.generate") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ── Izgara: çerçeve halkalı mozaik — aciliyet karoyu 2px halkayla
         sarar, fotoğrafın üstüne yalnız skor rozeti biner; ad ve alt metni
         tooltip + tıklanınca açılan çekmecede. ── -->
    <div v-else-if="effectiveMode === 'grid'" class="ms__grid">
      <button
        v-for="row in s.visibleItems.value"
        :key="row.file_url"
        type="button"
        class="ms__gtile"
        :title="`${row.file_name || row.file_url} — ${altOf(row)}`"
        @click="s.select(row)"
      >
        <img
          v-if="row.thumb_url || canRenderThumb(row.file_url)"
          class="ms__gimg"
          :src="row.thumb_url || row.file_url"
          :alt="row.file_name"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="ms__gph">{{ extOf(row) }}</span>
        <span class="ms__gscore" :class="gscoreClass(row.score?.overall)">
          {{ row.score?.overall ?? "—" }}
        </span>
        <span class="ms__gstrip">{{ row.file_name || "—" }}</span>
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
        <span class="ms__score" :class="scoreClass(row.score?.overall)">{{
          row.score?.overall ?? "—"
        }}</span>
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
              <span class="ms__score" :class="scoreClass(row.score?.overall)">{{
                row.score?.overall ?? "—"
              }}</span>
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
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a2a35]"
            >
              <div class="flex items-center gap-2">
                <AppIcon name="filter" :size="16" class="text-brand-800" />
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                  t("mediaSeo.filter.title")
                }}</span>
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
                <label
                  class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300"
                  >{{ g.label }}</label
                >
                <div class="flex flex-col gap-1.5">
                  <label
                    v-for="opt in g.options"
                    :key="String(opt.id)"
                    class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="radio"
                      :name="`ms-f-${g.id}`"
                      :checked="g.value === opt.id"
                      @change="g.set(opt.id)"
                    />
                    <span v-if="opt.dot" class="ms__dot" :class="`ms__dot--${opt.dot}`" />
                    {{ opt.label }}
                    <span v-if="opt.count !== undefined" class="ms__optcount">{{ opt.count }}</span>
                  </label>
                </div>
              </div>

              <div class="mb-5">
                <label
                  class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                >
                  <input
                    v-model="s.deep.value"
                    type="checkbox"
                    @change="s.load({ refresh: true })"
                  />
                  {{ t("mediaSeo.deep") }}
                </label>
                <p class="mt-1 text-[12px] text-gray-400 dark:text-gray-500">
                  {{ t("mediaSeo.deepHint") }}
                </p>
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
      :acting="s.acting.value"
      @close="s.closeDrawer()"
      @generate="doGenerate"
      @save="doSave"
      @save-override="doSaveOverride"
      @clear-override="doClearOverride"
      @set-indexability="doSetIndexability"
      @regenerate-poster="doRegeneratePoster"
      @upload-captions="doUploadCaptions"
      @change-watch-slug="doChangeWatchSlug"
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

  // ── Görsel türev hattı — belirgin metre + eylem düğmesi ──────────
  .ms__pipeline {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-4;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .ms__pipeline-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .ms__pipeline-nums {
    @include media.text("sm");
    font-weight: 700;
    @include media.numeric;
    @include media.muted(1);
  }

  .ms__pipeline-bar {
    height: 10px;
    border-radius: 999px;
    background: $l-bg-muted;
    overflow: hidden;

    @include dark {
      background: $d-bg;
    }

    i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: $c-success;
      transition: width $t-base;
    }
  }

  .ms__pipeline-foot {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .ms__pipeline-btn {
    margin-inline-start: auto;

    & + & {
      margin-inline-start: 0;
    }
  }

  .ms__chip {
    @include media.chip("neutral");
    @include media.numeric;
  }

  .ms__chip--good {
    @include media.chip("success");
  }

  .ms__chip--danger {
    @include media.chip("danger");
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
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: media.$s-2;
  }

  // Halkalı karo: kutu gölgesi halka olarak dışta durur, `overflow: hidden`
  // yalnız görseli kırpar. Görsel MUTLAK konumda — aspect-ratio'lu kutuda
  // akış içi img döngüsel hesap tuzağına düşüyor (bkz. mo__mcard-tile ölçümü).
  // Medya mozaiğiyle birebir aynı sade gövde: nötr ince çerçeve, hover'da
  // hafif gölge. Aciliyet karoyu boyamaz — skor rozetinin rengi söyler
  // (her dosyada bulgu varken halka her karoyu boyayıp gürültüye dönüyordu).
  .ms__gtile {
    position: relative;
    aspect-ratio: 1;
    padding: 0;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    overflow: hidden;
    background: $l-bg;
    cursor: pointer;
    transition: box-shadow $t-fast;
    @include media.focus-ring;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }

    @include media.hoverable {
      &:hover {
        box-shadow: 0 6px 18px rgb(29 28 25 / 12%);
      }
    }
  }

  .ms__gimg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ms__gph {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    @include media.numeric;
    @include media.muted(2);
  }

  // Skor rozeti: sabit köşe + zemin renkli kontur — her fotoğrafta okunur.
  .ms__gscore {
    position: absolute;
    bottom: 7px;
    inset-inline-end: 7px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border: 1.5px solid rgb(255 255 255 / 95%);
    border-radius: 50%;
    font-size: 11px;
    font-weight: 800;
    @include media.numeric;
    background: $l-bg;
    color: $l-text-600;
    box-shadow: 0 1px 4px rgb(0 0 0 / 22%);

    &--good {
      background: $c-success;
      color: #fff;
    }

    &--mid {
      background: $brand;
      color: #3d2f00;
    }

    &--bad {
      background: $c-error-strong;
      color: #fff;
    }
  }

  // Ad şeridi: imleçli cihazda hover'da, dokunmatikte kalıcı.
  .ms__gstrip {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 1;
    padding: 1.1rem media.$s-2 media.$s-05;
    background: linear-gradient(transparent, rgb(20 18 14 / 74%));
    color: #fff;
    @include media.text("xs");
    font-weight: 600;
    text-align: start;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include media.hoverable {
      opacity: 0;
      transition: opacity $t-fast;

      .ms__gtile:hover & {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
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

  // ── Kahraman + beyaz kartlar (Medya sayfasıyla aynı aile dili) ───
  .ms__hero-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: media.$s-2;

    @media (min-width: 1024px) {
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    }
  }

  .ms__hero {
    position: relative;
    display: flex;
    align-items: center;
    gap: media.$s-4;
    min-width: 0;
    padding: media.$s-3 media.$s-4;
    border: 1px solid transparent;
    border-radius: media.$r-lg;
    overflow: hidden;
    background: $l-text-900;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }

    &::after {
      content: "";
      position: absolute;
      inset-inline-end: -30px;
      bottom: -60px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgb(245 184 0 / 22%), transparent 70%);
      pointer-events: none;
    }
  }

  .ms__hero-ring {
    flex: none;
    width: 76px;
    height: 76px;
  }

  .ms__hero-ring-track {
    fill: none;
    stroke: rgb(255 255 255 / 14%);
    stroke-width: 8;
  }

  .ms__hero-ring-val {
    fill: none;
    stroke: $brand;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 0.6s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .ms__hero-ring-num {
    fill: #fff;
    font-size: 17px;
    font-weight: 700;
    text-anchor: middle;
    @include media.numeric;
  }

  .ms__hero-body {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;

    strong {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      @include media.numeric;
    }

    small {
      @include media.text("xs");
      color: rgb(255 255 255 / 62%);
    }

    .ms__k-label {
      color: rgb(255 255 255 / 62%);
    }
  }

  .ms__k-label {
    @include media.text("xs");
    @include media.muted(1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .ms__wcards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .ms__wcard {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-lg;
    @include media.surface("raised");

    strong {
      @include media.text("display");
      font-weight: 700;
      @include media.numeric;
    }

    small {
      @include media.text("xs");
      @include media.muted(2);
    }
  }

  .ms__n-danger {
    color: $c-error;
  }

  .ms__n-warn {
    color: $c-warning-text;

    @include dark {
      color: $c-warning;
    }
  }

  .ms__quiet {
    width: fit-content;
    border: 0;
    padding: 0;
    background: none;
    color: $brand-text;
    font-weight: 700;
    cursor: pointer;
    @include media.text("xs");

    @include dark {
      color: $brand-light;
    }

    &:hover {
      text-decoration: underline;
    }
  }

  .ms__meter {
    height: 4px;
    margin-top: media.$s-1;
    border-radius: 999px;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg;
    }

    i {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
  }

  .ms__meter-fill--brand {
    background: $brand;
  }

  .ms__meter-fill--danger {
    background: $c-error;
  }

  .ms__meter-fill--warn {
    background: $c-warning;
  }

  // ── Başlık üç nokta menüsü ───────────────────────────────────────
  .ms__menu {
    position: relative;
  }

  .ms__menu-btn {
    display: grid;
    place-items: center;
    width: 2.125rem;
    height: 2.125rem;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: $l-bg;
    color: $l-text-500;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }

    @include media.hoverable {
      &:hover {
        background: $l-bg-subtle;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  .ms__menu-list {
    position: absolute;
    top: calc(100% + 0.25rem);
    inset-inline-end: 0;
    z-index: 30;
    min-width: 11rem;
    width: max-content;
    margin: 0;
    padding: media.$s-1;
    list-style: none;
    box-shadow: 0 10px 30px rgb(26 26 26 / 14%);
    @include media.surface("raised");
  }

  .ms__menu-item {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    min-height: 2.125rem;
    border: 0;
    border-radius: media.$r-sm;
    padding: 0 media.$s-2;
    background: none;
    font: inherit;
    @include media.text("sm");
    font-weight: 600;
    color: $l-text-700;
    text-align: start;
    white-space: nowrap;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      color: $d-text;
    }

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

  // Yoğun denetim tablosu: 2 000 bulguluk temizlik seansı için dar satır.
  .ms__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: 0.35rem media.$s-2;
      text-align: start;
      border-bottom: 1px solid $l-border;
      vertical-align: middle;
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
      background: rgba($brand, 0.1);
    }
    @include dark {
      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .ms__fcell {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;
  }

  .ms__fthumb {
    width: 26px;
    height: 26px;
    flex: none;
    border-radius: media.$r-sm;
    object-fit: cover;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }

    &--ph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed $l-border;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.04em;
      @include media.muted(2);

      @include dark {
        border-color: $d-border;
      }
    }
  }

  .ms__file {
    font-weight: 600;
    max-width: 20rem;
    @include media.truncate;
  }

  .ms__alt {
    display: block;
    max-width: 22rem;
    @include media.truncate;
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
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-weight: 800;
    @include media.text("xs");
    @include media.numeric;
    background: $l-bg-muted;
    color: $l-text-600;

    &--good {
      background: media.$tint-success;
      color: $c-success-text;
    }
    &--mid {
      background: media.$tint-warning;
      color: $c-warning-text;
    }
    &--bad {
      background: media.$tint-danger;
      color: $c-error-text;
    }

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;

      &--good {
        background: media.$tint-success;
        color: $c-success;
      }
      &--mid {
        background: media.$tint-warning;
        color: $c-warning;
      }
      &--bad {
        background: media.$tint-danger;
        color: $c-error;
      }
    }
  }

  .ms__col-actions {
    text-align: end;
    white-space: nowrap;
  }

  .ms__genbtn {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    padding: 0.25rem media.$s-2;
    background: $l-bg;
    color: $brand-text;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    @include media.text("xs");
    @include media.focus-ring;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $brand-light;
    }

    // İmleçli cihazda okuma modunu sessiz tut: düğme yalnız satır hover'ında.
    @include media.hoverable {
      opacity: 0;
      transition: opacity $t-fast;

      .ms__row:hover &,
      &:focus-visible {
        opacity: 1;
      }

      &:hover:not(:disabled) {
        border-color: $brand;
        background: rgba($brand, 0.1);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>

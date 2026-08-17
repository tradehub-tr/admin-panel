<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatDay } from "@/utils/dateFormat";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import MediaRecordDialog from "@/components/media/MediaRecordDialog.vue";
  import MediaUsageDialog from "@/components/media/MediaUsageDialog.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useMediaOptimize } from "@/composables/useMediaOptimize";

  const { t, locale } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const m = useMediaOptimize();

  const selected = ref(new Set());
  const filtersOpen = ref(false);
  const confirmOpen = ref(false);
  const pendingAction = ref(null);
  const restoreTarget = ref(null);
  const deleteTarget = ref(null);
  const affectedCount = ref(0);
  const busy = ref(false);
  const recordOpen = ref(false);
  const recordTarget = ref(null);
  const usageOpen = ref(false);
  const usageItem = ref(null);

  /** Kullanım penceresinden gelen ters arama isteği. */
  function openRecord(target) {
    recordTarget.value = target;
    recordOpen.value = true;
  }

  function openUsage(item) {
    usageItem.value = item;
    usageOpen.value = true;
  }

  // Denetim artık ayrı bir sayfa: popup yerine tam ekran, filtreli ve 4 görünümlü.
  // `file` sorgusu verilirse sayfa o dosyanın geçmişiyle açılır.
  function openAudit(fileUrl = "") {
    router.push({ path: "/media-audit", query: fileUrl ? { file: fileUrl } : {} });
  }

  // Masaüstünde dört mod; telefonda seçici hiç render edilmez ve mod zorla
  // "list" olur. 1024px sınırı: altında kabuk 280px yediği için ızgara/tablo
  // sığmıyor (MediaLibraryView'da ölçülmüş aynı sınır).
  const VIEW_MODES = ["table", "grid", "list", "kanban"];
  const { isXl: isDesktop } = useBreakpoint();
  const { viewMode } = useListViewMode("media-optimize-view", "list");
  const effectiveMode = computed(() => (isDesktop.value ? viewMode.value : "list"));

  // Kanban sütunları: dosyanın işlem karşısındaki durumu — bu ekranda verilen karar.
  const KANBAN_COLS = [
    { id: "ready", label: "kanbanReady" },
    { id: "optimized", label: "kanbanOptimized" },
    { id: "blocked", label: "kanbanBlocked" },
  ];


  // ── İş durumu ──────────────────────────────────────────────────────
  const running = computed(() => m.job.state === "running");
  const isRestore = computed(() => m.job.mode === "restore");
  const percent = computed(() =>
    m.job.total ? Math.round((m.job.processed / m.job.total) * 100) : 0
  );
  const jobSaved = computed(() => m.job.original_bytes - m.job.new_bytes);
  const projected = computed(() => Math.max(0, m.summary.total_bytes - jobSaved.value));

  // Başlık işin GERÇEK durumunu söylemeli; sabit "çalışıyor" yazarsa biten iş
  // asılı kalmış gibi görünüyor.
  const jobTitle = computed(() => {
    const s = m.job.state;
    if (s === "running") {
      if (isRestore.value) return t("mediaOptimize.job.restoreTitle");
      return m.job.dry_run ? t("mediaOptimize.job.dryTitle") : t("mediaOptimize.job.title");
    }
    if (s === "partial") return t("mediaOptimize.job.partial");
    if (s === "error" || s === "not_found") return t("mediaOptimize.job.failed");
    if (isRestore.value) return t("mediaOptimize.job.restoreDone");
    return m.job.dry_run ? t("mediaOptimize.job.dryDone") : t("mediaOptimize.job.done");
  });

  const nothingDone = computed(
    () =>
      !running.value && m.job.key && !isRestore.value && m.job.optimized === 0 && m.job.skipped > 0
  );

  // ── Biçimleme ──────────────────────────────────────────────────────


  // Üç sayı birbirini doğrulasın: kazanç = önceki − şimdiki; arşiv silinene
  // kadar net disk = şimdiki + arşiv.
  const sizeBefore = computed(() => m.summary.total_bytes + m.summary.saved_bytes);
  const netDisk = computed(() => m.summary.total_bytes + m.summary.archive_bytes);

  // ── Küçük resim politikası ─────────────────────────────────────────
  // Ayrı thumbnail üretilmiyor; küçük resim ORİJİNAL dosyayı çekiyor. Liste
  // boyuta göre azalan sıralı olduğundan ilk sayfa en büyük dosyalar: hepsini
  // yüklemek 238 MB indirmek demekti (ölçüldü). Küçük ve render edilebilir
  // olanlar otomatik yüklenir, kalanı tıklayınca gelir.
  const THUMB_MAX_BYTES = 400 * 1024;
  const forced = ref(new Set());

  function previewUrl(item) {
    // Dosyanın üstüne yazıldığı için file_url değişmiyor; ?v olmadan tarayıcı
    // eski büyük görseli cache'ten gösterir.
    const stamp = item.optimized_at || item.creation || "";
    return `${item.file_url}?v=${encodeURIComponent(stamp)}`;
  }

  function canThumb(item) {
    if (forced.value.has(item.name)) return true;
    if (!canRenderThumb(item.file_name)) return false;
    return (item.file_size || 0) <= THUMB_MAX_BYTES;
  }

  function forceLoad(item) {
    const next = new Set(forced.value);
    next.add(item.name);
    forced.value = next;
  }

  function extOf(item) {
    const x = /\.([a-z0-9]+)$/i.exec(item.file_name || "");
    return x ? x[1].toUpperCase() : "?";
  }

  // ── Seçim ──────────────────────────────────────────────────────────
  // Backend kapılarının istemcide bilinebilen ikisi: format ve boyut. Bunlara
  // takılacak dosya seçtirilmez. `already_small` çözünürlük gerektirdiği için
  // yalnız sunucuda bilinir.
  const OPTIMIZABLE_RE = /\.(jpe?g|png|webp|tiff?)$/i;
  const MIN_FILE_BYTES = 200 * 1024;

  function canOptimize(item) {
    if (item.state !== "pending") return false;
    if (!OPTIMIZABLE_RE.test(item.file_name || "")) return false;
    return (item.file_size || 0) >= MIN_FILE_BYTES;
  }

  function columnOf(item) {
    if (item.state === "optimized") return "optimized";
    return canOptimize(item) ? "ready" : "blocked";
  }

  const kanbanGroups = computed(() =>
    KANBAN_COLS.map((c) => ({ ...c, items: m.items.value.filter((i) => columnOf(i) === c.id) }))
  );

  // Her satır seçilebilir. Seçim "optimize edilebilirlik" demek değil: bir TIFF
  // optimize edilemez ama çöpe taşınabilir. Butonlar hangi seçimin kendilerine
  // uygun olduğunu ayrıca sayıyor (selectedOptimizable / selectedTrashable).
  function toggleAll() {
    const all = m.items.value.map((i) => i.name);
    selected.value = all.every((n) => selected.value.has(n)) ? new Set() : new Set(all);
  }

  function fmtDate(v) {
    return formatDay(v, locale.value);
  }

  const SORT_COLS = ["name", "size", "saved", "usage", "state", "date"];
  const SORT_DEFAULT_DIR = {
    size: "desc",
    date: "desc",
    name: "asc",
    saved: "desc",
    state: "desc",
    usage: "desc",
  };

  async function sortBy(col) {
    if (m.sortBy.value === col) {
      m.sortDir.value = m.sortDir.value === "desc" ? "asc" : "desc";
    } else {
      m.sortBy.value = col;
      m.sortDir.value = SORT_DEFAULT_DIR[col] || "desc";
    }
    await applyFilters();
  }

  function sortIcon(col) {
    if (m.sortBy.value !== col) return null;
    return m.sortDir.value === "desc" ? "arrow-down" : "arrow-up";
  }

  function skipHint(item) {
    if (item.state === "optimized") return t("mediaOptimize.skip.already_optimized");
    if (!OPTIMIZABLE_RE.test(item.file_name || ""))
      return t("mediaOptimize.skip.unsupported_format");
    if ((item.file_size || 0) < MIN_FILE_BYTES) return t("mediaOptimize.skip.too_small");
    return "";
  }

  // Rozet metni KISA olmalı: "Desteklenmeyen format" kartı taşırıyordu.
  // Uzun açıklama title'a, rozete tek kelime.
  function stateLabel(item) {
    if (item.state === "optimized") return t("mediaOptimize.filter.optimized");
    if (canOptimize(item)) return t("mediaOptimize.filter.pending");
    if (!OPTIMIZABLE_RE.test(item.file_name || "")) return t("mediaOptimize.badge.unsupported");
    return t("mediaOptimize.badge.tooSmall");
  }

  function stateClass(item) {
    if (item.state === "optimized") return "mo__badge--optimized";
    return canOptimize(item) ? "mo__badge--pending" : "mo__badge--skip";
  }

  function toggle(name) {
    const next = new Set(selected.value);
    next.has(name) ? next.delete(name) : next.add(name);
    selected.value = next;
  }


  const byName = computed(() => Object.fromEntries(m.items.value.map((i) => [i.name, i])));
  const selectedOptimizable = computed(
    () => [...selected.value].filter((n) => byName.value[n] && canOptimize(byName.value[n])).length
  );
  const isTrashView = computed(() => m.state.value === "trashed");
  const selectedUrls = computed(() =>
    [...selected.value].map((n) => byName.value[n]?.file_url).filter(Boolean)
  );
  // Çöpe yalnız hiçbir yerde kullanılmayanlar taşınabilir; sunucu da ayrıca
  // kontrol ediyor ama butonu boşuna aktif göstermeyelim.
  // Artık her seçim çöpe taşınabilir; kullanımdakiler için onay ekranı ayrı
  // uyarı gösteriyor ve istek `force` ile gidiyor.
  const selectedTrashable = computed(() => selected.value.size);
  const trashPreview = ref(null);

  const selectedOptimized = computed(
    () => [...selected.value].filter((n) => byName.value[n]?.state === "optimized").length
  );

  // Aynı dosyaya birden fazla File kaydı düşmesinin iki sebebi var ve anlamları
  // zıt: "8 üründe kullanılıyor" ile "8 kez yüklenmiş" aynı şey değil.
  function usageLabel(item) {
    if (item.usage_kind === "multi_use") {
      const key = item.usage_doctype === "Listing" ? "usedInProducts" : "usedInRecords";
      return t(`mediaOptimize.usage.${key}`, { n: item.usage_count });
    }
    if (item.usage_kind === "repeat") {
      return t("mediaOptimize.usage.repeated", { n: item.record_count });
    }
    return "";
  }

  // ── Filtreler ──────────────────────────────────────────────────────
  async function applyFilters() {
    m.page.value = 1;
    await m.load();
  }

  const MIN_SIZE_OPTIONS = [
    { id: 0, label: "minAll" },
    { id: 512 * 1024, label: "min512k" },
    { id: 1024 * 1024, label: "min1m" },
    { id: 5 * 1024 * 1024, label: "min5m" },
  ];

  function setFilter(key, value) {
    m[key].value = value;
    applyFilters();
  }

  // Rayın beklediği şekil: { id, label, value, options[], set() }.
  const filterGroups = computed(() => [
    {
      id: "state",
      label: t("mediaOptimize.col.state"),
      value: m.state.value,
      set: (v) => setFilter("state", v),
      options: [
        { id: "", label: t("mediaOptimize.filter.all") },
        { id: "pending", label: t("mediaOptimize.filter.pending"), dot: "warn" },
        { id: "optimized", label: t("mediaOptimize.filter.optimized"), dot: "ok" },
        { id: "trashed", label: t("mediaOptimize.filter.trashed"), dot: "danger" },
      ],
    },
    {
      id: "size",
      label: t("mediaOptimize.col.size"),
      value: m.minBytes.value,
      set: (v) => setFilter("minBytes", v),
      options: MIN_SIZE_OPTIONS.map((o) => ({
        id: o.id,
        label: t(`mediaOptimize.filter.${o.label}`),
      })),
    },
    {
      id: "sort",
      label: t("mediaOptimize.sort.label"),
      value: `${m.sortBy.value}:${m.sortDir.value}`,
      set: (v) => {
        const [by, dir] = v.split(":");
        m.sortBy.value = by;
        m.sortDir.value = dir;
        applyFilters();
      },
      options: [
        { id: "size:desc", label: t("mediaOptimize.sort.sizeDesc") },
        { id: "size:asc", label: t("mediaOptimize.sort.sizeAsc") },
        { id: "saved:desc", label: t("mediaOptimize.sort.savedDesc") },
        { id: "date:desc", label: t("mediaOptimize.sort.dateDesc") },
        { id: "name:asc", label: t("mediaOptimize.sort.nameAsc") },
        { id: "usage:desc", label: t("mediaOptimize.sort.usageDesc") },
      ],
    },
    {
      id: "usageState",
      label: t("mediaOptimize.usageState.label"),
      value: m.usageState.value,
      set: (v) => setFilter("usageState", v),
      options: [
        { id: "", label: t("mediaOptimize.usageState.all") },
        { id: "in_use", label: t("mediaOptimize.usageState.in_use"), dot: "ok" },
        { id: "order_only", label: t("mediaOptimize.usageState.order_only"), dot: "warn" },
        { id: "history_only", label: t("mediaOptimize.usageState.history_only"), dot: "warn" },
        { id: "unused", label: t("mediaOptimize.usageState.unused"), dot: "danger" },
      ],
    },
    {
      id: "usage",
      label: t("mediaOptimize.col.usage"),
      value: m.usage.value,
      set: (v) => setFilter("usage", v),
      options: [
        { id: "", label: t("mediaOptimize.usage.filterAll") },
        { id: "multi_use", label: t("mediaOptimize.usage.filterMulti") },
        { id: "repeat", label: t("mediaOptimize.usage.filterRepeat") },
      ],
    },
  ]);


  const chips = computed(() => {
    const out = [];
    if (m.search.value) out.push({ key: "search", label: `"${m.search.value}"` });
    if (m.state.value)
      out.push({ key: "state", label: t(`mediaOptimize.filter.${m.state.value}`) });
    if (m.minBytes.value) {
      const o = MIN_SIZE_OPTIONS.find((x) => x.id === m.minBytes.value);
      if (o) out.push({ key: "minBytes", label: t(`mediaOptimize.filter.${o.label}`) });
    }
    if (m.usage.value)
      out.push({
        key: "usage",
        label: t(
          m.usage.value === "multi_use"
            ? "mediaOptimize.usage.filterMulti"
            : "mediaOptimize.usage.filterRepeat"
        ),
      });
    if (m.usageState.value)
      out.push({ key: "usageState", label: t(`mediaOptimize.usageState.${m.usageState.value}`) });
    if (m.onlyOptimizable.value)
      out.push({ key: "onlyOptimizable", label: t("mediaOptimize.filter.onlyOptimizable") });
    return out;
  });

  const activeFilterCount = computed(() => chips.value.length);

  function clearChip(key) {
    if (key === "all") {
      m.search.value = "";
      m.state.value = "";
      m.minBytes.value = 0;
      m.usage.value = "";
      m.onlyOptimizable.value = false;
    } else if (key === "minBytes") {
      m.minBytes.value = 0;
    } else if (key === "onlyOptimizable") {
      m.onlyOptimizable.value = false;
    } else {
      m[key].value = "";
    }
    applyFilters();
  }



  // ── Aksiyonlar ─────────────────────────────────────────────────────
  async function ask(action) {
    pendingAction.value = action;
    if (action === "all") affectedCount.value = await m.pendingCount();
    if (action === "trash") trashPreview.value = await m.previewTrash(selectedUrls.value);
    if (action === "restoreAll") affectedCount.value = await m.restorableCount();
    confirmOpen.value = true;
  }

  // Tahmin: seçim varsa onu ölçer, yoksa filtredeki bekleyenlerin tamamını.
  async function estimate() {
    if (selected.value.size) {
      await m.start({ fileNames: [...selected.value], scope: "selected", dryRun: true });
      return;
    }
    await m.start({ scope: "pending", dryRun: true });
  }

  // Yıkıcı eylemlerde kırmızı ton — SellerListingsView'daki `tone: "danger"`.
  const DANGER_ACTIONS = new Set(["trash", "deleteOne", "deleteTrashed", "purgeTrash", "purge"]);
  const confirmTone = computed(() => (DANGER_ACTIONS.has(pendingAction.value) ? "danger" : "warning"));

  // Başlık sabit "Optimizasyonu onayla" idi; silme onayında da o yazıyordu ve
  // kullanıcı ne onayladığını başlıktan anlayamıyordu.
  const DELETE_ACTIONS = new Set(["deleteOne", "deleteTrashed", "purgeTrash", "purge"]);
  const confirmTitle = computed(() => {
    const a = pendingAction.value;
    if (DELETE_ACTIONS.has(a)) return t("mediaOptimize.confirm.titleDelete");
    if (a === "trash") return t("mediaOptimize.confirm.titleTrash");
    if (a === "untrash" || a === "restore" || a === "restoreSelected" || a === "restoreAll")
      return t("mediaOptimize.confirm.titleRestore");
    return t("mediaOptimize.confirm.title");
  });

  async function onConfirm() {
    confirmOpen.value = false;
    const action = pendingAction.value;
    pendingAction.value = null;
    busy.value = true;
    try {
      await runAction(action);
    } finally {
      busy.value = false;
    }
  }

  async function runAction(action) {
    if (action === "selected") {
      await m.start({ fileNames: [...selected.value], scope: "selected" });
      selected.value = new Set();
    } else if (action === "pilot") {
      await m.start({ scope: "pending", limit: 20 });
    } else if (action === "all") {
      await m.start({ scope: "pending" });
    } else if (action === "restore") {
      await m.restore(restoreTarget.value);
      restoreTarget.value = null;
    } else if (action === "restoreSelected") {
      const names = [...selected.value].filter((n) => byName.value[n]?.state === "optimized");
      await m.startRestore({ fileNames: names, scope: "selected" });
      selected.value = new Set();
    } else if (action === "restoreAll") {
      await m.startRestore({ scope: "optimized" });
      selected.value = new Set();
    } else if (action === "trash") {
      // `force`: seçimde kullanımda olan varsa kullanıcı uyarıyı görüp onayladı.
      await m.trashFiles(selectedUrls.value, (trashPreview.value?.in_use || 0) > 0);
      selected.value = new Set();
      trashPreview.value = null;
    } else if (action === "untrash") {
      await m.restoreFromTrash(selectedUrls.value);
      selected.value = new Set();
    } else if (action === "deleteOne") {
      await m.deleteTrashed([deleteTarget.value.file_url]);
      deleteTarget.value = null;
    } else if (action === "deleteTrashed") {
      await m.deleteTrashed(selectedUrls.value);
      selected.value = new Set();
    } else if (action === "purgeTrash") {
      await m.purgeTrash(0);
    } else if (action === "purge") {
      // 0 = arşivin tamamı. Bu noktadan sonra geri alma yok.
      await m.purgeArchive(0);
    }
  }

  const confirmMessage = computed(() => {
    const a = pendingAction.value;
    if (a === "selected")
      return t("mediaOptimize.confirm.selected", { n: selectedOptimizable.value });
    if (a === "pilot") return t("mediaOptimize.confirm.pilot");
    if (a === "all") return t("mediaOptimize.confirm.all", { n: affectedCount.value });
    if (a === "restore") return t("mediaOptimize.confirm.restore");
    if (a === "restoreSelected")
      return t("mediaOptimize.confirm.restoreSelected", { n: selectedOptimized.value });
    if (a === "restoreAll")
      return t("mediaOptimize.confirm.restoreAll", { n: affectedCount.value });
    if (a === "trash") return trashMessage.value;
    if (a === "untrash") return t("mediaOptimize.confirm.untrash", { n: selected.value.size });
    if (a === "deleteOne")
      return t("mediaOptimize.confirm.deleteOne", { name: deleteTarget.value?.file_name || "" });
    if (a === "deleteTrashed")
      return t("mediaOptimize.confirm.deleteNow", { n: selected.value.size });
    if (a === "purgeTrash")
      return t("mediaOptimize.confirm.purgeTrash", { size: formatSize(m.summary.trash_bytes) });
    if (a === "purge")
      return t("mediaOptimize.confirm.purge", { size: formatSize(m.summary.archive_bytes) });
    return "";
  });

  /** Tek dosyayı çöpten kalıcı sil.
   *
   * Toplu çubuk yalnız satır seçilince çıkıyordu; seçim yapmadan kalıcı silmenin
   * hiçbir yolu yoktu ve kullanıcı "Çöpü boşalt"a yöneliyordu — o ise TÜM çöpü
   * siler. İki işlem farklı, ikisi de erişilebilir olmalı.
   */
  function askDeleteOne(item) {
    deleteTarget.value = item;
    pendingAction.value = "deleteOne";
    confirmOpen.value = true;
  }

  async function untrashOne(item) {
    await m.restoreFromTrash([item.file_url]);
  }

  // Karışık seçimde uyarı kırılımı gösterir: "5 kullanımda, 2 hiç
  // kullanılmamış" — hepsini tek mesajda birleştirip sonucu açıkça söyler.
  const trashMessage = computed(() => {
    const p = trashPreview.value;
    const d = m.summary.trash_days;
    if (!p) return t("mediaOptimize.confirm.trash", { n: selected.value.size, d });
    const parts = Object.entries(p.by_verdict || {}).map(([k, n]) =>
      t("mediaOptimize.confirm.trashPart", { n, label: t(`mediaOptimize.usageState.${k}`) })
    );
    const base = t("mediaOptimize.confirm.trashMixed", { n: p.total, parts: parts.join(", "), d });
    if (!p.in_use) return base;
    return `${base}\n\n${t("mediaOptimize.confirm.trashDanger", { n: p.in_use, places: p.live_places })}`;
  });

  function askRestore(name) {
    restoreTarget.value = name;
    ask("restore");
  }

  async function changePage(p) {
    m.page.value = p;
    await m.load();
  }

  /**
   * Adres çubuğundan gelen filtreyi uygula.
   *
   * Denetim sayfasındaki "Medyada aç" düğmesi buraya `?q=<dosya adı>` ile
   * geliyor; sorgu okunmadığı için düğme hiçbir şey yapmıyordu. Çöpteki bir
   * dosya için `?state=trashed` de gelir, yoksa liste onu göstermez.
   */
  function readQuery() {
    const q = route.query;
    if (q.q !== undefined) m.search.value = String(q.q || "");
    if (q.state !== undefined) m.state.value = String(q.state || "");
    if (q.min !== undefined) m.minBytes.value = Number(q.min) || 0;
  }

  onMounted(() => {
    readQuery();
    m.load();
  });

  // Aynı sayfadayken adres değişirse (denetimden tekrar gelinirse) yeniden uygula.
  watch(
    () => route.query,
    () => {
      readQuery();
      m.page.value = 1;
      m.load();
    }
  );
</script>

<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="image" :size="16" class="mpage__title-icon" />
          {{ t("mediaOptimize.title") }}
        </h1>
        <p class="mpage__subtitle">
          {{
            t("mediaOptimize.pageSubtitle", {
              count: m.summary.count,
              size: formatSize(m.summary.total_bytes),
            })
          }}
        </p>
      </div>

      <!-- `v-if` ile kaldırılıyor, Tailwind `hidden` ile değil: scoped stilin
           [data-v] eki `.hidden`'ı ezip bloğu telefonda geri getiriyor. -->
      <div v-if="isDesktop" class="mpage__actions">
        <button type="button" class="hdr-btn-outlined" @click="openAudit()">
          <AppIcon name="history" :size="13" />
          {{ t("mediaOptimize.action.audit") }}
        </button>
        <button type="button" class="hdr-btn-outlined" :disabled="running" @click="estimate">
          <AppIcon name="calculator" :size="13" />
          {{ t("mediaOptimize.action.estimate") }}
        </button>
        <button type="button" class="hdr-btn-outlined" :disabled="running" @click="ask('pilot')">
          <AppIcon name="flask-conical" :size="13" />
          {{ t("mediaOptimize.action.pilot") }}
        </button>
        <button type="button" class="hdr-btn-primary" :disabled="running" @click="ask('all')">
          <AppIcon name="zap" :size="13" />
          {{ t("mediaOptimize.action.all") }}
        </button>
      </div>
    </header>

    <!-- ── Özet kartları ── -->
    <div class="mo__stats">
      <div class="mo__stat">
        <span class="mo__stat-label">{{ t("mediaOptimize.stat.size") }}</span>
        <strong>{{ formatSize(m.summary.total_bytes) }}</strong>
        <small>{{ t("mediaOptimize.stat.sizeBefore", { size: formatSize(sizeBefore) }) }}</small>
      </div>
      <div class="mo__stat mo__stat--good">
        <span class="mo__stat-label">{{ t("mediaOptimize.stat.saved") }}</span>
        <strong>{{ formatSize(m.summary.saved_bytes) }}</strong>
        <small>{{ t("mediaOptimize.stat.savedNote") }}</small>
      </div>
      <div class="mo__stat">
        <span class="mo__stat-label">{{ t("mediaOptimize.stat.optimized") }}</span>
        <strong>{{ m.summary.optimized_count }}</strong>
        <small>{{ t("mediaOptimize.stat.ofTotal", { n: m.summary.count }) }}</small>
      </div>
      <div class="mo__stat">
        <span class="mo__stat-label">
          {{ t("mediaOptimize.stat.trash", { d: m.summary.trash_days }) }}
        </span>
        <strong>{{ formatSize(m.summary.trash_bytes) }}</strong>
        <small>{{ t("mediaOptimize.stat.trashNote", { d: m.summary.trash_days }) }}</small>
        <div v-if="m.summary.trash_bytes" class="mo__stat-acts">
          <button type="button" class="mo__mini" @click="setFilter('state', 'trashed')">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaOptimize.action.viewTrash") }}
          </button>
          <button type="button" class="mo__mini mo__mini--danger" @click="ask('purgeTrash')">
            <AppIcon name="trash-2" :size="12" />
            {{ t("mediaOptimize.action.purgeTrash") }}
          </button>
        </div>
      </div>
      <div class="mo__stat">
        <span class="mo__stat-label">
          {{ t("mediaOptimize.stat.archive", { d: m.summary.retention_days }) }}
        </span>
        <strong>{{ formatSize(m.summary.archive_bytes) }}</strong>
        <small>{{ t("mediaOptimize.stat.netDisk", { size: formatSize(netDisk) }) }}</small>
        <div v-if="m.summary.archive_bytes" class="mo__stat-acts">
          <button type="button" class="mo__mini" @click="setFilter('state', 'optimized')">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaOptimize.action.viewArchive") }}
          </button>
          <button type="button" class="mo__mini" :disabled="running" @click="ask('restoreAll')">
            <AppIcon name="rotate-ccw" :size="12" />
            {{ t("mediaOptimize.action.restoreAll") }}
          </button>
          <button
            type="button"
            class="mo__mini mo__mini--danger"
            :disabled="running"
            @click="ask('purge')"
          >
            <AppIcon name="trash-2" :size="12" />
            {{ t("mediaOptimize.action.purge") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Araç şeridi ── -->
    <div class="mtoolbar-wrap">
      <div class="card mo__toolbar">
        <div class="mo__search">
          <AppIcon name="search" :size="13" class="mo__search-icon" />
          <input
            v-model="m.search.value"
            type="text"
            class="form-input-sm w-full !pl-9"
            :placeholder="t('mediaOptimize.searchPlaceholder')"
            @keyup.enter="applyFilters"
          />
          <button
            v-if="m.search.value"
            type="button"
            class="mo__search-clear"
            :aria-label="t('mediaOptimize.filters')"
            @click="clearChip('search')"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button
          type="button"
          class="hdr-btn-outlined mo__funnel"
          :class="{ 'mo__funnel--on': activeFilterCount }"
          @click="filtersOpen = true"
        >
          <AppIcon name="filter" :size="13" />
          <span class="mo__funnel-text">{{ t("mediaOptimize.filters") }}</span>
          <span v-if="activeFilterCount" class="mo__funnel-count">{{ activeFilterCount }}</span>
        </button>

        <!-- Telefonda görünüm seçici yok: liste modu sabit, ızgara/tablo o
             genişlikte zaten sığmıyor. -->
        <ViewModeToggle v-if="isDesktop" v-model="viewMode" :modes="VIEW_MODES" />
      </div>
    </div>

    <!-- Seçim yapıldığında çıkan bağlamsal çubuk — toolbar'ı kalabalıklaştırmak
         yerine eylemler yalnız gerektiğinde görünür (MediaBulkBar kalıbı). -->
    <!-- Toplu eylem çubuğu — SellerListingsView ile aynı kalıp: sayaç solda,
         eylemler sağda, yıkıcı olan kırmızı birincil buton. -->
    <div
      v-if="selected.size"
      class="card mb-3 !py-2.5 !px-4 flex items-center justify-between gap-3"
    >
      <span class="text-[13px] font-medium text-gray-700 dark:text-gray-200">
        {{ t("mediaOptimize.bulk.selected", { n: selected.size }) }}
      </span>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" :disabled="busy" @click="selected = new Set()">
          {{ t("mediaOptimize.bulk.clear") }}
        </button>

        <template v-if="!isTrashView">
          <button
            class="hdr-btn-outlined"
            :disabled="busy || running || !selectedOptimizable"
            @click="ask('selected')"
          >
            <AppIcon name="wand-sparkles" :size="14" />
            {{ t("mediaOptimize.bulk.optimize", { n: selectedOptimizable }) }}
          </button>
          <button
            class="hdr-btn-outlined"
            :disabled="busy || running || !selectedOptimized"
            @click="ask('restoreSelected')"
          >
            <AppIcon name="undo-2" :size="14" />
            {{ t("mediaOptimize.bulk.restore", { n: selectedOptimized }) }}
          </button>
          <button
            class="hdr-btn-primary !bg-red-600 hover:!bg-red-700 dark:!bg-red-600 dark:hover:!bg-red-700"
            :disabled="busy || !selectedTrashable"
            @click="ask('trash')"
          >
            <AppIcon
              :name="busy ? 'loader' : 'trash-2'"
              :size="14"
              :class="busy ? 'animate-spin' : ''"
            />
            <span>{{ t("mediaOptimize.bulk.trash", { n: selectedTrashable }) }}</span>
          </button>
        </template>

        <template v-else>
          <button class="hdr-btn-outlined" :disabled="busy" @click="ask('untrash')">
            <AppIcon name="undo-2" :size="14" />
            {{ t("mediaOptimize.bulk.untrash", { n: selected.size }) }}
          </button>
          <button
            class="hdr-btn-primary !bg-red-600 hover:!bg-red-700 dark:!bg-red-600 dark:hover:!bg-red-700"
            :disabled="busy"
            @click="ask('deleteTrashed')"
          >
            <AppIcon
              :name="busy ? 'loader' : 'trash-2'"
              :size="14"
              :class="busy ? 'animate-spin' : ''"
            />
            <span>{{ t("mediaOptimize.bulk.deleteNow", { n: selected.size }) }}</span>
          </button>
        </template>
      </div>
    </div>

    <MediaFilterChips :chips="chips" @clear="clearChip" />

    <!-- ── Filtre çekmecesi — DataTableToolbar ile aynı kalıp: düz bölümler,
         akordiyon yok, altta tek "temizle" düğmesi. ── -->
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
                <span class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ t("mediaOptimize.filters") }}
                </span>
                <span
                  v-if="activeFilterCount"
                  class="px-1.5 rounded-full text-[11px] bg-brand-50 text-brand-800 dark:bg-brand-900/25 dark:text-brand-300"
                >
                  {{ activeFilterCount }}
                </span>
              </div>
              <button
                type="button"
                class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                @click="filtersOpen = false"
              >
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <div v-for="g in filterGroups" :key="g.id" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ g.label }}
                </label>
                <div class="flex flex-col gap-1.5">
                  <label
                    v-for="opt in g.options"
                    :key="String(opt.id)"
                    class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="radio"
                      :name="`mo-f-${g.id}`"
                      :checked="g.value === opt.id"
                      @change="g.set(opt.id)"
                    />
                    <span v-if="opt.dot" class="mo__dot" :class="`mo__dot--${opt.dot}`" />
                    {{ opt.label }}
                    <span v-if="opt.count !== undefined" class="mo__optcount">{{ opt.count }}</span>
                  </label>
                </div>
              </div>

              <div class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ t("mediaOptimize.filter.onlyOptimizable") }}
                </label>
                <label
                  class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                >
                  <input
                    v-model="m.onlyOptimizable.value"
                    type="checkbox"
                    @change="applyFilters"
                  />
                  {{ t("mediaOptimize.filter.onlyOptimizableHint") }}
                </label>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-gray-200 dark:border-[#2a2a35]">
              <button
                type="button"
                class="hdr-btn-outlined w-full justify-center"
                @click="clearChip('all')"
              >
                {{ t("mediaOptimize.filter.clearAll") }}
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <!-- ── İş ilerlemesi ── -->
    <div
      v-if="m.job.key"
      class="card mo__job"
      :class="{ 'mo__job--dry': m.job.dry_run, 'mo__job--done': !running }"
    >
      <div class="mo__job-head">
        <strong>{{ jobTitle }}</strong>
        <span class="mo__job-count">
          {{ m.job.processed }} / {{ m.job.total }} — %{{ percent }}
          <button
            v-if="!running"
            type="button"
            class="mo__close"
            :title="t('mediaOptimize.job.close')"
            @click="m.resetJob()"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </span>
      </div>
      <div class="mo__progress">
        <span class="mo__progress-fill" :style="{ width: percent + '%' }" />
      </div>
      <div class="mo__job-meta">
        <span>
          {{ isRestore ? t("mediaOptimize.job.restored") : t("mediaOptimize.job.optimized") }}:
          <b>{{ m.job.optimized }}</b>
        </span>
        <span v-if="!isRestore">
          {{ t("mediaOptimize.job.skipped") }}: <b>{{ m.job.skipped }}</b>
        </span>
        <span v-if="m.job.errors" class="mo__job-err">
          {{ t("mediaOptimize.job.errors") }}: <b>{{ m.job.errors }}</b>
        </span>
        <span v-if="!isRestore" class="mo__job-gain">
          {{ formatSize(m.job.original_bytes) }} → {{ formatSize(m.job.new_bytes) }}
          (−{{ formatSize(jobSaved) }})
        </span>
      </div>
      <p v-if="m.job.dry_run && !running" class="mo__job-note">
        {{ t("mediaOptimize.job.projection", { size: formatSize(projected) }) }}
      </p>
      <p v-if="nothingDone" class="mo__job-note mo__job-note--warn">
        {{ t("mediaOptimize.job.nothingDone") }}
      </p>
      <div v-if="Object.keys(m.job.skip_reasons).length" class="mo__reasons">
        <span v-for="(count, reason) in m.job.skip_reasons" :key="reason" class="mo__chip">
          {{ t(`mediaOptimize.skip.${reason}`) }} <b>{{ count }}</b>
        </span>
      </div>
    </div>

    <!-- ── Liste (varsayılan) ── -->
    <div v-if="effectiveMode === 'list'" class="card mo__list">
      <div
        v-for="item in m.items.value"
        :key="item.name"
        class="mo__row"
        :class="{ 'mo__row--on': selected.has(item.name) }"
      >
        <input
          type="checkbox"
          :checked="selected.has(item.name)"
          :disabled="running"
          :title="skipHint(item)"
          @change="toggle(item.name)"
        />
        <img
          v-if="canThumb(item)"
          class="mo__thumb"
          :src="previewUrl(item)"
          :alt="item.file_name"
          loading="lazy"
          decoding="async"
        />
        <button
          v-else
          type="button"
          class="mo__thumb mo__thumb--ph"
          :title="t('mediaOptimize.loadPreview')"
          @click="forceLoad(item)"
        >
          {{ extOf(item) }}
        </button>

        <div class="mo__row-main">
          <span class="mo__file-name">{{ item.file_name }}</span>
          <span class="mo__row-sub">
            {{ formatSize(item.file_size) }}
            <template v-if="item.saved_bytes">
              · <span class="mo__gain">−{{ formatSize(item.saved_bytes) }}</span>
            </template>
            <template v-if="item.live_usage">
              · <span class="mo__usage--multi_use">{{ t("mediaOptimize.usage.liveCount", { n: item.live_usage }) }}</span>
            </template>
            <template v-if="item.usage_kind !== 'single'">
              · <span :class="`mo__usage--${item.usage_kind}`">{{ usageLabel(item) }}</span>
            </template>
          </span>
        </div>

        <!-- Video işleme rozeti (TUR-296): yalnız işleniyor/başarısız —
             "hazır" olağan durumdur, rozetlemek gürültü. -->
        <span
          v-if="item.video_status === 'processing' || item.video_status === 'failed'"
          class="mo__badge"
          :class="`mo__badge--v-${item.video_status}`"
        >
          {{ t(`mediaOptimize.videoStatus.${item.video_status}`) }}
        </span>
        <span class="mo__badge" :class="stateClass(item)">{{ stateLabel(item) }}</span>

        <template v-if="isTrashView">
          <button type="button" class="mo__link" @click="untrashOne(item)">
            {{ t("mediaOptimize.action.untrash") }}
          </button>
          <button type="button" class="mo__link mo__link--danger" @click="askDeleteOne(item)">
            {{ t("mediaOptimize.action.deleteOne") }}
          </button>
        </template>
        <button
          v-else-if="item.video_status === 'failed'"
          type="button"
          class="mo__link"
          :disabled="running"
          @click="m.retryTranscode(item.file_url)"
        >
          {{ t("mediaOptimize.action.retryVideo") }}
        </button>
        <button
          v-else-if="item.state === 'optimized'"
          type="button"
          class="mo__link"
          :disabled="running"
          @click="askRestore(item.name)"
        >
          {{ t("mediaOptimize.action.restore") }}
        </button>
      </div>
      <p v-if="!m.items.value.length" class="mo__empty">{{ t("mediaOptimize.empty") }}</p>
    </div>

    <!-- ── Kart ızgarası — minimal: önizleme, ad, boyut, kazanç ── -->
    <div v-else-if="effectiveMode === 'grid'" class="mo__grid">
      <article
        v-for="item in m.items.value"
        :key="item.name"
        class="card mo__card"
        :class="{ 'mo__card--on': selected.has(item.name) }"
      >
        <label class="mo__card-pick">
          <input
            type="checkbox"
            :checked="selected.has(item.name)"
            :disabled="running"
            :title="skipHint(item)"
            @change="toggle(item.name)"
          />
        </label>
        <span class="mo__card-ext">{{ extOf(item) }}</span>
        <button
          type="button"
          class="mo__eye mo__eye--card"
          :title="t('mediaOptimize.usageState.hint')"
          @click="openUsage(item)"
        >
          <AppIcon name="eye" :size="14" />
        </button>

        <div class="mo__card-thumb">
          <img
            v-if="canThumb(item)"
            :src="previewUrl(item)"
            :alt="item.file_name"
            loading="lazy"
            decoding="async"
          />
          <button
            v-else
            type="button"
            :title="t('mediaOptimize.loadPreview')"
            @click="forceLoad(item)"
          >
            <AppIcon name="image" :size="18" />
          </button>
        </div>

        <div class="mo__card-body">
          <span class="mo__file-name" :title="item.file_name">{{ item.file_name }}</span>
          <span class="mo__card-sub">
            {{ formatSize(item.file_size) }}
            <span v-if="item.saved_bytes" class="mo__gain">−{{ formatSize(item.saved_bytes) }}</span>
          </span>
        </div>
      </article>
      <p v-if="!m.items.value.length" class="mo__empty">{{ t("mediaOptimize.empty") }}</p>
    </div>

    <!-- ── Tablo — sıralanabilir sütunlar (yalnız masaüstü) ── -->
    <div v-else-if="effectiveMode === 'table'" class="card mo__table-wrap">
      <table class="mo__table">
        <thead>
          <tr>
            <th class="mo__col-check">
              <input type="checkbox" :disabled="running" @change="toggleAll" />
            </th>
            <th class="mo__col-thumb"></th>
            <th
              v-for="col in SORT_COLS"
              :key="col"
              :class="{ mo__num: col === 'size' || col === 'saved' || col === 'date' }"
            >
              <button type="button" class="mo__sort" @click="sortBy(col)">
                {{ t(`mediaOptimize.col.${col === "name" ? "file" : col}`) }}
                <AppIcon v-if="sortIcon(col)" :name="sortIcon(col)" :size="12" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!m.items.value.length">
            <td colspan="9" class="mo__empty">{{ t("mediaOptimize.empty") }}</td>
          </tr>
          <tr
            v-for="item in m.items.value"
            v-else
            :key="item.name"
            :class="{ 'mo__row--on': selected.has(item.name) }"
          >
            <td>
              <input
                type="checkbox"
                :checked="selected.has(item.name)"
                :disabled="running"
                :title="skipHint(item)"
                @change="toggle(item.name)"
              />
            </td>
            <td>
              <img
                v-if="canThumb(item)"
                class="mo__thumb"
                :src="previewUrl(item)"
                :alt="item.file_name"
                loading="lazy"
                decoding="async"
              />
              <button
                v-else
                type="button"
                class="mo__thumb mo__thumb--ph"
                :title="t('mediaOptimize.loadPreview')"
                @click="forceLoad(item)"
              >
                {{ extOf(item) }}
              </button>
            </td>
            <td><span class="mo__file-name">{{ item.file_name }}</span></td>
            <td class="mo__num">{{ formatSize(item.file_size) }}</td>
            <td class="mo__num mo__gain">
              {{ item.saved_bytes ? "−" + formatSize(item.saved_bytes) : "—" }}
            </td>
            <td>
              <span class="mo__usebadge" :class="`mo__usebadge--${item.usage_verdict}`">
                {{ t(`mediaOptimize.usageState.${item.usage_verdict}`) }}
              </span>
              <span v-if="item.live_usage" class="mo__usage mo__usage--multi_use">
                {{ t("mediaOptimize.usage.liveCount", { n: item.live_usage }) }}
              </span>
              <span
                v-if="item.usage_kind !== 'single'"
                :class="`mo__usage--${item.usage_kind}`"
                class="mo__usage"
              >
                {{ usageLabel(item) }}
              </span>
            </td>
            <td>
              <span class="mo__badge" :class="stateClass(item)" :title="skipHint(item)">
                {{ stateLabel(item) }}
              </span>
            </td>
            <td class="mo__num mo__muted">{{ fmtDate(item.optimized_at || item.creation) }}</td>
            <td class="mo__row-acts">
              <button
                type="button"
                class="mo__eye"
                :title="t('mediaOptimize.usageState.hint')"
                :aria-label="t('mediaOptimize.usageState.hint')"
                @click="openUsage(item)"
              >
                <AppIcon name="eye" :size="15" />
              </button>
              <template v-if="isTrashView">
                <button type="button" class="mo__link" @click="untrashOne(item)">
                  {{ t("mediaOptimize.action.untrash") }}
                </button>
                <button type="button" class="mo__link mo__link--danger" @click="askDeleteOne(item)">
                  {{ t("mediaOptimize.action.deleteOne") }}
                </button>
              </template>
              <button
                v-else-if="item.state === 'optimized'"
                type="button"
                class="mo__link"
                :disabled="running"
                @click="askRestore(item.name)"
              >
                {{ t("mediaOptimize.action.restore") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Kanban — işlem karşısındaki durum (yalnız masaüstü) ── -->
    <div v-else class="mo__kanban">
      <section v-for="col in kanbanGroups" :key="col.id" class="card mo__kcol">
        <header class="mo__kcol-head">
          <span>{{ t(`mediaOptimize.${col.label}`) }}</span>
          <span class="mo__kcol-count">{{ col.items.length }}</span>
        </header>
        <div class="mo__kcol-body">
          <div
            v-for="item in col.items"
            :key="item.name"
            class="mo__kcard"
            :class="{ 'mo__row--on': selected.has(item.name) }"
          >
            <input
              type="checkbox"
              :checked="selected.has(item.name)"
              :disabled="running"
              @change="toggle(item.name)"
            />
            <img
              v-if="canThumb(item)"
              class="mo__thumb"
              :src="previewUrl(item)"
              :alt="item.file_name"
              loading="lazy"
              decoding="async"
            />
            <button
              v-else
              type="button"
              class="mo__thumb mo__thumb--ph"
              :title="t('mediaOptimize.loadPreview')"
              @click="forceLoad(item)"
            >
              {{ extOf(item) }}
            </button>
            <div class="mo__kcard-main">
              <span class="mo__file-name">{{ item.file_name }}</span>
              <span class="mo__muted">{{ formatSize(item.file_size) }}</span>
            </div>
          </div>
          <p v-if="!col.items.length" class="mo__kcol-empty">—</p>
        </div>
      </section>
    </div>

    <!-- Mobil birincil aksiyon: masaüstünde başlıktaki "Tümünü Optimize Et"
         butonunun karşılığı. Ekranı takip eder (fixed). -->
    <button
      v-if="!isDesktop"
      type="button"
      class="mo__fab"
      :disabled="running"
      @click="ask('all')"
    >
      <AppIcon name="zap" :size="16" />
      {{ t("mediaOptimize.action.allShort") }}
    </button>

    <div class="mpage__pagination">
      <ListPagination
        :model-value="m.page.value"
        :total="m.total.value"
        :page-size="m.pageSize.value"
        :page-size-options="[25, 50, 100]"
        @update:model-value="changePage"
        @update:page-size="
          (s) => {
            m.pageSize.value = s;
            applyFilters();
          }
        "
      />
    </div>

    <MediaUsageDialog
      v-model:open="usageOpen"
      :item="usageItem"
      :fetcher="m.fetchUsage"
      @open-record="openRecord"
    />
    <MediaRecordDialog
      v-model:open="recordOpen"
      :target="recordTarget"
      :fetcher="m.fetchRecordMedia"
    />

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="t('mediaOptimize.confirm.ok')"
      :tone="confirmTone"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Yerleşim ve başlık ölçüleri satıcı Medya Kütüphanesi'yle birebir aynı —
  // iki ekran aynı işin iki yüzü, ayrı görünmemeli.
  .mpage {
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;

    // FAB sabit konumlu; telefonda sayfalayıcının üstüne biniyordu.
    @media (max-width: 1023px) {
      padding-bottom: calc(#{media.$m-float-bottom} + 56px);
    }
  }

  .mpage__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
    margin-bottom: media.$s-5;

    // base.scss'teki global `html.dark header` kuralı buraya kart zemini
    // basıyor; başlık sayfa zeminiyle aynı kalsın.
    @include dark {
      background-color: transparent !important;
    }
  }

  .mpage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  .mpage__subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .mpage__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .mpage__pagination {
    margin-top: media.$s-3;

    // Global `.list-pagination` flex + space-between ve SARMIYOR: telefonda
    // "1–50 / 2844" + sayfa boyutu seçici + sayfa düğmeleri tek satıra
    // sığmayıp yatay taşıyordu. Yalnız dar ekranda sarmaya izin ver.
    @media (max-width: 1023px) {
      :deep(.list-pagination) {
        flex-wrap: wrap;
        justify-content: center;
        gap: media.$s-2;
        padding-inline: media.$s-2;
      }

      :deep(.list-pagination-pages) {
        flex-wrap: wrap;
        justify-content: center;
      }
    }
  }


  // ── Özet kartları ────────────────────────────────────────────────
  // Telefonda 2×2, masaüstünde 4 yan yana. `auto-fit` bırakılırsa ara
  // genişliklerde 3+1 gibi tek satırlık artık oluşuyordu.
  .mo__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    // Beş kart tek satırda: sarmaya bırakılınca 4+1 gibi tek kartlık artık
    // satır oluşuyordu. Dar ekranda 2×3 düzeni korunur.
    @media (min-width: 1024px) {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: media.$s-2;
    }
  }

  .mo__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: 0.6rem;
    @include media.surface("soft");

    strong {
      font-size: 0.95rem;
      font-weight: 700;
      @include media.numeric;
    }

    small {
      @include media.text("xs");
      @include media.muted(2);
    }
  }

  .mo__stat--good strong {
    color: $c-success;
  }

  .mo__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  // ── Araç şeridi ──────────────────────────────────────────────────
  .mtoolbar-wrap {
    position: sticky;
    // Header (56px) aynı scroll kabında sticky; 0 verilirse arkasına girer.
    top: media.$m-sticky-top;
    z-index: 20;
    margin-bottom: media.$s-3;
  }

  .mo__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    flex-wrap: wrap;
  }

  .mo__search {
    position: relative;
    flex: 1 1 14rem;
    min-width: 12rem;
  }

  .mo__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $l-text-300;
  }

  .mo__search-clear {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    @include media.icon-button;
  }

  .mo__spacer {
    flex: 1 1 auto;
  }

  .mo__funnel--on {
    border-color: $brand;
    color: $brand;
  }

  .mo__funnel-count {
    @include media.chip("brand");
    margin-left: 0.3rem;
  }

  .mo__btn--warn:not(:disabled) {
    border-color: $c-warning;
    color: $c-warning;
  }

  // ── Filtre rayı (sağdan çekmece) ─────────────────────────────────
  // Ray akışta değil: huni düğmesiyle açılan çekmece. Kapalıyken görünmez
  // OLMALI — yalnız translate ile kaydırılırsa ekran dışındaki butonlar hâlâ
  // Tab ile odaklanıyor ve ekran okuyucuya okunuyor.
  .mrail {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 65;
    width: min(24rem, 92vw);
    overflow-y: auto;
    overscroll-behavior: contain;
    visibility: hidden;
    transform: translateX(100%);
    transition:
      transform $d-modal $ease-drawer,
      visibility 0s linear $d-modal;
    background: $l-bg;
    box-shadow: 0 0 40px rgb(0 0 0 / 18%);

    @include dark {
      background: $d-bg;
    }
  }

  .mrail--open {
    visibility: visible;
    transform: translateX(0);
    transition:
      transform $d-sheet $ease-drawer,
      visibility 0s;
  }

  .mrail__scrim {
    position: fixed;
    inset: 0;
    z-index: 64;
    background: rgb(0 0 0 / 45%);
    overscroll-behavior: contain;
    touch-action: none;
  }

  // ── İş paneli ────────────────────────────────────────────────────
  .mo__job {
    padding: media.$s-3 media.$s-4;
    margin-bottom: media.$s-3;
    border-left: 3px solid $brand;
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
  }

  .mo__job--dry {
    border-left-color: $c-info;
  }

  .mo__job--done {
    border-left-color: $c-success;
  }

  .mo__job-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @include media.text("sm");
    font-weight: 600;
  }

  .mo__job-count {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
    @include media.muted(1);
  }

  .mo__close {
    @include media.icon-button;
  }

  .mo__progress {
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mo__progress-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .mo__job-meta {
    display: flex;
    gap: media.$s-4;
    flex-wrap: wrap;
    @include media.text("xs");
    @include media.muted(1);
  }

  .mo__job-gain {
    color: $c-success;
  }

  .mo__job-err {
    color: $c-error;
  }

  .mo__job-note {
    @include media.text("xs");
    color: $c-info;
    margin: 0;
  }

  .mo__job-note--warn {
    color: $c-warning;
  }

  .mo__reasons {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .mo__chip {
    @include media.chip("neutral");
  }

  .mo__row--on {
    background: rgb(124 58 237 / 6%);
  }

  .mo__col-check,
  .mo__col-thumb {
    width: 40px;
  }

  .mo__gain {
    color: $c-success;
  }

  .mo__muted {
    @include media.muted(2);
  }

  .mo__thumb {
    width: 34px;
    height: 34px;
    object-fit: cover;
    border-radius: 0.3rem;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mo__thumb--ph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed $l-border;
    @include media.text("xs");
    font-weight: 600;
    @include media.muted(2);
    cursor: pointer;

    @include dark {
      border-color: $d-border;
    }
  }

  .mo__file-name {
    display: block;
    max-width: 22rem;
    @include media.truncate;
  }

  .mo__usage {
    @include media.text("xs");
  }

  // Kullanımda olan dosya bilgi; tekrar yükleme temizlenebilir bir durum.
  .mo__usage--multi_use {
    color: $c-info;
  }

  .mo__usage--repeat {
    color: $c-warning;
  }

  .mo__badge {
    @include media.chip("neutral");
  }

  // Kullanım rozeti tıklanabilir: detay penceresini açar.
  .mo__usebadge {
    @include media.chip("neutral");
  }

  // Detay penceresi artık rozetten değil, satırın en sağındaki göz
  // düğmesinden açılıyor — rozet bilgi, düğme eylem.
  .mo__eye {
    @include media.icon-button;
    @include media.focus-ring;
  }

  .mo__eye--card {
    position: absolute;
    top: 0.4rem;
    right: 2.2rem;
    z-index: 1;
    color: #fff;
    background: rgb(0 0 0 / 45%);
    border-radius: 0.25rem;
  }

  // Göz ve geri al yan yana — alt alta düşünce satır iki katına çıkıyordu.
  .mo__row-acts {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
  }

  .mo__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: $l-text-300;
  }

  .mo__dot--ok {
    background: $c-success;
  }

  .mo__dot--warn {
    background: $c-warning;
  }

  .mo__dot--danger {
    background: $c-error;
  }

  .mo__optcount {
    margin-left: auto;
    @include media.text("xs");
    @include media.muted(2);
  }

  .mo__usebadge--in_use {
    @include media.chip("success");
  }

  .mo__usebadge--order_only,
  .mo__usebadge--history_only {
    @include media.chip("warning");
  }

  .mo__usebadge--unused {
    @include media.chip("danger");
  }

  .mo__badge--optimized {
    @include media.chip("success");
  }

  .mo__badge--skip {
    @include media.chip("neutral");
    border: 1px dashed $l-border;
    background: transparent;

    @include dark {
      border-color: $d-border;
    }
  }

  // Video işleme rozetleri (TUR-296). `chip` mixin'inde "error" tonu yok;
  // hata rengi burada kuruluyor (satıcı görünümüyle aynı desen).
  .mo__badge--v-processing {
    @include media.chip("info");
  }

  .mo__badge--v-failed {
    @include media.chip("info");
    color: $c-error;
    background: rgb(239 68 68 / 12%);
  }

  .mo__link {
    background: none;
    border: none;
    color: $brand;
    cursor: pointer;
    @include media.text("xs");

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mo__link--danger {
    color: $c-error;
  }

  .mo__bulk-btn--danger:not(:disabled) {
    border-color: $c-error;
    color: $c-error;
  }

  // ── Arşiv kartı eylemleri ────────────────────────────────────────
  .mo__stat-acts {
    display: flex;
    gap: media.$s-3;
    margin-top: 0.35rem;
    flex-wrap: wrap;
  }

  .mo__mini {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: $brand;
    @include media.text("xs");

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mo__mini--danger {
    color: $c-error;
  }

  // ── Liste ────────────────────────────────────────────────────────
  .mo__list {
    display: flex;
    flex-direction: column;
  }

  .mo__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    @include media.divider(bottom);
    @include media.hoverable;

    &:last-child {
      border-bottom: none;
    }
  }

  .mo__row--on {
    background: rgb(124 58 237 / 6%);
  }

  // min-width:0 şart — flex çocuk varsayılanı `auto`, uzun dosya adı satırı
  // taşırıp rozeti kartın dışına itiyordu.
  .mo__row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .mo__row-sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  // ── Kart ızgarası ────────────────────────────────────────────────
  .mo__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: media.$s-3;
  }

  .mo__card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @include media.hoverable;
  }

  .mo__card--on {
    outline: 2px solid $brand;
    outline-offset: -2px;
  }

  .mo__card-pick {
    position: absolute;
    top: 0.4rem;
    left: 0.4rem;
    z-index: 1;
  }

  // Uzantı rozeti önizlemenin ÜSTÜNDE: gövdede dursa uzun dosya adıyla aynı
  // satırı paylaşıp taşmaya sebep oluyordu.
  .mo__card-ext {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    z-index: 1;
    padding: 0.05rem 0.3rem;
    border-radius: 0.25rem;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .mo__card-thumb {
    aspect-ratio: 1;
    background: $l-bg-muted;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    button {
      width: 100%;
      height: 100%;
      border: none;
      background: none;
      cursor: pointer;
      @include media.muted(2);
    }

    @include dark {
      background: $d-bg-elevated;
    }
  }


  .mo__card-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    padding: media.$s-2 media.$s-2 media.$s-3;
  }

  .mo__card-sub {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    @include media.text("xs");
    @include media.muted(1);
  }

  .mo__badge--pending {
    @include media.chip("neutral");
  }


  // ── Tablo (yalnız masaüstü) ──────────────────────────────────────
  .mo__table-wrap {
    overflow-x: auto;
  }

  .mo__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: 0.5rem 0.65rem;
      text-align: left;
      @include media.divider(bottom);
    }

    th {
      @include media.text("xs");
      @include media.muted(1);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    tbody tr {
      @include media.hoverable;
    }
  }

  .mo__sort {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    @include media.focus-ring;

    &:hover {
      color: $brand;
    }
  }

  .mo__col-check,
  .mo__col-thumb {
    width: 40px;
  }

  .mo__num {
    text-align: right;
    @include media.numeric;
  }

  // ── Kanban ───────────────────────────────────────────────────────
  .mo__kanban {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: media.$s-3;
    align-items: start;
  }

  .mo__kcol {
    display: flex;
    flex-direction: column;
    max-height: 34rem;
  }

  .mo__kcol-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: media.$s-2 media.$s-3;
    @include media.divider(bottom);
    @include media.text("xs");
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mo__kcol-count {
    @include media.chip("neutral");
  }

  .mo__kcol-body {
    overflow-y: auto;
    padding: media.$s-2;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mo__kcard {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem;
    border-radius: 0.4rem;
    @include media.hoverable;
  }

  .mo__kcard-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    @include media.text("xs");
  }

  .mo__kcol-empty {
    text-align: center;
    padding: media.$s-3;
    @include media.muted(2);
  }

  // ── Mobil FAB ────────────────────────────────────────────────────
  // Ekranı takip eder; alt tab bar'ın üstünde durur.
  .mo__fab {
    position: fixed;
    inset-inline-end: 16px;
    bottom: media.$m-float-bottom;
    z-index: 40;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 18px;
    border: none;
    border-radius: media.$r-pill;
    font-size: 13.5px;
    font-weight: 700;
    // Sarı zemin üzerinde beyaz yasak (variables.scss) — $brand-ink kontrast çapası
    color: $brand-ink;
    background: $brand;
    box-shadow: 0 6px 16px rgb(0 0 0 / 22%);
    cursor: pointer;
    @include media.press(0.97);

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  // Scoped [data-v] eki Tailwind'in lg:hidden'ını ezebiliyor — masaüstünde
  // FAB'ı burada da kapat.
  @media (min-width: 1024px) {
    .mo__fab {
      display: none;
    }
  }

  // Telefonda huni metni gizlenir, ikon kalır: arama ile yan yana sığsın.
  @media (max-width: 1023px) {
    .mo__funnel-text {
      display: none;
    }
  }

  .mo__empty {
    text-align: center;
    padding: 2.5rem;
    @include media.muted(2);
  }

  // ── Izgara / liste / kanban ──────────────────────────────────────
  .mo__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: media.$s-3;
  }

  .mo__card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @include media.hoverable;
  }

  .mo__card--on {
    outline: 2px solid $brand;
  }

  .mo__card-pick {
    position: absolute;
    top: 0.4rem;
    left: 0.4rem;
    z-index: 1;
  }

  .mo__card-thumb {
    aspect-ratio: 1;
    background: $l-bg-muted;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    button {
      width: 100%;
      height: 100%;
      border: none;
      background: none;
      cursor: pointer;
      font-weight: 700;
      @include media.muted(2);
    }

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mo__card-body {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: media.$s-2 media.$s-3 media.$s-3;
  }

  .mo__card-meta,

  .mo__list {
    display: flex;
    flex-direction: column;
  }

  .mo__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    @include media.divider(bottom);
    @include media.hoverable;
  }

  .mo__row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  // Arşiv kartındaki yıkıcı eylem — kart içinde, gözden kaçmayacak ama
  // birincil aksiyonlarla yarışmayacak yerde.
  .mo__purge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.35rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: $c-error;
    @include media.text("xs");

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>

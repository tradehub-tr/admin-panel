<script setup>
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatAgo, formatClock, formatDateTime, formatDay } from "@/utils/dateFormat";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { REFRESH_INTERVALS, useMediaAudit } from "@/composables/useMediaAudit";
  import { useMediaAccess } from "@/composables/useMediaAccess";
  import { useToast } from "@/composables/useToast";

  const { t, locale } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const a = useMediaAudit();
  const access = useMediaAccess();
  const toast = useToast();

  const filtersOpen = ref(false);
  const detail = ref(null);
  const lightbox = ref(null);

  // ── Erişim seviyesi (TUR-126 §4.2) ─────────────────────────────────
  // Denetim akışı hem public hem private dosya olaylarını gösterir — seviye
  // rozetle görünür, süper-admin buradan çevirebilir; private dosya için
  // imzalı süreli paylaşım linki üretilir. Backend rolü zaten zorlar
  // (System Manager / Marketplace Admin), UI ek rol saklamaz.
  function accessLevelOf(row) {
    const url = String(row?.object_name || "");
    if (url.startsWith("/private/files/")) return "private";
    if (url.startsWith("/files/")) return "public";
    return "";
  }

  const accessConfirm = ref(null); // { row, makePrivate }

  function askToggleAccess(row) {
    accessConfirm.value = { row, makePrivate: accessLevelOf(row) === "public" };
  }

  async function onToggleAccess() {
    const { row, makePrivate } = accessConfirm.value || {};
    accessConfirm.value = null;
    if (!row) return;
    try {
      const res = await access.setAccessLevel(row.object_name, makePrivate);
      toast.success(
        makePrivate
          ? t("mediaAccess.toast.movedPrivate", { name: row.object_name })
          : t("mediaAccess.toast.movedPublic", { name: row.object_name })
      );
      // Dosya taşındı → eski URL'e kilitli filtre/detay bayatladı; yeni URL'i izle.
      if (res.file_url && a.fileUrl.value === row.object_name) {
        a.fileUrl.value = res.file_url;
        a.applyFilters();
      }
      detail.value = null;
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  async function copySignedLink(row) {
    try {
      const { url, ttl_seconds: ttl } = await access.createSignedLink(row.object_name);
      const absolute = new URL(url, window.location.origin).href;
      const copied = await access.copyText(absolute);
      if (copied) {
        toast.success(t("mediaAccess.toast.linkCopied", { minutes: Math.round((ttl || 900) / 60) }));
      } else {
        toast.error(t("mediaAccess.toast.copyFailed"));
      }
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  // MediaOptimizeView ile aynı dört mod ve aynı 1024px sınırı: altında kabuk
  // 280px yediği için ızgara/tablo sığmıyor, mod zorla listeye düşer.
  const VIEW_MODES = ["table", "grid", "list", "kanban"];
  const { isXl: isDesktop } = useBreakpoint();
  const { viewMode } = useListViewMode("media-audit-view", "list");
  const effectiveMode = computed(() => (isDesktop.value ? viewMode.value : "list"));

  const DAY_OPTIONS = [0, 1, 7, 30, 90];

  onMounted(() => {
    readUrl();
    a.loadAll();
    a.loadActors();
    window.addEventListener("keydown", onKey);
  });

  onUnmounted(() => window.removeEventListener("keydown", onKey));

  // ── URL durumu ─────────────────────────────────────────────────────
  // Filtreler adres çubuğunda tutulur: operatör "şu ekranı gör" diye link
  // paylaşabilsin, tarayıcı geri tuşu çalışsın.
  const URL_KEYS = ["file", "action", "severity", "decision", "actor", "tenant", "days", "q"];

  /**
   * Adres çubuğu tek doğru kaynak: eksik anahtar "filtre yok" demektir.
   *
   * Önce yalnız dolu anahtarlar okunuyordu; bir filtre kaldırılıp URL'den
   * düştüğünde durum eskisinde kalıyor, adres ile ekran ayrışıyordu.
   */
  function readUrl() {
    const q = route.query;
    a.fileUrl.value = q.file ? String(q.file) : "";
    a.action.value = q.action ? String(q.action) : "";
    a.severity.value = q.severity ? String(q.severity) : "";
    a.decision.value = q.decision ? String(q.decision) : "";
    a.actor.value = q.actor ? String(q.actor) : "";
    a.tenant.value = q.tenant ? String(q.tenant) : "";
    a.search.value = q.q ? String(q.q) : "";
    a.days.value = Number(q.days) || 0;
  }

  function writeUrl() {
    const next = {
      file: a.fileUrl.value || undefined,
      action: a.action.value || undefined,
      severity: a.severity.value || undefined,
      decision: a.decision.value || undefined,
      actor: a.actor.value || undefined,
      tenant: a.tenant.value || undefined,
      q: a.search.value || undefined,
      days: a.days.value || undefined,
    };
    const same = URL_KEYS.every((k) => String(route.query[k] ?? "") === String(next[k] ?? ""));
    if (!same) router.replace({ query: { ...next } });
  }

  // Filtre her değiştiğinde adres çubuğunu güncelle.
  watch(() => a.filterPayload.value, writeUrl, { deep: true });

  // Tarayıcı geri/ileri tuşu: adres değişince filtreleri yeniden oku.
  watch(
    () => route.query,
    () => {
      readUrl();
      a.load();
    }
  );

  // ── Biçimleme ──────────────────────────────────────────────────────
  function slug(value) {
    return String(value || "")
      .replace(/^media\./, "")
      .replace(/_(\w)/g, (_, c) => c.toUpperCase());
  }

  function tr(key, fallback) {
    const label = t(key);
    return label === key ? fallback : label;
  }

  const actionLabel = (v) => tr(`mediaAudit.action.${slug(v)}`, v);
  const reasonHead = (v) => String(v || "").split(":")[0];
  const reasonTail = (v) => String(v || "").split(":")[1] || "";
  const reasonLabel = (v) => {
    const base = tr(`mediaAudit.reason.${slug(reasonHead(v))}`, reasonHead(v));
    return reasonTail(v) ? `${base} (${reasonTail(v)})` : base;
  };
  const fieldLabel = (n) => tr(`mediaAudit.field.${slug(n)}`, n);


  // Sunucu "YYYY-MM-DD HH:mm:ss" döndürüyor. `datetimeFormats` bu projede
  // tanımlı değil — `d()` kullanmak vue-i18n fallback uyarısı üretir.
  // Ham dize kırpma yerine ortak biçimlendirme (TUR-124). Kırpma kullanıcının
  // dilini de saat dilimini de yok sayıyordu: sunucu saati neyse onu
  // gösteriyordu, yurtdışındaki kullanıcı saatleri kaymış görüyordu.
  const fmtTime = (v) => formatDateTime(v, locale.value);
  const fmtClock = (v) => formatClock(v, locale.value);
  const fmtDay = (v) => formatDay(v, locale.value);

  function ctx(row) {
    if (!row?.context) return null;
    try {
      return typeof row.context === "string" ? JSON.parse(row.context) : row.context;
    } catch {
      return null;
    }
  }

  function ctxPairs(row) {
    const c = ctx(row);
    if (!c) return [];
    return Object.entries(c)
      .filter(([k, v]) => k !== "file_url" && k !== "masked" && v !== null && v !== "" && typeof v !== "object")
      .map(([k, v]) => ({
        key: k,
        label: fieldLabel(k),
        value:
          k === "trigger"
            ? tr(`mediaAudit.trigger.${v}`, v)
            : k === "reason"
            ? reasonLabel(v)
            : typeof v === "boolean"
              ? t(v ? "mediaAudit.yes" : "mediaAudit.no")
              : k.endsWith("bytes")
                ? formatSize(v)
                : v,
      }));
  }

  const ctxSummary = (row) =>
    ctxPairs(row)
      .map((p) => `${p.label}: ${p.value}`)
      .join(" · ");

  // ── Durum ──────────────────────────────────────────────────────────
  const isMasked = (r) => String(r?.object_name || "").startsWith("masked:");

  /**
   * Toplu silme kaydında hedef dosya alanı boş — olay tek dosyaya ait değil.
   * Ama `context.files` silinenleri taşıyor; hedef sütununda "tek dosyası yok"
   * yazmak kullanıcıya neyin silindiğini göstermiyordu.
   */
  function batchFiles(row) {
    const c = ctx(row);
    const list = Array.isArray(c?.files) ? c.files : [];
    return { list, more: Number(c?.files_truncated || 0) };
  }

  const hasBatchFiles = (r) => batchFiles(r).list.length > 0;
  const isDenied = (r) => r?.decision === "DENY";

  function tone(r) {
    if (isDenied(r)) return "danger";
    if (r.severity === "HIGH") return "warn";
    return "ok";
  }

  function actionIcon(action) {
    const map = {
      "media.upload": "upload",
      // `wand-sparkles` ikon kütüphanesinde kayıtlı değil (resolveAppIcon null
      // döner ve ikon hiç çizilmez) — kayıtlı olan `sparkles` kullanılıyor.
      "media.optimize": "sparkles",
      "media.restore": "undo-2",
      "media.trash": "trash-2",
      "media.untrash": "undo-2",
      "media.delete": "trash-2",
      "media.purge_trash": "trash-2",
      "media.purge_archive": "trash-2",
      "media.scope_denied": "shield",
      "media.access_denied": "lock",
    };
    return map[action] || "circle-alert";
  }

  /**
   * Olayın insan diliyle açıklaması — "gizli ama neden", "reddedildi ama neden".
   *
   * Ekranda ham `sensitive_content_twin` yazmak operatöre hiçbir şey anlatmıyor;
   * denetim sayfasının işi tam olarak bu soruyu cevaplamak.
   */
  function explain(row) {
    const c = ctx(row) || {};
    const reason = reasonHead(c.reason);
    if (row.action === "media.access_denied") {
      const roles = (c.required_roles || []).join(", ");
      return t("mediaAudit.explain.accessDenied", { roles: roles || "—" });
    }
    if (row.action === "media.scope_denied") {
      const key = `mediaAudit.explain.${slug(reason)}`;
      const text = tr(key, "");
      if (text) return text;
      return t("mediaAudit.explain.scopeDefault");
    }
    if (row.action === "media.upload") {
      return c.attached_to_doctype
        ? t("mediaAudit.explain.uploadAttached", {
            doctype: c.attached_to_doctype,
            name: c.attached_to_name || "—",
          })
        : t("mediaAudit.explain.uploadLoose");
    }
    if (row.action === "media.delete") return t("mediaAudit.explain.delete");
    if (row.action === "media.trash") {
      return c.forced ? t("mediaAudit.explain.trashForced") : t("mediaAudit.explain.trash");
    }
    if (row.action === "media.untrash") return t("mediaAudit.explain.untrash");
    if (row.action === "media.optimize") return t("mediaAudit.explain.optimize");
    if (row.action === "media.restore") return t("mediaAudit.explain.restore");
    if (row.action.startsWith("media.purge")) {
      // Aynı olay hem kullanıcı düğmesinden hem günlük işten geliyor; ikisi
      // farklı şeyler, açıklama da farklı olmalı.
      const el = c.trigger === "manual" ? "Manual" : "Scheduled";
      const key = row.action === "media.purge_archive" ? "purgeArchive" : "purgeTrash";
      return tr(`mediaAudit.explain.${key}${el}`, t("mediaAudit.explain.purge"));
    }
    return "";
  }

  /** Maskeli kaydın neden maskelendiği — gizlilik kararının gerekçesi. */
  function maskExplain(row) {
    const reason = reasonHead(ctx(row)?.reason);
    return tr(`mediaAudit.mask.${slug(reason)}`, t("mediaAudit.mask.default"));
  }

  // ── Önizleme ───────────────────────────────────────────────────────
  // MediaOptimizeView'daki politika: ayrı thumbnail üretilmiyor, orijinal dosya
  // çekiliyor. Denetim listesinde dosya boyutu her kayıtta yok, bu yüzden
  // yalnız render edilebilir uzantılar ve maskesiz kayıtlar önizlenir.

  function canThumb(row) {
    if (isMasked(row)) return false;
    const url = row.object_name || "";
    return url.startsWith("/files/") && canRenderThumb(url);
  }

  function thumbUrl(row) {
    // Optimizasyon dosyanın üstüne yazıyor; damgasız istek tarayıcı cache'inden
    // eski görseli getirir.
    return `${row.object_name}?v=${encodeURIComponent(row.timestamp || "")}`;
  }

  function extOf(row) {
    if (isMasked(row)) return "•••";
    const x = /\.([a-z0-9]+)(\?|$)/i.exec(row.object_name || "");
    return x ? x[1].toUpperCase() : "—";
  }

  // ── Eylemler ───────────────────────────────────────────────────────
  const report = ref(null);
  const reportLoading = ref(false);

  async function openDetail(row) {
    detail.value = row;
    report.value = null;
    reportLoading.value = true;
    report.value = await a.fetchReport(row.name);
    reportLoading.value = false;
  }

  function openLightbox(row) {
    if (canThumb(row)) lightbox.value = row;
  }

  /** Bu dosyanın tüm geçmişi — aynı sayfada, dosyaya kilitlenmiş filtre. */
  function filterByFile(row) {
    if (isMasked(row)) return;
    a.fileUrl.value = row.object_name;
    a.applyFilters();
    detail.value = null;
  }

  /** Bu kullanıcının tüm işlemleri. */
  function filterByActor(row) {
    a.actor.value = row.actor;
    a.tenant.value = row.tenant || "";
    a.applyFilters();
    filtersOpen.value = false;
    detail.value = null;
  }

  /** Dosyayı medya panelinde aç — oradan optimize/sil/kullanım görülebilir.
   *
   * Arama dosya ADINDA yapılıyor (`inventory` `file_name` üzerinde `LOCATE`),
   * o yüzden tam yol değil son parça gönderilir. Çöpteki dosya varsayılan
   * listede olmadığı için durum filtresi de taşınır, yoksa panel boş açılır.
   */
  function openInMedia(row) {
    if (isMasked(row) || !row.object_name) return;
    const name = decodeURIComponent(String(row.object_name).split("/").pop());
    const query = { q: name };
    if (row.target_state === "trashed") query.state = "trashed";
    router.push({ path: "/media-optimize", query });
  }

  async function copyTarget(row) {
    try {
      await navigator.clipboard.writeText(row.object_name || "");
    } catch (e) {
      console.warn("Kopyalanamadı:", e?.message || e);
    }
  }

  function refresh() {
    a.load();
    a.loadFacets();
  }


  // ── Klavye kısayolları ─────────────────────────────────────────────
  // Monitoring ekranında fare kullanmadan tarama yapabilmek gerekiyor.
  const cursor = ref(-1);
  const searchEl = ref(null);

  function onKey(e) {
    const tag = (e.target?.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

    if (e.key === "Escape") {
      if (lightbox.value) lightbox.value = null;
      else if (detail.value) detail.value = null;
      else if (filtersOpen.value) filtersOpen.value = false;
      else if (typing) e.target.blur();
      return;
    }
    if (typing) return;

    if (e.key === "/") {
      e.preventDefault();
      nextTick(() => searchEl.value?.focus());
      return;
    }
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      cursor.value = Math.min(cursor.value + 1, a.items.value.length - 1);
      scrollToCursor();
      return;
    }
    if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      cursor.value = Math.max(cursor.value - 1, 0);
      scrollToCursor();
      return;
    }
    if (e.key === "Enter" && cursor.value >= 0) {
      detail.value = a.items.value[cursor.value];
      return;
    }
    if (e.key === "r") refresh();
    if (e.key === "f") filtersOpen.value = true;
    if (e.key === "e") a.exportCsv();
  }

  function scrollToCursor() {
    nextTick(() => {
      document
        .querySelector(`[data-row="${cursor.value}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  // ── Göreli zaman ───────────────────────────────────────────────────
  // "13:48" bir monitoring ekranında az şey söyler; "5 dk önce" olayın
  // tazeliğini anlatır. Tam zaman title'da kalır.
  // Göreli zaman hesabı ortak modülde; metinler burada kalıyor çünkü
  // çeviri anahtarları bu ekranın sözlüğünde (TUR-124).
  function fmtAgo(value) {
    return formatAgo(value, {
      now: t("mediaAudit.ago.now"),
      min: (n) => t("mediaAudit.ago.min", { n }),
      hour: (n) => t("mediaAudit.ago.hour", { n }),
      day: (n) => t("mediaAudit.ago.day", { n }),
      fallback: () => fmtDay(value),
    });
  }

  // ── Yoğunluk ───────────────────────────────────────────────────────
  const DENSITY_KEY = "media-audit-density";
  const density = ref(localStorage.getItem(DENSITY_KEY) || "cozy");
  function toggleDensity() {
    density.value = density.value === "cozy" ? "compact" : "cozy";
    localStorage.setItem(DENSITY_KEY, density.value);
  }

  // ── Hedef durumu ───────────────────────────────────────────────────
  // Önizlemenin neden çıkmadığını satırın kendisi söylesin. Ölçüm: 28 kaydın
  // 11'inde hedef dosya yok, 4'ü maskeli, 2'sinin dosyası silinmiş.
  const TARGET_ICON = {
    none: "minus",
    masked: "shield",
    // `file` kayıtlı değil; `file-text` var (resolveAppIcon eşleşmeyeni null döner).
    unsupported: "file-text",
    deleted: "trash-2",
    trashed: "archive",
    ok: "image",
  };

  const targetIcon = (r) => TARGET_ICON[r.target_state] || "image";
  const targetNote = (r) =>
    r.target_state === "masked" ? maskExplain(r) : t(`mediaAudit.target.${r.target_state || "ok"}`);

  /** Kaydı JSON olarak kopyala — olay bildirimine yapıştırmak için. */
  async function copyJson(row) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    } catch (e) {
      console.warn("Kopyalanamadı:", e?.message || e);
    }
  }

  /** Filtre çekmecesindeki kullanıcı listesi için arama. */
  const actorQuery = ref("");
  const filteredActors = computed(() => {
    const q = actorQuery.value.trim().toLowerCase();
    if (!q) return a.actors.value;
    return a.actors.value.filter(
      (p) => String(p.actor).toLowerCase().includes(q) || String(p.tenant || "").toLowerCase().includes(q)
    );
  });

  const PRESETS = ["denied", "uploads", "deletions", "high"];

  // ── Sıralama ───────────────────────────────────────────────────────
  const SORT_COLS = ["timestamp", "action", "actor", "tenant", "target", "severity"];
  const SORT_DEFAULT_DIR = { timestamp: "desc", severity: "desc" };

  function sortBy(col) {
    if (a.sortBy.value === col) {
      a.sortDir.value = a.sortDir.value === "desc" ? "asc" : "desc";
    } else {
      a.sortBy.value = col;
      a.sortDir.value = SORT_DEFAULT_DIR[col] || "asc";
    }
    a.applyFilters();
  }

  function sortIcon(col) {
    if (a.sortBy.value !== col) return null;
    return a.sortDir.value === "desc" ? "arrow-down" : "arrow-up";
  }

  // ── Filtreler ──────────────────────────────────────────────────────
  let searchTimer = null;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => a.applyFilters(), 300);
  }

  const activeFilterCount = computed(() => chips.value.length);

  const filterGroups = computed(() => [
    {
      id: "action",
      label: t("mediaAudit.filter.action"),
      value: a.action.value,
      set: (v) => {
        a.action.value = v;
        a.applyFilters();
      },
      options: [
        { id: "", label: t("mediaAudit.filter.allActions"), count: a.facets.total },
        ...a.actions.value.map((x) => ({
          id: x,
          label: actionLabel(x),
          count: a.facets.actions?.[x] || 0,
          dot: x.includes("denied") ? "danger" : x.includes("delete") || x.includes("purge") ? "warn" : "ok",
        })),
      ],
    },
    {
      id: "severity",
      label: t("mediaAudit.filter.severity"),
      value: a.severity.value,
      set: (v) => {
        a.severity.value = v;
        a.applyFilters();
      },
      options: [
        { id: "", label: t("mediaAudit.filter.allSeverity") },
        { id: "HIGH", label: t("mediaAudit.severity.high"), count: a.facets.severity?.HIGH || 0, dot: "danger" },
        { id: "NORMAL", label: t("mediaAudit.severity.normal"), count: a.facets.severity?.NORMAL || 0 },
        { id: "LOW", label: t("mediaAudit.severity.low"), count: a.facets.severity?.LOW || 0 },
      ],
    },
    {
      id: "decision",
      label: t("mediaAudit.filter.decision"),
      value: a.decision.value,
      set: (v) => {
        a.decision.value = v;
        a.applyFilters();
      },
      options: [
        { id: "", label: t("mediaAudit.filter.allDecisions") },
        { id: "ALLOW", label: t("mediaAudit.decision.allow"), dot: "ok" },
        { id: "DENY", label: t("mediaAudit.decision.deny"), count: a.facets.denied, dot: "danger" },
      ],
    },
    {
      id: "days",
      label: t("mediaAudit.filter.period"),
      value: a.days.value,
      set: (v) => {
        a.days.value = v;
        a.applyFilters();
      },
      options: DAY_OPTIONS.map((d) => ({
        id: d,
        label: d === 0 ? t("mediaAudit.filter.allTime") : t("mediaAudit.filter.lastDays", { n: d }),
      })),
    },
  ]);

  const chips = computed(() => {
    const out = [];
    if (a.search.value) out.push({ key: "search", label: `"${a.search.value}"` });
    if (a.action.value) out.push({ key: "action", label: actionLabel(a.action.value) });
    if (a.severity.value)
      out.push({ key: "severity", label: t(`mediaAudit.severity.${a.severity.value.toLowerCase()}`) });
    if (a.decision.value)
      out.push({ key: "decision", label: t(`mediaAudit.decision.${a.decision.value.toLowerCase()}`) });
    if (a.actor.value) out.push({ key: "actor", label: a.actor.value });
    if (a.tenant.value) out.push({ key: "tenant", label: a.tenant.value });
    if (a.fileUrl.value) out.push({ key: "fileUrl", label: a.fileUrl.value });
    if (a.days.value) out.push({ key: "days", label: t("mediaAudit.filter.lastDays", { n: a.days.value }) });
    return out;
  });

  /**
   * Çip kaldırma.
   *
   * `MediaFilterChips` iki şey emit eder: tek çipin anahtarı, ve birden fazla
   * çip varken "Tümünü temizle" için `"all"`. `"all"` ele alınmadığı için o
   * bağlantı hiçbir şey yapmıyordu.
   */
  function clearChip(key) {
    if (key === "all") {
      a.reset();
      return;
    }
    const map = {
      search: a.search,
      action: a.action,
      severity: a.severity,
      decision: a.decision,
      actor: a.actor,
      tenant: a.tenant,
      fileUrl: a.fileUrl,
    };
    if (key === "days") a.days.value = 0;
    else if (map[key]) map[key].value = "";
    // Kullanıcı filtresi olan bir çip kaldırılınca aktör/mağaza birlikte düşsün:
    // ikisi tek seçimle atanıyor, tek başına kalan mağaza filtresi şaşırtıyor.
    if (key === "actor") a.tenant.value = "";
    a.applyFilters();
  }

  /** Kanban: olay tipine göre kolonlar — hangi eylemden kaç tane, tek bakışta. */
  const kanbanGroups = computed(() => {
    const map = new Map();
    for (const r of a.items.value) {
      if (!map.has(r.action)) map.set(r.action, []);
      map.get(r.action).push(r);
    }
    return [...map.entries()].map(([id, items]) => ({ id, label: actionLabel(id), items }));
  });

  function changePage(p) {
    a.goToPage(p);
  }
</script>

<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="history" :size="16" class="mpage__title-icon" />
          {{ t("mediaAudit.title") }}
        </h1>
        <p class="mpage__subtitle">
          {{ t("mediaAudit.pageSubtitle", { total: a.facets.total, denied: a.facets.denied }) }}
        </p>
      </div>

      <!-- `v-if` ile kaldırılıyor, Tailwind `hidden` ile değil: scoped stilin
           [data-v] eki `.hidden`'ı ezip bloğu telefonda geri getiriyor. -->
      <div v-if="isDesktop" class="mpage__actions">
        <!-- Canlı izleme: monitoring ekranı kendi kendini tazelemeli -->
        <label class="ma__live" :class="{ 'ma__live--on': a.refreshEvery.value }">
          <AppIcon :name="a.refreshEvery.value ? 'circle-play' : 'clock'" :size="13" />
          <select :value="a.refreshEvery.value" @change="a.setRefresh($event.target.value)">
            <option v-for="s in REFRESH_INTERVALS" :key="s" :value="s">
              {{ s ? t("mediaAudit.live.every", { n: s }) : t("mediaAudit.live.off") }}
            </option>
          </select>
        </label>
        <button type="button" class="hdr-btn-outlined" :title="t('mediaAudit.action.densityHint')" @click="toggleDensity">
          <AppIcon name="list" :size="13" />
          {{ t(`mediaAudit.density.${density}`) }}
        </button>
        <button type="button" class="hdr-btn-outlined" @click="a.exportCsv()">
          <AppIcon name="download" :size="13" />
          {{ t("mediaAudit.action.export") }}
        </button>
        <button type="button" class="hdr-btn-outlined" @click="router.push('/media-optimize')">
          <AppIcon name="image" :size="13" />
          {{ t("mediaAudit.action.toMedia") }}
        </button>
        <button type="button" class="hdr-btn-outlined" :disabled="!activeFilterCount" @click="a.reset()">
          <AppIcon name="rotate-ccw" :size="13" />
          {{ t("mediaAudit.filter.reset") }}
        </button>
        <button type="button" class="hdr-btn-primary" :disabled="a.loading.value" @click="refresh">
          <AppIcon :name="a.loading.value ? 'loader' : 'refresh-cw'" :size="13" :class="a.loading.value ? 'animate-spin' : ''" />
          {{ t("mediaAudit.action.refresh") }}
        </button>
      </div>
    </header>

    <!-- ── Özet kartları ── -->
    <div class="ma__stats">
      <div class="ma__stat">
        <span class="ma__stat-label">{{ t("mediaAudit.stat.total") }}</span>
        <strong>{{ a.facets.total }}</strong>
        <small>{{ t("mediaAudit.stat.totalNote") }}</small>
      </div>
      <div class="ma__stat ma__stat--danger">
        <span class="ma__stat-label">{{ t("mediaAudit.stat.denied") }}</span>
        <strong>{{ a.facets.denied }}</strong>
        <small>{{ t("mediaAudit.stat.deniedNote") }}</small>
        <div v-if="a.facets.denied" class="ma__stat-acts">
          <button type="button" class="ma__mini ma__mini--danger" @click="a.decision.value = 'DENY'; a.applyFilters()">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaAudit.action.showDenied") }}
          </button>
        </div>
      </div>
      <div class="ma__stat ma__stat--good">
        <span class="ma__stat-label">{{ t("mediaAudit.stat.uploads") }}</span>
        <strong>{{ a.facets.actions?.["media.upload"] || 0 }}</strong>
        <small>{{ t("mediaAudit.stat.uploadsNote") }}</small>
        <div v-if="a.facets.actions?.['media.upload']" class="ma__stat-acts">
          <button type="button" class="ma__mini" @click="a.action.value = 'media.upload'; a.applyFilters()">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaAudit.action.showOnly") }}
          </button>
        </div>
      </div>
      <div class="ma__stat ma__stat--warn">
        <span class="ma__stat-label">{{ t("mediaAudit.stat.deletes") }}</span>
        <strong>
          {{ (a.facets.actions?.["media.trash"] || 0) + (a.facets.actions?.["media.delete"] || 0) }}
        </strong>
        <small>{{ t("mediaAudit.stat.deletesNote") }}</small>
        <div class="ma__stat-acts">
          <button type="button" class="ma__mini" @click="a.action.value = 'media.trash'; a.applyFilters()">
            <AppIcon name="eye" :size="12" />
            {{ t("mediaAudit.action.showTrash") }}
          </button>
          <button type="button" class="ma__mini ma__mini--danger" @click="a.action.value = 'media.delete'; a.applyFilters()">
            <AppIcon name="trash-2" :size="12" />
            {{ t("mediaAudit.action.showDelete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Hazır görünümler ── -->
    <div class="ma__presets">
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        class="ma__preset"
        @click="a.applyPreset(p)"
      >
        {{ t(`mediaAudit.preset.${p}`) }}
      </button>
      <span v-if="isDesktop" class="ma__hint">
        <AppIcon name="circle-help" :size="12" />
        {{ t("mediaAudit.shortcuts") }}
      </span>
    </div>

    <!-- ── Araç şeridi ── -->
    <div class="mtoolbar-wrap">
      <div class="card ma__toolbar">
        <div class="ma__search">
          <AppIcon name="search" :size="13" class="ma__search-icon" />
          <input
            ref="searchEl"
            v-model="a.search.value"
            type="text"
            class="form-input-sm w-full !pl-9"
            :placeholder="t('mediaAudit.searchPlaceholder')"
            @input="onSearch"
            @keyup.enter="a.applyFilters()"
          />
          <button
            v-if="a.search.value"
            type="button"
            class="ma__search-clear"
            :aria-label="t('mediaAudit.filter.title')"
            @click="clearChip('search')"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button
          type="button"
          class="hdr-btn-outlined ma__funnel"
          :class="{ 'ma__funnel--on': activeFilterCount }"
          @click="filtersOpen = true"
        >
          <AppIcon name="filter" :size="13" />
          <span class="ma__funnel-text">{{ t("mediaAudit.filter.title") }}</span>
          <span v-if="activeFilterCount" class="ma__funnel-count">{{ activeFilterCount }}</span>
        </button>

        <ViewModeToggle v-if="isDesktop" v-model="viewMode" :modes="VIEW_MODES" />
      </div>
    </div>

    <MediaFilterChips :chips="chips" @clear="clearChip" />

    <!-- ── Liste (varsayılan, mobilde tek mod) ── -->
    <div v-if="effectiveMode === 'list'" class="card ma__list" :class="`ma__list--${density}`">
      <div
        v-for="(r, i) in a.items.value"
        :key="r.name"
        class="ma__row"
        :class="[`ma__row--${tone(r)}`, { 'ma__row--cursor': cursor === i }]"
        :data-row="i"
      >
        <img
          v-if="canThumb(r) && r.target_state === 'ok'"
          class="ma__thumb"
          :src="thumbUrl(r)"
          :alt="r.object_name"
          loading="lazy"
          decoding="async"
          @click="openLightbox(r)"
        />
        <span v-else class="ma__thumb ma__thumb--ph" :title="targetNote(r)">
          <AppIcon :name="targetIcon(r)" :size="14" />
        </span>

        <div class="ma__row-main">
          <span class="ma__row-head">
            <span class="ma__badge" :class="`ma__badge--${tone(r)}`">
              <AppIcon :name="actionIcon(r.action)" :size="11" />
              {{ actionLabel(r.action) }}
            </span>
            <span v-if="r.tenant" class="ma__tenant" :title="r.tenant">
              {{ r.tenant_name || r.tenant }}
            </span>
            <span class="ma__muted" :title="fmtTime(r.timestamp)">{{ fmtAgo(r.timestamp) }}</span>
          </span>
          <span class="ma__target" :class="{ 'ma__target--masked': isMasked(r) }" :title="targetNote(r)">
            <template v-if="isMasked(r)">{{ t("mediaAudit.masked") }}</template>
            <template v-else-if="r.object_name">{{ r.object_name }}</template>
            <template v-else-if="hasBatchFiles(r)">
              {{ batchFiles(r).list[0] }}
              <span v-if="batchFiles(r).list.length > 1 || batchFiles(r).more" class="ma__tstate">
                {{ t("mediaAudit.andMore", { n: batchFiles(r).list.length - 1 + batchFiles(r).more }) }}
              </span>
            </template>
            <template v-else>{{ t("mediaAudit.target.none") }}</template>
            <span v-if="r.target_state === 'deleted' || r.target_state === 'trashed'" class="ma__tstate">
              {{ t(`mediaAudit.targetShort.${r.target_state}`) }}
            </span>
          </span>
          <span class="ma__row-sub">
            <!-- Görünen ad ile e-posta birlikte: aynı hesap iki ekranda iki
                 farklı isimle görünüp çelişki yaratıyordu. -->
            {{ r.actor || "—" }}
            <span v-if="r.actor_display" class="ma__muted">({{ r.actor_display }})</span>
            <template v-if="ctxSummary(r)"> · {{ ctxSummary(r) }}</template>
          </span>
        </div>

        <div class="ma__row-acts">
          <button type="button" class="ma__eye" :title="t('mediaAudit.action.detail')" @click="openDetail(r)">
            <AppIcon name="eye" :size="15" />
          </button>
        </div>
      </div>
      <p v-if="!a.items.value.length" class="ma__empty">
        {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
      </p>
    </div>

    <!-- ── Kart ızgarası ── -->
    <div v-else-if="effectiveMode === 'grid'" class="ma__grid">
      <article v-for="r in a.items.value" :key="r.name" class="card ma__card" :class="`ma__card--${tone(r)}`">
        <button type="button" class="ma__eye ma__eye--card" :title="t('mediaAudit.action.detail')" @click="openDetail(r)">
          <AppIcon name="eye" :size="14" />
        </button>
        <span class="ma__card-ext">{{ extOf(r) }}</span>

        <div class="ma__card-thumb">
          <img
            v-if="canThumb(r) && r.target_state === 'ok'"
            :src="thumbUrl(r)"
            :alt="r.object_name"
            loading="lazy"
            decoding="async"
            @click="openLightbox(r)"
          />
          <span v-else :title="targetNote(r)">
            <AppIcon :name="targetIcon(r)" :size="18" />
          </span>
        </div>

        <div class="ma__card-body">
          <span class="ma__badge" :class="`ma__badge--${tone(r)}`">{{ actionLabel(r.action) }}</span>
          <span class="ma__card-actor" :title="r.actor_display || r.actor">{{ r.actor || "—" }}</span>
          <span v-if="r.tenant" class="ma__tenant" :title="r.tenant">
            {{ r.tenant_name || r.tenant }}
          </span>
          <span class="ma__card-sub">{{ fmtTime(r.timestamp) }}</span>
        </div>
      </article>
      <p v-if="!a.items.value.length" class="ma__empty">
        {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
      </p>
    </div>

    <!-- ── Tablo — sıralanabilir sütunlar (yalnız masaüstü) ── -->
    <div v-else-if="effectiveMode === 'table'" class="card ma__table-wrap">
      <table class="ma__table">
        <thead>
          <tr>
            <th class="ma__col-thumb"></th>
            <th v-for="col in SORT_COLS" :key="col">
              <button type="button" class="ma__sort" @click="sortBy(col)">
                {{ t(`mediaAudit.col.${col === "timestamp" ? "time" : col}`) }}
                <AppIcon v-if="sortIcon(col)" :name="sortIcon(col)" :size="12" />
              </button>
            </th>
            <th>{{ t("mediaAudit.col.detail") }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!a.items.value.length">
            <td colspan="9" class="ma__empty">
              {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
            </td>
          </tr>
          <tr
            v-for="(r, i) in a.items.value"
            v-else
            :key="r.name"
            :class="[`ma__tr--${tone(r)}`, { 'ma__row--cursor': cursor === i }]"
            :data-row="i"
          >
            <td>
              <img
                v-if="canThumb(r) && r.target_state === 'ok'"
                class="ma__thumb"
                :src="thumbUrl(r)"
                :alt="r.object_name"
                loading="lazy"
                decoding="async"
                @click="openLightbox(r)"
              />
              <span v-else class="ma__thumb ma__thumb--ph" :title="targetNote(r)">
                <AppIcon :name="targetIcon(r)" :size="13" />
              </span>
            </td>
            <td class="ma__nowrap ma__muted" :title="fmtTime(r.timestamp)">{{ fmtAgo(r.timestamp) }}</td>
            <td>
              <span class="ma__badge" :class="`ma__badge--${tone(r)}`">
                <AppIcon :name="actionIcon(r.action)" :size="11" />
                {{ actionLabel(r.action) }}
              </span>
            </td>
            <td>
              <button type="button" class="ma__link" :title="r.actor_display || r.actor" @click="filterByActor(r)">
                {{ r.actor || "—" }}
              </button>
            </td>
            <td>
              <span v-if="r.tenant" class="ma__tenant" :title="r.tenant">
                {{ r.tenant_name || r.tenant }}
              </span>
              <span v-else class="ma__muted">—</span>
            </td>
            <td class="ma__cell-target">
              <span v-if="isMasked(r)" class="ma__target--masked" :title="maskExplain(r)">
                <AppIcon name="shield" :size="11" />
                {{ t("mediaAudit.masked") }}
              </span>
              <button
                v-else-if="r.object_name"
                type="button"
                class="ma__link"
                :title="r.object_name"
                @click="filterByFile(r)"
              >
                {{ r.object_name }}
              </button>
              <template v-else-if="hasBatchFiles(r)">
                <span class="ma__break">{{ batchFiles(r).list[0] }}</span>
                <span v-if="batchFiles(r).list.length > 1 || batchFiles(r).more" class="ma__tstate">
                  {{ t("mediaAudit.andMore", { n: batchFiles(r).list.length - 1 + batchFiles(r).more }) }}
                </span>
              </template>
              <span v-else class="ma__muted">{{ t("mediaAudit.target.none") }}</span>
              <span v-if="r.target_state === 'deleted' || r.target_state === 'trashed'" class="ma__tstate">
                {{ t(`mediaAudit.targetShort.${r.target_state}`) }}
              </span>
            </td>
            <td>
              <span class="ma__sev" :class="`ma__sev--${tone(r)}`">
                {{ t(`mediaAudit.severity.${String(r.severity || "normal").toLowerCase()}`) }}
              </span>
            </td>
            <td class="ma__cell-ctx" :title="ctxSummary(r)">{{ ctxSummary(r) || "—" }}</td>
            <td class="ma__row-acts">
              <button type="button" class="ma__eye" :title="t('mediaAudit.action.detail')" @click="openDetail(r)">
                <AppIcon name="eye" :size="15" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Kanban — olay tipine göre kolonlar (yalnız masaüstü) ── -->
    <div v-else class="ma__kanban">
      <section v-for="col in kanbanGroups" :key="col.id" class="card ma__kcol">
        <header class="ma__kcol-head">
          <span>{{ col.label }}</span>
          <span class="ma__kcol-count">{{ col.items.length }}</span>
        </header>
        <div class="ma__kcol-body">
          <div
            v-for="r in col.items"
            :key="r.name"
            class="ma__kcard"
            :class="`ma__card--${tone(r)}`"
            @click="openDetail(r)"
          >
            <img
              v-if="canThumb(r)"
              class="ma__thumb"
              :src="thumbUrl(r)"
              :alt="r.object_name"
              loading="lazy"
              decoding="async"
            />
            <span v-else class="ma__thumb ma__thumb--ph">
              <AppIcon v-if="isMasked(r)" name="shield" :size="13" />
              <template v-else>{{ extOf(r) }}</template>
            </span>
            <div class="ma__kcard-main">
              <span class="ma__kcard-actor" :title="r.actor_display || r.actor">{{ r.actor || "—" }}</span>
              <span class="ma__muted">{{ fmtDay(r.timestamp) }} {{ fmtClock(r.timestamp) }}</span>
            </div>
          </div>
          <p v-if="!col.items.length" class="ma__kcol-empty">—</p>
        </div>
      </section>
      <p v-if="!kanbanGroups.length" class="ma__empty">
        {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
      </p>
    </div>

    <!-- Mobil birincil aksiyon: masaüstündeki "Yenile" karşılığı. -->
    <button v-if="!isDesktop" type="button" class="ma__fab" :disabled="a.loading.value" @click="refresh">
      <AppIcon name="refresh-cw" :size="16" />
      {{ t("mediaAudit.action.refresh") }}
    </button>

    <div class="mpage__pagination">
      <ListPagination
        :model-value="a.page.value"
        :total="a.total.value"
        :page-size="a.pageSize.value"
        :page-size-options="[25, 50, 100]"
        @update:model-value="changePage"
        @update:page-size="
          (s) => {
            a.pageSize.value = s;
            a.applyFilters();
          }
        "
      />
    </div>

    <!-- ── Filtre çekmecesi — MediaOptimizeView ile aynı kalıp ── -->
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
                  {{ t("mediaAudit.filter.title") }}
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
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#22222c]"
                :aria-label="t('mediaAudit.close')"
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
                    <input type="radio" :name="`ma-f-${g.id}`" :checked="g.value === opt.id" @change="g.set(opt.id)" />
                    <span v-if="opt.dot" class="ma__dot" :class="`ma__dot--${opt.dot}`" />
                    {{ opt.label }}
                    <span v-if="opt.count !== undefined" class="ma__optcount">{{ opt.count }}</span>
                  </label>
                </div>
              </div>

              <div v-if="a.targets.value.length" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ t("mediaAudit.filter.topTargets") }}
                </label>
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="tg in a.targets.value"
                    :key="tg.object_name"
                    type="button"
                    class="ma__topitem"
                    @click="
                      a.fileUrl.value = tg.object_name;
                      a.applyFilters();
                      filtersOpen = false;
                    "
                  >
                    <span class="ma__fopt-name">
                      {{ String(tg.object_name).startsWith("masked:") ? t("mediaAudit.masked") : tg.object_name }}
                    </span>
                    <span class="ma__optcount">{{ tg.n }}</span>
                  </button>
                </div>
              </div>

              <div v-if="a.actors.value.length" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ t("mediaAudit.filter.actor") }}
                  <span class="ma__optcount">{{ filteredActors.length }}/{{ a.actors.value.length }}</span>
                </label>
                <input
                  v-model="actorQuery"
                  type="search"
                  class="form-input-sm w-full mb-2"
                  :placeholder="t('mediaAudit.filter.actorSearch')"
                />
                <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  <label class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="ma-f-actor"
                      :checked="!a.actor.value"
                      @change="
                        a.actor.value = '';
                        a.tenant.value = '';
                        a.applyFilters();
                      "
                    />
                    {{ t("mediaAudit.filter.allActors") }}
                  </label>
                  <label
                    v-for="p in filteredActors"
                    :key="`${p.actor}:${p.tenant}`"
                    class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="radio"
                      name="ma-f-actor"
                      :checked="a.actor.value === p.actor"
                      @change="filterByActor(p)"
                    />
                    <span class="ma__fopt-name">{{ p.actor }}</span>
                    <span v-if="p.tenant" class="ma__tenant" :title="p.tenant">{{ p.tenant_name || p.tenant }}</span>
                    <span class="ma__optcount">{{ p.n }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-gray-200 dark:border-[#2a2a35] flex gap-2">
              <button type="button" class="hdr-btn-outlined flex-1" @click="a.reset()">
                {{ t("mediaAudit.filter.reset") }}
              </button>
              <button type="button" class="hdr-btn-primary flex-1" @click="filtersOpen = false">
                {{ t("mediaAudit.filter.apply") }}
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Detay penceresi — olayın insan diliyle açıklaması ── -->
    <Teleport to="body">
      <div v-if="detail" class="ma__scrim" @click.self="detail = null">
        <section class="ma__detail" role="dialog" aria-modal="true">
          <header class="ma__detail-head">
            <div class="ma__detail-title">
              <span class="ma__badge" :class="`ma__badge--${tone(detail)}`">
                <AppIcon :name="actionIcon(detail.action)" :size="12" />
                {{ actionLabel(detail.action) }}
              </span>
              <span class="ma__muted">{{ fmtTime(detail.timestamp) }}</span>
              <span class="ma__detail-who">
                <template v-if="detail.tenant_name">{{ detail.tenant_name }} · </template>
                {{ detail.actor || "—" }}
                <template v-if="detail.actor_display"> · {{ detail.actor_display }}</template>
              </span>
            </div>
            <button type="button" class="ma__eye" :aria-label="t('mediaAudit.close')" @click="detail = null">
              <AppIcon name="x" :size="18" />
            </button>
          </header>

          <!-- Ne olduğunun tek cümlelik cevabı -->
          <p class="ma__explain" :class="`ma__explain--${tone(detail)}`">
            <AppIcon :name="isDenied(detail) ? 'shield' : 'circle-check'" :size="15" />
            {{ explain(detail) }}
          </p>

          <!-- Erişim seviyesi: rozet + çevirme + imzalı paylaşım (TUR-126 §4.2) -->
          <div v-if="!isMasked(detail) && accessLevelOf(detail)" class="ma__access">
            <span
              class="ma__badge"
              :class="accessLevelOf(detail) === 'private' ? 'ma__badge--warn' : ''"
            >
              <AppIcon :name="accessLevelOf(detail) === 'private' ? 'lock' : 'globe'" :size="12" />
              {{ t(`mediaAccess.badge.${accessLevelOf(detail)}`) }}
            </span>
            <button
              v-if="accessLevelOf(detail) === 'private'"
              type="button"
              class="hdr-btn-outlined"
              :disabled="access.busy.value"
              :title="t('mediaAccess.action.signedLinkHint')"
              @click="copySignedLink(detail)"
            >
              <AppIcon name="link" :size="13" />
              {{ t("mediaAccess.action.signedLink") }}
            </button>
            <button
              type="button"
              class="hdr-btn-outlined"
              :disabled="access.busy.value"
              @click="askToggleAccess(detail)"
            >
              <AppIcon :name="accessLevelOf(detail) === 'private' ? 'globe' : 'lock'" :size="13" />
              {{
                accessLevelOf(detail) === "private"
                  ? t("mediaAccess.action.makePublic")
                  : t("mediaAccess.action.makePrivate")
              }}
            </button>
          </div>

          <!-- Maskeliyse neden maskelendiği -->
          <p v-if="isMasked(detail)" class="ma__mask-note">
            <AppIcon name="lock" :size="13" />
            {{ maskExplain(detail) }}
          </p>

          <p v-if="detail.target_state && detail.target_state !== 'ok' && !isMasked(detail)" class="ma__mask-note">
            <AppIcon :name="targetIcon(detail)" :size="13" />
            {{ targetNote(detail) }}
          </p>

          <div v-if="canThumb(detail) && detail.target_state === 'ok'" class="ma__detail-preview">
            <img :src="thumbUrl(detail)" :alt="detail.object_name" @click="openLightbox(detail)" />
          </div>

          <div v-if="reportLoading" class="ma__rep-loading">{{ t("mediaAudit.report.loading") }}</div>

          <template v-else-if="report">
            <!-- ETKİ — silme kararının tek sayısal karşılığı -->
            <div v-if="report.impact" class="ma__impact">
              <div class="ma__impact-cell">
                <span>{{ t("mediaAudit.report.liveProducts") }}</span>
                <strong>{{ report.impact.live_products }}</strong>
              </div>
              <div class="ma__impact-cell">
                <span>{{ t("mediaAudit.report.orderCopies") }}</span>
                <strong>{{ report.impact.order_copies }}</strong>
              </div>
              <div class="ma__impact-cell">
                <span>{{ t("mediaAudit.report.verdict") }}</span>
                <strong :class="`ma__verdict--${report.impact.verdict}`">
                  {{ t(`mediaUsage.verdict.${report.impact.verdict}`) }}
                </strong>
              </div>
              <div class="ma__impact-cell">
                <span>{{ t("mediaAudit.report.redundant") }}</span>
                <strong>{{ report.impact.redundant_records }}</strong>
              </div>
            </div>

            <!-- NEREDE KULLANILIYOR — hangi ürün, hangi alan, varyant mı -->
            <section v-if="report.usage?.usages?.length" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.usedIn", { n: report.impact?.live_products || 0 }) }}</h4>
              <ul class="ma__uselist">
                <li v-for="(u, i) in report.usage.usages" :key="i">
                  <span class="ma__use-label">{{ u.label || u.name }}</span>
                  <span class="ma__use-meta">{{ u.doctype }} · {{ u.name }}</span>
                  <span class="ma__chip-slot">
                    {{ u.field }}<template v-if="u.variant"> · {{ u.variant }}</template>
                    <template v-if="u.variant_sku"> · {{ u.variant_sku }}</template>
                    <template v-if="u.position"> #{{ u.position }}</template>
                    <b v-if="u.is_default">★</b>
                  </span>
                  <span v-if="u.status" class="ma__use-status">{{ u.status }}</span>
                </li>
              </ul>
            </section>

            <section v-if="report.usage?.orders?.length" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.orders", { n: report.usage.orders.length }) }}</h4>
              <p class="ma__rep-note">{{ t("mediaUsage.orderNote") }}</p>
              <div class="ma__chips">
                <span v-for="(o, i) in report.usage.orders" :key="i" class="ma__chip-neutral">
                  {{ o.field }} · {{ o.name }}
                </span>
              </div>
            </section>

            <!-- TOPLU SİLMEDE: hangi dosyalar silindi -->
            <section v-if="hasBatchFiles(detail)" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.deletedFiles", { n: batchFiles(detail).list.length }) }}</h4>
              <ul class="ma__filelist">
                <li v-for="fn in batchFiles(detail).list" :key="fn">{{ fn }}</li>
              </ul>
              <p v-if="batchFiles(detail).more" class="ma__rep-note">
                {{ t("mediaAudit.report.moreFiles", { n: batchFiles(detail).more }) }}
              </p>
            </section>

            <!-- DOSYA KÜNYESİ -->
            <section v-if="report.file?.exists" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.fileCard") }}</h4>
              <dl class="ma__dl">
                <dt>{{ t("mediaAudit.report.fileName") }}</dt>
                <dd class="ma__break">{{ report.file.file_name }}</dd>
                <dt>{{ t("mediaAudit.report.size") }}</dt>
                <dd>
                  {{ formatSize(report.file.file_size) }}
                  <span v-if="report.file.original_size" class="ma__gain">
                    ← {{ formatSize(report.file.original_size) }}
                  </span>
                </dd>
                <dt>{{ t("mediaAudit.report.uploadedAt") }}</dt>
                <dd>{{ fmtTime(report.file.created) }}</dd>
                <template v-if="report.file.optimized_at">
                  <dt>{{ t("mediaAudit.report.optimizedAt") }}</dt>
                  <dd>{{ fmtTime(report.file.optimized_at) }}</dd>
                </template>
                <template v-if="report.file.trashed_at">
                  <dt>{{ t("mediaAudit.report.trashedAt") }}</dt>
                  <dd>{{ fmtTime(report.file.trashed_at) }}</dd>
                </template>
                <dt>{{ t("mediaAudit.report.recordCount") }}</dt>
                <dd>
                  {{ report.file.record_count }}
                  <span v-if="report.file.record_count > 1" class="ma__tstate">
                    {{ t("mediaAudit.report.duplicate") }}
                  </span>
                </dd>
                <dt>{{ t("mediaAudit.report.hash") }}</dt>
                <dd class="ma__mono ma__break">{{ report.file.content_hash || "—" }}</dd>
              </dl>
            </section>

            <!-- AKTÖR -->
            <section v-if="report.actor?.user" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.actorCard") }}</h4>
              <dl class="ma__dl">
                <dt>{{ t("mediaAudit.col.actor") }}</dt>
                <dd class="ma__who">
                  <button type="button" class="ma__link ma__who-name" @click="filterByActor(detail)">
                    {{ report.actor.user }}
                  </button>
                  <!-- Görünen ad ikincil: kimlik her zaman hesabın kendisi.
                       `User.full_name` alanına mağaza adı girilmiş hesaplar var. -->
                  <span v-if="report.actor.full_name && report.actor.full_name !== report.actor.user" class="ma__who-mail">
                    {{ report.actor.full_name }}
                  </span>
                </dd>
                <template v-if="report.actor.tenant">
                  <dt>{{ t("mediaAudit.col.tenant") }}</dt>
                  <dd class="ma__who">
                    <span class="ma__who-name">{{ report.actor.tenant_name || report.actor.tenant }}</span>
                    <span class="ma__who-mail">{{ report.actor.tenant }}</span>
                  </dd>
                </template>
                <dt>{{ t("mediaAudit.report.roles") }}</dt>
                <dd class="ma__chips">
                  <span v-for="r in (report.actor.roles || []).slice(0, 8)" :key="r" class="ma__chip-neutral">
                    {{ r }}
                  </span>
                  <span v-if="(report.actor.roles || []).length > 8" class="ma__muted">
                    +{{ report.actor.roles.length - 8 }}
                  </span>
                </dd>
                <dt>{{ t("mediaAudit.report.last24h") }}</dt>
                <dd>
                  {{ t("mediaAudit.report.actions", { n: report.actor.last24h_total || 0 }) }}
                  <span v-if="report.actor.last24h?.DENY" class="ma__tstate">
                    {{ t("mediaAudit.report.deniedN", { n: report.actor.last24h.DENY }) }}
                  </span>
                </dd>
                <template v-if="detail.ip_address">
                  <dt>IP</dt>
                  <dd class="ma__mono">{{ detail.ip_address }}</dd>
                </template>
              </dl>
            </section>

            <!-- DOSYA GEÇMİŞİ -->
            <section v-if="report.history?.length > 1" class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.history", { n: report.history.length }) }}</h4>
              <ol class="ma__timelist">
                <li v-for="h in report.history" :key="h.name" :class="{ 'ma__timelist--cur': h.name === detail.name }">
                  <span class="ma__badge" :class="`ma__badge--${h.decision === 'DENY' ? 'danger' : ''}`">
                    {{ actionLabel(h.action) }}
                  </span>
                  <span class="ma__muted" :title="fmtTime(h.timestamp)">{{ fmtAgo(h.timestamp) }}</span>
                  <span class="ma__use-meta" :title="h.actor">{{ h.actor }}</span>
                </li>
              </ol>
            </section>

            <!-- OLAY KAYDI + BÜTÜNLÜK -->
            <section class="ma__rep-block">
              <h4>{{ t("mediaAudit.report.recordCard") }}</h4>
              <dl class="ma__dl">
                <dt>{{ t("mediaAudit.col.decision") }}</dt>
                <dd>{{ t(`mediaAudit.decision.${String(detail.decision || "allow").toLowerCase()}`) }}</dd>
                <dt>{{ t("mediaAudit.col.severity") }}</dt>
                <dd>{{ t(`mediaAudit.severity.${String(detail.severity || "normal").toLowerCase()}`) }}</dd>
                <template v-for="p in ctxPairs(detail)" :key="p.key">
                  <dt>{{ p.label }}</dt>
                  <dd class="ma__break">{{ p.value }}</dd>
                </template>
                <dt>{{ t("mediaAudit.report.integrity") }}</dt>
                <dd>
                  <span v-if="report.integrity?.intact === true" class="ma__ok">
                    <AppIcon name="circle-check" :size="12" /> {{ t("mediaAudit.report.intact") }}
                  </span>
                  <span v-else-if="report.integrity?.intact === false" class="ma__danger">
                    <AppIcon name="circle-alert" :size="12" /> {{ t("mediaAudit.report.tampered") }}
                  </span>
                  <span v-else class="ma__muted">{{ t("mediaAudit.report.unverified") }}</span>
                </dd>
                <dt>{{ t("mediaAudit.report.retention") }}</dt>
                <dd>{{ report.retention?.note }}</dd>
                <dt>{{ t("mediaAudit.col.record") }}</dt>
                <dd class="ma__mono">{{ detail.name }}</dd>
              </dl>
            </section>
          </template>

          <footer class="ma__detail-foot">
            <button type="button" class="hdr-btn-outlined" @click="copyJson(detail)">
              <AppIcon name="copy" :size="13" />
              {{ t("mediaAudit.action.copyJson") }}
            </button>
            <template v-if="!isMasked(detail)">
            <button type="button" class="hdr-btn-outlined" @click="copyTarget(detail)">
              <AppIcon name="copy" :size="13" />
              {{ t("mediaAudit.action.copy") }}
            </button>
            <button type="button" class="hdr-btn-outlined" @click="filterByFile(detail)">
              <AppIcon name="history" :size="13" />
              {{ t("mediaAudit.action.fileHistory") }}
            </button>
            <button type="button" class="hdr-btn-primary" @click="openInMedia(detail)">
              <AppIcon name="image" :size="13" />
              {{ t("mediaAudit.action.openInMedia") }}
            </button>
            </template>
          </footer>
        </section>
      </div>
    </Teleport>

    <!-- ── Görsel büyütme ── -->
    <Teleport to="body">
      <div v-if="lightbox" class="ma__lightbox" @click="lightbox = null">
        <img :src="thumbUrl(lightbox)" :alt="lightbox.object_name" />
        <span class="ma__lightbox-cap">{{ lightbox.object_name }}</span>
      </div>
    </Teleport>

    <!-- Erişim seviyesi onayı — public→private'ta eski URL 404 olur -->
    <ConfirmDialog
      :open="!!accessConfirm"
      :title="t('mediaAccess.confirm.title')"
      :message="
        accessConfirm?.makePrivate
          ? t('mediaAccess.confirm.makePrivate', { name: accessConfirm?.row?.object_name || '' })
          : t('mediaAccess.confirm.makePublic', { name: accessConfirm?.row?.object_name || '' })
      "
      :confirm-label="t('mediaAccess.confirm.ok')"
      tone="warning"
      @confirm="onToggleAccess"
      @cancel="accessConfirm = null"
      @update:open="(v) => !v && (accessConfirm = null)"
    />
  </div>
</template>


<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Yerleşim ve başlık ölçüleri MediaOptimizeView ile birebir aynı. O sayfada
  // bu kurallar SCOPED tanımlı, yani sınıf adını paylaşmak yetmiyor — kuralların
  // burada da bulunması gerekiyor, aksi hâlde sayfa stilsiz kalıyor.
  .mpage {
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;

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

    // base.scss'teki global `html.dark header` kuralı buraya kart zemini basıyor.
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
  // Telefonda 2×2, masaüstünde 4 yan yana. `auto-fit` ara genişliklerde
  // 3+1 gibi tek kartlık artık satır üretiyor.
  .ma__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .ma__stat {
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

  .ma__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .ma__stat--danger strong {
    color: $c-error;
  }

  .ma__stat--warn strong {
    color: $c-warning;
  }

  .ma__stat--good strong {
    color: $c-success;
  }

  .ma__stat-acts {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.35rem;
    flex-wrap: wrap;
  }

  .ma__mini {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
    border: 1px solid $l-border;
    background: none;
    cursor: pointer;
    color: inherit;
    @include media.text("xs");
    @include media.hoverable;

    @include dark {
      border-color: $d-border;
    }
  }

  .ma__mini--danger {
    color: $c-error;
  }

  // ── Araç şeridi ──────────────────────────────────────────────────
  .mtoolbar-wrap {
    position: sticky;
    // Header (56px) aynı scroll kabında sticky; 0 verilirse arkasına girer.
    top: media.$m-sticky-top;
    z-index: 20;
    margin-bottom: media.$s-3;
  }

  .ma__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    flex-wrap: wrap;
  }

  .ma__search {
    position: relative;
    flex: 1 1 14rem;
    min-width: 12rem;
  }

  .ma__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $l-text-300;
  }

  .ma__search-clear {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    @include media.icon-button;
  }

  .ma__funnel--on {
    border-color: $brand;
    color: $brand;
  }

  .ma__funnel-count {
    @include media.chip("brand");
    margin-left: 0.3rem;
  }

  // ── Ortak parçalar ───────────────────────────────────────────────
  .ma__thumb {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    object-fit: cover;
    border-radius: 0.3rem;
    background: $l-bg-muted;
    cursor: zoom-in;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .ma__thumb--ph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed $l-border;
    cursor: default;
    @include media.text("xs");
    font-weight: 600;
    @include media.muted(2);

    @include dark {
      border-color: $d-border;
    }
  }

  .ma__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    @include media.chip("neutral");
  }

  .ma__badge--danger {
    color: $c-error;
    background: rgb(239 68 68 / 14%);
  }

  .ma__badge--warn {
    color: $c-warning;
    background: rgb(245 158 11 / 14%);
  }

  .ma__tenant {
    @include media.chip("info");
  }

  .ma__sev--danger {
    color: $c-error;
  }

  .ma__sev--warn {
    color: $c-warning;
  }

  .ma__muted {
    @include media.muted(2);
    white-space: nowrap;
  }

  .ma__mono {
    font-family: ui-monospace, monospace;
  }

  .ma__break {
    word-break: break-all;
  }

  .ma__link {
    background: none;
    border: none;
    padding: 0;
    color: $brand;
    cursor: pointer;
    text-align: left;
    max-width: 100%;
    @include media.text("xs");
    @include media.truncate;

    &:hover {
      text-decoration: underline;
    }
  }

  .ma__eye {
    @include media.icon-button;
    @include media.focus-ring;
  }

  .ma__row-acts {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
  }

  .ma__target {
    display: block;
    max-width: 22rem;
    @include media.text("xs");
    @include media.truncate;
  }

  .ma__target--masked {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: $c-warning;
  }

  // ── Liste ────────────────────────────────────────────────────────
  .ma__list {
    display: flex;
    flex-direction: column;
  }

  .ma__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    border-inline-start: 2px solid transparent;
    @include media.divider(bottom);
    @include media.hoverable;

    &:last-child {
      border-bottom: none;
    }
  }

  .ma__row--danger,
  .ma__tr--danger,
  .ma__card--danger {
    border-inline-start: 2px solid $c-error;
  }

  .ma__row--warn,
  .ma__tr--warn,
  .ma__card--warn {
    border-inline-start: 2px solid $c-warning;
  }

  .ma__row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .ma__row-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .ma__row-sub {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    @include media.text("xs");
    @include media.muted(1);
    @include media.truncate;
  }

  // ── Izgara ───────────────────────────────────────────────────────
  .ma__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: media.$s-3;
  }

  .ma__card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @include media.hoverable;
  }

  .ma__card-ext {
    position: absolute;
    top: 0.4rem;
    left: 0.4rem;
    z-index: 1;
    padding: 0.05rem 0.3rem;
    border-radius: 0.25rem;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .ma__eye--card {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    z-index: 1;
  }

  .ma__card-thumb {
    aspect-ratio: 1;
    background: $l-bg-muted;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      cursor: zoom-in;
    }

    span {
      @include media.muted(2);
    }

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .ma__card-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
    padding: media.$s-2 media.$s-2 media.$s-3;
  }

  .ma__card-actor {
    max-width: 100%;
    @include media.text("xs");
    @include media.truncate;
  }

  .ma__card-sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  // ── Tablo ────────────────────────────────────────────────────────
  .ma__table-wrap {
    overflow-x: auto;
  }

  .ma__table {
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
      white-space: nowrap;
    }

    tbody tr {
      @include media.hoverable;
    }
  }

  .ma__col-thumb {
    width: 40px;
  }

  .ma__sort {
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

  .ma__nowrap {
    white-space: nowrap;
  }

  .ma__cell-target {
    max-width: 18rem;
  }

  .ma__cell-ctx {
    max-width: 16rem;
    @include media.truncate;
    @include media.muted(2);
  }

  // ── Kanban ───────────────────────────────────────────────────────
  .ma__kanban {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: media.$s-3;
    align-items: start;
  }

  .ma__kcol {
    display: flex;
    flex-direction: column;
    max-height: 34rem;
  }

  .ma__kcol-head {
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

  .ma__kcol-count {
    @include media.chip("neutral");
  }

  .ma__kcol-body {
    overflow-y: auto;
    padding: media.$s-2;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .ma__kcard {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem;
    border-radius: 0.4rem;
    border-inline-start: 2px solid transparent;
    cursor: pointer;
    @include media.hoverable;
  }

  .ma__kcard-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .ma__kcard-actor {
    @include media.text("xs");
    @include media.truncate;
  }

  .ma__kcol-empty {
    text-align: center;
    padding: media.$s-3;
    @include media.muted(2);
  }

  // ── FAB ──────────────────────────────────────────────────────────
  .ma__fab {
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

  // ── Detay ────────────────────────────────────────────────────────
  .ma__scrim {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: media.$s-4;
    background: rgb(0 0 0 / 50%);
  }

  .ma__detail {
    width: min(36rem, 100%);
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 0.8rem;
    background: $l-bg;
    box-shadow: 0 16px 56px rgb(0 0 0 / 30%);

    @include dark {
      background: $d-bg-card;
    }
  }

  .ma__detail-head {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-4 media.$s-5;
    background: $l-bg;
    @include media.divider(bottom);

    @include dark {
      background: $d-bg-card;
    }
  }

  .ma__detail-title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .ma__explain {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin: media.$s-4 media.$s-5 0;
    padding: media.$s-3;
    border-radius: 0.5rem;
    line-height: 1.5;
    @include media.surface("soft");
    @include media.text("sm");
  }

  .ma__explain--danger {
    color: $c-error;
  }

  .ma__explain--warn {
    color: $c-warning;
  }

  .ma__mask-note {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin: media.$s-2 media.$s-5 0;
    line-height: 1.45;
    @include media.text("xs");
    @include media.muted(1);
  }

  // Erişim seviyesi şeridi (TUR-126) — rozet solda, aksiyonlar yanında.
  .ma__access {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: media.$s-2;
    margin: media.$s-3 media.$s-5 0;
  }

  .ma__detail-preview {
    margin: media.$s-4 media.$s-5 0;

    img {
      width: 100%;
      // `max-height` DEĞİL sabit `height`: üst sınır, yükseklik yine de
      // içerikten türer demektir — görsel inene kadar kutu 0 yüksekliğinde
      // durur ve indiğinde altındaki rapor bloğu 240px aşağı zıplardı.
      // Sabit kutu + `contain` ile oran korunur, düzen kaymaz.
      height: 15rem;
      object-fit: contain;
      border-radius: 0.5rem;
      background: $l-bg-muted;
      cursor: zoom-in;

      @include dark {
        background: $d-bg-elevated;
      }
    }
  }

  .ma__dl {
    display: grid;
    // Etiket sütunu sabit: değerler her bölümde aynı hizada başlar.
    grid-template-columns: 8.5rem 1fr;
    gap: media.$s-2 media.$s-3;
    margin: 0;
    padding: 0;
    @include media.text("sm");

    dt {
      @include media.text("xs");
      @include media.muted(1);
      padding-top: 1px;
    }

    dd {
      margin: 0;
      min-width: 0;
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
      gap: 0 0;

      dd {
        margin-bottom: media.$s-2;
      }
    }
  }

  .ma__detail-foot {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-5 media.$s-4;
    margin-top: media.$s-4;
    flex-wrap: wrap;
    background: $l-bg;
    @include media.divider(top);

    @include dark {
      background: $d-bg-card;
    }
  }

  // ── Görsel büyütme ───────────────────────────────────────────────
  .ma__lightbox {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: media.$s-3;
    padding: media.$s-4;
    background: rgb(0 0 0 / 82%);
    cursor: zoom-out;

    img {
      max-width: 92vw;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 0.4rem;
    }
  }

  .ma__lightbox-cap {
    color: #fff;
    text-align: center;
    word-break: break-all;
    @include media.text("xs");
  }

  // ── Diğer ────────────────────────────────────────────────────────
  .ma__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: $l-text-400;
  }

  .ma__dot--ok {
    background: $c-success;
  }

  .ma__dot--warn {
    background: $c-warning;
  }

  .ma__dot--danger {
    background: $c-error;
  }

  .ma__optcount {
    margin-left: auto;
    @include media.muted(2);
  }

  .ma__fopt-name {
    max-width: 10rem;
    @include media.truncate;
  }


  // ── Hazır görünümler ─────────────────────────────────────────────
  .ma__presets {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin-bottom: media.$s-3;
    flex-wrap: wrap;
  }

  .ma__preset {
    padding: 0.2rem 0.6rem;
    border-radius: media.$r-pill;
    border: 1px solid $l-border;
    background: none;
    color: inherit;
    cursor: pointer;
    @include media.text("xs");
    @include media.hoverable;

    @include dark {
      border-color: $d-border;
    }
  }

  .ma__hint {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-inline-start: auto;
    @include media.text("xs");
    @include media.muted(2);
  }

  // ── Canlı yenileme ───────────────────────────────────────────────
  .ma__live {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.4rem;
    border: 1px solid $l-border;
    @include media.text("xs");

    select {
      border: none;
      background: none;
      color: inherit;
      outline: none;
      cursor: pointer;
      font: inherit;
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .ma__live--on {
    border-color: $c-success;
    color: $c-success;
  }

  // ── Yoğunluk ─────────────────────────────────────────────────────
  .ma__list--compact .ma__row {
    padding-block: 0.25rem;
  }

  .ma__list--compact .ma__row-sub {
    display: none;
  }

  // Klavye imleci — j/k ile gezinirken hangi satırdayız.
  .ma__row--cursor {
    outline: 2px solid $brand;
    outline-offset: -2px;
  }

  .ma__tstate {
    margin-inline-start: 0.3rem;
    @include media.chip("warning");
  }

  .ma__topitem {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    background: none;
    border: none;
    padding: 0.1rem 0;
    cursor: pointer;
    color: inherit;
    @include media.text("xs");

    &:hover {
      color: $brand;
    }
  }


  // ── Rapor blokları ───────────────────────────────────────────────
  // Okunabilirlik kararları: bölümler arası nefes, bölüm içi sıkı. Etiket
  // sütunu sabit genişlikte ki değerler aynı hizada başlasın.
  .ma__rep-loading {
    padding: media.$s-6 media.$s-4;
    text-align: center;
    @include media.muted(2);
  }

  .ma__impact {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin: media.$s-4 media.$s-5 0;

    @media (min-width: 560px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .ma__impact-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: media.$s-3 media.$s-2;
    border-radius: 0.5rem;
    text-align: center;
    @include media.surface("soft");

    span {
      @include media.text("xs");
      @include media.muted(1);
    }

    strong {
      font-size: 1.05rem;
      font-weight: 700;
      @include media.numeric;
    }
  }

  .ma__verdict--in_use {
    color: $c-success;
  }

  .ma__verdict--unused {
    color: $c-error;
  }

  .ma__verdict--order_only,
  .ma__verdict--history_only {
    color: $c-warning;
  }

  // Bölümler arasında belirgin ayrım — uzun raporda göz kaybolmasın.
  .ma__rep-block {
    padding: media.$s-4 media.$s-5 0;

    & + .ma__rep-block {
      margin-top: media.$s-3;
      padding-top: media.$s-4;
      @include media.divider(top);
    }

    h4 {
      margin: 0 0 media.$s-2;
      @include media.text("xs");
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      @include media.muted(1);
    }
  }

  .ma__rep-note {
    margin: 0 0 media.$s-2;
    @include media.text("xs");
    @include media.muted(2);
  }

  .ma__uselist {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      padding: media.$s-2 0;

      & + li {
        @include media.divider(top);
      }
    }
  }

  .ma__use-label {
    font-weight: 600;
    @include media.text("sm");
    flex: 1 1 auto;
    min-width: 0;
    @include media.truncate;
  }

  .ma__use-meta {
    @include media.text("xs");
    @include media.muted(2);
  }

  .ma__use-status {
    @include media.chip("success");
  }

  .ma__chip-slot {
    @include media.chip("brand");
  }

  .ma__chip-neutral {
    @include media.chip("neutral");
  }

  .ma__chips {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .ma__timelist {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;

      & + li {
        @include media.divider(top);
      }
    }
  }

  .ma__timelist--cur {
    outline: 1px solid $brand;
    outline-offset: 2px;
    border-radius: 0.25rem;
  }

  .ma__filelist {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow-y: auto;

    li {
      padding: 0.25rem 0;
      word-break: break-all;
      font-family: ui-monospace, monospace;
      @include media.text("xs");

      & + li {
        @include media.divider(top);
      }
    }
  }

  .ma__gain {
    color: $c-success;
  }

  .ma__ok {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: $c-success;
  }

  .ma__danger {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: $c-error;
  }

  .ma__who {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .ma__who-name {
    font-weight: 600;
    @include media.text("sm");
  }

  .ma__who-mail {
    font-family: ui-monospace, monospace;
    @include media.text("xs");
    @include media.muted(2);
  }

  .ma__detail-who {
    @include media.text("xs");
    @include media.muted(1);
  }



  .ma__empty {
    padding: 3rem;
    text-align: center;
    @include media.muted(2);
  }
</style>

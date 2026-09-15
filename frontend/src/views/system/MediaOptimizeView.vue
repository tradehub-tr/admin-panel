<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import MediaRecordDialog from "@/components/media/MediaRecordDialog.vue";
  import MediaRetroRenameCard from "@/components/media/MediaRetroRenameCard.vue";
  import MediaUsageDialog from "@/components/media/MediaUsageDialog.vue";
  import MediaDensityToggle from "@/components/media/MediaDensityToggle.vue";
  import { useCardGridWindow } from "@/components/media/useCardGridWindow";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useMediaAccess } from "@/composables/useMediaAccess";
  import { useMediaDensity } from "@/composables/useMediaDensity.js";
  import { useMediaOptimize } from "@/composables/useMediaOptimize";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const auth = useAuthStore();
  const m = useMediaOptimize();
  const access = useMediaAccess();
  const toast = useToast();

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

  // ── Erişim seviyesi (TUR-126 §4.2) ──
  // Normal envanter public dosyaları listeler (→ "Özele taşı"); "Özel
  // dosyalar" görünümü private olanları (→ "Herkese aç" + imzalı link).
  // PII (KYB/KYC) bağlı dosya public YAPILAMAZ — backend zorlar, UI gizler.
  const accessConfirm = ref(null); // { item, makePrivate }

  function askMakePrivate(item) {
    accessConfirm.value = { item, makePrivate: true };
  }

  function askMakePublic(item) {
    accessConfirm.value = { item, makePrivate: false };
  }

  async function onAccessConfirm() {
    const { item, makePrivate } = accessConfirm.value || {};
    accessConfirm.value = null;
    if (!item) return;
    try {
      await access.setAccessLevel(item.file_url, makePrivate);
      toast.success(
        makePrivate
          ? t("mediaAccess.toast.movedPrivate", { name: item.file_name })
          : t("mediaAccess.toast.movedPublic", { name: item.file_name })
      );
      selected.value = new Set();
      await m.load();
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  async function copySignedLink(item) {
    try {
      const { url, ttl_seconds: ttl } = await access.createSignedLink(item.file_url);
      const absolute = new URL(url, window.location.origin).href;
      const copied = await access.copyText(absolute);
      if (copied) {
        toast.success(
          t("mediaAccess.toast.linkCopied", { minutes: Math.round((ttl || 900) / 60) })
        );
      } else {
        toast.error(t("mediaAccess.toast.copyFailed"));
      }
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
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

  // Liste modu pencereleme (MOGEM-638 §3.1 / §7-12): 100 satırlık sayfa
  // ~1.650 DOM düğümü çiziyordu, geçiş 7 s. Yalnız görünür satırlar + overscan
  // DOM'da; toplam yükseklik padding ile korunur (kaydırma çubuğu sabit).
  // Sabit satır yüksekliği `.mo__list--windowed` ile CSS'ten garanti edilir —
  // pencereleme ölçümü ilk satırdan alıp hepsine yayar. Tablo/kart/kanban
  // modları pencerelenmedi (tbody padding taşımaz; kart/kanban yüksekliği değişken).
  const listEl = ref(null);
  const LIST_VIRTUAL_THRESHOLD = 24;
  const {
    windowed: listWindowed,
    visible: listVisible,
    offset: listOffset,
    padStyle: listPadStyle,
  } = useCardGridWindow(listEl, {
    items: () => m.items.value,
    enabled: () => effectiveMode.value === "list",
    threshold: LIST_VIRTUAL_THRESHOLD,
  });

  // Yoğunluk (MOGEM-625 · C): yerleşim her genişlikte tek sütun kalır, değişen
  // satır ölçüsüdür. `viewMode`den AYRI — o "hangi yerleşim", bu "aynı yerleşim
  // ne kadar sıkı" sorusunu cevaplıyor ve dokunmatikte de anlamlı olduğu için
  // `isDesktop` kapısının arkasında değil.
  const { density, densityVars } = useMediaDensity("media-optimize");

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

  // ── Kahraman kart: kazanç halkası ─────────────────────────────────
  const savedPct = computed(() =>
    sizeBefore.value ? Math.round((m.summary.saved_bytes / sizeBefore.value) * 100) : 0
  );
  // r=38 → çevre 2π·38; dasharray "dolu boş" olarak yüzdeyi çizer.
  const RING_C = 2 * Math.PI * 38;
  const ringDash = computed(() => `${(savedPct.value / 100) * RING_C} ${RING_C}`);

  function pctOf(part, whole) {
    return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  }
  const meterPct = computed(() => ({
    size: pctOf(m.summary.total_bytes, sizeBefore.value),
    optimized: pctOf(m.summary.optimized_count, m.summary.count),
    trash: pctOf(m.summary.trash_bytes, netDisk.value),
    archive: pctOf(m.summary.archive_bytes, netDisk.value),
  }));

  // ── Kart üç nokta menüleri (çöp / arşiv) ──────────────────────────
  // MediaCard.vue'daki mcard__menu deseniyle aynı: dışarı tıklayınca kapanır.
  const statMenu = ref(null); // "trash" | "archive" | null
  function toggleStatMenu(id) {
    statMenu.value = statMenu.value === id ? null : id;
  }
  function statMenuRun(fn) {
    statMenu.value = null;
    fn();
  }
  function closeStatMenu(event) {
    if (!event.target.closest?.(".mo__stat-menu")) statMenu.value = null;
  }
  watch(statMenu, (open) => {
    if (open) document.addEventListener("click", closeStatMenu);
    else document.removeEventListener("click", closeStatMenu);
  });
  onUnmounted(() => document.removeEventListener("click", closeStatMenu));

  // ── Küçük resim politikası ─────────────────────────────────────────
  // Ayrı thumbnail üretilmiyor; küçük resim ORİJİNAL dosyayı çekiyor. Eski
  // 400KB kapısı (ilk sayfa 238 MB indirmesin diye) kullanıcı kararıyla
  // kaldırıldı: önizlemeler yüklü gelsin. `loading="lazy"` + sunucu taraflı
  // sayfalama indirmeyi görünen sayfayla sınırlar.
  function originalUrl(item) {
    // Dosyanın üstüne yazıldığı için file_url değişmiyor; ?v olmadan tarayıcı
    // eski büyük görseli cache'ten gösterir.
    const stamp = item.optimized_at || item.creation || "";
    return `${item.file_url}?v=${encodeURIComponent(stamp)}`;
  }

  function previewUrl(item) {
    // Türev varsa küçük resim ondan gelir: orijinal 1.4 MB yerine 2-6 KB'lık
    // webp; yol içerik adresli (hash'li) olduğundan cache damgası gerekmez.
    return item.thumb_url || originalUrl(item);
  }

  // Yüklenemeyen küçük resimler: kendini onaran zincir. Türev URL'i herhangi
  // bir sebeple kırılırsa (bayat bağlantı havuzu, anlık kesinti) orijinale
  // düşülür; orijinal de kırılırsa satır uzantı karosuna döner — ekranda
  // "kırık görsel" ikonu HİÇBİR koşulda kalmaz.
  const failedThumbs = ref(new Set());

  function thumbFallback(event, item) {
    const img = event.target;
    if (!img.dataset.fallback && img.src !== originalUrl(item)) {
      img.dataset.fallback = "1";
      img.src = originalUrl(item);
      return;
    }
    const next = new Set(failedThumbs.value);
    next.add(item.name);
    failedThumbs.value = next;
  }

  function canThumb(item) {
    if (failedThumbs.value.has(item.name)) return false;
    // Türevi olan dosya uzantıdan bağımsız gösterilebilir (webp üretilir).
    return !!item.thumb_url || canRenderThumb(item.file_name);
  }

  function extOf(item) {
    const x = /\.([a-z0-9]+)$/i.exec(item.file_name || "");
    return x ? x[1].toUpperCase() : "?";
  }

  // Izgara karosunun tür rengi: önizlemesi yüklenmeyen dosya "kırık görsel"
  // değil, türüne boyanmış monogram karo olarak durur.
  const TILE_TONES = {
    MP4: "video",
    WEBM: "video",
    MOV: "video",
    M4V: "video",
    TIF: "tif",
    TIFF: "tif",
    PNG: "png",
    JPG: "warm",
    JPEG: "warm",
    WEBP: "warm",
    GIF: "warm",
    AVIF: "warm",
  };
  // Karo halkası — SEO mozaiğiyle aynı dil: halka rengi durumu söyler.
  // Optimize yeşil, işlenebilir bekleyen sarı; kapsam dışı nötr kalır.
  function tileRing(item) {
    if (item.state === "optimized") return "mo__mcard--ok";
    if (canOptimize(item)) return "mo__mcard--wait";
    return "";
  }

  function tileTone(item) {
    return TILE_TONES[extOf(item)] || "file";
  }

  // ── Seçim ──────────────────────────────────────────────────────────
  // Backend kapılarının istemcide bilinebilen ikisi: format ve boyut. Bunlara
  // takılacak dosya seçtirilmez. `already_small` çözünürlük gerektirdiği için
  // yalnız sunucuda bilinir.
  const OPTIMIZABLE_RE = /\.(jpe?g|png|webp|tiff?)$/i;
  const MIN_FILE_BYTES = 200 * 1024;

  // Politika tavanı (slot master `max_long_edge`): bunun altındaki görsele
  // motor dokunmaz ("already_small" kapısı) — upscale yasak.
  const MAX_DIM = 2400;

  function dimsKnown(item) {
    return (item.width || 0) > 0 && (item.height || 0) > 0;
  }

  function canOptimize(item) {
    if (item.state !== "pending") return false;
    if (!OPTIMIZABLE_RE.test(item.file_name || "")) return false;
    if ((item.file_size || 0) < MIN_FILE_BYTES) return false;
    if (dimsKnown(item) && Math.max(item.width, item.height) <= MAX_DIM) return false;
    return true;
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

  // Tablo yoğun modda kısa sayısal tarih ister: "12.08.26". `formatDay`'in
  // uzun biçimi ("12 Ağu 2026") sütunu genişletiyordu.
  function fmtDate(v) {
    if (!v) return "";
    // Backend "YYYY-MM-DD HH:mm:ss" basıyor; Safari boşluklu biçimi tanımaz.
    const d = new Date(String(v).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
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
    if (dimsKnown(item) && Math.max(item.width, item.height) <= MAX_DIM)
      return t("mediaOptimize.skip.already_small");
    return "";
  }

  // Rozet metni KISA olmalı: "Desteklenmeyen format" kartı taşırıyordu.
  // Uzun açıklama title'a, rozete tek kelime.
  function stateLabel(item) {
    if (item.state === "private") return t("mediaAccess.badge.private");
    if (item.state === "optimized") return t("mediaOptimize.filter.optimized");
    if (canOptimize(item)) return t("mediaOptimize.filter.pending");
    if (!OPTIMIZABLE_RE.test(item.file_name || "")) return t("mediaOptimize.badge.unsupported");
    if ((item.file_size || 0) < MIN_FILE_BYTES) return t("mediaOptimize.badge.tooSmall");
    return t("mediaOptimize.skip.already_small");
  }

  function stateClass(item) {
    if (item.state === "private") return "mo__badge--pending";
    if (item.state === "optimized") return "mo__badge--optimized";
    return canOptimize(item) ? "mo__badge--pending" : "mo__badge--skip";
  }

  function toggle(name) {
    const next = new Set(selected.value);
    next.has(name) ? next.delete(name) : next.add(name);
    selected.value = next;
  }

  /**
   * Satıra tıklamak seçer (MOGEM-625). Onay kutusu DURUYOR: klavye ve ekran
   * okuyucu yolu odur ve "neyin seçili olduğu"nu gösteren tek kesin işaret
   * odur — satır tıklaması yalnız dokunma hedefini satırın tamamına büyütür.
   *
   * Etkileşimli çocuklar dışarıda bırakılıyor: kebap menüyü açan tık aynı
   * anda satırı da seçseydi menüyü her açan kullanıcı istemeden seçim
   * yapardı. Metin seçiliyken de geçiyoruz — dosya adını kopyalamak için
   * sürükleyen kullanıcı bırakınca satır seçilmesin.
   */
  function rowToggle(ev, item) {
    if (running.value) return;
    if (ev.target.closest("button, a, input, select, textarea, [role='menu']")) return;
    if (window.getSelection?.()?.toString()) return;
    toggle(item.name);
  }

  const byName = computed(() => Object.fromEntries(m.items.value.map((i) => [i.name, i])));
  const selectedOptimizable = computed(
    () => [...selected.value].filter((n) => byName.value[n] && canOptimize(byName.value[n])).length
  );
  const isTrashView = computed(() => m.state.value === "trashed");
  const isPrivateView = computed(() => m.state.value === "private");
  const selectedUrls = computed(() =>
    [...selected.value].map((n) => byName.value[n]?.file_url).filter(Boolean)
  );
  // Çöpe yalnız hiçbir yerde kullanılmayanlar taşınabilir; sunucu da ayrıca
  // kontrol ediyor ama butonu boşuna aktif göstermeyelim.
  // Artık her seçim çöpe taşınabilir; kullanımdakiler için onay ekranı ayrı
  // uyarı gösteriyor ve istek `force` ile gidiyor.
  const selectedTrashable = computed(() => selected.value.size);
  const trashPreview = ref(null);
  // Kalıcı silme için AYRI önizleme: çöpe taşımadaki onay burada tekrar
  // alınmalı, iki adım arasında sahip listesi değişmiş olabilir (TUR-298).
  const deletePreview = ref(null);

  const selectedOptimized = computed(
    () => [...selected.value].filter((n) => byName.value[n]?.state === "optimized").length
  );

  // Tablo yoğun modda kullanım tek rozete iner: renkli nokta (filtrelerdeki
  // dot semantiğiyle aynı) + canlı kullanım sayısı. Ayrıntı tooltip'te.
  const USAGE_DOT = { in_use: "ok", order_only: "warn", history_only: "warn", unused: "danger" };
  function usageDot(item) {
    return USAGE_DOT[item.usage_verdict] || "";
  }
  function usageCount(item) {
    return item.usage_verdict === "unknown" ? "—" : item.live_usage || 0;
  }
  function usageTitle(item) {
    const parts = [t(`mediaOptimize.usageState.${item.usage_verdict}`)];
    if (item.live_usage) parts.push(t("mediaOptimize.usage.liveCount", { n: item.live_usage }));
    const extra = usageLabel(item);
    if (extra) parts.push(extra);
    return parts.join(" · ");
  }

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
        { id: "private", label: t("mediaOptimize.filter.private"), dot: "warn" },
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
    if (action === "deleteTrashed") deletePreview.value = await m.previewTrash(selectedUrls.value);
    if (action === "deleteOne") {
      deletePreview.value = await m.previewTrash([deleteTarget.value?.file_url].filter(Boolean));
    }
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
  const confirmTone = computed(() =>
    DANGER_ACTIONS.has(pendingAction.value) ? "danger" : "warning"
  );

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
      // `sharedOk`: ortak sahipli dosya varsa uyarıyı görüp onayladı (TUR-298).
      await m.trashFiles(
        selectedUrls.value,
        (trashPreview.value?.in_use || 0) > 0,
        (trashPreview.value?.shared_count || 0) > 0
      );
      selected.value = new Set();
      trashPreview.value = null;
    } else if (action === "untrash") {
      await m.restoreFromTrash(selectedUrls.value);
      selected.value = new Set();
    } else if (action === "deleteOne") {
      // Kalıcı silme geri alınamaz; ortak sahiplik onayı burada TEKRAR alınır.
      // Çöpe taşımadaki onay yeterli değil — iki adım arasında yeni bir mağaza
      // dosyayı kullanmaya başlamış olabilir (backend de aynı sebeple tekrar sorar).
      await m.deleteTrashed(
        [deleteTarget.value.file_url],
        (deletePreview.value?.shared_count || 0) > 0
      );
      deleteTarget.value = null;
      deletePreview.value = null;
    } else if (action === "deleteTrashed") {
      await m.deleteTrashed(selectedUrls.value, (deletePreview.value?.shared_count || 0) > 0);
      selected.value = new Set();
      deletePreview.value = null;
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
      return _paylasimEkle(
        t("mediaOptimize.confirm.deleteOne", { name: deleteTarget.value?.file_name || "" })
      );
    if (a === "deleteTrashed")
      return _paylasimEkle(t("mediaOptimize.confirm.deleteNow", { n: selected.value.size }));
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
  /**
   * Silme onay metnine ortak sahiplik uyarısı ekler (TUR-298).
   *
   * Ayrı satır olarak ekleniyor, cümleye karıştırılmıyor: "kaç üründe
   * kullanılıyor" kendi sitenle ilgili bir risk, "kaç mağazayı etkiler"
   * başkasının verisiyle. Aynı cümlede birleştirmek ikincisini görünmez yapardı.
   */
  function _paylasimEkle(mesaj) {
    const p = deletePreview.value;
    if (!p?.shared_count) return mesaj;
    return `${mesaj}\n\n${t("mediaOptimize.confirm.trashShared", {
      n: p.shared_count,
      owners: p.shared_max_owners,
    })}`;
  }

  const trashMessage = computed(() => {
    const p = trashPreview.value;
    const d = m.summary.trash_days;
    if (!p) return t("mediaOptimize.confirm.trash", { n: selected.value.size, d });
    const parts = Object.entries(p.by_verdict || {}).map(([k, n]) =>
      t("mediaOptimize.confirm.trashPart", { n, label: t(`mediaOptimize.usageState.${k}`) })
    );
    const base = t("mediaOptimize.confirm.trashMixed", { n: p.total, parts: parts.join(", "), d });
    const satirlar = [base];
    if (p.in_use) {
      satirlar.push(t("mediaOptimize.confirm.trashDanger", { n: p.in_use, places: p.live_places }));
    }
    // Ortak sahiplik AYRI bir uyarı (TUR-298): "kaç üründe kullanılıyor" kendi
    // sitenle ilgili, "kaç mağazayı etkiler" başkasının verisiyle. İkisini tek
    // cümlede birleştirmek, yöneticinin ikinci riski hiç görmemesine yol açardı.
    if (p.shared_count) {
      satirlar.push(
        t("mediaOptimize.confirm.trashShared", {
          n: p.shared_count,
          owners: p.shared_max_owners,
        })
      );
    }
    return satirlar.join("\n\n");
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
  <div class="mpage" :style="densityVars">
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

    <!-- ── Özet kartları: koyu kahraman (kazanç) + 4 beyaz kart ── -->
    <div class="mo__stats">
      <div class="mo__hero">
        <svg
          class="mo__hero-ring"
          viewBox="0 0 92 92"
          role="img"
          :aria-label="`${t('mediaOptimize.stat.saved')}: %${savedPct}`"
        >
          <circle class="mo__hero-ring-track" cx="46" cy="46" r="38" />
          <circle
            class="mo__hero-ring-val"
            cx="46"
            cy="46"
            r="38"
            :stroke-dasharray="ringDash"
            transform="rotate(-90 46 46)"
          />
          <text class="mo__hero-ring-num" x="46" y="52">%{{ savedPct }}</text>
        </svg>
        <div class="mo__hero-body">
          <span class="mo__stat-label">{{ t("mediaOptimize.stat.saved") }}</span>
          <strong>{{ formatSize(m.summary.saved_bytes) }}</strong>
          <small>
            <span class="mo__hero-hl">{{ formatSize(sizeBefore) }}</span>
            →
            <span class="mo__hero-hl">{{ formatSize(m.summary.total_bytes) }}</span>
            · {{ t("mediaOptimize.stat.savedNote") }}
          </small>
        </div>
      </div>

      <div class="mo__stat-cards">
        <div class="mo__stat">
          <span class="mo__stat-label">{{ t("mediaOptimize.stat.size") }}</span>
          <strong>{{ formatSize(m.summary.total_bytes) }}</strong>
          <small>{{ t("mediaOptimize.stat.sizeBefore", { size: formatSize(sizeBefore) }) }}</small>
          <div class="mo__meter">
            <i
              class="mo__meter-fill mo__meter-fill--brand"
              :style="{ width: `${meterPct.size}%` }"
            />
          </div>
        </div>
        <div class="mo__stat">
          <span class="mo__stat-label">{{ t("mediaOptimize.stat.optimized") }}</span>
          <strong>{{ m.summary.optimized_count }}</strong>
          <small>{{ t("mediaOptimize.stat.ofTotal", { n: m.summary.count }) }}</small>
          <div class="mo__meter">
            <i
              class="mo__meter-fill mo__meter-fill--info"
              :style="{ width: `${meterPct.optimized}%` }"
            />
          </div>
        </div>
        <div class="mo__stat">
          <div class="mo__stat-head">
            <span class="mo__stat-label">
              {{ t("mediaOptimize.stat.trash", { d: m.summary.trash_days }) }}
            </span>
            <div
              v-if="m.summary.trash_bytes"
              class="mo__stat-menu"
              @keydown.escape="statMenu = null"
            >
              <button
                type="button"
                class="mo__stat-menu-btn"
                :aria-label="t('mediaOptimize.stat.actionsAria')"
                :aria-expanded="statMenu === 'trash'"
                @click.stop="toggleStatMenu('trash')"
              >
                <AppIcon name="more-vertical" :size="14" />
              </button>
              <ul v-if="statMenu === 'trash'" class="mo__stat-menu-list" role="menu" @click.stop>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    @click="statMenuRun(() => setFilter('state', 'trashed'))"
                  >
                    <AppIcon name="eye" :size="14" />
                    {{ t("mediaOptimize.action.viewTrash") }}
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item mo__stat-menu-item--danger"
                    @click="statMenuRun(() => ask('purgeTrash'))"
                  >
                    <AppIcon name="trash-2" :size="14" />
                    {{ t("mediaOptimize.action.purgeTrash") }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <strong>{{ formatSize(m.summary.trash_bytes) }}</strong>
          <small>{{ t("mediaOptimize.stat.trashNote", { d: m.summary.trash_days }) }}</small>
          <div class="mo__meter">
            <i
              class="mo__meter-fill mo__meter-fill--muted"
              :style="{ width: `${meterPct.trash}%` }"
            />
          </div>
        </div>
        <div class="mo__stat">
          <div class="mo__stat-head">
            <span class="mo__stat-label">
              {{ t("mediaOptimize.stat.archive", { d: m.summary.retention_days }) }}
            </span>
            <div
              v-if="m.summary.archive_bytes"
              class="mo__stat-menu"
              @keydown.escape="statMenu = null"
            >
              <button
                type="button"
                class="mo__stat-menu-btn"
                :aria-label="t('mediaOptimize.stat.actionsAria')"
                :aria-expanded="statMenu === 'archive'"
                @click.stop="toggleStatMenu('archive')"
              >
                <AppIcon name="more-vertical" :size="14" />
              </button>
              <ul v-if="statMenu === 'archive'" class="mo__stat-menu-list" role="menu" @click.stop>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    @click="statMenuRun(() => setFilter('state', 'optimized'))"
                  >
                    <AppIcon name="eye" :size="14" />
                    {{ t("mediaOptimize.action.viewArchive") }}
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    :disabled="running"
                    @click="statMenuRun(() => ask('restoreAll'))"
                  >
                    <AppIcon name="rotate-ccw" :size="14" />
                    {{ t("mediaOptimize.action.restoreAll") }}
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item mo__stat-menu-item--danger"
                    :disabled="running"
                    @click="statMenuRun(() => ask('purge'))"
                  >
                    <AppIcon name="trash-2" :size="14" />
                    {{ t("mediaOptimize.action.purge") }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <strong>{{ formatSize(m.summary.archive_bytes) }}</strong>
          <small>{{ t("mediaOptimize.stat.netDisk", { size: formatSize(netDisk) }) }}</small>
          <div class="mo__meter">
            <i
              class="mo__meter-fill mo__meter-fill--archive"
              :style="{ width: `${meterPct.archive}%` }"
            />
          </div>
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
        <!-- Yoğunluk her genişlikte var: dar ekranda kazanılacak şey sütun
             sayısı değil, ekrana sığan satır sayısı. -->
        <MediaDensityToggle v-model="density" />

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
                  <input v-model="m.onlyOptimizable.value" type="checkbox" @change="applyFilters" />
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

    <!-- Yalnız System Manager: kart geri alınamaz toplu dosya taşıması
         başlatıyor (backend `_guard_destructive` de aynı rolü istiyor).
         `auth.isAdmin` `is_admin` bayrağına bakıyordu ve Marketplace Admin
         gibi rolleri de içeriye alabiliyordu — kapı rol listesine indirildi. -->
    <MediaRetroRenameCard v-if="auth.userRoles?.includes('System Manager')" />

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
          {{ formatSize(m.job.original_bytes) }} → {{ formatSize(m.job.new_bytes) }} (−{{
            formatSize(jobSaved)
          }})
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
    <div v-if="effectiveMode === 'list'" class="card mo__list" :class="{ 'mo__list--windowed': listWindowed }">
      <!-- Pencereleme padding'i iç gövdeye: `.card`'ın kendi 20px'i bozulmasın -->
      <div ref="listEl" class="mo__list-body" :style="listPadStyle">
      <div
        v-for="(item, i) in listVisible"
        :key="item.name"
        class="mo__row"
        :class="{ 'mo__row--on': selected.has(item.name) }"
        :data-cell="listOffset + i"
        :aria-setsize="m.items.value.length"
        :aria-posinset="listOffset + i + 1"
        @click="rowToggle($event, item)"
      >
        <!-- `@click.stop`: kutunun kendi tıklaması satıra ulaşırsa seçim iki
             kez dönüp hiç değişmemiş görünür. `change` yine çalışıyor, yani
             klavyeyle boşluk tuşu yolu bozulmuyor. -->
        <input
          type="checkbox"
          :checked="selected.has(item.name)"
          :disabled="running"
          :title="skipHint(item)"
          @click.stop
          @change="toggle(item.name)"
        />
        <!-- Görünmez kap: masaüstünde `display: contents` — fotoğraf satırın
             doğrudan çocuğuymuş gibi davranır, yerleşim birebir aynı kalır.
             Dokunmatikte gerçek bir kutuya dönüşüp sol sütunu boydan boya
             doldurur. Kap ŞART: `img` yerine geçen bir öğe ve kendi en-boy
             oranı olduğu için ızgara uzatması (`align-self: stretch`) ona
             hiç uygulanmıyor — ölçüldü, 82px'lik alanda 56px kalıyordu. -->
        <span class="mo__thumb-wrap">
          <img
            v-if="canThumb(item)"
            class="mo__thumb"
            :src="previewUrl(item)"
            :alt="item.file_name"
            loading="lazy"
            decoding="async"
            @error="thumbFallback($event, item)"
          />
          <span v-else class="mo__thumb mo__thumb--ph">{{ extOf(item) }}</span>
        </span>

        <div class="mo__row-main">
          <span class="mo__file-name">{{ item.file_name }}</span>
          <!-- Meta satırında yalnız uyarı kalır ("2 kez yüklenmiş" gibi);
               boyut/kazanç sağdaki sayı sütununda, kullanım sayısı çipte. -->
          <span v-if="item.usage_kind !== 'single'" class="mo__row-sub">
            {{ usageLabel(item) }}
          </span>
        </div>

        <!-- Boyut + kazanç: sağa yaslı sayı sütunu — dikeyde taranır. -->
        <!-- Meta şeridi TEK kap içinde: boyut, kullanım çipi ve rozetler.
             Masaüstünde `display: contents` ile kap görünmez — çocuklar satırın
             doğrudan çocuğuymuş gibi davranır, yerleşim birebir aynı kalır.
             Dokunmatikte gerçek bir kutuya dönüşüp hepsini tek şeritte tutar;
             doğrudan çocuk kaldıklarında her rozet ayrı satıra dağılıyordu. -->
        <span class="mo__row-meta">
          <span class="mo__row-size">
            {{ formatSize(item.file_size) }}
            <small v-if="item.saved_bytes" class="mo__row-size-gain">
              −{{ formatSize(item.saved_bytes) }}
            </small>
          </span>

          <span class="mo__usechip" :title="usageTitle(item)">
            <span class="mo__dot" :class="usageDot(item) && `mo__dot--${usageDot(item)}`" />
            <span class="mo__usechip-n">{{ usageCount(item) }}</span>
          </span>

          <!-- Video işleme rozeti (TUR-296): yalnız işleniyor/başarısız —
               "hazır" olağan durumdur, rozetlemek gürültü. -->
          <span
            v-if="item.video_status === 'processing' || item.video_status === 'failed'"
            class="mo__badge"
            :class="`mo__badge--v-${item.video_status}`"
          >
            {{ t(`mediaOptimize.videoStatus.${item.video_status}`) }}
          </span>
          <!-- Tarama rozeti (TUR-125): yalnız zararlı/taranamadı. Karantinadaki
               dosya diskte public ağaçtan çıkmıştır ama `File` kaydı durduğu için
               bu listede görünür — yöneticinin bulguyu göreceği yer burası. -->
          <span
            v-if="['infected', 'failed', 'pending'].includes(item.scan_status)"
            class="mo__badge"
            :class="`mo__badge--s-${item.scan_status}`"
          >
            {{ t(`mediaOptimize.scanStatus.${item.scan_status}`) }}
          </span>
          <span
            v-if="isPrivateView && item.pii"
            class="mo__badge mo__badge--skip"
            :title="t('mediaAccess.badge.piiHint')"
          >
            {{ t("mediaAccess.badge.pii") }}
          </span>
          <span class="mo__badge" :class="stateClass(item)">{{ stateLabel(item) }}</span>
        </span>
        <div class="mo__stat-menu" @keydown.escape="statMenu = null">
          <button
            type="button"
            class="mo__stat-menu-btn"
            :aria-label="t('mediaOptimize.stat.actionsAria')"
            :aria-expanded="statMenu === `list:${item.name}`"
            @click.stop="toggleStatMenu(`list:${item.name}`)"
          >
            <AppIcon name="more-vertical" :size="14" />
          </button>
          <ul
            v-if="statMenu === `list:${item.name}`"
            class="mo__stat-menu-list"
            role="menu"
            @click.stop
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class="mo__stat-menu-item"
                @click="statMenuRun(() => openUsage(item))"
              >
                <AppIcon name="eye" :size="14" />
                {{ t("mediaOptimize.action.viewUsage") }}
              </button>
            </li>
            <template v-if="isTrashView">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item"
                  @click="statMenuRun(() => untrashOne(item))"
                >
                  <AppIcon name="rotate-ccw" :size="14" />
                  {{ t("mediaOptimize.action.untrash") }}
                </button>
              </li>
              <li class="mo__stat-menu-sep" role="separator" aria-hidden="true"></li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item mo__stat-menu-item--danger"
                  @click="statMenuRun(() => askDeleteOne(item))"
                >
                  <AppIcon name="trash-2" :size="14" />
                  {{ t("mediaOptimize.action.deleteOne") }}
                </button>
              </li>
            </template>
            <li v-else-if="item.video_status === 'failed'" role="none">
              <button
                type="button"
                role="menuitem"
                class="mo__stat-menu-item"
                :disabled="running"
                @click="statMenuRun(() => m.retryTranscode(item.file_url))"
              >
                <AppIcon name="rotate-ccw" :size="14" />
                {{ t("mediaOptimize.action.retryVideo") }}
              </button>
            </li>
            <li v-else-if="item.state === 'optimized'" role="none">
              <button
                type="button"
                role="menuitem"
                class="mo__stat-menu-item"
                :disabled="running"
                @click="statMenuRun(() => askRestore(item.name))"
              >
                <AppIcon name="rotate-ccw" :size="14" />
                {{ t("mediaOptimize.action.restore") }}
              </button>
            </li>
            <li v-if="!isTrashView && !isPrivateView" role="none">
              <button
                type="button"
                role="menuitem"
                class="mo__stat-menu-item"
                :disabled="running || access.busy.value"
                :title="t('mediaAccess.action.makePrivateHint')"
                @click="statMenuRun(() => askMakePrivate(item))"
              >
                <AppIcon name="lock" :size="14" />
                {{ t("mediaAccess.action.makePrivate") }}
              </button>
            </li>
            <template v-if="isPrivateView">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item"
                  :disabled="access.busy.value"
                  :title="t('mediaAccess.action.signedLinkHint')"
                  @click="statMenuRun(() => copySignedLink(item))"
                >
                  <AppIcon name="link" :size="14" />
                  {{ t("mediaAccess.action.signedLink") }}
                </button>
              </li>
              <li v-if="!item.pii" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item"
                  :disabled="access.busy.value"
                  @click="statMenuRun(() => askMakePublic(item))"
                >
                  <AppIcon name="globe" :size="14" />
                  {{ t("mediaAccess.action.makePublic") }}
                </button>
              </li>
            </template>
          </ul>
        </div>
      </div>
      </div>
      <p v-if="!m.items.value.length" class="mo__empty">{{ t("mediaOptimize.empty") }}</p>
    </div>

    <!-- ── Kart ızgarası — minimal: önizleme, ad, boyut, kazanç ── -->
    <!-- Yoğun mozaik: kare karolar, kimlik hover şeridinde. Karoya tıklamak
         kullanım diyaloğunu açar (önizleme de orada); seçim işareti hep açık. -->
    <div v-else-if="effectiveMode === 'grid'" class="mo__grid">
      <article
        v-for="item in m.items.value"
        :key="item.name"
        class="mo__mcard"
        :class="[tileRing(item), { 'mo__mcard--on': selected.has(item.name) }]"
      >
        <button
          type="button"
          class="mo__mcard-hit"
          :aria-label="`${item.file_name} — ${t('mediaOptimize.usageState.hint')}`"
          @click="openUsage(item)"
        ></button>

        <button
          type="button"
          class="mo__mcard-pick"
          :class="{ 'mo__mcard-pick--on': selected.has(item.name) }"
          :disabled="running"
          :title="skipHint(item)"
          :aria-label="t('mediaOptimize.selectAria')"
          :aria-pressed="selected.has(item.name)"
          @click.stop="toggle(item.name)"
        >
          <AppIcon v-if="selected.has(item.name)" name="check" :size="11" />
        </button>

        <div class="mo__mcard-tile" :class="`mo__mcard-tile--${tileTone(item)}`">
          <img
            v-if="canThumb(item)"
            :src="previewUrl(item)"
            :alt="item.file_name"
            loading="lazy"
            decoding="async"
            @error="thumbFallback($event, item)"
          />
          <span v-else class="mo__mcard-mono">
            <AppIcon v-if="tileTone(item) === 'video'" name="circle-play" :size="20" />
            {{ extOf(item) }}
          </span>
        </div>

        <div class="mo__mcard-strip">
          <span class="mo__mcard-name" :title="item.file_name">
            {{ item.file_name }} · {{ formatSize(item.file_size) }}
            <b v-if="item.saved_bytes" class="mo__mcard-gain"
              >−{{ formatSize(item.saved_bytes) }}</b
            >
          </span>
          <div class="mo__stat-menu" @keydown.escape="statMenu = null">
            <button
              type="button"
              class="mo__stat-menu-btn mo__mcard-kebab"
              :aria-label="t('mediaOptimize.stat.actionsAria')"
              :aria-expanded="statMenu === `card:${item.name}`"
              @click.stop="toggleStatMenu(`card:${item.name}`)"
            >
              <AppIcon name="more-vertical" :size="13" />
            </button>
            <ul
              v-if="statMenu === `card:${item.name}`"
              class="mo__stat-menu-list mo__stat-menu-list--up"
              role="menu"
              @click.stop
            >
              <template v-if="isTrashView">
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    @click="statMenuRun(() => untrashOne(item))"
                  >
                    <AppIcon name="rotate-ccw" :size="14" />
                    {{ t("mediaOptimize.action.untrash") }}
                  </button>
                </li>
                <li class="mo__stat-menu-sep" role="separator" aria-hidden="true"></li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item mo__stat-menu-item--danger"
                    @click="statMenuRun(() => askDeleteOne(item))"
                  >
                    <AppIcon name="trash-2" :size="14" />
                    {{ t("mediaOptimize.action.deleteOne") }}
                  </button>
                </li>
              </template>
              <li v-else-if="item.state === 'optimized'" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item"
                  :disabled="running"
                  @click="statMenuRun(() => askRestore(item.name))"
                >
                  <AppIcon name="rotate-ccw" :size="14" />
                  {{ t("mediaOptimize.action.restore") }}
                </button>
              </li>
              <li v-if="!isTrashView && !isPrivateView" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mo__stat-menu-item"
                  :disabled="running || access.busy.value"
                  :title="t('mediaAccess.action.makePrivateHint')"
                  @click="statMenuRun(() => askMakePrivate(item))"
                >
                  <AppIcon name="lock" :size="14" />
                  {{ t("mediaAccess.action.makePrivate") }}
                </button>
              </li>
              <template v-if="isPrivateView">
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    :disabled="access.busy.value"
                    :title="t('mediaAccess.action.signedLinkHint')"
                    @click="statMenuRun(() => copySignedLink(item))"
                  >
                    <AppIcon name="link" :size="14" />
                    {{ t("mediaAccess.action.signedLink") }}
                  </button>
                </li>
                <li v-if="!item.pii" role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="mo__stat-menu-item"
                    :disabled="access.busy.value"
                    @click="statMenuRun(() => askMakePublic(item))"
                  >
                    <AppIcon name="globe" :size="14" />
                    {{ t("mediaAccess.action.makePublic") }}
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </div>
      </article>
      <p v-if="!m.items.value.length" class="mo__empty">{{ t("mediaOptimize.empty") }}</p>
    </div>

    <!-- ── Tablo — sıralanabilir sütunlar (yalnız masaüstü) ── -->
    <div
      v-else-if="effectiveMode === 'table'"
      class="card mo__table-wrap"
      :class="{ 'mo__table-wrap--menu-open': statMenu?.startsWith('row:') }"
    >
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
                @error="thumbFallback($event, item)"
              />
              <span v-else class="mo__thumb mo__thumb--ph">{{ extOf(item) }}</span>
            </td>
            <td>
              <span class="mo__file-name">{{ item.file_name }}</span>
            </td>
            <td class="mo__num">{{ formatSize(item.file_size) }}</td>
            <td class="mo__num mo__gain">
              {{ item.saved_bytes ? "−" + formatSize(item.saved_bytes) : "—" }}
            </td>
            <td>
              <span class="mo__usechip" :title="usageTitle(item)">
                <span class="mo__dot" :class="usageDot(item) && `mo__dot--${usageDot(item)}`" />
                <span class="mo__usechip-n">{{ usageCount(item) }}</span>
              </span>
            </td>
            <td>
              <span class="mo__badge" :class="stateClass(item)" :title="skipHint(item)">
                {{ stateLabel(item) }}
              </span>
              <span
                v-if="isPrivateView && item.pii"
                class="mo__badge mo__badge--skip"
                :title="t('mediaAccess.badge.piiHint')"
              >
                {{ t("mediaAccess.badge.pii") }}
              </span>
            </td>
            <td class="mo__num mo__muted">{{ fmtDate(item.optimized_at || item.creation) }}</td>
            <td class="mo__row-acts">
              <div class="mo__stat-menu" @keydown.escape="statMenu = null">
                <button
                  type="button"
                  class="mo__stat-menu-btn"
                  :aria-label="t('mediaOptimize.stat.actionsAria')"
                  :aria-expanded="statMenu === `row:${item.name}`"
                  @click.stop="toggleStatMenu(`row:${item.name}`)"
                >
                  <AppIcon name="more-vertical" :size="14" />
                </button>
                <ul
                  v-if="statMenu === `row:${item.name}`"
                  class="mo__stat-menu-list"
                  role="menu"
                  @click.stop
                >
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="mo__stat-menu-item"
                      @click="statMenuRun(() => openUsage(item))"
                    >
                      <AppIcon name="eye" :size="14" />
                      {{ t("mediaOptimize.action.viewUsage") }}
                    </button>
                  </li>
                  <template v-if="isTrashView">
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="mo__stat-menu-item"
                        @click="statMenuRun(() => untrashOne(item))"
                      >
                        <AppIcon name="rotate-ccw" :size="14" />
                        {{ t("mediaOptimize.action.untrash") }}
                      </button>
                    </li>
                    <li class="mo__stat-menu-sep" role="separator" aria-hidden="true"></li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="mo__stat-menu-item mo__stat-menu-item--danger"
                        @click="statMenuRun(() => askDeleteOne(item))"
                      >
                        <AppIcon name="trash-2" :size="14" />
                        {{ t("mediaOptimize.action.deleteOne") }}
                      </button>
                    </li>
                  </template>
                  <li v-else-if="item.state === 'optimized'" role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="mo__stat-menu-item"
                      :disabled="running"
                      @click="statMenuRun(() => askRestore(item.name))"
                    >
                      <AppIcon name="rotate-ccw" :size="14" />
                      {{ t("mediaOptimize.action.restore") }}
                    </button>
                  </li>
                  <li v-if="!isTrashView && !isPrivateView" role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="mo__stat-menu-item"
                      :disabled="running || access.busy.value"
                      :title="t('mediaAccess.action.makePrivateHint')"
                      @click="statMenuRun(() => askMakePrivate(item))"
                    >
                      <AppIcon name="lock" :size="14" />
                      {{ t("mediaAccess.action.makePrivate") }}
                    </button>
                  </li>
                  <template v-if="isPrivateView">
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="mo__stat-menu-item"
                        :disabled="access.busy.value"
                        :title="t('mediaAccess.action.signedLinkHint')"
                        @click="statMenuRun(() => copySignedLink(item))"
                      >
                        <AppIcon name="link" :size="14" />
                        {{ t("mediaAccess.action.signedLink") }}
                      </button>
                    </li>
                    <li v-if="!item.pii" role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="mo__stat-menu-item"
                        :disabled="access.busy.value"
                        @click="statMenuRun(() => askMakePublic(item))"
                      >
                        <AppIcon name="globe" :size="14" />
                        {{ t("mediaAccess.action.makePublic") }}
                      </button>
                    </li>
                  </template>
                </ul>
              </div>
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
              @error="thumbFallback($event, item)"
            />
            <span v-else class="mo__thumb mo__thumb--ph">{{ extOf(item) }}</span>
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
    <button v-if="!isDesktop" type="button" class="mo__fab" :disabled="running" @click="ask('all')">
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

    <!-- Erişim seviyesi onayı — public→private'ta eski URL 404 olur -->
    <ConfirmDialog
      :open="!!accessConfirm"
      :title="t('mediaAccess.confirm.title')"
      :message="
        accessConfirm?.makePrivate
          ? t('mediaAccess.confirm.makePrivate', { name: accessConfirm?.item?.file_name || '' })
          : t('mediaAccess.confirm.makePublic', { name: accessConfirm?.item?.file_name || '' })
      "
      :confirm-label="t('mediaAccess.confirm.ok')"
      tone="warning"
      @confirm="onAccessConfirm"
      @cancel="accessConfirm = null"
      @update:open="(v) => !v && (accessConfirm = null)"
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
    @include media.text("display");
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  .mpage__subtitle {
    margin: media.$s-05 0 0;
    @include media.text("xs");
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

  // ── Özet kartları: koyu kahraman + 4 beyaz kart ──────────────────
  // Telefonda kahraman tam satır + 2×2 kart; masaüstünde kahraman solda
  // sabit genişlikte, dört kart sağda tek satırda.
  .mo__stats {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    // MOGEM-625 — kahraman kart 1280'e kadar TAM SATIRDA kalır.
    //
    // 1024'te yana geçiyordu, ama o genişlikte içerik sütunu 744px (kabuk
    // 280px yiyor) ve kahramana 340px gidince dört istatistik kartına ~98px
    // kalıyordu: "ÇÖP KUTUSU (30 GÜN)" etiketi dört satıra iniyordu (ölçüldü:
    // 47px genişlik, 4 satır). Sütun sayısı DEĞİŞMEDİ — yalnız kahraman bir
    // satır aşağı indi, kartlar 744px'i paylaşıyor (~180px).
    @media (min-width: 1280px) {
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    }
  }

  .mo__hero {
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

    // Dark'ta sayfa zemini de koyu — kart kenarlık + kademe farkıyla ayrışır.
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }

    // Sağ altta marka ışıması.
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

  .mo__hero-ring {
    flex: none;
    width: 76px;
    height: 76px;
  }

  .mo__hero-ring-track {
    fill: none;
    stroke: rgb(255 255 255 / 14%);
    stroke-width: 8;
  }

  .mo__hero-ring-val {
    fill: none;
    stroke: $brand;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 0.6s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .mo__hero-ring-num {
    fill: #fff;
    font-size: 17px;
    font-weight: 700;
    text-anchor: middle;
    @include media.numeric;
  }

  .mo__hero-body {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;

    .mo__stat-label {
      color: rgb(255 255 255 / 62%);
    }

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
  }

  .mo__hero-hl {
    color: $brand-light;
    @include media.numeric;
  }

  .mo__stat-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;

    // Sarmaya bırakılınca 3+1 gibi tek kartlık artık satır oluşuyordu.
    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .mo__stat {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-lg;
    // "soft" gri veriyordu; kartlar beyaz zeminde ("raised") durur.
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

  .mo__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mo__stat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-1;
  }

  // Kart altı ince ilerleme çubuğu.
  .mo__meter {
    height: 4px;
    margin-top: media.$s-1;
    border-radius: 999px;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg;
    }
  }

  .mo__meter-fill {
    display: block;
    height: 100%;
    border-radius: inherit;

    &--brand {
      background: $brand;
    }

    &--info {
      background: $c-info;
    }

    &--muted {
      background: $l-text-300;

      @include dark {
        background: $d-text-faint;
      }
    }

    &--archive {
      background: media.$c-archive;
    }
  }

  // ── Kart üç nokta menüsü (mcard__menu deseni) ────────────────────
  .mo__stat-menu {
    position: relative;
    // Buton etiket satırından uzun; kartı büyütmesin.
    margin: -0.25rem 0;
  }

  .mo__stat-menu-btn {
    display: grid;
    place-items: center;
    width: 1.625rem;
    height: 1.625rem;
    border: 0;
    border-radius: media.$r-sm;
    background: transparent;
    color: $l-text-400;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.92);

    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;
        color: $l-text-700;

        @include dark {
          background: $d-item-hover;
          color: $d-text-hi;
        }
      }
    }
  }

  .mo__stat-menu-list {
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

  .mo__stat-menu-item {
    width: 100%;
    border-radius: media.$r-sm;
    text-align: start;
    @include media.button("ghost");
    @include media.focus-ring;

    padding: 0 media.$s-2;
    // `button()` mixin'inin 44px tap-target'ı düğme için doğru, menü kalemi
    // için kocaman — açılır listede 34px yeter. Uzun etiket de sarmasın.
    min-height: 2.125rem;
    white-space: nowrap;
    @include media.text("sm");

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    &:active:not(:disabled) {
      background: $l-bg-muted;
      transform: none;

      @include dark {
        background: $d-item-hover;
      }
    }

    &--danger {
      color: $c-error;
    }
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
    box-shadow: 0 0 40px media.$o-soft;

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
    background: media.$o-medium;
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
    gap: media.$s-2;
    font-weight: 400;
    @include media.muted(1);
  }

  .mo__close {
    @include media.icon-button;
  }

  .mo__progress {
    height: 5px;
    border-radius: media.$r-sm;
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
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .mo__chip {
    @include media.chip("neutral");
  }

  .mo__row--on {
    @include media.selected;
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
    flex: none;
    @include media.density-thumb;
    object-fit: cover;
    border-radius: media.$r-sm;
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

    @include dark {
      border-color: $d-border;
    }
  }

  .mo__file-name {
    display: block;
    max-width: 22rem;
    @include media.truncate;
  }

  .mo__badge {
    @include media.chip("neutral");
  }

  // `display: inline-flex` verilirse <td> tablo ızgarasından düşüyor ve hücre
  // kenarlıkları satırın geri kalanına göre kayıyordu — hücre hücre kalmalı.
  .mo__row-acts {
    width: 44px;
    white-space: nowrap;
    text-align: right;
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
    background: media.$tint-danger;
  }

  // Tarama rozetleri (TUR-125). Zararlı bulgusu hata tonunda, "taranamadı"
  // uyarı tonunda — bir şey bulunmadı, yalnız bakılamadı.
  .mo__badge--s-infected {
    @include media.chip("info");
    color: $c-error;
    background: media.$tint-danger;
  }

  .mo__badge--s-failed {
    @include media.chip("info");
    color: $c-warning;
    background: media.$tint-warning;
  }

  .mo__badge--s-pending {
    @include media.chip("info");
  }

  .mo__bulk-btn--danger:not(:disabled) {
    border-color: $c-error;
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
    // Ölçü yoğunluk anahtarından (MOGEM-625 · C). Yedek değerler bugünkü
    // "rahat" kademesiyle birebir — anahtar bağlanmasa da satır aynı görünür.
    // NOT: bu blok dosyada İKİ KEZ tanımlı (ikincisi cascade'i kazanıyor);
    // ikisi de güncellendi, mükerrerlik ayrı bir temizlik işi.
    @include media.density-row;
    @include media.divider(bottom);
    @include media.hoverable;

    &:last-child {
      border-bottom: none;
    }
  }

  .mo__row--on {
    @include media.selected;
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

  // Boyut + kazanç sağa yaslı sayı sütununda: 2926 dosyada boyut taraması
  // dikeyde akar, kazanç boyutun hemen altında durur.
  .mo__row-size {
    flex: none;
    width: 5.5rem;
    text-align: right;
    font-weight: 600;
    @include media.text("sm");
    @include media.numeric;
  }

  .mo__row-size-gain {
    display: block;
    @include media.text("xs");
    font-weight: 700;
    color: $c-success-text;

    @include dark {
      color: $c-success;
    }
  }

  // ── Kart ızgarası ────────────────────────────────────────────────
  // ── Yoğun mozaik ─────────────────────────────────────────────────
  // Kare karolar; kimlik hover şeridinde. `overflow: hidden` YOK — kebab
  // menüsü kartın dışına taşabilmeli; köşe yuvarlama karo ve şeride verildi.
  .mo__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: media.$s-2;
  }

  .mo__mcard {
    position: relative;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;
    transition: box-shadow $t-fast;

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

  .mo__mcard--ok {
    border-color: transparent;
    box-shadow: 0 0 0 2px $c-success;
  }

  .mo__mcard--wait {
    border-color: transparent;
    box-shadow: 0 0 0 2px $c-warning;
  }

  .mo__mcard--on {
    border-color: $brand;
    box-shadow: 0 0 0 2px rgba($brand, 0.45);
  }

  // Karonun tamamı detay (kullanım diyaloğu) hedefi.
  .mo__mcard-hit {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    border-radius: inherit;
    background: none;
    cursor: pointer;
    @include media.focus-ring;
  }

  .mo__mcard-pick {
    position: absolute;
    top: 0.5rem;
    inset-inline-start: 0.5rem;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid rgb(255 255 255 / 90%);
    border-radius: 50%;
    background: rgb(29 28 25 / 25%);
    box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
    color: $brand-ink;
    cursor: pointer;
    @include media.focus-ring;

    &--on {
      background: $brand;
      border-color: $brand;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mo__mcard-tile {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: inherit;
    pointer-events: none;

    img {
      // Akış içi img + aspect-ratio'lu kutu = döngüsel yükseklik hesabı;
      // görsel kendi oranını dayatıp karoyu esnetiyordu (kare bozuluyordu).
      // Mutlak konum döngüyü kırar, `cover` kareyi doldurur.
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
  }

  .mo__mcard-mono {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: media.$s-1;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  // Tür renkleri: video koyu, fotoğraf sıcak, PNG mavi, TIF menekşe.
  .mo__mcard-tile--video {
    background: linear-gradient(135deg, #2b2a27, #514e48);
    color: #fff;
  }

  .mo__mcard-tile--warm {
    background: #fdf4d8;
    color: $c-warning-text;

    @include dark {
      background: media.$tint-warning;
      color: $c-warning;
    }
  }

  .mo__mcard-tile--png {
    background: #e6eefc;
    color: $c-info-text;

    @include dark {
      background: media.$tint-info;
      color: $c-info;
    }
  }

  .mo__mcard-tile--tif {
    background: #f0e9fb;
    color: #6d28d9;

    @include dark {
      background: rgb(139 92 246 / 14%);
      color: media.$c-archive;
    }
  }

  .mo__mcard-tile--file {
    background: $l-bg-muted;
    color: $l-text-500;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  // Kimlik şeridi: alttan kayan karartma. İmleçli cihazda hover'da belirir,
  // dokunmatikte hep açık (hover yok).
  .mo__mcard-strip {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: media.$s-05;
    padding: 1.1rem media.$s-1 media.$s-05 media.$s-2;
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
    background: linear-gradient(transparent, rgb(20 18 14 / 74%));
    color: #fff;

    @include media.hoverable {
      opacity: 0;
      transition: opacity $t-fast;

      .mo__mcard:hover &,
      &:focus-within {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .mo__mcard-name {
    flex: 1;
    min-width: 0;
    @include media.text("xs");
    font-weight: 600;
    @include media.truncate;
  }

  .mo__mcard-gain {
    color: #7ce3b8;
    @include media.numeric;
  }

  // Koyu şerit üstünde kebab: açık renk, menü yukarı açılır.
  .mo__mcard-kebab {
    color: rgb(255 255 255 / 85%);

    @include media.hoverable {
      &:hover {
        background: rgb(255 255 255 / 18%);
        color: #fff;

        @include dark {
          background: rgb(255 255 255 / 18%);
          color: #fff;
        }
      }
    }
  }

  .mo__stat-menu-list--up {
    top: auto;
    bottom: calc(100% + 0.25rem);
  }

  .mo__badge--pending {
    @include media.chip("neutral");
  }

  // ── Tablo (yalnız masaüstü) ──────────────────────────────────────
  .mo__table-wrap {
    overflow-x: auto;
  }

  // Satır menüsü açıkken kabın dışına taşabilmeli; `overflow-x: auto`
  // hesaplanan `overflow-y: auto` doğurup menüyü kırpıyordu.
  .mo__table-wrap--menu-open {
    overflow: visible;
  }

  // Yoğun mod: 2926 dosyalık envanterde tarama hızı önce gelir — dar satır,
  // küçük küçük resim, mono rakamlar. Aynı ekrana ~%40 daha çok satır sığar.
  .mo__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: media.$s-2 0.625rem;
      text-align: left;
      @include media.divider(bottom);
    }

    td {
      vertical-align: middle;
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

    .mo__thumb {
      width: 36px;
      height: 36px;
    }

    // Kart menüsündeki negatif dikey marj tablo hücresinde kaymaya dönüyor;
    // hücre içinde düz satır-içi blok olarak dursun.
    .mo__stat-menu {
      display: inline-block;
      margin: 0;
      vertical-align: middle;
    }

    // Seçili satır: zemin boyasına ek marka şeridi.
    tr.mo__row--on td:first-child {
      box-shadow: inset 3px 0 0 $brand;
    }
  }

  // Kullanım tek rozet: filtrelerdeki nokta semantiği + canlı kullanım sayısı.
  .mo__usechip {
    @include media.chip("neutral");

    gap: media.$s-1;
  }

  .mo__usechip-n {
    @include media.numeric;
  }

  .mo__stat-menu-sep {
    height: 1px;
    margin: media.$s-05 media.$s-2;
    list-style: none;
    background: $l-border-alt;

    @include dark {
      background: $d-border-inner;
    }
  }

  .mo__sort {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
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
    gap: media.$s-1;
  }

  .mo__kcard {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-1;
    border-radius: media.$r-md;
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
    gap: media.$s-2;
    padding: media.$s-3 media.$s-4;
    border: none;
    border-radius: media.$r-pill;
    @include media.text("sm");
    font-weight: 700;
    // Sarı zemin üzerinde beyaz yasak (variables.scss) — $brand-ink kontrast çapası
    color: $brand-ink;
    background: $brand;
    box-shadow: 0 6px 16px media.$o-soft;
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
    padding: media.$s-6;
    @include media.muted(2);
  }

  // ── Liste / kanban ───────────────────────────────────────────────
  .mo__list {
    display: flex;
    flex-direction: column;
  }

  .mo__row {
    display: flex;
    align-items: center;
    // Ölçü yoğunluk anahtarından (MOGEM-625 · C). Yedek değerler bugünkü
    // "rahat" kademesiyle birebir — anahtar bağlanmasa da satır aynı görünür.
    // NOT: bu blok dosyada İKİ KEZ tanımlı (ikincisi cascade'i kazanıyor);
    // ikisi de güncellendi, mükerrerlik ayrı bir temizlik işi.
    @include media.density-row;
    @include media.divider(bottom);
    @include media.hoverable;
    // Satırın tamamı seçim hedefi (`rowToggle`) — imleç bunu söylemeli.
    cursor: pointer;
  }

  // Pencereli liste: her satır AYNI yükseklikte olmalı (ölçüm ilk satırdan
  // alınıp hepsine yayılır). Yedek değer yoğunluk anahtarı bağlanmasa da
  // "rahat" kademesiyle aynı; alt satır (kullanım türü) tek satıra kırpılır.
  .mo__list--windowed .mo__row {
    height: calc(var(--m-row-min-h, 3.25rem) + 0.75rem);
    overflow: hidden;
  }

  .mo__list--windowed .mo__file-name,
  .mo__list--windowed .mo__row-sub {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    gap: media.$s-1;
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

  // Meta ve fotoğraf kapları masaüstünde GÖRÜNMEZ: çocuklar satırın
  // doğrudan çocuğu gibi davranır, mevcut yerleşim bozulmaz.
  .mo__row-meta,
  .mo__thumb-wrap {
    display: contents;
  }

  // MOGEM-625 — dokunmatikte satır: fotoğraf çapa, tek omurga, sakin tipografi.
  //
  // Referans `media-audit` ölçüldü (400px): metin satırlarının hepsi AYNI
  // x'te ve hepsi normal ağırlıkta. Buradaki satır üç ayrı x'te başlıyordu
  // (130 / 137 / 213) ve boyut, çip, rozet — hepsi 600 kalındı. "Düzen yok"
  // hissinin kaynağı buydu: hizasız omurga + yarışan kalınlıklar.
  //
  // FLEX + ASILI GİRİNTİ DENENDİ VE BIRAKILDI: girinti elle hesaplanıyordu
  // (`onay kutusu + fotoğraf + boşluklar`) ve onay kutusunun gerçek genişliği
  // varsayımdan 7px sapınca ad 130'da, şerit 137'de kaldı. Izgarada ikisi de
  // AYNI SÜTUNDA; hizasızlık artık matematiğe değil yapıya bağlı.
  @media (max-width: 1023px) {
    .mo__row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      column-gap: media.$s-3;
      row-gap: media.$s-1;
    }

    // Fotoğraf ilk sütunda ve satırın TAM YÜKSEKLİĞİNDE: satırın çapası
    // fotoğraf, sol sütunda boşluk kalmıyor.
    //
    // UZAYAN ŞEY KAP, FOTOĞRAF DEĞİL: `img` yerine geçen bir öğe ve kendi
    // en-boy oranı olduğu için ızgara uzatması (`align-self: stretch`) ona
    // hiç uygulanmıyor — spec kuralı, ölçüldü: 82px'lik alanda 56px kalıyor.
    // Yüzdeli yükseklik de tutmuyor, ızgara satırları içerikten boyutlanıyor
    // yani yüzdenin bağlanacağı kesin bir yükseklik yok. Kap yerine geçen
    // olmayan bir öğe, ona uzatma sorunsuz uygulanıyor.
    //
    // Genişlik yoğunluk kademesinden TÜRETİLİYOR (1.4×): "sıkı"ya geçilince
    // daralır ama metne oranı korunur. Sabit px yazsaydık sıkı kademede
    // fotoğraf metni ezerdi.
    .mo__thumb-wrap {
      display: block;
      grid-column: 1;
      grid-row: 1 / span 2;
      align-self: stretch;
      width: calc(var(--m-thumb, 2.5rem) * 1.4);
      min-height: calc(var(--m-thumb, 2.5rem) * 1.4);
    }

    // Kabı doldur. `object-fit: cover` taban kuralda zaten var — uzayan
    // kutuda görsel eziliyor değil kırpılıyor.
    .mo__thumb {
      width: 100%;
      height: 100%;
    }

    // Onay kutusu DURUYOR, yalnız yeri değişti: ilk sütunu fotoğrafa
    // bıraktığı için onun köşesine biniyor. Zemin + halka şart — koyu bir
    // fotoğrafın üstünde çıplak onay kutusu görünmüyordu.
    // Onay kutusu dokunmatikte GÖZÜKMEZ: fotoğrafın köşesinde beyaz bir
    // kutu olarak duruyordu ve görseli kirletiyordu. Seçim artık satıra
    // tıklayarak yapılıyor, seçili satır zeminden belli oluyor.
    //
    // SİLMİYORUZ, GİZLİYORUZ: kutu klavye ve ekran okuyucu için tek gerçek
    // denetim. `display: none` yapsaydık Tab ile gezen kullanıcı listede
    // hiçbir şey seçemezdi. Odaklanınca geri görünür oluyor — yoksa odak
    // görünmeyen bir öğeye düşer ve klavye kullanıcısı nerede olduğunu
    // bilemez (WCAG 2.4.7).
    .mo__row > input[type="checkbox"] {
      grid-column: 1;
      grid-row: 1;
      justify-self: start;
      align-self: start;
      margin: 4px 0 0 4px;
      z-index: 1;
      @include media.sr-only;

      // `sr-only`'nin geri alınması — mixin'in birebir tersi.
      &:focus-visible {
        position: static;
        width: auto;
        height: auto;
        overflow: visible;
        clip: auto;
        white-space: normal;
        border-radius: 3px;
        background: $l-bg;
        box-shadow: 0 0 0 2px $l-bg;

        @include dark {
          background: $d-bg-card;
          box-shadow: 0 0 0 2px $d-bg-card;
        }
      }
    }

    .mo__row-main {
      grid-column: 2;
      grid-row: 1;
      min-width: 0;
    }

    // Ad ile AYNI sütun: omurga yapısal olarak garanti.
    .mo__row-meta {
      grid-column: 2;
      grid-row: 2;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: media.$s-1 media.$s-2;
      min-width: 0;
    }

    // Kebap iki satır boyunca ortalanıyor; tek satıra bağlasaydık ada göre
    // yukarı kaçar, fotoğrafın hizasını bozardı.
    .mo__stat-menu {
      grid-column: 3;
      grid-row: 1 / span 2;
      margin: 0;
    }

    .mo__row-size {
      width: auto;
      flex: 0 0 auto;
      flex-direction: row;
      align-items: baseline;
      gap: media.$s-1;
      text-align: start;
      font-weight: 500;
    }

    // Şeritte TEK vurgu boyut; gerisi normal ağırlıkta. Dördü de kalınken
    // satır okunmuyordu.
    .mo__row-meta .mo__badge,
    .mo__row-meta .mo__usechip {
      font-weight: 400;
    }
  }

  // ── MOGEM-625 · gözle bakınca görülen iki kusur ────────────────────

  // 1) Ölçerler kart içinde farklı yüksekliklerde duruyordu: kartlar ızgara
  //    sayesinde eşit yükseklikte ama içerik değişken (etiket bir ya da iki
  //    satır, alt metin bir ya da iki satır). Ölçer alta itilince dört kartın
  //    çizgisi aynı hizaya geliyor ve ızgara sakinleşiyor.
  .mo__meter {
    margin-top: auto;
  }

  // 2) Araç şeridi: arama + huni ilk satırı doldurunca yoğunluk anahtarı tek
  //    başına ikinci satırda öksüz kalıyordu. Dar ekranda arama TAM SATIR
  //    alıyor, huni ve yoğunluk altta tek grup oluyor.
  @media (max-width: 639px) {
    .mo__search {
      flex: 1 1 100%;
    }

    .mo__toolbar {
      flex-wrap: wrap;
      row-gap: media.$s-2;
    }

    // 3) Etikete İKİ SATIR yer ayrılıyor. Dar kartta "ÇÖP KUTUSU (30 GÜN)"
    //    iki satıra düşerken "ARŞİV (30 GÜN)" bir satırda kalıyor ve aynı
    //    ızgaradaki iki değer farklı yükseklikte duruyordu. Yer peşinen
    //    ayrılınca dört kartın değeri de aynı hizada başlıyor — ölçerlerin
    //    alta yaslanmasıyla birlikte kart ızgarası tamamen sakinleşiyor.
    .mo__stat-label {
      display: block;
      min-height: 2.4em;
    }
  }
</style>

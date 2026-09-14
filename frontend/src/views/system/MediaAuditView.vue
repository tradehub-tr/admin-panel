<script setup>
  import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
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
  import { useScrollLock } from "@/composables/useScrollLock";
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

  // Katman açıkken arka plan kaymasın: telefonda detay sheet'i kaydırılırken
  // altındaki liste de kayıyor, kapanınca kullanıcı başka satırda buluyordu.
  useScrollLock(() => Boolean(detail.value || lightbox.value || filtersOpen.value));

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
      .filter(
        ([k, v]) =>
          k !== "file_url" && k !== "masked" && v !== null && v !== "" && typeof v !== "object"
      )
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
      // TUR-125 — tarama temiz dalı ile karantina AYRI ikon: denetim listesinde
      // gözle tararken "tarandı" ile "zararlı bulundu" aynı simgeyi paylaşırsa
      // ekranın anlatmak istediği tek şey kaybolur.
      "media.scan": "shield-check",
      "media.quarantine": "shield-alert",
      "media.quarantine_release": "shield-off",
    };
    return map[action] || "circle-alert";
  }

  /**
   * Olayın insan diliyle açıklaması — "gizli ama neden", "reddedildi ama neden".
   *
   * Ekranda ham `sensitive_content_twin` yazmak operatöre hiçbir şey anlatmıyor;
   * denetim sayfasının işi tam olarak bu soruyu cevaplamak.
   */
  /**
   * Karar metni — dosya SİLİNMİŞSE geçmiş zamana çevrilir.
   *
   * `usage.resolve` her zaman BUGÜNÜ ölçer. Silinmiş bir dosyada doğal olarak
   * "kullanılmıyor" der ve etiketi "Silinmeye aday" olur; silme olayının
   * kaydında bu, üstteki "kalıcı olarak silindi" bandıyla açık çelişki
   * üretiyordu (kullanıcı bildirdi). Sistem doğru çalışıyor, yanlış olan
   * cümlenin zamanıydı.
   *
   * Geçmiş zamana çevirince soru da doğrusuna dönüyor: "bu silme güvenli
   * miydi?" — `in_use` hâli artık gerçek bir uyarı taşıyor.
   */
  const fileGone = computed(() => report.value?.impact?.file_exists === false);

  const verdictLabel = computed(() =>
    fileGone.value ? t("mediaAudit.report.verdictPast") : t("mediaAudit.report.verdict")
  );

  const verdictText = computed(() => {
    const v = report.value?.impact?.verdict;
    if (!v) return "";
    return fileGone.value ? t(`mediaAudit.verdictPast.${v}`) : t(`mediaUsage.verdict.${v}`);
  });

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
    // TUR-125 — tarama olayları. `media.scan` hem temiz sonucu hem başarısızlığı
    // taşıyor; ikisini `allowed` ayırıyor (reddedilen = taranamadı).
    if (row.action === "media.scan") {
      if (isDenied(row)) {
        return reason.startsWith("scan_retry")
          ? t("mediaAudit.explain.scanRetry", { n: c.attempt || 1 })
          : t("mediaAudit.explain.scanFailed", { n: c.attempts || 0 });
      }
      return t("mediaAudit.explain.scanClean");
    }
    if (row.action === "media.quarantine") {
      return c.signature
        ? t("mediaAudit.explain.quarantineSigned", { sig: c.signature })
        : t("mediaAudit.explain.quarantine");
    }
    if (row.action === "media.quarantine_release") {
      return t("mediaAudit.explain.quarantineRelease");
    }
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
    // Düğüm katları her olayda aynı başlangıca döner: olay kaydı açık,
    // gerisi kapalı (öneri 02b — pencere yüksekliği öngörülebilir kalsın).
    Object.assign(nodeFolds, { actor: false, record: true, file: false, usage: false });
    histOlderOpen.value = false;
    histNewerOpen.value = false;
    reportLoading.value = true;
    report.value = await a.fetchReport(row.name);
    reportLoading.value = false;
  }

  // ── Zaman çizgisi omurgası + katmanlı düğüm (öneri 02b) ────────────
  // Olay kendi geçmişinin ortasında gösterilir: üstte önceki, altta sonraki
  // olaylar. `report.history` DESC geliyor; ekranda kronolojik akış (eski
  // üstte) istendiği için iki parça da ters çevrilir.
  const nodeFolds = reactive({ actor: false, record: true, file: false, usage: false });
  const histOlderOpen = ref(false);
  const histNewerOpen = ref(false);

  const histIndex = computed(() =>
    (report.value?.history || []).findIndex((h) => h.name === detail.value?.name)
  );
  const histOlder = computed(() => {
    const h = report.value?.history || [];
    return histIndex.value >= 0 ? h.slice(histIndex.value + 1).reverse() : [];
  });
  const histNewer = computed(() => {
    const h = report.value?.history || [];
    return histIndex.value > 0 ? h.slice(0, histIndex.value).reverse() : [];
  });

  /** Çizgideki komşuya atla — geçmiş satırı yalnız özet alanları taşıdığı
   *  için dosya kimliği seçili olaydan miras alınır. */
  function switchTo(h) {
    openDetail({
      ...h,
      object_name: detail.value?.object_name,
      tenant: detail.value?.tenant,
      tenant_name: detail.value?.tenant_name,
      target_state: detail.value?.target_state,
    });
  }

  /** Hüküm cümlesi HİÇBİR olay tipinde boş kalamaz: `explain` tanımadığı
   *  eylemde boş dönerse aktör + eylem etiketinden genel cümle kurulur
   *  (ölçüldü: `media.storage_settings_changed` şeridi bomboş açılıyordu). */
  const nodeTitle = computed(() => {
    const row = detail.value;
    if (!row) return "";
    const text = explain(row);
    if (text) return text;
    const key = isDenied(row) ? "genericDenied" : "genericAllowed";
    return t(`mediaAudit.explain.${key}`, {
      actor: row.actor || "—",
      action: actionLabel(row.action),
    });
  });

  /** Rol seli yerine tek satır: ilk 2 rol + sayaç; tam liste title'da. */
  const rolesLine = computed(() => {
    const roles = report.value?.actor?.roles || [];
    if (!roles.length) return "—";
    const gorunen = roles.slice(0, 2).join(", ");
    return roles.length > 2 ? `${gorunen} +${roles.length - 2}` : gorunen;
  });

  const decisionShort = (h) =>
    t(`mediaAudit.decision.${String(h.decision || "allow").toLowerCase()}`);

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

  // ── Önem triyajı (öneri 07) ────────────────────────────────────────
  // Backend `facets.severity` zaten HIGH/NORMAL/LOW sayıyor ama başlıkta hiç
  // görünmüyordu. Yığılmış şeritte her dilim tıklanır filtre; sıfır dilim
  // çizilmez, minik dilim `flex-basis` tabanıyla tıklanabilir kalır.
  const SEV_ORDER = ["HIGH", "NORMAL", "LOW"];
  const sevCount = (k) => a.facets.severity?.[k] || 0;
  const sevTotal = computed(() => SEV_ORDER.reduce((s, k) => s + sevCount(k), 0));
  function sevPct(k) {
    return sevTotal.value ? (sevCount(k) / sevTotal.value) * 100 : 0;
  }
  function toggleSeverity(k) {
    a.severity.value = a.severity.value === k ? "" : k;
    a.applyFilters();
  }

  // ── Başlık kebabı ──────────────────────────────────────────────────
  // Altı buton tek sırada hiyerarşi bırakmıyordu: ikincil aksiyonlar
  // (yoğunluk, CSV, Medya Paneli, Temizle) üç noktaya iner, sırada canlı
  // izleme + Yenile kalır.
  const headMenuOpen = ref(false);
  function headMenuRun(fn) {
    headMenuOpen.value = false;
    fn();
  }

  /** Mozaik kart kebabı (Medya standardı) — açık menünün kart adı. */
  const cardMenu = ref(null);
  function cardMenuRun(fn) {
    cardMenu.value = null;
    fn();
  }

  function closeHeadMenu(e) {
    if (!e.target.closest?.(".ma__menu")) {
      headMenuOpen.value = false;
      cardMenu.value = null;
    }
  }
  onMounted(() => document.addEventListener("click", closeHeadMenu));
  onUnmounted(() => document.removeEventListener("click", closeHeadMenu));

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
      (p) =>
        String(p.actor).toLowerCase().includes(q) ||
        String(p.tenant || "")
          .toLowerCase()
          .includes(q)
    );
  });

  const PRESETS = ["denied", "uploads", "deletions", "high"];

  // ── Sıralama ───────────────────────────────────────────────────────
  // Öneri 01: hedef/önem/detay ayrı sütun değil — olay hücresinin içinde.
  const SORT_COLS = ["timestamp", "action", "actor", "tenant"];
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
          dot: x.includes("denied")
            ? "danger"
            : x.includes("delete") || x.includes("purge")
              ? "warn"
              : "ok",
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
        {
          id: "HIGH",
          label: t("mediaAudit.severity.high"),
          count: a.facets.severity?.HIGH || 0,
          dot: "danger",
        },
        {
          id: "NORMAL",
          label: t("mediaAudit.severity.normal"),
          count: a.facets.severity?.NORMAL || 0,
        },
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
      out.push({
        key: "severity",
        label: t(`mediaAudit.severity.${a.severity.value.toLowerCase()}`),
      });
    if (a.decision.value)
      out.push({
        key: "decision",
        label: t(`mediaAudit.decision.${a.decision.value.toLowerCase()}`),
      });
    if (a.actor.value) out.push({ key: "actor", label: a.actor.value });
    if (a.tenant.value) out.push({ key: "tenant", label: a.tenant.value });
    if (a.fileUrl.value) out.push({ key: "fileUrl", label: a.fileUrl.value });
    if (a.days.value)
      out.push({ key: "days", label: t("mediaAudit.filter.lastDays", { n: a.days.value }) });
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
          <select
            :value="a.refreshEvery.value"
            :aria-label="t('mediaAudit.live.label')"
            @change="a.setRefresh($event.target.value)"
          >
            <option v-for="s in REFRESH_INTERVALS" :key="s" :value="s">
              {{ s ? t("mediaAudit.live.every", { n: s }) : t("mediaAudit.live.off") }}
            </option>
          </select>
        </label>
        <div class="ma__menu">
          <button
            type="button"
            class="hdr-btn-outlined ma__menu-btn"
            :aria-label="t('mediaAudit.triage.moreAria')"
            :aria-expanded="headMenuOpen"
            @click.stop="headMenuOpen = !headMenuOpen"
          >
            <AppIcon name="more-horizontal" :size="15" />
          </button>
          <div v-if="headMenuOpen" class="ma__menu-list" role="menu">
            <button
              type="button"
              role="menuitem"
              :title="t('mediaAudit.action.densityHint')"
              @click="headMenuRun(toggleDensity)"
            >
              <AppIcon name="list" :size="13" />
              {{ t(`mediaAudit.density.${density}`) }}
            </button>
            <!-- `action.exportCsv` — `action.export` DEĞİL. O anahtar denetim
                 eyleminin (`media.export`, yedek paketi sunucudan çıktı) etiketi;
                 ikisi aynı anahtarı paylaşırken HIGH önemli bir güvenlik olayı
                 listede "CSV indir" diye görünüyordu. -->
            <button type="button" role="menuitem" @click="headMenuRun(() => a.exportCsv())">
              <AppIcon name="download" :size="13" />
              {{ t("mediaAudit.action.exportCsv") }}
            </button>
            <button
              type="button"
              role="menuitem"
              @click="headMenuRun(() => router.push('/media-optimize'))"
            >
              <AppIcon name="image" :size="13" />
              {{ t("mediaAudit.action.toMedia") }}
            </button>
            <button
              type="button"
              role="menuitem"
              :disabled="!activeFilterCount"
              @click="headMenuRun(() => a.reset())"
            >
              <AppIcon name="rotate-ccw" :size="13" />
              {{ t("mediaAudit.filter.reset") }}
            </button>
          </div>
        </div>
        <button type="button" class="hdr-btn-primary" :disabled="a.loading.value" @click="refresh">
          <AppIcon
            :name="a.loading.value ? 'loader' : 'refresh-cw'"
            :size="13"
            :class="a.loading.value ? 'animate-spin' : ''"
          />
          {{ t("mediaAudit.action.refresh") }}
        </button>
      </div>
    </header>

    <!-- ── Önem triyajı (öneri 07) ── -->
    <section class="card ma__triage">
      <div class="ma__triage-top">
        <span class="ma__triage-title">{{ t("mediaAudit.triage.title") }}</span>
        <span class="ma__triage-total">
          <strong>{{ a.facets.total }}</strong> {{ t("mediaAudit.stat.totalNote") }}
        </span>
        <span class="ma__triage-hint">{{ t("mediaAudit.triage.hint") }}</span>
      </div>

      <div v-if="sevTotal" class="ma__tbar" role="group" :aria-label="t('mediaAudit.triage.title')">
        <button
          v-for="k in SEV_ORDER"
          v-show="sevCount(k)"
          :key="k"
          type="button"
          class="ma__tseg"
          :class="[`ma__tseg--${k.toLowerCase()}`, { 'ma__tseg--on': a.severity.value === k }]"
          :style="{ flexGrow: sevPct(k) }"
          :title="`${t(`mediaAudit.severity.${k.toLowerCase()}`)} · ${sevCount(k)}`"
          :aria-label="`${t(`mediaAudit.severity.${k.toLowerCase()}`)} · ${sevCount(k)}`"
          @click="toggleSeverity(k)"
        ></button>
      </div>

      <div class="ma__tlegend">
        <button
          v-for="k in SEV_ORDER"
          :key="k"
          type="button"
          class="ma__tleg"
          :class="{ 'ma__tleg--on': a.severity.value === k }"
          @click="toggleSeverity(k)"
        >
          <i class="ma__tdot" :class="`ma__tdot--${k.toLowerCase()}`"></i>
          <strong>{{ sevCount(k) }}</strong>
          {{ t(`mediaAudit.severity.${k.toLowerCase()}`) }}
        </button>
        <span class="ma__tcounts">
          <button
            type="button"
            class="ma__tcount ma__tcount--danger"
            @click="
              a.decision.value = 'DENY';
              a.applyFilters();
            "
          >
            <strong>{{ a.facets.denied }}</strong> {{ t("mediaAudit.triage.denied") }}
          </button>
          <!-- Ayraçlar öğe olarak duruyor: telefonda sayaçlar ızgaraya
               geçince gizlenebilsin (çıplak metin düğümü CSS ile gizlenemez). -->
          <span class="ma__tsep" aria-hidden="true">·</span>
          <button
            type="button"
            class="ma__tcount ma__tcount--good"
            @click="
              a.action.value = 'media.upload';
              a.applyFilters();
            "
          >
            <strong>{{ a.facets.actions?.["media.upload"] || 0 }}</strong>
            {{ t("mediaAudit.triage.uploads") }}
          </button>
          <span class="ma__tsep" aria-hidden="true">·</span>
          <button
            type="button"
            class="ma__tcount ma__tcount--warn"
            @click="
              a.action.value = 'media.trash';
              a.applyFilters();
            "
          >
            <strong>{{ a.facets.actions?.["media.trash"] || 0 }}</strong>
            {{ t("mediaAudit.triage.trash") }}
          </button>
          <span class="ma__tsep" aria-hidden="true">·</span>
          <button
            type="button"
            class="ma__tcount ma__tcount--danger"
            @click="
              a.action.value = 'media.delete';
              a.applyFilters();
            "
          >
            <strong>{{ a.facets.actions?.["media.delete"] || 0 }}</strong>
            {{ t("mediaAudit.triage.purge") }}
          </button>
        </span>
      </div>

      <button
        v-if="a.lastCritical.value"
        type="button"
        class="ma__tcrit"
        @click="openDetail(a.lastCritical.value)"
      >
        <b class="ma__tcrit-tag">{{ t("mediaAudit.triage.lastCritical") }}</b>
        <span class="ma__tcrit-body">
          <strong>{{ actionLabel(a.lastCritical.value.action) }}</strong>
          <template v-if="!isMasked(a.lastCritical.value) && a.lastCritical.value.object_name">
            · {{ a.lastCritical.value.object_name }}
          </template>
          <span class="ma__tcrit-who">
            {{ a.lastCritical.value.actor }} · {{ fmtAgo(a.lastCritical.value.timestamp) }}
          </span>
        </span>
        <span class="ma__tcrit-go">{{ t("mediaAudit.triage.open") }}</span>
      </button>
    </section>

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
        <!-- Görsel kabı: masaüstünde `display: contents` (yerleşim aynı);
             dokunmatikte satırın sol çapası olur ve tam yüksekliğe uzar
             (MediaOptimizeView `.mo__thumb-wrap` deseni). -->
        <span class="ma__thumb-wrap">
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
          <!-- Alt satır kabı: masaüstünde görünmez (`display: contents`),
               dokunmatikte yol + e-postayı soluk, kırpılan tek şeritte tutar
               (dar ekranda ikisi alt alta düşer). -->
          <span class="ma__row-foot">
            <span
              class="ma__target"
              :class="{ 'ma__target--masked': isMasked(r) }"
              :title="targetNote(r)"
            >
              <template v-if="isMasked(r)">{{ t("mediaAudit.masked") }}</template>
              <template v-else-if="r.object_name">{{ r.object_name }}</template>
              <template v-else-if="hasBatchFiles(r)">
                {{ batchFiles(r).list[0] }}
                <span v-if="batchFiles(r).list.length > 1 || batchFiles(r).more" class="ma__tstate">
                  {{
                    t("mediaAudit.andMore", {
                      n: batchFiles(r).list.length - 1 + batchFiles(r).more,
                    })
                  }}
                </span>
              </template>
              <template v-else>{{ t("mediaAudit.target.none") }}</template>
              <span
                v-if="r.target_state === 'deleted' || r.target_state === 'trashed'"
                class="ma__tstate"
              >
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
          </span>
        </div>

        <div class="ma__row-acts">
          <button
            type="button"
            class="ma__eye"
            :title="t('mediaAudit.action.detail')"
            @click="openDetail(r)"
          >
            <AppIcon name="eye" :size="15" />
          </button>
        </div>
      </div>
      <p v-if="!a.items.value.length" class="ma__empty">
        {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
      </p>
    </div>

    <!-- ── Kart ızgarası — Medya mozaik standardı (mo__mcard ailesi):
         kare karolar, kimlik hover şeridinde, kebap menü, ton halkası
         (reddedilen kırmızı, yüksek önem amber). Karoya tıklamak detayı açar. ── -->
    <div v-else-if="effectiveMode === 'grid'" class="ma__grid">
      <article
        v-for="r in a.items.value"
        :key="r.name"
        class="ma__mcard"
        :class="[`ma__mcard--${tone(r)}`, { 'ma__mcard--menu': cardMenu === r.name }]"
      >
        <button
          type="button"
          class="ma__mcard-hit"
          :aria-label="`${actionLabel(r.action)} — ${t('mediaAudit.action.detail')}`"
          @click="openDetail(r)"
        ></button>

        <div class="ma__mcard-tile">
          <img
            v-if="canThumb(r) && r.target_state === 'ok'"
            :src="thumbUrl(r)"
            :alt="r.object_name"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="ma__mcard-mono" :title="targetNote(r)">
            <AppIcon :name="targetIcon(r)" :size="18" />
            {{ extOf(r) }}
          </span>
        </div>

        <div class="ma__mcard-strip">
          <span
            class="ma__mcard-name"
            :title="`${actionLabel(r.action)} · ${r.actor || '—'} · ${fmtTime(r.timestamp)}`"
          >
            {{ actionLabel(r.action) }} · {{ fmtAgo(r.timestamp) }}
          </span>
          <div class="ma__menu" @keydown.escape="cardMenu = null">
            <button
              type="button"
              class="ma__mcard-kebab"
              :aria-label="t('mediaAudit.triage.moreAria')"
              :aria-expanded="cardMenu === r.name"
              @click.stop="cardMenu = cardMenu === r.name ? null : r.name"
            >
              <AppIcon name="more-vertical" :size="13" />
            </button>
            <div
              v-if="cardMenu === r.name"
              class="ma__menu-list ma__menu-list--up"
              role="menu"
              @click.stop
            >
              <button type="button" role="menuitem" @click="cardMenuRun(() => openDetail(r))">
                <AppIcon name="eye" :size="13" />
                {{ t("mediaAudit.action.detail") }}
              </button>
              <template v-if="!isMasked(r) && r.object_name">
                <button type="button" role="menuitem" @click="cardMenuRun(() => filterByFile(r))">
                  <AppIcon name="history" :size="13" />
                  {{ t("mediaAudit.action.fileHistory") }}
                </button>
                <button type="button" role="menuitem" @click="cardMenuRun(() => openInMedia(r))">
                  <AppIcon name="image" :size="13" />
                  {{ t("mediaAudit.action.openInMedia") }}
                </button>
                <button type="button" role="menuitem" @click="cardMenuRun(() => copyTarget(r))">
                  <AppIcon name="copy" :size="13" />
                  {{ t("mediaAudit.action.copy") }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </article>
      <p v-if="!a.items.value.length" class="ma__empty">
        {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
      </p>
    </div>

    <!-- ── Tablo — iki satırlı olay hücresi (öneri 01, 2026-09-01):
         Olay + hedef + detay TEK hücrede (ana satır + soluk özet) — üç uzun
         metin sütununun yarışması sütun çakışmasının köküydü. Önem renkli
         nokta, sonuç yalnız reddedilende kırmızı kelime. ── -->
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!a.items.value.length">
            <td colspan="6" class="ma__empty">
              {{ a.loading.value ? t("mediaAudit.loading") : t("mediaAudit.empty") }}
            </td>
          </tr>
          <tr
            v-for="(r, i) in a.items.value"
            v-else
            :key="r.name"
            :class="{ 'ma__row--cursor': cursor === i }"
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
            <td class="ma__nowrap" :title="fmtTime(r.timestamp)">
              <span class="ma__muted">{{ fmtAgo(r.timestamp) }}</span>
              <span class="ma__tsub">{{ fmtDay(r.timestamp) }} · {{ fmtClock(r.timestamp) }}</span>
            </td>
            <td class="ma__ecell">
              <span class="ma__ecell-main">
                <i
                  class="ma__sevdot"
                  :class="`ma__sevdot--${tone(r)}`"
                  :title="t(`mediaAudit.severity.${String(r.severity || 'normal').toLowerCase()}`)"
                ></i>
                <b :class="{ ma__danger: isDenied(r) }">
                  {{ actionLabel(r.action)
                  }}<template v-if="isDenied(r)"> · {{ t("mediaAudit.decision.deny") }}</template>
                </b>
              </span>
              <span class="ma__ecell-sub">
                <span v-if="isMasked(r)" class="ma__target--masked" :title="maskExplain(r)">
                  <AppIcon name="shield" :size="10" />
                  {{ t("mediaAudit.masked") }}
                </span>
                <button
                  v-else-if="r.object_name"
                  type="button"
                  class="ma__link ma__ecell-file"
                  :title="r.object_name"
                  @click="filterByFile(r)"
                >
                  {{ r.object_name }}
                </button>
                <template v-else-if="hasBatchFiles(r)">
                  <span>{{ batchFiles(r).list[0] }}</span>
                  <span
                    v-if="batchFiles(r).list.length > 1 || batchFiles(r).more"
                    class="ma__tstate"
                  >
                    {{
                      t("mediaAudit.andMore", {
                        n: batchFiles(r).list.length - 1 + batchFiles(r).more,
                      })
                    }}
                  </span>
                </template>
                <span
                  v-if="r.target_state === 'deleted' || r.target_state === 'trashed'"
                  class="ma__tstate"
                >
                  {{ t(`mediaAudit.targetShort.${r.target_state}`) }}
                </span>
                <span v-if="ctxSummary(r)" class="ma__ecell-ctx" :title="ctxSummary(r)">
                  {{ ctxSummary(r) }}
                </span>
              </span>
            </td>
            <td>
              <button
                type="button"
                class="ma__link"
                :title="r.actor_display || r.actor"
                @click="filterByActor(r)"
              >
                {{ r.actor || "—" }}
              </button>
            </td>
            <td>
              <span v-if="r.tenant" class="ma__tenant" :title="r.tenant">
                {{ r.tenant_name || r.tenant }}
              </span>
              <span v-else class="ma__muted">—</span>
            </td>
            <td class="ma__row-acts">
              <button
                type="button"
                class="ma__eye ma__eye--row"
                :title="t('mediaAudit.action.detail')"
                @click="openDetail(r)"
              >
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
              <span class="ma__kcard-actor" :title="r.actor_display || r.actor">{{
                r.actor || "—"
              }}</span>
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
    <button
      v-if="!isDesktop"
      type="button"
      class="ma__fab"
      :disabled="a.loading.value"
      @click="refresh"
    >
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
                    <input
                      type="radio"
                      :name="`ma-f-${g.id}`"
                      :checked="g.value === opt.id"
                      @change="g.set(opt.id)"
                    />
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
                      {{
                        String(tg.object_name).startsWith("masked:")
                          ? t("mediaAudit.masked")
                          : tg.object_name
                      }}
                    </span>
                    <span class="ma__optcount">{{ tg.n }}</span>
                  </button>
                </div>
              </div>

              <div v-if="a.actors.value.length" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ t("mediaAudit.filter.actor") }}
                  <span class="ma__optcount"
                    >{{ filteredActors.length }}/{{ a.actors.value.length }}</span
                  >
                </label>
                <input
                  v-model="actorQuery"
                  type="search"
                  class="form-input-sm w-full mb-2"
                  :placeholder="t('mediaAudit.filter.actorSearch')"
                />
                <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  <label
                    class="flex items-center gap-2 text-[13px] cursor-pointer text-gray-700 dark:text-gray-300"
                  >
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
                    <span v-if="p.tenant" class="ma__tenant" :title="p.tenant">{{
                      p.tenant_name || p.tenant
                    }}</span>
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
      <Transition name="ma-sheet">
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
              <button
                type="button"
                class="ma__eye"
                :aria-label="t('mediaAudit.close')"
                @click="detail = null"
              >
                <AppIcon name="x" :size="18" />
              </button>
            </header>

            <!-- Kaydıran tek kap gövde: başlık ve alt şerit hep görünür, sheet'te
               kaydırma bitince sayfa devralmaz (`overscroll-behavior`). -->
            <div class="ma__detail-body">
              <div v-if="reportLoading" class="ma__rep-loading">
                {{ t("mediaAudit.report.loading") }}
              </div>

              <!-- ── Zaman çizgisi omurgası (öneri 02b): olay, kendi geçmişinin
               ortasında; düğümün içi katlanır bölümler. ── -->
              <div
                v-else
                class="ma__spine"
                :class="{ 'ma__spine--alone': !histOlder.length && !histNewer.length }"
              >
                <!-- ÖNCE -->
                <button
                  v-if="histOlder.length > 2 && !histOlderOpen"
                  type="button"
                  class="ma__spine-more"
                  @click="histOlderOpen = true"
                >
                  <i class="ma__spine-dot"></i>
                  ▸ {{ t("mediaAudit.node.older", { n: histOlder.length }) }}
                  <span class="ma__muted">
                    ·
                    {{
                      t("mediaAudit.node.last", {
                        when: fmtAgo(histOlder[histOlder.length - 1].timestamp),
                      })
                    }},
                    {{ decisionShort(histOlder[histOlder.length - 1]) }}
                  </span>
                </button>
                <button
                  v-for="h in histOlder.length > 2 && !histOlderOpen ? [] : histOlder"
                  :key="h.name"
                  type="button"
                  class="ma__spine-row"
                  @click="switchTo(h)"
                >
                  <i
                    class="ma__spine-dot"
                    :class="h.decision === 'DENY' ? 'ma__spine-dot--deny' : 'ma__spine-dot--ok'"
                  ></i>
                  <b>{{ actionLabel(h.action) }}</b>
                  <span :class="h.decision === 'DENY' ? 'ma__danger' : ''"
                    >· {{ decisionShort(h) }}</span
                  >
                  <span class="ma__muted" :title="fmtTime(h.timestamp)"
                    >· {{ fmtAgo(h.timestamp) }} · {{ h.actor }}</span
                  >
                </button>

                <!-- OLAY DÜĞÜMÜ -->
                <div class="ma__node">
                  <i class="ma__node-dot" :class="`ma__node-dot--${tone(detail)}`"></i>
                  <div class="ma__node-card" :class="`ma__node-card--${tone(detail)}`">
                    <p class="ma__node-title">{{ nodeTitle }}</p>
                    <p class="ma__node-meta">
                      <!-- Telefonda ray/nokta gizli; ton bu küçük noktada (öneri 7). -->
                      <i
                        class="ma__node-mini"
                        :class="`ma__node-mini--${tone(detail)}`"
                        aria-hidden="true"
                      ></i>
                      {{ fmtTime(detail.timestamp) }}
                      ·
                      {{
                        t(
                          `mediaAudit.severity.${String(detail.severity || "normal").toLowerCase()}`
                        )
                      }}
                      <template v-if="ctx(detail)?.reason">
                        · {{ reasonLabel(ctx(detail).reason) }}</template
                      >
                    </p>

                    <p v-if="isMasked(detail)" class="ma__mask-note">
                      <AppIcon name="lock" :size="13" />
                      {{ maskExplain(detail) }}
                    </p>
                    <p
                      v-if="
                        detail.target_state && detail.target_state !== 'ok' && !isMasked(detail)
                      "
                      class="ma__mask-note"
                    >
                      <AppIcon :name="targetIcon(detail)" :size="13" />
                      {{ targetNote(detail) }}
                    </p>

                    <div class="ma__nfolds">
                      <!-- İŞLEMİ YAPAN -->
                      <template v-if="report?.actor?.user">
                        <button
                          type="button"
                          class="ma__nfold-h"
                          :aria-expanded="nodeFolds.actor"
                          @click="nodeFolds.actor = !nodeFolds.actor"
                        >
                          <AppIcon name="user" :size="13" />
                          <span class="ma__nfold-l">{{ t("mediaAudit.node.actor") }}</span>
                          <span class="ma__nfold-n">
                            {{ report.actor.user }} ·
                            {{
                              t("mediaAudit.node.rolesN", { n: (report.actor.roles || []).length })
                            }}
                          </span>
                          <AppIcon
                            :name="nodeFolds.actor ? 'chevron-up' : 'chevron-down'"
                            :size="13"
                            class="ma__nfold-chev"
                          />
                        </button>
                        <dl v-show="nodeFolds.actor" class="ma__dl ma__nfold-b">
                          <dt>{{ t("mediaAudit.col.actor") }}</dt>
                          <dd class="ma__who">
                            <button
                              type="button"
                              class="ma__link ma__who-name"
                              @click="filterByActor(detail)"
                            >
                              {{ report.actor.user }}
                            </button>
                            <span
                              v-if="
                                report.actor.full_name &&
                                report.actor.full_name !== report.actor.user
                              "
                              class="ma__who-mail"
                            >
                              {{ report.actor.full_name }}
                            </span>
                          </dd>
                          <template v-if="report.actor.tenant">
                            <dt>{{ t("mediaAudit.col.tenant") }}</dt>
                            <dd class="ma__who">
                              <span class="ma__who-name">{{
                                report.actor.tenant_name || report.actor.tenant
                              }}</span>
                              <span v-if="report.actor.tenant_name" class="ma__who-mail">{{
                                report.actor.tenant
                              }}</span>
                            </dd>
                          </template>
                          <dt>{{ t("mediaAudit.report.roles") }}</dt>
                          <dd :title="(report.actor.roles || []).join(', ')">{{ rolesLine }}</dd>
                          <dt>{{ t("mediaAudit.report.last24h") }}</dt>
                          <dd>
                            {{
                              t("mediaAudit.report.actions", { n: report.actor.last24h_total || 0 })
                            }}
                            <span v-if="report.actor.last24h?.DENY" class="ma__tstate">
                              {{ t("mediaAudit.report.deniedN", { n: report.actor.last24h.DENY }) }}
                            </span>
                          </dd>
                          <template v-if="detail.ip_address">
                            <dt>IP</dt>
                            <dd class="ma__mono">{{ detail.ip_address }}</dd>
                          </template>
                        </dl>
                      </template>

                      <!-- OLAY KAYDI -->
                      <button
                        type="button"
                        class="ma__nfold-h"
                        :aria-expanded="nodeFolds.record"
                        @click="nodeFolds.record = !nodeFolds.record"
                      >
                        <AppIcon name="file-text" :size="13" />
                        <span class="ma__nfold-l">{{ t("mediaAudit.node.record") }}</span>
                        <span class="ma__nfold-n">
                          <span v-if="report?.integrity?.intact === true" class="ma__ok">✓</span>
                          <span v-else-if="report?.integrity?.intact === false" class="ma__danger"
                            >⚠</span
                          >
                          {{ t(`mediaAudit.col.decision`) }}:
                          {{
                            t(
                              `mediaAudit.decision.${String(detail.decision || "allow").toLowerCase()}`
                            )
                          }}
                        </span>
                        <AppIcon
                          :name="nodeFolds.record ? 'chevron-up' : 'chevron-down'"
                          :size="13"
                          class="ma__nfold-chev"
                        />
                      </button>
                      <dl v-show="nodeFolds.record" class="ma__dl ma__nfold-b">
                        <template v-for="pair in ctxPairs(detail)" :key="pair.key">
                          <dt>{{ pair.label }}</dt>
                          <dd class="ma__break">{{ pair.value }}</dd>
                        </template>
                        <dt>{{ t("mediaAudit.report.integrity") }}</dt>
                        <dd>
                          <span v-if="report?.integrity?.intact === true" class="ma__ok">
                            <AppIcon name="circle-check" :size="12" />
                            {{ t("mediaAudit.report.intact") }}
                          </span>
                          <span v-else-if="report?.integrity?.intact === false" class="ma__danger">
                            <AppIcon name="circle-alert" :size="12" />
                            {{ t("mediaAudit.report.tampered") }}
                          </span>
                          <span v-else class="ma__muted">{{
                            t("mediaAudit.report.unverified")
                          }}</span>
                        </dd>
                        <dt>{{ t("mediaAudit.report.retention") }}</dt>
                        <dd>{{ report?.retention?.note || "—" }}</dd>
                        <dt>{{ t("mediaAudit.col.record") }}</dt>
                        <dd class="ma__mono">{{ detail.name }}</dd>
                      </dl>

                      <!-- DOSYA -->
                      <template
                        v-if="
                          report?.file?.exists || (canThumb(detail) && detail.target_state === 'ok')
                        "
                      >
                        <button
                          type="button"
                          class="ma__nfold-h"
                          :aria-expanded="nodeFolds.file"
                          @click="nodeFolds.file = !nodeFolds.file"
                        >
                          <AppIcon name="image" :size="13" />
                          <span class="ma__nfold-l">{{ t("mediaAudit.node.file") }}</span>
                          <span v-if="report?.file?.exists" class="ma__nfold-n">
                            {{ report.file.file_name }} · {{ formatSize(report.file.file_size) }}
                          </span>
                          <AppIcon
                            :name="nodeFolds.file ? 'chevron-up' : 'chevron-down'"
                            :size="13"
                            class="ma__nfold-chev"
                          />
                        </button>
                        <div v-show="nodeFolds.file" class="ma__nfold-b">
                          <div
                            v-if="canThumb(detail) && detail.target_state === 'ok'"
                            class="ma__detail-preview"
                          >
                            <img
                              :src="thumbUrl(detail)"
                              :alt="detail.object_name"
                              @click="openLightbox(detail)"
                            />
                          </div>

                          <!-- Erişim seviyesi: rozet + çevirme + imzalı paylaşım (TUR-126 §4.2) -->
                          <div v-if="!isMasked(detail) && accessLevelOf(detail)" class="ma__access">
                            <span
                              class="ma__badge"
                              :class="accessLevelOf(detail) === 'private' ? 'ma__badge--warn' : ''"
                            >
                              <AppIcon
                                :name="accessLevelOf(detail) === 'private' ? 'lock' : 'globe'"
                                :size="12"
                              />
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
                              <AppIcon
                                :name="accessLevelOf(detail) === 'private' ? 'globe' : 'lock'"
                                :size="13"
                              />
                              {{
                                accessLevelOf(detail) === "private"
                                  ? t("mediaAccess.action.makePublic")
                                  : t("mediaAccess.action.makePrivate")
                              }}
                            </button>
                          </div>

                          <dl v-if="report?.file?.exists" class="ma__dl">
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
                            <dd class="ma__mono ma__break">
                              {{ report.file.content_hash || "—" }}
                            </dd>
                          </dl>

                          <div class="ma__nfold-acts">
                            <button
                              type="button"
                              class="hdr-btn-outlined"
                              @click="copyTarget(detail)"
                            >
                              <AppIcon name="copy" :size="13" />
                              {{ t("mediaAudit.action.copy") }}
                            </button>
                            <button
                              type="button"
                              class="hdr-btn-primary"
                              @click="openInMedia(detail)"
                            >
                              <AppIcon name="image" :size="13" />
                              {{ t("mediaAudit.action.openInMedia") }}
                            </button>
                          </div>
                        </div>
                      </template>

                      <!-- KULLANIM + ETKİ -->
                      <template
                        v-if="
                          report?.impact || report?.usage?.usages?.length || hasBatchFiles(detail)
                        "
                      >
                        <button
                          type="button"
                          class="ma__nfold-h"
                          :aria-expanded="nodeFolds.usage"
                          @click="nodeFolds.usage = !nodeFolds.usage"
                        >
                          <AppIcon name="package" :size="13" />
                          <span class="ma__nfold-l">{{ t("mediaAudit.node.usage") }}</span>
                          <span v-if="report?.impact" class="ma__nfold-n">
                            {{
                              t("mediaAudit.report.usedIn", { n: report.impact.live_products || 0 })
                            }}
                          </span>
                          <AppIcon
                            :name="nodeFolds.usage ? 'chevron-up' : 'chevron-down'"
                            :size="13"
                            class="ma__nfold-chev"
                          />
                        </button>
                        <div v-show="nodeFolds.usage" class="ma__nfold-b">
                          <div v-if="report?.impact" class="ma__impact">
                            <div class="ma__impact-cell">
                              <span>{{ t("mediaAudit.report.liveProducts") }}</span>
                              <strong>{{ report.impact.live_products }}</strong>
                            </div>
                            <div class="ma__impact-cell">
                              <span>{{ t("mediaAudit.report.orderCopies") }}</span>
                              <strong>{{ report.impact.order_copies }}</strong>
                            </div>
                            <div class="ma__impact-cell">
                              <span>{{ t("mediaAudit.report.redundant") }}</span>
                              <strong>{{ report.impact.redundant_records }}</strong>
                            </div>
                          </div>
                          <p v-if="report?.impact" class="ma__verdict-line">
                            <span class="ma__verdict-label">{{ verdictLabel }}</span>
                            <span :class="`ma__verdict--${report.impact.verdict}`">{{
                              verdictText
                            }}</span>
                          </p>
                          <ul v-if="report?.usage?.usages?.length" class="ma__uselist">
                            <li v-for="(u, i) in report.usage.usages" :key="i">
                              <span class="ma__use-label">{{ u.label || u.name }}</span>
                              <span class="ma__use-meta">{{ u.doctype }} · {{ u.name }}</span>
                              <span class="ma__chip-slot">
                                {{ u.field
                                }}<template v-if="u.variant"> · {{ u.variant }}</template>
                                <template v-if="u.variant_sku"> · {{ u.variant_sku }}</template>
                                <template v-if="u.position"> #{{ u.position }}</template>
                                <b v-if="u.is_default">★</b>
                              </span>
                              <span v-if="u.status" class="ma__use-status">{{ u.status }}</span>
                            </li>
                          </ul>
                          <template v-if="report?.usage?.orders?.length">
                            <h4>
                              {{ t("mediaAudit.report.orders", { n: report.usage.orders.length }) }}
                            </h4>
                            <p class="ma__rep-note">{{ t("mediaUsage.orderNote") }}</p>
                            <div class="ma__chips">
                              <span
                                v-for="(o, i) in report.usage.orders"
                                :key="i"
                                class="ma__chip-neutral"
                              >
                                {{ o.field }} · {{ o.name }}
                              </span>
                            </div>
                          </template>
                          <template v-if="hasBatchFiles(detail)">
                            <h4>
                              {{
                                t("mediaAudit.report.deletedFiles", {
                                  n: batchFiles(detail).list.length,
                                })
                              }}
                            </h4>
                            <ul class="ma__filelist">
                              <li v-for="fn in batchFiles(detail).list" :key="fn">{{ fn }}</li>
                            </ul>
                            <p v-if="batchFiles(detail).more" class="ma__rep-note">
                              {{ t("mediaAudit.report.moreFiles", { n: batchFiles(detail).more }) }}
                            </p>
                          </template>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- SONRA -->
                <button
                  v-if="histNewer.length > 2 && !histNewerOpen"
                  type="button"
                  class="ma__spine-more"
                  @click="histNewerOpen = true"
                >
                  <i class="ma__spine-dot"></i>
                  ▸ {{ t("mediaAudit.node.newer", { n: histNewer.length }) }}
                </button>
                <button
                  v-for="h in histNewer.length > 2 && !histNewerOpen ? [] : histNewer"
                  :key="h.name"
                  type="button"
                  class="ma__spine-row"
                  @click="switchTo(h)"
                >
                  <i
                    class="ma__spine-dot"
                    :class="h.decision === 'DENY' ? 'ma__spine-dot--deny' : 'ma__spine-dot--ok'"
                  ></i>
                  <b>{{ actionLabel(h.action) }}</b>
                  <span :class="h.decision === 'DENY' ? 'ma__danger' : ''"
                    >· {{ decisionShort(h) }}</span
                  >
                  <span class="ma__muted" :title="fmtTime(h.timestamp)"
                    >· {{ fmtAgo(h.timestamp) }} · {{ h.actor }}</span
                  >
                </button>

                <button
                  v-if="(report?.history?.length || 0) > 1 && !isMasked(detail)"
                  type="button"
                  class="ma__spine-all"
                  @click="filterByFile(detail)"
                >
                  {{ t("mediaAudit.node.filterAll", { n: report.history.length }) }}
                </button>
              </div>
            </div>

            <footer class="ma__detail-foot">
              <button type="button" class="hdr-btn-outlined" @click="copyJson(detail)">
                <AppIcon name="copy" :size="13" />
                {{ t("mediaAudit.action.copyJson") }}
              </button>
              <span class="ma__foot-gap"></span>
              <button type="button" class="hdr-btn-outlined" @click="detail = null">
                {{ t("common.close") }}
              </button>
            </footer>
          </section>
        </div>
      </Transition>
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

  // ── Önem triyajı (öneri 07) ──────────────────────────────────────
  // Dört sayaç kartının yerine tek kart: yığılmış önem şeridi + tıklanır
  // sayaç lejantı + son kritik olay satırı. Mobilde de tek kart akar.
  .ma__triage {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-4;
    margin-bottom: media.$s-4;
  }

  .ma__triage-top {
    display: flex;
    align-items: baseline;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .ma__triage-title {
    @include media.text("sm");
    font-weight: 700;
  }

  .ma__triage-total {
    @include media.text("xs");
    @include media.muted(2);

    strong {
      @include media.numeric;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .ma__triage-hint {
    margin-inline-start: auto;
    @include media.text("xs");
    @include media.muted(2);
  }

  .ma__tbar {
    display: flex;
    gap: 2px;
    height: 1.5rem;
    border-radius: media.$r-sm;
    overflow: hidden;
  }

  .ma__tseg {
    border: 0;
    padding: 0;
    cursor: pointer;
    flex-basis: 0.875rem; // sıfır olmayan minik dilim de tıklanabilir kalsın
    min-width: 0.875rem;
    transition: opacity $t-fast;

    &:hover {
      opacity: 0.8;
    }

    &--high {
      background: $c-error;
    }
    &--normal {
      background: $c-warning;
    }
    &--low {
      background: $l-border;
      @include dark {
        background: $d-border;
      }
    }
    &--on {
      outline: 2px solid $l-text-900;
      outline-offset: -2px;
      @include dark {
        outline-color: $d-text-hi;
      }
    }
  }

  .ma__tlegend {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    flex-wrap: wrap;
    @include media.text("xs");
  }

  .ma__tleg {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    @include media.text("xs");

    strong {
      @include media.numeric;
    }

    &--on {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }

  .ma__tdot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 2px;

    &--high {
      background: $c-error;
    }
    &--normal {
      background: $c-warning;
    }
    &--low {
      background: $l-border;
      @include dark {
        background: $d-border;
      }
    }
  }

  .ma__tcounts {
    margin-inline-start: auto;
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    @include media.muted(2);
    flex-wrap: wrap;
  }

  .ma__tcount {
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    @include media.text("xs");
    color: inherit;

    strong {
      @include media.numeric;
      font-weight: 700;
    }

    &:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    &--danger strong {
      color: $c-error-text;
      @include dark {
        color: $c-error;
      }
    }
    &--good strong {
      color: $c-success-text;
      @include dark {
        color: $c-success;
      }
    }
    &--warn strong {
      color: $c-warning-text;
      @include dark {
        color: $c-warning;
      }
    }
  }

  // Telefonda triyaj kartı (ölçüldü, 320px): lejant "0 Yüksek · 1823 Normal"
  // + "0 Düşük" diye iki satıra kırılıyor, sayaç satırı dört parçaya
  // dağılıyor, "dilime tıkla → süz" ipucu tek başına bir satır yiyordu.
  // Lejant üç eşit sütun, sayaçlar ayraçsız 2×2 ızgara, ipucu gizli —
  // lejant düğmeleri zaten aynı işi (dilime tıkla) görüyor.
  @media (max-width: media.$m-bp-md) {
    .ma__triage-hint {
      display: none;
    }

    // Lejant ve sayaçlar AYNI iki sütunda: üç lejant öğesi 320px'te tek
    // satıra sığmıyor (kart içi 222px; "Normal" → "Norm" kesiliyordu),
    // iki sütun hem sığar hem alttaki sayaçlarla hizalanır.
    .ma__tlegend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: media.$s-1 media.$s-3;
    }

    .ma__tleg {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
    }

    .ma__tcounts {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: media.$s-1 media.$s-3;
      margin: media.$s-1 0 0;
      padding-top: media.$s-2;
      @include media.divider(top);
    }

    .ma__tsep {
      display: none;
    }

    .ma__tcount {
      text-align: start;
      @include media.truncate;
    }
  }

  .ma__tcrit {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    border: 1px solid rgba($c-error, 0.25);
    background: media.$tint-danger;
    border-radius: media.$r-sm;
    cursor: pointer;
    text-align: start;
    @include media.text("xs");
    color: inherit;

    @include dark {
      background: rgba($c-error, 0.08);
      border-color: rgba($c-error, 0.35);
    }
  }

  .ma__tcrit-tag {
    flex: none;
    font-size: 0.5625rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: $c-error-text;
    @include dark {
      color: $c-error;
    }
  }

  .ma__tcrit-body {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ma__tcrit-who {
    @include media.muted(2);
    margin-inline-start: media.$s-1;
  }

  .ma__tcrit-go {
    flex: none;
    font-weight: 700;
    color: $c-error-text;
    @include dark {
      color: $c-error;
    }
  }

  // ── Başlık kebabı ────────────────────────────────────────────────
  .ma__menu {
    position: relative;
    display: inline-block;
  }

  .ma__menu-btn {
    padding-inline: media.$s-2;
  }

  .ma__menu-list {
    position: absolute;
    inset-inline-end: 0;
    top: calc(100% + 4px);
    z-index: 30;
    min-width: max-content;
    display: flex;
    flex-direction: column;
    padding: media.$s-1;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: $l-bg;
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);

    button {
      display: flex;
      align-items: center;
      gap: media.$s-2;
      min-height: 2.125rem;
      padding: media.$s-1 media.$s-3;
      border: 0;
      border-radius: media.$r-sm;
      background: none;
      cursor: pointer;
      white-space: nowrap;
      text-align: start;
      color: $l-text-700;
      @include media.text("sm");

      &:hover:not(:disabled) {
        background: $l-bg-muted;
      }
      &:disabled {
        opacity: 0.5;
        cursor: default;
      }
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;

      button {
        color: $d-text;
        &:hover:not(:disabled) {
          background: $d-bg-hover;
        }
      }
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
    color: $brand-text;

    @include dark {
      color: $brand;
    }
  }

  .ma__funnel-count {
    @include media.chip("brand");
    margin-left: 0.3rem;
  }

  // Telefonda huni metni gizlenir, ikon (+ sayaç) arama kutusunun yanına
  // sığar — MediaOptimizeView ile aynı. Aramanın `min-width: 12rem` +
  // `flex-basis: 14rem` çifti 320px'te düğmeyi ikinci satıra atıyordu.
  @media (max-width: media.$m-bp-rail) {
    .ma__toolbar {
      flex-wrap: nowrap;
    }

    .ma__search {
      flex: 1 1 0;
      min-width: 0;
    }

    .ma__funnel-text {
      display: none;
    }

    .ma__funnel-count {
      margin-left: 0;
    }
  }

  // ── Ortak parçalar ───────────────────────────────────────────────
  .ma__thumb {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    object-fit: cover;
    border-radius: media.$r-sm;
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
    gap: media.$s-1;
    @include media.chip("neutral");
  }

  .ma__badge--danger {
    color: $c-error-text;
    background: media.$tint-danger;
  }

  .ma__badge--warn {
    color: $c-warning-text;
    background: media.$tint-warning;
  }

  .ma__tenant {
    @include media.chip("info");
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
    color: $brand-text;
    cursor: pointer;
    text-align: left;
    max-width: 100%;
    @include media.text("xs");
    @include media.truncate;

    @include dark {
      color: $brand;
    }

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
    gap: media.$s-1;
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
    gap: media.$s-1;
    color: $c-warning-text;
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
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .ma__row-sub {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    @include media.text("xs");
    @include media.muted(1);
    @include media.truncate;
  }

  // Görsel ve alt satır kapları masaüstünde GÖRÜNMEZ: çocuklar satırın
  // doğrudan çocuğu gibi davranır, mevcut yerleşim bozulmaz.
  .ma__thumb-wrap,
  .ma__row-foot {
    display: contents;
  }

  // ── Dokunmatik satır — sol çapa görsel | tek omurga | sağ eylem ──────
  //
  // Ölçüldü (320px): çip, satıcı çipi, zaman, yol ve e-posta dikey
  // yığılıyor; e-postanın "(görünen ad)" eki `white-space: nowrap` ile
  // satırdan 59px TAŞIYORDU (`.ma__row-sub` flex kabı kırpıyor ama
  // çocuğu kırpmıyor). Omurga üç satıra iniyor:
  //   1. olay çipi + zaman     2. satıcı adı (birincil)
  //   3. yol · e-posta (soluk, tek satır, kırpılır)
  // Desen MediaOptimizeView `.mo__row` ızgarasıyla aynı.
  @media (max-width: media.$m-bp-rail) {
    // Sağ dolgu 4px: göz düğmesi 44px dokunma kutusu, ikon ortada 15px —
    // kutunun kendi 14px'lik boşluğu dolgu yerine geçiyor.
    .ma__row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      column-gap: media.$s-2;
      padding-inline-end: media.$s-1;
    }

    // Görsel SABİT KARE, satırın ortasında. Önce kap `align-self: stretch`
    // + `img { height: 100% }` idi: yüzde yükseklik auto-yükseklikli kapta
    // çözülmediği için dikey görseller kendi oranında uzuyor, satır 3rem
    // yerine 9rem oluyor ve liste dişli görünüyordu (ölçüldü, 375px).
    .ma__thumb-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      flex: none;
      width: 3rem;
      height: 3rem;
    }

    .ma__thumb {
      width: 100%;
      height: 100%;
      aspect-ratio: 1;
    }

    .ma__row-main {
      gap: media.$s-05;
    }

    // Çip + zaman sarmalı: omurga 320px'te 130px (ölçüldü), çip 84 + zaman
    // 70 sığmıyor; ızgara zamanı kırpıp yok ediyordu. Sarınca zaman çipin
    // altına iner, 360+ genişlikte yanında kalır. DOM sırası çip → satıcı →
    // zaman; `order` ile zaman öne, satıcı tam satıra.
    .ma__row-head {
      gap: media.$s-05 media.$s-2;
    }

    .ma__row-head > .ma__muted {
      order: 1;
      min-width: 0;
      @include media.text("xs");
      @include media.truncate;
    }

    // Satıcı çip değil, BİRİNCİL metin: yöneticinin ilk okuduğu şey kim.
    .ma__tenant {
      order: 2;
      flex-basis: 100%;
      display: block;
      min-width: 0;
      padding: 0;
      border-radius: 0;
      background: none;
      @include media.text("body");
      @include media.heading;
      @include media.truncate;
    }

    // Yol ve e-posta yan yana, ikisi de en az 8rem ister; alan yetmezse
    // (≈480px altı) alt alta düşer. 320'de tek satıra zorlanınca ikisi de
    // "/files/…" ve "urve…" diye anlamsız kalıyordu (ölçüldü).
    .ma__row-foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 media.$s-3;
      min-width: 0;
      @include media.text("xs");
      @include media.muted(2);
    }

    .ma__target {
      flex: 1 1 8rem;
      min-width: 0;
      max-width: none;
    }

    // Blok olunca kırpma artık çocuğa değil metnin kendisine uygulanıyor.
    .ma__row-sub {
      display: block;
      flex: 1 1 8rem;
      min-width: 0;
    }

    // "(görünen ad)" telefonda gereksiz: satıcı zaten 2. satırda.
    .ma__row-sub > .ma__muted {
      display: none;
    }
  }

  // Telefonda satır dört katmanlı yatay boşluğun içinde eziliyordu:
  // main 16 + sayfa 16 + kart 20 + satır 12 = her yanda 64px; 320px'te
  // omurgaya 72px kalıyordu (ölçüldü — çip 85px bile sığmıyordu). Sayfa ve
  // kart yatay dolgusu düşer, omurga 72 → 158px. Kırılım MediaOptimizeView
  // ile aynı (639px) — iki ekran aynı genişlikte aynı kenara dayansın.
  @media (max-width: 639px) {
    .mpage {
      padding-inline: 0;
    }

    .ma__list {
      padding-inline: 0;
    }
  }

  // iPhone SE sınıfı: görsel bir kademe dar, çip + zaman tek satırda kalsın.
  @media (max-width: media.$m-bp-xs) {
    .ma__thumb-wrap {
      width: 2.5rem;
      height: 2.5rem;
    }
  }

  // ── Izgara — Medya mozaik standardı (mo__mcard ailesinin buradaki
  // karşılığı; ölçüler ve şerit davranışı MediaOptimizeView ile birebir). ──
  .ma__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: media.$s-2;
  }

  .ma__mcard {
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

  // Ton halkası: reddedilen kırmızı, yüksek önem (izinli) amber.
  .ma__mcard--danger {
    border-color: transparent;
    box-shadow: 0 0 0 2px $c-error;
  }

  .ma__mcard--warn {
    border-color: transparent;
    box-shadow: 0 0 0 2px $c-warning;
  }

  .ma__mcard-hit {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    border-radius: inherit;
    background: none;
    cursor: pointer;
    @include media.focus-ring;
  }

  .ma__mcard-tile {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: inherit;
    pointer-events: none;
    background: $l-bg-muted;
    color: $l-text-500;

    img {
      // Akış içi img + aspect-ratio'lu kutu = döngüsel yükseklik hesabı;
      // mutlak konum döngüyü kırar, `cover` kareyi doldurur (mo__mcard-tile
      // ile aynı gerekçe).
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  .ma__mcard-mono {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: media.$s-1;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  // Kimlik şeridi: imleçli cihazda hover'da belirir, dokunmatikte hep açık;
  // menü açıkken kaybolmaz.
  .ma__mcard-strip {
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

      .ma__mcard:hover &,
      .ma__mcard--menu &,
      &:focus-within {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .ma__mcard-name {
    flex: 1;
    min-width: 0;
    @include media.text("xs");
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ma__mcard-kebab {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 0;
    border-radius: media.$r-sm;
    background: none;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: rgb(255 255 255 / 18%);
    }
  }

  // Kart kebabı yukarı açılır — şerit karonun dibinde.
  .ma__menu-list--up {
    top: auto;
    bottom: calc(100% + 4px);
  }

  // ── Tablo ────────────────────────────────────────────────────────
  // ── Tablo: iki satırlı olay hücresi (öneri 01) ───────────────────
  .ma__tsub {
    display: block;
    @include media.text("xs");
    @include media.muted(2);
    @include media.numeric;
  }

  .ma__ecell {
    min-width: 0;
  }

  .ma__ecell-main {
    display: flex;
    align-items: center;
    gap: media.$s-2;

    b {
      font-weight: 640;
    }
  }

  .ma__sevdot {
    width: 0.5rem;
    height: 0.5rem;
    flex: none;
    border-radius: 50%;

    &--danger {
      background: $c-error;
    }
    &--warn {
      background: $c-warning;
    }
    &--ok {
      background: $c-success;
    }
  }

  // Özet satırı TEK satırda kesilir: uzun yol/detay komşu sütuna taşamaz —
  // çakışma yapısal olarak imkânsız.
  .ma__ecell-sub {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    margin-inline-start: calc(0.5rem + media.$s-2);
    max-width: 34rem;
    @include media.text("xs");
    @include media.muted(1);
    white-space: nowrap;
    overflow: hidden;
  }

  .ma__ecell-file {
    min-width: 0;
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ma__ecell-ctx {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;

    &::before {
      content: "· ";
    }
  }

  // Göz butonu imleçli cihazda satır hover'ında belirir; dokunmatikte hep açık.
  @include media.hoverable {
    .ma__eye--row {
      opacity: 0;
      transition: opacity $t-fast;
    }

    tr:hover .ma__eye--row,
    .ma__eye--row:focus-visible {
      opacity: 1;
    }
  }

  .ma__table-wrap {
    overflow-x: auto;
  }

  .ma__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: media.$s-2 media.$s-3;
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

  .ma__nowrap {
    white-space: nowrap;
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
    gap: media.$s-1;
  }

  .ma__kcard {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-1;
    border-radius: media.$r-md;
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

  // ── Detay ────────────────────────────────────────────────────────
  .ma__scrim {
    z-index: 80;
    @include media.scrim;
  }

  .ma__detail {
    @include media.dialog(36rem);
    // Kaydıran, gövde (`.ma__detail-body`); kabuk yalnız köşeleri kırpar.
    overflow: hidden;
  }

  .ma__detail-head {
    flex: none;
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
    gap: media.$s-1;
    align-items: flex-start;
    min-width: 0;
  }

  .ma__detail-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  // ── Dokunmatik: alttan gelen sheet (MediaDetailPanel / MediaBackupView
  // ile aynı dil). Ortalanmış 36rem'lik pencere 375px'te 16px kenar
  // boşluğuyla 343px'e sıkışıyor, yapışkan başlık kaydırmada kırpılıyor ve
  // arkadaki liste birlikte kayıyordu (ölçüldü). ──
  @media (max-width: media.$m-bp-rail) {
    .ma__scrim {
      padding: 0;
      align-items: flex-end;
    }

    .ma__detail {
      position: fixed;
      @include media.touch-sheet(92dvh);

      &::before {
        @include media.touch-sheet-grab;
      }

      // Tab bar payı GEREKSİZ: karartma (z 80) tab bar'ı zaten örtüyor,
      // pay yalnız alt şeridin altında 64px boş beyaz bant bırakıyordu
      // (öneri 7, 2026-09-09). Yalnız cihazın güvenli alanı kalır.
      padding-bottom: env(safe-area-inset-bottom);
    }

    .ma__detail-head {
      padding: media.$s-2 media.$s-4 media.$s-3;
    }

    .ma__detail-who {
      overflow-wrap: anywhere;
    }
  }

  // Giriş güçlü, çıkış hızlı (ANIMATION_AUDIT §7.1.b). Masaüstünde
  // yalnız karartma solar; sheet kayması dokunmatik kırılımında.
  .ma-sheet-enter-active {
    transition: opacity 240ms ease;
  }

  .ma-sheet-leave-active {
    transition: opacity 200ms ease;
  }

  .ma-sheet-enter-from,
  .ma-sheet-leave-to {
    opacity: 0;
  }

  @media (max-width: media.$m-bp-rail) {
    .ma-sheet-enter-active .ma__detail {
      transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .ma-sheet-leave-active .ma__detail {
      transition: transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .ma-sheet-enter-from .ma__detail,
    .ma-sheet-leave-to .ma__detail {
      transform: translateY(105%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ma-sheet-enter-active,
    .ma-sheet-leave-active,
    .ma-sheet-enter-active .ma__detail,
    .ma-sheet-leave-active .ma__detail {
      transition: none;
    }
  }

  // ── Zaman çizgisi omurgası + katmanlı düğüm (öneri 02b) ──────────
  .ma__spine {
    position: relative;
    padding: media.$s-4 media.$s-5 media.$s-2;

    // Ray: komşu satırların noktalarından geçer.
    &::before {
      content: "";
      position: absolute;
      inset-block: media.$s-4;
      inset-inline-start: calc(media.$s-5 + 0.4375rem);
      width: 2px;
      background: $l-border-alt;
      @include dark {
        background: $d-border-inner;
      }
    }

    &--alone::before {
      display: none;
    }
  }

  .ma__spine-row,
  .ma__spine-more {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: baseline;
    gap: media.$s-1;
    width: 100%;
    padding: media.$s-1 0;
    border: 0;
    background: none;
    cursor: pointer;
    text-align: start;
    color: $l-text-700;
    opacity: 0.75;
    @include media.text("xs");

    &:hover {
      opacity: 1;
    }
    b {
      font-weight: 600;
    }
    @include dark {
      color: $d-text;
    }
  }

  .ma__spine-dot {
    width: 0.5rem;
    height: 0.5rem;
    flex: none;
    border-radius: 50%;
    background: $l-border;
    border: 2px solid $l-bg;
    margin-inline-end: media.$s-2;
    align-self: center;
    box-sizing: content-box;

    &--deny {
      background: $c-error;
    }
    &--ok {
      background: $c-success;
    }
    @include dark {
      border-color: $d-bg-card;
      background: $d-border;
      &.ma__spine-dot--deny {
        background: $c-error;
      }
      &.ma__spine-dot--ok {
        background: $c-success;
      }
    }
  }

  .ma__node {
    position: relative;
    z-index: 1;
    display: flex;
    gap: media.$s-2;
    margin-block: media.$s-2;
  }

  .ma__node-dot {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
    border-radius: 50%;
    margin-block-start: 1rem;
    box-sizing: content-box;

    &--danger {
      background: $c-error;
      border: 3px solid media.$tint-danger;
    }
    &--warn {
      background: $c-warning;
      border: 3px solid media.$tint-warning;
    }
    &--ok {
      background: $c-success;
      border: 3px solid media.$tint-success;
    }
  }

  .ma__node-card {
    flex: 1;
    min-width: 0;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    padding: media.$s-3 media.$s-4;
    background: $l-bg-soft;

    &--danger {
      background: media.$tint-danger;
      border-color: rgba($c-error, 0.25);
    }
    &--warn {
      background: media.$tint-warning;
      border-color: rgba($c-warning, 0.3);
    }
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      &.ma__node-card--danger {
        background: rgba($c-error, 0.08);
        border-color: rgba($c-error, 0.35);
      }
      &.ma__node-card--warn {
        background: rgba($c-warning, 0.08);
        border-color: rgba($c-warning, 0.35);
      }
    }
  }

  .ma__node-title {
    margin: 0;
    font-weight: 700;
    line-height: 1.45;
    @include media.text("body");
  }

  .ma__node-meta {
    margin: 2px 0 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  .ma__node-mini {
    display: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    margin-inline-end: media.$s-1;
    vertical-align: 0.05em;

    &--danger {
      background: $c-error;
      box-shadow: 0 0 0 3px media.$tint-danger;
    }
    &--warn {
      background: $c-warning;
      box-shadow: 0 0 0 3px media.$tint-warning;
    }
    &--ok {
      background: $c-success;
      box-shadow: 0 0 0 3px media.$tint-success;
    }
  }

  // Telefonda 14px nokta + ray + boşluk 375px'te 28px yer yiyordu; ton
  // meta satırındaki 8px noktaya iner, kart tam genişlik (öneri 7).
  @media (max-width: media.$m-bp-md) {
    .ma__node-dot,
    .ma__spine::before {
      display: none;
    }

    .ma__node {
      gap: 0;
    }

    .ma__node-mini {
      display: inline-block;
    }

    .ma__spine-all {
      padding-inline-start: 0;
    }
  }

  .ma__nfolds {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    margin-block-start: media.$s-3;
  }

  .ma__nfold-h {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    padding: media.$s-2 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-sm;
    background: $l-bg;
    cursor: pointer;
    text-align: start;
    font-weight: 700;
    color: $l-text-700;
    @include media.text("xs");

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .ma__nfold-l {
    flex: none;
    white-space: nowrap;
  }

  .ma__nfold-n {
    font-weight: 400;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    @include media.muted(1);
  }

  // Telefonda başlık iki satıra bölünüyor ("İşlemi / yapan") ve özet üç
  // harfe kırpılıyordu ("urveplastik@isto…"). Özet başlığın altına, kendi
  // satırına iner: etiket + ok ilk satır, özet tam genişlikte ikinci satır.
  @media (max-width: media.$m-bp-md) {
    .ma__nfold-h {
      flex-wrap: wrap;
      row-gap: 2px;
    }

    .ma__nfold-n {
      order: 4;
      flex-basis: 100%;
      padding-inline-start: calc(13px + #{media.$s-2});
    }

    .ma__spine {
      padding: media.$s-3 media.$s-3 media.$s-2;

      &::before {
        inset-block: media.$s-3;
        inset-inline-start: calc(#{media.$s-3} + 0.4375rem);
      }
    }

    .ma__node-card {
      padding: media.$s-3;
    }

    .ma__nfold-b {
      padding-inline: media.$s-1;
    }

    // Ürün adı kendi satırında; `.ma__use-label` kısayolu aşağıda sonra
    // tanımlandığı için burada bir kademe daha özgül seçici gerekiyor.
    .ma__uselist .ma__use-label {
      flex-basis: 100%;
    }
  }

  .ma__nfold-chev {
    margin-inline-start: auto;
    flex: none;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ma__nfold-b {
    padding: media.$s-1 media.$s-2 media.$s-2;

    h4 {
      margin: media.$s-3 0 media.$s-1;
      font-weight: 700;
      @include media.text("xs");
      @include media.muted(1);
    }
  }

  .ma__nfold-acts {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
    margin-block-start: media.$s-3;
  }

  .ma__spine-all {
    position: relative;
    z-index: 1;
    border: 0;
    background: none;
    cursor: pointer;
    padding: media.$s-1 0 media.$s-1 calc(0.9375rem + media.$s-2);
    font-weight: 700;
    color: $c-warning-text;
    @include media.text("xs");

    @include dark {
      color: $brand-light;
    }
  }

  .ma__foot-gap {
    flex: 1;
  }

  .ma__mask-note {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin: media.$s-2 0 0;
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
    margin: media.$s-2 0;
  }

  .ma__detail-preview {
    margin: media.$s-2 0 0;

    img {
      width: 100%;
      // `max-height` DEĞİL sabit `height`: üst sınır, yükseklik yine de
      // içerikten türer demektir — görsel inene kadar kutu 0 yüksekliğinde
      // durur ve indiğinde altındaki rapor bloğu 240px aşağı zıplardı.
      // Sabit kutu + `contain` ile oran korunur, düzen kaymaz.
      height: 15rem;
      object-fit: contain;
      border-radius: media.$r-md;
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
    flex: none;
    display: flex;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-5 media.$s-4;
    flex-wrap: wrap;
    background: $l-bg;
    @include media.divider(top);

    @include dark {
      background: $d-bg-card;
    }

    @media (max-width: media.$m-bp-rail) {
      padding: media.$s-3 media.$s-4;
    }

    // Telefonda iki düğme eşit genişlikte yan yana; boşluk ayracı gereksiz.
    @media (max-width: media.$m-bp-sm) {
      flex-wrap: nowrap;

      > .hdr-btn-outlined {
        flex: 1 1 0;
        min-width: 0;
        justify-content: center;
      }

      .ma__foot-gap {
        display: none;
      }
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
    background: media.$o-strong;
    cursor: zoom-out;

    img {
      max-width: 92vw;
      max-height: 80vh;
      object-fit: contain;
      border-radius: media.$r-md;
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
    padding: media.$s-1 media.$s-2;
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
    gap: media.$s-1;
    margin-inline-start: auto;
    @include media.text("xs");
    @include media.muted(2);
  }

  // Telefonda çipler düzensiz sarıyordu (2 + 1 + 1). Tek yatay şerit: sayfa
  // kenar boşluğuna taşarak kayar, yarım görünen son çip "devamı var" der.
  // Şeridin kendi taşması kabın içinde kalır; sayfa yatay kaymaz.
  @media (max-width: media.$m-bp-md) {
    .ma__presets {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-inline: calc(-1 * #{media.$s-4});
      padding-inline: media.$s-4;
      scroll-snap-type: x proximity;
      // Yapışma noktası dolguyu saysın: yoksa ilk çip kabın 0'ına
      // yapışıp şerit açılışta 16px kaymış geliyordu (ölçüldü).
      scroll-padding-inline: media.$s-4;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .ma__preset {
      flex: none;
      white-space: nowrap;
      scroll-snap-align: start;
    }
  }

  // ── Canlı yenileme ───────────────────────────────────────────────
  .ma__live {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    padding: media.$s-1 media.$s-2;
    border-radius: media.$r-md;
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
    color: $c-success-text;

    @include dark {
      color: $c-success;
    }
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
    gap: media.$s-2;
    width: 100%;
    background: none;
    border: none;
    padding: media.$s-05 0;
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
    // Üç hücre HER genişlikte tek satır: 2 + 1 dizilim telefonda üçüncü
    // hücreyi yalnız bırakıyor, altındaki "Karar" kutusuyla hizası kayıyordu.
    // "Karar" ızgaradan ayrı (cümle, rakam değil).
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: media.$s-2;
    margin: media.$s-3 0 0;
  }

  .ma__verdict-line {
    display: flex;
    align-items: baseline;
    gap: media.$s-2;
    margin: media.$s-2 0 0;
    padding: media.$s-3 media.$s-4;
    border-radius: media.$r-md;
    @include media.surface("soft");
    @include media.text("sm");
  }

  .ma__verdict-label {
    flex: none;
    @include media.muted(1);
    @include media.text("xs");
  }

  .ma__impact-cell {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: media.$s-05;
    padding: media.$s-3 media.$s-2;
    border-radius: media.$r-md;
    text-align: center;
    @include media.surface("soft");

    @media (max-width: media.$m-bp-sm) {
      padding: media.$s-2 media.$s-1;
    }

    span {
      @include media.text("xs");
      @include media.muted(1);
    }

    strong {
      @include media.text("display");
      font-weight: 700;
      @include media.numeric;
    }
  }

  .ma__verdict--in_use {
    color: $c-success-text;
  }

  .ma__verdict--unused {
    color: $c-error-text;
  }

  .ma__verdict--order_only,
  .ma__verdict--history_only {
    color: $c-warning-text;
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
      gap: media.$s-2;
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
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .ma__filelist {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow-y: auto;

    li {
      padding: media.$s-1 0;
      word-break: break-all;
      font-family: ui-monospace, monospace;
      @include media.text("xs");

      & + li {
        @include media.divider(top);
      }
    }
  }

  .ma__gain {
    color: $c-success-text;
  }

  .ma__ok {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    color: $c-success-text;
  }

  .ma__danger {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    color: $c-error-text;
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
    padding: media.$s-8;
    text-align: center;
    @include media.muted(2);
  }
</style>

<script setup>
  import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    shallowRef,
    useId,
    watch,
  } from "vue";
  import { useI18n } from "vue-i18n";

  import FocalEditor from "./FocalEditor.vue";
  import PlaceList from "./PlaceList.vue";
  import { CONTEXTS } from "./contexts/index.js";
  import { useFocalPoint } from "@/composables/useFocalPoint.js";
  import { useScrollLock } from "@/composables/useScrollLock";
  import { frameRect, objectPosition } from "@/lib/media/crop/geometry.js";
  import messages from "@/lib/media/preview/messages.js";
  import {
    STAGE,
    cutPlaceCount,
    devicesFor,
    formatPercent,
    kindKey,
    placeCount,
    placesFor,
    placeVisibility,
  } from "@/lib/media/preview/places.js";
  import {
    getPreviewPrefs,
    getPreviewTarget,
    setPreviewPrefs,
  } from "@/lib/media/preview/previewApi.js";

  /**
   * "Görseliniz nerelerde görünecek?" penceresi — spec 2026-10-01 §4.2, onaylı pano 1.
   * Bilgisayar (≥1024 px): üç sütun (yer listesi · sayfa bağlamı · odak noktası).
   * Telefon (<1024 px): Önizleme / Odak noktası sekmeleri + sabit alt çubuk (pano 4).
   * Diyalog kabuğu MediaModal'dan uyarlandı: Esc kaydedilmemiş değişiklikte onay
   * ister, bu yüzden MediaModal doğrudan kullanılamıyor.
   */
  const props = defineProps({
    fileUrl: { type: String, required: true },
    slotKey: { type: String, required: true },
    fileName: { type: String, default: "" },
    context: { type: Object, default: () => ({}) },
    /** Kapanınca odağın döneceği öğe ya da onu bulan fonksiyon (otomatik açılışta düğme sonradan oluşur). */
    returnFocus: { type: [Object, Function], default: null },
  });
  const emit = defineEmits(["close", "saved"]);
  const open = defineModel("open", { type: Boolean, default: false });
  const { t, locale } = useI18n({ messages });

  const uid = useId();
  const ids = {
    title: `ipm-t-${uid}`,
    focal: `ipm-f-${uid}`,
    square: `ipm-s-${uid}`,
    confirmTitle: `ipm-ct-${uid}`,
    confirmBody: `ipm-cb-${uid}`,
    tabPreview: `ipm-tp-${uid}`,
    tabFocal: `ipm-tf-${uid}`,
    panelPreview: `ipm-pp-${uid}`,
    panelFocal: `ipm-pf-${uid}`,
  };

  const root = ref(null);
  const target = shallowRef(null);
  const fp = shallowRef(null);
  const device = ref("desktop");
  const placeIdx = ref(0);
  const mobileTab = ref("preview");
  const autoopen = ref(true);
  const confirming = ref(false);
  const narrow = ref(false);
  const narrowScale = ref(0.3);
  const natural = ref({ w: 0, h: 0 });
  /** Yeniden denemeler bitti, varlık hâlâ yok → mesaj "sayfayı kaydedip yeniden açın" olur. */
  const gaveUp = ref(false);
  let lastFocused = null;
  let active = false;
  let listening = false;
  let inerted = [];
  let mq = null;

  useScrollLock(open);

  // Dönüşümle taşınmış adreste sunucu güncel adresi döner (`Media URL Redirect`).
  const src = computed(() => target.value?.file_url || props.fileUrl);

  /**
   * Yeni yüklenen dosya tarama/işleme kuyruğundan çıkana kadar birkaç saniye 404
   * dönebilir; `<img>` ilk hatada kırık kalır ve bir daha denemez. Görsel önce
   * arka planda yüklenir, hata alırsa IMG_RETRY_MS aralıkla yeniden denenir;
   * o sürede bağlamlar boş (saydam) görselle iskelet gösterir.
   */
  const BLANK_IMG =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const IMG_RETRY_MS = 2000;
  const IMG_RETRY_MAX = 30;
  const shownSrc = ref(BLANK_IMG);
  let imgTimer = null;
  let imgProbe = null;
  function stopImageProbe() {
    if (imgTimer) clearTimeout(imgTimer);
    imgTimer = null;
    if (imgProbe) imgProbe.onload = imgProbe.onerror = null;
    imgProbe = null;
  }
  function loadImage(url, attempt = 0) {
    stopImageProbe();
    if (!url) return;
    const u = attempt ? `${url}${url.includes("?") ? "&" : "?"}r=${attempt}` : url;
    // Tarayıcı dışı ortam (SSR, test): ön yükleme yok, adres doğrudan kullanılır.
    if (typeof Image === "undefined") {
      shownSrc.value = u;
      return;
    }
    const probe = new Image();
    imgProbe = probe;
    probe.onload = () => {
      if (imgProbe !== probe) return;
      imgProbe = null;
      shownSrc.value = u;
    };
    probe.onerror = () => {
      if (imgProbe !== probe) return;
      imgProbe = null;
      if (attempt >= IMG_RETRY_MAX) return;
      imgTimer = setTimeout(() => loadImage(url, attempt + 1), IMG_RETRY_MS);
    };
    probe.src = u;
  }
  watch(
    [src, open],
    ([url, isOpen]) => {
      if (!isOpen) return stopImageProbe();
      shownSrc.value = BLANK_IMG;
      loadImage(url);
    },
    { immediate: true }
  );
  onBeforeUnmount(stopImageProbe);
  const isProduct = computed(() => props.slotKey === "product.image");
  /**
   * Ürün görseli kare kutusu. Sunucu `square.size`'ı yalnız görsel gerçekten kare
   * olduğunda doldurur; değilse kare, ürün kaydedilince kurulur (media/kare.py
   * `kare_boyutu`: 1000–2000 px). Henüz kare olmayana "tamamlandı" denmez.
   */
  const KARE_MIN = 1000;
  const KARE_MAX = 2000;
  const squareInfo = computed(() => {
    const sq = target.value?.square;
    if (!isProduct.value || !sq) return null;
    if (sq.size >= KARE_MIN && sq.size <= KARE_MAX) {
      return { done: true, from: sq.original, size: sq.size };
    }
    const { width: w = 0, height: h = 0 } = target.value.source || {};
    if (!(w > 0 && h > 0)) return null;
    const size = Math.max(KARE_MIN, Math.min(KARE_MAX, Math.max(w, h)));
    return { done: false, from: { width: w, height: h }, size };
  });
  const imageRatio = computed(() => {
    const s = target.value?.source || {};
    const w = s.width || natural.value.w;
    const h = s.height || natural.value.h;
    const ratio = w > 0 && h > 0 ? w / h : 0;
    // Sonsuz/NaN oran "bilinmiyor" sayılır — rozet uydurma yüzde göstermesin (Review Focus 1).
    return Number.isFinite(ratio) ? ratio : 0;
  });
  const devices = computed(() => devicesFor(props.slotKey));
  const places = computed(() => placesFor(props.slotKey, device.value));
  const currentPlace = computed(
    () => places.value[Math.min(placeIdx.value, places.value.length - 1)] || null
  );
  const focal = computed(() => fp.value?.focal.value || { x: 0.5, y: 0.5 });
  const toItems = (list) =>
    list.map((place) => ({
      id: `${place.device}:${place.key}`,
      place,
      label: t(place.labelKey),
      visibility: placeVisibility(place, imageRatio.value),
    }));
  const placeItems = computed(() => toItems(places.value));
  const phoneItems = computed(() => toItems(placesFor(props.slotKey, "mobile")));
  const frame = computed(() =>
    currentPlace.value
      ? frameRect(imageRatio.value, currentPlace.value.ratio, focal.value, currentPlace.value.fit)
      : null
  );
  const scale = computed(() => {
    if (device.value === "mobile") return 1;
    return narrow.value ? narrowScale.value : STAGE.desktopStagePx / STAGE.desktopPagePx;
  });
  const stageTitle = computed(() =>
    currentPlace.value ? `${t(currentPlace.value.labelKey)} · ${currentPlace.value.ratioLabel}` : ""
  );
  const stageScale = computed(() =>
    device.value === "desktop"
      ? t("imagePlacement.stageScale.desktop", {
          page: STAGE.desktopPagePx,
          pct: formatPercent(scale.value, locale.value),
        })
      : t("imagePlacement.stageScale.mobile", { page: STAGE.mobilePagePx })
  );
  const currentContext = computed(
    () => (currentPlace.value && CONTEXTS[currentPlace.value.context]) || null
  );
  const contextData = computed(() => ({
    storeName: props.context.storeName || "",
    productName: props.context.productName || "",
    price: props.context.price || "",
  }));
  const subtitle = computed(() => {
    const s = target.value?.source || {};
    const kind = t(`imagePlacement.kind.${kindKey(props.slotKey)}`);
    const file = props.fileName || decodeURIComponent(String(props.fileUrl).split("/").pop() || "");
    return s.width && s.height
      ? t("imagePlacement.subtitle", { kind, file, w: s.width, h: s.height })
      : t("imagePlacement.subtitleNoSize", { kind, file });
  });
  const statusText = computed(() => {
    const a = fp.value?.announce.value;
    if (!a) return "";
    const p = { ...a.params };
    if (typeof p.x === "number") p.x = formatPercent(p.x / 100, locale.value);
    if (typeof p.y === "number") p.y = formatPercent(p.y / 100, locale.value);
    return t(a.key, p);
  });
  const canSave = computed(() => !!target.value?.asset);
  const STATUS_ERRORS = new Set([
    "imagePlacement.status.saveFailed",
    "imagePlacement.status.conflict",
  ]);
  /** Hata bildirimleri başarı yeşiliyle değil, uyarı rengiyle yazılır. */
  const statusError = computed(() => STATUS_ERRORS.has(fp.value?.announce.value?.key));
  /** Kayıt okunurken odak denetimleri kapalı: `load()` sonucu araya giren bir hareketi ezerdi. */
  const loading = computed(() => !fp.value || fp.value.loading.value);
  const dirty = computed(() => !!fp.value?.dirty.value);
  const primaryLabel = computed(() =>
    isProduct.value && !dirty.value ? t("imagePlacement.done") : t("imagePlacement.save")
  );
  const primaryDisabled = computed(() => {
    if (loading.value || fp.value.saving.value) return true;
    if (isProduct.value && !dirty.value) return false;
    return !canSave.value;
  });
  const summary = computed(() => {
    const n = placeCount(props.slotKey);
    const cut = cutPlaceCount(props.slotKey, imageRatio.value);
    return cut
      ? t("imagePlacement.summary.some", { n, cut })
      : t("imagePlacement.summary.none", { n });
  });
  const fileSize = computed(() => {
    const b = target.value?.source?.bytes || 0;
    return b
      ? `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(b / 1024)} KB`
      : "";
  });
  const chip = (v) =>
    v.full
      ? t("imagePlacement.chip.full")
      : t("imagePlacement.chip.partial", { pct: formatPercent(v.fraction, locale.value) });
  const figStyle = (place) => ({
    objectFit: place.fit,
    objectPosition: place.fit === "cover" ? objectPosition(focal.value) : "50% 50%",
  });

  function markCurrent() {
    if (fp.value && currentPlace.value)
      fp.value.markViewed(currentPlace.value.key, currentPlace.value.device);
  }
  function pickDevice(d) {
    device.value = d;
    placeIdx.value = 0;
    markCurrent();
  }
  function pickPlace(i) {
    placeIdx.value = i;
    markCurrent();
  }
  const onNatural = ({ w, h }) => {
    // Yer tutucu (1×1 saydam) gerçek oranı bozmasın.
    if (shownSrc.value !== BLANK_IMG) natural.value = { w, h };
  };
  const onSet = (x, y) => !loading.value && fp.value.setFocal(x, y);
  const onNudge = (dx, dy, big) => !loading.value && fp.value.nudge(dx, dy, big);
  const onCenter = () => !loading.value && fp.value.center();
  const onSuggest = () => !loading.value && fp.value.suggest();
  /**
   * Odağı pencere içinde kararlı bir yere taşır (I-1): odak noktası işareti,
   * yoksa "Odak noktası" ya da pencere başlığı (`tabindex="-1"`).
   */
  function focusStable() {
    const el =
      root.value?.querySelector(".fe__handle:not([disabled])") ||
      document.getElementById(ids.focal) ||
      document.getElementById(ids.title);
    el?.focus();
  }
  /** "Yeniden yükle" düğmesi `conflict` sıfırlanınca DOM'dan kalkar → odak gövdeye düşmesin. */
  async function reload() {
    if (!fp.value) return;
    const pending = fp.value.load();
    await nextTick();
    focusStable();
    await pending;
    await nextTick();
    if (!root.value?.contains(document.activeElement) || document.activeElement === root.value)
      focusStable();
  }

  async function onAutoOpen(ev) {
    const v = !!ev.target.checked;
    autoopen.value = v;
    try {
      await setPreviewPrefs(v);
    } catch {
      autoopen.value = !v;
    }
  }

  /**
   * Yükleme sonrası otomatik açılışta varlık henüz yok (RQ işi commit'ten sonra
   * üretir): pencere açıkken hedef `RETRY_MS` aralıkla en çok `RETRY_MAX` kez
   * (~60 sn) yeniden okunur, varlık gelince Kaydet açılır (final review I-5).
   */
  const RETRY_MS = 3000;
  const RETRY_MAX = 20;
  /**
   * Her `start()` yeni bir koşu açar; geç gelen yanıt koşu numarası tutmazsa
   * atılır — pencere başka görsele yönelmişse eski hedef yeni görselin üzerine
   * yazılmaz (final review I-3).
   */
  let runId = 0;
  let retryTimer = null;
  function cancelRun() {
    runId += 1;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }
  async function fetchTarget() {
    try {
      return await getPreviewTarget(props.fileUrl, props.slotKey);
    } catch {
      return null;
    }
  }
  function scheduleRetry(run, attempt) {
    if (run !== runId) return;
    if (attempt > RETRY_MAX) {
      gaveUp.value = true;
      return;
    }
    retryTimer = setTimeout(() => retry(run, attempt), RETRY_MS);
  }
  async function retry(run, attempt) {
    retryTimer = null;
    if (run !== runId || !open.value) return;
    const tgt = await fetchTarget();
    if (run !== runId) return;
    if (!tgt?.asset) {
      scheduleRetry(run, attempt + 1);
      return;
    }
    // Beklerken taşınan odak kaybolmasın: yeni varlığın kaydı okunduktan sonra geri konur.
    const prev = fp.value;
    const moved = prev?.dirty.value ? { ...prev.focal.value } : null;
    target.value = tgt;
    const inst = useFocalPoint({ asset: tgt.asset, initialFocal: tgt.focal });
    fp.value = inst;
    markCurrent();
    await inst.load();
    if (run !== runId) return;
    if (moved) inst.setFocal(moved.x, moved.y);
  }

  async function start() {
    cancelRun();
    const run = runId;
    confirming.value = false;
    mobileTab.value = "preview";
    // Cihaz/yer yalnız slota ve ekran genişliğine bağlı: hedef beklenmeden kurulur,
    // yükleme sırasında yapılan seçim yükleme bitince geri alınmaz (final review I-1).
    device.value =
      narrow.value && devices.value.includes("mobile") ? "mobile" : devices.value[0] || "desktop";
    placeIdx.value = 0;
    natural.value = { w: 0, h: 0 };
    gaveUp.value = false;
    fp.value = null;
    target.value = null;
    const prefs = getPreviewPrefs()
      .then((p) => (autoopen.value = p?.autoopen !== false))
      .catch(() => {});
    const tgt = await fetchTarget();
    await prefs;
    if (run !== runId) return;
    target.value = tgt || {
      asset: "",
      processing: true,
      source: { width: 0, height: 0, bytes: 0, format: "" },
      focal: null,
      square: null,
    };
    const inst = useFocalPoint({
      asset: target.value.asset || "",
      initialFocal: target.value.focal,
    });
    fp.value = inst;
    markCurrent();
    await inst.load();
    if (!target.value.asset) scheduleRetry(run, 1);
  }

  async function onSave() {
    if (isProduct.value && !dirty.value) return close();
    if (!canSave.value || !fp.value) return;
    const r = await fp.value.save();
    if (r.ok) {
      emit("saved", { ...fp.value.focal.value });
      close();
      return;
    }
    // Kaydet `saving` sırasında kapalıydı; tarayıcı odağı gövdeye atmış olabilir.
    await nextTick();
    if (!root.value?.contains(document.activeElement)) focusStable();
  }
  let beforeConfirm = null;
  function requestClose() {
    if (confirming.value) {
      keepEditing();
      return;
    }
    if (dirty.value && canSave.value) {
      beforeConfirm = document.activeElement;
      confirming.value = true;
      nextTick(() => root.value?.querySelector("[data-confirm-keep]")?.focus());
      return;
    }
    close();
  }
  /**
   * Odağı açan öğeye geri verir. `close()` içinden ÇAĞRILIR: gerçek çağrı
   * yerleri pencereyi `v-if` ile bağlar, `update:open=false` ile pencere
   * `open` prop'u hiç `false` olmadan sökülür ve izleyici çalışmaz (I-2).
   * İdempotent: izleyici ve `onBeforeUnmount` da çağırır, ilk çağrı kazanır.
   */
  function releaseFocus() {
    cancelRun();
    if (!active) return;
    active = false;
    unlistenDocument();
    restoreOutside();
    const hedef = typeof props.returnFocus === "function" ? props.returnFocus() : props.returnFocus;
    const back = hedef?.isConnected ? hedef : lastFocused?.isConnected ? lastFocused : null;
    back?.focus?.();
    lastFocused = null;
  }
  function close() {
    confirming.value = false;
    beforeConfirm = null;
    releaseFocus();
    open.value = false;
    emit("close");
  }
  const discard = () => close();
  /** Onay kapanınca odak onaydan önceki öğeye döner (I-3). */
  function keepEditing() {
    const back = beforeConfirm;
    beforeConfirm = null;
    confirming.value = false;
    nextTick(() => (back?.isConnected && !back.disabled ? back.focus() : focusStable()));
  }

  function onTabsKey(ev) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    ev.preventDefault();
    mobileTab.value = mobileTab.value === "preview" ? "focal" : "preview";
    nextTick(() => root.value?.querySelector('[role="tab"][aria-selected="true"]')?.focus());
  }

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables() {
    if (!root.value) return [];
    const scope =
      (confirming.value && root.value.querySelector('[role="alertdialog"]')) || root.value;
    return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest("[hidden],[inert]"));
  }
  function onTab(event) {
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !root.value.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function inertOutside() {
    restoreOutside();
    let branch = root.value;
    while (branch && branch !== document.body) {
      const parent = branch.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling === branch) continue;
        inerted.push({ element: sibling, value: sibling.inert });
        sibling.inert = true;
      }
      branch = parent;
    }
  }
  function restoreOutside() {
    for (let i = inerted.length - 1; i >= 0; i -= 1) inerted[i].element.inert = inerted[i].value;
    inerted = [];
  }

  /**
   * Odak pencerenin DIŞINDAYKEN (ör. kaldırılan bir düğmeden gövdeye düşmüşse)
   * Esc yine kapatır, Tab pencereye geri getirir. İçeriden gelen Esc kökte
   * `.stop` ile işlenir, buraya ulaşmaz (çift işlem yok, uygulamanın diğer
   * Esc dinleyicileri tetiklenmez). Dinleyici YALNIZ pencere açıkken durur (I-1).
   */
  function onDocumentKey(ev) {
    if (!active || !root.value || root.value.contains(ev.target)) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      requestClose();
    } else if (ev.key === "Tab") {
      onTab(ev);
    }
  }
  function listenDocument() {
    if (!listening) document.addEventListener("keydown", onDocumentKey);
    listening = true;
  }
  function unlistenDocument() {
    if (listening) document.removeEventListener("keydown", onDocumentKey);
    listening = false;
  }

  watch(
    open,
    async (isOpen) => {
      if (typeof document === "undefined") return;
      if (isOpen) {
        if (active) return;
        active = true;
        lastFocused = document.activeElement;
        listenDocument();
        await nextTick();
        inertOutside();
        (focusables()[0] || root.value)?.focus();
        start();
        return;
      }
      releaseFocus();
    },
    { immediate: true }
  );
  // Açık pencere başka görsele yönelirse hedef (varlık + ETag) yeniden okunur;
  // aksi halde Kaydet eski görselin varlığına yazardı (final review I-3).
  watch(
    () => [props.fileUrl, props.slotKey],
    () => {
      if (open.value && active) start();
    }
  );

  function onMq(e) {
    narrow.value = e.matches;
  }
  onMounted(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    mq = window.matchMedia("(max-width: 1023.98px)");
    narrow.value = mq.matches;
    narrowScale.value = Math.min(
      1,
      Math.max(0.2, ((window.innerWidth || 390) - 32) / STAGE.desktopPagePx)
    );
    mq.addEventListener?.("change", onMq);
  });
  onBeforeUnmount(() => {
    cancelRun();
    mq?.removeEventListener?.("change", onMq);
    releaseFocus();
    unlistenDocument();
    restoreOutside();
  });
</script>

<template>
  <Transition name="ipm">
    <div
      v-if="open"
      ref="root"
      class="ipm"
      :class="{ 'ipm--narrow': narrow }"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.title"
      @keydown.esc.stop.prevent="requestClose"
      @keydown.tab="onTab"
    >
      <div class="ipm__backdrop" aria-hidden="true" @click="requestClose" />
      <div class="ipm__panel">
        <header class="ipm__head">
          <div class="ipm__titles">
            <h2 :id="ids.title" class="ipm__title" tabindex="-1">
              {{ narrow ? t("imagePlacement.titleShort") : t("imagePlacement.title") }}
            </h2>
            <p class="ipm__subtitle">{{ subtitle }}</p>
          </div>
          <div
            v-if="!narrow && devices.length > 1"
            role="group"
            :aria-label="t('imagePlacement.device.group')"
            class="ipm__seg"
          >
            <button
              v-for="d in devices"
              :key="d"
              type="button"
              class="ipm__seg-btn"
              :class="{ 'ipm__seg-btn--on': device === d }"
              :aria-pressed="device === d ? 'true' : 'false'"
              @click="pickDevice(d)"
            >
              <svg
                v-if="d === 'desktop'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="2" y="4" width="20" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              <svg
                v-else
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M11 18h2" />
              </svg>
              {{ t(`imagePlacement.device.${d}`) }}
            </button>
          </div>
          <button
            type="button"
            class="ipm__close"
            :aria-label="t('imagePlacement.close')"
            @click="requestClose"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <p v-if="target && target.processing" class="ipm__notice" role="note">
          {{ t("imagePlacement.status.processing") }}
        </p>

        <div v-if="!narrow" class="ipm__grid">
          <nav class="ipm__list" :aria-label="t('imagePlacement.listLabel')">
            <section v-if="squareInfo" class="ipm__square" :aria-labelledby="ids.square">
              <h3 :id="ids.square" class="ipm__h4">
                {{ t(`imagePlacement.square.${squareInfo.done ? "title" : "pendingTitle"}`) }}
              </h3>
              <p v-if="squareInfo.from" class="ipm__square-dims">
                {{ squareInfo.from.width }} × {{ squareInfo.from.height }} → {{ squareInfo.size }} ×
                {{ squareInfo.size }}
              </p>
              <p class="ipm__small">
                {{
                  t(`imagePlacement.square.${squareInfo.done ? "body" : "pendingBody"}`, {
                    size: squareInfo.size,
                  })
                }}
              </p>
              <p class="ipm__small">
                {{ t("imagePlacement.square.format") }}:
                <strong>{{ (target.source.format || "").toUpperCase() }}</strong> ·
                {{ t("imagePlacement.square.file") }}: <strong>{{ fileSize }}</strong>
              </p>
            </section>
            <p class="ipm__list-title">
              {{ t(`imagePlacement.listTitle.${device}`, { n: places.length }) }}
            </p>
            <PlaceList
              :items="placeItems"
              :current-index="placeIdx"
              :src="shownSrc"
              :focal="focal"
              variant="list"
              @select="pickPlace"
            />
          </nav>

          <section class="ipm__stage" :aria-label="stageTitle">
            <div class="ipm__stage-bar">
              <span>{{ stageTitle }}</span>
              <span class="ipm__stage-scale">{{ stageScale }}</span>
            </div>
            <p v-if="isProduct" class="ipm__summary">{{ summary }}</p>
            <div class="ipm__stage-scroll">
              <div
                :key="`${device}:${currentPlace ? currentPlace.key : ''}`"
                class="ipm__stagewrap"
                :class="device === 'mobile' ? 'ipm__phone' : 'ipm__browser'"
              >
                <div v-if="device === 'desktop'" class="ipm__chrome" aria-hidden="true">
                  <span class="ipm__chrome-dot" /><span class="ipm__chrome-dot" /><span
                    class="ipm__chrome-dot"
                  />
                  <span class="ipm__chrome-url">istoc.com</span>
                </div>
                <div class="ipm__sitebar" aria-hidden="true">
                  <strong>iStoc</strong><span class="ipm__sitebar-search" /><span
                    v-if="device === 'desktop'"
                    class="ipm__sitebar-cta"
                  />
                </div>
                <component
                  :is="currentContext"
                  v-if="currentContext && currentPlace"
                  :src="shownSrc"
                  :focal="focal"
                  :place="currentPlace"
                  :device="device"
                  :scale="scale"
                  :data="contextData"
                />
              </div>
            </div>
          </section>

          <section class="ipm__focal" :aria-labelledby="ids.focal">
            <h3 :id="ids.focal" class="ipm__h3" tabindex="-1">
              {{ t("imagePlacement.focal.title") }}
            </h3>
            <p class="ipm__help">{{ t("imagePlacement.focal.help") }}</p>
            <FocalEditor
              v-if="fp"
              :src="shownSrc"
              :image-ratio="imageRatio"
              :focal="focal"
              :frame="frame"
              :image-alt="t('imagePlacement.focal.imageAlt')"
              :disabled="loading"
              @set="onSet"
              @nudge="onNudge"
              @center="onCenter"
              @suggest="onSuggest"
              @natural="onNatural"
            />
            <p
              role="status"
              aria-live="polite"
              class="ipm__status"
              :class="{ 'ipm__status--error': statusError }"
            >
              {{ statusText }}
            </p>
            <div v-if="fp && fp.conflict.value" class="ipm__alert">
              <span>{{ t("imagePlacement.status.conflict") }}</span>
              <button type="button" class="ipm__btn" @click="reload">
                {{ t("imagePlacement.reload") }}
              </button>
            </div>
            <p v-if="target && !canSave" class="ipm__note">
              {{
                t(
                  gaveUp
                    ? "imagePlacement.status.cannotSaveReopen"
                    : "imagePlacement.status.cannotSave"
                )
              }}
            </p>
            <section v-if="isProduct" class="ipm__why">
              <h4 class="ipm__h4">{{ t("imagePlacement.why.title") }}</h4>
              <p class="ipm__small">{{ t("imagePlacement.why.body") }}</p>
            </section>
            <div class="ipm__foot">
              <label class="ipm__check">
                <input type="checkbox" :checked="autoopen" @change="onAutoOpen" />
                {{ t("imagePlacement.autoOpen") }}
              </label>
              <div class="ipm__actions">
                <button type="button" class="ipm__btn ipm__btn--lg" @click="requestClose">
                  {{ t("imagePlacement.cancel") }}
                </button>
                <button
                  type="button"
                  class="ipm__btn ipm__btn--primary"
                  :disabled="primaryDisabled"
                  @click="onSave"
                >
                  {{ primaryLabel }}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="ipm__mobile">
          <div
            role="tablist"
            :aria-label="t('imagePlacement.tabs.label')"
            class="ipm__tabs"
            @keydown="onTabsKey"
          >
            <button
              :id="ids.tabPreview"
              type="button"
              role="tab"
              class="ipm__tab"
              :aria-selected="mobileTab === 'preview' ? 'true' : 'false'"
              :aria-controls="ids.panelPreview"
              :tabindex="mobileTab === 'preview' ? 0 : -1"
              @click="mobileTab = 'preview'"
            >
              {{ t("imagePlacement.tabs.preview") }}
            </button>
            <button
              :id="ids.tabFocal"
              type="button"
              role="tab"
              class="ipm__tab"
              :aria-selected="mobileTab === 'focal' ? 'true' : 'false'"
              :aria-controls="ids.panelFocal"
              :tabindex="mobileTab === 'focal' ? 0 : -1"
              @click="mobileTab = 'focal'"
            >
              {{ t("imagePlacement.tabs.focal") }}
            </button>
          </div>
          <div class="ipm__mscroll">
            <div
              v-if="mobileTab === 'preview'"
              :id="ids.panelPreview"
              role="tabpanel"
              :aria-labelledby="ids.tabPreview"
              class="ipm__mpanel"
            >
              <div
                v-if="devices.length > 1"
                role="group"
                :aria-label="t('imagePlacement.device.group')"
                class="ipm__seg"
              >
                <button
                  v-for="d in devices"
                  :key="d"
                  type="button"
                  class="ipm__seg-btn"
                  :class="{ 'ipm__seg-btn--on': device === d }"
                  :aria-pressed="device === d ? 'true' : 'false'"
                  @click="pickDevice(d)"
                >
                  {{ t(`imagePlacement.device.${d}`) }}
                </button>
              </div>
              <PlaceList
                :items="placeItems"
                :current-index="placeIdx"
                :src="shownSrc"
                :focal="focal"
                variant="chips"
                @select="pickPlace"
              />
              <p class="ipm__stage-title">{{ stageTitle }}</p>
              <div class="ipm__mstage">
                <component
                  :is="currentContext"
                  v-if="currentContext && currentPlace"
                  :src="shownSrc"
                  :focal="focal"
                  :place="currentPlace"
                  :device="device"
                  :scale="scale"
                  :data="contextData"
                />
              </div>
            </div>
            <div
              v-else
              :id="ids.panelFocal"
              role="tabpanel"
              :aria-labelledby="ids.tabFocal"
              class="ipm__mpanel"
            >
              <p class="ipm__help">{{ t("imagePlacement.focal.helpMobile") }}</p>
              <FocalEditor
                v-if="fp"
                compact
                :src="shownSrc"
                :image-ratio="imageRatio"
                :focal="focal"
                :frame="frame"
                :image-alt="t('imagePlacement.focal.imageAlt')"
                :disabled="loading"
                @set="onSet"
                @nudge="onNudge"
                @center="onCenter"
                @suggest="onSuggest"
                @natural="onNatural"
              />
              <p class="ipm__eyebrow">{{ t("imagePlacement.mobilePreviews") }}</p>
              <figure v-for="it in phoneItems" :key="it.id" class="ipm__fig">
                <span class="ipm__fig-box" :style="{ aspectRatio: String(it.place.ratio) }">
                  <img
                    class="ctx-img"
                    :src="shownSrc"
                    :alt="t('imagePlacement.alt', { place: it.label })"
                    :style="figStyle(it.place)"
                  />
                </span>
                <figcaption class="ipm__figcap">
                  <span>{{ it.label }} · {{ it.place.ratioLabel }}</span>
                  <span
                    v-if="!it.visibility.unknown"
                    class="ipm__figchip"
                    :class="it.visibility.full ? 'ipm__figchip--full' : 'ipm__figchip--cut'"
                    ><bdi>{{ chip(it.visibility) }}</bdi></span
                  >
                </figcaption>
              </figure>
              <label class="ipm__check">
                <input type="checkbox" :checked="autoopen" @change="onAutoOpen" />
                {{ t("imagePlacement.autoOpen") }}
              </label>
            </div>
            <p
              role="status"
              aria-live="polite"
              class="ipm__status"
              :class="{ 'ipm__status--error': statusError }"
            >
              {{ statusText }}
            </p>
            <div v-if="fp && fp.conflict.value" class="ipm__alert">
              <span>{{ t("imagePlacement.status.conflict") }}</span>
              <button type="button" class="ipm__btn" @click="reload">
                {{ t("imagePlacement.reload") }}
              </button>
            </div>
            <p v-if="target && !canSave" class="ipm__note">
              {{
                t(
                  gaveUp
                    ? "imagePlacement.status.cannotSaveReopen"
                    : "imagePlacement.status.cannotSave"
                )
              }}
            </p>
          </div>
          <div class="ipm__bar">
            <button type="button" class="ipm__btn ipm__btn--lg" @click="requestClose">
              {{ t("imagePlacement.cancel") }}
            </button>
            <button
              type="button"
              class="ipm__btn ipm__btn--primary"
              :disabled="primaryDisabled"
              @click="onSave"
            >
              {{ primaryLabel }}
            </button>
          </div>
        </div>

        <div v-if="confirming" class="ipm__confirm-wrap">
          <div
            class="ipm__confirm"
            role="alertdialog"
            aria-modal="true"
            :aria-labelledby="ids.confirmTitle"
            :aria-describedby="ids.confirmBody"
          >
            <h3 :id="ids.confirmTitle" class="ipm__h3">{{ t("imagePlacement.confirm.title") }}</h3>
            <p :id="ids.confirmBody" class="ipm__help">{{ t("imagePlacement.confirm.body") }}</p>
            <div class="ipm__actions">
              <button
                type="button"
                class="ipm__btn ipm__btn--lg"
                data-confirm-discard
                @click="discard"
              >
                {{ t("imagePlacement.confirm.discard") }}
              </button>
              <button
                type="button"
                class="ipm__btn ipm__btn--primary"
                data-confirm-keep
                @click="keepEditing"
              >
                {{ t("imagePlacement.confirm.keep") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .ipm {
    --ipm-ink: #1d1c19;
    --ipm-ink-2: #3a3833;
    --ipm-ink-3: #4e4c45;
    --ipm-line: #e6e3dc;
    --ipm-soft: #faf9f7;
    --ipm-stage: #e9e7e1;
    --ipm-skel: #f4f3f0;
    --ipm-accent: #f5b800;
    --ipm-on-accent: #1a1a1a;
    --ipm-ok: #035c43;
    --ipm-cut: #7c2d12;
    --ipm-cut-bg: #fff7ed;
    position: fixed;
    inset: 0;
    z-index: 10010;
    display: flex;
    padding: 16px;
    color: var(--ipm-ink);
    color-scheme: light;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .ipm--narrow {
    padding: 0;
  }
  .ipm :focus-visible {
    outline: 3px solid #1a1a1a;
    outline-offset: 2px;
  }
  .ipm__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(29, 28, 25, 0.6);
  }
  .ipm__panel {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  }
  .ipm--narrow .ipm__panel {
    border-radius: 0;
  }
  .ipm__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--ipm-line);
  }
  .ipm__titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .ipm__title {
    margin: 0;
    font-size: 22px;
    line-height: 1.3;
    font-weight: 700;
  }
  .ipm__subtitle {
    margin: 0;
    font-size: 15px;
    color: var(--ipm-ink-2);
    overflow-wrap: anywhere;
  }
  .ipm__seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--ipm-skel);
    border-radius: 14px;
  }
  .ipm__seg-btn {
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    background: transparent;
    color: var(--ipm-ink-2);
    cursor: pointer;
  }
  .ipm__seg-btn--on {
    background: #ffffff;
    color: var(--ipm-ink);
    /* I-4: beyaz dolgu #f4f3f0 raya karşı 1,11:1 — 2 px #1a1a1a iç halka seçili/seçisiz farkını ≥ 3:1 yapar (1.4.11). */
    box-shadow:
      inset 0 0 0 2px #1a1a1a,
      0 1px 3px rgba(29, 28, 25, 0.18);
  }
  .ipm__close {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
    border: 1px solid var(--ipm-line);
    background: #ffffff;
    color: var(--ipm-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .ipm__notice {
    margin: 0;
    padding: 10px 20px;
    background: var(--ipm-cut-bg);
    color: var(--ipm-cut);
    font-size: 14px;
    font-weight: 600;
  }
  .ipm__grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 330px;
  }
  .ipm__list {
    border-inline-end: 1px solid var(--ipm-line);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    background: var(--ipm-soft);
  }
  .ipm__list-title {
    margin: 0 8px 4px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--ipm-ink-3);
  }
  .ipm__square,
  .ipm__why {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border: 1px solid var(--ipm-line);
    border-radius: 12px;
    background: #ffffff;
  }
  .ipm__square-dims {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .ipm__h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
  .ipm__h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .ipm__small {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ipm-ink-2);
  }
  .ipm__stage {
    min-width: 0;
    background: var(--ipm-stage);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .ipm__stage-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--ipm-skel);
    border-bottom: 1px solid var(--ipm-line);
    font-size: 15px;
    font-weight: 600;
  }
  .ipm__stage-scale {
    font-size: 14px;
    font-weight: 400;
    color: var(--ipm-ink-2);
  }
  .ipm__summary {
    margin: 0;
    padding: 10px 16px;
    font-size: 15px;
    font-weight: 600;
    background: #ffffff;
    border-bottom: 1px solid var(--ipm-line);
  }
  .ipm__stage-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px;
  }
  .ipm__stagewrap {
    background: #ffffff;
    overflow: hidden;
    animation: ipm-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipm__browser {
    width: 780px;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(29, 28, 25, 0.18);
  }
  .ipm__phone {
    width: 410px;
    box-sizing: border-box;
    min-height: 640px;
    border: 10px solid #1d1c19;
    border-radius: 28px;
    box-shadow: 0 8px 28px rgba(29, 28, 25, 0.25);
  }
  .ipm__chrome {
    height: 30px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    background: var(--ipm-skel);
  }
  .ipm__chrome-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #d3d0c8;
  }
  .ipm__chrome-url {
    margin-inline-start: 12px;
    flex: 1;
    height: 18px;
    border-radius: 6px;
    background: #ffffff;
    font-size: 11px;
    color: var(--ipm-ink-2);
    display: flex;
    align-items: center;
    padding: 0 8px;
  }
  .ipm__sitebar {
    height: 40px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 18px;
    border-bottom: 1px solid #edeae3;
  }
  .ipm__sitebar strong {
    font-size: 18px;
    letter-spacing: -0.02em;
  }
  .ipm__phone .ipm__sitebar {
    height: 44px;
    gap: 10px;
    padding: 0 14px;
  }
  .ipm__phone .ipm__sitebar strong {
    font-size: 17px;
  }
  .ipm__sitebar-search {
    flex: 1;
    height: 22px;
    border-radius: 999px;
    background: var(--ipm-skel);
  }
  .ipm__sitebar-cta {
    width: 60px;
    height: 22px;
    border-radius: 999px;
    background: var(--ipm-accent);
  }
  .ipm__focal {
    border-inline-start: 1px solid var(--ipm-line);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: auto;
  }
  .ipm__help {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--ipm-ink-2);
  }
  .ipm__status {
    margin: 0;
    min-height: 20px;
    font-size: 14px;
    color: var(--ipm-ok);
  }
  .ipm__status--error {
    color: var(--ipm-cut);
  }
  .ipm__alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--ipm-cut);
    border-radius: 10px;
    color: var(--ipm-cut);
    font-size: 14px;
  }
  .ipm__note {
    margin: 0;
    font-size: 14px;
    color: var(--ipm-cut);
  }
  .ipm__foot {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ipm__check {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    font-size: 14px;
    color: var(--ipm-ink-2);
  }
  .ipm__check input {
    width: 24px;
    height: 24px;
    accent-color: #1a1a1a;
  } /* tasarım 22 px; axe target-size (2.5.8) için 24 */
  .ipm__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .ipm__btn {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid var(--ipm-line);
    background: #ffffff;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    color: var(--ipm-ink);
    cursor: pointer;
  }
  .ipm__btn--lg {
    min-height: 48px;
    font-size: 16px;
  }
  .ipm__btn--primary {
    min-height: 48px;
    border: 0;
    background: var(--ipm-accent);
    color: var(--ipm-on-accent);
    font-size: 16px;
    font-weight: 700;
  }
  .ipm__btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .ipm__mobile {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .ipm__tabs {
    display: flex;
    gap: 4px;
    margin: 12px 16px 0;
    padding: 4px;
    background: var(--ipm-skel);
    border-radius: 14px;
  }
  .ipm__tab {
    flex: 1;
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    color: var(--ipm-ink-2);
    cursor: pointer;
  }
  .ipm__tab[aria-selected="true"] {
    background: #ffffff;
    color: var(--ipm-ink);
    /* I-4: beyaz dolgu #f4f3f0 raya karşı 1,11:1 — 2 px #1a1a1a iç halka seçili/seçisiz farkını ≥ 3:1 yapar (1.4.11). */
    box-shadow:
      inset 0 0 0 2px #1a1a1a,
      0 1px 3px rgba(29, 28, 25, 0.18);
  }
  .ipm__mscroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 16px 16px 24px;
    scroll-padding-bottom: 96px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ipm__mpanel {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ipm__mstage {
    overflow: auto;
    border-radius: 10px;
    background: var(--ipm-stage);
  }
  .ipm__stage-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  .ipm__eyebrow {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--ipm-ink-3);
  }
  .ipm__fig {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ipm__fig-box {
    display: block;
    overflow: hidden;
    border-radius: 8px;
    background: var(--ipm-skel);
  }
  .ipm__figcap {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ipm-ink);
  }
  .ipm__figchip {
    padding: 4px 8px;
    border-radius: 999px;
    font-weight: 600;
    unicode-bidi: isolate;
  }
  .ipm__figchip--full {
    background: #e7f6ef;
    color: var(--ipm-ok);
  }
  .ipm__figchip--cut {
    background: var(--ipm-cut-bg);
    color: var(--ipm-cut);
  }
  /* Pano 4 (telefon): başlık 20 px, yardım ve sekme metni 16 px. */
  .ipm--narrow .ipm__title {
    font-size: 20px;
  }
  .ipm--narrow .ipm__help,
  .ipm--narrow .ipm__tab {
    font-size: 16px;
  }
  .ipm--narrow .ipm__head {
    padding: 10px 16px 12px;
  }
  .ipm__bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: #ffffff;
    border-top: 1px solid var(--ipm-line);
  }
  .ipm__confirm-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(29, 28, 25, 0.4);
  }
  .ipm__confirm {
    width: min(420px, calc(100% - 32px));
    padding: 20px;
    border-radius: 16px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
  }

  .ipm-enter-active {
    transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipm-enter-active .ipm__panel {
    transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipm-leave-active {
    transition: opacity 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipm-leave-active .ipm__panel {
    transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipm-enter-from,
  .ipm-leave-to {
    opacity: 0;
  }
  .ipm-enter-from .ipm__panel,
  .ipm-leave-to .ipm__panel {
    transform: scale(0.985);
  }
  @keyframes ipm-in {
    from {
      opacity: 0;
      transform: scale(0.985);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ipm-enter-active,
    .ipm-leave-active,
    .ipm-enter-active .ipm__panel,
    .ipm-leave-active .ipm__panel {
      transition: none;
    }
    .ipm__stagewrap {
      animation: none;
    }
  }
</style>

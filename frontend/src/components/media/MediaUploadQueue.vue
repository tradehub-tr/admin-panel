<script setup>
  // C · Yüzen tepsi — onaylı tasarım (YuzenTepsi / CTablet / C390 / C320 /
  // Animasyonlar artboard'ları). Masaüstü ve tablette modal OLMAYAN bir bölge
  // (odak tuzağı yok); telefonda küçük çubuk + açılınca modal alt sayfa.
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import MediaPhaseThumb from "./MediaPhaseThumb.vue";
  import { useMediaStatus } from "@/composables/useMediaStatus.js";
  import { useScrollLock } from "@/composables/useScrollLock.js";
  import { restoreFocus, trapTabKey } from "@/components/common/focusTrap";
  import { byteReduction, uploadPhase, uploadedKey } from "@/lib/media/status.js";
  import {
    CLEARABLE_PHASES,
    hasShimmer,
    overallPercent,
    pageTrays,
    readCollapsed,
    rowTone,
    trayCounts,
    writeCollapsed,
  } from "@/lib/media/uploadTray.js";
  import { formatBytes } from "@/utils/mediaFormat";

  const props = defineProps({
    uploads: { type: Array, required: true },
    facts: { type: Object, default: null },
    unavailable: { type: Boolean, default: false },
    floating: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false },
    // Kabuğa (AppLayout) bağlı genel tepsi: sayfanın kendi tepsisi açıkken çekilir.
    ambient: { type: Boolean, default: false },
    // "Önizle" yalnız dinleyen varsa çizilir — prop olarak bildirilmesinin sebebi bu.
    onPlacement: { type: Function, default: null },
  });
  const emit = defineEmits(["retry", "cancel", "clear"]);
  const { t, te } = useI18n();
  const uid = useId();
  const panelId = `utray-panel-${uid}`;
  const titleId = `utray-title-${uid}`;

  // Yalnız henüz sonuçlanmamış dosyalar 3 sn'de bir sorulur; sonuçlanan
  // (hazır / engellendi / başarısız) künye `settled` içinde saklanır ve bir daha
  // sorgulanmaz. Eskiden 10 sn'lik döngü hazır dosyaları da sonsuza dek soruyordu.
  const SETTLED = ["ready", "blocked", "scanFailed", "processingFailed"];
  const settled = ref({});
  const { facts: polledFacts, unavailable: pollUnavailable } = useMediaStatus(
    () =>
      props.facts === null
        ? props.uploads
            .filter((u) => u.status === "done")
            .map(uploadedKey)
            .filter((k) => k && !settled.value[k])
        : [],
    { interval: 3000 }
  );
  watch(polledFacts, (next) => {
    const done = {};
    for (const u of props.uploads) {
      const k = uploadedKey(u);
      if (next[k] && SETTLED.includes(uploadPhase(u, next[k]))) done[k] = next[k];
    }
    if (Object.keys(done).length) settled.value = { ...settled.value, ...done };
  });
  const facts = computed(() => props.facts ?? { ...polledFacts.value, ...settled.value });
  const unavailable = computed(() => props.unavailable || pollUnavailable.value);

  // ── Ekran sınıfı ──────────────────────────────────────────────
  // <768 px telefon (MobileTabBar sınırı). SSR/testte `window` yok: masaüstü varsayılır.
  const PHONE_QUERY = "(max-width: 767px)";
  const isPhone = ref(
    typeof window !== "undefined" && Boolean(window.matchMedia?.(PHONE_QUERY).matches)
  );
  const sheet = computed(() => props.floating && isPhone.value);
  let phoneQuery = null;
  function onPhoneChange(e) {
    isPhone.value = e.matches;
    if (e.matches) collapsed.value = true;
  }

  // ── Küçültme durumu ───────────────────────────────────────────
  const stored = readCollapsed();
  // Telefonda kapalı başlar (modal sayfa kendiliğinden açılmaz).
  const collapsed = ref(isPhone.value || stored === true);
  const pill = ref(null);
  const closeBtn = ref(null);
  const panel = ref(null);

  function setCollapsed(value, { byUser = false } = {}) {
    collapsed.value = value;
    if (byUser && !isPhone.value) writeCollapsed(value);
    nextTick(() => (value ? pill.value : closeBtn.value)?.focus());
  }
  // Telefonda alt sayfa açıkken arka plan kaymasın.
  useScrollLock(() => sheet.value && !collapsed.value);

  function onKeydown(e) {
    if (!sheet.value || collapsed.value) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setCollapsed(true);
    } else if (e.key === "Tab") trapTabKey(e, panel.value);
  }

  // İlk eklemede masaüstü/tablette açılır — kullanıcı bu oturumda küçültmediyse.
  watch(
    () => props.uploads.map((u) => u.id),
    (ids, prev = []) => {
      const added = ids.some((id) => !prev.includes(id));
      if (!added) return;
      if (isPhone.value) collapsed.value = prev.length ? collapsed.value : true;
      else if (readCollapsed() !== true) collapsed.value = false;
    }
  );

  // ── Görünürlük ────────────────────────────────────────────────
  const registered = ref(false);
  watch(
    () => props.floating && !props.ambient && props.uploads.length > 0,
    (on) => {
      if (on === registered.value || typeof window === "undefined") return;
      registered.value = on;
      pageTrays.value += on ? 1 : -1;
    }
  );
  const hidden = computed(() => props.suspended || (props.ambient && pageTrays.value > 0));

  // ── Zamanlayıcı (yeniden deneme geri sayımı) ─────────────────
  const tick = ref(Date.now());
  let timer = null;
  onMounted(() => {
    timer = setInterval(() => (tick.value = Date.now()), 1000);
    if (typeof window !== "undefined" && window.matchMedia) {
      phoneQuery = window.matchMedia(PHONE_QUERY);
      phoneQuery.addEventListener?.("change", onPhoneChange);
    }
    if (props.floating && !props.ambient && props.uploads.length) {
      registered.value = true;
      pageTrays.value += 1;
    }
  });
  onBeforeUnmount(() => {
    clearInterval(timer);
    phoneQuery?.removeEventListener?.("change", onPhoneChange);
    if (registered.value) pageTrays.value -= 1;
  });

  // ── Satırlar ve özet ──────────────────────────────────────────
  const rows = computed(() =>
    props.uploads.map((up) => {
      const key = uploadedKey(up);
      // Uyarlanmış satır (yükleyici kuyruğu, uploadTray.js) fazını kendisi verebilir:
      // `blocked` / `review` store satırında yok.
      const phase = up.phase || uploadPhase(up, facts.value[key]);
      const progress =
        up.progressKnown === false
          ? null
          : Math.max(0, Math.min(100, Math.round(Number(up.progress) || 0)));
      return { up, key, phase, progress, fact: facts.value[key] || null };
    })
  );
  const counts = computed(() => trayCounts(rows.value.map((r) => r.phase)));
  const percent = computed(() => overallPercent(rows.value));
  const canClear = computed(() => rows.value.some((r) => CLEARABLE_PHASES.includes(r.phase)));

  const title = computed(() =>
    counts.value.active
      ? t("mediaFlow.tray.titleActive", { n: counts.value.active })
      : t("mediaFlow.title")
  );
  const percentText = computed(() => t("mediaFlow.tray.percent", { percent: percent.value }));
  const subtitle = computed(() => {
    const base = t("mediaFlow.tray.sub", {
      ready: counts.value.ready,
      issues: counts.value.issues,
    });
    return counts.value.active ? `${base} · ${percentText.value}` : base;
  });
  // Ekran okuyucu özeti yüzdesiz: her ilerleme adımında konuşmasın.
  const summary = computed(() =>
    t("mediaFlow.summary", {
      total: counts.value.total,
      ready: counts.value.ready,
      issues: counts.value.issues,
    })
  );
  const pillParams = computed(() => ({
    n: counts.value.active,
    total: counts.value.total,
    ready: counts.value.ready,
    percent: percent.value,
  }));
  const pillText = computed(() =>
    t(counts.value.active ? "mediaFlow.tray.pill" : "mediaFlow.tray.pillDone", pillParams.value)
  );
  const pillShort = computed(() =>
    t(
      counts.value.active ? "mediaFlow.tray.pillShort" : "mediaFlow.tray.pillDoneShort",
      pillParams.value
    )
  );
  const pillLabel = computed(() =>
    t("mediaFlow.tray.barLabel", {
      n: counts.value.active,
      ready: counts.value.ready,
      issues: counts.value.issues,
      percent: percent.value,
    })
  );

  // ── Satır metinleri ───────────────────────────────────────────
  const open = ref({});
  function toggleRow(id) {
    open.value = { ...open.value, [id]: !open.value[id] };
  }
  function errorText(up) {
    if (!up.errorCode) return up.error || t("media.upload.errorGeneric");
    for (const key of [
      `media.upload.err.${up.errorCode}`,
      `media.preflight.reason.${up.errorCode}`,
    ])
      if (te(key)) return t(key, up.errorParams || {});
    return up.error || t("media.upload.errorGeneric");
  }
  function retryText(up) {
    return t("media.upload.retrying", {
      n: up.attempt,
      sec: Math.max(0, Math.ceil(((up.retryAt || 0) - tick.value) / 1000)),
    });
  }
  const CRITICAL = ["blocked", "scanFailed", "processingFailed", "review"];
  /** Kısa satırın "etiket · bilgi" bilgisi; tam metin ayrıntıda da durur. */
  function reasonOf(row) {
    if (row.up.hintKey) return t(row.up.hintKey);
    if (row.up.status === "error") return errorText(row.up);
    if (CRITICAL.includes(row.phase)) return t(`mediaFlow.hint.${row.phase}`);
    return "";
  }
  function sizeText(row) {
    const sent = row.fact?.bytes || row.up.result?.bytes || row.up.bytes;
    const reduction = byteReduction(row.up.bytes, sent);
    if (reduction !== null && row.up.kind !== "document")
      return `${formatBytes(row.up.bytes)} → ${formatBytes(sent)} · ${t("mediaFlow.saved", { percent: reduction })}`;
    return sent > 0 ? formatBytes(sent) : "";
  }
  function metaText(row) {
    return reasonOf(row) || sizeText(row);
  }
  function securityText(row) {
    const s = row.fact?.scan_status;
    return s ? t(`media.scanStatus.${s}`) : t("mediaFlow.unknown");
  }
  function preparationText(phase) {
    if (phase === "ready") return t("mediaFlow.phase.ready");
    if (["processing", "preparing"].includes(phase)) return t("mediaFlow.phase.processing");
    if (phase === "processingFailed") return t("mediaFlow.phase.processingFailed");
    return t("mediaFlow.unknown");
  }
  const canPlace = (row) => !!props.onPlacement && row.up.kind === "image" && row.phase === "ready";
  const canRetry = (row) => row.up.status === "error" && row.up.retryable !== false;
  const canCancel = (row) =>
    row.up.cancellable === true || ["uploading", "retrying", "preparing"].includes(row.up.status);

  // Temizleyince satır (ve belki tepsi) kalkar: odak boşluğa düşmesin.
  function clearFinished() {
    emit("clear");
    nextTick(() => {
      if (!props.uploads.length) restoreFocus(null);
      else if (!document.activeElement?.isConnected) (closeBtn.value || pill.value)?.focus();
    });
  }

  // Halka: r=15.9 → çevre ≈ 100 (pathLength ile birebir yüzde).
  const ringOffset = (p) => 100 - (p ?? 0);
</script>
<template>
  <Teleport to="body" :disabled="!floating">
    <div
      v-if="uploads.length"
      v-show="!hidden"
      class="utray"
      :class="{
        'utray--floating': floating,
        'utray--sheet': sheet,
        'utray--open': !collapsed,
      }"
      :data-state="collapsed ? 'collapsed' : 'expanded'"
    >
      <!-- Küçük hal: masaüstünde koyu hap, telefonda tam genişlik çubuk.
           Telefonda alt sayfa açıkken de DOM'da kalır: Esc/kapanışta odak buraya döner. -->
      <Transition name="utray-pop">
        <button
          v-show="collapsed || sheet"
          ref="pill"
          type="button"
          class="utray__pill"
          :aria-expanded="!collapsed"
          :aria-controls="panelId"
          :aria-label="pillLabel"
          :inert="sheet && !collapsed ? true : undefined"
          @click="setCollapsed(false, { byUser: true })"
        >
          <span class="utray__ring" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" focusable="false">
              <circle class="utray__ring-track" cx="18" cy="18" r="15.9" />
              <circle
                class="utray__ring-fill"
                cx="18"
                cy="18"
                r="15.9"
                pathLength="100"
                stroke-dasharray="100"
                :stroke-dashoffset="ringOffset(percent)"
                transform="rotate(-90 18 18)"
              />
            </svg>
          </span>
          <span class="utray__pill-text utray__pill-text--long" aria-hidden="true">{{
            pillText
          }}</span>
          <span class="utray__pill-text utray__pill-text--short" aria-hidden="true">{{
            pillShort
          }}</span>
          <span v-if="counts.issues" class="utray__badge" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" focusable="false">
              <path d="M12 3 2 20h20L12 3z" />
              <path d="M12 10v4M12 17h.01" />
            </svg>
            {{ counts.issues }}
          </span>
          <span class="utray__chev" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" focusable="false">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </span>
        </button>
      </Transition>

      <Transition name="utray-fade">
        <div
          v-if="sheet"
          v-show="!collapsed"
          class="utray__scrim"
          aria-hidden="true"
          @click="setCollapsed(true)"
        />
      </Transition>

      <Transition :name="sheet ? 'utray-sheet' : 'utray-pop'">
        <section
          v-show="!collapsed"
          :id="panelId"
          ref="panel"
          class="utray__panel"
          :role="sheet ? 'dialog' : 'region'"
          :aria-modal="sheet ? 'true' : undefined"
          :aria-labelledby="titleId"
          @keydown="onKeydown"
        >
          <span v-if="sheet" class="utray__grab" aria-hidden="true" />
          <header class="utray__head">
            <span v-if="counts.active" class="utray__spin" aria-hidden="true" />
            <span v-else class="utray__done" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <div class="utray__titles">
              <h2 :id="titleId" class="utray__title">{{ title }}</h2>
              <p class="utray__sub">{{ subtitle }}</p>
            </div>
            <button
              ref="closeBtn"
              type="button"
              class="utray__toggle"
              :aria-expanded="!collapsed"
              :aria-controls="panelId"
              :aria-label="t('mediaFlow.collapse')"
              :title="t('mediaFlow.collapse')"
              @click="setCollapsed(true, { byUser: true })"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </header>
          <span class="utray__overall" aria-hidden="true"
            ><span :style="{ transform: `scaleX(${percent / 100})` }"
          /></span>
          <span class="utray__sr" role="status" aria-live="polite">{{ summary }}</span>
          <p v-if="unavailable" class="utray__notice" role="status">
            {{ t("mediaFlow.unavailable") }}
          </p>

          <TransitionGroup tag="ul" name="utray-row" class="utray__list" aria-live="polite">
            <li
              v-for="row in rows"
              :key="row.up.id"
              class="utray-row"
              :data-phase="row.phase"
              :data-tone="rowTone(row.phase)"
            >
              <MediaPhaseThumb
                :phase="row.phase"
                :progress="row.progress"
                :kind="row.up.kind"
                :preview-url="row.up.previewUrl || ''"
              />

              <div class="utray-row__body">
                <button
                  type="button"
                  class="utray-row__info"
                  :aria-expanded="!!open[row.up.id]"
                  :aria-controls="`${panelId}-${row.up.id}`"
                  :title="row.up.name"
                  @click="toggleRow(row.up.id)"
                >
                  <span :id="`${panelId}-${row.up.id}-name`" class="utray-row__name">{{
                    row.up.name
                  }}</span>
                  <span class="utray-row__meta"
                    ><strong class="utray-row__label">{{
                      t(`mediaFlow.phase.${row.phase}`)
                    }}</strong
                    ><template v-if="row.up.status === 'retrying'"
                      ><span aria-hidden="true"> · {{ retryText(row.up) }}</span></template
                    ><template v-else-if="metaText(row)"> · {{ metaText(row) }}</template
                    ><span
                      v-if="row.phase === 'uploading' && row.progress !== null"
                      aria-hidden="true"
                    >
                      · {{ t("mediaFlow.tray.percent", { percent: row.progress }) }}</span
                    ></span
                  >
                </button>
                <div
                  v-if="row.phase === 'uploading'"
                  class="utray-row__bar"
                  :class="{ 'utray-row__bar--indeterminate': row.progress === null }"
                  role="progressbar"
                  :aria-labelledby="`${panelId}-${row.up.id}-name`"
                  :aria-valuenow="row.progress ?? undefined"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <span
                    :style="
                      row.progress === null
                        ? undefined
                        : { transform: `scaleX(${row.progress / 100})` }
                    "
                  />
                </div>
                <span
                  v-else-if="hasShimmer(row.phase, row.progress)"
                  class="utray-row__bar utray-row__bar--indeterminate"
                  aria-hidden="true"
                  ><span
                /></span>
                <div
                  v-show="open[row.up.id]"
                  :id="`${panelId}-${row.up.id}`"
                  class="utray-row__details"
                >
                  <p v-if="reasonOf(row)" class="utray-row__reason">{{ reasonOf(row) }}</p>
                  <p v-if="row.up.status === 'retrying'">{{ retryText(row.up) }}</p>
                  <p v-if="['uploaded', 'unverified'].includes(row.phase)">
                    {{ t(`mediaFlow.hint.${row.phase}`) }}
                  </p>
                  <dl class="utray-row__facts">
                    <template v-if="sizeText(row)">
                      <dt>{{ t("mediaFlow.bytes") }}</dt>
                      <dd>{{ sizeText(row) }}</dd>
                    </template>
                    <template v-if="row.fact">
                      <dt>{{ t("mediaFlow.security") }}</dt>
                      <dd>{{ securityText(row) }}</dd>
                      <template v-if="row.up.kind === 'image' || row.up.kind === 'video'">
                        <dt>{{ t("mediaFlow.preparation") }}</dt>
                        <dd>{{ preparationText(row.phase) }}</dd>
                      </template>
                    </template>
                  </dl>
                </div>
              </div>

              <div class="utray-row__actions">
                <button
                  v-if="canPlace(row)"
                  type="button"
                  class="utray-act"
                  :aria-label="t('mediaFlow.tray.previewLabel', { name: row.up.name })"
                  @click="onPlacement(row.up)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    focusable="false"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span class="utray-act__text">{{ t("mediaFlow.tray.preview") }}</span>
                </button>
                <button
                  v-if="canRetry(row)"
                  type="button"
                  class="utray-act utray-act--primary"
                  :aria-label="t('mediaFlow.tray.retryLabel', { name: row.up.name })"
                  @click="emit('retry', row.up.id)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    focusable="false"
                    aria-hidden="true"
                  >
                    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                    <path d="M20 5v6h-6" />
                  </svg>
                  <span class="utray-act__text">{{ t("mediaFlow.tray.retry") }}</span>
                </button>
                <button
                  v-if="canCancel(row)"
                  type="button"
                  class="utray-act utray-act--icon"
                  :aria-label="t('mediaFlow.tray.cancelLabel', { name: row.up.name })"
                  @click="emit('cancel', row.up.id)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    focusable="false"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </li>
          </TransitionGroup>

          <footer v-if="canClear" class="utray__foot">
            <button type="button" class="utray__clear" @click="clearFinished">
              {{ t("media.upload.clearFinished") }}
            </button>
          </footer>
        </section>
      </Transition>
    </div>
  </Teleport>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  // Satır, eylem düğmesi, 3 px odak halkası ve AAA tonları MediaTransferRow ile ortak.
  @use "@/assets/scss/upload-row" as row;

  $-ink: $l-text-900; // koyu yüzey (başlık, hap)
  $-err: row.$err;
  $-on-ink-muted: #d4d4d8; // koyu yüzeyde 12:1
  // Mağaza düğmesi (AppLayout `.th-goto-storefront-btn`): bottom 88 + ~32 yükseklik.
  // Tepsi onun ÜSTÜNDE durur; ≥768 px'te düğme hep orada.
  $-above-store: 132px;
  // Telefonda alt şerit: tab bar + FAB/kaydet çubuğu (64) şeridinin üstü.
  $-phone-bottom: calc(#{media.$m-float-bottom} + 64px);

  .utray {
    font-family: inherit;
    color: $l-text-900;
    @include dark {
      color: $d-text;
    }
  }

  // ── Hap / telefon çubuğu ─────────────────────────────────────
  .utray__pill {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 20px 0 10px;
    border: 0;
    border-radius: 999px;
    background: $-ink;
    color: #fff;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 18px 40px rgb(24 24 27 / 25%);
    transform-origin: bottom right;
    @include row.ring3($l-text-900);
    @include dark {
      background: $d-bg-elevated;
      border: 1px solid $d-border;
      @include row.ring3($d-text-max);
    }
  }
  .utray:not(.utray--floating) .utray__pill {
    margin-bottom: 12px;
  }
  .utray__ring {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    circle {
      fill: none;
      stroke-width: 3.5;
    }
  }
  .utray__ring-track {
    stroke: rgb(255 255 255 / 25%);
  }
  .utray__ring-fill {
    stroke: $brand;
    stroke-linecap: round;
  }
  .utray__pill-text {
    flex: 1;
    min-width: 0;
    text-align: start;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .utray__pill-text--short {
    display: none;
  }
  .utray__badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding: 0 8px;
    border-radius: 999px;
    background: $-err;
    font-size: 13px;
    font-weight: 700;
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  .utray__chev {
    display: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgb(255 255 255 / 12%);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  // ── Panel ────────────────────────────────────────────────────
  .utray__panel {
    display: flex;
    flex-direction: column;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 20px;
    overflow: hidden;
    box-shadow:
      0 2px 6px rgb(24 24 27 / 6%),
      0 24px 48px rgb(24 24 27 / 18%);
    transform-origin: bottom center;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      box-shadow: 0 24px 48px rgb(0 0 0 / 55%);
    }
  }
  .utray:not(.utray--floating) .utray__panel {
    margin-bottom: 16px;
    box-shadow: none;
  }
  .utray__head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: $-ink;
    color: #fff;
    @include dark {
      background: $d-rail-bg;
      border-bottom: 1px solid $d-border;
    }
  }
  .utray__spin {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2.5px solid rgb(255 255 255 / 30%);
    border-top-color: $brand;
    animation: utray-spin 1.1s linear infinite;
  }
  .utray__done {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: $brand;
    color: $brand-ink;
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  .utray__titles {
    flex: 1;
    min-width: 0;
  }
  .utray__title {
    margin: 0;
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
  }
  .utray__sub {
    margin: 0;
    font-size: 13px;
    line-height: 18px;
    color: $-on-ink-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }
  .utray__toggle {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    background: rgb(255 255 255 / 12%);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    @include row.ring3(#fff);
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    &:hover {
      background: rgb(255 255 255 / 20%);
    }
  }
  .utray__overall {
    display: block;
    height: 3px;
    background: $l-text-700;
    overflow: hidden;
    span {
      display: block;
      height: 100%;
      background: $brand;
      transform-origin: left center;
      transition: transform 220ms $ease-out;
    }
  }
  [dir="rtl"] .utray__overall span {
    transform-origin: right center;
  }
  .utray__sr {
    @include media.sr-only;
  }
  .utray__notice {
    margin: 0;
    padding: 10px 16px 0;
    font-size: 13px;
    line-height: 18px;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .utray__list {
    position: relative;
    margin: 0;
    padding: 6px 0;
    list-style: none;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .utray__foot {
    display: flex;
    justify-content: flex-end;
    padding: 6px 12px 10px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .utray__clear {
    height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: $l-text-900;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    @include row.ring3;
    @include dark {
      color: $d-text-max;
      @include row.ring3($d-text-max);
    }
  }

  // ── Satır + eylem düğmeleri (ortak; küçük resim katmanı MediaPhaseThumb'da) ──
  @include row.row;
  @include row.acts;

  // ── Yerleşim: yüzen tepsi ────────────────────────────────────
  .utray--floating {
    .utray__pill,
    .utray__panel {
      position: fixed;
      z-index: 54; // FAB (40) ve tab bar (50) üstü, geri alma şeridi (55) ve modallar (60+) altı
      inset-inline-end: 32px;
      bottom: $-above-store;
    }
    .utray__panel {
      width: min(420px, calc(100vw - 64px));
    }
    .utray__list {
      max-height: min(380px, max(132px, calc(100dvh - #{$-above-store} - 220px)));
    }
  }
  // Tablet (768–1023): 380 px panel, 24 px kenar boşluğu, 44 px küçük resim.
  @media (max-width: 1023px) {
    .utray--floating {
      .utray__pill,
      .utray__panel {
        inset-inline-end: 24px;
        // Kütüphanenin "Medya Yükle" FAB'ı bu aralıkta Mağaza düğmesinin üstünde
        // (bottom 136 + 44 yükseklik); tepsi ikisinin de üstünde durur.
        bottom: calc(196px + env(safe-area-inset-bottom));
      }
      .utray__panel {
        width: min(380px, calc(100vw - 48px));
      }
      .utray__head {
        padding: 12px 14px;
      }
    }
    .utray-row {
      --utray-thumb: 44px;
    }
    .utray-row__name {
      font-size: 15px;
    }
  }

  // ── Telefon: tam genişlik çubuk + modal alt sayfa ────────────
  // Alt sayfa açıkken çubuk DOM'da kalır (inert; kapanınca odak ona döner) ama
  // karartmanın arkasından sayfanın üstünde görünmesin.
  .utray--sheet.utray--open .utray__pill {
    opacity: 0;
    pointer-events: none;
  }
  .utray--sheet {
    .utray__pill {
      inset-inline: 12px;
      bottom: $-phone-bottom;
      height: 56px;
      padding: 0 8px 0 10px;
      gap: 10px;
      border-radius: 18px;
      box-shadow: 0 14px 32px rgb(24 24 27 / 28%);
    }
    .utray__chev {
      display: inline-flex;
    }
    .utray__scrim {
      position: fixed;
      inset: 0;
      z-index: 84;
      background: rgb(24 24 27 / 45%);
      @include dark {
        background: rgb(0 0 0 / 70%);
      }
    }
    .utray__panel {
      z-index: 85; // tab bar (50) ve sayfa sheet'lerinin (80) üstü
      inset-inline: 0;
      bottom: 0;
      width: auto;
      max-height: 82vh;
      max-height: 82dvh;
      border: 0;
      border-radius: 22px 22px 0 0;
      box-shadow: 0 -12px 32px rgb(24 24 27 / 18%);
      transform-origin: bottom center;
    }
    .utray__grab {
      display: block;
      width: 40px;
      height: 5px;
      margin: 8px auto 0;
      border-radius: 999px;
      background: $l-text-400;
      flex-shrink: 0;
    }
    // Alt sayfa açık zeminde: başlık koyu değil (C390/C320 Açık).
    .utray__head {
      background: transparent;
      color: inherit;
      padding: 8px 16px 10px;
      border: 0;
    }
    .utray__spin {
      border-color: $l-border;
      border-top-color: $l-text-900;
      @include dark {
        border-color: $d-border;
        border-top-color: $d-text-max;
      }
    }
    .utray__title {
      font-size: 17px;
    }
    .utray__sub {
      color: $l-text-700;
      @include dark {
        color: $d-text;
      }
    }
    .utray__toggle {
      border: 1px solid $l-text-300;
      background: $l-bg;
      color: $l-text-900;
      @include row.ring3;
      &:hover {
        background: $l-bg-muted;
      }
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text-max;
        @include row.ring3($d-text-max);
      }
    }
    .utray__overall {
      margin: 0 16px;
      border-radius: 3px;
      background: $l-border;
      span {
        background: $l-text-900;
        border-radius: 3px;
      }
      @include dark {
        background: $d-border;
        span {
          background: $d-text-max;
        }
      }
    }
    .utray__list {
      flex: 1;
      max-height: none;
    }
    .utray__foot {
      justify-content: center;
      padding: 4px 12px calc(12px + env(safe-area-inset-bottom));
    }
  }

  // ≤360 px: kısa hap metni, yalnız ikonlu satır düğmeleri, 36 px küçük resim.
  @media (max-width: 360px) {
    .utray__pill-text--long {
      display: none;
    }
    .utray__pill-text--short {
      display: block;
    }
    .utray-row {
      --utray-thumb: 36px;
      gap: 10px;
      padding: 10px 12px;
    }
    .utray-row__name {
      font-size: 14px;
    }
    .utray-act {
      width: 44px;
      padding: 0;
    }
    .utray-act__text {
      display: none;
    }
    .utray--sheet .utray__head {
      padding: 8px 12px 10px;
    }
    .utray--sheet .utray__overall {
      margin: 0 12px;
    }
  }

  // ── Hareket: yalnız transform + opacity ──────────────────────
  .utray-pop-enter-active {
    transition:
      transform 220ms $ease-out,
      opacity 220ms $ease-out;
  }
  .utray-pop-leave-active {
    transition:
      transform 160ms $ease-out,
      opacity 160ms $ease-out;
  }
  .utray-pop-enter-from,
  .utray-pop-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  .utray-sheet-enter-active {
    transition: transform 280ms $ease-drawer;
  }
  .utray-sheet-leave-active {
    transition: transform 220ms $ease-drawer;
  }
  .utray-sheet-enter-from,
  .utray-sheet-leave-to {
    transform: translateY(105%);
  }
  .utray-fade-enter-active,
  .utray-fade-leave-active {
    transition: opacity 280ms $ease-out;
  }
  .utray-fade-enter-from,
  .utray-fade-leave-to {
    opacity: 0;
  }
  .utray-row-enter-active {
    transition:
      transform 200ms $ease-out,
      opacity 200ms $ease-out;
  }
  .utray-row-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }

  @keyframes utray-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // Azaltılmış hareket: yer değiştirme yok, yalnız opaklık; döngüler durur.
  // (base.scss'teki genel kural süreleri zaten sıfırlıyor; bu blok sonsuz
  // döngülerin ilk karede donmasını ve kaymanın hiç başlamamasını garanti eder.)
  @media (prefers-reduced-motion: reduce) {
    .utray-pop-enter-from,
    .utray-pop-leave-to,
    .utray-sheet-enter-from,
    .utray-sheet-leave-to,
    .utray-row-enter-from {
      transform: none;
    }
    .utray-sheet-enter-from,
    .utray-sheet-leave-to {
      opacity: 0;
    }
    .utray-sheet-enter-active,
    .utray-sheet-leave-active {
      transition: opacity 120ms linear;
    }
    .utray__spin {
      animation: none;
    }
    .utray__overall span {
      transition: none;
    }
  }
</style>

<script setup>
  /**
   * Ürün görsellerini tek düğmeyle optimize et (2026-09-30).
   *
   * Prova → özet tablo (adım · değişecek · zaten uygun · atlanan · hata) →
   * Başlat (onay) → canlı ilerleme → Durdur / Geri al. Adımların mantığı
   * backend'de mevcut fonksiyonlarda (`media/urun_gorseli_optimize.py`);
   * bu kart yalnız özetler. Eski AVIF temizliği Başlat'a DAHİL DEĞİL: en altta
   * ayrı bölüm olarak mevcut "Eski AVIF Dosyaları" ekranına bağlanır.
   */
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useProductImageOptimize } from "@/composables/useProductImageOptimize";
  import { formatSize } from "@/utils/mediaFormat";

  const { t, te } = useI18n();
  const o = useProductImageOptimize();

  const confirmOpen = ref(false);
  const rollbackOpen = ref(false);

  // ── Katlama (MediaSquareCard deseni). Başlık + Prova/Başlat hep görünür;
  // gövde (ipuçları, koşu tablosu, hatalar) katlanır. Elle seçilen durum
  // localStorage'da hatırlanır; ilgi isteyen bir şey (çalışan koşu, bu
  // oturumda biten prova/koşu, hata) varsa varsayılan açık, yoksa kapalı.
  const OPEN_KEY = "istoc.media.optimizeAll.open";
  function readOpen() {
    try {
      const v = localStorage.getItem(OPEN_KEY);
      return v === "1" ? true : v === "0" ? false : null;
    } catch {
      return null;
    }
  }
  function writeOpen(v) {
    try {
      localStorage.setItem(OPEN_KEY, v ? "1" : "0");
    } catch {
      // Depolama kapalı (gizli sekme vb.) — katlama yalnız bu oturumda geçerli.
    }
  }
  const storedOpen = readOpen();
  const manualExpanded = ref(null);
  // Bu bileşen ömründe bir koşu başlatıldı/izlendi mi ("az önce bitti" sinyali).
  const sessionRun = ref(false);
  const attention = computed(
    () =>
      o.running.value ||
      o.provaDone.value ||
      sessionRun.value ||
      !!o.lastError.value ||
      !!o.pollError.value
  );
  const expanded = computed(() => manualExpanded.value ?? (attention.value || storedOpen === true));
  function toggleExpanded() {
    manualExpanded.value = !expanded.value;
    writeOpen(manualExpanded.value);
  }
  // Yeni bir eylem elle kapatmayı geçersiz kılar: sonucu görünsün.
  function openForAction() {
    sessionRun.value = true;
    manualExpanded.value = null;
  }
  watch(
    () => o.running.value,
    (now) => {
      if (now) sessionRun.value = true;
    }
  );

  onMounted(() => {
    o.load();
    o.loadAvif();
  });

  const run = computed(() => o.run.value);
  const steps = computed(() => run.value?.steps || []);

  function liveFor(step) {
    // Kare/mağaza adımı ve geri alması ilerlemeyi Redis'e yazar; backend `live` ile taşır.
    if (step.state !== "running" || !o.live.value) return null;
    if (step.key !== "kare" && step.key !== "magaza") return null;
    return o.live.value;
  }

  function cell(step, field) {
    const l = liveFor(step);
    if (l && field === "changed") return l.renamed ?? 0;
    if (l && field === "ok")
      return l.skip_reasons?.[step.key === "magaza" ? "already_webp" : "already_square"] ?? 0;
    if (l && field === "failed") return l.errors ?? 0;
    if (step.state === "pending" || step.state === "skipped") return "–";
    return step[field] ?? 0;
  }

  function progressText(step) {
    const l = liveFor(step);
    if (l) return t("media.optimizeAll.live", { processed: l.processed || 0, total: l.total || 0 });
    if (
      (step.key === "turev" || step.key === "magaza_turev") &&
      step.state === "running" &&
      step.queued
    ) {
      return t("media.optimizeAll.turevLive", {
        processed: step.processed || 0,
        queued: step.queued,
      });
    }
    return "";
  }

  function stepLabel(key) {
    return te(`media.optimizeAll.step.${key}`) ? t(`media.optimizeAll.step.${key}`) : key;
  }

  function stateLabel(state) {
    return te(`media.optimizeAll.state.${state}`) ? t(`media.optimizeAll.state.${state}`) : state;
  }

  // Bilinmeyen gerekçe kodu ham basılmaz: önce bu kartın, sonra kare kartının
  // sözlüğüne bakılır, ikisinde de yoksa genel etiket.
  function reasonLabel(code) {
    if (te(`media.optimizeAll.reason.${code}`)) return t(`media.optimizeAll.reason.${code}`);
    if (te(`media.square.reason_${code}`)) return t(`media.square.reason_${code}`);
    return t("media.optimizeAll.reasonOther");
  }

  const runTitle = computed(() => {
    const r = run.value;
    if (!r) return "";
    const tur =
      r.mode === "rollback"
        ? t("media.optimizeAll.kind.rollback")
        : r.dry_run
          ? t("media.optimizeAll.kind.prova")
          : t("media.optimizeAll.kind.real");
    return `${tur} — ${stateLabel(r.state)}`;
  });

  const checks = computed(() => steps.value.find((s) => s.key === "on_kontrol")?.checks || []);

  const avifText = computed(() => {
    const a = o.avifSummary.value;
    if (!a) return "";
    return t("media.optimizeAll.avif.count", {
      n: a.deletable_files || 0,
      size: formatSize(a.deletable_bytes || 0),
    });
  });

  function onProva() {
    openForAction();
    return o.prova();
  }
  function askStart() {
    if (o.canStart.value) confirmOpen.value = true;
  }
  async function onConfirm() {
    confirmOpen.value = false;
    openForAction();
    await o.start();
  }
  async function onRollbackConfirm() {
    rollbackOpen.value = false;
    openForAction();
    await o.rollback();
  }
</script>

<template>
  <section
    class="card mb-3 mpo"
    :class="{ 'mpo--open': expanded }"
    data-testid="product-optimize-card"
    aria-labelledby="mpo-title"
  >
    <div class="mpo__head">
      <!-- Tüm başlık satırını kaplayan aç/kapat düğmesi; Prova/Başlat onun
           KARDEŞİ (üstünde durur) — tıklamaları kartı katlamaz. -->
      <button
        type="button"
        class="mpo__stretch"
        data-testid="mpo-toggle"
        :aria-expanded="expanded ? 'true' : 'false'"
        aria-controls="mpo-body"
        :aria-label="t('media.optimizeAll.toggleAria')"
        @click="toggleExpanded"
      ></button>
      <span class="mpo__ic" aria-hidden="true">
        <AppIcon
          :name="o.running.value ? 'loader' : 'sparkles'"
          :size="16"
          :class="{ 'animate-spin': o.running.value }"
        />
      </span>
      <div class="mpo__head-text">
        <h2 id="mpo-title" class="mpo__title">{{ t("media.optimizeAll.title") }}</h2>
        <p class="mpo__sub">{{ t("media.optimizeAll.desc") }}</p>
      </div>
      <div class="mpo__actions">
        <button
          type="button"
          class="hdr-btn-outlined"
          data-testid="mpo-prova"
          :disabled="o.running.value || o.actionLoading.value"
          @click="onProva"
        >
          {{ t("media.optimizeAll.prova") }}
        </button>
        <button
          type="button"
          class="hdr-btn-primary"
          data-testid="mpo-start"
          :disabled="!o.canStart.value"
          :title="o.canStart.value ? '' : t('media.optimizeAll.startHint')"
          @click="askStart"
        >
          {{ t("media.optimizeAll.start") }}
        </button>
        <button
          v-if="o.running.value && run?.mode === 'optimize'"
          type="button"
          class="hdr-btn-outlined"
          data-testid="mpo-stop"
          :disabled="o.actionLoading.value"
          @click="o.stop()"
        >
          {{ t("media.optimizeAll.stop") }}
        </button>
      </div>
      <AppIcon name="chevron-down" :size="16" class="mpo__chev" aria-hidden="true" />
    </div>

    <!-- Katlanan gövde: grid-rows 0fr↔1fr. Kapalıyken `inert` → Tab/AT girmez. -->
    <div id="mpo-body" class="mpo__body" data-testid="mpo-body" :inert="!expanded">
      <div class="mpo__body-inner">
        <p v-if="!o.canStart.value && !o.running.value" class="mpo__hint">
          {{ t("media.optimizeAll.startHint") }}
        </p>
        <p class="mpo__hint" data-testid="store-hint">{{ t("media.optimizeAll.storeHint") }}</p>
        <p v-if="o.killSwitch.value" class="mpo__warn" role="status">
          {{ t("media.optimizeAll.killSwitchOn") }}
        </p>
        <p v-if="o.lastError.value" class="mpo__error" role="alert">{{ o.lastError.value }}</p>
        <p v-if="o.pollError.value" class="mpo__error" role="alert">{{ o.pollError.value }}</p>

        <div v-if="run" class="mpo__run" aria-live="polite">
          <div class="mpo__run-head">
            <strong data-testid="mpo-run-title">{{ runTitle }}</strong>
            <span v-if="run.dry_run && !o.running.value" class="mpo__chip">
              {{ t("media.optimizeAll.provaNote") }}
            </span>
          </div>
          <p v-if="run.message" class="mpo__msg">{{ run.message }}</p>

          <div class="mpo__table-wrap">
            <table class="mpo__table" data-testid="mpo-table">
              <thead>
                <tr>
                  <th scope="col">{{ t("media.optimizeAll.table.step") }}</th>
                  <th scope="col" class="num">
                    {{
                      run.dry_run
                        ? t("media.optimizeAll.table.change")
                        : t("media.optimizeAll.table.changed")
                    }}
                  </th>
                  <th scope="col" class="num">{{ t("media.optimizeAll.table.ok") }}</th>
                  <th scope="col" class="num">{{ t("media.optimizeAll.table.skipped") }}</th>
                  <th scope="col" class="num">{{ t("media.optimizeAll.table.failed") }}</th>
                  <th scope="col">{{ t("media.optimizeAll.table.state") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in steps" :key="s.key" :data-step="s.key">
                  <th scope="row">
                    {{ stepLabel(s.key) }}
                    <div v-if="Object.keys(s.reasons || {}).length" class="mpo__reasons">
                      <span v-for="(n, code) in s.reasons" :key="code" class="mpo__chip">
                        {{ reasonLabel(code) }} <b>{{ n }}</b>
                      </span>
                    </div>
                  </th>
                  <td class="num">{{ cell(s, "changed") }}</td>
                  <td class="num">{{ cell(s, "ok") }}</td>
                  <td class="num">{{ cell(s, "skipped") }}</td>
                  <td class="num" :class="{ mpo__bad: Number(s.failed) > 0 }">
                    {{ cell(s, "failed") }}
                  </td>
                  <td>
                    <span class="mpo__state" :class="`mpo__state--${s.state}`">
                      {{ stateLabel(s.state) }}
                    </span>
                    <span v-if="progressText(s)" class="mpo__progress-text">{{
                      progressText(s)
                    }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul v-if="checks.length" class="mpo__checks" :aria-label="t('media.optimizeAll.checks')">
            <li v-for="c in checks" :key="c.key" :class="c.ok ? 'is-ok' : 'is-bad'">
              <AppIcon :name="c.ok ? 'check' : 'x'" :size="12" aria-hidden="true" />
              {{ c.message }}
            </li>
          </ul>
        </div>
        <p v-else-if="!o.loading.value" class="mpo__hint">{{ t("media.optimizeAll.empty") }}</p>

        <div v-if="o.canRollback.value" class="mpo__rollback">
          <span>{{
            t("media.optimizeAll.lastReal", { date: o.lastReal.value?.finished_at || "" })
          }}</span>
          <button
            type="button"
            class="hdr-btn-outlined"
            data-testid="mpo-rollback"
            :disabled="o.actionLoading.value"
            @click="rollbackOpen = true"
          >
            {{ t("media.optimizeAll.rollback") }}
          </button>
          <p class="mpo__hint">{{ t("media.optimizeAll.rollbackHint") }}</p>
        </div>

        <!-- Eski AVIF temizliği — Başlat'a dahil değil, yıkıcı; kendi ekranında onaylanır. -->
        <div class="mpo__avif" data-testid="mpo-avif">
          <div>
            <strong>{{ t("media.optimizeAll.avif.title") }}</strong>
            <p class="mpo__hint">{{ t("media.optimizeAll.avif.desc") }}</p>
            <p v-if="avifText" class="mpo__sub">{{ avifText }}</p>
            <p v-else-if="o.avifError.value" class="mpo__error">{{ o.avifError.value }}</p>
          </div>
          <router-link :to="{ name: 'MediaOrphanAvif' }" class="hdr-btn-outlined">
            {{ t("media.optimizeAll.avif.open") }}
          </router-link>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('media.optimizeAll.title')"
      :message="t('media.optimizeAll.confirm')"
      :confirm-label="t('media.optimizeAll.start')"
      tone="warning"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
    <ConfirmDialog
      v-model:open="rollbackOpen"
      :title="t('media.optimizeAll.rollback')"
      :message="t('media.optimizeAll.rollbackConfirm')"
      :confirm-label="t('media.optimizeAll.rollback')"
      tone="warning"
      @confirm="onRollbackConfirm"
      @cancel="rollbackOpen = false"
    />
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mpo {
    padding: 0;
  }

  .mpo__head {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: media.$s-3;
    flex-wrap: wrap;
    padding: media.$s-4;
  }

  // Başlık satırının tamamı dokunma hedefi (≥44px). Odak halkası 3px,
  // koyu marka tonu: beyaz zeminde 10:1 (açık sarı $brand 1.9:1 kalırdı).
  .mpo__stretch {
    position: absolute;
    inset: 0;
    min-height: 44px;
    border: 0;
    border-radius: 12px;
    background: none;
    cursor: pointer;

    &:focus-visible {
      outline: 3px solid $brand-text;
      outline-offset: -3px;

      @include dark {
        outline-color: $brand-light;
      }
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

  // Düğme dışındaki her şey tıklamayı alta (stretch'e) geçirir; eylem
  // düğmeleri ve AVIF bağlantısı kendi tıklamalarını alır.
  .mpo__head > :not(.mpo__stretch) {
    position: relative;
    pointer-events: none;
  }

  .mpo__head > .mpo__actions {
    pointer-events: auto;
  }

  @media (pointer: coarse) {
    .mpo__actions .hdr-btn-outlined,
    .mpo__actions .hdr-btn-primary {
      min-height: 44px;
    }
  }

  .mpo__chev {
    flex: none;
    align-self: center;
    color: $l-text-500;
    transition: transform $d-pop $ease-out;

    @include dark {
      color: $d-text-muted;
    }
  }

  .mpo--open .mpo__chev {
    transform: rotate(180deg);
  }

  // grid-template-rows 0fr↔1fr: yükseklik ölçülmeden içerik boyuna açılır.
  // visibility kapanış bittikten SONRA düşer (gecikmeli adım) — içerik
  // görünür kalarak söner, ardından Tab/AT'den çıkar (`inert` de var).
  .mpo__body {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows $d-pop $ease-out,
      opacity $d-pop $ease-out,
      visibility 0s linear $d-pop;
  }

  .mpo--open .mpo__body {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
    transition:
      grid-template-rows $d-pop $ease-out,
      opacity $d-pop $ease-out,
      visibility 0s linear 0s;
  }

  // Dikey padding kutuya konmaz (0fr satırında bile yer kaplardı); alt boşluk
  // içerik olan bir ayraçla verilir — yükseklikle birlikte katlanır.
  .mpo__body-inner {
    min-height: 0;
    overflow: hidden;
    padding-inline: media.$s-4;

    &::after {
      content: "";
      display: block;
      height: media.$s-4;
    }
  }

  // Global kural süreyi ~0'a çekiyor ama gecikmeyi değil: o da sıfırlansın.
  @media (prefers-reduced-motion: reduce) {
    .mpo__chev,
    .mpo__body,
    .mpo--open .mpo__body {
      transition: none;
    }
  }

  .mpo__ic {
    display: grid;
    place-items: center;
    width: 2.125rem;
    height: 2.125rem;
    flex: none;
    border-radius: media.$r-md;
    color: $brand-text;
    background: rgba($brand, 0.12);

    @include dark {
      color: $brand-light;
    }
  }

  .mpo__head-text {
    flex: 1 1 16rem;
    min-width: 0;
  }

  .mpo__title {
    font-weight: 600;
    line-height: 1.25;
  }

  .mpo__sub {
    @include media.text("sm");
    @include media.muted(1);
  }

  .mpo__hint {
    margin-top: media.$s-2;
    @include media.text("xs");
    @include media.muted(2);
  }

  .mpo__warn {
    margin-top: media.$s-2;
    color: $c-warning-text;
    @include media.text("sm");

    @include dark {
      color: $c-warning;
    }
  }

  .mpo__error {
    margin-top: media.$s-2;
    color: $c-error;
    @include media.text("sm");
  }

  .mpo__actions {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .mpo .hdr-btn-primary:disabled,
  .mpo .hdr-btn-outlined:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .mpo__run {
    margin-top: media.$s-3;
    padding-top: media.$s-3;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .mpo__run-head {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .mpo__msg {
    margin-top: media.$s-1;
    @include media.text("sm");
  }

  .mpo__table-wrap {
    margin-top: media.$s-2;
    overflow-x: auto;
  }

  .mpo__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: media.$s-2;
      text-align: start;
      vertical-align: top;
      border-bottom: 1px solid $l-border-alt;

      @include dark {
        border-color: $d-border-inner;
      }
    }

    thead th {
      font-weight: 600;
      @include media.muted(1);
    }

    tbody th {
      font-weight: 500;
    }

    .num {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  }

  .mpo__bad {
    color: $c-error;
    font-weight: 600;
  }

  .mpo__reasons {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
    margin-top: media.$s-1;
  }

  .mpo__chip {
    @include media.chip("neutral");
  }

  .mpo__state {
    white-space: nowrap;

    &--done {
      color: $c-success-text;

      @include dark {
        color: $c-success;
      }
    }

    &--error,
    &--partial {
      color: $c-error;
    }

    &--running,
    &--queued {
      color: $brand-text;

      @include dark {
        color: $brand-light;
      }
    }
  }

  .mpo__progress-text {
    display: block;
    @include media.text("xs");
    @include media.muted(2);
  }

  .mpo__checks {
    margin-top: media.$s-2;
    display: grid;
    gap: 2px;
    @include media.text("xs");

    li {
      display: flex;
      align-items: center;
      gap: media.$s-1;
    }

    .is-ok {
      @include media.muted(1);
    }

    .is-bad {
      color: $c-error;
    }
  }

  .mpo__rollback {
    margin-top: media.$s-3;
    padding-top: media.$s-3;
    border-top: 1px solid $l-border-alt;
    display: flex;
    align-items: center;
    gap: media.$s-3;
    flex-wrap: wrap;
    @include media.text("sm");

    @include dark {
      border-color: $d-border-inner;
    }

    .mpo__hint {
      flex-basis: 100%;
      margin-top: 0;
    }
  }

  .mpo__avif {
    margin-top: media.$s-3;
    padding-top: media.$s-3;
    border-top: 1px dashed $l-border-alt;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-3;
    flex-wrap: wrap;

    @include dark {
      border-color: $d-border-inner;
    }
  }
</style>

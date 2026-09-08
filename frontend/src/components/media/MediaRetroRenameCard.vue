<script setup>
  /**
   * Eski adlandırma (retro-rename) operatör kartı (MOGEM-582).
   *
   * Akış: kart açılışında ucuz sayaç (`loadCount`) + geri alınabilir iş
   * geçmişi (`loadHistory`) yüklenir — `loadPlan()` MOUNT'TA ÇAĞRILMAZ, çünkü
   * ~20 sn sürebilir (bkz. `useMediaRetroRename.js`). "Önizle" tıklanınca
   * `loadPlan()` tetiklenir ve süresince `planLoading` göstergesi basılır.
   *
   * Kart katlanır: iş bitmişse tek özet satırına iner, yapılacak iş / çalışan
   * iş / hata varken kendiliğinden açılır. Gövde `v-show` ile gizlenir (v-if
   * değil): SSR testleri metin varlığını ölçüyor, DOM'dan düşürmek onları
   * köreltir.
   */
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useMediaRetroRename } from "@/composables/useMediaRetroRename";
  import { formatDay } from "@/utils/dateFormat";

  const DAYS = 90;
  const { t, locale } = useI18n();
  const r = useMediaRetroRename();

  const previewOpen = ref(false);
  const dryRun = ref(false);
  const confirmOpen = ref(false);
  const rollbackOpen = ref(false);
  const rollbackTarget = ref(null);

  onMounted(() => {
    r.loadCount();
    r.loadHistory();
  });

  const pendingCount = computed(() => r.pendingCount.value);
  // `count` ucunun kırılımı: `renamable` bu araçla taşınabilenler, `diskMissing`
  // `tabFile` eski adresi gösteriyor ama blob diskte yok. Kart eskiden `total`'a
  // bakıyordu ve yalnız bayat satır kalan bir sitede sonsuza dek "N dosya
  // bekliyor" diyip taşınamaz bir "Önizle" düğmesi gösteriyordu.
  const renamableCount = computed(() => r.renamableCount.value);
  const diskMissingCount = computed(() => r.diskMissingCount.value);
  const allDone = computed(() => renamableCount.value === 0 && diskMissingCount.value === 0);
  const onlyDiskMissing = computed(() => renamableCount.value === 0 && diskMissingCount.value > 0);
  const percent = computed(() =>
    r.job.total ? Math.round((r.job.processed / r.job.total) * 100) : 0
  );
  const terminal = computed(() => !!r.job.key && !r.running.value);
  const refsTotal = computed(
    () => (r.plan.value?.refs_exact || 0) + (r.plan.value?.refs_embedded || 0)
  );

  // ── Katlama ────────────────────────────────────────────────────────
  // Kullanıcı dokunmadıysa kart kendi karar verir: ilgi isteyen bir şey
  // (bekleyen dosya, çalışan/biten iş, hata, açık önizleme) varsa açık,
  // yoksa tek satır. Elle aç/kapa otomatiği ezer.
  const manualExpanded = ref(null);
  const autoExpanded = computed(
    () =>
      renamableCount.value > 0 ||
      r.running.value ||
      !!r.job.key ||
      previewOpen.value ||
      !!r.lastError.value ||
      !!r.pollError.value
  );
  const expanded = computed(() => manualExpanded.value ?? autoExpanded.value);
  function toggleExpanded() {
    manualExpanded.value = !expanded.value;
  }

  const stateIcon = computed(() => {
    if (r.running.value) return "loader";
    if (renamableCount.value > 0) return "tag";
    return "check";
  });

  // ── Yönlendirme penceresi ──────────────────────────────────────────
  // Backend "YYYY-MM-DD HH:mm:ss" basıyor; Safari boşluklu biçimi tanımaz.
  function expiryMs(value) {
    return new Date(String(value).replace(" ", "T")).getTime();
  }
  function isExpired(value) {
    const ms = expiryMs(value);
    return Number.isFinite(ms) && ms < Date.now();
  }
  function daysLeft(value) {
    const ms = expiryMs(value);
    return Number.isFinite(ms) ? Math.max(0, Math.ceil((ms - Date.now()) / 86400000)) : 0;
  }

  function openPreview() {
    previewOpen.value = true;
    r.loadPlan();
  }
  function askStart() {
    confirmOpen.value = true;
  }
  async function onConfirm() {
    confirmOpen.value = false;
    previewOpen.value = false;
    await r.start({ dryRun: dryRun.value });
  }
  function askRollback(job) {
    rollbackTarget.value = job;
    rollbackOpen.value = true;
  }
  async function onRollback() {
    rollbackOpen.value = false;
    if (rollbackTarget.value) await r.rollback(rollbackTarget.value.job_key);
  }

  // Yalnız İŞ ÇALIŞIRKEN "prova/çalışıyor/geri alınıyor" gösterir; terminal
  // durumda mode her zaman son işin türünü taşıdığından (rename ya da
  // rollback) "geri alınıyor" başlığı bittikten sonra da yapışıp kalırdı.
  const jobTitle = computed(() => {
    if (r.running.value) {
      if (r.job.mode === "rollback") return t("mediaRetroRename.rollingBack");
      return r.job.dry_run ? t("mediaRetroRename.dryRunning") : t("mediaRetroRename.running");
    }
    const s = r.job.state;
    if (s === "not_found") return t("mediaRetroRename.error");
    return t(`mediaRetroRename.${s === "completed" ? "done" : s || "done"}`);
  });
</script>

<template>
  <div class="card mb-3 mrr" :class="{ 'mrr--open': expanded }" data-testid="retro-rename-card">
    <!-- ── Özet satırı ── -->
    <!-- Satırın tamamı katlama düğmesi: `stretch` görünmez buton olarak alta
         serilir, metinler pointer-events almaz, Önizle üstte kalır. -->
    <div class="mrr__summary">
      <button
        type="button"
        class="mrr__stretch"
        :aria-expanded="expanded"
        :aria-label="t('mediaRetroRename.toggleAria')"
        @click="toggleExpanded"
      ></button>

      <span
        class="mrr__state-ic"
        :class="
          renamableCount > 0 || r.running.value ? 'mrr__state-ic--pending' : 'mrr__state-ic--good'
        "
        aria-hidden="true"
      >
        <AppIcon :name="stateIcon" :size="16" :class="{ 'animate-spin': r.running.value }" />
      </span>

      <span class="mrr__summary-text">
        <h3 class="mrr__title">{{ t("mediaRetroRename.title") }}</h3>
        <span
          v-if="r.countLoading.value && pendingCount === null"
          class="mrr__sub"
          role="status"
          aria-live="polite"
        >
          {{ t("mediaRetroRename.loading") }}
        </span>
        <span v-else-if="r.countError.value" class="mrr__sub mrr__sub--error" role="alert">
          {{ t("mediaRetroRename.countError", { error: r.countError.value }) }}
        </span>
        <span v-else-if="allDone" class="mrr__sub mrr__sub--good">
          {{ t("mediaRetroRename.allDone") }}
        </span>
        <span v-else-if="onlyDiskMissing" class="mrr__sub">
          {{ t("mediaRetroRename.onlyDiskMissing", { count: diskMissingCount }) }}
        </span>
        <template v-else>
          <span class="mrr__sub">{{ t("mediaRetroRename.pending", { count: pendingCount }) }}</span>
          <span class="mrr__sub mrr__sub--hint">{{
            t("mediaRetroRename.hint", { days: DAYS })
          }}</span>
        </template>
      </span>

      <span v-if="r.canRollback.value" class="mrr__chip mrr__summary-chip">
        {{ t("mediaRetroRename.rollbackJobsChip", { n: r.history.value.length }) }}
      </span>

      <button
        v-if="renamableCount > 0 && !r.running.value"
        type="button"
        class="hdr-btn-outlined mrr__preview-btn"
        @click="openPreview"
      >
        {{ t("mediaRetroRename.preview") }}
      </button>

      <AppIcon name="chevron-down" :size="16" class="mrr__chev" aria-hidden="true" />
    </div>

    <div v-show="expanded" class="mrr__body">
      <p v-if="r.lastError.value" class="text-sm text-red-600" role="alert">
        {{ r.lastError.value }}
      </p>
      <p v-if="r.pollError.value" class="text-sm text-red-600" role="alert">
        {{ t("mediaRetroRename.pollError", { error: r.pollError.value }) }}
      </p>

      <!-- Önizleme -->
      <div v-if="previewOpen" class="mt-3 border-t pt-3">
        <strong>{{ t("mediaRetroRename.previewTitle") }}</strong>

        <p v-if="r.planLoading.value" class="text-sm opacity-70 mt-2">
          {{ t("mediaRetroRename.planLoading") }}
        </p>
        <p v-else-if="r.planError.value" class="text-sm text-red-600 mt-2">
          {{ r.planError.value }}
        </p>
        <dl v-else-if="r.plan.value" class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.renamable") }}</dt>
            <dd>
              <b>{{ r.plan.value.renamable }}</b>
            </dd>
          </div>
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.refs") }}</dt>
            <dd>
              <b>{{ refsTotal }}</b>
            </dd>
          </div>
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.orphans") }}</dt>
            <dd>
              <b>{{ r.plan.value.orphans }}</b>
            </dd>
          </div>
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.diskMissing") }}</dt>
            <dd>
              <b>{{ r.plan.value.disk_missing }}</b>
            </dd>
          </div>
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.collisions") }}</dt>
            <dd>
              <b>{{ r.plan.value.collisions }}</b>
            </dd>
          </div>
          <div>
            <dt class="opacity-70">{{ t("mediaRetroRename.stats.readonly") }}</dt>
            <dd>
              <b>{{ r.plan.value.refs_readonly }}</b>
            </dd>
          </div>
        </dl>

        <label v-if="r.plan.value" class="flex items-center gap-2 mt-3 text-sm">
          <input v-model="dryRun" type="checkbox" /> {{ t("mediaRetroRename.dryRun") }}
        </label>

        <div class="flex justify-end gap-2 mt-3">
          <button type="button" class="hdr-btn-outlined" @click="previewOpen = false">
            {{ t("mediaRetroRename.cancel") }}
          </button>
          <button
            v-if="r.plan.value"
            type="button"
            class="hdr-btn-primary"
            :disabled="!r.plan.value.renamable || r.actionLoading.value"
            @click="askStart"
          >
            {{ t("mediaRetroRename.start") }}
          </button>
        </div>
      </div>

      <!-- İlerleme / sonuç -->
      <div
        v-if="r.job.key"
        class="mt-3 border-t pt-3"
        role="region"
        :aria-label="jobTitle"
        aria-live="polite"
      >
        <div class="flex items-center justify-between">
          <strong>{{ jobTitle }}</strong>
          <span class="text-sm">
            {{ r.job.processed }} / {{ r.job.total }} — %{{ percent }}
            <button
              v-if="terminal"
              type="button"
              class="mrr__close ml-2"
              :title="t('mediaRetroRename.close')"
              @click="r.resetJob()"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </span>
        </div>
        <div
          class="mrr__progress mt-2"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="r.job.total || 0"
          :aria-valuenow="r.job.processed"
          :aria-valuetext="`${r.job.processed} / ${r.job.total} — %${percent}`"
          :aria-label="t('mediaRetroRename.progress')"
        >
          <span class="mrr__progress-fill" :style="{ width: percent + '%' }" />
        </div>
        <div class="flex flex-wrap gap-3 text-sm mt-1">
          <span
            >{{ t("mediaRetroRename.renamed") }}: <b>{{ r.job.renamed }}</b></span
          >
          <span
            >{{ t("mediaRetroRename.skipped") }}: <b>{{ r.job.skipped }}</b></span
          >
          <span v-if="r.job.errors" class="text-red-600">
            {{ t("mediaRetroRename.errors") }}: <b>{{ r.job.errors }}</b>
          </span>
        </div>
        <!-- Dosya sayısı ≠ referans sayısı: tek blob onlarca alanda geçebilir.
             `refsSkipped` "kaç referans 301 köprüsüne muhtaç kaldı" demek. -->
        <div class="text-sm mt-1 opacity-80">
          {{ t("mediaRetroRename.refsUpdated") }}: <b>{{ r.job.refs_updated }}</b> ·
          {{ t("mediaRetroRename.refsSkipped") }}: <b>{{ r.job.refs_skipped }}</b>
        </div>
        <div v-if="Object.keys(r.job.skip_reasons).length" class="mrr__reasons mt-1">
          <span v-for="(count, reason) in r.job.skip_reasons" :key="reason" class="mrr__chip">
            {{ t(`mediaRetroRename.skip.${reason}`) }} <b>{{ count }}</b>
          </span>
        </div>
        <p v-if="r.job.message" class="text-sm mt-1 opacity-80" role="status">
          {{ r.job.message }}
        </p>
        <p
          v-if="terminal && !r.job.dry_run && r.job.mode === 'rename' && r.job.expires_at"
          class="text-sm mt-1"
        >
          {{ t("mediaRetroRename.redirectUntil", { date: formatDay(r.job.expires_at, locale) }) }}
        </p>
        <button
          v-if="r.running.value && r.job.mode === 'rename'"
          type="button"
          class="hdr-btn-outlined mt-2"
          :disabled="r.actionLoading.value"
          @click="r.stop()"
        >
          {{ t("mediaRetroRename.stop") }}
        </button>
      </div>

      <!-- Geri alınabilir işler -->
      <div
        v-if="r.historyLoading.value"
        class="mt-3 border-t pt-3 text-sm"
        role="status"
        aria-live="polite"
      >
        {{ t("mediaRetroRename.historyLoading") }}
      </div>
      <div v-if="r.historyError.value" class="mt-3 border-t pt-3 text-sm text-red-600" role="alert">
        {{ t("mediaRetroRename.historyError", { error: r.historyError.value }) }}
      </div>
      <div v-if="r.canRollback.value" class="mt-3 border-t pt-3">
        <div class="mrr__jobs-head">
          <span>{{ t("mediaRetroRename.rollbackJobs") }}</span>
          <span class="mrr__jobs-count">{{ r.history.value.length }}</span>
        </div>
        <div
          v-for="j in r.history.value"
          :key="j.job_key"
          class="mrr__job"
          :class="{ 'mrr__job--dead': isExpired(j.expires_at) }"
        >
          <span class="mrr__job-ic" aria-hidden="true">
            <AppIcon name="rotate-ccw" :size="14" />
          </span>
          <span class="mrr__job-info">
            <b class="mrr__job-name">{{ t("mediaRetroRename.filesMoved", { n: j.count }) }}</b>
            <span v-if="isExpired(j.expires_at)" class="mrr__job-meta">
              {{ t("mediaRetroRename.expiredOn", { date: formatDay(j.expires_at, locale) }) }}
            </span>
            <span v-else class="mrr__job-meta">
              {{ t("mediaRetroRename.redirectUntil", { date: formatDay(j.expires_at, locale) }) }}
              · {{ t("mediaRetroRename.daysLeft", { d: daysLeft(j.expires_at) }) }}
            </span>
          </span>
          <span v-if="isExpired(j.expires_at)" class="mrr__chip">
            {{ t("mediaRetroRename.expired") }}
          </span>
          <button
            v-else
            type="button"
            class="mrr__quiet"
            :disabled="r.actionLoading.value"
            @click="askRollback(j)"
          >
            {{ t("mediaRetroRename.rollback") }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('mediaRetroRename.confirmTitle')"
      :message="
        t('mediaRetroRename.confirmMessage', {
          count: r.plan.value?.renamable || 0,
          refs: refsTotal,
          days: DAYS,
        })
      "
      :confirm-label="t('mediaRetroRename.confirmOk')"
      tone="warning"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
    <ConfirmDialog
      v-model:open="rollbackOpen"
      :title="t('mediaRetroRename.rollback')"
      :message="t('mediaRetroRename.rollbackConfirm', { count: rollbackTarget?.count || 0 })"
      :confirm-label="t('mediaRetroRename.rollback')"
      tone="danger"
      @confirm="onRollback"
      @cancel="rollbackOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // `.card` 20px dolgu basar; katlanır satır tam genişlik tıklanabilir olsun
  // diye dolgu içeriye alınır.
  .mrr {
    padding: 0;
  }

  // ── Özet satırı ──────────────────────────────────────────────────
  .mrr__summary {
    position: relative;
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
  }

  // Görünmez katlama düğmesi satırın tamamına serilir; metinler tık almaz,
  // Önizle kendi z-index'iyle üstte kalır.
  .mrr__stretch {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 12px;
    background: none;
    cursor: pointer;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        background: $l-bg-subtle;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  .mrr__summary > :not(.mrr__stretch) {
    position: relative;
    pointer-events: none;
  }

  .mrr__preview-btn {
    pointer-events: auto;
    flex: none;
  }

  .mrr__state-ic {
    display: grid;
    place-items: center;
    width: 2.125rem;
    height: 2.125rem;
    flex: none;
    border-radius: media.$r-md;

    &--good {
      color: $c-success-text;
      background: media.$tint-success;

      @include dark {
        color: $c-success;
      }
    }

    &--pending {
      color: $c-warning-text;
      background: media.$tint-warning;

      @include dark {
        color: $c-warning;
      }
    }
  }

  .mrr__summary-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .mrr__title {
    font-weight: 600;
    line-height: 1.25;
  }

  .mrr__sub {
    @include media.text("sm");
    @include media.muted(1);
  }

  .mrr__sub--good {
    color: $c-success-text;

    @include dark {
      color: $c-success;
    }
  }

  .mrr__sub--error {
    color: $c-error;
  }

  .mrr__sub--hint {
    @include media.text("xs");
    @include media.muted(2);
  }

  .mrr__summary-chip {
    flex: none;
  }

  .mrr__chev {
    flex: none;
    color: $l-text-400;
    transition: transform $t-base;

    @include dark {
      color: $d-text-muted;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .mrr--open .mrr__chev {
    transform: rotate(180deg);
  }

  .mrr__body {
    padding: 0 media.$s-4 media.$s-4;

    // Tailwind'in çıplak `border-t`'si renk verilmeyince `currentColor`
    // (metin rengi) çizer — bölüm ayraçları simsiyah görünüyordu.
    > .border-t {
      border-color: $l-border-alt;

      @include dark {
        border-color: $d-border-inner;
      }
    }
  }

  // ── Geri alınabilir işler ────────────────────────────────────────
  .mrr__jobs-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: media.$s-1;
    @include media.text("xs");
    @include media.muted(1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mrr__jobs-count {
    @include media.numeric;
  }

  .mrr__job {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 0;

    & + & {
      @include media.divider(top);
    }
  }

  .mrr__job-ic {
    display: grid;
    place-items: center;
    width: 1.875rem;
    height: 1.875rem;
    flex: none;
    border-radius: media.$r-md;
    color: $l-text-500;
    background: $l-bg-muted;

    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }

  .mrr__job-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .mrr__job-name {
    @include media.text("sm");
    font-weight: 600;
    @include media.numeric;
  }

  .mrr__job-meta {
    @include media.text("xs");
    @include media.muted(2);
  }

  .mrr__job--dead {
    .mrr__job-name,
    .mrr__job-meta,
    .mrr__job-ic {
      color: $l-text-400;

      @include dark {
        color: $d-text-faint;
      }
    }
  }

  // Sessiz "Geri al": satır başına tam buton töreni yerine marka tonlu metin.
  .mrr__quiet {
    flex: none;
    border: 0;
    border-radius: media.$r-md;
    padding: media.$s-1 media.$s-2;
    background: none;
    color: $brand-text;
    font-weight: 700;
    cursor: pointer;
    @include media.text("sm");
    @include media.focus-ring;

    @include dark {
      color: $brand-light;
    }

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: rgba($brand, 0.14);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mrr__progress {
    height: 5px;
    border-radius: media.$r-sm;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mrr__progress-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .mrr__reasons {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .mrr__chip {
    @include media.chip("neutral");
  }

  .mrr__close {
    @include media.icon-button;
  }

  // MOGEM-625 — dar ekranda özet satırı İKİ KATA iner.
  //
  // Satır sarmıyordu: ikon + çip + "Önizle" + şevron sabit genişlikte, metin
  // sütunu (`flex: 1; min-width: 0`) artakalanı alıyordu ve 400px'te 24px'e
  // çöküyordu — cümle kelime kelime alt alta diziliyordu (ölçüldü: 9 kelime,
  // 9 satır). `min-width: 0` taşmayı önler ama ÇÖKMEYİ önlemez; taban genişlik
  // vermek gerekiyor.
  //
  // Sınır 1024px — VIEWPORT değil, İÇERİK genişliği düşünülerek.
  //
  // Önce 640px seçilmişti ve 768px'lik tablette kart hâlâ sıkışıktı: o
  // genişlikte uygulama kabuğu (ray 60 + panel 220) 280px yiyor, sayfaya
  // 488px kalıyor. `@media` bu 280px'i görmüyor — `media.scss`in kırılma
  // noktası bölümündeki uyarının ta kendisi. Sınır, panelin katlandığı ve
  // ekranın "dokunmatik" saydığı yerle aynı.
  @media (max-width: media.$m-bp-rail) {
    .mrr__summary {
      flex-wrap: wrap;
      row-gap: media.$s-2;
    }

    // İkon + boşluk payı düşülüyor: metin ikonun yanında kalır ama kendinden
    // sonrakileri alt satıra iter.
    .mrr__summary-text {
      flex: 1 1 calc(100% - 2.25rem - #{media.$s-3});
      min-width: 9rem;
    }

    // Eylemler alt satırda tek grup, sağa yaslı.
    .mrr__summary-chip {
      margin-inline-start: auto;
    }

    // Geri alınabilir iş satırı da aynı kusuru taşıyordu: ikon + çip/düğme
    // sabit, bilgi sütunu artakalanı alıyor ve 320px'te 74px'e çöküyordu
    // ("Yönlendirme … sona erdi" beş satıra iniyordu). Aynı çözüm: sar.
    .mrr__job {
      flex-wrap: wrap;
      row-gap: media.$s-1;
    }

    .mrr__job-info {
      flex: 1 1 calc(100% - 1.75rem - #{media.$s-3});
      min-width: 8rem;
    }
  }
</style>

<script setup>
  /**
   * Ürün görsellerini kareye çevir (Task 6, kare-görsel dönüşümü SDD planı).
   *
   * `useMediaRetroRename` + `MediaRetroRenameCard`in sadeleştirilmiş bir
   * türevi: ayrı bir "plan" ucu yok — "Prova" da gerçek koşu da AYNI
   * `start_square` ucundan geçer (`dry_run` bayrağıyla ayrışır), ikisi de
   * aynı iş kuyruğu + polling sözleşmesiyle izlenir. Geri alınabilir iş
   * geçmişi backend'den gelmiyor: son GERÇEK işin bilgisi composable
   * içinde `localStorage`da tutulur (bkz. `useMediaSquare.js`).
   *
   * `square_count` tüm ilanları sunucu tarafında tarıyor — bu yüzden yalnız
   * kart açılışında ve bir iş bitince çağrılır, ASLA poll döngüsünde değil.
   */
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useMediaSquare } from "@/composables/useMediaSquare";

  const { t } = useI18n();
  const r = useMediaSquare();

  const confirmOpen = ref(false);

  onMounted(() => {
    r.loadCount();
  });

  const pendingCount = computed(() => r.pendingCount.value ?? 0);
  const hasPending = computed(() => pendingCount.value > 0);
  const percent = computed(() =>
    r.job.total ? Math.round((r.job.processed / r.job.total) * 100) : 0
  );
  const terminal = computed(() => !!r.job.key && !r.running.value);

  // Terminal başlık: `terminal` yalnız "iş artık çalışmıyor" demek —
  // stopped/error/not_found için de true. Bunları da "Tamamlandı" göstermek
  // yanlış — durdurulan ya da hata veren bir iş başarılı gibi görünürdü.
  const jobTitle = computed(() => {
    const s = r.job.state;
    if (s === "stopped") return t("media.square.stopped");
    if (s === "error") return t("media.square.error");
    if (s === "not_found") return t("media.square.notFound");
    if (s === "partial") return t("media.square.donePartial");
    return t("media.square.done");
  });

  // ── Katlama — retro-rename ile aynı sadelikte: ilgi isteyen bir şey
  // (bekleyen dosya, çalışan iş, hata, geri alınabilir iş) varsa açık.
  const manualExpanded = ref(null);
  const autoExpanded = computed(
    () =>
      hasPending.value ||
      r.running.value ||
      !!r.job.key ||
      !!r.lastError.value ||
      !!r.pollError.value
  );
  const hasBody = computed(
    () => !!r.job.key || !!r.lastError.value || !!r.pollError.value || r.canRollback.value
  );
  const expanded = computed(() => hasBody.value && (manualExpanded.value ?? autoExpanded.value));
  function toggleExpanded() {
    manualExpanded.value = !expanded.value;
  }

  const stateIcon = computed(() => {
    if (r.running.value) return "loader";
    if (hasPending.value) return "square";
    return "check";
  });

  // `retro_rename.py`deki `_bump_reason` deseniyle aynı: backend `reasons`
  // sözlüğüne bilinen kod dışında bir şey (ör. yeni bir hata kodu) yazarsa
  // ham anahtar adı basılmasın — genel bir etikete düşer.
  const KNOWN_REASONS = new Set([
    "not_image",
    "disk_missing",
    "quarantined",
    "archived",
    "not_product",
    "animated",
    "unreadable",
    "too_large",
    "kept_for_orders",
    "leftover",
    "redirect_exists",
    "healed",
    "lock_timeout",
    "disk_write",
    "invalid_name",
    "invalid_path",
    "exception",
    "archive_missing",
    "db_restore",
    "rollback_failed",
  ]);
  function reasonLabel(code) {
    if (KNOWN_REASONS.has(code)) return t(`media.square.reason_${code}`);
    return t("media.square.reasonOther");
  }

  // "Zaten uygun" ayrı sayaç; geri kalan nedenler "Atlanacak" altında toplanır.
  const otherReasons = computed(() =>
    Object.entries(r.job.reasons || {}).filter(([code]) => code !== "already_square")
  );
  const alreadySquareCount = computed(() => r.job.reasons?.already_square || 0);
  const willSkipCount = computed(() =>
    otherReasons.value.reduce((sum, [, count]) => sum + count, 0)
  );

  async function onPreview() {
    manualExpanded.value = null;
    await r.start({ dryRun: true });
  }
  function askStart() {
    confirmOpen.value = true;
  }
  async function onConfirm() {
    confirmOpen.value = false;
    await r.start({ dryRun: false });
  }
</script>

<template>
  <div class="card mb-3 msq" :class="{ 'msq--open': expanded }" data-testid="square-card">
    <!-- ── Özet satırı ── -->
    <div class="msq__summary">
      <button
        v-if="hasBody"
        type="button"
        class="msq__stretch"
        :aria-expanded="expanded"
        :aria-label="t('media.square.toggleAria')"
        @click="toggleExpanded"
      ></button>

      <span
        class="msq__state-ic"
        :class="hasPending || r.running.value ? 'msq__state-ic--pending' : 'msq__state-ic--good'"
        aria-hidden="true"
      >
        <AppIcon :name="stateIcon" :size="16" :class="{ 'animate-spin': r.running.value }" />
      </span>

      <span class="msq__summary-text">
        <h3 class="msq__title">{{ t("media.square.title") }}</h3>
        <span
          v-if="r.countLoading.value && r.pendingCount.value === null"
          class="msq__sub"
          role="status"
          aria-live="polite"
        >
          {{ t("media.square.loading") }}
        </span>
        <span v-else-if="r.countError.value" class="msq__sub msq__sub--error" role="alert">
          {{ t("media.square.countError", { error: r.countError.value }) }}
        </span>
        <span v-else class="msq__sub">{{ t("media.square.count", { n: pendingCount }) }}</span>
        <span class="msq__sub msq__sub--hint">{{ t("media.square.desc") }}</span>
      </span>

      <span v-if="r.canRollback.value" class="msq__chip msq__summary-chip">
        {{ t("media.square.lastJobChip", { n: r.lastJob.value?.renamed || 0 }) }}
      </span>

      <button
        v-if="hasPending && !r.running.value"
        type="button"
        class="hdr-btn-outlined msq__preview-btn"
        :disabled="r.actionLoading.value"
        @click="onPreview"
      >
        {{ t("media.square.preview") }}
      </button>
      <button
        v-if="hasPending && !r.running.value"
        type="button"
        class="hdr-btn-primary msq__start-btn"
        :disabled="r.actionLoading.value"
        @click="askStart"
      >
        {{ t("media.square.start") }}
      </button>

      <AppIcon v-if="hasBody" name="chevron-down" :size="16" class="msq__chev" aria-hidden="true" />
    </div>

    <div v-show="expanded" class="msq__body">
      <p v-if="r.lastError.value" class="text-sm text-red-600" role="alert">
        {{ r.lastError.value }}
      </p>
      <p v-if="r.pollError.value" class="text-sm text-red-600" role="alert">
        {{ r.pollError.value }}
      </p>

      <!-- İlerleme / sonuç -->
      <div
        v-if="r.job.key"
        class="mt-3 border-t pt-3"
        role="region"
        :aria-label="t('media.square.title')"
        aria-live="polite"
      >
        <div class="flex items-center justify-between">
          <strong v-if="terminal">{{ jobTitle }}</strong>
          <span class="text-sm">
            {{ r.job.processed }} / {{ r.job.total }} — %{{ percent }}
            <button
              v-if="terminal"
              type="button"
              class="msq__close ml-2"
              :title="t('media.square.close')"
              :aria-label="t('media.square.close')"
              @click="r.resetJob()"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </span>
        </div>
        <div
          class="msq__progress mt-2"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="r.job.total || 0"
          :aria-valuenow="r.job.processed"
          :aria-valuetext="`${r.job.processed} / ${r.job.total} — %${percent}`"
        >
          <span class="msq__progress-fill" :style="{ width: percent + '%' }" />
        </div>
        <div class="flex flex-wrap gap-3 text-sm mt-1">
          <span
            >{{ t(r.job.dry_run ? "media.square.willConvert" : "media.square.converted") }}:
            <b>{{ r.job.renamed }}</b></span
          >
          <span
            >{{ t("media.square.alreadyOk") }}: <b>{{ alreadySquareCount }}</b></span
          >
          <span
            >{{ t("media.square.willSkip") }}: <b>{{ willSkipCount }}</b></span
          >
        </div>
        <div v-if="otherReasons.length" class="msq__reasons mt-1">
          <span v-for="[code, count] in otherReasons" :key="code" class="msq__chip">
            {{ reasonLabel(code) }} <b>{{ count }}</b>
          </span>
        </div>
        <p v-if="r.job.message" class="text-sm mt-1 opacity-80" role="status">
          {{ r.job.message }}
        </p>
        <button
          v-if="r.running.value && r.job.mode === 'kare'"
          type="button"
          class="hdr-btn-outlined mt-2"
          :disabled="r.actionLoading.value"
          @click="r.stop()"
        >
          {{ t("media.square.stop") }}
        </button>
      </div>

      <!-- Geri alınabilir son gerçek iş -->
      <div v-if="r.canRollback.value" class="mt-3 border-t pt-3">
        <div class="msq__last-job">
          <span class="msq__job-ic" aria-hidden="true">
            <AppIcon name="rotate-ccw" :size="14" />
          </span>
          <span class="msq__job-info">
            <b>{{ t("media.square.lastJobChip", { n: r.lastJob.value?.renamed || 0 }) }}</b>
          </span>
          <button
            type="button"
            class="msq__quiet"
            :disabled="r.actionLoading.value"
            @click="r.rollback()"
          >
            {{ t("media.square.rollback") }}
          </button>
        </div>
        <p class="text-xs mt-2 opacity-80">{{ t("media.square.rollbackHint") }}</p>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('media.square.title')"
      :message="t('media.square.confirm')"
      :confirm-label="t('media.square.start')"
      tone="warning"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .msq {
    padding: 0;
  }

  .msq__summary {
    position: relative;
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    flex-wrap: wrap;
  }

  .msq__stretch {
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

  .msq__summary > :not(.msq__stretch) {
    position: relative;
    pointer-events: none;
  }

  .msq__summary > .msq__preview-btn,
  .msq__summary > .msq__start-btn {
    pointer-events: auto;
    flex: none;
  }

  .msq .hdr-btn-primary:disabled,
  .msq .hdr-btn-outlined:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .msq__state-ic {
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

  .msq__summary-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .msq__title {
    font-weight: 600;
    line-height: 1.25;
  }

  .msq__sub {
    @include media.text("sm");
    @include media.muted(1);
  }

  .msq__sub--error {
    color: $c-error;
  }

  .msq__sub--hint {
    @include media.text("xs");
    @include media.muted(2);
  }

  .msq__summary-chip {
    flex: none;
  }

  .msq__chev {
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

  .msq--open .msq__chev {
    transform: rotate(180deg);
  }

  .msq__body {
    padding: 0 media.$s-4 media.$s-4;

    > .border-t {
      border-color: $l-border-alt;

      @include dark {
        border-color: $d-border-inner;
      }
    }
  }

  .msq__progress {
    height: 5px;
    border-radius: media.$r-sm;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msq__progress-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .msq__reasons {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .msq__chip {
    @include media.chip("neutral");
  }

  .msq__close {
    @include media.icon-button;
  }

  .msq__last-job {
    display: flex;
    align-items: center;
    gap: media.$s-3;
  }

  .msq__job-ic {
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

  .msq__job-info {
    flex: 1;
    min-width: 0;
    @include media.text("sm");
  }

  .msq__quiet {
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

  // MOGEM-625 desenini izler (bkz. MediaRetroRenameCard) — dar ekranda özet
  // satırı sarılır, taban genişlik verilmezse çöker.
  @media (max-width: media.$m-bp-rail) {
    .msq__summary {
      row-gap: media.$s-2;
    }

    .msq__summary-text {
      flex: 1 1 calc(100% - 2.25rem - #{media.$s-3});
      min-width: 9rem;
    }

    .msq__summary-chip {
      margin-inline-start: auto;
    }
  }
</style>

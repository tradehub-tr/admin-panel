<script setup>
  import { onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import { useMediaSecurity } from "@/composables/useMediaSecurity";
  import { useToast } from "@/composables/useToast";
  import { formatDateTime } from "@/utils/dateFormat";
  import { formatSize } from "@/utils/mediaFormat";

  const { t, locale } = useI18n();
  const toast = useToast();
  const s = useMediaSecurity();

  // Karantinadan çıkarma geri alınamaz bir güven kararı: sistemin ZARARLI
  // dediği dosyayı erişime açıyor. Tek tıkla olmamalı.
  const confirming = ref(null);

  onMounted(() => s.loadAll());

  async function doRelease(row) {
    confirming.value = null;
    try {
      await s.release(row.file_url);
      toast.success(t("mediaQuarantine.toast.released"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doRetry(row) {
    try {
      await s.retry(row.file_url);
      toast.success(t("mediaQuarantine.toast.retried"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doSweep() {
    try {
      const r = await s.sweep();
      toast.success(t("mediaQuarantine.toast.swept", { n: r?.requeued ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doBackfill() {
    try {
      const r = await s.backfill(500);
      toast.success(t("mediaQuarantine.toast.backfilled", { n: r?.queued ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }
</script>

<template>
  <section class="mq">
    <header class="mq__head">
      <div>
        <h1 class="mq__title">{{ t("mediaQuarantine.title") }}</h1>
        <p class="mq__sub">{{ t("mediaQuarantine.subtitle") }}</p>
      </div>
      <div class="mq__head-actions">
        <button type="button" class="mq__btn" :disabled="!!s.acting.value" @click="doSweep">
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("mediaQuarantine.action.sweep") }}
        </button>
        <button type="button" class="mq__btn" :disabled="!!s.acting.value" @click="doBackfill">
          <AppIcon name="scan-line" :size="14" />
          {{ t("mediaQuarantine.action.backfill") }}
        </button>
      </div>
    </header>

    <!-- Politika bandı. Tarayıcı yoksa bunu SESSİZ geçmek, hiç çalışmayan bir
         güvenlik özelliğini çalışıyor gibi göstermek olurdu. -->
    <div class="mq__policy" :class="s.scanningOff.value ? 'mq__policy--off' : 'mq__policy--on'">
      <AppIcon :name="s.scanningOff.value ? 'shield-off' : 'shield-check'" :size="18" />
      <div class="mq__policy-text">
        <strong>{{
          s.scanningOff.value ? t("mediaQuarantine.policy.off") : t("mediaQuarantine.policy.on")
        }}</strong>
        <span v-if="s.scanningOff.value">{{ t("mediaQuarantine.policy.offHint") }}</span>
        <span v-else>
          {{ t("mediaQuarantine.policy.scanner", { name: s.policy.value.scanner }) }}
          ·
          {{
            s.policy.value.hold_until_clean
              ? t("mediaQuarantine.policy.holdOn")
              : t("mediaQuarantine.policy.holdOff")
          }}
          ·
          {{
            s.policy.value.fail_closed
              ? t("mediaQuarantine.policy.failClosed")
              : t("mediaQuarantine.policy.failOpen")
          }}
        </span>
      </div>
    </div>

    <div class="mq__stats">
      <div class="mq__stat mq__stat--danger">
        <strong>{{ s.counts.value.infected ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.infected") }}</span>
      </div>
      <div class="mq__stat mq__stat--warn">
        <strong>{{ s.counts.value.failed ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.failed") }}</span>
      </div>
      <div class="mq__stat">
        <strong>{{ s.counts.value.pending ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.pending") }}</span>
      </div>
      <div class="mq__stat">
        <strong>{{ s.counts.value.clean ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.clean") }}</span>
      </div>
      <div class="mq__stat mq__stat--muted">
        <strong>{{ s.counts.value.unscanned ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.unscanned") }}</span>
      </div>
    </div>

    <nav class="mq__tabs" role="tablist">
      <button
        v-for="k in ['quarantine', 'hold']"
        :key="k"
        type="button"
        role="tab"
        class="mq__tab"
        :class="{ 'mq__tab--active': s.tab.value === k }"
        :aria-selected="s.tab.value === k"
        @click="s.setTab(k)"
      >
        {{ t(`mediaQuarantine.tab.${k}`) }}
      </button>
    </nav>

    <p class="mq__hint">{{ t(`mediaQuarantine.hint.${s.tab.value}`) }}</p>

    <div v-if="s.loading.value" class="mq__empty">{{ t("common.loading") }}</div>
    <div v-else-if="s.error.value" class="mq__empty mq__empty--err">{{ s.error.value }}</div>
    <div v-else-if="!s.items.value.length" class="mq__empty">
      {{ t(`mediaQuarantine.empty.${s.tab.value}`) }}
    </div>

    <table v-else class="mq__table">
      <thead>
        <tr>
          <th>{{ t("mediaQuarantine.col.file") }}</th>
          <th>{{ t("mediaQuarantine.col.size") }}</th>
          <th>{{ t("mediaQuarantine.col.status") }}</th>
          <th>{{ t("mediaQuarantine.col.when") }}</th>
          <th class="mq__col-actions">{{ t("mediaQuarantine.col.actions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in s.items.value" :key="row.name">
          <td>
            <span class="mq__file">{{ row.file_name }}</span>
            <code class="mq__url">{{ row.file_url }}</code>
          </td>
          <td>{{ formatSize(row.file_size) }}</td>
          <td>
            <span v-if="s.tab.value === 'hold'" class="mq__badge">
              {{ t("media.scanStatus.pending") }}
            </span>
            <span
              v-else
              class="mq__badge"
              :class="row.scan_status === 'infected' ? 'mq__badge--danger' : 'mq__badge--warn'"
            >
              {{ t(`media.scanStatus.${row.scan_status}`) }}
            </span>
            <!-- Dosya diskte gerçekten kapalı mı: damga ile fiziksel durumun
                 ayrışması sessiz bir kusur olurdu, açıkça gösteriliyor. -->
            <span
              v-if="s.tab.value === 'hold' ? !row.in_hold : !row.in_quarantine"
              class="mq__badge mq__badge--warn"
              :title="t('mediaQuarantine.notIsolatedHint')"
            >
              {{ t("mediaQuarantine.notIsolated") }}
            </span>
          </td>
          <td>{{ formatDateTime(row.started_at || row.creation, locale) }}</td>
          <td class="mq__col-actions">
            <template v-if="s.tab.value === 'quarantine'">
              <button
                v-if="row.scan_status === 'failed'"
                type="button"
                class="mq__link"
                :disabled="s.acting.value === row.file_url"
                @click="doRetry(row)"
              >
                {{ t("mediaQuarantine.action.retry") }}
              </button>
              <template v-if="confirming === row.name">
                <button type="button" class="mq__link mq__link--danger" @click="doRelease(row)">
                  {{ t("mediaQuarantine.action.releaseConfirm") }}
                </button>
                <button type="button" class="mq__link" @click="confirming = null">
                  {{ t("common.cancel") }}
                </button>
              </template>
              <button
                v-else
                type="button"
                class="mq__link"
                :disabled="s.acting.value === row.file_url"
                @click="confirming = row.name"
              >
                {{ t("mediaQuarantine.action.release") }}
              </button>
            </template>
            <span v-else class="mq__muted">{{ t("mediaQuarantine.action.waiting") }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <ListPagination
      v-if="s.pageCount.value > 1"
      :page="s.page.value"
      :page-count="s.pageCount.value"
      @update:page="s.goPage"
    />
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .mq {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mq__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .mq__title {
    font-size: 1.25rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }

  .mq__sub {
    font-size: 0.8125rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .mq__head-actions {
    display: flex;
    gap: 0.5rem;
  }

  .mq__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    background: $l-bg;
    color: $l-text-700;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: background $t-base;

    &:hover:not(:disabled) {
      background: $l-bg-soft;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .mq__policy {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    border: 1px solid transparent;

    &--on {
      background: rgb(16 185 129 / 10%);
      border-color: rgb(16 185 129 / 30%);
      color: $c-success;
    }
    &--off {
      background: rgb(245 158 11 / 12%);
      border-color: rgb(245 158 11 / 32%);
      color: $c-warning;
    }
  }

  .mq__policy-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-size: 0.8125rem;

    span {
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .mq__stats {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .mq__stat {
    flex: 1 1 7rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid $l-border;
    border-radius: 0.625rem;
    background: $l-bg;
    display: flex;
    flex-direction: column;

    strong {
      font-size: 1.25rem;
      font-weight: 700;
    }
    span {
      font-size: 0.75rem;
      color: $l-text-500;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      span {
        color: $d-text-muted;
      }
    }

    &--danger strong {
      color: $c-error;
    }
    &--warn strong {
      color: $c-warning;
    }
    &--muted strong {
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .mq__tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .mq__tab {
    padding: 0.5rem 0.875rem;
    border: 0;
    background: none;
    color: $l-text-500;
    font-size: 0.8125rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;

    &--active {
      color: $brand;
      border-bottom-color: $brand;
      font-weight: 600;
    }
    @include dark {
      color: $d-text-muted;
      &.mq__tab--active {
        color: $brand-light;
      }
    }
  }

  .mq__hint {
    font-size: 0.8125rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .mq__empty {
    padding: 2rem;
    text-align: center;
    color: $l-text-400;
    font-size: 0.875rem;

    &--err {
      color: $c-error;
    }
    @include dark {
      color: $d-text-faint;
    }
  }

  .mq__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;

    th,
    td {
      padding: 0.5rem 0.625rem;
      text-align: start;
      border-bottom: 1px solid $l-border;
      vertical-align: top;
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

  .mq__file {
    display: block;
    font-weight: 600;
  }

  .mq__url {
    display: block;
    font-size: 0.6875rem;
    color: $l-text-400;
    word-break: break-all;
    @include dark {
      color: $d-text-faint;
    }
  }

  .mq__badge {
    display: inline-block;
    padding: 0.125rem 0.4rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: $l-bg-muted;
    color: $l-text-600;
    margin-inline-end: 0.25rem;

    &--danger {
      background: rgb(239 68 68 / 12%);
      color: $c-error;
    }
    &--warn {
      background: rgb(245 158 11 / 14%);
      color: $c-warning;
    }
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .mq__col-actions {
    text-align: end;
    white-space: nowrap;
  }

  .mq__link {
    background: none;
    border: 0;
    color: $brand;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;

    &--danger {
      color: $c-error;
      font-weight: 600;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mq__muted {
    color: $l-text-400;
    font-size: 0.75rem;
    @include dark {
      color: $d-text-faint;
    }
  }
</style>

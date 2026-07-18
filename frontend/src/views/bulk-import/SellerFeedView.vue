<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import { useFeed } from "@/composables/useFeed";
  import { useEntitlement } from "@/composables/useEntitlement";
  import { isIncompleteImport } from "@/utils/importStatus";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();
  const { isLg } = useBreakpoint();

  // Sayfa-içi onboarding: feed URL/zamanlama formu → sağlık/durum → çalıştırma geçmişi.
  usePageTour("seller-feed", () => [
    {
      target: '[data-tour="sfv-form"]',
      title: t("tourSteps.page.sfvForm_t"),
      desc: t("tourSteps.page.sfvForm_d"),
    },
    {
      target: '[data-tour="sfv-status"]',
      title: t("tourSteps.page.sfvStatus_t"),
      desc: t("tourSteps.page.sfvStatus_d"),
    },
    {
      target: '[data-tour="sfv-list"]',
      title: t("tourSteps.page.sfvList_t"),
      desc: t("tourSteps.page.sfvList_d"),
    },
  ]);

  const {
    loading,
    testing,
    saving,
    running,
    dryRunning,
    loadingRuns,
    testFeedUrl,
    listFeeds,
    saveFeed,
    previewFeed,
    feedDryRun,
    listFeedRuns,
    runNow,
  } = useFeed();

  const FEED_FEATURE = "feature.import.xml_feed";
  const { snapshot, load: loadEntitlement, hasFeature } = useEntitlement();
  // Snapshot yüklenene kadar gate'i tetikleme — yüklendikten sonra reactive.
  const entitlementReady = computed(() => !!snapshot.value);
  const canUseFeed = computed(() => hasFeature(FEED_FEATURE));

  // Saticinin tek feed konfigurasyonu. Backend birden fazla feed destekliyor
  // ama bu ekran satici basina ilk (ve pratikte tek) feed'i yonetir.
  // update_mode "upsert" sabit — sifir-bilgi UX'te satici secmiyor (B2 auto).
  const emptyForm = () => ({
    name: null,
    feed_url: "",
    enabled: 0,
    fetch_hour: 3,
    notify_on_error: 1,
    last_fetch: null,
    last_status: "",
    last_item_count: null,
    consecutive_failures: 0,
  });
  const form = ref(emptyForm());

  const testResult = ref(null);
  const preview = ref(null);
  const dryRun = ref(null);
  const runs = ref([]);

  const HOURS = Array.from({ length: 24 }, (_, h) => h);
  const hasFeed = computed(() => !!form.value.name);

  // Sağlık rozeti: 3 ardışık hataya yaklaşırken (>=2) uyarı, son durum hatalıysa kırmızı.
  // Eşik backend feed_scheduler'ın disable mantığıyla aynı pencerede (3) tutuldu.
  const FAILURE_WARN_THRESHOLD = 2;
  const health = computed(() => {
    const fails = form.value.consecutive_failures || 0;
    if (form.value.last_status === "error" && fails >= FAILURE_WARN_THRESHOLD) return "error";
    if (fails >= FAILURE_WARN_THRESHOLD) return "warn";
    return "ok";
  });
  const healthLabel = computed(() =>
    t(
      health.value === "error"
        ? "feed.healthError"
        : health.value === "warn"
          ? "feed.healthWarn"
          : "feed.healthOk"
    )
  );

  function statusBadgeCls(status) {
    switch (status) {
      case "success":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "partial":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "running":
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  async function load() {
    const feeds = await listFeeds();
    form.value = feeds.length ? { ...emptyForm(), ...feeds[0] } : emptyForm();
    if (form.value.name) await loadRuns();
  }

  async function loadRuns() {
    const res = await listFeedRuns(form.value.name);
    runs.value = res?.runs || [];
    // Sağlık alanlarını taze run özetiyle senkronla (list_feeds eski kalabilir).
    if (res) {
      form.value.consecutive_failures = res.consecutive_failures ?? form.value.consecutive_failures;
      form.value.last_status = res.last_status ?? form.value.last_status;
      form.value.last_fetch = res.last_fetch ?? form.value.last_fetch;
    }
  }

  async function onTest() {
    testResult.value = null;
    preview.value = null;
    const res = await testFeedUrl(form.value.feed_url);
    if (res) testResult.value = res;
  }

  async function onDryRun() {
    // Dry-run kaydedilmiş feed gerektirir — önce kaydet (preview ile aynı akış).
    if (!hasFeed.value) await onSave();
    if (!form.value.name) return;
    const res = await feedDryRun(form.value.name);
    if (res) dryRun.value = res;
  }

  function jobDate(creation) {
    return creation ? new Date(creation).toLocaleString() : "—";
  }

  async function onSave() {
    if (!form.value.feed_url) return;
    const res = await saveFeed({
      name: form.value.name,
      feed_url: form.value.feed_url,
      enabled: form.value.enabled ? 1 : 0,
      fetch_hour: Number(form.value.fetch_hour) || 3,
      notify_on_error: form.value.notify_on_error ? 1 : 0,
    });
    if (res?.name) {
      form.value.name = res.name;
      await load();
    }
  }

  async function onPreview() {
    // Onizleme kaydedilmis feed gerektirir — once kaydet.
    if (!hasFeed.value) await onSave();
    if (!form.value.name) return;
    const res = await previewFeed(form.value.name);
    if (res) preview.value = res;
  }

  async function onRunNow() {
    if (!hasFeed.value) await onSave();
    if (form.value.name) await runNow(form.value.name);
  }

  onMounted(async () => {
    await loadEntitlement();
    // Plan feature'a sahip değilse feed listesini çekme — backend zaten
    // engeller, gereksiz istek atmayalım; gate gösterilir.
    if (canUseFeed.value) await load();
  });
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("feed.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("feed.subtitle") }}</p>
      </div>
      <button class="hdr-btn-outlined" @click="load">
        <AppIcon name="refresh-cw" :size="14" /><span>{{ t("feed.status") }}</span>
      </button>
    </div>

    <div v-if="loading || !entitlementReady" class="card p-5">
      <Skeleton variant="title" />
      <Skeleton variant="text" :count="5" />
    </div>

    <!-- Plan yetkinliği yoksa nazik upgrade gate — feed formu gösterilmez. -->
    <div v-else-if="!canUseFeed" class="card upgrade-gate">
      <AppIcon name="lock" :size="28" class="upgrade-gate-icon" />
      <h2 class="upgrade-gate-title">{{ t("feed.gateTitle") }}</h2>
      <p class="upgrade-gate-text">{{ t("feed.gateText") }}</p>
    </div>

    <template v-else>
      <form class="card mb-5" data-tour="sfv-form" @submit.prevent="onSave">
        <label class="lbl">
          <span>{{ t("feed.url") }}</span>
          <div class="flex gap-2">
            <input
              v-model="form.feed_url"
              type="url"
              class="font-mono text-xs flex-1"
              :placeholder="t('feed.urlPlaceholder')"
            />
            <button
              type="button"
              class="hdr-btn-outlined flex-none"
              :disabled="testing || !form.feed_url"
              @click="onTest"
            >
              <AppIcon name="plug" :size="14" />
              <span>{{ testing ? t("feed.testing") : t("feed.test") }}</span>
            </button>
            <button
              type="button"
              class="hdr-btn-outlined flex-none"
              :disabled="!form.feed_url"
              @click="onPreview"
            >
              <AppIcon name="eye" :size="14" /><span>{{ t("feed.preview") }}</span>
            </button>
            <button
              type="button"
              class="hdr-btn-outlined flex-none"
              :disabled="dryRunning || !form.feed_url"
              @click="onDryRun"
            >
              <AppIcon name="list-checks" :size="14" />
              <span>{{ dryRunning ? t("feed.dryRunning") : t("feed.dryRun") }}</span>
            </button>
          </div>
        </label>

        <div v-if="testResult" class="result-row">
          <span v-if="testResult.ok" class="badge-ok">
            {{ t("feed.testSuccess", { count: testResult.item_count }) }}
          </span>
          <span v-else class="badge-err">
            {{ testResult.error || t("feed.testFailed") }}
          </span>
        </div>

        <label class="toggle-row">
          <input v-model="form.enabled" type="checkbox" :true-value="1" :false-value="0" />
          <span>{{ t("feed.enabled") }}</span>
        </label>

        <label class="lbl">
          <span>{{ t("feed.fetchHour") }}</span>
          <select v-model.number="form.fetch_hour">
            <option v-for="h in HOURS" :key="h" :value="h">
              {{ String(h).padStart(2, "0") }}:00
            </option>
          </select>
          <small class="hint">{{ t("feed.fetchHourHint") }}</small>
        </label>

        <label class="toggle-row">
          <input v-model="form.notify_on_error" type="checkbox" :true-value="1" :false-value="0" />
          <span>{{ t("feed.notifyOnError") }}</span>
        </label>

        <div class="form-foot">
          <button
            type="button"
            class="hdr-btn-outlined"
            :disabled="running || !form.feed_url"
            @click="onRunNow"
          >
            <AppIcon name="play" :size="14" />
            <span>{{ running ? t("feed.running") : t("feed.runNow") }}</span>
          </button>
          <button type="submit" class="hdr-btn-primary" :disabled="saving || !form.feed_url">
            {{ saving ? t("feed.saving") : t("feed.save") }}
          </button>
        </div>
      </form>

      <div v-if="hasFeed" class="card mb-5" data-tour="sfv-status">
        <div class="status-head">
          <h2 class="card-title">{{ t("feed.status") }}</h2>
          <span class="health-badge" :class="`health-badge--${health}`">
            <AppIcon
              :name="
                health === 'error'
                  ? 'alert-octagon'
                  : health === 'warn'
                    ? 'alert-triangle'
                    : 'check-circle'
              "
              :size="13"
            />
            <span>{{ healthLabel }}</span>
          </span>
        </div>
        <div class="status-grid">
          <div class="status-cell">
            <span class="status-key">{{ t("feed.lastFetch") }}</span>
            <span class="status-val">{{ form.last_fetch || t("feed.never") }}</span>
          </div>
          <div class="status-cell">
            <span class="status-key">{{ t("feed.status") }}</span>
            <span
              v-if="form.last_status"
              class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium"
              :class="statusBadgeCls(form.last_status)"
            >
              {{ form.last_status }}
            </span>
            <span v-else class="status-val">{{ t("feed.never") }}</span>
          </div>
          <div class="status-cell">
            <span class="status-key">{{ t("feed.lastItemCount") }}</span>
            <span class="status-val">{{ form.last_item_count ?? "—" }}</span>
          </div>
          <div class="status-cell">
            <span class="status-key">{{ t("feed.consecutiveFailures") }}</span>
            <span
              class="status-val"
              :class="form.consecutive_failures > 0 ? 'text-red-600 dark:text-red-400' : ''"
            >
              {{ form.consecutive_failures || 0 }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="preview" class="card mb-5">
        <h2 class="card-title">{{ t("feed.previewHeading") }}</h2>
        <p class="text-xs text-gray-500 mb-3">
          {{ t("feed.itemCount") }}: <strong>{{ preview.item_count }}</strong>
        </p>
        <p class="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
          {{ t("feed.detectedHeaders") }}
        </p>
        <div class="flex flex-wrap gap-1 mb-3">
          <span v-for="h in preview.detected_headers" :key="h" class="hdr-chip">{{ h }}</span>
        </div>
        <p class="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
          {{ t("feed.sampleRows") }}
        </p>
        <!-- Mobil: örnek satır kartları (tablo yalnızca desktop) -->
        <div v-if="!isLg" class="pv-cards">
          <article v-for="(row, idx) in preview.sample_rows" :key="idx" class="pv-card">
            <div v-for="h in preview.detected_headers" :key="h" class="pv-row">
              <span class="pv-key">{{ h }}</span>
              <span class="pv-val">{{ row[h] ?? "" }}</span>
            </div>
          </article>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th v-for="h in preview.detected_headers" :key="h" class="tbl-th">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in preview.sample_rows"
                :key="idx"
                class="border-b border-gray-50 dark:border-white/5"
              >
                <td v-for="h in preview.detected_headers" :key="h" class="tbl-td">
                  <span class="text-xs text-gray-600 dark:text-gray-300">{{ row[h] ?? "" }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="dryRun" class="card mb-5">
        <h2 class="card-title">{{ t("feed.dryRunHeading") }}</h2>
        <p class="text-xs text-gray-500 mb-3">{{ t("feed.dryRunHint") }}</p>
        <div class="diff-grid">
          <div class="diff-cell diff-cell--insert">
            <span class="diff-num">{{ dryRun.will_insert }}</span>
            <span class="diff-key">{{ t("feed.willInsert") }}</span>
          </div>
          <div class="diff-cell diff-cell--update">
            <span class="diff-num">{{ dryRun.will_update }}</span>
            <span class="diff-key">{{ t("feed.willUpdate") }}</span>
          </div>
          <div class="diff-cell diff-cell--skip">
            <span class="diff-num">{{ dryRun.will_skip }}</span>
            <span class="diff-key">{{ t("feed.willSkip") }}</span>
          </div>
          <div class="diff-cell diff-cell--error">
            <span class="diff-num">{{ dryRun.will_error }}</span>
            <span class="diff-key">{{ t("feed.willError") }}</span>
          </div>
        </div>
      </div>

      <div v-if="hasFeed" class="card mb-5" data-tour="sfv-list">
        <h2 class="card-title">{{ t("feed.runHistory") }}</h2>
        <div v-if="loadingRuns" class="py-2">
          <Skeleton variant="row" :count="4" />
        </div>
        <p v-else-if="!runs.length" class="text-xs text-gray-500">
          {{ t("feed.runHistoryEmpty") }}
        </p>
        <!-- Mobil: çalıştırma kartları (tablo yalnızca desktop) -->
        <div v-else-if="!isLg" class="run-cards">
          <article
            v-for="run in runs"
            :key="run.job"
            class="run-card"
            :class="{ 'is-incomplete': isIncompleteImport(run.status, run.error_count) }"
          >
            <div class="rc-top">
              <span
                class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium"
                :class="statusBadgeCls(run.status)"
              >
                {{ run.status }}
              </span>
              <span class="rc-date">{{ jobDate(run.creation) }}</span>
            </div>
            <div class="rc-grid">
              <div class="rc-cell">
                <span class="rc-key">{{ t("feed.colInserted") }}</span>
                <span class="rc-val">{{ run.inserted ?? 0 }}</span>
              </div>
              <div class="rc-cell">
                <span class="rc-key">{{ t("feed.colUpdated") }}</span>
                <span class="rc-val">{{ run.updated ?? 0 }}</span>
              </div>
              <div class="rc-cell">
                <span class="rc-key">{{ t("feed.colSkipped") }}</span>
                <span class="rc-val">{{ run.skipped ?? 0 }}</span>
              </div>
              <div class="rc-cell">
                <span class="rc-key">{{ t("feed.colErrors") }}</span>
                <span class="rc-val" :class="{ 'rc-val-error': (run.error_count || 0) > 0 }">
                  {{ run.error_count ?? 0 }}
                </span>
              </div>
            </div>
            <div class="rc-actions">
              <router-link
                :to="{ name: 'bulk-import-detail', params: { name: run.job } }"
                class="rc-btn"
              >
                <AppIcon name="external-link" :size="13" />
                {{ t("feed.detail") }}
              </router-link>
            </div>
          </article>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th">{{ t("feed.colDate") }}</th>
                <th class="tbl-th">{{ t("feed.colResult") }}</th>
                <th class="tbl-th">{{ t("feed.colInserted") }}</th>
                <th class="tbl-th">{{ t("feed.colUpdated") }}</th>
                <th class="tbl-th">{{ t("feed.colSkipped") }}</th>
                <th class="tbl-th">{{ t("feed.colErrors") }}</th>
                <th class="tbl-th"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="run in runs"
                :key="run.job"
                class="border-b border-gray-50 dark:border-white/5"
                :class="
                  isIncompleteImport(run.status, run.error_count)
                    ? 'bg-amber-50/60 dark:bg-amber-500/5'
                    : ''
                "
              >
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ jobDate(run.creation) }}
                </td>
                <td class="tbl-td">
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium"
                    :class="statusBadgeCls(run.status)"
                  >
                    {{ run.status }}
                  </span>
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ run.inserted ?? 0 }}
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ run.updated ?? 0 }}
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ run.skipped ?? 0 }}
                </td>
                <td
                  class="tbl-td text-xs"
                  :class="
                    (run.error_count || 0) > 0
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-gray-600 dark:text-gray-300'
                  "
                >
                  {{ run.error_count ?? 0 }}
                </td>
                <td class="tbl-td">
                  <router-link
                    :to="{ name: 'bulk-import-detail', params: { name: run.job } }"
                    class="detail-link"
                  >
                    {{ t("feed.detail") }}
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="image-note">
        <AppIcon name="image" :size="16" class="flex-none text-sky-600 dark:text-sky-400" />
        <p>{{ t("feed.imageNote") }}</p>
      </div>

      <div class="security-note">
        <AppIcon name="shield" :size="16" class="flex-none text-amber-600 dark:text-amber-400" />
        <p>{{ t("feed.securityNote") }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .card-title {
    font-size: 13px;
    font-weight: 700;
    color: $l-text-900;
    margin-bottom: 12px;
    @include dark {
      color: $d-text;
    }
  }
  .lbl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: $l-text-600;
    margin-top: 8px;
    @include dark {
      color: $d-text-muted;
    }

    > span {
      font-weight: 600;
    }
    input,
    select {
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      background: $l-bg;
      color: $l-text-900;
      transition:
        border $t-fast,
        box-shadow $t-fast;

      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }
  .hint {
    font-size: 10px;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .toggle-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-top: 12px;
    cursor: pointer;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .form-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .result-row {
    margin-top: 8px;
    font-size: 11px;
  }
  .badge-ok {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba($c-success, 0.15);
    color: $c-success;
    font-weight: 600;
  }
  .badge-err {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba($c-error, 0.15);
    color: $c-error;
    font-weight: 600;
  }
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .status-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .status-key {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .status-val {
    font-size: 13px;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text;
    }
  }
  .hdr-chip {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-family: "JetBrains Mono", monospace;
    background: $l-bg-muted;
    color: $l-text-700;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .upgrade-gate {
    text-align: center;
    padding: 40px 24px;
  }
  .upgrade-gate-icon {
    color: $c-warning;
    margin-bottom: 12px;
  }
  .upgrade-gate-title {
    font-size: 15px;
    font-weight: 700;
    color: $l-text-900;
    margin-bottom: 6px;
    @include dark {
      color: $d-text;
    }
  }
  .upgrade-gate-text {
    font-size: 12px;
    line-height: 1.6;
    color: $l-text-600;
    max-width: 420px;
    margin: 0 auto;
    @include dark {
      color: $d-text-muted;
    }
  }
  .security-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba($c-warning, 0.08);
    border: 1px solid rgba($c-warning, 0.25);
    font-size: 11px;
    line-height: 1.5;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .image-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    margin-bottom: 12px;
    border-radius: 8px;
    background: rgba($c-info, 0.08);
    border: 1px solid rgba($c-info, 0.25);
    font-size: 11px;
    line-height: 1.5;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .status-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .card-title {
      margin-bottom: 0;
    }
  }
  .health-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;

    &--ok {
      background: rgba($c-success, 0.15);
      color: $c-success;
    }
    &--warn {
      background: rgba($c-warning, 0.15);
      color: $c-warning;
    }
    &--error {
      background: rgba($c-error, 0.15);
      color: $c-error;
    }
  }
  .diff-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }
  .diff-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }

    &--insert {
      background: rgba($c-success, 0.08);
      border-color: rgba($c-success, 0.25);
    }
    &--update {
      background: rgba($c-info, 0.08);
      border-color: rgba($c-info, 0.25);
    }
    &--skip {
      background: rgba($c-warning, 0.08);
      border-color: rgba($c-warning, 0.25);
    }
    &--error {
      background: rgba($c-error, 0.08);
      border-color: rgba($c-error, 0.25);
    }
  }
  .diff-num {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.1;
    color: $l-text-900;
    @include dark {
      color: $d-text;
    }
  }
  .diff-key {
    font-size: 11px;
    font-weight: 600;
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }
  .detail-link {
    font-size: 11px;
    font-weight: 600;
    color: $brand;
    text-decoration: none;
    transition: opacity $t-fast;

    &:hover {
      opacity: 0.75;
    }
  }

  // ── Mobil önizleme satır kartları (<768px'te tablo yerine) ─
  .pv-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pv-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid $l-border;
    border-radius: 10px;
    background: $l-bg;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }
  .pv-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pv-key {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    overflow-wrap: anywhere;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .pv-val {
    font-size: 12px;
    line-height: 1.5;
    min-height: 1em;
    overflow-wrap: anywhere;
    color: $l-text-700;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Mobil çalıştırma kartları (<768px'te tablo yerine) ────
  .run-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .run-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 13px;
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }

    // Yarım kalmış import — tablo satırındaki amber vurgunun kart karşılığı
    &.is-incomplete {
      background: rgba($c-warning, 0.06);
      border-color: rgba($c-warning, 0.3);
    }
  }
  .rc-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .rc-date {
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .rc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .rc-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rc-key {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .rc-val {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }

    &.rc-val-error {
      color: $c-error;
    }
  }
  .rc-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-top-color: $d-border-inner;
    }
  }
  .rc-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    font-size: 12px;
    font-weight: 700;
    color: $brand;
    text-decoration: none;
    border: 1px solid rgba($brand, 0.35);
    border-radius: 9px;
    transition: background $t-fast;

    &:active {
      background: rgba($brand, 0.08);
    }
  }

  // ── Mobil düzen ───────────────────────────────────────────
  @media (max-width: 767px) {
    // Feed URL formu: input tam satır; Sına + Önizleme yan yana,
    // kuru çalıştırma tam satır — simetrik grid, dokunma-dostu yükseklik.
    .lbl > .flex {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      input {
        grid-column: 1 / -1;
        min-width: 0;
        min-height: 42px;
      }
      .hdr-btn-outlined {
        justify-content: center;
        min-height: 42px;

        &:last-child {
          grid-column: 1 / -1;
        }
      }
    }

    // Saat select'i tam genişlik, dokunma-dostu
    .lbl select {
      width: 100%;
      min-height: 42px;
    }

    // Form altı: butonlar tam genişlik, birincil (Kaydet) altta 44px
    .form-foot {
      flex-direction: column;

      .hdr-btn-outlined,
      .hdr-btn-primary {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
    }

    // 320px'te garanti 2 sütun — minmax auto-fit tek sütuna düşürmesin
    .status-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .status-val {
      overflow-wrap: anywhere;
    }
    .diff-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>

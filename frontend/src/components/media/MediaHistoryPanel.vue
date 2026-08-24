<template>
  <section class="history" :aria-labelledby="titleId" data-test="media-history">
    <h3 :id="titleId" class="history__title">
      <AppIcon name="history" :size="14" />
      {{ t("media.history.title") }}
    </h3>

    <p v-if="history.loading.value" class="history__notice" role="status">
      <AppIcon name="loader" :size="14" />
      {{ t("media.history.loading") }}
    </p>
    <p v-else-if="history.denied.value" class="history__notice">
      <AppIcon name="lock" :size="14" />
      {{ t("media.history.denied") }}
    </p>
    <p v-else-if="history.error.value" class="history__notice" role="alert">
      <AppIcon name="circle-alert" :size="14" />
      {{ t("media.history.failed") }}
    </p>
    <p v-else-if="!history.timeline.value.length" class="history__notice">
      <AppIcon name="clock" :size="14" />
      {{ t("media.history.empty") }}
    </p>

    <ol v-else class="history__list">
      <li v-for="event in history.timeline.value" :key="event.id" class="history__item">
        <span class="history__icon" aria-hidden="true">
          <AppIcon :name="iconOf(event.kind)" :size="14" />
        </span>
        <div class="history__body">
          <div class="history__line">
            <strong>{{ titleOf(event) }}</strong>
            <span class="history__status" :data-tone="toneOf(event)">
              {{ statusOf(event) }}
            </span>
          </div>
          <p v-if="metaOf(event)" class="history__meta">{{ metaOf(event) }}</p>
          <time :datetime="event.at">{{ formatDateTime(event.at, locale) }}</time>
        </div>
      </li>
    </ol>

    <p v-if="isTruncated" class="history__truncated" data-test="media-history-truncated">
      {{ t("media.history.truncated") }}
    </p>
  </section>
</template>

<script setup>
  import { computed, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useMediaHistory } from "@/composables/useMediaHistory";
  import { formatDateTime } from "@/utils/dateFormat";

  const props = defineProps({ fileUrl: { type: String, required: true } });
  const { t, locale } = useI18n();
  const titleId = `media-history-${useId()}`;
  const history = useMediaHistory();

  watch(() => props.fileUrl, history.load, { immediate: true });

  const isTruncated = computed(() =>
    Object.values(history.data.value.truncated || {}).some(Boolean)
  );

  const iconOf = (kind) => ({ version: "git-branch", job: "cpu", audit: "shield-check" })[kind];

  function titleOf(event) {
    if (event.kind === "version") return t("media.history.kind.version");
    if (event.kind === "job")
      return `${t("media.history.kind.job")} · ${event.row.job_type || "—"}`;
    return `${t("media.history.kind.audit")} · ${event.row.action || "—"}`;
  }

  function statusOf(event) {
    if (event.kind === "version")
      return event.row.is_active
        ? t("media.history.version.active")
        : t("media.history.version.stored");
    if (event.kind === "job")
      return t(`media.history.job.${event.row.status || "unknown"}`, {}, event.row.status || "—");
    return event.row.decision === "DENY"
      ? t("media.history.audit.denied")
      : t("media.history.audit.allowed");
  }

  function toneOf(event) {
    const status = event.row.status;
    if (event.kind === "audit" && event.row.decision === "DENY") return "danger";
    if (event.kind === "job" && ["failed", "dead"].includes(status)) return "danger";
    if (event.kind === "job" && ["queued", "running"].includes(status)) return "progress";
    return "ok";
  }

  function metaOf(event) {
    const row = event.row;
    if (event.kind === "version") {
      const dims = row.width && row.height ? `${row.width} × ${row.height}` : "";
      const hash = row.version_hash ? row.version_hash.slice(0, 12) : "";
      return [dims, row.engine_version, hash].filter(Boolean).join(" · ");
    }
    if (event.kind === "job") {
      const attempt = row.attempt ? t("media.history.attempt", { count: row.attempt }) : "";
      const duration = row.duration_ms ? `${row.duration_ms} ms` : "";
      return [attempt, duration, row.error_code].filter(Boolean).join(" · ");
    }
    return row.actor_name || "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .history {
    display: grid;
    gap: media.$s-3;
    padding-top: media.$s-4;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .history__title,
  .history__notice,
  .history__line {
    display: flex;
    align-items: center;
  }

  .history__title {
    gap: media.$s-2;
    margin: 0;
    @include media.text("sm");
    @include media.heading;
    font-weight: 700;
  }

  .history__notice {
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-3;
    border-radius: media.$r-md;
    background: $l-bg-muted;
    @include media.text("sm");

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .history__list {
    display: grid;
    gap: media.$s-3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .history__item {
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr);
    gap: media.$s-2;
  }

  .history__icon {
    width: 1.75rem;
    height: 1.75rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: $brand;
    background: $brand-glow;
  }

  .history__body {
    min-width: 0;
    padding-bottom: media.$s-3;
    border-bottom: 1px solid $l-border-alt;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .history__line {
    justify-content: space-between;
    gap: media.$s-2;
    @include media.text("sm");

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .history__status {
    flex: 0 0 auto;
    padding: 0 media.$s-2;
    border-radius: 999px;
    color: $c-success;
    background: rgb(34 197 94 / 12%);
    @include media.text("xs");

    &[data-tone="danger"] {
      color: $c-error;
      background: rgb(239 68 68 / 12%);
    }

    &[data-tone="progress"] {
      color: $c-info;
      background: rgb(59 130 246 / 12%);
    }
  }

  .history__meta,
  .history__truncated,
  time {
    margin: media.$s-1 0 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  time {
    display: block;
  }
</style>

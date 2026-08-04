<template>
  <section v-if="uploads.length" class="upload-queue" :aria-label="t('media.upload.queueTitle')">
    <header class="upload-queue__head">
      <h2 class="upload-queue__title">
        {{ t("media.upload.queueTitle") }}
        <span class="upload-queue__count">{{ summary }}</span>
      </h2>
      <button type="button" class="upload-queue__clear" @click="emit('clear')">
        {{ t("media.upload.clearFinished") }}
      </button>
    </header>

    <ul class="upload-queue__list">
      <li v-for="up in uploads" :key="up.id" class="upload-row" :class="`upload-row--${up.status}`">
        <AppIcon :name="iconForKind(up.kind)" :size="18" class="upload-row__icon" />

        <div class="upload-row__body">
          <p class="upload-row__name" :title="up.name">{{ up.name }}</p>

          <p v-if="up.status === 'error'" class="upload-row__error">
            {{ t("media.upload.errorSizeLimit") }}
          </p>
          <p v-else-if="up.status === 'done'" class="upload-row__ok">
            {{ t("media.upload.done") }}
          </p>
          <div
            v-else
            class="upload-row__bar"
            role="progressbar"
            :aria-valuenow="up.progress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span class="upload-row__fill" :style="{ width: `${up.progress}%` }" />
          </div>
        </div>

        <span class="upload-row__size">{{ formatBytes(up.bytes) }}</span>

        <div class="upload-row__actions">
          <button
            v-if="up.status === 'error'"
            type="button"
            class="upload-row__btn"
            @click="emit('retry', up.id)"
          >
            <AppIcon name="refresh-cw" :size="14" />
            {{ t("media.upload.retry") }}
          </button>
          <button
            v-if="up.status === 'uploading'"
            type="button"
            class="upload-row__btn"
            @click="emit('cancel', up.id)"
          >
            <AppIcon name="x" :size="14" />
            {{ t("media.upload.cancel") }}
          </button>
          <AppIcon
            v-if="up.status === 'done'"
            name="circle-check"
            :size="18"
            class="upload-row__tick"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatBytes, iconForKind } from "@/utils/mediaFormat";

  const props = defineProps({
    uploads: { type: Array, required: true },
  });
  const emit = defineEmits(["retry", "cancel", "clear"]);

  const { t } = useI18n();

  const summary = computed(() => {
    const done = props.uploads.filter((u) => u.status === "done").length;
    const failed = props.uploads.filter((u) => u.status === "error").length;
    return t("media.upload.summary", { done, failed, total: props.uploads.length });
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .upload-queue {
    margin-bottom: media.$s-4;
    overflow: hidden;
    @include media.surface;
  }

  .upload-queue__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider;
  }

  .upload-queue__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text;
    @include media.heading;
  }

  .upload-queue__count {
    font-weight: 500;
    @include media.muted;
    @include media.numeric;
  }

  .upload-queue__clear {
    @include media.button("ghost");
    @include media.focus-ring;

    padding-inline: media.$s-1;
  }

  .upload-queue__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider;

    &:last-child {
      border-bottom: 0;
    }

    // Dar ekranda ad + boyut + "Yeniden dene"/"İptal" tek satıra sığmıyor:
    // butonlar alt satıra, sağa yaslı geçsin.
    @media (max-width: media.$m-bp-sm) {
      flex-wrap: wrap;

      .upload-row__actions {
        flex: 1 1 100%;
        justify-content: flex-end;
      }
    }
  }

  .upload-row__icon {
    flex-shrink: 0;
    @include media.muted;
  }

  .upload-row__body {
    flex: 1;
    min-width: 0;
  }

  .upload-row__name {
    margin: 0 0 media.$s-1;
    @include media.text("sm");
    @include media.heading;
    @include media.truncate;
  }

  .upload-row__bar {
    height: 0.375rem;
    border-radius: media.$r-pill;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .upload-row__fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .upload-row__error {
    margin: 0;
    @include media.text;
    color: $c-error;
  }

  .upload-row__ok {
    margin: 0;
    @include media.text;
    color: $c-success;
  }

  .upload-row__size {
    flex-shrink: 0;
    @include media.text;
    @include media.muted;
    @include media.numeric;
  }

  .upload-row__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-shrink: 0;
  }

  .upload-row__btn {
    @include media.button;
    @include media.focus-ring;

    padding: 0 media.$s-3;
  }

  .upload-row__tick {
    color: $c-success;
  }
</style>

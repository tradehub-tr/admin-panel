<template>
  <MediaModal
    v-model:open="isOpen"
    :title="item ? item.fileName : ''"
    :close-label="t('media.preview.close')"
    width="52rem"
    flush
    @close="emit('close')"
  >
    <template #head>
      <span v-if="total > 1" class="mpreview__counter">{{ index + 1 }} / {{ total }}</span>
    </template>

    <div
      v-if="item"
      class="mpreview"
      @keydown.left="emit('navigate', -1)"
      @keydown.right="emit('navigate', 1)"
    >
      <MediaThumb :item="item" ratio="wide" :icon-size="64" />

      <button
        v-if="total > 1"
        type="button"
        class="mpreview__nav mpreview__nav--prev"
        :aria-label="t('media.preview.prev')"
        @click="emit('navigate', -1)"
      >
        <AppIcon name="chevron-left" :size="22" />
      </button>
      <button
        v-if="total > 1"
        type="button"
        class="mpreview__nav mpreview__nav--next"
        :aria-label="t('media.preview.next')"
        @click="emit('navigate', 1)"
      >
        <AppIcon name="chevron-right" :size="22" />
      </button>
    </div>

    <dl v-if="item" class="mpreview__meta">
      <div v-for="fact in facts" :key="fact.label">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>

    <p v-if="item && item.alt" class="mpreview__alt">{{ item.alt }}</p>

    <template #footer>
      <span class="mpreview__hint">{{ t("media.preview.hint") }}</span>
      <button type="button" class="mpreview__btn" @click="emit('edit')">
        <AppIcon name="pencil" :size="15" />
        {{ t("media.actions.edit") }}
      </button>
      <button type="button" class="mpreview__btn" @click="emit('download')">
        <AppIcon name="download" :size="15" />
        {{ t("media.actions.download") }}
      </button>
    </template>
  </MediaModal>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaModal from "@/components/media/MediaModal.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { formatBytes, formatDate, formatDimensions } from "@/utils/mediaFormat";

  /** Salt-okunur büyük önizleme; düzenleme sağ detay panelinin işi. */
  const props = defineProps({
    item: { type: Object, default: null },
    /** Görünen listedeki konum — modal içinde ileri/geri gezinmek için. */
    index: { type: Number, default: 0 },
    total: { type: Number, default: 1 },
  });
  const emit = defineEmits(["close", "edit", "download", "navigate"]);

  const { t, locale } = useI18n();

  const isOpen = computed({
    get: () => Boolean(props.item),
    set: (v) => {
      if (!v) emit("close");
    },
  });

  const facts = computed(() =>
    props.item
      ? [
          { label: t("media.detail.size"), value: formatBytes(props.item.bytes) },
          { label: t("media.detail.dimensions"), value: formatDimensions(props.item) },
          {
            label: t("media.detail.uploadedAt"),
            value: formatDate(props.item.uploadedAt, locale.value),
          },
          {
            label: t("media.detail.usedIn"),
            value: (props.item.liveUsage || 0)
              ? t("media.usedInCount", { count: (props.item.liveUsage || 0) })
              : t("media.unused"),
          },
        ]
      : []
  );
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mpreview {
    position: relative;
  }

  .mpreview__counter {
    @include media.numeric;
    @include media.muted;

    @include media.text("xs");
  }

  .mpreview__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border: 0;
    border-radius: media.$r-pill;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    cursor: pointer;
    backdrop-filter: blur(4px);
    @include media.focus-ring;

    // İleri/geri okları telefonda en çok dokunulan yüzey — press şart,
    // hover ise dokunmatikte koyu takılmasın diye korumalı.
    transition: transform $d-press $ease-out;

    &:active {
      transform: translateY(-50%) scale(0.92);
    }

    @include media.hoverable {
      &:hover {
        background: rgb(0 0 0 / 65%);
      }
    }
  }

  .mpreview__nav--prev {
    inset-inline-start: 0.75rem;
  }

  .mpreview__nav--next {
    inset-inline-end: 0.75rem;
  }

  .mpreview__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: media.$s-3;
    margin: 0;
    padding: media.$s-4;

    dt {
      @include media.text("sm");
      @include media.muted;
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.text("sm");
      @include media.heading;
      @include media.numeric;
    }
  }

  .mpreview__alt {
    margin: 0;
    padding: 0 media.$s-4 media.$s-4;
    @include media.text("sm");
    @include media.muted;
  }

  .mpreview__hint {
    flex: 1;
    @include media.text("sm");
    @include media.muted(2);
  }

  .mpreview__btn {
    @include media.button;
    @include media.focus-ring;
  }
</style>

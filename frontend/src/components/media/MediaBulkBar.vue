<template>
  <div class="bulk" role="region" :aria-label="t('media.bulk.title')">
    <p class="bulk__count">{{ t("media.bulk.selected", { count }) }}</p>

    <div class="bulk__tagbox">
      <input
        v-model="tag"
        type="text"
        :placeholder="t('media.bulk.tagPlaceholder')"
        :aria-label="t('media.bulk.tagPlaceholder')"
        @keydown.enter.prevent="applyTag"
      />
      <button type="button" class="bulk__btn" :disabled="!tag.trim()" @click="applyTag">
        <AppIcon name="tag" :size="15" />
        {{ t("media.bulk.tag") }}
      </button>
    </div>

    <button type="button" class="bulk__btn" @click="emit('download')">
      <AppIcon name="download" :size="15" />
      {{ t("media.bulk.download") }}
    </button>
    <button type="button" class="bulk__btn" @click="emit('archive')">
      <AppIcon name="archive" :size="15" />
      {{ t("media.bulk.archive") }}
    </button>
    <button type="button" class="bulk__btn bulk__btn--danger" @click="emit('delete')">
      <AppIcon name="trash-2" :size="15" />
      {{ t("media.bulk.delete") }}
    </button>
    <button type="button" class="bulk__btn" @click="emit('clear')">
      {{ t("media.bulk.clear") }}
    </button>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    count: { type: Number, required: true },
    /** Arşiv görünümünde miyiz — düğmeler tersine döner. */
    archived: { type: Boolean, default: false },
  });
  const emit = defineEmits(["tag", "download", "archive", "delete", "clear"]);

  const { t } = useI18n();
  const tag = ref("");

  function applyTag() {
    const value = tag.value.trim();
    if (!value) return;
    emit("tag", value);
    tag.value = "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .bulk {
    position: fixed;
    inset-inline-start: 50%;
    bottom: 1.25rem;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: media.$s-2;
    max-width: calc(100vw - 2rem);
    padding: media.$s-3 media.$s-3;
    transform: translateX(-50%);
    border-radius: media.$r-lg;
    box-shadow: 0 12px 36px rgb(26 26 26 / 16%);
    @include media.surface("raised");

    // Mobilde ekranın altında 64px'lik tab bar var; çubuk onun üstünde,
    // ortalanmış dar bir ada yerine kenardan kenara bir şerit olarak durur —
    // 16px tipografiyle 6 buton ortalanınca çubuk yarım ekranı kaplıyordu.
    @media (max-width: media.$m-bp-md) {
      inset-inline: media.$s-3;
      bottom: media.$m-float-bottom;
      transform: none;
      max-width: none;
      justify-content: stretch;
    }
  }

  .bulk__count {
    margin: 0 media.$s-1 0 media.$s-2;
    @include media.text("xs");
    @include media.heading;
    @include media.numeric;

    @media (max-width: media.$m-bp-md) {
      flex: 1 1 100%;
      margin-inline: 0;
      text-align: center;
    }
  }

  .bulk__tagbox {
    display: flex;
    align-items: center;
    gap: media.$s-2;

    input {
      @include media.field-input;

      width: 9rem;
    }

    @media (max-width: media.$m-bp-md) {
      flex: 1 1 100%;

      input {
        flex: 1;
        width: auto;
        min-width: 0;
      }
    }
  }

  .bulk__btn {
    @include media.button;
    @include media.focus-ring;

    &--danger {
      @include media.button("danger");
    }

    // Mixin'den SONRA: media.button `padding` kısayolunu yeniden yazıyor.
    @media (max-width: media.$m-bp-md) {
      flex: 1 1 auto;
      justify-content: center;
      padding-inline: media.$s-3;
    }
  }
</style>

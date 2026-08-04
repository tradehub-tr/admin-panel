<template>
  <MediaModal
    v-model:open="open"
    :title="t('media.help.title')"
    :close-label="t('media.help.close')"
    width="34rem"
  >
    <p class="mhelp__lead">{{ t("media.help.lead") }}</p>

    <dl class="mhelp__list">
      <div v-for="row in SHORTCUTS" :key="row.id" class="mhelp__row">
        <dt>
          <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
        </dt>
        <dd>{{ t(`media.help.${row.id}`) }}</dd>
      </div>
    </dl>
  </MediaModal>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import MediaModal from "@/components/media/MediaModal.vue";

  /**
   * Kısayol listesi — araç çubuğundaki "?" butonuyla açılır.
   * Kısayollar keşfedilebilir olsun diye; her işlem butonla da yapılabiliyor.
   */
  const open = defineModel("open", { type: Boolean, default: false });
  const { t } = useI18n();

  const SHORTCUTS = [
    { id: "search", keys: ["/", "F"] },
    { id: "move", keys: ["←", "→", "↑", "↓"] },
    { id: "open", keys: ["Enter"] },
    { id: "select", keys: ["Space"] },
    { id: "range", keys: ["Shift", "Space"] },
    { id: "preview", keys: ["P"] },
    { id: "archive", keys: ["A"] },
    { id: "remove", keys: ["Delete"] },
    { id: "selectAll", keys: ["Ctrl", "A"] },
    { id: "undo", keys: ["Ctrl", "Z"] },
    { id: "escape", keys: ["Esc"] },
  ];
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mhelp__lead {
    margin: 0 0 media.$s-4;
    @include media.text("sm");
    @include media.muted;
  }

  .mhelp__list {
    margin: 0;
    display: grid;
    gap: 0;
  }

  .mhelp__row {
    display: flex;
    align-items: center;
    gap: media.$s-4;
    padding: media.$s-2 0;
    @include media.divider;

    &:last-child {
      border-bottom: 0;
    }

    dt {
      display: flex;
      gap: media.$s-1;
      flex: 0 0 9rem;
    }

    dd {
      margin: 0;
      @include media.text;
      @include media.muted;
    }
  }

  kbd {
    padding: media.$s-05 media.$s-2;
    border: 1px solid $l-border;
    border-bottom-width: 2px;
    border-radius: media.$r-sm;
    background: $l-bg-soft;
    font-family: inherit;
    @include media.text("xs");
    @include media.heading;

    @include dark {
      background: $d-bg;
      border-color: $d-border;
    }
  }
</style>

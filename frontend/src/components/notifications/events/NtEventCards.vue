<script setup>
  /** Olay kartları (dar alan): ad, anahtar, kanallar, yayın + çeviri, Düzenle; ayrıntı açılır. */
  import AppIcon from "@/components/common/AppIcon.vue";

  import NtChannelCells from "../NtChannelCells.vue";
  import NtPublishBadge from "../NtPublishBadge.vue";
  import NtTranslationBadge from "../NtTranslationBadge.vue";
  import NtEventDetail from "./NtEventDetail.vue";

  defineProps({
    groups: { type: Array, required: true },
    expanded: { type: Object, required: true },
    canEdit: { type: Boolean, default: false },
  });
  const emit = defineEmits(["toggle", "channels"]);
</script>

<template>
  <div class="nt-cards nt-surface">
    <section v-for="group in groups" :key="group.id" :aria-label="group.title">
      <h3 class="nt-cards__group">
        {{ group.title }} <span class="nt-num nt-cards__count">{{ group.total }}</span>
      </h3>
      <ul class="nt-cards__list">
        <li v-for="row in group.rows" :key="row.key" class="nt-card">
          <div class="nt-card__head">
            <button
              type="button"
              class="nt-icon-btn"
              :aria-expanded="expanded.has(row.key)"
              :aria-controls="`nt-detail-${row.key}`"
              :aria-label="`Ayrıntı: ${row.name}`"
              @click="emit('toggle', row.key)"
            >
              <AppIcon
                name="chevron-down"
                :size="16"
                :class="expanded.has(row.key) ? 'rotate-180' : ''"
              />
            </button>
            <div class="nt-card__text">
              <span class="nt-card__name">{{ row.name }}</span>
              <span class="nt-card__key nt-mono">{{ row.key }}</span>
            </div>
            <router-link
              class="hdr-btn-outlined nt-btn--sm"
              :to="{ name: 'NotificationTemplateEditor', params: { key: row.key } }"
              :aria-label="`${canEdit ? 'Düzenle' : 'Görüntüle'}: ${row.name}`"
            >
              <AppIcon :name="canEdit ? 'pencil' : 'eye'" :size="14" />
              {{ canEdit ? "Düzenle" : "Görüntüle" }}
            </router-link>
          </div>
          <button
            type="button"
            class="nt-card__chans"
            :data-channel-btn="row.key"
            :aria-label="`Kanal ayarı: ${row.name}. ${row.channelText}`"
            @click="emit('channels', row.key)"
          >
            <NtChannelCells :event="row.event" />
          </button>
          <div class="nt-card__badges">
            <NtPublishBadge :publish="row.event.publish" />
            <NtTranslationBadge :summary="row.translation" />
            <span class="nt-hint">{{ row.translation.rest }}</span>
          </div>
          <div v-show="expanded.has(row.key)" :id="`nt-detail-${row.key}`" class="nt-card__detail">
            <NtEventDetail :row="row" />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
  .nt-cards {
    overflow: hidden;
  }

  .nt-cards__group {
    margin: 0;
    padding: 8px 12px;
    background: var(--nt-bg-muted);
    font-size: 13px;
    font-weight: 700;
    color: var(--nt-fg-2);
  }

  section + section .nt-cards__group {
    border-top: 1px solid var(--nt-line);
  }

  .nt-cards__count {
    margin-inline-start: 4px;
    font-weight: 500;
    color: var(--nt-muted);
  }

  .nt-cards__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .nt-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px 12px;
    border-top: 1px solid var(--nt-line-soft);
  }

  .nt-card__head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nt-card__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .nt-card__name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .nt-card__key {
    color: var(--nt-muted);
    overflow-wrap: anywhere;
  }

  .nt-card__chans {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 2px 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    :deep(.nt-chans) {
      max-width: none;
    }
  }

  .nt-card__badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .nt-card__detail {
    margin: 0 -12px -12px;
    border-top: 1px solid var(--nt-line-soft);
  }
</style>

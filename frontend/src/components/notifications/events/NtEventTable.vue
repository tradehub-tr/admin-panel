<script setup>
  /**
   * Olay tablosu (geniş alan). Sütunlar sayfaya kalan genişliğe göre açılır;
   * gizlenen her bilgi açılır ayrıntı satırında durur.
   */
  import { computed } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";

  import NtChannelCells from "../NtChannelCells.vue";
  import NtPublishBadge from "../NtPublishBadge.vue";
  import NtTranslationBadge from "../NtTranslationBadge.vue";
  import NtEventDetail from "./NtEventDetail.vue";

  const props = defineProps({
    groups: { type: Array, required: true },
    expanded: { type: Object, required: true },
    canEdit: { type: Boolean, default: false },
    /** Tablonun bulunduğu alanın genişliği (px). */
    width: { type: Number, required: true },
  });
  const emit = defineEmits(["toggle", "channels"]);

  const cols = computed(() => ({
    translation: props.width >= 800,
    recipient: props.width >= 1000,
    delivery: props.width >= 1000,
    change: props.width >= 1200,
  }));
  const colspan = computed(() => 4 + Object.values(cols.value).filter(Boolean).length);
</script>

<template>
  <div class="nt-table nt-surface">
    <table class="w-full">
      <caption class="nt-sr">
        Bildirim olayları
      </caption>
      <thead>
        <tr>
          <th scope="col" class="tbl-th">Olay</th>
          <th v-if="cols.recipient" scope="col" class="tbl-th">Alıcı</th>
          <th scope="col" class="tbl-th">Kanallar</th>
          <th v-if="cols.delivery" scope="col" class="tbl-th">Gönderim</th>
          <th scope="col" class="tbl-th">Yayın</th>
          <th v-if="cols.translation" scope="col" class="tbl-th">Çeviri</th>
          <th v-if="cols.change" scope="col" class="tbl-th">Son değişiklik</th>
          <th scope="col" class="tbl-th"><span class="nt-sr">İşlem</span></th>
        </tr>
      </thead>
      <tbody v-for="group in groups" :key="group.id">
        <tr class="nt-table__group">
          <th scope="rowgroup" :colspan="colspan">
            {{ group.title }} <span class="nt-num nt-table__count">{{ group.total }}</span>
          </th>
        </tr>
        <template v-for="row in group.rows" :key="row.key">
          <tr class="tbl-row nt-table__row">
            <td class="tbl-td">
              <div class="nt-ev">
                <button
                  type="button"
                  class="nt-icon-btn nt-ev__exp"
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
                <div class="nt-ev__text">
                  <span class="nt-ev__name">{{ row.name }}</span>
                  <span class="nt-ev__key nt-mono">{{ row.key }}</span>
                </div>
              </div>
            </td>
            <td v-if="cols.recipient" class="tbl-td">
              <span class="nt-inline">
                <AppIcon :name="row.recipientIcon" :size="14" />{{ row.recipients }}
              </span>
            </td>
            <td class="tbl-td nt-table__chans">
              <button
                type="button"
                class="nt-chans-btn"
                :data-channel-btn="row.key"
                :aria-label="`Kanal ayarı: ${row.name}. ${row.channelText}`"
                @click="emit('channels', row.key)"
              >
                <NtChannelCells :event="row.event" />
              </button>
            </td>
            <td v-if="cols.delivery" class="tbl-td">
              <span class="nt-inline" :title="row.delivery.desc">
                <AppIcon :name="row.delivery.icon" :size="14" />{{ row.delivery.short }}
              </span>
            </td>
            <td class="tbl-td">
              <div class="nt-stack">
                <NtPublishBadge :publish="row.event.publish" />
                <span v-if="row.publishSub" class="nt-hint">{{ row.publishSub }}</span>
                <span v-if="!cols.translation" class="nt-stack__tr">
                  <NtTranslationBadge :summary="row.translation" />
                  <span class="nt-hint">{{ row.translation.rest }}</span>
                </span>
              </div>
            </td>
            <td v-if="cols.translation" class="tbl-td">
              <div class="nt-stack">
                <NtTranslationBadge :summary="row.translation" />
                <span class="nt-hint">{{ row.translation.rest }}</span>
              </div>
            </td>
            <td v-if="cols.change" class="tbl-td">
              <div class="nt-stack">
                <span>{{ row.updatedBy }}</span>
                <span class="nt-hint nt-num">{{ row.updatedAt }}</span>
              </div>
            </td>
            <td class="tbl-td nt-table__action">
              <router-link
                class="hdr-btn-outlined nt-btn--sm"
                :to="{ name: 'NotificationTemplateEditor', params: { key: row.key } }"
                :aria-label="`${canEdit ? 'Düzenle' : 'Görüntüle'}: ${row.name}`"
              >
                <AppIcon :name="canEdit ? 'pencil' : 'eye'" :size="14" />
                {{ canEdit ? "Düzenle" : "Görüntüle" }}
              </router-link>
            </td>
          </tr>
          <tr v-show="expanded.has(row.key)" :id="`nt-detail-${row.key}`" class="nt-table__detail">
            <td :colspan="colspan">
              <NtEventDetail :row="row" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
  .nt-table {
    overflow: hidden;

    table {
      border-collapse: collapse;
      table-layout: auto;
    }

    thead th {
      border-bottom: 1px solid var(--nt-line);
      background: var(--nt-bg-soft);
    }

    .tbl-td {
      padding: 10px 12px;
      border-top: 1px solid var(--nt-line-soft);
      vertical-align: middle;
    }

    .tbl-th {
      padding: 10px 12px;
    }
  }

  .nt-table__group th {
    padding: 8px 12px;
    border-top: 1px solid var(--nt-line);
    background: var(--nt-bg-muted);
    font-size: 12px;
    font-weight: 700;
    text-align: start;
    color: var(--nt-fg-2);
  }

  .nt-table__count {
    margin-inline-start: 4px;
    font-weight: 500;
    color: var(--nt-muted);
  }

  .nt-table__detail td {
    padding: 0;
    border-top: 1px solid var(--nt-line-soft);
  }

  .nt-table__chans {
    width: 276px;
    min-width: 276px;
  }

  .nt-table__action {
    width: 1%;
    text-align: end;
    white-space: nowrap;
  }

  .nt-ev {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .nt-ev__exp {
    flex-shrink: 0;
  }

  .nt-ev__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .nt-ev__name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .nt-ev__key {
    color: var(--nt-muted);
    overflow-wrap: anywhere;
  }

  .nt-inline {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .nt-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .nt-stack__tr {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .nt-chans-btn {
    display: block;
    width: 100%;
    padding: 2px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;

    &:hover {
      background: var(--nt-bg-muted);
    }
  }
</style>

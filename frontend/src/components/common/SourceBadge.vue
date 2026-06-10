<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import AppIcon from "@/components/common/AppIcon.vue";

  // Ürünün kaynağını gösterir: `bulkJob` doluysa XML Feed / toplu yükleme,
  // boşsa elle eklenmiş. Feed rozetine tıklanınca ilgili içe aktarma
  // işinin detayına gider (bulk-import-detail route'u hem satıcı hem admin
  // tarafından erişilebilir).
  const props = defineProps({
    bulkJob: { type: String, default: null },
  });

  const { t } = useI18n();
  const router = useRouter();

  const isFeed = computed(() => !!props.bulkJob);

  function openJob() {
    if (!isFeed.value) return;
    router.push({ name: "bulk-import-detail", params: { name: props.bulkJob } }).catch(() => {});
  }
</script>

<template>
  <button
    v-if="isFeed"
    type="button"
    class="source-badge source-badge--feed"
    :title="t('listingSource.feedTooltip', { job: bulkJob })"
    @click.stop="openJob"
  >
    <AppIcon name="rss" :size="9" />
    {{ t("listingSource.feed") }}
  </button>
  <span v-else class="source-badge source-badge--manual" :title="t('listingSource.manualTooltip')">
    <AppIcon name="pencil" :size="9" />
    {{ t("listingSource.manual") }}
  </span>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .source-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.4;
    border: 1px solid transparent;
  }

  // Feed rozeti tıklanabilir — link davranışı, ama hover'da layout shift yok
  // (sadece opacity değişir, appearance sıfırlanır).
  .source-badge--feed {
    appearance: none;
    cursor: pointer;
    background: rgba($brand, 0.13);
    color: $brand;
    border-color: rgba($brand, 0.3);
    transition: opacity $t-fast;

    &:hover {
      opacity: 0.78;
    }
    &:focus {
      outline: none;
    }
  }

  .source-badge--manual {
    background: rgba(#6b7280, 0.13);
    color: #6b7280;
    border-color: rgba(#6b7280, 0.3);

    @include dark {
      color: #9ca3af;
    }
  }
</style>

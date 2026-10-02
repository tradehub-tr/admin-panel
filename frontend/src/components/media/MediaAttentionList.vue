<script setup>
  import { computed, useId } from "vue";
  import { useI18n } from "vue-i18n";
  import MediaTransferRow from "./MediaTransferRow.vue";
  import { mediaPhase } from "@/lib/media/status.js";
  const props = defineProps({ items: { type: Array, default: () => [] } });
  const emit = defineEmits(["open"]);
  const { t } = useI18n();
  const titleId = `media-attention-${useId()}`;
  // Başlıktaki sayım sırası: önce müdahale isteyenler, sonra sürenler. Satırlar sayfa sırasında.
  const PHASES = ["blocked", "scanFailed", "processingFailed", "scanning", "processing"];
  const ISSUES = ["blocked", "scanFailed", "processingFailed"];
  const attention = computed(() =>
    props.items
      .map((item) => ({ item, phase: mediaPhase(item, item.kind) }))
      .filter((row) => PHASES.includes(row.phase))
  );
  const hasIssues = computed(() => attention.value.some((row) => ISSUES.includes(row.phase)));
  const title = computed(() =>
    t(hasIssues.value ? "mediaFlow.attention.titleIssues" : "mediaFlow.attention.titleActive", {
      n: attention.value.length,
    })
  );
  // "Güvenlik kontrolü: 2 · Engellendi: 1" — renk değil, metin.
  const breakdown = computed(() =>
    PHASES.map((phase) => ({
      phase,
      n: attention.value.filter((row) => row.phase === phase).length,
    }))
      .filter((c) => c.n)
      .map((c) =>
        t("mediaFlow.attention.count", { label: t(`mediaFlow.phase.${c.phase}`), n: c.n })
      )
      .join(" · ")
  );
</script>
<template>
  <section v-if="attention.length" class="media-attention" :aria-labelledby="titleId">
    <header class="media-attention__head">
      <h2 :id="titleId" class="media-attention__title">{{ title }}</h2>
      <p class="media-attention__sub">{{ breakdown }}</p>
    </header>
    <ul class="media-attention__list">
      <MediaTransferRow
        v-for="{ item, phase } in attention"
        :key="item.id"
        :name="item.fileName"
        :bytes="item.bytes"
        :kind="item.kind"
        :phase="phase"
        :media="item"
        :facts="{ scan_status: item.scan_status ?? item.scanStatus }"
      >
        <template #actions
          ><button
            type="button"
            class="media-transfer__action"
            :aria-label="t('mediaFlow.details', { name: item.fileName })"
            @click="emit('open', item)"
          >
            {{ t("mediaFlow.detailsShort") }}
          </button></template
        >
      </MediaTransferRow>
    </ul>
  </section>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/upload-row" as row;
  .media-attention {
    margin: 0 0 16px;
    overflow: hidden;
    @include row.card;
  }
  .media-attention__head {
    padding: 12px 16px 8px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .media-attention__title {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .media-attention__sub {
    margin: 0;
    font-size: 13px;
    line-height: 18px;
    color: $l-text-700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
    @include dark {
      color: $d-text;
    }
  }
  .media-attention__list {
    margin: 0;
    padding: 6px 0;
    list-style: none;
  }
</style>

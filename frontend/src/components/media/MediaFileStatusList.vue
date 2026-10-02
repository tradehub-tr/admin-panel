<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import MediaTransferRow from "./MediaTransferRow.vue";
  import { useMediaStatus } from "@/composables/useMediaStatus.js";
  import { mediaPhase } from "@/lib/media/status.js";
  import { kindOfExtension } from "@/utils/mediaKind";
  const props = defineProps({ files: { type: Array, default: () => [] } });
  const unique = computed(() => [...new Set(props.files)].filter(Boolean));
  const { facts, unavailable } = useMediaStatus(unique);
  const { t } = useI18n();
</script>
<template>
  <div v-if="unique.length" class="media-file-status">
    <p v-if="unavailable" role="status">{{ t("mediaFlow.unavailable") }}</p>
    <ul>
      <MediaTransferRow
        v-for="file in unique"
        :key="file"
        :name="facts[file]?.file_name || file.split('/').pop()"
        :kind="kindOfExtension(file)"
        :bytes="facts[file]?.bytes || 0"
        :phase="mediaPhase(facts[file], kindOfExtension(file))"
        :facts="facts[file]"
        :media="{
          fileUrl: file,
          fileName: facts[file]?.file_name || '',
          kind: kindOfExtension(file),
        }"
      />
    </ul>
  </div>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/upload-row" as row;
  // Tepsi paneliyle aynı açık kart; satırlar MediaTransferRow (tepsi satırı).
  .media-file-status {
    overflow: hidden;
    @include row.card;
    ul {
      list-style: none;
      padding: 6px 0;
      margin: 0;
    }
    > p {
      margin: 0;
      padding: 12px 16px 0;
      font-size: 13px;
      line-height: 18px;
      color: $l-text-700;
      @include dark {
        color: $d-text;
      }
    }
  }
</style>

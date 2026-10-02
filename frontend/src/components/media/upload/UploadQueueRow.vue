<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import MediaTransferRow from "../MediaTransferRow.vue";
  import PreflightPanel from "./PreflightPanel.vue";
  import { mediaPhase } from "@/lib/media/status.js";
  import { kindOfFile } from "@/utils/mediaKind";
  const props = defineProps({
    item: { type: Object, required: true },
    slotPolicy: { type: Object, default: null },
    facts: { type: Object, default: null },
  });
  const emit = defineEmits(["retry", "abort", "remove", "proceed"]);
  const { t, te } = useI18n();
  const kind = computed(() => kindOfFile(props.item.file));
  const phase = computed(() =>
    props.item.status === "done"
      ? mediaPhase(props.facts, kind.value)
      : {
          failed: "uploadFailed",
          aborted: "cancelled",
          blocked: "uploadFailed",
          preparing: "preparing",
          checking: "preparing",
          uploading: "uploading",
        }[props.item.status] || "queued"
  );
  const errorText = computed(() => {
    if (!props.item.error) return "";
    const key = `media.upload.err.${props.item.errorCode}`;
    return te(key) ? t(key) : props.item.error;
  });
  const canAbort = computed(() => ["uploading", "preparing"].includes(props.item.status));
  const canRetry = computed(
    () =>
      (props.item.status === "failed" && props.item.retryable !== false) ||
      props.item.status === "aborted"
  );
</script>
<template>
  <MediaTransferRow
    :name="item.name"
    :kind="kind"
    :bytes="facts?.bytes || item.result?.bytes || item.size"
    :original-bytes="item.size"
    :phase="phase"
    :progress="item.progressKnown ? item.percent : null"
    :error="errorText"
    :facts="facts"
    :preview-url="item.previewUrl || ''"
  >
    <!-- Karar bilgisi her zaman görünür (adın altında); eylemler sağda. -->
    <template v-if="item.duplicate || item.status === 'blocked'" #notes>
      <p v-if="item.duplicate">
        {{
          t("media.uploader.duplicateLine", {
            name: item.duplicate.file_name || item.duplicate.file_url,
          })
        }}
      </p>
      <PreflightPanel
        v-if="item.status === 'blocked'"
        :findings="item.findings"
        :measure="item.measure"
        :slot-policy="slotPolicy"
      />
    </template>
    <template v-if="canRetry || item.status === 'duplicate' || canAbort" #actions>
      <button
        v-if="canRetry"
        type="button"
        class="media-transfer__action"
        @click="emit('retry', item.id)"
      >
        {{ t("media.uploader.retry") }}
      </button>
      <button
        v-if="item.status === 'duplicate'"
        type="button"
        class="media-transfer__action"
        @click="emit('proceed', item.id)"
      >
        {{ t("media.uploader.uploadAnyway") }}
      </button>
      <button
        v-if="canAbort"
        type="button"
        class="media-transfer__action"
        @click="emit('abort', item.id)"
      >
        {{ t("media.uploader.cancel") }}
      </button>
    </template>
    <template #details>
      <p v-if="item.resumed">{{ t("media.uploader.resumed") }}</p>
      <PreflightPanel
        v-if="item.status !== 'blocked' && (item.findings.length || item.measure)"
        :findings="item.findings"
        :measure="item.measure"
        :slot-policy="slotPolicy"
      />
      <button
        type="button"
        class="media-transfer__action"
        :aria-label="t('media.uploader.removeAria', { name: item.name })"
        @click="emit('remove', item.id)"
      >
        {{ t("mediaFlow.remove") }}
      </button>
    </template>
  </MediaTransferRow>
</template>

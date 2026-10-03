<script setup>
  /** Tam ekran önizleme: 600px'i %100 gösterecek genişlikte dialog. */
  import { computed, ref, watch } from "vue";

  import BaseSegmented from "@/components/common/BaseSegmented.vue";
  import { langOf } from "@/constants/notificationTemplates";
  import { buildPreview, previewWidth } from "@/utils/notificationTemplates/preview";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtOverlay from "../NtOverlay.vue";
  import NtPreviewFrame from "../NtPreviewFrame.vue";

  const props = defineProps({
    event: { type: Object, required: true },
    tree: { type: Object, required: true },
    channel: { type: Object, required: true },
    variables: { type: Array, required: true },
    required: { type: Array, default: () => [] },
    /** { lang, sample, device } */
    options: { type: Object, required: true },
  });
  const open = defineModel("open", { type: Boolean, default: false });

  const device = ref("desktop");
  const sizeLabel = ref("");
  const DEVICES = [
    { value: "mobile", label: "Mobil 360" },
    { value: "desktop", label: "Masaüstü 600" },
  ];

  watch(open, (isOpen) => {
    if (isOpen) device.value = props.options.device || "mobile";
  });

  const preview = computed(() =>
    buildPreview({
      event: props.event,
      tree: props.tree,
      channel: props.channel.id,
      lang: props.options.lang,
      variables: props.variables,
      required: props.required,
      sample: props.options.sample,
      sanitize: sanitizeHtml,
    })
  );
  const width = computed(() => previewWidth(props.channel.id, device.value));
  const title = computed(
    () => `Önizleme · ${props.channel.label} · ${langOf(preview.value.lang)?.short}`
  );
  const returnFocus = () => document.querySelector("[data-fullscreen-btn]");
</script>

<template>
  <NtOverlay v-model:open="open" :title="title" size="full" :return-focus="returnFocus">
    <div class="nt-full__ctl">
      <BaseSegmented
        v-if="channel.id === 'email'"
        v-model="device"
        class="nt-full__device"
        :options="DEVICES"
      />
      <span v-if="sizeLabel" class="nt-full__label nt-num" data-full-size>{{ sizeLabel }}</span>
    </div>
    <NtPreviewFrame
      :preview="preview"
      :channel="channel.id"
      :width="width"
      @fit="sizeLabel = $event"
    />
    <template #footer>
      <button type="button" class="hdr-btn-outlined" @click="open = false">Kapat</button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  .nt-full__ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-full__device {
    width: auto;
    min-width: 220px;
  }

  .nt-full__label {
    margin-inline-start: auto;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--nt-bg-muted);
    font-size: 12px;
  }
</style>

<!--
  SlotUpload — tradehub-upload-ui SlotDropzoneController için Vue wrapper.
  KYC/KYB tarzı sabit etiketli slot'lar; her slot tek dosya alır (replace).
-->
<template>
  <div :id="containerId" ref="containerEl"></div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, defineExpose } from "vue";
  import { SlotDropzoneController } from "@/lib/upload-ui";

  const props = defineProps({
    scopePrefix: { type: String, required: true },
    slots: { type: Array, required: true }, // Array<SlotDef>
    autoUpload: { type: Boolean, default: false },
    autoUploadConfig: { type: Object, default: null },
    autoCustomUploader: { type: Function, default: null },
  });

  const emit = defineEmits([
    "slot-filled",
    "slot-cleared",
    "slot-uploaded",
    "slot-upload-error",
    "validation-error",
  ]);

  const containerEl = ref(null);
  const containerId = `upload-slots-${props.scopePrefix}`;
  let controller = null;

  onMounted(() => {
    controller = new SlotDropzoneController({
      containerId,
      slots: props.slots,
      autoUpload: props.autoUpload,
      autoUploadConfig: props.autoUploadConfig,
      autoCustomUploader: props.autoCustomUploader,
      onSlotFilled: (slotId, file) => emit("slot-filled", { slotId, file }),
      onSlotCleared: (slotId) => emit("slot-cleared", slotId),
      onSlotUploaded: (slotId, fileUrl) => emit("slot-uploaded", { slotId, fileUrl }),
      onSlotUploadError: (slotId, error) => emit("slot-upload-error", { slotId, error }),
      onValidationError: (slotId, kind, file) => emit("validation-error", { slotId, kind, file }),
    });
    controller.mount();
  });

  onBeforeUnmount(() => {
    controller = null;
  });

  defineExpose({
    upload(uploadOpts) {
      return controller?.upload(uploadOpts);
    },
    get files() {
      return controller?.files ?? new Map();
    },
    isValid() {
      return controller?.isValid() ?? false;
    },
  });
</script>

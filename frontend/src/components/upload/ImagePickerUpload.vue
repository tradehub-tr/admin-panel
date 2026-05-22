<!--
  ImagePickerUpload — avatar/logo/banner için tek görsel picker.
  Anında upload (autoUpload tarzı), Apple-style yuvarlak/kare preview.
-->
<template>
  <div :id="containerId" ref="containerEl"></div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, defineExpose, watch } from "vue";
  import { ImagePickerController } from "@/lib/upload-ui";

  const props = defineProps({
    scopePrefix: { type: String, required: true },
    currentUrl: { type: String, default: "" },
    shape: { type: String, default: "circle" }, // circle | square | rectangle
    aspectRatio: { type: Number, default: null },
    maxFileSizeBytes: { type: Number, default: 2 * 1024 * 1024 },
    accept: { type: String, default: "image/jpeg,image/png,image/webp" },
    recommendedSize: { type: String, default: "" },
    placeholderText: { type: String, default: "Görsel" },
    labels: { type: Object, default: () => ({}) },
    uploadConfig: { type: Object, required: true }, // { endpoint, formDataFields, headers }
  });

  const emit = defineEmits(["change", "remove", "upload-error", "validation-error"]);

  const containerEl = ref(null);
  const containerId = `upload-image-${props.scopePrefix}`;
  let controller = null;

  onMounted(() => {
    controller = new ImagePickerController(
      {
        containerId,
        currentUrl: props.currentUrl,
        shape: props.shape,
        aspectRatio: props.aspectRatio,
        maxFileSizeBytes: props.maxFileSizeBytes,
        accept: props.accept,
        recommendedSize: props.recommendedSize,
        placeholderText: props.placeholderText,
        labels: props.labels,
        onChange: ({ fileUrl, file }) => emit("change", { fileUrl, file }),
        onRemove: () => emit("remove"),
        onUploadError: (error) => emit("upload-error", error),
        onValidationError: (kind, file) => emit("validation-error", { kind, file }),
      },
      props.uploadConfig
    );
    controller.mount();
  });

  onBeforeUnmount(() => {
    controller = null;
  });

  // currentUrl prop dışarıdan değişirse senkronla
  watch(
    () => props.currentUrl,
    (newUrl) => controller?.setCurrentUrl(newUrl)
  );

  defineExpose({
    setCurrentUrl(url) {
      controller?.setCurrentUrl(url);
    },
  });
</script>

<!--
  MultiFileUpload — tradehub-upload-ui MultiFileDropzoneController için Vue wrapper.

  Storefront RFQ pattern'iyle birebir aynı UX: grid kart layout, Dropzone-style
  bar overlay, ✓/✗ mark, staging animation, paralel upload.

  İki mod:
  - autoUpload=false (default): submit'te toplu upload, caller controller.upload() çağırır
  - autoUpload=true: dosya bırakılır bırakmaz anında upload (review/avatar tarzı)

  Yetkilendirme: caller endpoint + formDataFields + headers verir; Frappe File
  has_permission gating'i parent DocType permission'una göre devreye girer.
-->
<template>
  <div>
    <div :id="dropzoneId" ref="dropzoneEl"></div>
    <div :id="fileListId" ref="fileListEl"></div>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, ref, defineExpose } from "vue";
  import { MultiFileDropzoneController } from "@/lib/upload-ui";

  const props = defineProps({
    /** Sayfa başına unique prefix (id collision engeli) */
    scopePrefix: { type: String, required: true },
    /** maxFiles, maxFileSizeBytes, allowedExtensions, allowedFormatsDisplay */
    config: { type: Object, required: true },
    /** title, or, pickBtn, dragRelease, meta? */
    texts: { type: Object, required: true },
    /** Dosya bırakılır bırakmaz upload tetiklensin mi */
    autoUpload: { type: Boolean, default: false },
    /** autoUpload aktifse zorunlu — { endpoint, formDataFields, headers, concurrency } */
    autoUploadConfig: { type: Object, default: null },
  });

  const emit = defineEmits([
    "add",
    "validation-error",
    "preview-click",
    "file-uploaded",
    "upload-error",
  ]);

  const dropzoneEl = ref(null);
  const fileListEl = ref(null);
  const dropzoneId = `upload-dz-${props.scopePrefix}`;
  const fileInputId = `upload-input-${props.scopePrefix}`;
  const fileListId = `upload-list-${props.scopePrefix}`;

  let controller = null;

  onMounted(() => {
    // Dropzone HTML'i Vue template'ine inject et (paket renderDropzoneHtml çağrısı)
    if (dropzoneEl.value) {
      dropzoneEl.value.innerHTML = MultiFileDropzoneController.renderDropzoneHtml({
        dropzoneId,
        fileInputId,
        config: props.config,
        texts: props.texts,
      });
    }

    controller = new MultiFileDropzoneController({
      dropzoneId,
      fileInputId,
      fileListId,
      lightboxScope: `${props.scopePrefix}-lightbox`,
      scopePrefix: props.scopePrefix,
      config: props.config,
      texts: props.texts,
      autoUpload: props.autoUpload,
      autoUploadConfig: props.autoUploadConfig,
      onAdd: (files) => emit("add", files),
      onValidationError: (kind, file) => emit("validation-error", { kind, file }),
      onPreviewClick: (file) => emit("preview-click", file),
      onFileUploaded: (file, responseText) => emit("file-uploaded", { file, responseText }),
      onUploadError: (file, error) => emit("upload-error", { file, error }),
    });
    controller.mount();
  });

  onBeforeUnmount(() => {
    controller?.destroy();
    controller = null;
  });

  defineExpose({
    /** Caller submit'te çağırır — submit-time upload modu için */
    upload(uploadOpts) {
      return controller?.upload(uploadOpts);
    },
    /** Mevcut dosya listesi (submit pipeline için) */
    get files() {
      return controller?.files ?? [];
    },
    get isUploading() {
      return controller?.getIsUploading() ?? false;
    },
  });
</script>

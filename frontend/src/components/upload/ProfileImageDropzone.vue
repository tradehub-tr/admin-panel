<!--
  ProfileImageDropzone — Seller Profile Logo / Banner gibi tek görsel alanları için
  RFQ pattern'iyle aynı UX: dashed border drop area, click-to-pick, preview,
  progress bar overlay ve yeşil ✓ tik.

  ImagePickerUpload wrapper'ı kullanmak yerine yazıldı çünkü `tradehub-upload-ui`
  ImagePickerController'ı Frappe'nin upload_file response shape'inden file_url'i
  çıkarmıyor (paket düzeyi eksik); bu component `api.uploadFile` ile doğrudan
  konuşur ve emit ettiği URL kalıcı Frappe URL'dir.

  v-model: dosya URL'i (string).
-->
<template>
  <!-- <480 (sm): dar ekranda bilgi sütunu dropzone'un altına iner — yatay taşma olmaz -->
  <div class="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
    <label
      class="relative shrink-0 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors flex items-center justify-center"
      :class="[
        sizeCls,
        dz.isOver.value
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
          : 'border-gray-300 dark:border-white/15 hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/15',
      ]"
      @dragenter="dz.onDragEnter"
      @dragover="dz.onDragOver"
      @dragleave="dz.onDragLeave"
      @drop="dz.onDrop"
    >
      <img
        v-if="modelValue"
        :src="modelValue"
        class="absolute inset-0 w-full h-full object-cover"
        :alt="placeholder"
      />
      <div v-else class="flex flex-col items-center gap-1.5 text-center px-2">
        <AppIcon
          :name="dz.isOver.value ? 'upload' : 'image-plus'"
          :size="20"
          :class="dz.isOver.value ? 'text-brand-700' : 'text-gray-400'"
        />
        <span
          class="text-[11px] leading-tight"
          :class="dz.isOver.value ? 'text-brand-800 font-medium' : 'text-gray-400'"
        >
          {{
            dz.isOver.value ? t("profileImageDropzone.drop") : t("profileImageDropzone.dragOrClick")
          }}
        </span>
      </div>

      <input type="file" :accept="accept" class="hidden" @change="onInputChange" />

      <!-- Upload progress: opak dim + bar + % -->
      <div
        v-if="upload.status.value === 'uploading'"
        class="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center gap-2 bg-black/85"
      >
        <div class="w-3/4 max-w-[140px] h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
            :style="{ width: Math.max(6, upload.progress.value) + '%' }"
          ></div>
        </div>
        <span class="text-[11px] text-white font-semibold">
          {{ Math.round(upload.progress.value) }}%
        </span>
      </div>
      <Transition name="fade">
        <div
          v-if="upload.status.value === 'success'"
          class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85"
        >
          <div
            class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-emerald-500 text-2xl font-bold shadow-xl"
          >
            ✓
          </div>
        </div>
      </Transition>
    </label>

    <div class="flex-1 min-w-0 space-y-1">
      <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{ placeholder }}</p>
      <p v-if="recommendedSize" class="text-[10px] text-gray-500">
        {{ t("profileImageDropzone.recommended") }}: {{ recommendedSize }}
      </p>
      <p v-if="modelValue" class="text-[10px] text-gray-400 truncate" :title="modelValue">
        {{ getFileName(modelValue) }}
      </p>
      <div v-if="modelValue" class="flex items-center gap-2 pt-1">
        <button
          type="button"
          class="text-[11px] text-brand-800 dark:text-brand-500 hover:underline"
          @click="openInNewTab"
        >
          {{ t("profileImageDropzone.open") }}
        </button>
        <button type="button" class="text-[11px] text-red-500 hover:underline" @click="onRemove">
          {{ t("profileImageDropzone.remove") }}
        </button>
      </div>
      <p v-else class="text-[10px] text-gray-400">
        {{ acceptLabel }} · maks {{ Math.round(maxBytes / 1024 / 1024) }}MB
      </p>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { useDropzone } from "@/composables/useDropzone";

  const props = defineProps({
    modelValue: { type: String, default: "" },
    shape: { type: String, default: "square" }, // square | rectangle
    placeholder: { type: String, default: "Image" },
    accept: { type: String, default: "image/jpeg,image/png,image/webp" },
    maxBytes: { type: Number, default: 5 * 1024 * 1024 },
    recommendedSize: { type: String, default: "" },
  });

  const emit = defineEmits(["update:modelValue"]);

  const { t } = useI18n();
  const toast = useToast();
  const upload = useImageUploadProgress();

  // Banner (4:1) mobilde tam genişlik; sm+ sabit 256px. Kare logo her yerde 160px.
  const sizeCls = computed(() =>
    props.shape === "rectangle" ? "w-full sm:w-64 h-36" : "w-40 h-40"
  );

  const acceptLabel = computed(() => {
    if (!props.accept) return t("profileImageDropzone.allFiles");
    return props.accept
      .split(",")
      .map((s) => {
        const t = s.trim();
        if (t.startsWith("image/")) return t.split("/")[1].toUpperCase();
        if (t.startsWith(".")) return t.slice(1).toUpperCase();
        return t;
      })
      .join(", ");
  });

  async function uploadFile(file) {
    upload.start();
    try {
      const url = await api.uploadFile(file);
      if (url) emit("update:modelValue", url);
      await upload.finish();
      toast.success(t("profileImageDropzone.uploaded", { name: props.placeholder }));
    } catch (err) {
      upload.fail();
      toast.error(err.message || t("profileImageDropzone.uploadError"));
    }
  }

  const dz = useDropzone(
    async (files) => {
      if (files[0]) await uploadFile(files[0]);
    },
    {
      accept: props.accept,
      multiple: false,
      maxBytes: props.maxBytes,
      onValidationError: (kind, file) => {
        const name = file?.name || t("profileImageDropzone.file");
        if (kind === "unsupported")
          toast.error(t("profileImageDropzone.unsupportedFormat", { name }));
        else if (kind === "tooLarge")
          toast.error(
            t("profileImageDropzone.tooLarge", {
              name,
              mb: Math.round(props.maxBytes / 1024 / 1024),
            })
          );
      },
    }
  );

  async function onInputChange(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (file) await uploadFile(file);
  }

  function onRemove() {
    emit("update:modelValue", "");
  }

  function getFileName(url) {
    if (!url) return "";
    try {
      return decodeURIComponent(url.split("/").pop() || url);
    } catch {
      return url;
    }
  }

  function openInNewTab() {
    if (props.modelValue) window.open(props.modelValue, "_blank", "noopener");
  }
</script>

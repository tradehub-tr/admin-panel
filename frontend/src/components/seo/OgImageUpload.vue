<script setup>
  import { ref } from "vue";
  import { useFileUpload } from "@/composables/useFileUpload";

  defineProps({
    modelValue: { type: String, default: "" },
  });
  const emit = defineEmits(["update:modelValue"]);

  const { upload, uploading, error } = useFileUpload();
  const fileInput = ref(null);
  const dragOver = ref(false);

  async function handleFile(file) {
    try {
      const url = await upload(file, {
        doctype: "File",
        fieldname: "seo_og_image",
      });
      emit("update:modelValue", url);
    } catch {
      // error ref'i composable tarafından doldu
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e) {
    dragOver.value = false;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clear() {
    emit("update:modelValue", "");
    if (fileInput.value) fileInput.value.value = "";
  }
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      OG Image
      <span class="text-xs text-gray-400"> (1200x630 önerilir, JPG/PNG/WebP, max 5MB) </span>
    </label>

    <!-- Yüklü görsel -->
    <div v-if="modelValue" class="relative">
      <img
        :src="modelValue"
        class="w-full max-w-md aspect-[1.91/1] object-cover rounded-md border border-gray-200"
        alt="OG image"
      />
      <div class="mt-2 flex gap-2">
        <button
          type="button"
          class="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
          @click="fileInput?.click()"
        >
          Değiştir
        </button>
        <button
          type="button"
          class="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
          @click="clear"
        >
          Kaldır
        </button>
      </div>
    </div>

    <!-- Boş — dropzone -->
    <div
      v-else
      class="border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors"
      :class="dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
      @click="fileInput?.click()"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <div v-if="uploading" class="text-sm text-gray-500">Yükleniyor...</div>
      <div v-else>
        <p class="text-sm text-gray-600">
          <span class="font-medium text-blue-600">Dosya seç</span>
          veya buraya sürükle
        </p>
        <p class="text-xs text-gray-400 mt-1">PNG, JPG, WebP — max 5MB</p>
      </div>
    </div>

    <p v-if="error" class="mt-2 text-xs text-red-500">{{ error }}</p>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>

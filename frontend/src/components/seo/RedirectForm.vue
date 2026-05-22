<script setup>
  import { ref, watch } from "vue";

  const props = defineProps({
    initial: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(["save", "cancel"]);

  const form = ref({
    source_path: "",
    target_path: "",
    match_type: "exact",
    status_code: "301",
    enabled: 1,
    notes: "",
  });

  watch(
    () => props.initial,
    (val) => {
      if (val) {
        form.value = {
          source_path: val.source_path || "",
          target_path: val.target_path || "",
          match_type: val.match_type || "exact",
          status_code: val.status_code || "301",
          enabled: val.enabled ?? 1,
          notes: val.notes || "",
        };
      }
    },
    { immediate: true }
  );

  function onSave() {
    emit("save", { ...form.value });
  }
</script>

<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1"> Source Path </label>
      <input
        v-model="form.source_path"
        type="text"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="/eski-urun veya /eski/*"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1"> Target Path </label>
      <input
        v-model="form.target_path"
        type="text"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="/urun/iphone-15-pro"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"> Match Type </label>
        <select
          v-model="form.match_type"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="exact">Exact</option>
          <option value="prefix">Prefix</option>
          <option value="regex">Regex</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"> Status Code </label>
        <select
          v-model="form.status_code"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="301">301 (Permanent)</option>
          <option value="302">302 (Temporary)</option>
        </select>
      </div>
    </div>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="form.enabled"
        type="checkbox"
        :true-value="1"
        :false-value="0"
        class="w-4 h-4 rounded"
      />
      <span class="text-sm text-gray-700">Aktif</span>
    </label>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1"> Notlar </label>
      <textarea
        v-model="form.notes"
        rows="2"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
        placeholder="Admin notu (opsiyonel)"
      ></textarea>
    </div>

    <div class="flex gap-2 pt-2 border-t border-gray-100">
      <button type="button" class="hdr-btn-primary" @click="onSave">Kaydet</button>
      <button type="button" class="hdr-btn-outlined" @click="emit('cancel')">İptal</button>
    </div>
  </div>
</template>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      @click.self="cancel"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-5 border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-start gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="iconBg"
          >
            <AppIcon :name="iconName" :size="20" :class="iconColor" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
              {{ message }}
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="cancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            :class="[
              'px-4 py-2 rounded text-sm font-medium text-white',
              tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : tone === 'warning'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-emerald-600 hover:bg-emerald-700',
            ]"
            @click="confirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { computed } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: "Onayla" },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "Tamam" },
    cancelLabel: { type: String, default: "İptal" },
    tone: { type: String, default: "primary" },
  });
  const emit = defineEmits(["confirm", "cancel", "update:open"]);

  const iconName = computed(() =>
    props.tone === "danger" ? "alert-triangle" : props.tone === "warning" ? "alert-circle" : "info"
  );
  const iconBg = computed(() =>
    props.tone === "danger"
      ? "bg-red-100 dark:bg-red-900/40"
      : props.tone === "warning"
        ? "bg-orange-100 dark:bg-orange-900/40"
        : "bg-emerald-100 dark:bg-emerald-900/40"
  );
  const iconColor = computed(() =>
    props.tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : props.tone === "warning"
        ? "text-orange-600 dark:text-orange-400"
        : "text-emerald-600 dark:text-emerald-400"
  );

  function confirm() {
    emit("confirm");
    emit("update:open", false);
  }

  function cancel() {
    emit("cancel");
    emit("update:open", false);
  }
</script>

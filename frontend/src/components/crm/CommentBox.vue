<template>
  <div class="border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-3">
    <textarea
      v-model="content"
      :placeholder="placeholder || t('commentBox.placeholder')"
      rows="3"
      class="w-full text-[13px] bg-transparent outline-none resize-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
    ></textarea>
    <div
      class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/10"
    >
      <div class="text-[10px] text-gray-400">{{ t("commentBox.mentionHint") }}</div>
      <button class="hdr-btn-primary" :disabled="saving || !content.trim()" @click="submit">
        <AppIcon name="send" :size="13" /><span>{{
          saving ? t("commentBox.submitting") : t("commentBox.addComment")
        }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  defineProps({
    placeholder: { type: String, default: "" },
  });

  const emit = defineEmits(["submit"]);

  const content = ref("");
  const saving = ref(false);

  async function submit() {
    if (!content.value.trim()) return;
    saving.value = true;
    try {
      await emit("submit", content.value.trim());
      content.value = "";
    } finally {
      saving.value = false;
    }
  }
</script>

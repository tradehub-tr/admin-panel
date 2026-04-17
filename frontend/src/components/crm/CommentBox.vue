<template>
  <div class="border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-3">
    <textarea
      v-model="content"
      :placeholder="placeholder"
      rows="3"
      class="w-full text-[13px] bg-transparent outline-none resize-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
    ></textarea>
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
      <div class="text-[10px] text-gray-400">@ ile kullanıcıyı bahset (yakında)</div>
      <button
        class="hdr-btn-primary"
        :disabled="saving || !content.trim()"
        @click="submit"
      >
        <AppIcon name="send" :size="13" /><span>{{ saving ? 'Gönderiliyor...' : 'Yorum Ekle' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  placeholder: { type: String, default: 'Bir yorum yaz...' },
})

const emit = defineEmits(['submit'])

const content = ref('')
const saving = ref(false)

async function submit() {
  if (!content.value.trim()) return
  saving.value = true
  try {
    await emit('submit', content.value.trim())
    content.value = ''
  } finally {
    saving.value = false
  }
}
</script>

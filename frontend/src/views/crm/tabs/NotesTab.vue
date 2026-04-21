<template>
  <div>
    <!-- Create new note -->
    <div
      class="mb-4 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
    >
      <input
        v-model="newNote.title"
        type="text"
        placeholder="Not başlığı..."
        class="w-full text-[13px] font-semibold bg-transparent border-none outline-none mb-2 text-gray-900 dark:text-gray-100 placeholder-gray-400"
      />
      <textarea
        v-model="newNote.content"
        placeholder="Not içeriği..."
        rows="3"
        class="w-full text-[12px] bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
      ></textarea>
      <div class="flex justify-end mt-2">
        <button
          class="hdr-btn-primary"
          :disabled="saving || !newNote.title.trim()"
          @click="createNote"
        >
          <AppIcon name="plus" :size="13" /><span>Not Ekle</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-6">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!notes.length" class="crm-empty">
      <div class="icon"><AppIcon name="sticky-note" :size="22" /></div>
      <h3>Not yok</h3>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="n in notes"
        :key="n.name"
        class="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
      >
        <div class="flex items-center justify-between mb-1">
          <h4 class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{{ n.title }}</h4>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-gray-400">
              <RelativeTime :value="n.modified" />
            </span>
            <button class="text-gray-400 hover:text-rose-500" title="Sil" @click="removeNote(n)">
              <AppIcon name="trash-2" :size="13" />
            </button>
          </div>
        </div>
        <p class="text-[12px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {{ n.content }}
        </p>
        <div class="text-[10px] text-gray-400 mt-2">— {{ (n.owner || "").split("@")[0] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from "vue";
  import { useCrmNoteStore } from "@/stores/crmNotes";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";

  const props = defineProps({
    doctype: { type: String, required: true },
    docname: { type: String, required: true },
  });

  const store = useCrmNoteStore();
  const toast = useToast();

  const notes = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const newNote = ref({ title: "", content: "" });

  async function load() {
    if (!props.docname || props.docname === "new") return;
    loading.value = true;
    try {
      notes.value = await store.fetchNotesForRef(props.doctype, props.docname);
    } finally {
      loading.value = false;
    }
  }

  async function createNote() {
    if (!newNote.value.title.trim()) return;
    saving.value = true;
    try {
      await store.createNote({
        title: newNote.value.title.trim(),
        content: newNote.value.content,
        reference_doctype: props.doctype,
        reference_docname: props.docname,
      });
      newNote.value = { title: "", content: "" };
      await load();
      toast.success("Not eklendi");
    } catch (e) {
      toast.error(e.message || "Eklenemedi");
    } finally {
      saving.value = false;
    }
  }

  async function removeNote(n) {
    if (!confirm(`"${n.title}" silinsin mi?`)) return;
    try {
      await store.deleteNote(n.name);
      notes.value = notes.value.filter((x) => x.name !== n.name);
      toast.success("Silindi");
    } catch (e) {
      toast.error(e.message || "Silinemedi");
    }
  }

  watch(() => props.docname, load, { immediate: true });
  onMounted(load);
</script>

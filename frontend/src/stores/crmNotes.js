/**
 * CRM Notes Store — FCRM Note DocType
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const NOTE_FIELDS = [
  "name",
  "title",
  "content",
  "reference_doctype",
  "reference_docname",
  "owner",
  "modified",
  "creation",
];

export const useCrmNoteStore = defineStore("crmNotes", () => {
  const notes = ref([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchNotes({
    page = 1,
    pageSize = 30,
    filters = [],
    orderBy = "modified desc",
  } = {}) {
    loading.value = true;
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList("FCRM Note", {
          fields: NOTE_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount("FCRM Note", filters),
      ]);
      notes.value = listRes.data || [];
      total.value = countRes.message || 0;
    } finally {
      loading.value = false;
    }
  }

  async function fetchNotesForRef(doctype, docname) {
    const res = await api.getList("FCRM Note", {
      fields: NOTE_FIELDS,
      filters: [
        ["reference_doctype", "=", doctype],
        ["reference_docname", "=", docname],
      ],
      order_by: "creation desc",
      limit_page_length: 200,
    });
    return res.data || [];
  }

  async function createNote(data) {
    const res = await api.createDoc("FCRM Note", data);
    return res.data;
  }

  async function updateNote(name, data) {
    const res = await api.updateDoc("FCRM Note", name, data);
    return res.data;
  }

  async function deleteNote(name) {
    return api.deleteDoc("FCRM Note", name);
  }

  return {
    notes,
    total,
    loading,
    fetchNotes,
    fetchNotesForRef,
    createNote,
    updateNote,
    deleteNote,
  };
});

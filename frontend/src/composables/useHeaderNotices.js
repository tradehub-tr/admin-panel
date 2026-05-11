import { ref } from "vue";
import api from "@/utils/api";

const RESOURCE = "Header Notice";
const FIELDS = [
  "name",
  "message_tr",
  "message_en",
  "link_text_tr",
  "link_text_en",
  "link_href",
  "icon",
  "is_active",
  "sort_order",
  "start_at",
  "end_at",
];

export function useHeaderNotices() {
  const notices = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.getList(RESOURCE, {
        fields: FIELDS,
        order_by: "sort_order asc",
        limit_page_length: 0,
      });
      notices.value = res?.data ?? [];
    } catch (err) {
      error.value = err.message || String(err);
    } finally {
      loading.value = false;
    }
  }

  async function save(payload) {
    if (payload.name) {
      const { name, ...body } = payload;
      await api.updateDoc(RESOURCE, name, body);
    } else {
      await api.createDoc(RESOURCE, payload);
    }
    await fetchAll();
  }

  async function remove(name) {
    await api.deleteDoc(RESOURCE, name);
    notices.value = notices.value.filter((n) => n.name !== name);
  }

  async function reorder(items) {
    // Her item için updateDoc — 5-10 item beklenir, batch endpoint açmaya değmez
    await Promise.all(
      items.map((it) => api.updateDoc(RESOURCE, it.name, { sort_order: it.sort_order })),
    );
  }

  async function toggleActive(notice) {
    await save({ name: notice.name, is_active: notice.is_active ? 0 : 1 });
  }

  return { notices, loading, error, fetchAll, save, remove, reorder, toggleActive };
}

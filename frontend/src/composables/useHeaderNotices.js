import { ref } from "vue";
import api from "@/utils/api";

const RESOURCE = "Header Notice";
const SETTINGS_RESOURCE = "Header Notice Settings";
const FIELDS = [
  "name",
  "message_tr",
  "message_en",
  "link_text_tr",
  "link_text_en",
  "link_href",
  "icon",
  "background_color",
  "is_active",
  "sort_order",
  "start_at",
  "end_at",
];

export function useHeaderNotices() {
  const notices = ref([]);
  const displayMode = ref("marquee");
  const loading = ref(false);
  const error = ref(null);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const [listRes, settingsRes] = await Promise.all([
        api.getList(RESOURCE, {
          fields: FIELDS,
          order_by: "sort_order asc",
          limit_page_length: 0,
        }),
        // Singleton için özel API: frappe.client.get_single_value
        api.callMethodGET("frappe.client.get_single_value", {
          doctype: SETTINGS_RESOURCE,
          field: "display_mode",
        }),
      ]);
      notices.value = listRes?.data ?? [];
      displayMode.value = settingsRes?.message ?? "marquee";
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
      items.map((it) => api.updateDoc(RESOURCE, it.name, { sort_order: it.sort_order }))
    );
  }

  async function toggleActive(notice) {
    await save({ name: notice.name, is_active: notice.is_active ? 0 : 1 });
  }

  async function setDisplayMode(mode) {
    const previous = displayMode.value;
    displayMode.value = mode; // optimistic
    try {
      // Singleton için özel API: frappe.client.set_value (PUT yerine method)
      await api.callMethod("frappe.client.set_value", {
        doctype: SETTINGS_RESOURCE,
        name: SETTINGS_RESOURCE,
        fieldname: "display_mode",
        value: mode,
      });
      error.value = null;
    } catch (err) {
      displayMode.value = previous; // revert
      error.value = err.message || "Mod kaydedilemedi";
      throw err;
    }
  }

  return {
    notices,
    displayMode,
    loading,
    error,
    fetchAll,
    save,
    remove,
    reorder,
    toggleActive,
    setDisplayMode,
  };
}

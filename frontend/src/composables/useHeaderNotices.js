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
  const displayMode = ref("marquee"); // sunucudaki kaydedilmiş değer
  const draftDisplayMode = ref("marquee"); // kullanıcı seçimi (kaydet butonuyla commit)
  const savingDisplayMode = ref(false);
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
      const saved = settingsRes?.message ?? "marquee";
      displayMode.value = saved;
      draftDisplayMode.value = saved;
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

  function setDraftDisplayMode(mode) {
    draftDisplayMode.value = mode;
  }

  async function saveDisplayMode() {
    if (draftDisplayMode.value === displayMode.value) return;
    savingDisplayMode.value = true;
    try {
      // REST resource PUT — Single doctype'ta da doc.save() fire eder ve
      // hooks.py'deki "Header Notice Settings.on_update" → invalidate_cache
      // tetiklenir. `frappe.client.set_value` Single'larda bazen hook'u atlıyor.
      await api.updateDoc(SETTINGS_RESOURCE, SETTINGS_RESOURCE, {
        display_mode: draftDisplayMode.value,
      });
      displayMode.value = draftDisplayMode.value;
      error.value = null;
    } catch (err) {
      error.value = err.message || "Mod kaydedilemedi";
      throw err;
    } finally {
      savingDisplayMode.value = false;
    }
  }

  return {
    notices,
    displayMode,
    draftDisplayMode,
    savingDisplayMode,
    loading,
    error,
    fetchAll,
    save,
    remove,
    reorder,
    toggleActive,
    setDraftDisplayMode,
    saveDisplayMode,
  };
}

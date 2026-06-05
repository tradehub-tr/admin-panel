import { ref } from "vue";
import api from "@/utils/api";

const RESOURCE = "Category Showcase Tile";
const SETTINGS_RESOURCE = "Category Showcase Settings";
const FIELDS = [
  "name",
  "tile_type",
  "col_span",
  "row_span",
  "is_active",
  "sort_order",
  "label_tr",
  "label_en",
  "image",
  "link_href",
  "hover_text_tr",
  "hover_text_en",
  "promo_badge_tr",
  "promo_badge_en",
  "promo_title_tr",
  "promo_title_en",
  "background_color",
  "cta_text_tr",
  "cta_text_en",
  "cta_href",
  "start_at",
  "end_at",
];

export function useCategoryShowcase() {
  const tiles = ref([]);
  const settings = ref({ is_enabled: 1, section_title_tr: "", section_title_en: "", columns: 4 });
  const draftSettings = ref({
    is_enabled: 1,
    section_title_tr: "",
    section_title_en: "",
    columns: 4,
  });
  const savingSettings = ref(false);
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
        api.callMethodGET("frappe.client.get", {
          doctype: SETTINGS_RESOURCE,
          name: SETTINGS_RESOURCE,
        }),
      ]);
      tiles.value = listRes?.data ?? [];
      const s = settingsRes?.message ?? {};
      const loaded = {
        is_enabled: s.is_enabled ?? 1,
        section_title_tr: s.section_title_tr ?? "",
        section_title_en: s.section_title_en ?? "",
        columns: s.columns ?? 4,
      };
      settings.value = { ...loaded };
      draftSettings.value = { ...loaded };
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
    tiles.value = tiles.value.filter((t) => t.name !== name);
  }

  async function reorder(items) {
    await Promise.all(
      items.map((it) => api.updateDoc(RESOURCE, it.name, { sort_order: it.sort_order }))
    );
  }

  async function toggleActive(tile) {
    await save({ name: tile.name, is_active: tile.is_active ? 0 : 1 });
  }

  // Önizlemeden sürükle/giriş ile boyut değişimi: optimistic güncelle, hata olursa geri al.
  async function updateSpan(name, col_span, row_span) {
    const prevTiles = tiles.value;
    tiles.value = tiles.value.map((t) => (t.name === name ? { ...t, col_span, row_span } : t));
    try {
      await api.updateDoc(RESOURCE, name, { col_span, row_span });
    } catch (err) {
      tiles.value = prevTiles;
      throw err;
    }
  }

  function setDraftSettings(patch) {
    draftSettings.value = { ...draftSettings.value, ...patch };
  }

  async function saveSettings() {
    savingSettings.value = true;
    try {
      await api.updateDoc(SETTINGS_RESOURCE, SETTINGS_RESOURCE, {
        is_enabled: draftSettings.value.is_enabled,
        section_title_tr: draftSettings.value.section_title_tr,
        section_title_en: draftSettings.value.section_title_en,
        columns: draftSettings.value.columns,
      });
      settings.value = { ...draftSettings.value };
      error.value = null;
    } catch (err) {
      error.value = err.message || "Ayarlar kaydedilemedi";
      throw err;
    } finally {
      savingSettings.value = false;
    }
  }

  return {
    tiles,
    settings,
    draftSettings,
    savingSettings,
    loading,
    error,
    fetchAll,
    save,
    remove,
    reorder,
    toggleActive,
    updateSpan,
    setDraftSettings,
    saveSettings,
  };
}

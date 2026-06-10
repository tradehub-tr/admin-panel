import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const VALUE_API = "tradehub_core.bulk_import.regex_lib";

export function useValueMapping() {
  const toast = useToast();
  // Satıcı değer eşleştirmeleri. Her kayıt: { name, target_field, enabled, rows: [{ source_value, target_value, enabled }] }
  const valueMappings = ref([]);
  const loading = ref(false);
  // target_field -> { kind, values: [{ value, label }], free } cache'i (dropdown beslemesi).
  const fieldValuesCache = ref({});

  async function fetchValueMappings() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${VALUE_API}.list_value_mappings`);
      valueMappings.value = res.message || [];
      return valueMappings.value;
    } catch (e) {
      toast.error(e.message || "Değer eşleştirmeleri yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function saveValueMapping({ targetField, rows }) {
    try {
      const res = await api.callMethod(`${VALUE_API}.save_value_mapping`, {
        target_field: targetField,
        rows_json: JSON.stringify(rows || []),
      });
      toast.success("Değer eşleştirmesi kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Değer eşleştirmesi kaydedilemedi");
      throw e;
    }
  }

  async function deleteValueMapping(name) {
    try {
      await api.callMethod(`${VALUE_API}.delete_value_mapping`, { name });
      toast.success("Değer eşleştirmesi silindi");
      valueMappings.value = valueMappings.value.filter((m) => m.name !== name);
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      throw e;
    }
  }

  async function loadFieldValues(targetField) {
    if (!targetField) return { kind: "free", values: [], free: true };
    if (fieldValuesCache.value[targetField]) return fieldValuesCache.value[targetField];
    try {
      const res = await api.callMethodGET(`${VALUE_API}.get_field_values`, {
        target_field: targetField,
      });
      const data = res.message || { kind: "free", values: [], free: true };
      fieldValuesCache.value = { ...fieldValuesCache.value, [targetField]: data };
      return data;
    } catch (e) {
      console.warn("Hedef alan değerleri yüklenemedi:", e);
      return { kind: "free", values: [], free: true };
    }
  }

  return {
    valueMappings,
    loading,
    fieldValuesCache,
    fetchValueMappings,
    saveValueMapping,
    deleteValueMapping,
    loadFieldValues,
  };
}

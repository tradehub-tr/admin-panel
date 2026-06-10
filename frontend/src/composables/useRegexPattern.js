import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const ALIAS_API = "tradehub_core.bulk_import.regex_lib";

export function useRegexPattern() {
  const toast = useToast();
  const patterns = ref([]);
  const canonicalFields = ref([]);
  // Satıcı sütun eşleştirmeleri (regex gizli). Her satır: { name, pattern_name, target_field, enabled }
  const aliases = ref([]);
  // Sistem (admin) sütun eşleştirmeleri — scope=System, TÜM satıcıları etkiler.
  const systemAliases = ref([]);
  // Sistem (admin) değer eşleştirmeleri. Her kayıt: { name, target_field, enabled, rows: [...] }
  const systemValueMappings = ref([]);
  // get_mapping_targets çıktısı: [{ label, fields: [{ key, label }] }]
  const targetGroups = ref([]);
  const loading = ref(false);

  async function fetchAll(filters = {}) {
    loading.value = true;
    try {
      const res = await api.getList("Regex Pattern Library", {
        filters,
        fields: [
          "name",
          "pattern_name",
          "target_field",
          "scope",
          "seller_profile",
          "pattern_category",
          "enabled",
          "priority",
        ],
        order_by: "priority asc",
        limit_page_length: 200,
      });
      patterns.value = res.data || [];
      return patterns.value;
    } catch (e) {
      toast.error(e.message || "Pattern'ler yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(name) {
    try {
      const res = await api.getDoc("Regex Pattern Library", name);
      return res.data;
    } catch (e) {
      toast.error(e.message || "Pattern detayı alınamadı");
      return null;
    }
  }

  async function savePattern(payload, name = null) {
    try {
      if (name) {
        await api.updateDoc("Regex Pattern Library", name, payload);
        toast.success("Pattern güncellendi");
        return name;
      }
      const res = await api.createDoc("Regex Pattern Library", payload);
      toast.success("Pattern oluşturuldu");
      return res.data?.name;
    } catch (e) {
      toast.error(e.message || "Pattern kaydedilemedi");
      throw e;
    }
  }

  async function deletePattern(name) {
    try {
      await api.deleteDoc("Regex Pattern Library", name);
      toast.success("Pattern silindi");
      patterns.value = patterns.value.filter((p) => p.name !== name);
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      throw e;
    }
  }

  async function togglePattern(name, enabled) {
    try {
      await api.updateDoc("Regex Pattern Library", name, {
        enabled: enabled ? 1 : 0,
      });
      const p = patterns.value.find((x) => x.name === name);
      if (p) p.enabled = enabled ? 1 : 0;
    } catch (e) {
      toast.error(e.message || "Durum değiştirilemedi");
    }
  }

  async function testPattern(regex, sample, flags = "IGNORECASE,UNICODE") {
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.regex_lib.test_pattern", {
        regex,
        sample,
        flags,
      });
      return res.message;
    } catch (e) {
      return { matched: false, match_text: null, error: e.message || "İstek başarısız" };
    }
  }

  async function loadCanonicalFields() {
    if (canonicalFields.value.length > 0) return canonicalFields.value;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.bulk_import.regex_lib.get_canonical_fields"
      );
      canonicalFields.value = res.message || [];
      return canonicalFields.value;
    } catch (e) {
      console.warn("Canonical fields yüklenemedi:", e);
      return [];
    }
  }

  // ── Sütun Eşleştirmelerim (satıcı) — regex gizli, backend güvenli regex üretir ──

  async function fetchAliases() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${ALIAS_API}.list_column_aliases`);
      aliases.value = res.message || [];
      return aliases.value;
    } catch (e) {
      toast.error(e.message || "Eşleştirmeler yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function saveColumnAlias({ myHeader, targetField, alternatives = "" }) {
    try {
      const res = await api.callMethod(`${ALIAS_API}.save_column_alias`, {
        my_header: myHeader,
        target_field: targetField,
        alternatives,
      });
      toast.success("Eşleştirme kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Eşleştirme kaydedilemedi");
      throw e;
    }
  }

  async function deleteAlias(name) {
    try {
      await api.callMethod(`${ALIAS_API}.delete_column_alias`, { name });
      toast.success("Eşleştirme silindi");
      aliases.value = aliases.value.filter((a) => a.name !== name);
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      throw e;
    }
  }

  async function loadTargetGroups() {
    if (targetGroups.value.length > 0) return targetGroups.value;
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.api.get_mapping_targets");
      targetGroups.value = res.message?.groups || [];
      return targetGroups.value;
    } catch (e) {
      console.warn("Eşleştirme hedefleri yüklenemedi:", e);
      return [];
    }
  }

  // ── Sistem (admin) eşleştirmeleri — scope=System, TÜM satıcıları etkiler ──
  // Satıcı save_column_alias/save_value_mapping desenini aynalar; backend güvenli
  // regex üretir, admin rol guard'ı uygular. Ham regex GÖRÜNMEZ.

  async function fetchSystemAliases() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${ALIAS_API}.list_system_aliases`);
      systemAliases.value = res.message || [];
      return systemAliases.value;
    } catch (e) {
      toast.error(e.message || "Sistem eşleştirmeleri yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function saveSystemColumnAlias({ myHeader, targetField, alternatives = "" }) {
    try {
      const res = await api.callMethod(`${ALIAS_API}.save_system_column_alias`, {
        my_header: myHeader,
        target_field: targetField,
        alternatives,
      });
      toast.success("Sistem eşleştirmesi kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Sistem eşleştirmesi kaydedilemedi");
      throw e;
    }
  }

  async function deleteSystemAlias(name) {
    try {
      await api.callMethod(`${ALIAS_API}.delete_system_alias`, { name });
      toast.success("Sistem eşleştirmesi silindi");
      systemAliases.value = systemAliases.value.filter((a) => a.name !== name);
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      throw e;
    }
  }

  async function fetchSystemValueMappings() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${ALIAS_API}.list_system_value_mappings`);
      systemValueMappings.value = res.message || [];
      return systemValueMappings.value;
    } catch (e) {
      toast.error(e.message || "Sistem değer eşleştirmeleri yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function saveSystemValueMapping({ targetField, rows }) {
    try {
      const res = await api.callMethod(`${ALIAS_API}.save_system_value_mapping`, {
        target_field: targetField,
        rows_json: JSON.stringify(rows || []),
      });
      toast.success("Sistem değer eşleştirmesi kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Sistem değer eşleştirmesi kaydedilemedi");
      throw e;
    }
  }

  async function deleteSystemValueMapping(name) {
    try {
      await api.callMethod(`${ALIAS_API}.delete_system_value_mapping`, { name });
      toast.success("Sistem değer eşleştirmesi silindi");
      systemValueMappings.value = systemValueMappings.value.filter((m) => m.name !== name);
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      throw e;
    }
  }

  // SKU/XML gelişmiş sistem deseni (Karar2=A) — kategoriye göre parametrik.
  // Price Normalizer / XML Tag: backend güvenli regex üretir (params).
  // SKU Filename: gated ham regex (params.regex).
  async function saveSystemAdvancedPattern({ category, targetField, params, patternName = "" }) {
    try {
      const res = await api.callMethod(`${ALIAS_API}.save_system_advanced_pattern`, {
        category,
        target_field: targetField,
        params_json: JSON.stringify(params || {}),
        pattern_name: patternName,
      });
      toast.success("Sistem deseni kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Sistem deseni kaydedilemedi");
      throw e;
    }
  }

  async function loadFieldValues(targetField) {
    if (!targetField) return { kind: "free", values: [], free: true };
    try {
      const res = await api.callMethodGET(`${ALIAS_API}.get_field_values`, {
        target_field: targetField,
      });
      return res.message || { kind: "free", values: [], free: true };
    } catch (e) {
      console.warn("Hedef alan değerleri yüklenemedi:", e);
      return { kind: "free", values: [], free: true };
    }
  }

  return {
    patterns,
    canonicalFields,
    aliases,
    systemAliases,
    systemValueMappings,
    targetGroups,
    loading,
    fetchAll,
    fetchOne,
    savePattern,
    deletePattern,
    togglePattern,
    testPattern,
    loadCanonicalFields,
    fetchAliases,
    saveColumnAlias,
    deleteAlias,
    loadTargetGroups,
    fetchSystemAliases,
    saveSystemColumnAlias,
    deleteSystemAlias,
    fetchSystemValueMappings,
    saveSystemValueMapping,
    deleteSystemValueMapping,
    saveSystemAdvancedPattern,
    loadFieldValues,
  };
}

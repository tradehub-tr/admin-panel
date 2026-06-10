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

  return {
    patterns,
    canonicalFields,
    aliases,
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
  };
}

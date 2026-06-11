/**
 * ECA Rule yönetimi için reusable composable.
 *
 * - Admin: fetchAllRules() ile tüm kurallar (filtreli)
 * - Satıcı: fetchMyRules() ile yalnız kendi Per-Seller kuralları
 * - Yardımcılar: saveRule / deleteRule / toggleRule / testCondition / fetchRuleLog
 *
 * Toast'lar burada — view'lerde tekrar göstermeye gerek yok.
 */
import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

export function useEcaRule() {
  const toast = useToast();
  const rules = ref([]);
  const loading = ref(false);

  async function fetchAllRules(filters = {}) {
    loading.value = true;
    try {
      const res = await api.getList("ECA Rule", {
        filters,
        fields: [
          "name",
          "rule_name",
          "enabled",
          "reference_doctype",
          "event",
          "rule_scope",
          "seller_profile",
          "owner_role",
          "execution_phase",
          "priority",
          "action_type",
          "last_fired_at",
          "total_fired_count",
        ],
        order_by: "priority asc",
        limit_page_length: 200,
      });
      rules.value = res.data || [];
      return rules.value;
    } catch (e) {
      toast.error(e.message || "Kurallar yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchMyRules() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.eca.api.get_my_rules");
      rules.value = res.message || [];
      return rules.value;
    } catch (e) {
      toast.error(e.message || "Kurallar yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function getRule(ruleName) {
    try {
      const res = await api.getDoc("ECA Rule", ruleName);
      return res.data;
    } catch (e) {
      toast.error(e.message || "Kural okunamadı");
      throw e;
    }
  }

  async function saveRule(payload, ruleName = null) {
    try {
      if (ruleName) {
        await api.updateDoc("ECA Rule", ruleName, payload);
        toast.success("Kural güncellendi");
        return ruleName;
      }
      const res = await api.createDoc("ECA Rule", payload);
      toast.success("Kural oluşturuldu");
      return res.data?.name || null;
    } catch (e) {
      toast.error(e.message || "Kural kaydedilemedi");
      throw e;
    }
  }

  async function deleteRule(ruleName) {
    try {
      await api.deleteDoc("ECA Rule", ruleName);
      toast.success("Kural silindi");
      rules.value = rules.value.filter((r) => r.name !== ruleName);
    } catch (e) {
      toast.error(e.message || "Kural silinemedi");
      throw e;
    }
  }

  async function toggleRule(ruleName, enabled) {
    try {
      await api.updateDoc("ECA Rule", ruleName, { enabled: enabled ? 1 : 0 });
      const r = rules.value.find((x) => x.name === ruleName);
      if (r) r.enabled = enabled ? 1 : 0;
    } catch (e) {
      toast.error(e.message || "Durum değiştirilemedi");
      // Optimistik durum geri al
      const r = rules.value.find((x) => x.name === ruleName);
      if (r) r.enabled = enabled ? 0 : 1;
    }
  }

  async function testCondition(condition, sampleDocJson = "{}", ownerRole = "Seller") {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.test_rule_with_sample", {
        condition,
        sample_doc_json: sampleDocJson,
        owner_role: ownerRole,
      });
      return res.message || { result: false, error: "Boş yanıt" };
    } catch (e) {
      return { result: false, error: e.message || "Test başarısız" };
    }
  }

  async function compilePreview(builderJson, referenceDoctype = "Listing") {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.compile_preview", {
        builder_json: builderJson,
        reference_doctype: referenceDoctype,
      });
      return res.message || { python: "", sentence: "", error: "Boş yanıt" };
    } catch (e) {
      return { python: "", sentence: "", error: e.message || "Önizleme başarısız" };
    }
  }

  async function getRuleSchema() {
    try {
      const res = await api.callMethodGET("tradehub_core.eca.api.get_rule_schema");
      return res.message || { fields: [], actions: [], writable_fields: [] };
    } catch (e) {
      toast.error(e.message || "Kural şeması yüklenemedi");
      return { fields: [], actions: [], writable_fields: [] };
    }
  }

  // Admin scope/seller_profile opsiyonel; satıcı çağrısında verilmez (backend yok sayar).
  async function countMatching(referenceDoctype, conditionBuilderJson, scope = null, sellerProfile = null) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.count_matching", {
        reference_doctype: referenceDoctype,
        condition_builder_json: conditionBuilderJson || "",
        scope: scope || "",
        seller_profile: sellerProfile || "",
      });
      return res.message || { count: 0, total: 0, error: "Boş yanıt" };
    } catch (e) {
      return { count: 0, total: 0, error: e.message || "Sayım başarısız" };
    }
  }

  async function previewRuleEffect({
    referenceDoctype = "Listing",
    conditionBuilderJson = "",
    actionKey,
    paramsJson = "{}",
    scope = null,
    sellerProfile = null,
  }) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.preview_rule_effect", {
        reference_doctype: referenceDoctype,
        condition_builder_json: conditionBuilderJson || "",
        action_key: actionKey,
        params_json: paramsJson || "{}",
        scope: scope || "",
        seller_profile: sellerProfile || "",
      });
      return res.message || { count: 0, total: 0, samples: [], error: "Boş yanıt" };
    } catch (e) {
      return { count: 0, total: 0, samples: [], error: e.message || "Önizleme başarısız" };
    }
  }

  async function detectConflicts({
    referenceDoctype = "Listing",
    conditionBuilderJson = "",
    actionKey,
    scope = "",
    sellerProfile = null,
    paramsJson = "{}",
    excludeRule = null,
  }) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.detect_rule_conflicts", {
        reference_doctype: referenceDoctype,
        condition_builder_json: conditionBuilderJson || "",
        action_key: actionKey,
        scope: scope || "",
        seller_profile: sellerProfile || "",
        params_json: paramsJson || "{}",
        exclude_rule: excludeRule || "",
      });
      return res.message || { conflicts: [], error: "Boş yanıt" };
    } catch (e) {
      return { conflicts: [], error: e.message || "Çakışma kontrolü başarısız" };
    }
  }

  async function testOnProduct({
    skuOrName,
    conditionBuilderJson = "",
    actionKey,
    paramsJson = "{}",
    scope = null,
    seller = null,
  }) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.test_rule_on_product", {
        sku_or_name: skuOrName,
        condition_builder_json: conditionBuilderJson || "",
        action_key: actionKey,
        params_json: paramsJson || "{}",
        scope: scope || "",
        seller: seller || "",
      });
      return res.message || { found: false, matches: false, samples: [], error: "Boş yanıt" };
    } catch (e) {
      return { found: false, matches: false, samples: [], error: e.message || "Test başarısız" };
    }
  }

  async function getVersions(ruleName) {
    try {
      const res = await api.callMethodGET("tradehub_core.eca.api.get_rule_versions", {
        rule_name: ruleName,
      });
      return res.message || { versions: [], error: "Boş yanıt" };
    } catch (e) {
      return { versions: [], error: e.message || "Versiyon geçmişi yüklenemedi" };
    }
  }

  async function restoreVersion(ruleName, versionName) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.restore_rule_version", {
        rule_name: ruleName,
        version_name: versionName,
      });
      const out = res.message || { ok: false, error: "Boş yanıt" };
      if (out.ok) toast.success("Kural seçilen sürüme geri döndürüldü");
      else if (out.error) toast.error(out.error);
      return out;
    } catch (e) {
      toast.error(e.message || "Geri yükleme başarısız");
      return { ok: false, reverted_fields: [], error: e.message };
    }
  }

  async function saveWizardRule(payload) {
    try {
      const res = await api.callMethod("tradehub_core.eca.api.save_wizard_rule", {
        payload: JSON.stringify(payload),
      });
      toast.success(payload.name ? "Kural güncellendi" : "Kural oluşturuldu");
      return res.message || null;
    } catch (e) {
      toast.error(e.message || "Kural kaydedilemedi");
      throw e;
    }
  }

  async function fetchRuleLog(filters = {}) {
    try {
      const res = await api.callMethodGET("tradehub_core.eca.api.get_rule_log", filters);
      return res.message || [];
    } catch (e) {
      toast.error(e.message || "Log yüklenemedi");
      return [];
    }
  }

  async function fetchActionTemplates(actionType = null) {
    try {
      const filters = {};
      if (actionType) filters.action_type = actionType;
      const res = await api.getList("ECA Action Template", {
        filters,
        fields: ["name", "template_name", "action_type", "description"],
        order_by: "template_name asc",
        limit_page_length: 100,
      });
      return res.data || [];
    } catch (e) {
      toast.error(e.message || "Aksiyon şablonları yüklenemedi");
      return [];
    }
  }

  return {
    rules,
    loading,
    fetchAllRules,
    fetchMyRules,
    getRule,
    saveRule,
    deleteRule,
    toggleRule,
    testCondition,
    compilePreview,
    getRuleSchema,
    countMatching,
    previewRuleEffect,
    detectConflicts,
    testOnProduct,
    getVersions,
    restoreVersion,
    saveWizardRule,
    fetchRuleLog,
    fetchActionTemplates,
  };
}

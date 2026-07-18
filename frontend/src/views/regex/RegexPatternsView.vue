<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useRegexPattern } from "@/composables/useRegexPattern";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();
  // <768px'te tablolar yerine kart listesi render edilir.
  const { isLg } = useBreakpoint();

  // Sayfa-içi onboarding: filtre/durum → desen listesi → yeni desen ekle.
  usePageTour("regex-patterns", () => [
    {
      target: '[data-tour="rgx-filters"]',
      title: t("tourSteps.page.rgxFilters_t"),
      desc: t("tourSteps.page.rgxFilters_d"),
    },
    {
      target: '[data-tour="rgx-table"]',
      title: t("tourSteps.page.rgxTable_t"),
      desc: t("tourSteps.page.rgxTable_d"),
    },
    {
      target: '[data-tour="rgx-add"]',
      title: t("tourSteps.page.rgxAdd_t"),
      desc: t("tourSteps.page.rgxAdd_d"),
    },
  ]);

  const {
    patterns,
    canonicalFields,
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
    fetchSystemAliases,
    saveSystemColumnAlias,
    deleteSystemAlias,
    fetchSystemValueMappings,
    saveSystemValueMapping,
    deleteSystemValueMapping,
    saveSystemAdvancedPattern,
    loadFieldValues,
    loadTargetGroups,
  } = useRegexPattern();

  // Üç sekme: "column" (Sütun Adı — başlık→alan) | "value" (Değer — gelen→hedef) |
  // "advanced" (SKU/XML — ham regex, gated/teknik).
  const activeTab = ref("column");

  // key -> { label, groupLabel } eşlemesi; liste chip'i ve önizleme için.
  const targetIndex = computed(() => {
    const map = {};
    for (const g of targetGroups.value) {
      for (const f of g.fields) map[f.key] = { label: f.label, groupLabel: g.label };
    }
    return map;
  });
  const targetLabel = (key) => targetIndex.value[key]?.label || key;

  // ── SEKME 1: Sütun Adı (sistem sütun eşleştirmesi) ────────────────────────
  const showColModal = ref(false);
  const colEditingName = ref(null);
  const colSaving = ref(false);
  const emptyColForm = () => ({ myHeader: "", targetField: "", alternatives: "" });
  const colForm = ref(emptyColForm());

  const colTargetLabel = computed(() =>
    colForm.value.targetField ? targetLabel(colForm.value.targetField) : ""
  );

  function openColCreate() {
    colEditingName.value = null;
    colForm.value = emptyColForm();
    showColModal.value = true;
  }

  async function openColEdit(name) {
    const doc = await fetchOne(name);
    if (!doc) return;
    colEditingName.value = name;
    // pattern_name backend formatı: "Sistem — <my_header> → <target_field>".
    // Regex'ten metin türetilmez; başlığı pattern_name'den ayıklarız, alternatifler okunmaz.
    const header = (doc.pattern_name || "").split("—").pop()?.split("→")[0]?.trim() || "";
    colForm.value = {
      myHeader: header,
      targetField: doc.target_field || "",
      alternatives: "",
    };
    showColModal.value = true;
  }

  function closeColModal() {
    showColModal.value = false;
    colEditingName.value = null;
    colForm.value = emptyColForm();
  }

  async function onColSave() {
    if (!colForm.value.myHeader.trim() || !colForm.value.targetField) return;
    colSaving.value = true;
    try {
      // Düzenlemede backend regex'i yeniden üretir; çakışmayı önlemek için önce sil.
      if (colEditingName.value) await deleteSystemAlias(colEditingName.value);
      await saveSystemColumnAlias({
        myHeader: colForm.value.myHeader.trim(),
        targetField: colForm.value.targetField,
        alternatives: colForm.value.alternatives.trim(),
      });
      closeColModal();
      await fetchSystemAliases();
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      colSaving.value = false;
    }
  }

  async function onColDelete(name) {
    if (!confirm(t("systemMappings.deleteConfirm"))) return;
    await deleteSystemAlias(name);
  }

  // ── SEKME 2: Değer (sistem değer eşleştirmesi) ────────────────────────────
  const showVmModal = ref(false);
  const vmEditingName = ref(null);
  const vmSaving = ref(false);
  const vmFieldValues = ref({ kind: "free", values: [], free: true });
  const vmLoadingValues = ref(false);
  const emptyVmRow = () => ({ source_value: "", target_value: "" });
  const vmForm = ref({ targetField: "", rows: [emptyVmRow()] });

  const vmHasDropdown = computed(
    () => !vmFieldValues.value.free && vmFieldValues.value.values.length > 0
  );

  async function onVmFieldChange() {
    vmLoadingValues.value = true;
    try {
      vmFieldValues.value = await loadFieldValues(vmForm.value.targetField);
    } finally {
      vmLoadingValues.value = false;
    }
  }

  function addVmRow() {
    vmForm.value.rows.push(emptyVmRow());
  }
  function removeVmRow(index) {
    vmForm.value.rows.splice(index, 1);
    if (vmForm.value.rows.length === 0) vmForm.value.rows.push(emptyVmRow());
  }

  function openVmCreate() {
    vmEditingName.value = null;
    vmForm.value = { targetField: "", rows: [emptyVmRow()] };
    vmFieldValues.value = { kind: "free", values: [], free: true };
    showVmModal.value = true;
  }

  async function openVmEdit(item) {
    vmEditingName.value = item.name;
    vmForm.value = {
      targetField: item.target_field,
      rows: (item.rows || []).map((r) => ({
        source_value: r.source_value,
        target_value: r.target_value,
      })),
    };
    if (vmForm.value.rows.length === 0) vmForm.value.rows.push(emptyVmRow());
    showVmModal.value = true;
    await onVmFieldChange();
  }

  function closeVmModal() {
    showVmModal.value = false;
    vmEditingName.value = null;
    vmForm.value = { targetField: "", rows: [emptyVmRow()] };
  }

  async function onVmSave() {
    if (!vmForm.value.targetField) return;
    const rows = vmForm.value.rows
      .map((r) => ({ source_value: r.source_value.trim(), target_value: r.target_value.trim() }))
      .filter((r) => r.source_value && r.target_value);
    if (rows.length === 0) return;
    vmSaving.value = true;
    try {
      await saveSystemValueMapping({ targetField: vmForm.value.targetField, rows });
      closeVmModal();
      await fetchSystemValueMappings();
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      vmSaving.value = false;
    }
  }

  async function onVmDelete(name) {
    if (!confirm(t("systemMappings.deleteConfirm"))) return;
    await deleteSystemValueMapping(name);
  }

  // ── SEKME 3: SKU/XML (gelişmiş — ham regex, teknik/gated) ─────────────────
  const { viewMode } = useListViewMode("regex-patterns", "table");

  const CATEGORIES = [
    { value: "", label: t("regexPatterns.categoryAll") },
    { value: "SKU Filename", label: t("regexPatterns.categorySkuFilename") },
    { value: "Price Normalizer", label: t("regexPatterns.categoryPriceNormalizer") },
    { value: "XML Tag", label: t("regexPatterns.categoryXmlTag") },
  ];
  const STATUS_OPTIONS = [
    { value: "all", label: t("regexPatterns.statusAll") },
    { value: "active", label: t("regexPatterns.statusActive") },
    { value: "inactive", label: t("regexPatterns.statusInactive") },
  ];

  // Önizleme ayraç etiketleri için backend anahtarları (regex_lib._PRICE_SEPARATORS).
  const SEP_LABELS = computed(() => ({
    comma: t("systemMappings.sepComma"),
    dot: t("systemMappings.sepDot"),
    none: t("systemMappings.sepNone"),
  }));

  const filterCategory = ref("");
  const filterStatus = ref("all");
  const showAdvModal = ref(false);
  const advEditingName = ref(null);
  const advSaving = ref(false);

  // Karar2=A — parametrik oluşturma formu. Kategori seçimi alt-formu belirler:
  //  Price Normalizer / XML Tag → tıklama-parametrik (regex'i SİSTEM üretir).
  //  SKU Filename → gated ham regex (uzman modu açılınca).
  const emptyAdvForm = () => ({
    category: "Price Normalizer",
    target_field: "",
    pattern_name: "",
    price: { decimal_sep: "comma", thousands_sep: "dot" },
    xml: { tag: "", attribute: "" },
    sku: { regex: "", test_sample: "", _test_result: null },
  });
  const advForm = ref(emptyAdvForm());
  // Ham regex yalnız uzman modu açıkça açılınca düzenlenebilir (gated).
  const skuExpertUnlocked = ref(false);

  // Düzenleme: mevcut sistem desenleri ham regex saklar → ayrı gated ham-regex editörü.
  const emptyRawForm = () => ({
    pattern_name: "",
    target_field: "",
    target_doctype: "Listing",
    scope: "System",
    pattern_category: "SKU Filename",
    priority: 100,
    enabled: 1,
    patterns: [],
  });
  const showRawModal = ref(false);
  const rawForm = ref(emptyRawForm());

  // Canlı önizleme metinleri — regex göstermeden ne yapılacağını anlatır.
  const pricePreview = computed(() => {
    const dec = SEP_LABELS.value[advForm.value.price.decimal_sep] || "";
    const thou = SEP_LABELS.value[advForm.value.price.thousands_sep] || "";
    return t("systemMappings.pricePreviewBody", { decimal: dec, thousands: thou });
  });
  const xmlPreview = computed(() => {
    const tag = advForm.value.xml.tag.trim();
    const fieldKey = advForm.value.target_field;
    return tag
      ? t("systemMappings.xmlPreviewBody", { tag, field: targetLabel(fieldKey) || fieldKey })
      : "";
  });

  // Gelişmiş sekme yalnızca ham-regex (Column Header DIŞI) sistem desenlerini listeler;
  // "Sütun Adı" katmanı kendi sekmesinde yönetilir.
  const advPatterns = computed(() =>
    patterns.value.filter((p) => {
      if (p.pattern_category === "Column Header") return false;
      if (filterCategory.value && p.pattern_category !== filterCategory.value) return false;
      if (filterStatus.value === "active" && !p.enabled) return false;
      if (filterStatus.value === "inactive" && p.enabled) return false;
      return true;
    })
  );

  const CATEGORY_LABELS = computed(() => ({
    "SKU Filename": t("regexPatterns.categorySkuFilename"),
    "Price Normalizer": t("regexPatterns.categoryPriceNormalizer"),
    "XML Tag": t("regexPatterns.categoryXmlTag"),
    "Column Header": t("regexPatterns.categoryColumnHeader"),
  }));
  const categoryLabel = (c) => CATEGORY_LABELS.value[c] || c;

  function categoryBadgeCls(c) {
    switch (c) {
      case "SKU Filename":
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
      case "Price Normalizer":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "XML Tag":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  function openAdvCreate() {
    advForm.value = emptyAdvForm();
    if (canonicalFields.value.length) advForm.value.target_field = canonicalFields.value[0];
    skuExpertUnlocked.value = false;
    showAdvModal.value = true;
  }

  function closeAdvModal() {
    showAdvModal.value = false;
    advForm.value = emptyAdvForm();
    skuExpertUnlocked.value = false;
  }

  async function runSkuTest() {
    const sku = advForm.value.sku;
    if (!sku.regex || !sku.test_sample) {
      sku._test_result = { matched: false, error: t("regexPatterns.regexAndSampleRequired") };
      return;
    }
    sku._test_result = await testPattern(sku.regex, sku.test_sample, "IGNORECASE,UNICODE");
  }

  function advParams() {
    const f = advForm.value;
    if (f.category === "Price Normalizer") return f.price;
    if (f.category === "XML Tag")
      return { tag: f.xml.tag.trim(), attribute: f.xml.attribute.trim() };
    return { regex: f.sku.regex.trim() };
  }

  function advCanSave() {
    const f = advForm.value;
    if (!f.target_field) return false;
    if (f.category === "XML Tag") return !!f.xml.tag.trim();
    if (f.category === "SKU Filename") return !!f.sku.regex.trim();
    return true; // Price Normalizer — varsayılan ayraçlar geçerli
  }

  async function onAdvSave() {
    if (!advCanSave()) return;
    advSaving.value = true;
    try {
      await saveSystemAdvancedPattern({
        category: advForm.value.category,
        targetField: advForm.value.target_field,
        params: advParams(),
        patternName: advForm.value.pattern_name.trim(),
      });
      closeAdvModal();
      await fetchAll({ scope: "System" });
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      advSaving.value = false;
    }
  }

  // ── Ham regex düzenleme (gated) — mevcut sistem desenleri ham regex saklar ──
  async function openRawEdit(name) {
    const doc = await fetchOne(name);
    if (!doc) return;
    advEditingName.value = name;
    rawForm.value = {
      pattern_name: doc.pattern_name,
      target_field: doc.target_field,
      target_doctype: doc.target_doctype || "Listing",
      scope: doc.scope,
      pattern_category: doc.pattern_category,
      priority: doc.priority ?? 100,
      enabled: doc.enabled ? 1 : 0,
      patterns: (doc.patterns || []).map((p) => ({
        regex: p.regex,
        description: p.description || "",
        // Eski kayıtlarda flags alanına JSON objesi ({}) sızmış olabilir —
        // input'a bağlanınca "[object Object]" görünüyordu; string değilse default'a düş.
        flags: typeof p.flags === "string" && p.flags ? p.flags : "IGNORECASE,UNICODE",
        enabled: p.enabled ? 1 : 0,
        test_sample: p.test_sample || "",
        _test_result: null,
      })),
    };
    if (!rawForm.value.patterns.length) addRawEntry();
    showRawModal.value = true;
  }

  function closeRawModal() {
    showRawModal.value = false;
    advEditingName.value = null;
    rawForm.value = emptyRawForm();
  }

  function addRawEntry() {
    rawForm.value.patterns.push({
      regex: "",
      description: "",
      flags: "IGNORECASE,UNICODE",
      enabled: 1,
      test_sample: "",
      _test_result: null,
    });
  }
  function removeRawEntry(idx) {
    rawForm.value.patterns.splice(idx, 1);
  }

  async function runRawTest(idx) {
    const entry = rawForm.value.patterns[idx];
    if (!entry.regex || !entry.test_sample) {
      entry._test_result = { matched: false, error: t("regexPatterns.regexAndSampleRequired") };
      return;
    }
    entry._test_result = await testPattern(entry.regex, entry.test_sample, entry.flags);
  }

  async function onRawSave() {
    if (!rawForm.value.pattern_name || !rawForm.value.target_field) return;
    advSaving.value = true;
    try {
      const payload = {
        pattern_name: rawForm.value.pattern_name,
        target_field: rawForm.value.target_field,
        target_doctype: rawForm.value.target_doctype,
        scope: rawForm.value.scope,
        pattern_category: rawForm.value.pattern_category,
        priority: Number(rawForm.value.priority) || 100,
        enabled: rawForm.value.enabled ? 1 : 0,
        patterns: rawForm.value.patterns
          .filter((p) => p.regex)
          .map((p) => ({
            regex: p.regex,
            description: p.description || "",
            flags: typeof p.flags === "string" && p.flags ? p.flags : "IGNORECASE,UNICODE",
            enabled: p.enabled ? 1 : 0,
            test_sample: p.test_sample || "",
          })),
      };
      await savePattern(payload, advEditingName.value);
      closeRawModal();
      await fetchAll({ scope: "System" });
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      advSaving.value = false;
    }
  }

  async function onAdvDelete(name) {
    if (!confirm(t("regexPatterns.deleteConfirm"))) return;
    await deletePattern(name);
  }

  onMounted(async () => {
    await loadTargetGroups();
    await loadCanonicalFields();
    await Promise.all([
      fetchSystemAliases(),
      fetchSystemValueMappings(),
      fetchAll({ scope: "System" }),
    ]);
  });
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ t("regexPatterns.title") }}
      </h1>
      <p class="text-xs text-gray-400 max-w-xl mt-1">
        {{ t("systemMappings.subtitle") }}
      </p>
    </div>

    <!-- Uyarı: sistem desenleri tüm satıcıları etkiler -->
    <div class="warn-note mb-4">
      <AppIcon name="alert-triangle" :size="16" class="flex-none" />
      <span>{{ t("systemMappings.affectsAllNote") }}</span>
    </div>

    <!-- Sekme barı: Sütun Adı | Değer | SKU/XML (gelişmiş) -->
    <div class="tabbar" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'column' }"
        :aria-selected="activeTab === 'column'"
        @click="activeTab = 'column'"
      >
        <AppIcon name="columns" :size="14" /><span>{{ t("systemMappings.columnTab") }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'value' }"
        :aria-selected="activeTab === 'value'"
        @click="activeTab = 'value'"
      >
        <AppIcon name="replace" :size="14" /><span>{{ t("systemMappings.valueTab") }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'advanced' }"
        :aria-selected="activeTab === 'advanced'"
        @click="activeTab = 'advanced'"
      >
        <AppIcon name="code" :size="14" /><span>{{ t("systemMappings.advancedTab") }}</span>
        <span class="gated-badge">{{ t("systemMappings.gatedBadge") }}</span>
      </button>
    </div>

    <!-- ════════ SEKME 1: Sütun Adı ════════ -->
    <div v-show="activeTab === 'column'">
      <div class="rgx-actions">
        <button class="hdr-btn-outlined" @click="fetchSystemAliases">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("systemMappings.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openColCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("systemMappings.addColumn") }}</span>
        </button>
      </div>

      <div v-if="loading" class="card p-3">
        <Skeleton variant="row" :count="7" />
      </div>
      <div v-else-if="systemAliases.length === 0" class="card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <AppIcon name="columns" :size="24" class="text-gray-400" />
        </div>
        <h3 class="text-sm font-bold text-gray-700 mb-1">
          {{ t("systemMappings.columnEmptyTitle") }}
        </h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          {{ t("systemMappings.columnEmptyHint") }}
        </p>
      </div>

      <!-- Mobil: takma ad kartları (tablo yalnızca desktop) -->
      <div v-else-if="!isLg" class="rgx-cards">
        <article v-for="item in systemAliases" :key="item.name" class="rgx-card">
          <h3 class="rgx-c-name">{{ item.pattern_name }}</h3>
          <div class="rgx-c-chips">
            <span class="chip-map">{{ targetLabel(item.target_field) }}</span>
            <span v-if="item.match_count" class="chip-usage">
              {{ t("systemMappings.usageCount", { count: item.match_count }) }}
            </span>
            <span v-else class="chip-usage-none">{{ t("systemMappings.usageNone") }}</span>
            <span class="chip-sys">{{ t("systemMappings.scopeSystem") }}</span>
          </div>
          <div class="rgx-c-actions">
            <!-- Kısa etiket: ecaRules.edit ("Düzenle") tüm dillerde mevcut, kart butonuna sığar -->
            <button type="button" class="rgx-btn" @click="openColEdit(item.name)">
              <AppIcon name="edit-2" :size="13" />
              {{ t("ecaRules.edit") }}
            </button>
            <button type="button" class="rgx-btn danger" @click="onColDelete(item.name)">
              <AppIcon name="trash-2" :size="13" />
              {{ t("systemMappings.delete") }}
            </button>
          </div>
        </article>
      </div>

      <!-- Liste: desen → alan → kapsam(Sistem) -->
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="tbl-th">{{ t("systemMappings.colPattern") }}</th>
                <th class="tbl-th">{{ t("systemMappings.colTargetField") }}</th>
                <th class="tbl-th">{{ t("systemMappings.colUsage") }}</th>
                <th class="tbl-th">{{ t("systemMappings.colScope") }}</th>
                <th class="tbl-th text-right">{{ t("systemMappings.colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in systemAliases"
                :key="item.name"
                class="tbl-row border-b border-gray-50"
              >
                <td class="tbl-td">
                  <p class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                    {{ item.pattern_name }}
                  </p>
                </td>
                <td class="tbl-td">
                  <span class="chip-map">{{ targetLabel(item.target_field) }}</span>
                </td>
                <td class="tbl-td">
                  <span v-if="item.match_count" class="chip-usage">
                    {{ t("systemMappings.usageCount", { count: item.match_count }) }}
                  </span>
                  <span v-else class="chip-usage-none">{{ t("systemMappings.usageNone") }}</span>
                </td>
                <td class="tbl-td">
                  <span class="chip-sys">{{ t("systemMappings.scopeSystem") }}</span>
                </td>
                <td class="tbl-td text-right">
                  <button class="tbl-action-btn" @click="openColEdit(item.name)">
                    <AppIcon name="edit-2" :size="13" />
                  </button>
                  <button class="tbl-action-btn ml-1" @click="onColDelete(item.name)">
                    <AppIcon name="trash-2" :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- ════════ /SEKME 1 ════════ -->

    <!-- ════════ SEKME 2: Değer ════════ -->
    <div v-show="activeTab === 'value'">
      <div class="rgx-actions">
        <button class="hdr-btn-outlined" @click="fetchSystemValueMappings">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("systemMappings.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openVmCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("systemMappings.addValue") }}</span>
        </button>
      </div>

      <div v-if="loading" class="card p-3">
        <Skeleton variant="row" :count="7" />
      </div>
      <div v-else-if="systemValueMappings.length === 0" class="card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <AppIcon name="replace" :size="24" class="text-gray-400" />
        </div>
        <h3 class="text-sm font-bold text-gray-700 mb-1">
          {{ t("systemMappings.valueEmptyTitle") }}
        </h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          {{ t("systemMappings.valueEmptyHint") }}
        </p>
      </div>

      <!-- Mobil: değer eşleştirme kartları (tablo yalnızca desktop) -->
      <div v-else-if="!isLg" class="rgx-cards">
        <article v-for="item in systemValueMappings" :key="item.name" class="rgx-card">
          <div class="rgx-c-top">
            <span class="chip-map">{{ targetLabel(item.target_field) }}</span>
            <span class="chip-sys">{{ t("systemMappings.scopeSystem") }}</span>
          </div>
          <div class="rgx-c-chips">
            <span
              v-for="(row, i) in item.rows"
              :key="i"
              class="map-chip rgx-map-chip"
              :title="`${row.source_value} → ${row.target_value}`"
            >
              {{ row.source_value }} &rarr; {{ row.target_value }}
            </span>
          </div>
          <div class="rgx-c-actions">
            <button type="button" class="rgx-btn" @click="openVmEdit(item)">
              <AppIcon name="edit-2" :size="13" />
              {{ t("ecaRules.edit") }}
            </button>
            <button type="button" class="rgx-btn danger" @click="onVmDelete(item.name)">
              <AppIcon name="trash-2" :size="13" />
              {{ t("systemMappings.delete") }}
            </button>
          </div>
        </article>
      </div>

      <!-- Liste: hedef alan → eşleştirmeler → kapsam(Sistem) -->
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="tbl-th">{{ t("systemMappings.colTargetField") }}</th>
                <th class="tbl-th">{{ t("systemMappings.colMappings") }}</th>
                <th class="tbl-th">{{ t("systemMappings.colScope") }}</th>
                <th class="tbl-th text-right">{{ t("systemMappings.colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in systemValueMappings"
                :key="item.name"
                class="tbl-row border-b border-gray-50"
              >
                <td class="tbl-td">
                  <span class="chip-map">{{ targetLabel(item.target_field) }}</span>
                </td>
                <td class="tbl-td">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="(row, i) in item.rows"
                      :key="i"
                      class="map-chip"
                      :title="`${row.source_value} → ${row.target_value}`"
                    >
                      {{ row.source_value }} &rarr; {{ row.target_value }}
                    </span>
                  </div>
                </td>
                <td class="tbl-td">
                  <span class="chip-sys">{{ t("systemMappings.scopeSystem") }}</span>
                </td>
                <td class="tbl-td text-right">
                  <button class="tbl-action-btn" @click="openVmEdit(item)">
                    <AppIcon name="edit-2" :size="13" />
                  </button>
                  <button class="tbl-action-btn ml-1" @click="onVmDelete(item.name)">
                    <AppIcon name="trash-2" :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- ════════ /SEKME 2 ════════ -->

    <!-- ════════ SEKME 3: SKU/XML (gelişmiş) ════════ -->
    <div v-show="activeTab === 'advanced'">
      <div class="info-note mb-4">
        <AppIcon name="info" :size="16" class="flex-none" />
        <span>{{ t("systemMappings.advancedParamNote") }}</span>
      </div>

      <div class="card mb-4 !p-3" data-tour="rgx-filters">
        <div class="rgx-adv-filters">
          <select v-model="filterCategory" class="form-input-sm w-auto">
            <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <select v-model="filterStatus" class="form-input-sm w-auto">
            <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
          <ViewModeToggle v-model="viewMode" :modes="['table', 'list']" class="rgx-adv-toggle" />
          <button class="hdr-btn-primary" @click="openAdvCreate">
            <AppIcon name="plus" :size="14" /><span>{{
              t("systemMappings.newAdvancedPattern")
            }}</span>
          </button>
        </div>
      </div>

      <div data-tour="rgx-table">
        <div v-if="loading" class="card p-3">
          <Skeleton variant="row" :count="7" />
        </div>
        <div v-else-if="advPatterns.length === 0" class="card text-center py-12">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center"
          >
            <AppIcon name="layers" :size="24" class="text-gray-400" />
          </div>
          <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("regexPatterns.emptyTitle") }}</h3>
          <p class="text-xs text-gray-400">{{ t("systemMappings.advancedEmptyHint") }}</p>
        </div>

        <!-- Mobil: gelişmiş desen kartları (tablo/liste yalnızca desktop) -->
        <div v-else-if="!isLg" class="rgx-cards">
          <article
            v-for="item in advPatterns"
            :key="item.name"
            class="rgx-card"
            :class="{ off: !item.enabled }"
          >
            <div class="rgx-c-top">
              <h3 class="rgx-c-name">{{ item.pattern_name }}</h3>
              <label class="toggle-mini">
                <input
                  type="checkbox"
                  :checked="!!item.enabled"
                  @change="togglePattern(item.name, $event.target.checked)"
                />
                <span class="slider"></span>
              </label>
            </div>
            <p class="rgx-c-mono">{{ item.name }}</p>
            <div class="rgx-c-chips">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                :class="categoryBadgeCls(item.pattern_category)"
              >
                {{ categoryLabel(item.pattern_category) }}
              </span>
              <span class="rgx-c-mono-chip">{{ item.target_field }}</span>
              <span class="rgx-c-prio">
                {{ t("regexPatterns.colPriority") }}: {{ item.priority }}
              </span>
            </div>
            <div class="rgx-c-actions">
              <button type="button" class="rgx-btn" @click="openRawEdit(item.name)">
                <AppIcon name="edit-2" :size="13" />
                {{ t("ecaRules.edit") }}
              </button>
              <button type="button" class="rgx-btn danger" @click="onAdvDelete(item.name)">
                <AppIcon name="trash-2" :size="13" />
                {{ t("systemMappings.delete") }}
              </button>
            </div>
          </article>
        </div>

        <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
          <div
            v-for="item in advPatterns"
            :key="item.name"
            class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5"
          >
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                {{ item.pattern_name }}
              </p>
              <p class="text-[10px] text-gray-400 font-mono truncate">{{ item.target_field }}</p>
            </div>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium flex-none"
              :class="categoryBadgeCls(item.pattern_category)"
            >
              {{ categoryLabel(item.pattern_category) }}
            </span>
            <span
              class="text-[10px] font-semibold flex-none w-14 text-right"
              :class="item.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
            >
              {{
                item.enabled ? t("regexPatterns.statusActive") : t("regexPatterns.statusInactive")
              }}
            </span>
            <div class="flex-none">
              <button class="tbl-action-btn" @click="openRawEdit(item.name)">
                <AppIcon name="edit-2" :size="13" />
              </button>
              <button class="tbl-action-btn ml-1" @click="onAdvDelete(item.name)">
                <AppIcon name="trash-2" :size="13" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="card p-0 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-100">
                  <th class="tbl-th">{{ t("regexPatterns.colName") }}</th>
                  <th class="tbl-th">{{ t("regexPatterns.colTargetField") }}</th>
                  <th class="tbl-th">{{ t("regexPatterns.colCategory") }}</th>
                  <th class="tbl-th">{{ t("regexPatterns.colPriority") }}</th>
                  <th class="tbl-th">{{ t("regexPatterns.colActive") }}</th>
                  <th class="tbl-th text-right">{{ t("regexPatterns.colActions") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in advPatterns"
                  :key="item.name"
                  class="tbl-row border-b border-gray-50"
                >
                  <td class="tbl-td">
                    <p class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {{ item.pattern_name }}
                    </p>
                    <p class="text-[10px] text-gray-400 font-mono">{{ item.name }}</p>
                  </td>
                  <td class="tbl-td">
                    <span class="text-xs text-gray-600 font-mono dark:text-gray-300">
                      {{ item.target_field }}
                    </span>
                  </td>
                  <td class="tbl-td">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                      :class="categoryBadgeCls(item.pattern_category)"
                    >
                      {{ categoryLabel(item.pattern_category) }}
                    </span>
                  </td>
                  <td class="tbl-td">
                    <span class="text-xs text-gray-500">{{ item.priority }}</span>
                  </td>
                  <td class="tbl-td">
                    <label class="toggle-mini">
                      <input
                        type="checkbox"
                        :checked="!!item.enabled"
                        @change="togglePattern(item.name, $event.target.checked)"
                      />
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td class="tbl-td text-right">
                    <button class="tbl-action-btn" @click="openRawEdit(item.name)">
                      <AppIcon name="edit-2" :size="13" />
                    </button>
                    <button class="tbl-action-btn ml-1" @click="onAdvDelete(item.name)">
                      <AppIcon name="trash-2" :size="13" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <!-- ════════ /SEKME 3 ════════ -->

    <!-- Sütun Adı modalı -->
    <Teleport to="body">
      <div v-if="showColModal" class="modal-backdrop" @click.self="closeColModal">
        <div class="modal-wrap modal-sm" role="dialog" aria-labelledby="sys-col-modal-title">
          <div class="modal-head">
            <h2 id="sys-col-modal-title" class="text-sm font-bold">
              {{ colEditingName ? t("systemMappings.editColumn") : t("systemMappings.addColumn") }}
            </h2>
            <button class="icon-btn" :aria-label="t('systemMappings.close')" @click="closeColModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onColSave">
            <label class="lbl">
              <span>{{ t("systemMappings.headerLabel") }}</span>
              <input
                v-model="colForm.myHeader"
                type="text"
                required
                maxlength="140"
                :placeholder="t('systemMappings.headerPlaceholder')"
              />
            </label>
            <label class="lbl">
              <span>{{ t("systemMappings.targetFieldLabel") }}</span>
              <select v-model="colForm.targetField" required>
                <option value="" disabled>{{ t("systemMappings.select") }}</option>
                <optgroup v-for="g in targetGroups" :key="g.label" :label="g.label">
                  <option v-for="f in g.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
                </optgroup>
              </select>
            </label>
            <label class="lbl">
              <span>{{ t("systemMappings.alternativesLabel") }}</span>
              <input
                v-model="colForm.alternatives"
                type="text"
                maxlength="300"
                :placeholder="t('systemMappings.alternativesPlaceholder')"
              />
            </label>
            <div v-if="colForm.myHeader.trim() && colTargetLabel" class="preview-note">
              <AppIcon name="check-circle" :size="15" class="flex-none" />
              <span>{{
                t("systemMappings.columnPreview", {
                  header: colForm.myHeader.trim(),
                  field: colTargetLabel,
                })
              }}</span>
            </div>
            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeColModal">
                {{ t("systemMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="colSaving">
                {{ colSaving ? t("systemMappings.saving") : t("systemMappings.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Değer modalı -->
    <Teleport to="body">
      <div v-if="showVmModal" class="modal-backdrop" @click.self="closeVmModal">
        <div class="modal-wrap modal-sm" role="dialog" aria-labelledby="sys-vm-modal-title">
          <div class="modal-head">
            <h2 id="sys-vm-modal-title" class="text-sm font-bold">
              {{ vmEditingName ? t("systemMappings.editValue") : t("systemMappings.addValue") }}
            </h2>
            <button class="icon-btn" :aria-label="t('systemMappings.close')" @click="closeVmModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onVmSave">
            <label class="lbl">
              <span>{{ t("systemMappings.targetFieldLabel") }}</span>
              <select v-model="vmForm.targetField" required @change="onVmFieldChange">
                <option value="" disabled>{{ t("systemMappings.select") }}</option>
                <optgroup v-for="g in targetGroups" :key="g.label" :label="g.label">
                  <option v-for="f in g.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
                </optgroup>
              </select>
            </label>
            <div v-if="vmForm.targetField" class="vm-rows">
              <div class="vm-rows-head">
                <span>{{ t("systemMappings.colSource") }}</span>
                <span>{{ t("systemMappings.colTarget") }}</span>
                <span></span>
              </div>
              <div v-for="(row, i) in vmForm.rows" :key="i" class="vm-row">
                <input
                  v-model="row.source_value"
                  type="text"
                  maxlength="140"
                  :placeholder="t('systemMappings.sourcePlaceholder')"
                />
                <select v-if="vmHasDropdown" v-model="row.target_value">
                  <option value="" disabled>{{ t("systemMappings.select") }}</option>
                  <option v-for="v in vmFieldValues.values" :key="v.value" :value="v.value">
                    {{ v.label }}
                  </option>
                </select>
                <input
                  v-else
                  v-model="row.target_value"
                  type="text"
                  maxlength="140"
                  :placeholder="t('systemMappings.targetPlaceholder')"
                />
                <button
                  type="button"
                  class="tbl-action-btn"
                  :aria-label="t('systemMappings.removeRow')"
                  @click="removeVmRow(i)"
                >
                  <AppIcon name="trash-2" :size="13" />
                </button>
              </div>
              <button type="button" class="add-row-btn" @click="addVmRow">
                <AppIcon name="plus" :size="13" /><span>{{ t("systemMappings.addRow") }}</span>
              </button>
              <p v-if="vmLoadingValues" class="adv-hint">{{ t("systemMappings.loadingValues") }}</p>
              <p v-else-if="vmFieldValues.free" class="adv-hint">
                {{ t("systemMappings.freeHint") }}
              </p>
            </div>
            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeVmModal">
                {{ t("systemMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="vmSaving">
                {{ vmSaving ? t("systemMappings.saving") : t("systemMappings.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- SKU/XML (gelişmiş) — kategoriye göre parametrik oluşturma (Karar2=A) -->
    <Teleport to="body">
      <div v-if="showAdvModal" class="modal-backdrop" @click.self="closeAdvModal">
        <div class="modal-wrap modal-sm" role="dialog" aria-labelledby="sys-adv-modal-title">
          <div class="modal-head">
            <h2 id="sys-adv-modal-title" class="text-sm font-bold">
              {{ t("systemMappings.newAdvancedPattern") }}
            </h2>
            <button class="icon-btn" :aria-label="t('systemMappings.close')" @click="closeAdvModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onAdvSave">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="lbl">
                <span>{{ t("regexPatterns.categoryLabel") }}</span>
                <select v-model="advForm.category">
                  <option value="Price Normalizer">
                    {{ t("regexPatterns.categoryPriceNormalizer") }}
                  </option>
                  <option value="XML Tag">{{ t("regexPatterns.categoryXmlTag") }}</option>
                  <option value="SKU Filename">{{ t("regexPatterns.categorySkuFilename") }}</option>
                </select>
              </label>
              <label class="lbl">
                <span>{{ t("systemMappings.targetFieldLabel") }}</span>
                <select v-model="advForm.target_field" required>
                  <option value="" disabled>{{ t("systemMappings.select") }}</option>
                  <optgroup v-for="g in targetGroups" :key="g.label" :label="g.label">
                    <option v-for="f in g.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
                  </optgroup>
                </select>
              </label>
            </div>

            <!-- Fiyat normalleştirme — parametrik (regex yok) -->
            <div v-if="advForm.category === 'Price Normalizer'" class="cat-box">
              <h4>{{ t("systemMappings.priceParamTitle") }}</h4>
              <p>{{ t("systemMappings.priceParamHint") }}</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="lbl !mt-0">
                  <span>{{ t("systemMappings.decimalSep") }}</span>
                  <select v-model="advForm.price.decimal_sep">
                    <option value="comma">{{ t("systemMappings.sepComma") }}</option>
                    <option value="dot">{{ t("systemMappings.sepDot") }}</option>
                  </select>
                </label>
                <label class="lbl !mt-0">
                  <span>{{ t("systemMappings.thousandsSep") }}</span>
                  <select v-model="advForm.price.thousands_sep">
                    <option value="dot">{{ t("systemMappings.sepDot") }}</option>
                    <option value="comma">{{ t("systemMappings.sepComma") }}</option>
                    <option value="none">{{ t("systemMappings.sepNone") }}</option>
                  </select>
                </label>
              </div>
              <div class="preview-note">
                <AppIcon name="check-circle" :size="15" class="flex-none" />
                <span>{{ pricePreview }}</span>
              </div>
            </div>

            <!-- XML etiketi — parametrik (regex yok) -->
            <div v-else-if="advForm.category === 'XML Tag'" class="cat-box">
              <h4>{{ t("systemMappings.xmlParamTitle") }}</h4>
              <p>{{ t("systemMappings.xmlParamHint") }}</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="lbl !mt-0">
                  <span>{{ t("systemMappings.xmlTagLabel") }}</span>
                  <input
                    v-model="advForm.xml.tag"
                    type="text"
                    maxlength="80"
                    :placeholder="t('systemMappings.xmlTagPlaceholder')"
                  />
                </label>
                <label class="lbl !mt-0">
                  <span>{{ t("systemMappings.xmlAttrLabel") }}</span>
                  <input
                    v-model="advForm.xml.attribute"
                    type="text"
                    maxlength="80"
                    :placeholder="t('systemMappings.xmlAttrPlaceholder')"
                  />
                </label>
              </div>
              <div v-if="xmlPreview" class="preview-note">
                <AppIcon name="check-circle" :size="15" class="flex-none" />
                <span>{{ xmlPreview }}</span>
              </div>
            </div>

            <!-- SKU dosya adı / özel — gated ham regex -->
            <div v-else class="cat-box">
              <div class="warn-note mb-2">
                <AppIcon name="alert-triangle" :size="15" class="flex-none" />
                <span>{{ t("systemMappings.skuGatedNote") }}</span>
              </div>
              <label v-if="!skuExpertUnlocked" class="expert-unlock">
                <input v-model="skuExpertUnlocked" type="checkbox" />
                <span>{{ t("systemMappings.expertUnlock") }}</span>
                <span class="gated-badge">{{ t("systemMappings.gatedBadge") }}</span>
              </label>
              <template v-else>
                <label class="lbl">
                  <span>{{ t("regexPatterns.regexLabel") }}</span>
                  <input
                    v-model="advForm.sku.regex"
                    type="text"
                    maxlength="200"
                    class="font-mono text-xs"
                    :placeholder="t('systemMappings.skuRegexPlaceholder')"
                  />
                </label>
                <div class="test-row">
                  <label class="lbl flex-1">
                    <span>{{ t("regexPatterns.testSampleLabel") }}</span>
                    <input
                      v-model="advForm.sku.test_sample"
                      type="text"
                      :placeholder="t('systemMappings.skuSamplePlaceholder')"
                    />
                  </label>
                  <button type="button" class="hdr-btn-outlined !mt-6" @click="runSkuTest">
                    <AppIcon name="play" :size="12" /><span>{{ t("regexPatterns.runTest") }}</span>
                  </button>
                </div>
                <div v-if="advForm.sku._test_result" class="test-result">
                  <span v-if="advForm.sku._test_result.error" class="badge-err">{{
                    t("regexPatterns.testError", { error: advForm.sku._test_result.error })
                  }}</span>
                  <span v-else-if="advForm.sku._test_result.matched" class="badge-ok">{{
                    t("regexPatterns.testMatched", { text: advForm.sku._test_result.match_text })
                  }}</span>
                  <span v-else class="badge-no">{{ t("regexPatterns.testNoMatch") }}</span>
                </div>
              </template>
            </div>

            <label class="lbl">
              <span>{{ t("systemMappings.patternNameOptional") }}</span>
              <input
                v-model="advForm.pattern_name"
                type="text"
                maxlength="140"
                :placeholder="t('systemMappings.patternNamePlaceholder')"
              />
            </label>

            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeAdvModal">
                {{ t("systemMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="advSaving || !advCanSave()">
                {{ advSaving ? t("systemMappings.saving") : t("systemMappings.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Ham regex düzenleme modalı (gated) — mevcut sistem desenleri ham regex saklar -->
    <Teleport to="body">
      <div v-if="showRawModal" class="modal-backdrop" @click.self="closeRawModal">
        <div class="modal-wrap" role="dialog" aria-labelledby="sys-raw-modal-title">
          <div class="modal-head">
            <h2 id="sys-raw-modal-title" class="text-sm font-bold">
              {{ t("regexPatterns.editPattern") }}
            </h2>
            <button class="icon-btn" :aria-label="t('systemMappings.close')" @click="closeRawModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onRawSave">
            <div class="warn-note mb-1">
              <AppIcon name="alert-triangle" :size="15" class="flex-none" />
              <span>{{ t("systemMappings.advancedGatedNote") }}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="lbl">
                <span>{{ t("regexPatterns.patternNameLabel") }}</span>
                <input v-model="rawForm.pattern_name" type="text" required maxlength="140" />
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.targetFieldLabel") }}</span>
                <select v-model="rawForm.target_field" required>
                  <option value="" disabled>{{ t("regexPatterns.selectPlaceholder") }}</option>
                  <option v-for="f in canonicalFields" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.categoryLabel") }}</span>
                <select v-model="rawForm.pattern_category">
                  <option value="SKU Filename">{{ t("regexPatterns.categorySkuFilename") }}</option>
                  <option value="Price Normalizer">
                    {{ t("regexPatterns.categoryPriceNormalizer") }}
                  </option>
                  <option value="XML Tag">{{ t("regexPatterns.categoryXmlTag") }}</option>
                </select>
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.priorityLabel") }}</span>
                <input v-model.number="rawForm.priority" type="number" min="1" max="9999" />
              </label>
            </div>
            <label class="toggle-row">
              <input v-model="rawForm.enabled" type="checkbox" :true-value="1" :false-value="0" />
              <span>{{ t("regexPatterns.patternActive") }}</span>
            </label>

            <div class="entries-head">
              <h3>{{ t("regexPatterns.patternEntries") }}</h3>
              <button type="button" class="hdr-btn-outlined" @click="addRawEntry">
                <AppIcon name="plus" :size="12" /><span>{{ t("regexPatterns.addRow") }}</span>
              </button>
            </div>

            <div v-for="(entry, idx) in rawForm.patterns" :key="idx" class="entry-card">
              <div class="entry-row">
                <label class="lbl flex-1 min-w-0 entry-regex">
                  <span>{{ t("regexPatterns.regexLabel") }}</span>
                  <input
                    v-model="entry.regex"
                    type="text"
                    maxlength="200"
                    class="font-mono text-xs"
                    placeholder="\\bfi(y|i)at\\b"
                  />
                </label>
                <label class="lbl w-44 entry-flags">
                  <span>{{ t("regexPatterns.flagsLabel") }}</span>
                  <input v-model="entry.flags" type="text" />
                </label>
                <label class="toggle-row !mt-6 entry-active">
                  <input v-model="entry.enabled" type="checkbox" :true-value="1" :false-value="0" />
                  <span>{{ t("regexPatterns.entryActive") }}</span>
                </label>
                <button
                  type="button"
                  class="icon-btn !mt-6 entry-del"
                  :aria-label="t('systemMappings.delete')"
                  @click="removeRawEntry(idx)"
                >
                  <AppIcon name="trash-2" :size="14" />
                </button>
              </div>
              <label class="lbl">
                <span>{{ t("regexPatterns.descriptionLabel") }}</span>
                <input v-model="entry.description" type="text" maxlength="200" />
              </label>
              <div class="test-row">
                <label class="lbl flex-1 test-input">
                  <span>{{ t("regexPatterns.testSampleLabel") }}</span>
                  <input
                    v-model="entry.test_sample"
                    type="text"
                    :placeholder="t('regexPatterns.testSamplePlaceholder')"
                  />
                </label>
                <button
                  type="button"
                  class="hdr-btn-outlined !mt-6 test-btn"
                  @click="runRawTest(idx)"
                >
                  <AppIcon name="play" :size="12" /><span>{{ t("regexPatterns.runTest") }}</span>
                </button>
              </div>
              <div v-if="entry._test_result" class="test-result">
                <span v-if="entry._test_result.error" class="badge-err">{{
                  t("regexPatterns.testError", { error: entry._test_result.error })
                }}</span>
                <span v-else-if="entry._test_result.matched" class="badge-ok">{{
                  t("regexPatterns.testMatched", { text: entry._test_result.match_text })
                }}</span>
                <span v-else class="badge-no">{{ t("regexPatterns.testNoMatch") }}</span>
              </div>
            </div>

            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeRawModal">
                {{ t("systemMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="advSaving">
                {{ advSaving ? t("systemMappings.saving") : t("systemMappings.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .warn-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 12.5px;
    background: rgba($c-warning, 0.1);
    border: 1px solid rgba($c-warning, 0.32);
    color: $c-warning;
  }
  .info-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 12.5px;
    background: rgba($c-info, 0.08);
    border: 1px solid rgba($c-info, 0.28);
    color: $c-info;
  }
  .tabbar {
    display: flex;
    gap: 4px;
    margin-bottom: 18px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    appearance: none;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 12px;
    margin-bottom: -1px;
    font-size: 12.5px;
    font-weight: 600;
    color: $l-text-600;
    cursor: pointer;
    transition: color $t-fast;
    &:focus {
      outline: none;
    }
    &:hover {
      color: $l-text-900;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        color: $d-text;
      }
    }
  }
  .tab-active {
    color: $brand;
    border-bottom-color: $brand;
    &:hover {
      color: $brand;
    }
    @include dark {
      color: $brand;
    }
  }
  .gated-badge {
    font-size: 8.5px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba($c-error, 0.14);
    color: $c-error;
  }
  .chip-map {
    display: inline-flex;
    align-items: center;
    font-size: 11.5px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 7px;
    background: rgba($brand, 0.12);
    color: $brand;
  }
  .chip-sys {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 7px;
    background: rgba($c-warning, 0.14);
    color: $c-warning;
  }
  .chip-usage {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 7px;
    background: rgba($c-success, 0.14);
    color: $c-success;
  }
  .chip-usage-none {
    font-size: 11px;
    color: $l-text-600;
    @include dark {
      color: $d-text-faint;
    }
  }
  .cat-box {
    border: 1px solid $l-border;
    border-radius: 10px;
    padding: 13px;
    margin-top: 12px;
    background: $l-bg-soft;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
    h4 {
      margin: 0 0 3px;
      font-size: 12.5px;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }
    > p {
      margin: 0 0 10px;
      font-size: 11px;
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .expert-unlock {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: $l-text-700;
    cursor: pointer;
    @include dark {
      color: $d-text-muted;
    }
  }
  .map-chip {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 6px;
    background: $l-bg-muted;
    color: $l-text-700;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  .modal-wrap {
    background: $l-bg;
    border-radius: 12px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    @include dark {
      background: $d-bg-card;
      color: $d-text;
    }
  }
  .modal-sm {
    max-width: 560px;
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .modal-body {
    padding: 16px;
  }
  .modal-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .lbl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: $l-text-600;
    margin-top: 8px;
    @include dark {
      color: $d-text-muted;
    }

    span {
      font-weight: 600;
    }
    input,
    select {
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      background: $l-bg;
      color: $l-text-900;
      transition:
        border $t-fast,
        box-shadow $t-fast;

      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }
  .preview-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 12px;
    background: rgba($c-success, 0.08);
    border: 1px solid rgba($c-success, 0.3);
    color: $c-success;
  }
  .adv-hint {
    font-size: 11px;
    color: $l-text-600;
    margin: 8px 0 6px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .toggle-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-top: 12px;
    cursor: pointer;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .entries-head {
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    h3 {
      font-size: 12px;
      font-weight: 700;
      color: $l-text-700;
      @include dark {
        color: $d-text;
      }
    }
  }
  .entry-card {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 10px;
    margin-top: 8px;
    background: $l-bg-soft;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }
  .entry-row,
  .test-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .test-result {
    margin-top: 6px;
    font-size: 11px;
  }
  .badge-ok {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba($c-success, 0.15);
    color: $c-success;
    font-weight: 600;
  }
  .badge-no {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: $l-bg-muted;
    color: $l-text-600;
    font-weight: 600;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .badge-err {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba($c-error, 0.15);
    color: $c-error;
    font-weight: 600;
  }
  .vm-rows {
    margin-top: 14px;
  }
  .vm-rows-head {
    display: grid;
    grid-template-columns: 1fr 1fr 30px;
    gap: 8px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: $l-text-600;
    margin-bottom: 6px;
    @include dark {
      color: $d-text-muted;
    }
  }
  .vm-row {
    display: grid;
    grid-template-columns: 1fr 1fr 30px;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;

    input,
    select {
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      background: $l-bg;
      color: $l-text-900;
      transition:
        border $t-fast,
        box-shadow $t-fast;
      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }
  .add-row-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    appearance: none;
    background: transparent;
    border: 1px dashed $l-border;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: $l-text-600;
    cursor: pointer;
    margin-top: 2px;
    transition:
      color $t-fast,
      border-color $t-fast;
    &:focus {
      outline: none;
    }
    &:hover {
      color: $brand;
      border-color: $brand;
    }
    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
      &:hover {
        color: $brand;
        border-color: $brand;
      }
    }
  }
  .icon-btn {
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    transition:
      background $t-fast,
      border-color $t-fast;
    &:hover {
      background: $l-bg-muted;
    }
    @include dark {
      border-color: $d-border;
      &:hover {
        background: $d-bg-hover;
      }
    }
  }
  .toggle-mini {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      inset: 0;
      background: $l-text-300;
      border-radius: 999px;
      transition: background $t-fast;
      cursor: pointer;
      &::before {
        content: "";
        position: absolute;
        width: 14px;
        height: 14px;
        left: 2px;
        top: 2px;
        background: #fff;
        border-radius: 50%;
        transition: transform $t-fast;
      }
    }
    input:checked + .slider {
      background: $brand;
      &::before {
        transform: translateX(14px);
      }
    }
  }
  .tbl-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid $l-border;
    border-radius: 6px;
    width: 26px;
    height: 26px;
    background: $l-bg;
    color: $l-text-600;
    cursor: pointer;
    transition:
      background $t-fast,
      color $t-fast,
      border-color $t-fast;
    &:hover {
      background: $l-bg-muted;
      color: $brand;
      border-color: $brand;
    }
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-muted;
      &:hover {
        background: $d-bg-hover;
        color: $brand;
      }
    }
  }

  // ── Sekme eylem satırı + gelişmiş filtre satırı ───────────────────────────
  // (eski Tailwind flex-col/sm:flex-row sarmalayıcılarının scoped karşılığı;
  //  masaüstünde birebir aynı görünüm, mobil kuralları media bloğunda)
  .rgx-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 16px;
  }
  .rgx-adv-filters {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  @media (min-width: 768px) {
    .rgx-adv-toggle {
      margin-left: auto;
    }
  }

  // ── Mobil kart listesi (<768px'te tablolar yerine) ────────────────────────
  .rgx-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rgx-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 12px 13px;
    display: flex;
    flex-direction: column;
    gap: 7px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    &.off {
      .rgx-c-name,
      .rgx-c-mono,
      .rgx-c-chips {
        opacity: 0.55;
      }
    }
  }
  .rgx-c-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;

    .toggle-mini {
      flex-shrink: 0;
      margin-top: 2px;
    }
  }
  .rgx-c-name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    color: $l-text-900;
    min-width: 0;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text-hi;
    }
  }
  .rgx-c-mono {
    margin: 0;
    font-family: ui-monospace, monospace;
    font-size: 10.5px;
    color: $l-text-500;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text-faint;
    }
  }
  .rgx-c-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }
  .rgx-c-mono-chip {
    font-family: ui-monospace, monospace;
    font-size: 10.5px;
    color: $l-text-500;
    min-width: 0;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text-faint;
    }
  }
  .rgx-c-prio {
    font-size: 11px;
    font-weight: 600;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
  // Uzun "kaynak → hedef" çiftleri kart içinde sarabilsin
  .rgx-map-chip {
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .rgx-c-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-top-color: $d-border-inner;
    }
  }
  .rgx-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    color: $l-text-700;
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 9px;
    cursor: pointer;
    transition: background $t-fast;

    @include dark {
      color: $d-text-hi;
      border-color: $d-border;
    }

    &:active {
      background: rgba($brand, 0.08);
    }

    &.danger {
      color: $c-error;
      border-color: rgba($c-error, 0.3);
    }
  }

  // ── Mobil düzen (<768px) ──────────────────────────────────────────────────
  @media (max-width: 767px) {
    // Sekme barı: tek satır, yatay kaydırılabilir, scrollbar gizli
    .tabbar {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }
    .tab {
      flex: none;
      white-space: nowrap;
    }

    // Yenile kompakt, birincil ekle butonu satırın kalanını doldurur
    .rgx-actions {
      .hdr-btn-outlined {
        min-height: 44px;
        justify-content: center;
      }
      .hdr-btn-primary {
        flex: 1;
        min-height: 44px;
        justify-content: center;
      }
    }

    // SKU/XML filtre satırı: 2 select yan yana, toggle ortada, buton tam satır
    .rgx-adv-filters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      align-items: stretch;

      select {
        width: 100%;
        min-height: 42px;
      }
      .rgx-adv-toggle {
        grid-column: 1 / -1;
        justify-self: center;
      }
      .hdr-btn-primary {
        grid-column: 1 / -1;
        min-height: 44px;
        justify-content: center;
      }
    }

    // Modallar: ortalanmış dialog yerine bottom sheet
    .modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }
    .modal-wrap {
      max-width: none;
      max-height: 88vh;
      border-radius: 16px 16px 0 0;
    }
    .modal-foot {
      padding-bottom: calc(12px + env(safe-area-inset-bottom));

      .hdr-btn-outlined,
      .hdr-btn-primary {
        flex: 1;
        min-height: 44px;
        justify-content: center;
      }
    }

    // Gelişmiş desen modalı — Desen Girdileri satırları mobilde akar düzen:
    // regex tam satır, bayraklar + aktif + sil ikinci satırda hizalı,
    // test alanı ve butonu ayrı tam satırlar.
    .entry-card {
      padding: 12px;
      border-radius: 11px;
    }
    .entry-regex {
      flex: 1 1 100%;
    }
    .entry-flags {
      width: auto;
      flex: 1 1 0;
      min-width: 0;
    }
    .entry-active {
      margin-top: 0 !important;
      align-self: flex-end;
      min-height: 40px;
      display: inline-flex;
      align-items: center;
    }
    .entry-del {
      margin-top: 0 !important;
      align-self: flex-end;
      width: 40px;
      height: 40px;
    }
    .test-input {
      flex: 1 1 100%;
    }
    .test-btn {
      flex: 1 1 100%;
      margin-top: 0 !important;
      min-height: 44px;
      justify-content: center;
    }
  }
</style>

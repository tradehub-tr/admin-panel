<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useRegexPattern } from "@/composables/useRegexPattern";
  import { useListViewMode } from "@/composables/useListViewMode";

  const { t } = useI18n();
  const { viewMode } = useListViewMode("regex-patterns", "table");

  const {
    patterns,
    canonicalFields,
    loading,
    fetchAll,
    fetchOne,
    savePattern,
    deletePattern,
    togglePattern,
    testPattern,
    loadCanonicalFields,
  } = useRegexPattern();

  const CATEGORIES = [
    { value: "", label: t("regexPatterns.categoryAll") },
    { value: "Column Header", label: t("regexPatterns.categoryColumnHeader") },
    { value: "SKU Filename", label: t("regexPatterns.categorySkuFilename") },
    { value: "Price Normalizer", label: t("regexPatterns.categoryPriceNormalizer") },
    { value: "XML Tag", label: t("regexPatterns.categoryXmlTag") },
  ];
  const STATUS_OPTIONS = [
    { value: "all", label: t("regexPatterns.statusAll") },
    { value: "active", label: t("regexPatterns.statusActive") },
    { value: "inactive", label: t("regexPatterns.statusInactive") },
  ];

  const filterCategory = ref("");
  const filterStatus = ref("all");
  const showModal = ref(false);
  const editingName = ref(null);
  const saving = ref(false);

  const emptyForm = () => ({
    pattern_name: "",
    target_field: "",
    target_doctype: "Listing",
    scope: "System",
    pattern_category: "Column Header",
    priority: 100,
    enabled: 1,
    patterns: [],
  });
  const form = ref(emptyForm());

  const filteredPatterns = computed(() => {
    return patterns.value.filter((p) => {
      if (filterCategory.value && p.pattern_category !== filterCategory.value) return false;
      if (filterStatus.value === "active" && !p.enabled) return false;
      if (filterStatus.value === "inactive" && p.enabled) return false;
      return true;
    });
  });

  const summary = computed(() => ({
    total: patterns.value.length,
    active: patterns.value.filter((p) => p.enabled).length,
    system: patterns.value.filter((p) => p.scope === "System").length,
    override: patterns.value.filter((p) => p.scope === "Seller Override").length,
  }));

  const categoryLabel = (c) => CATEGORIES.find((x) => x.value === c)?.label || c;

  function categoryBadgeCls(c) {
    switch (c) {
      case "Column Header":
        return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
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

  async function load() {
    await fetchAll({ scope: "System" });
  }

  function openCreate() {
    editingName.value = null;
    form.value = emptyForm();
    if (canonicalFields.value.length && !form.value.target_field) {
      form.value.target_field = canonicalFields.value[0];
    }
    addEntry();
    showModal.value = true;
  }

  async function openEdit(name) {
    const doc = await fetchOne(name);
    if (!doc) return;
    editingName.value = name;
    form.value = {
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
        flags: p.flags || "IGNORECASE,UNICODE",
        enabled: p.enabled ? 1 : 0,
        test_sample: p.test_sample || "",
        _test_result: null,
      })),
    };
    if (!form.value.patterns.length) addEntry();
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    editingName.value = null;
    form.value = emptyForm();
  }

  function addEntry() {
    form.value.patterns.push({
      regex: "",
      description: "",
      flags: "IGNORECASE,UNICODE",
      enabled: 1,
      test_sample: "",
      _test_result: null,
    });
  }

  function removeEntry(idx) {
    form.value.patterns.splice(idx, 1);
  }

  async function runTest(idx) {
    const entry = form.value.patterns[idx];
    if (!entry.regex || !entry.test_sample) {
      entry._test_result = { matched: false, error: t("regexPatterns.regexAndSampleRequired") };
      return;
    }
    const res = await testPattern(entry.regex, entry.test_sample, entry.flags);
    entry._test_result = res;
  }

  async function onSave() {
    if (!form.value.pattern_name || !form.value.target_field) {
      return;
    }
    saving.value = true;
    try {
      const payload = {
        pattern_name: form.value.pattern_name,
        target_field: form.value.target_field,
        target_doctype: form.value.target_doctype,
        scope: form.value.scope,
        pattern_category: form.value.pattern_category,
        priority: Number(form.value.priority) || 100,
        enabled: form.value.enabled ? 1 : 0,
        patterns: form.value.patterns
          .filter((p) => p.regex)
          .map((p) => ({
            regex: p.regex,
            description: p.description || "",
            flags: p.flags || "IGNORECASE,UNICODE",
            enabled: p.enabled ? 1 : 0,
            test_sample: p.test_sample || "",
          })),
      };
      await savePattern(payload, editingName.value);
      closeModal();
      await load();
    } catch {
      // toast composable hata mesajını zaten gösterdi
    } finally {
      saving.value = false;
    }
  }

  async function onDelete(name) {
    if (!confirm(t("regexPatterns.deleteConfirm"))) return;
    await deletePattern(name);
  }

  onMounted(async () => {
    await loadCanonicalFields();
    await load();
  });
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("regexPatterns.title") }}
        </h1>
        <p class="text-xs text-gray-400">
          {{
            t("regexPatterns.summary", {
              total: summary.total,
              active: summary.active,
              system: summary.system,
              override: summary.override,
            })
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("regexPatterns.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("regexPatterns.newSystemPattern") }}</span>
        </button>
      </div>
    </div>

    <div class="card mb-5 !p-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <select v-model="filterCategory" class="form-input-sm w-auto">
          <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">
            {{ c.label }}
          </option>
        </select>
        <select v-model="filterStatus" class="form-input-sm w-auto">
          <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
        <ViewModeToggle v-model="viewMode" :modes="['table', 'list']" class="sm:ml-auto" />
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="filteredPatterns.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <AppIcon name="layers" :size="24" class="text-gray-400" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("regexPatterns.emptyTitle") }}</h3>
      <p class="text-xs text-gray-400">
        {{ t("regexPatterns.emptyDesc") }}
      </p>
    </div>

    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="item in filteredPatterns"
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
          {{ item.enabled ? t("regexPatterns.statusActive") : t("regexPatterns.statusInactive") }}
        </span>
        <div class="flex-none">
          <button class="tbl-action-btn" @click="openEdit(item.name)">
            <AppIcon name="edit-2" :size="13" />
          </button>
          <button class="tbl-action-btn ml-1" @click="onDelete(item.name)">
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
              v-for="item in filteredPatterns"
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
                <button class="tbl-action-btn" @click="openEdit(item.name)">
                  <AppIcon name="edit-2" :size="13" />
                </button>
                <button class="tbl-action-btn ml-1" @click="onDelete(item.name)">
                  <AppIcon name="trash-2" :size="13" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-wrap" role="dialog" aria-labelledby="rx-modal-title">
          <div class="modal-head">
            <h2 id="rx-modal-title" class="text-sm font-bold">
              {{
                editingName ? t("regexPatterns.editPattern") : t("regexPatterns.newSystemPattern")
              }}
            </h2>
            <button class="icon-btn" :aria-label="t('regexPatterns.close')" @click="closeModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onSave">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="lbl">
                <span>{{ t("regexPatterns.patternNameLabel") }}</span>
                <input v-model="form.pattern_name" type="text" required maxlength="140" />
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.targetFieldLabel") }}</span>
                <select v-model="form.target_field" required>
                  <option value="" disabled>{{ t("regexPatterns.selectPlaceholder") }}</option>
                  <option v-for="f in canonicalFields" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.categoryLabel") }}</span>
                <select v-model="form.pattern_category">
                  <option value="Column Header">
                    {{ t("regexPatterns.categoryColumnHeader") }}
                  </option>
                  <option value="SKU Filename">{{ t("regexPatterns.categorySkuFilename") }}</option>
                  <option value="Price Normalizer">
                    {{ t("regexPatterns.categoryPriceNormalizer") }}
                  </option>
                  <option value="XML Tag">{{ t("regexPatterns.categoryXmlTag") }}</option>
                </select>
              </label>
              <label class="lbl">
                <span>{{ t("regexPatterns.priorityLabel") }}</span>
                <input v-model.number="form.priority" type="number" min="1" max="9999" />
              </label>
            </div>
            <label class="toggle-row">
              <input v-model="form.enabled" type="checkbox" :true-value="1" :false-value="0" />
              <span>{{ t("regexPatterns.patternActive") }}</span>
            </label>

            <div class="entries-head">
              <h3>{{ t("regexPatterns.patternEntries") }}</h3>
              <button type="button" class="hdr-btn-outlined" @click="addEntry">
                <AppIcon name="plus" :size="12" /><span>{{ t("regexPatterns.addRow") }}</span>
              </button>
            </div>

            <div v-for="(entry, idx) in form.patterns" :key="idx" class="entry-card">
              <div class="entry-row">
                <label class="lbl flex-1 min-w-0">
                  <span>{{ t("regexPatterns.regexLabel") }}</span>
                  <input
                    v-model="entry.regex"
                    type="text"
                    maxlength="200"
                    class="font-mono text-xs"
                    placeholder="\\bfi(y|i)at\\b"
                  />
                </label>
                <label class="lbl w-44">
                  <span>{{ t("regexPatterns.flagsLabel") }}</span>
                  <input v-model="entry.flags" type="text" />
                </label>
                <label class="toggle-row !mt-6">
                  <input v-model="entry.enabled" type="checkbox" :true-value="1" :false-value="0" />
                  <span>{{ t("regexPatterns.entryActive") }}</span>
                </label>
                <button
                  type="button"
                  class="icon-btn !mt-6"
                  :aria-label="t('regexPatterns.delete')"
                  @click="removeEntry(idx)"
                >
                  <AppIcon name="trash-2" :size="14" />
                </button>
              </div>
              <label class="lbl">
                <span>{{ t("regexPatterns.descriptionLabel") }}</span>
                <input v-model="entry.description" type="text" maxlength="200" />
              </label>
              <div class="test-row">
                <label class="lbl flex-1">
                  <span>{{ t("regexPatterns.testSampleLabel") }}</span>
                  <input
                    v-model="entry.test_sample"
                    type="text"
                    :placeholder="t('regexPatterns.testSamplePlaceholder')"
                  />
                </label>
                <button type="button" class="hdr-btn-outlined !mt-6" @click="runTest(idx)">
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
              <button type="button" class="hdr-btn-outlined" @click="closeModal">
                {{ t("regexPatterns.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="saving">
                {{ saving ? t("regexPatterns.saving") : t("regexPatterns.save") }}
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
</style>

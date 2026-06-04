<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useRegexPattern } from "@/composables/useRegexPattern";
  import { useListViewMode } from "@/composables/useListViewMode";

  const { t } = useI18n();
  const { viewMode } = useListViewMode("my-regex-patterns", "table");

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

  const showModal = ref(false);
  const editingName = ref(null);
  const saving = ref(false);
  const testResult = ref(null);

  const emptyForm = () => ({
    pattern_name: "",
    target_field: "",
    flags: "IGNORECASE,UNICODE",
    regex: "",
    description: "",
    test_sample: "",
    enabled: 1,
  });
  const form = ref(emptyForm());

  async function load() {
    await fetchAll({ scope: "Seller Override" });
  }

  function openCreate() {
    editingName.value = null;
    form.value = emptyForm();
    if (canonicalFields.value.length) {
      form.value.target_field = canonicalFields.value[0];
    }
    testResult.value = null;
    showModal.value = true;
  }

  async function openEdit(name) {
    const doc = await fetchOne(name);
    if (!doc) return;
    const first = (doc.patterns && doc.patterns[0]) || {};
    editingName.value = name;
    form.value = {
      pattern_name: doc.pattern_name,
      target_field: doc.target_field,
      flags: first.flags || "IGNORECASE,UNICODE",
      regex: first.regex || "",
      description: first.description || "",
      test_sample: first.test_sample || "",
      enabled: doc.enabled ? 1 : 0,
    };
    testResult.value = null;
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    editingName.value = null;
    form.value = emptyForm();
    testResult.value = null;
  }

  async function runTest() {
    if (!form.value.regex || !form.value.test_sample) {
      testResult.value = { matched: false, error: t("myRegexPatterns.testInputRequired") };
      return;
    }
    testResult.value = await testPattern(
      form.value.regex,
      form.value.test_sample,
      form.value.flags
    );
  }

  async function onSave() {
    if (!form.value.pattern_name || !form.value.target_field || !form.value.regex) {
      return;
    }
    saving.value = true;
    try {
      const payload = {
        pattern_name: form.value.pattern_name,
        target_field: form.value.target_field,
        target_doctype: "Listing",
        scope: "Seller Override",
        pattern_category: "Column Header",
        priority: 50,
        enabled: form.value.enabled ? 1 : 0,
        patterns: [
          {
            regex: form.value.regex,
            description: form.value.description || "",
            flags: form.value.flags || "IGNORECASE,UNICODE",
            enabled: 1,
            test_sample: form.value.test_sample || "",
          },
        ],
      };
      await savePattern(payload, editingName.value);
      closeModal();
      await load();
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      saving.value = false;
    }
  }

  async function onDelete(name) {
    if (!confirm(t("myRegexPatterns.deleteConfirm"))) return;
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
          {{ t("myRegexPatterns.title") }}
        </h1>
        <p class="text-xs text-gray-400 max-w-xl mt-1">
          {{ t("myRegexPatterns.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" :modes="['table', 'list']" />
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("myRegexPatterns.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("myRegexPatterns.newPattern") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="patterns.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <AppIcon name="layers" :size="24" class="text-gray-400" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("myRegexPatterns.emptyTitle") }}</h3>
      <p class="text-xs text-gray-400 max-w-md mx-auto">
        {{ t("myRegexPatterns.emptyHint") }}
      </p>
    </div>

    <!-- List View — kompakt satır -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="item in patterns"
        :key="item.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
            {{ item.pattern_name }}
          </p>
          <p class="text-[11px] text-gray-500 font-mono truncate">{{ item.name }}</p>
        </div>
        <span class="text-xs text-gray-600 font-mono dark:text-gray-300 truncate max-w-[160px]">
          {{ item.target_field }}
        </span>
        <label class="toggle-mini flex-none">
          <input
            type="checkbox"
            :checked="!!item.enabled"
            @change="togglePattern(item.name, $event.target.checked)"
          />
          <span class="slider"></span>
        </label>
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

    <!-- Table View -->
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="tbl-th">{{ t("myRegexPatterns.colName") }}</th>
              <th class="tbl-th">{{ t("myRegexPatterns.colTargetField") }}</th>
              <th class="tbl-th">{{ t("myRegexPatterns.colPattern") }}</th>
              <th class="tbl-th">{{ t("myRegexPatterns.colActive") }}</th>
              <th class="tbl-th text-right">{{ t("myRegexPatterns.colActions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in patterns" :key="item.name" class="tbl-row border-b border-gray-50">
              <td class="tbl-td">
                <p class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {{ item.pattern_name }}
                </p>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-600 font-mono dark:text-gray-300">
                  {{ item.target_field }}
                </span>
              </td>
              <td class="tbl-td">
                <span class="text-[11px] text-gray-500 font-mono">{{ item.name }}</span>
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
        <div class="modal-wrap" role="dialog" aria-labelledby="my-rx-modal-title">
          <div class="modal-head">
            <h2 id="my-rx-modal-title" class="text-sm font-bold">
              {{ editingName ? t("myRegexPatterns.editPattern") : t("myRegexPatterns.newPattern") }}
            </h2>
            <button class="icon-btn" :aria-label="t('myRegexPatterns.close')" @click="closeModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onSave">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="lbl">
                <span>{{ t("myRegexPatterns.patternName") }}</span>
                <input v-model="form.pattern_name" type="text" required maxlength="140" />
              </label>
              <label class="lbl">
                <span>{{ t("myRegexPatterns.targetField") }}</span>
                <select v-model="form.target_field" required>
                  <option value="" disabled>{{ t("myRegexPatterns.select") }}</option>
                  <option v-for="f in canonicalFields" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
            </div>

            <label class="lbl">
              <span>{{ t("myRegexPatterns.regex") }}</span>
              <input
                v-model="form.regex"
                type="text"
                required
                maxlength="200"
                class="font-mono text-xs"
                placeholder="\\bfi(y|i)at\\b"
              />
            </label>
            <label class="lbl">
              <span>{{ t("myRegexPatterns.description") }}</span>
              <input v-model="form.description" type="text" maxlength="200" />
            </label>
            <label class="lbl">
              <span>{{ t("myRegexPatterns.flags") }}</span>
              <input v-model="form.flags" type="text" placeholder="IGNORECASE,UNICODE" />
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <label class="lbl">
                <span>{{ t("myRegexPatterns.testSample") }}</span>
                <input
                  v-model="form.test_sample"
                  type="text"
                  :placeholder="t('myRegexPatterns.testSamplePlaceholder')"
                />
              </label>
              <button type="button" class="hdr-btn-outlined" @click="runTest">
                <AppIcon name="play" :size="12" /><span>{{ t("myRegexPatterns.test") }}</span>
              </button>
            </div>

            <div v-if="testResult" class="test-result">
              <span v-if="testResult.error" class="badge-err">
                {{ t("myRegexPatterns.testError", { error: testResult.error }) }}
              </span>
              <span v-else-if="testResult.matched" class="badge-ok">
                {{ t("myRegexPatterns.testMatched", { text: testResult.match_text }) }}
              </span>
              <span v-else class="badge-no">{{ t("myRegexPatterns.testNoMatch") }}</span>
            </div>

            <label class="toggle-row">
              <input v-model="form.enabled" type="checkbox" :true-value="1" :false-value="0" />
              <span>{{ t("myRegexPatterns.patternActive") }}</span>
            </label>

            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeModal">
                {{ t("myRegexPatterns.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="saving">
                {{ saving ? t("myRegexPatterns.saving") : t("myRegexPatterns.save") }}
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
    max-width: 640px;
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

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useRegexPattern } from "@/composables/useRegexPattern";
  import { useValueMapping } from "@/composables/useValueMapping";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: sekmeler → ekleme aksiyonu → eşleştirme tablosu.
  usePageTour("my-regex-patterns", () => [
    { target: '[data-tour="mrx-tabs"]', title: t("tourSteps.page.mrxTabs_t"), desc: t("tourSteps.page.mrxTabs_d") },
    { target: '[data-tour="mrx-add"]', title: t("tourSteps.page.mrxAdd_t"), desc: t("tourSteps.page.mrxAdd_d") },
    { target: '[data-tour="mrx-table"]', title: t("tourSteps.page.mrxTable_t"), desc: t("tourSteps.page.mrxTable_d") },
  ]);

  const {
    aliases,
    targetGroups,
    loading,
    fetchAliases,
    fetchOne,
    saveColumnAlias,
    deleteAlias,
    loadTargetGroups,
  } = useRegexPattern();

  // İki sekme: "column" (Sütun Eşleştirmeleri — kolon-adı katmanı) | "value" (Değer Eşleştirmeleri — hücre-değeri katmanı).
  const activeTab = ref("column");

  const showModal = ref(false);
  const editingName = ref(null);
  const saving = ref(false);
  // save_column_alias çıktısı: { ok, name, regex, target_field } — Gelişmiş akordeon salt-okunur gösterir.
  const lastSaved = ref(null);

  const emptyForm = () => ({
    myHeader: "",
    targetField: "",
    alternatives: "",
  });
  const form = ref(emptyForm());

  // key -> { label, groupLabel } eşlemesi; liste chip'i ve önizleme için.
  const targetIndex = computed(() => {
    const map = {};
    for (const g of targetGroups.value) {
      for (const f of g.fields) {
        map[f.key] = { label: f.label, groupLabel: g.label };
      }
    }
    return map;
  });

  function targetLabel(key) {
    return targetIndex.value[key]?.label || key;
  }

  const selectedTargetLabel = computed(() =>
    form.value.targetField ? targetLabel(form.value.targetField) : ""
  );

  function openCreate() {
    editingName.value = null;
    form.value = emptyForm();
    lastSaved.value = null;
    showModal.value = true;
  }

  async function openEdit(name) {
    const doc = await fetchOne(name);
    if (!doc) return;
    const first = (doc.patterns && doc.patterns[0]) || {};
    editingName.value = name;
    // pattern_name backend formatı: "<seller> — <my_header> → <target_field>"
    // Düzenlemede yalnızca hedef alanı ve alternatifleri ön-dolduramayız (regex'ten metin türetilmez);
    // satıcı başlığını pattern_name'den ayıklarız, alternatifler regex'ten okunmaz (Gelişmiş'te salt-okunur).
    const header = (doc.pattern_name || "").split("—").pop()?.split("→")[0]?.trim() || "";
    form.value = {
      myHeader: header,
      targetField: doc.target_field || "",
      alternatives: "",
    };
    lastSaved.value = { regex: first.regex || "", target_field: doc.target_field || "" };
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    editingName.value = null;
    form.value = emptyForm();
    lastSaved.value = null;
  }

  async function onSave() {
    if (!form.value.myHeader.trim() || !form.value.targetField) return;
    saving.value = true;
    try {
      // Eski kayıt düzenlenirken backend regex'i yeniden üretir; çakışmayı önlemek için önce sil.
      if (editingName.value) {
        await deleteAlias(editingName.value);
      }
      await saveColumnAlias({
        myHeader: form.value.myHeader.trim(),
        targetField: form.value.targetField,
        alternatives: form.value.alternatives.trim(),
      });
      closeModal();
      await fetchAliases();
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      saving.value = false;
    }
  }

  async function onDelete(name) {
    if (!confirm(t("myColumnMappings.deleteConfirm"))) return;
    await deleteAlias(name);
  }

  // ── Değer Eşleştirmeleri sekmesi ──────────────────────────────────────────
  const {
    valueMappings,
    loading: vmLoading,
    fetchValueMappings,
    saveValueMapping,
    deleteValueMapping,
    loadFieldValues,
  } = useValueMapping();

  const showVmModal = ref(false);
  const vmEditingName = ref(null);
  const vmSaving = ref(false);
  // Seçili alanın geçerli-değer kaynağı: { kind, values: [{ value, label }], free }
  const vmFieldValues = ref({ kind: "free", values: [], free: true });
  const vmLoadingValues = ref(false);

  const emptyVmRow = () => ({ source_value: "", target_value: "" });
  const vmForm = ref({ targetField: "", rows: [emptyVmRow()] });

  const vmHasDropdown = computed(
    () => !vmFieldValues.value.free && vmFieldValues.value.values.length > 0
  );

  function vmTargetLabel(key) {
    return targetIndex.value[key]?.label || key;
  }

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
      .map((r) => ({
        source_value: r.source_value.trim(),
        target_value: r.target_value.trim(),
      }))
      .filter((r) => r.source_value && r.target_value);
    if (rows.length === 0) return;
    vmSaving.value = true;
    try {
      await saveValueMapping({ targetField: vmForm.value.targetField, rows });
      closeVmModal();
      await fetchValueMappings();
    } catch {
      // toast composable hata mesajını gösterdi
    } finally {
      vmSaving.value = false;
    }
  }

  async function onVmDelete(name) {
    if (!confirm(t("myValueMappings.deleteConfirm"))) return;
    await deleteValueMapping(name);
  }

  onMounted(async () => {
    await loadTargetGroups();
    await fetchAliases();
    await fetchValueMappings();
  });
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ t("myMappings.title") }}
      </h1>
      <p class="text-xs text-gray-400 max-w-xl mt-1">
        {{ t("myMappings.subtitle") }}
      </p>
    </div>

    <!-- Sekme barı: Sütun Eşleştirmeleri | Değer Eşleştirmeleri -->
    <div class="tabbar" role="tablist" data-tour="mrx-tabs">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'column' }"
        :aria-selected="activeTab === 'column'"
        @click="activeTab = 'column'"
      >
        <AppIcon name="columns" :size="14" /><span>{{ t("myMappings.columnTab") }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeTab === 'value' }"
        :aria-selected="activeTab === 'value'"
        @click="activeTab = 'value'"
      >
        <AppIcon name="replace" :size="14" /><span>{{ t("myMappings.valueTab") }}</span>
      </button>
    </div>

    <!-- ════════ SEKME 1: Sütun Eşleştirmeleri ════════ -->
    <div v-show="activeTab === 'column'">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-end gap-2 mb-4"
        data-tour="mrx-add"
      >
        <button class="hdr-btn-outlined" @click="fetchAliases">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("myColumnMappings.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("myColumnMappings.add") }}</span>
        </button>
      </div>

      <!-- "Çoğu sütun otomatik tanınır" bilgi notu -->
      <div class="info-note mb-4">
        <AppIcon name="info" :size="16" class="flex-none" />
        <span>{{ t("myColumnMappings.autoNote") }}</span>
      </div>

      <div v-if="loading" class="card text-center py-12">
        <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
      </div>
      <div v-else-if="aliases.length === 0" class="card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <AppIcon name="columns" :size="24" class="text-gray-400" />
        </div>
        <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("myColumnMappings.emptyTitle") }}</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          {{ t("myColumnMappings.emptyHint") }}
        </p>
      </div>

      <!-- Liste: Sizin başlığınız | iStoç alanı | durum | sil -->
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="tbl-th">{{ t("myColumnMappings.colMyHeader") }}</th>
                <th class="tbl-th">{{ t("myColumnMappings.colTargetField") }}</th>
                <th class="tbl-th">{{ t("myColumnMappings.colStatus") }}</th>
                <th class="tbl-th text-right">{{ t("myColumnMappings.colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in aliases" :key="item.name" class="tbl-row border-b border-gray-50">
                <td class="tbl-td">
                  <p class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                    {{ item.pattern_name }}
                  </p>
                </td>
                <td class="tbl-td">
                  <span class="chip">{{ targetLabel(item.target_field) }}</span>
                </td>
                <td class="tbl-td">
                  <span v-if="item.enabled" class="badge-ok">{{
                    t("myColumnMappings.statusMatching")
                  }}</span>
                  <span v-else class="badge-no">{{ t("myColumnMappings.statusOff") }}</span>
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
    </div>
    <!-- ════════ /SEKME 1 ════════ -->

    <!-- ════════ SEKME 2: Değer Eşleştirmeleri ════════ -->
    <div v-show="activeTab === 'value'">
      <div class="flex flex-col sm:flex-row sm:items-center justify-end gap-2 mb-4">
        <button class="hdr-btn-outlined" @click="fetchValueMappings">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("myValueMappings.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" @click="openVmCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("myValueMappings.add") }}</span>
        </button>
      </div>

      <div class="info-note mb-4">
        <AppIcon name="info" :size="16" class="flex-none" />
        <span>{{ t("myValueMappings.autoNote") }}</span>
      </div>

      <div v-if="vmLoading" class="card text-center py-12">
        <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
      </div>
      <div v-else-if="valueMappings.length === 0" class="card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <AppIcon name="replace" :size="24" class="text-gray-400" />
        </div>
        <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("myValueMappings.emptyTitle") }}</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          {{ t("myValueMappings.emptyHint") }}
        </p>
      </div>

      <!-- Liste: İstoç alanı | eşleştirme sayısı | sil -->
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="tbl-th">{{ t("myValueMappings.colTargetField") }}</th>
                <th class="tbl-th">{{ t("myValueMappings.colMappings") }}</th>
                <th class="tbl-th text-right">{{ t("myValueMappings.colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in valueMappings"
                :key="item.name"
                class="tbl-row border-b border-gray-50"
              >
                <td class="tbl-td">
                  <span class="chip">{{ vmTargetLabel(item.target_field) }}</span>
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

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-wrap" role="dialog" aria-labelledby="my-cm-modal-title">
          <div class="modal-head">
            <h2 id="my-cm-modal-title" class="text-sm font-bold">
              {{ editingName ? t("myColumnMappings.editTitle") : t("myColumnMappings.addTitle") }}
            </h2>
            <button class="icon-btn" :aria-label="t('myColumnMappings.close')" @click="closeModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onSave">
            <label class="lbl">
              <span>{{ t("myColumnMappings.myHeader") }}</span>
              <input
                v-model="form.myHeader"
                type="text"
                required
                maxlength="140"
                :placeholder="t('myColumnMappings.myHeaderPlaceholder')"
              />
            </label>

            <label class="lbl">
              <span>{{ t("myColumnMappings.targetField") }}</span>
              <select v-model="form.targetField" required>
                <option value="" disabled>{{ t("myColumnMappings.select") }}</option>
                <optgroup v-for="g in targetGroups" :key="g.label" :label="g.label">
                  <option v-for="f in g.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
                </optgroup>
              </select>
            </label>

            <label class="lbl">
              <span>{{ t("myColumnMappings.alternatives") }}</span>
              <input
                v-model="form.alternatives"
                type="text"
                maxlength="300"
                :placeholder="t('myColumnMappings.alternativesPlaceholder')"
              />
            </label>

            <div v-if="form.myHeader.trim() && selectedTargetLabel" class="preview-note">
              <AppIcon name="check-circle" :size="15" class="flex-none" />
              <span>{{
                t("myColumnMappings.preview", {
                  header: form.myHeader.trim(),
                  field: selectedTargetLabel,
                })
              }}</span>
            </div>

            <!-- Gelişmiş: backend'in ürettiği teknik regex salt-okunur -->
            <details v-if="lastSaved && lastSaved.regex" class="adv">
              <summary>{{ t("myColumnMappings.advanced") }}</summary>
              <p class="adv-hint">{{ t("myColumnMappings.advancedHint") }}</p>
              <code class="adv-code"
                >{{ lastSaved.regex }} (IGNORECASE) &rarr; {{ lastSaved.target_field }}</code
              >
            </details>

            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeModal">
                {{ t("myColumnMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="saving">
                {{ saving ? t("myColumnMappings.saving") : t("myColumnMappings.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Değer Eşleştirmesi modalı -->
    <Teleport to="body">
      <div v-if="showVmModal" class="modal-backdrop" @click.self="closeVmModal">
        <div class="modal-wrap" role="dialog" aria-labelledby="my-vm-modal-title">
          <div class="modal-head">
            <h2 id="my-vm-modal-title" class="text-sm font-bold">
              {{ vmEditingName ? t("myValueMappings.editTitle") : t("myValueMappings.addTitle") }}
            </h2>
            <button class="icon-btn" :aria-label="t('myValueMappings.close')" @click="closeVmModal">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <form class="modal-body" @submit.prevent="onVmSave">
            <label class="lbl">
              <span>{{ t("myValueMappings.targetField") }}</span>
              <select v-model="vmForm.targetField" required @change="onVmFieldChange">
                <option value="" disabled>{{ t("myValueMappings.select") }}</option>
                <optgroup v-for="g in targetGroups" :key="g.label" :label="g.label">
                  <option v-for="f in g.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
                </optgroup>
              </select>
            </label>

            <div v-if="vmForm.targetField" class="vm-rows">
              <div class="vm-rows-head">
                <span>{{ t("myValueMappings.colSource") }}</span>
                <span>{{ t("myValueMappings.colTarget") }}</span>
                <span></span>
              </div>
              <div v-for="(row, i) in vmForm.rows" :key="i" class="vm-row">
                <input
                  v-model="row.source_value"
                  type="text"
                  maxlength="140"
                  :placeholder="t('myValueMappings.sourcePlaceholder')"
                />
                <!-- Geçerli-değer dropdown'u varsa zorla seç; yoksa serbest metin -->
                <select v-if="vmHasDropdown" v-model="row.target_value">
                  <option value="" disabled>{{ t("myValueMappings.select") }}</option>
                  <option v-for="v in vmFieldValues.values" :key="v.value" :value="v.value">
                    {{ v.label }}
                  </option>
                </select>
                <input
                  v-else
                  v-model="row.target_value"
                  type="text"
                  maxlength="140"
                  :placeholder="t('myValueMappings.targetPlaceholder')"
                />
                <button
                  type="button"
                  class="tbl-action-btn"
                  :aria-label="t('myValueMappings.removeRow')"
                  @click="removeVmRow(i)"
                >
                  <AppIcon name="trash-2" :size="13" />
                </button>
              </div>
              <button type="button" class="add-row-btn" @click="addVmRow">
                <AppIcon name="plus" :size="13" /><span>{{ t("myValueMappings.addRow") }}</span>
              </button>
              <p v-if="vmLoadingValues" class="adv-hint">
                {{ t("myValueMappings.loadingValues") }}
              </p>
              <p v-else-if="vmFieldValues.free" class="adv-hint">
                {{ t("myValueMappings.freeHint") }}
              </p>
            </div>

            <div class="modal-foot">
              <button type="button" class="hdr-btn-outlined" @click="closeVmModal">
                {{ t("myValueMappings.cancel") }}
              </button>
              <button type="submit" class="hdr-btn-primary" :disabled="vmSaving">
                {{ vmSaving ? t("myValueMappings.saving") : t("myValueMappings.save") }}
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
    max-width: 560px;
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
  .adv {
    margin-top: 14px;
    border: 1px dashed $l-border;
    border-radius: 8px;
    padding: 10px 12px;
    @include dark {
      border-color: $d-border;
    }
    summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .adv-hint {
    font-size: 11px;
    color: $l-text-600;
    margin: 8px 0 6px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .adv-code {
    display: block;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    padding: 8px 10px;
    border-radius: 6px;
    background: $l-bg-muted;
    color: $l-text-700;
    word-break: break-all;
    @include dark {
      background: $d-bg;
      color: $d-text-muted;
    }
  }
  .chip {
    display: inline-flex;
    align-items: center;
    font-size: 11.5px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 7px;
    background: rgba($brand, 0.12);
    color: $brand;
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
  .badge-ok {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba($c-success, 0.15);
    color: $c-success;
    font-size: 11px;
    font-weight: 600;
  }
  .badge-no {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    background: $l-bg-muted;
    color: $l-text-600;
    font-size: 11px;
    font-weight: 600;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
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

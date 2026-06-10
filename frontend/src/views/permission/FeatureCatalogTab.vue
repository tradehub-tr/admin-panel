<script setup>
  import { ref, reactive, computed, watch, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { usePermissionStore } from "@/stores/permission";
  import { useToast } from "@/composables/useToast";
  import { FEATURE_PRESETS, PRESET_CATEGORIES } from "@/data/featurePresets";

  const { t } = useI18n();
  const store = usePermissionStore();
  const toast = useToast();
  const { featureCatalog } = storeToRefs(store);

  const loading = ref(false);
  const showArchived = ref(false);

  const features = computed(() => featureCatalog.value?.features || []);
  const categories = computed(() => featureCatalog.value?.categories || []);

  const TYPE_LABELS = {
    boolean: "featureCatalog.valueTypeBoolean",
    quota: "featureCatalog.valueTypeQuota",
    enum: "featureCatalog.valueTypeEnum",
    text: "featureCatalog.valueTypeText",
  };
  function typeLabel(vt) {
    return t(TYPE_LABELS[vt] || TYPE_LABELS.boolean);
  }

  // Kategorilere göre grupla; kategori sırası backend'den (tercih + diğerleri),
  // grup içi display_order → display_name.
  const grouped = computed(() => {
    const visible = features.value.filter((f) => showArchived.value || !f.is_deprecated);
    const byCat = new Map();
    for (const f of visible) {
      const cat = f.display_category || t("featureCatalog.uncategorized");
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(f);
    }
    const order = [...categories.value];
    for (const cat of byCat.keys()) if (!order.includes(cat)) order.push(cat);
    return order
      .filter((c) => byCat.has(c))
      .map((name) => ({
        name,
        items: byCat
          .get(name)
          .slice()
          .sort(
            (a, b) =>
              (a.display_order || 0) - (b.display_order || 0) ||
              a.display_name.localeCompare(b.display_name)
          ),
      }));
  });

  const visibleCount = computed(
    () => features.value.filter((f) => showArchived.value || !f.is_deprecated).length
  );

  async function load() {
    loading.value = true;
    try {
      await store.fetchFeatureCatalog();
    } catch (e) {
      toast.error(e?.message || t("featureCatalog.saveFailed"));
    } finally {
      loading.value = false;
    }
  }
  onMounted(load);

  // ── Önceden tanımlı özellik havuzu (dropdown kaynağı) ──
  // Katalogda zaten olan (aktif + arşivli) feature_key'ler havuzdan elenir;
  // hard-delete edilirse havuza geri döner. Teknik-bilgisiz kullanıcı için seç-ekle.
  const catalogKeys = computed(() => new Set(features.value.map((f) => f.feature_key)));
  const presetSearch = ref("");
  // Havuzda kalan (katalogda olmayan) toplam — boş havuz kontrolü için (aramadan bağımsız).
  const presetCount = computed(
    () => FEATURE_PRESETS.filter((p) => !catalogKeys.value.has(p.feature_key)).length
  );
  // Kategoriye göre gruplu + arama filtreli liste (modal içi seçilebilir liste).
  const presetGroups = computed(() => {
    const q = presetSearch.value.trim().toLocaleLowerCase("tr");
    return PRESET_CATEGORIES.map((cat) => ({
      name: cat,
      items: FEATURE_PRESETS.filter(
        (p) =>
          p.display_category === cat &&
          !catalogKeys.value.has(p.feature_key) &&
          (!q || p.display_name.toLocaleLowerCase("tr").includes(q))
      ),
    })).filter((g) => g.items.length);
  });
  const selectedPreset = ref("");
  const selectedPresetObj = computed(
    () => FEATURE_PRESETS.find((p) => p.feature_key === selectedPreset.value) || null
  );

  // Dropdown seçimi → modal alanlarını preset'ten otomatik doldur (admin hiçbir teknik şey girmez).
  watch(selectedPreset, (key) => {
    const p = FEATURE_PRESETS.find((x) => x.feature_key === key);
    if (!p) return;
    modal.feature_key = p.feature_key;
    modal.display_name = p.display_name;
    modal.display_category = p.display_category;
    modal.value_type = p.value_type;
    modal.enum_options = p.enum_options || "";
    modal.unit = p.unit || "";
    modal.description = p.description || "";
    modal.show_on_card = !!p.default_show_on_card;
  });

  // ── Create / Edit modal ───────────────────────────────
  const modal = reactive({
    open: false,
    mode: "create",
    feature_key: "",
    display_name: "",
    display_category: "",
    value_type: "boolean",
    enum_options: "",
    unit: "",
    display_order: 0,
    description: "",
    show_on_card: false,
    is_coming_soon: false,
    submitting: false,
  });

  const canSubmit = computed(
    () => !!modal.feature_key && !!modal.display_name && !!modal.display_category
  );

  function openCreate() {
    selectedPreset.value = "";
    presetSearch.value = "";
    Object.assign(modal, {
      open: true,
      mode: "create",
      feature_key: "",
      display_name: "",
      display_category: "",
      value_type: "boolean",
      enum_options: "",
      unit: "",
      display_order: 0,
      description: "",
      show_on_card: false,
      is_coming_soon: false,
      submitting: false,
    });
  }

  function openEdit(f) {
    Object.assign(modal, {
      open: true,
      mode: "edit",
      feature_key: f.feature_key,
      display_name: f.display_name || "",
      display_category: f.display_category || "",
      value_type: f.value_type || "boolean",
      enum_options: (f.enum_options || []).join(","),
      unit: f.unit || "",
      display_order: f.display_order || 0,
      description: f.description || "",
      show_on_card: !!f.show_on_card,
      is_coming_soon: !!f.is_coming_soon,
      submitting: false,
    });
  }

  async function submit() {
    if (!canSubmit.value || modal.submitting) return;
    if (modal.value_type === "enum" && !modal.enum_options.trim()) {
      toast.error(t("featureCatalog.enumRequired"));
      return;
    }
    modal.submitting = true;
    try {
      const base = {
        feature_key: modal.feature_key,
        display_name: modal.display_name,
        display_category: modal.display_category,
        value_type: modal.value_type,
        enum_options: modal.value_type === "enum" ? modal.enum_options : "",
        unit: modal.value_type === "quota" ? modal.unit : "",
        display_order: modal.display_order || 0,
        description: modal.description,
        show_on_card: modal.show_on_card ? 1 : 0,
        is_coming_soon: modal.is_coming_soon ? 1 : 0,
      };
      if (modal.mode === "edit") {
        await store.updateFeatureCatalog(base);
        toast.success(t("featureCatalog.updated"));
      } else {
        await store.createFeatureCatalog(base);
        toast.success(t("featureCatalog.created"));
      }
      modal.open = false;
      await store.fetchFeatureCatalog();
    } catch (e) {
      toast.error(e?.message || t("featureCatalog.saveFailed"));
    } finally {
      modal.submitting = false;
    }
  }

  async function restore(f) {
    try {
      await store.restoreFeatureCatalog(f.feature_key);
      toast.success(t("featureCatalog.restored"));
      await store.fetchFeatureCatalog();
    } catch (e) {
      toast.error(e?.message || t("featureCatalog.saveFailed"));
    }
  }

  // ── Delete confirm ────────────────────────────────────
  const del = reactive({ open: false, feature_key: "", hard: false, submitting: false });

  function openDelete(f) {
    Object.assign(del, { open: true, feature_key: f.feature_key, hard: false, submitting: false });
  }

  async function executeDelete() {
    if (del.submitting) return;
    del.submitting = true;
    try {
      await store.deleteFeatureCatalog(del.feature_key, del.hard ? 1 : 0);
      toast.success(t("featureCatalog.deleted"));
      del.open = false;
      await store.fetchFeatureCatalog();
    } catch (e) {
      toast.error(e?.message || t("featureCatalog.saveFailed"));
    } finally {
      del.submitting = false;
    }
  }
</script>

<template>
  <section class="fc-tab">
    <header class="fc-head">
      <div class="fc-head-text">
        <h3 class="fc-title">{{ t("featureCatalog.title") }}</h3>
        <p class="fc-desc">{{ t("featureCatalog.desc") }}</p>
      </div>
      <div class="fc-head-actions">
        <label class="fc-archived-toggle">
          <input v-model="showArchived" type="checkbox" />
          <span>{{ t("featureCatalog.showArchived") }}</span>
        </label>
        <button type="button" class="fc-btn-primary" @click="openCreate">
          {{ t("featureCatalog.addFeature") }}
        </button>
      </div>
    </header>

    <div v-if="loading && !features.length" class="fc-state">
      {{ t("featureCatalog.loading") }}
    </div>
    <div v-else-if="!visibleCount" class="fc-empty">
      {{ t("featureCatalog.empty") }}
    </div>

    <div v-else class="fc-groups">
      <div v-for="group in grouped" :key="group.name" class="fc-group">
        <div class="fc-group-head">{{ group.name }}</div>
        <table class="fc-table">
          <thead>
            <tr>
              <th>{{ t("featureCatalog.colFeature") }}</th>
              <th class="fc-col-type">{{ t("featureCatalog.colType") }}</th>
              <th class="fc-col-card">{{ t("featureCatalog.colCard") }}</th>
              <th class="fc-col-actions">{{ t("featureCatalog.colActions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in group.items"
              :key="f.feature_key"
              :class="{ 'is-archived': f.is_deprecated }"
            >
              <td>
                <div class="fc-name">
                  {{ f.display_name }}
                  <span v-if="f.is_deprecated" class="fc-arch-badge">
                    {{ t("featureCatalog.archivedBadge") }}
                  </span>
                </div>
                <span class="fc-key">{{ f.feature_key }}</span>
              </td>
              <td class="fc-col-type">
                <span class="fc-type-badge" :data-type="f.value_type">{{
                  typeLabel(f.value_type)
                }}</span>
                <span v-if="f.value_type === 'enum' && f.enum_options.length" class="fc-meta">
                  {{ f.enum_options.join(" · ") }}
                </span>
                <span v-else-if="f.value_type === 'quota' && f.unit" class="fc-meta">
                  {{ f.unit }}
                </span>
              </td>
              <td class="fc-col-card">
                <span class="fc-dot" :class="{ on: f.show_on_card }"></span>
              </td>
              <td class="fc-col-actions">
                <button type="button" class="fc-link" @click="openEdit(f)">
                  {{ t("featureCatalog.edit") }}
                </button>
                <button v-if="f.is_deprecated" type="button" class="fc-link" @click="restore(f)">
                  {{ t("featureCatalog.restore") }}
                </button>
                <button type="button" class="fc-link danger" @click="openDelete(f)">
                  {{ t("featureCatalog.delete") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="fc-backdrop" @click.self="modal.open = false">
        <div class="fc-modal" role="dialog" aria-modal="true">
          <header class="fc-modal-head">
            <h3>
              {{
                modal.mode === "edit"
                  ? t("featureCatalog.modalEditTitle")
                  : t("featureCatalog.modalNewTitle")
              }}
            </h3>
            <button type="button" class="fc-icon-btn" aria-label="×" @click="modal.open = false">
              ×
            </button>
          </header>
          <div class="fc-modal-body">
            <!-- CREATE: teknik-bilgisiz dostu — havuzdan seç, otomatik ekle -->
            <template v-if="modal.mode === 'create'">
              <div v-if="!presetCount" class="fc-empty-presets">
                {{ t("featureCatalog.noPresetsLeft") }}
              </div>
              <template v-else>
                <label class="fc-field">
                  <span class="fc-label">{{ t("featureCatalog.selectPresetLabel") }} *</span>
                  <input
                    v-model="presetSearch"
                    type="text"
                    class="fc-preset-search"
                    :placeholder="t('featureCatalog.presetSearchPlaceholder')"
                  />
                </label>
                <div class="fc-preset-list">
                  <template v-for="g in presetGroups" :key="g.name">
                    <div class="fc-preset-cat">{{ g.name }}</div>
                    <button
                      v-for="p in g.items"
                      :key="p.feature_key"
                      type="button"
                      class="fc-preset-item"
                      :class="{ active: selectedPreset === p.feature_key }"
                      @click="selectedPreset = p.feature_key"
                    >
                      <span class="fc-preset-item-name">{{ p.display_name }}</span>
                      <span class="fc-type-badge" :data-type="p.value_type">{{
                        typeLabel(p.value_type)
                      }}</span>
                    </button>
                  </template>
                  <div v-if="!presetGroups.length" class="fc-preset-noresult">
                    {{ t("featureCatalog.presetNoResult") }}
                  </div>
                </div>
                <label v-if="selectedPresetObj" class="fc-check fc-preset-oncard">
                  <input v-model="modal.show_on_card" type="checkbox" />
                  <span>{{ t("featureCatalog.showOnCardLabel") }}</span>
                </label>
                <label v-if="selectedPresetObj" class="fc-check fc-preset-oncard">
                  <input v-model="modal.is_coming_soon" type="checkbox" />
                  <span>{{ t("featureCatalog.comingSoonLabel") }}</span>
                </label>
              </template>
            </template>

            <!-- EDIT: mevcut tam form (feature_key salt-okunur) -->
            <template v-else>
              <label class="fc-field">
                <span class="fc-label">{{ t("featureCatalog.keyLabel") }} *</span>
                <input v-model.trim="modal.feature_key" type="text" maxlength="120" disabled />
                <small class="fc-hint">{{ t("featureCatalog.keyHint") }}</small>
              </label>
              <label class="fc-field">
                <span class="fc-label">{{ t("featureCatalog.nameLabel") }} *</span>
                <input v-model.trim="modal.display_name" type="text" maxlength="140" />
              </label>
              <div class="fc-row">
                <label class="fc-field">
                  <span class="fc-label">{{ t("featureCatalog.categoryLabel") }} *</span>
                  <input
                    v-model.trim="modal.display_category"
                    type="text"
                    list="fc-cat-list"
                    maxlength="80"
                  />
                  <datalist id="fc-cat-list">
                    <option v-for="c in categories" :key="c" :value="c" />
                  </datalist>
                  <small class="fc-hint">{{ t("featureCatalog.categoryHint") }}</small>
                </label>
                <label class="fc-field fc-field-sm">
                  <span class="fc-label">{{ t("featureCatalog.orderLabel") }}</span>
                  <input v-model.number="modal.display_order" type="number" min="0" />
                </label>
              </div>
              <div class="fc-row">
                <label class="fc-field">
                  <span class="fc-label">{{ t("featureCatalog.typeLabel") }}</span>
                  <select v-model="modal.value_type">
                    <option value="boolean">{{ t("featureCatalog.valueTypeBoolean") }}</option>
                    <option value="quota">{{ t("featureCatalog.valueTypeQuota") }}</option>
                    <option value="enum">{{ t("featureCatalog.valueTypeEnum") }}</option>
                    <option value="text">{{ t("featureCatalog.valueTypeText") }}</option>
                  </select>
                  <small class="fc-hint">{{ t("featureCatalog.typeHint") }}</small>
                </label>
                <label v-if="modal.value_type === 'quota'" class="fc-field fc-field-sm">
                  <span class="fc-label">{{ t("featureCatalog.unitLabel") }}</span>
                  <input v-model.trim="modal.unit" type="text" maxlength="20" placeholder="%" />
                  <small class="fc-hint">{{ t("featureCatalog.unitHint") }}</small>
                </label>
              </div>
              <label v-if="modal.value_type === 'enum'" class="fc-field">
                <span class="fc-label">{{ t("featureCatalog.enumOptionsLabel") }} *</span>
                <input
                  v-model.trim="modal.enum_options"
                  type="text"
                  placeholder="Standart,Gümüş,Altın,Platinum"
                />
                <small class="fc-hint">{{ t("featureCatalog.enumOptionsHint") }}</small>
              </label>
              <label class="fc-field">
                <span class="fc-label">{{ t("featureCatalog.descLabel") }}</span>
                <input v-model.trim="modal.description" type="text" maxlength="240" />
              </label>
              <small class="fc-hint">{{ t("featureCatalog.descHint") }}</small>
              <label class="fc-check">
                <input v-model="modal.show_on_card" type="checkbox" />
                <span>{{ t("featureCatalog.showOnCardLabel") }}</span>
              </label>
              <small class="fc-hint">{{ t("featureCatalog.showOnCardHint") }}</small>
              <label class="fc-check">
                <input v-model="modal.is_coming_soon" type="checkbox" />
                <span>{{ t("featureCatalog.comingSoonLabel") }}</span>
              </label>
              <small class="fc-hint">{{ t("featureCatalog.comingSoonHint") }}</small>
            </template>
          </div>
          <footer class="fc-modal-foot">
            <button type="button" class="fc-btn-secondary" @click="modal.open = false">
              {{ t("featureCatalog.cancel") }}
            </button>
            <button
              type="button"
              class="fc-btn-primary"
              :disabled="!canSubmit || modal.submitting"
              @click="submit"
            >
              {{
                modal.submitting
                  ? modal.mode === "edit"
                    ? t("featureCatalog.saving")
                    : t("featureCatalog.creating")
                  : modal.mode === "edit"
                    ? t("featureCatalog.save")
                    : t("featureCatalog.create")
              }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="del.open" class="fc-backdrop" @click.self="del.open = false">
        <div class="fc-confirm">
          <h3>{{ t("featureCatalog.deleteTitle") }}</h3>
          <p>{{ t("featureCatalog.deleteBody", { key: del.feature_key }) }}</p>
          <label class="fc-check fc-hard">
            <input v-model="del.hard" type="checkbox" />
            <span>{{ t("featureCatalog.deleteHard") }}</span>
          </label>
          <small v-if="!del.hard" class="fc-hint">{{ t("featureCatalog.deleteSoftHint") }}</small>
          <footer class="fc-confirm-foot">
            <button type="button" class="fc-btn-secondary" @click="del.open = false">
              {{ t("featureCatalog.cancel") }}
            </button>
            <button
              type="button"
              class="fc-btn-danger"
              :disabled="del.submitting"
              @click="executeDelete"
            >
              {{
                del.submitting ? t("featureCatalog.deleting") : t("featureCatalog.confirmDelete")
              }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .fc-tab {
    display: block;
  }
  .fc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
  .fc-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .fc-desc {
    font-size: 0.8rem;
    color: $l-text-500;
    max-width: 70ch;
    margin: 0;
    @include dark {
      color: $d-text-muted;
    }
  }
  .fc-head-actions {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-shrink: 0;
  }
  .fc-archived-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: $l-text-600;
    cursor: pointer;
    @include dark {
      color: $d-text-muted;
    }
  }

  .fc-state,
  .fc-empty {
    padding: 2rem;
    text-align: center;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .fc-group {
    margin-bottom: 1.5rem;
  }
  .fc-group-head {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $brand;
    padding: 0.4rem 0;
  }
  .fc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;

    th {
      text-align: left;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      background: $l-bg-soft;
      border-bottom: 1px solid $l-border;
      color: $l-text-600;
      @include dark {
        background: $d-bg-elevated;
        border-bottom-color: $d-border;
        color: $d-text-muted;
      }
    }
    td {
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid $l-border;
      vertical-align: middle;
      @include dark {
        border-bottom-color: $d-border;
      }
    }
    tr.is-archived td {
      opacity: 0.55;
    }
  }
  .fc-col-type {
    width: 30%;
  }
  .fc-col-card {
    width: 90px;
    text-align: center;
  }
  .fc-col-actions {
    width: 160px;
    white-space: nowrap;
    text-align: right;
  }
  .fc-name {
    font-weight: 500;
    color: $l-text-900;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    @include dark {
      color: $d-text-hi;
    }
  }
  .fc-key {
    display: block;
    font-size: 0.68rem;
    color: $l-text-400;
    margin-top: 2px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .fc-arch-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 999px;
    background: $l-bg-muted;
    color: $l-text-500;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .fc-type-badge {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba($brand, 0.1);
    color: $brand;

    &[data-type="quota"] {
      background: rgba($c-info, 0.12);
      color: $c-info;
    }
    &[data-type="enum"] {
      background: rgba($c-warning, 0.14);
      color: $c-warning;
    }
    &[data-type="text"] {
      background: $l-bg-muted;
      color: $l-text-500;
      @include dark {
        background: $d-bg-hover;
        color: $d-text-muted;
      }
    }
  }
  .fc-meta {
    display: block;
    font-size: 0.68rem;
    color: $l-text-400;
    margin-top: 3px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .fc-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: $l-border;
    @include dark {
      background: $d-border;
    }
    &.on {
      background: $c-success;
    }
  }
  .fc-link {
    background: none;
    border: none;
    padding: 0 0 0 0.6rem;
    font-size: 0.76rem;
    font-weight: 600;
    color: $brand;
    cursor: pointer;
    &:hover {
      opacity: 0.75;
    }
    &.danger {
      color: $c-error;
    }
  }

  // ── Buttons ───────────────────────────────────────────
  .fc-btn-primary,
  .fc-btn-secondary,
  .fc-btn-danger {
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity $t-fast;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
  .fc-btn-primary {
    background: $brand;
    color: #fff;
  }
  .fc-btn-secondary {
    background: transparent;
    border-color: $l-border;
    color: $l-text-700;
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  .fc-btn-danger {
    background: $c-error;
    color: #fff;
  }

  // ── Modal ─────────────────────────────────────────────
  .fc-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
  }
  .fc-modal {
    background: $l-bg;
    border-radius: 12px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    @include dark {
      background: $d-bg-card;
    }
  }
  .fc-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }
  }
  .fc-icon-btn {
    background: none;
    border: none;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .fc-modal-body {
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .fc-row {
    display: flex;
    gap: 0.85rem;
    flex-wrap: wrap;
    > .fc-field {
      flex: 1;
      min-width: 160px;
    }
    > .fc-field-sm {
      flex: 0 0 120px;
      min-width: 100px;
    }
  }
  .fc-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    input,
    select {
      width: 100%;
      padding: 0.45rem 0.6rem;
      border: 1px solid $l-border;
      border-radius: 7px;
      background: $l-bg;
      color: $l-text-900;
      font-size: 0.85rem;
      @include dark {
        border-color: $d-border;
        background: $d-bg-elevated;
        color: $d-text-hi;
      }
      &:disabled {
        opacity: 0.6;
      }
    }
  }
  .fc-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .fc-hint {
    font-size: 0.7rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .fc-check {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    color: $l-text-700;
    cursor: pointer;
    @include dark {
      color: $d-text-hi;
    }
  }

  // ── Preset seç-ekle akışı (create modu) ───────────────
  .fc-preset-search {
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.85rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
    &:focus {
      outline: none;
      border-color: $brand;
    }
  }
  .fc-preset-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid $l-border;
    border-radius: 10px;
    padding: 0.3rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
    @include dark {
      border-color: $d-border;
      background: $d-bg;
    }
  }
  .fc-preset-cat {
    position: sticky;
    top: 0;
    z-index: 1;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $brand;
    padding: 0.5rem 0.6rem 0.3rem;
    background: $l-bg;
    @include dark {
      background: $d-bg-card;
    }
  }
  .fc-preset-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    text-align: start;
    padding: 0.55rem 0.65rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: $l-text-700;
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      background $t-fast,
      border-color $t-fast;
    @include dark {
      color: $d-text-hi;
    }
    &:hover {
      background: rgba($brand, 0.07);
    }
    &.active {
      background: rgba($brand, 0.12);
      border-color: $brand;
    }
  }
  .fc-preset-item-name {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 500;
  }
  .fc-preset-noresult {
    padding: 1.5rem;
    text-align: center;
    font-size: 0.82rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .fc-preset-oncard {
    margin-top: 0.25rem;
  }
  .fc-empty-presets {
    padding: 1.25rem;
    text-align: center;
    font-size: 0.85rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .fc-modal-foot,
  .fc-confirm-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.9rem 1.25rem;
    border-top: 1px solid $l-border;
    @include dark {
      border-top-color: $d-border;
    }
  }
  .fc-confirm {
    background: $l-bg;
    border-radius: 12px;
    width: 100%;
    max-width: 440px;
    padding: 1.25rem 1.25rem 0;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    @include dark {
      background: $d-bg-card;
    }
    h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }
    p {
      font-size: 0.85rem;
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .fc-hard {
    margin: 0.75rem 0 0.25rem;
  }
  .fc-confirm-foot {
    margin-top: 1rem;
    border-top: 1px solid $l-border;
    padding-left: 0;
    padding-right: 0;
    @include dark {
      border-top-color: $d-border;
    }
  }
</style>

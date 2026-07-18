<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { usePermissionStore } from "@/stores/permission";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";

  const props = defineProps({
    planCode: { type: String, default: "" },
  });
  // Parent (PlansTab) "Değişiklikleri Kaydet" tek butonundan matrisi de kaydedebilsin
  // ve kaydedilmemiş değişiklikte uyarabilsin diye dirty durumunu yukarı bildiriyoruz.
  // go-feature-catalog: "+ Yeni Özellik" → Özellik Kataloğu sekmesine geçiş (parent zinciri).
  const emit = defineEmits(["update:dirty", "go-feature-catalog"]);

  const { t } = useI18n();
  const store = usePermissionStore();
  const toast = useToast();
  const { planFeaturesMatrix } = storeToRefs(store);

  // Sayfa-içi onboarding: özellik matrisi → kaydet.
  usePageTour("plan-feature-editor", () => [
    {
      target: '[data-tour="pfe-matrix"]',
      title: t("tourSteps.page.pfeMatrix_t"),
      desc: t("tourSteps.page.pfeMatrix_d"),
    },
    {
      target: '[data-tour="pfe-save"]',
      title: t("tourSteps.page.pfeSave_t"),
      desc: t("tourSteps.page.pfeSave_d"),
    },
  ]);

  const loading = ref(false);
  const saving = ref(false);

  // draft[feature_key] = { included, value, unlimited, show_on_card }
  const draft = ref({});
  const original = ref({});

  const UNLIMITED = "Sınırsız";
  function isUnlimited(tv) {
    return (tv || "").trim().toLocaleLowerCase("tr") === UNLIMITED.toLocaleLowerCase("tr");
  }

  const groups = computed(() => planFeaturesMatrix.value?.categories || []);
  const hasFeatures = computed(() => groups.value.some((c) => c.features?.length));

  function cellFor(f) {
    return f.values_by_plan?.[props.planCode] || {};
  }

  function buildDrafts() {
    const d = {};
    if (props.planCode && planFeaturesMatrix.value) {
      for (const cat of planFeaturesMatrix.value.categories) {
        for (const f of cat.features) {
          const cell = cellFor(f);
          const ct = f.control_type || "boolean";
          const tv = cell.text_value || "";
          d[f.feature_key] = {
            included: !!cell.is_included,
            value: ct === "quota" && isUnlimited(tv) ? "" : tv,
            unlimited: ct === "quota" && isUnlimited(tv),
            show_on_card: !!cell.show_on_card,
          };
        }
      }
    }
    draft.value = d;
    original.value = JSON.parse(JSON.stringify(d));
  }

  // Bir feature için draft → backend hücre değeri (is_included / text_value)
  function effective(f, dr) {
    const ct = f.control_type || "boolean";
    if (ct === "boolean") {
      return { is_included: !!dr.included, text_value: "" };
    }
    if (ct === "quota") {
      if (dr.unlimited) return { is_included: true, text_value: UNLIMITED };
      const v = String(dr.value ?? "").trim();
      return { is_included: v !== "", text_value: v };
    }
    // enum / text
    const v = String(dr.value ?? "").trim();
    return { is_included: v !== "", text_value: v };
  }

  const changedEntries = computed(() => {
    const out = [];
    for (const cat of groups.value) {
      for (const f of cat.features) {
        const dr = draft.value[f.feature_key];
        const og = original.value[f.feature_key];
        if (!dr || !og) continue;
        if (JSON.stringify(dr) === JSON.stringify(og)) continue;
        const eff = effective(f, dr);
        out.push({
          plan_code: props.planCode,
          feature_key: f.feature_key,
          is_included: eff.is_included,
          text_value: eff.text_value,
          show_on_card: dr.show_on_card ? 1 : 0,
        });
      }
    }
    return out;
  });

  const pendingCount = computed(() => changedEntries.value.length);

  // Bu planın pricing kartında ("Paket İçeriği") kaç özellik görünecek —
  // storefront fallback kalktığı için sadece bunlar çıkar; 0 ise kart boş kalır.
  const cardCount = computed(
    () => Object.values(draft.value).filter((d) => d?.show_on_card).length
  );

  async function ensureLoaded() {
    if (planFeaturesMatrix.value) return;
    loading.value = true;
    try {
      await store.fetchPlanFeaturesMatrix();
    } catch (e) {
      toast.error(e?.message || t("plans.saveFailed"));
    } finally {
      loading.value = false;
    }
  }

  function discard() {
    buildDrafts();
  }

  async function save() {
    if (!pendingCount.value || saving.value) return;
    saving.value = true;
    try {
      const res = await store.bulkUpdatePlanFeatures(changedEntries.value);
      toast.success(t("plans.savedCount", { n: (res?.updated || 0) + (res?.created || 0) }));
      await store.fetchPlanFeaturesMatrix();
      buildDrafts();
    } catch (e) {
      toast.error(e?.message || t("plans.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  onMounted(ensureLoaded);
  watch([() => props.planCode, planFeaturesMatrix], buildDrafts, { immediate: true });

  // Kaydedilmemiş matris değişikliği var mı → parent'a bildir (combinedDirty için).
  watch(pendingCount, (n) => emit("update:dirty", n > 0), { immediate: true });

  // Parent tek "Değişiklikleri Kaydet" butonundan matrisi kaydedebilsin / iptal edebilsin.
  defineExpose({ save, discard, pendingCount });
</script>

<template>
  <div class="pe">
    <p class="pe-desc">{{ t("plans.planEditorDesc") }}</p>

    <div v-if="!planCode" class="pe-state">{{ t("plans.selectPlanHint") }}</div>
    <div v-else-if="loading && !planFeaturesMatrix" class="pe-state">{{ t("plans.loading") }}</div>
    <div v-else-if="!hasFeatures" class="pe-state">
      <p>{{ t("plans.planEditorEmpty") }}</p>
      <button type="button" class="pe-btn-ghost" @click="emit('go-feature-catalog')">
        {{ t("plans.addNewFeature") }}
      </button>
    </div>

    <template v-else>
      <div class="pe-cardinfo">
        <span class="pe-cardcount" :class="{ empty: !cardCount }">
          {{ t("plans.cardSelectedCount", { n: cardCount }) }}
        </span>
        <span v-if="!cardCount" class="pe-cardwarn">{{ t("plans.cardEmptyWarning") }}</span>
        <button type="button" class="pe-btn-ghost" @click="emit('go-feature-catalog')">
          {{ t("plans.addNewFeature") }}
        </button>
      </div>

      <div class="pe-toolbar">
        <span v-if="pendingCount" class="pe-pending">
          {{ t("plans.pendingChanges", { n: pendingCount }) }}
        </span>
        <button
          type="button"
          class="pe-btn-secondary"
          :disabled="!pendingCount || saving"
          @click="discard"
        >
          {{ t("plans.discard") }}
        </button>
        <button
          type="button"
          class="pe-btn-primary"
          data-tour="pfe-save"
          :disabled="!pendingCount || saving"
          @click="save"
        >
          {{ saving ? t("plans.saving") : t("plans.saveCount", { n: pendingCount }) }}
        </button>
      </div>

      <div class="pe-matrix" data-tour="pfe-matrix">
        <div v-for="cat in groups" :key="cat.name" class="pe-group">
          <div class="pe-group-head">{{ cat.name }}</div>
          <div
            v-for="f in cat.features"
            :key="f.feature_key"
            class="pe-row"
            :class="{
              dirty:
                draft[f.feature_key] &&
                JSON.stringify(draft[f.feature_key]) !== JSON.stringify(original[f.feature_key]),
              carded: draft[f.feature_key] && draft[f.feature_key].show_on_card,
            }"
          >
            <div class="pe-info">
              <div class="pe-name" :title="f.tooltip || ''">{{ f.display_name }}</div>
              <span class="pe-key">{{ f.feature_key }}</span>
            </div>

            <div v-if="draft[f.feature_key]" class="pe-control">
              <!-- boolean -->
              <label v-if="f.control_type === 'boolean'" class="pe-switch">
                <input v-model="draft[f.feature_key].included" type="checkbox" />
                <span class="pe-slider"></span>
              </label>

              <!-- quota -->
              <div v-else-if="f.control_type === 'quota'" class="pe-quota">
                <!-- text input (number değil): '2.500' / 'Özel' / 'Sınırsız' gibi
                   değerler number input'unda boşalıp veriyi siliyordu -->
                <input
                  v-model="draft[f.feature_key].value"
                  type="text"
                  inputmode="numeric"
                  class="pe-input pe-num"
                  :placeholder="t('plans.cellTextPlaceholder')"
                  :disabled="draft[f.feature_key].unlimited"
                />
                <span v-if="f.unit" class="pe-unit">{{ f.unit }}</span>
                <label class="pe-unlim">
                  <input v-model="draft[f.feature_key].unlimited" type="checkbox" />
                  <span>{{ t("plans.unlimited") }}</span>
                </label>
              </div>

              <!-- enum -->
              <select
                v-else-if="f.control_type === 'enum'"
                v-model="draft[f.feature_key].value"
                class="pe-input pe-select"
              >
                <option value="">—</option>
                <option v-for="o in f.enum_options" :key="o" :value="o">{{ o }}</option>
              </select>

              <!-- text -->
              <input
                v-else
                v-model="draft[f.feature_key].value"
                type="text"
                class="pe-input"
                :placeholder="t('plans.cellTextPlaceholder')"
              />
            </div>

            <label
              v-if="draft[f.feature_key]"
              class="pe-oncard"
              :class="{ active: draft[f.feature_key].show_on_card }"
              :title="t('plans.showOnCardHint')"
            >
              <input v-model="draft[f.feature_key].show_on_card" type="checkbox" />
              <span>{{ t("plans.onCardShort") }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .pe {
    display: block;
  }
  .pe-desc {
    font-size: 0.8rem;
    color: $l-text-500;
    margin: 0 0 1rem;
    max-width: 72ch;
    @include dark {
      color: $d-text-muted;
    }
  }
  .pe-state {
    padding: 2rem;
    text-align: center;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .pe-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .pe-pending {
    margin-right: auto;
    font-size: 0.8rem;
    font-weight: 600;
    color: $c-warning;
  }

  // Kart görünürlüğü özeti şeridi
  .pe-cardinfo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
  }
  .pe-cardcount {
    font-size: 0.8rem;
    font-weight: 600;
    color: $c-success;
    &.empty {
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .pe-cardwarn {
    font-size: 0.78rem;
    color: $c-warning;
  }
  .pe-btn-ghost {
    margin-left: auto;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    border: 1px dashed $brand;
    background: rgba($brand, 0.06);
    color: $brand;
    cursor: pointer;
    transition: background $t-fast;
    &:hover {
      background: rgba($brand, 0.12);
    }
  }

  .pe-matrix {
    display: block;
  }
  .pe-group {
    margin-bottom: 1.25rem;
  }
  .pe-group-head {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $brand;
    padding: 0.4rem 0;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .pe-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
    &.dirty {
      background: rgba($c-warning, 0.07);
    }
    // Kartta gösterilecek özellik: sol kenarda yeşil accent
    &.carded {
      box-shadow: inset 3px 0 0 $c-success;
    }
  }
  .pe-info {
    flex: 1 1 auto;
    min-width: 0;
  }
  .pe-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .pe-key {
    display: block;
    font-size: 0.68rem;
    color: $l-text-400;
    margin-top: 1px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .pe-control {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 200px;
    justify-content: flex-end;
  }
  // "Kartta göster" — belirgin pill toggle (işaretliyken yeşil dolgu)
  .pe-oncard {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: $l-text-500;
    cursor: pointer;
    width: 96px;
    padding: 0.3rem 0.5rem;
    border: 1px solid $l-border;
    border-radius: 999px;
    transition:
      background $t-fast,
      border-color $t-fast,
      color $t-fast;
    @include dark {
      color: $d-text-muted;
      border-color: $d-border;
    }
    input {
      accent-color: $c-success;
    }
    &.active {
      background: rgba($c-success, 0.12);
      border-color: $c-success;
      color: $c-success;
    }
  }

  .pe-input {
    padding: 0.4rem 0.55rem;
    border: 1px solid $l-border;
    border-radius: 7px;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.82rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
    &:disabled {
      opacity: 0.5;
    }
  }
  .pe-num {
    width: 90px;
    text-align: right;
  }
  .pe-select {
    min-width: 140px;
  }
  .pe-quota {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .pe-unit {
    font-size: 0.78rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .pe-unlim {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    color: $l-text-500;
    cursor: pointer;
    margin-left: 0.25rem;
    @include dark {
      color: $d-text-muted;
    }
  }

  // Toggle switch
  .pe-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    cursor: pointer;
    input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
  }
  .pe-slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: $l-border;
    transition: background $t-fast;
    &::before {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      top: 3px;
      border-radius: 50%;
      background: #fff;
      transition: transform $t-fast;
    }
    @include dark {
      background: $d-border;
    }
  }
  .pe-switch input:checked + .pe-slider {
    background: $c-success;
  }
  .pe-switch input:checked + .pe-slider::before {
    transform: translateX(18px);
  }

  .pe-btn-primary,
  .pe-btn-secondary {
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
  .pe-btn-primary {
    background: $brand;
    color: #fff;
  }
  .pe-btn-secondary {
    background: transparent;
    border-color: $l-border;
    color: $l-text-700;
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
  }

  // Mobil: .pe-control (min 200px) + .pe-oncard (96px) + gap'ler ~328px sabit
  // minimum oluşturup 320-480px ekranlarda satırı yatay taşırıyordu.
  @media (max-width: 767px) {
    .pe-toolbar {
      // pending metni + 2 buton dar ekranda tek satıra sığmıyor
      flex-wrap: wrap;
    }
    .pe-row {
      flex-wrap: wrap;
      gap: 0.5rem 0.75rem;
    }
    .pe-info {
      // Özellik adı tam satır kaplasın, kontroller alt satıra insin
      flex-basis: 100%;
    }
    .pe-control {
      flex: 1 1 auto;
      min-width: 0;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .pe-oncard {
      // Pill'i satırın sonuna sabitle
      margin-left: auto;
    }
    .pe-num {
      // Quota input + unit + 'Sınırsız' checkbox'ı dar kontrolde sıkışıyordu
      width: 72px;
    }
  }
</style>

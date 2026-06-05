<script setup>
  import { ref, computed, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { Check, Minus } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const store = usePermissionStore();
  const toast = useToast();
  const { planFeaturesMatrix } = storeToRefs(store);

  const loading = ref(false);

  const matrix = computed(() => planFeaturesMatrix.value);
  const hasData = computed(
    () => matrix.value?.plans?.length && matrix.value?.categories?.some((c) => c.features?.length)
  );

  function cell(f, planCode) {
    return f.values_by_plan?.[planCode] || {};
  }
  function cellText(f, planCode) {
    return (cell(f, planCode).text_value || "").trim() || "—";
  }

  async function load() {
    loading.value = true;
    try {
      await store.fetchPlanFeaturesMatrix();
    } catch (e) {
      toast.error(e?.message || t("plans.saveFailed"));
    } finally {
      loading.value = false;
    }
  }
  onMounted(load);
</script>

<template>
  <section class="cmp">
    <div class="cmp-head">
      <p class="cmp-desc">{{ t("plans.comparisonDesc") }}</p>
      <button type="button" class="cmp-refresh" :disabled="loading" @click="load">
        {{ t("plans.refresh") }}
      </button>
    </div>

    <div v-if="loading && !matrix" class="cmp-state">{{ t("plans.loading") }}</div>
    <div v-else-if="!hasData" class="cmp-state">{{ t("plans.featuresMatrixEmpty") }}</div>

    <div v-else class="cmp-scroll">
      <table class="cmp-table">
        <thead>
          <tr>
            <th class="cmp-feature-col">{{ t("plans.featureColumn") }}</th>
            <th v-for="p in matrix.plans" :key="p.plan_code" class="cmp-plan-col">
              {{ p.plan_name }}
              <span class="cmp-code">{{ p.plan_code }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="cat in matrix.categories" :key="cat.name">
            <tr class="cmp-cat-row">
              <td :colspan="matrix.plans.length + 1" class="cmp-cat-cell">{{ cat.name }}</td>
            </tr>
            <tr v-for="f in cat.features" :key="f.feature_key" class="cmp-feat-row">
              <td class="cmp-feature" :title="f.tooltip || f.feature_key">
                <span class="cmp-fname">{{ f.display_name }}</span>
                <span class="cmp-fkey">{{ f.feature_key }}</span>
              </td>
              <td v-for="p in matrix.plans" :key="p.plan_code" class="cmp-cell">
                <template v-if="f.control_type === 'boolean'">
                  <Check v-if="cell(f, p.plan_code).is_included" :size="15" class="cmp-yes" />
                  <Minus v-else :size="15" class="cmp-no" />
                </template>
                <span v-else class="cmp-txt">{{ cellText(f, p.plan_code) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cmp {
    display: block;
  }
  .cmp-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .cmp-desc {
    font-size: 0.8rem;
    color: $l-text-500;
    margin: 0;
    max-width: 72ch;
    @include dark {
      color: $d-text-muted;
    }
  }
  .cmp-refresh {
    flex-shrink: 0;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
    border-radius: 7px;
    border: 1px solid $l-border;
    background: transparent;
    color: $l-text-700;
    cursor: pointer;
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
    &:disabled {
      opacity: 0.5;
    }
  }
  .cmp-state {
    padding: 2rem;
    text-align: center;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .cmp-scroll {
    overflow: auto;
    max-height: 72vh;
    border: 1px solid $l-border;
    border-radius: 8px;
    @include dark {
      border-color: $d-border;
    }
  }
  .cmp-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.82rem;

    thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: $l-bg-soft;
      text-align: center;
      font-weight: 600;
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid $l-border;
      @include dark {
        background: $d-bg-elevated;
        border-bottom-color: $d-border;
      }
    }
    thead th.cmp-feature-col {
      text-align: left;
      left: 0;
      z-index: 3;
      min-width: 220px;
    }
    .cmp-code {
      display: block;
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .cmp-cat-row td {
    position: sticky;
    left: 0;
    background: rgba($brand, 0.06);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $brand;
    padding: 0.45rem 0.85rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      background: rgba($brand, 0.12);
      border-bottom-color: $d-border;
    }
  }

  .cmp-feat-row td {
    padding: 0.5rem 0.85rem;
    border-bottom: 1px solid $l-border;
    text-align: center;
    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .cmp-feature {
    text-align: left !important;
    position: sticky;
    left: 0;
    background: $l-bg;
    @include dark {
      background: $d-bg-card;
    }
  }
  .cmp-fname {
    display: block;
    font-weight: 500;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .cmp-fkey {
    display: block;
    font-size: 0.66rem;
    color: $l-text-400;
    margin-top: 1px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .cmp-txt {
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .cmp-yes {
    color: $c-success;
    vertical-align: middle;
  }
  .cmp-no {
    color: $l-border;
    vertical-align: middle;
    @include dark {
      color: $d-border;
    }
  }
</style>

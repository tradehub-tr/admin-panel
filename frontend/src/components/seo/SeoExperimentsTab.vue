<script setup>
  // 13.6 Ölçüm / deney yönetimi — organik dönüşüm serisi, değişiklik kaydı, deney/kontrol kümeleri.
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    changelog,
    changelogAdd,
    experimentsList,
    experimentCreate,
    experimentEvaluate,
    conversionsSeries,
  } from "@/api/seoHelper662";

  const { t } = useI18n();
  const toast = useToast();
  const logs = ref([]);
  const exps = ref([]);
  const series = ref([]);
  const busy = ref(false);
  const logForm = ref({ change_type: "content", description: "", route: "", expected_effect: "" });
  const expForm = ref({
    experiment_key: "",
    title: "",
    hypothesis: "",
    treatment: "",
    control: "",
    start_date: "",
    end_date: "",
    seasonality: "weekday",
  });
  const result = ref(null);
  const errMsg = (e) => e?.message || String(e);

  async function load() {
    try {
      const [l, e, s] = await Promise.all([
        changelog({ days: 90, limit: 100 }),
        experimentsList(),
        conversionsSeries(30),
      ]);
      logs.value = l;
      exps.value = e;
      series.value = s;
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function addLog() {
    busy.value = true;
    try {
      await changelogAdd(logForm.value);
      logForm.value = { change_type: "content", description: "", route: "", expected_effect: "" };
      toast.success(t("seoHelper662.logAdded"));
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }
  const split = (s) =>
    s
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  async function createExp() {
    busy.value = true;
    try {
      const f = expForm.value;
      await experimentCreate({
        experiment_key: f.experiment_key,
        title: f.title,
        hypothesis: f.hypothesis,
        treatment_routes: split(f.treatment),
        control_routes: split(f.control),
        start_date: f.start_date,
        end_date: f.end_date,
        seasonality: f.seasonality,
      });
      toast.success(t("seoHelper662.expCreated"));
      expForm.value = {
        experiment_key: "",
        title: "",
        hypothesis: "",
        treatment: "",
        control: "",
        start_date: "",
        end_date: "",
        seasonality: "weekday",
      };
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }
  async function evaluate(e) {
    busy.value = true;
    try {
      result.value = await experimentEvaluate(e.name);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      busy.value = false;
    }
  }
  const fmt = (v) => (v ? new Date(v).toLocaleString() : "—");
  const maxV = () => Math.max(1, ...series.value.map((s) => s.value));
  onMounted(load);
</script>

<template>
  <div class="space-y-4" data-testid="experiments-tab">
    <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="organic-series">
      <div class="text-sm font-semibold text-gray-900 mb-2">
        {{ t("seoHelper662.organicSeries") }}
      </div>
      <div v-if="!series.length" class="text-xs text-gray-400">
        {{ t("seoHelper662.noConversions") }}
      </div>
      <div v-else class="flex items-end gap-1 h-24">
        <div
          v-for="s in series"
          :key="s.day"
          class="flex-1 bg-brand-500 rounded-t"
          :style="{ height: Math.max(2, (100 * s.value) / maxV()) + '%' }"
          :title="`${s.day}: ${s.value}`"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="changelog">
        <div class="text-sm font-semibold text-gray-900 mb-2">
          {{ t("seoHelper662.changelog") }}
        </div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <select
            v-model="logForm.change_type"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
          >
            <option
              v-for="c in ['content', 'template', 'policy', 'redirect', 'deploy', 'other']"
              :key="c"
              :value="c"
            >
              {{ c }}
            </option>
          </select>
          <input
            v-model="logForm.route"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            placeholder="/route (opsiyonel)"
          />
          <input
            v-model="logForm.description"
            class="col-span-2 px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.whatChanged')"
            data-testid="changelog-desc"
          />
          <input
            v-model="logForm.expected_effect"
            class="col-span-2 px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.expectedEffect')"
          />
        </div>
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="busy || !logForm.description.trim()"
          data-testid="changelog-add"
          @click="addLog"
        >
          {{ t("seoHelper662.addLog") }}
        </button>
        <ul class="mt-3 text-xs divide-y divide-gray-100 max-h-72 overflow-auto">
          <li v-for="l in logs" :key="l.name" class="py-1.5">
            <span class="inline-block px-1.5 rounded bg-gray-100 text-gray-600">{{
              l.change_type
            }}</span>
            <span class="ml-1">{{ l.description }}</span>
            <div class="text-gray-400">
              {{ fmt(l.changed_at) }} · {{ l.actor }} · {{ l.source
              }}<span v-if="l.route"> · {{ l.route }}</span>
            </div>
          </li>
          <li v-if="!logs.length" class="py-2 text-gray-400">—</li>
        </ul>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="experiments">
        <div class="text-sm font-semibold text-gray-900 mb-2">
          {{ t("seoHelper662.experiments") }}
        </div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <input
            v-model="expForm.experiment_key"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.expKey')"
            data-testid="exp-key"
          />
          <input
            v-model="expForm.title"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.expTitle')"
            data-testid="exp-title"
          />
          <textarea
            v-model="expForm.treatment"
            rows="2"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.treatmentRoutes')"
            data-testid="exp-treatment"
          />
          <textarea
            v-model="expForm.control"
            rows="2"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.controlRoutes')"
            data-testid="exp-control"
          />
          <input
            v-model="expForm.start_date"
            type="date"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            data-testid="exp-start"
          />
          <input
            v-model="expForm.end_date"
            type="date"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            data-testid="exp-end"
          />
          <input
            v-model="expForm.hypothesis"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.hypothesis')"
          />
          <select
            v-model="expForm.seasonality"
            class="px-2 py-1 text-xs border border-gray-200 rounded-md"
          >
            <option value="weekday">{{ t("seoHelper662.season_weekday") }}</option>
            <option value="yoy">{{ t("seoHelper662.season_yoy") }}</option>
            <option value="none">{{ t("seoHelper662.season_none") }}</option>
          </select>
        </div>
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="busy || !expForm.experiment_key || !expForm.title"
          data-testid="exp-create"
          @click="createExp"
        >
          {{ t("seoHelper662.createExp") }}
        </button>
        <ul class="mt-3 text-xs divide-y divide-gray-100">
          <li
            v-for="e in exps"
            :key="e.name"
            class="py-1.5 flex items-center justify-between gap-2"
          >
            <div>
              <span class="font-semibold">{{ e.title }}</span>
              <span class="text-gray-400"
                >{{ e.name }} · {{ e.start_date }} → {{ e.end_date }} · {{ e.status }}</span
              >
              <div v-if="e.result" class="text-gray-600">
                lift {{ e.result.lift_pct ?? "—" }}% · {{ e.result.method }} ·
                {{ e.result.data_quality }}
              </div>
            </div>
            <button
              type="button"
              class="text-brand-800 hover:underline whitespace-nowrap"
              :data-testid="`exp-eval-${e.name}`"
              @click="evaluate(e)"
            >
              {{ t("seoHelper662.evaluate") }}
            </button>
          </li>
          <li v-if="!exps.length" class="py-2 text-gray-400">—</li>
        </ul>
        <pre
          v-if="result"
          class="mt-2 p-2 bg-gray-50 rounded text-[11px] overflow-auto max-h-48"
          data-testid="exp-result"
          >{{ JSON.stringify(result, null, 1) }}</pre
        >
      </div>
    </div>
  </div>
</template>

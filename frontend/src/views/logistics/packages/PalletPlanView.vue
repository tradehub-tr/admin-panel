<template>
  <div class="space-y-4">
    <!-- <header> DEĞİL <div>: koyu temada base.scss'teki global
         `header { background-color: $d-bg-card !important }` her <header>'ı
         kart rengine boyuyor ve sayfa arka planıyla arasında gri bir çizgi
         gibi okunan bir bant bırakıyor. Bu blok `<main>` içinde olduğu için
         zaten `banner` landmark'ı üretmiyordu — semantik kayıp yok. -->
    <div class="flex flex-wrap items-start gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.pallet.title") }}</h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          {{ t("logistics.pallet.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <!-- Toplamlar SAYFANIN SONUNDAN başlığa taşındı. Tek paletli sevkiyatta
           içerik ekranın üçte birini dolduruyor, toplamlar boşluğun altında
           kalıyor ve kaydırmadan görünmüyordu — oysa "kaç palet, kaç kilo"
           forklifti çağırmadan önce bakılan bilgi. -->
      <dl v-if="pallets.length" class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <div v-for="total in totals" :key="total.key" class="flex items-baseline gap-1.5">
          <dt class="text-[11px] text-slate-600 dark:text-slate-400">{{ total.label }}</dt>
          <dd class="text-sm font-semibold tabular-nums">{{ total.value }}</dd>
        </div>
      </dl>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="goPacking">
          {{ t("logistics.label.backToPacking") }}
        </button>
        <button v-if="canWrite" type="button" class="th-btn-outline text-sm" @click="addPallet">
          {{ t("logistics.pallet.addPallet") }}
        </button>
        <button
          v-if="canWrite"
          type="button"
          class="th-btn-primary text-sm"
          :disabled="!dirty || saving"
          @click="save"
        >
          {{ saving ? t("logistics.packing.saving") : dirty ? t("logistics.packing.saveDraft") : t("logistics.packing.saved") }}
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="load" />

    <div v-else-if="loading" class="space-y-2" aria-busy="true">
      <Skeleton variant="card" :count="2" />
    </div>

    <template v-else>
      <div
        v-if="overloaded.length"
        class="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
        role="alert"
      >
        <span aria-hidden="true">⛔</span>
        <span>
          <b>{{ t("logistics.pallet.overloadWarning", { pallets: overloaded.map((p) => p.pallet_code).join(", ") }) }}</b>
          <span class="mt-0.5 block text-xs opacity-85">{{ t("logistics.pallet.overloadHint") }}</span>
        </span>
      </div>

      <!-- Tiplerin nereden geldiği ekranda yazılı olmalı: kullanıcı yeni bir
           palet tipi eklemek istediğinde arayacağı yer belli olsun. -->
      <p class="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <span aria-hidden="true">ⓘ</span>
        <span>{{ t("logistics.pallet.typeSource") }}</span>
      </p>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <!-- Paletler -->
        <div class="space-y-3">
          <p
            v-if="!pallets.length"
            class="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-600 dark:text-slate-400 dark:border-slate-600"
          >
            {{ t("logistics.pallet.empty") }}
            <span class="mt-1 block text-xs">{{ t("logistics.pallet.emptyHint") }}</span>
            <button v-if="canWrite" type="button" class="th-btn-primary mx-auto mt-4 block text-xs" @click="addPallet">
              {{ t("logistics.pallet.createFirst") }}
            </button>
          </p>

          <article
            v-for="(pallet, index) in pallets"
            :key="pallet.row_id ?? index"
            class="rounded-lg border p-4"
            :class="pallet.is_overloaded ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'"
          >
            <div class="flex flex-wrap items-center gap-2">
              <code class="font-mono text-sm font-semibold">{{ pallet.pallet_code }}</code>
              <AppSelect
                v-if="canWrite"
                :model-value="pallet.pallet_type"
                :options="palletTypeOptions"
                class="max-w-[170px]"
                @update:model-value="changeType(index, $event)"
              />
              <span v-else class="text-xs text-slate-600 dark:text-slate-400">{{ pallet.pallet_type }}</span>
              <span class="ms-auto text-xs text-slate-600 dark:text-slate-400">
                {{ t("logistics.pallet.packageCount", { count: pallet.package_count }) }}
              </span>
              <button
                v-if="canWrite"
                type="button"
                class="th-btn-outline text-xs"
                @click="removePallet(index)"
              >
                {{ t("logistics.packing.removePackage") }}
              </button>
            </div>

            <div class="mt-3 space-y-2">
              <div v-for="gauge in gaugesOf(pallet)" :key="gauge.key">
                <div class="flex items-baseline justify-between text-xs">
                  <span class="text-slate-600 dark:text-slate-400">{{ gauge.label }}</span>
                  <span
                    class="tabular-nums"
                    :class="gauge.exceeded ? 'font-semibold text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'"
                  >
                    {{ gauge.text }}
                  </span>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    class="h-full rounded-full transition-[width] duration-300"
                    :class="gauge.exceeded ? 'bg-red-500' : gauge.percent > 85 ? 'bg-amber-500' : 'bg-indigo-500'"
                    :style="{ width: `${Math.min(100, gauge.percent)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label class="flex items-center gap-2">
                <span class="text-slate-600 dark:text-slate-400">{{ t("logistics.pallet.layers") }}</span>
                <input
                  :value="pallet.layer_count"
                  type="number"
                  min="0"
                  :max="pallet.max_layers"
                  class="form-input w-20 py-1 text-xs tabular-nums"
                  :disabled="!canWrite || !pallet.packages.length"
                  :title="pallet.packages.length ? '' : t('logistics.pallet.layersNeedPackages')"
                  @input="changeLayers(index, $event.target.value)"
                />
              </label>
              <span class="ms-auto text-slate-600 dark:text-slate-400">
                {{ t("logistics.pallet.loadedDesi") }}: <b class="tabular-nums">{{ pallet.loaded_desi }}</b>
              </span>
              <!-- Katman = palet üstüne kaç KAT koli dizildiği. Ağırlıktan
                   bağımsız bir sınır: hafif ama yüksek istif devrilir ve
                   forklift alamaz. Operatör fiziksel düzene göre giriyor,
                   koli sayısından türetilemez (4 koli 1 kat da olabilir
                   2 kat da). -->
              <p class="w-full text-[11px] text-slate-600 dark:text-slate-400">
                {{ t("logistics.pallet.layersHint") }}
              </p>
            </div>

            <!-- Palete yüklenmiş koliler — ekranın ASIL işi. -->
            <div class="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <p v-if="!pallet.packages.length" class="text-xs text-slate-600 dark:text-slate-400">
                {{ t("logistics.pallet.noPackages") }}
              </p>
              <ul v-else class="flex flex-wrap gap-2">
                <li
                  v-for="code in pallet.packages"
                  :key="code"
                  class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
                >
                  <span class="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {{ sequenceOf(code) }}
                  </span>
                  <code class="font-mono">{{ code.slice(-2) }}</code>
                  <span class="tabular-nums text-slate-600 dark:text-slate-400">{{ weightOf(code) }} kg</span>
                  <button
                    v-if="canWrite"
                    type="button"
                    class="text-slate-600 dark:text-slate-400 transition-colors hover:text-red-500"
                    :aria-label="t('logistics.pallet.removePackage', { code })"
                    @click="unassign(index, code)"
                  >
                    ×
                  </button>
                </li>
              </ul>
            </div>
          </article>
        </div>

        <!-- Atanmamış koliler havuzu -->
        <aside class="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            {{ t("logistics.pallet.unassigned") }}
          </h2>
          <!-- Üç ayrı durum: koli YOK / palet yok / hepsi yerleşmiş.
               Hepsini "tüm koliler yerleştirildi" diye göstermek yanlıştı:
               hiç koli olmayan sevkiyatta bu cümle işin bittiğini söylüyor. -->
          <template v-if="!packages.length">
            <p class="text-xs text-slate-600 dark:text-slate-400">{{ t("logistics.pallet.noPackagesYet") }}</p>
            <button type="button" class="th-btn-outline mt-2 text-xs" @click="goPacking">
              {{ t("logistics.label.goPacking") }}
            </button>
          </template>
          <p v-else-if="!unassigned.length" class="text-xs text-slate-600 dark:text-slate-400">
            {{ pallets.length ? t("logistics.pallet.allAssigned") : t("logistics.pallet.assignHint") }}
          </p>
          <ul v-else class="space-y-2">
            <li
              v-for="pkg in unassigned"
              :key="pkg.package_code"
              class="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
            >
              <div class="flex items-center gap-2">
                <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {{ pkg.sequence_label }}
                </span>
                <code class="font-mono text-xs">{{ pkg.package_code.slice(-2) }}</code>
                <span class="ms-auto text-xs tabular-nums text-slate-600 dark:text-slate-400">{{ pkg.weight_kg }} kg</span>
              </div>
              <div v-if="canWrite && pallets.length" class="mt-2 flex flex-wrap gap-1">
                <button
                  v-for="(pallet, index) in pallets"
                  :key="pallet.row_id ?? index"
                  type="button"
                  class="th-btn-outline text-[11px]"
                  @click="assign(index, pkg.package_code)"
                >
                  {{ pallet.pallet_code }}
                </button>
              </div>
              <p v-else-if="canWrite" class="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                {{ t("logistics.pallet.needPallet") }}
              </p>
            </li>
          </ul>
        </aside>
      </div>

    </template>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { LogisticsApiError } from "@/api/logistics";
  import { getPalletPlan, savePalletPlan } from "@/api/packaging";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **P4 · Palet planı** — F1 düzeni (kapasite kartları) + koli atama.
   *
   * `is_overloaded` SUNUCUDAN geliyor, ekran yeniden hesaplamıyor: kapasite
   * kuralı backend'in kararı (sözleşme §2.8). Atama değişince kaydedilir ve
   * dönen yükteki bayrak kullanılır — yerel tahmin yürütülmüyor.
   *
   * Kendi store'u YOK: paketleme store'u sevkiyat taslağını tutuyor, palet
   * ondan bağımsız bir kayıt. Tek ekranlık state'i buraya koymak, store'a
   * yalnız burada kullanılan alanlar eklemekten sade.
   */
  const logisticsStore = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const pallets = ref([]);
  const packages = ref([]);
  const palletTypes = ref([]);
  const baseModified = ref(null);
  const loading = ref(false);
  const saving = ref(false);
  const dirty = ref(false);
  const error = ref(null);

  const shipmentName = computed(() => route.params.name);
  const canWrite = computed(() => logisticsStore.can.write);
  const overloaded = computed(() => pallets.value.filter((p) => p.is_overloaded));

  const palletTypeOptions = computed(() => [
    // Kayıttaki tip katalogdan kaldırılmışsa seçim kutusu BOŞ görünüyordu.
    // Bilinmeyen değeri listeye ekleyip işaretliyoruz — kullanıcı ne
    // olduğunu görmeden değiştirmek zorunda kalmasın.
    ...pallets.value
      .map((p) => p.pallet_type)
      .filter((name) => name && !palletTypes.value.some((tp) => tp.name === name))
      .map((name) => ({ value: name, label: `${name} · katalogda yok` })),
    ...palletTypes.value.map((tp) => ({
      value: tp.name,
      // Ölçü de yazılıyor: iki tip aynı ağırlık sınırını taşıyabiliyor,
      // ayırt eden şey taban ölçüsü.
      label: tp.length_cm
        ? `${tp.name} · ${tp.length_cm}×${tp.width_cm} cm · max ${tp.max_weight_kg} kg`
        : `${tp.name} · max ${tp.max_weight_kg} kg`,
    })),
  ]);

  /** Hiçbir palete konmamış koliler — atama havuzu. */
  const unassigned = computed(() => {
    const taken = new Set(pallets.value.flatMap((p) => p.packages ?? []));
    return packages.value.filter((p) => !taken.has(p.package_code));
  });

  const byCode = computed(() => new Map(packages.value.map((p) => [p.package_code, p])));
  const sequenceOf = (code) => byCode.value.get(code)?.sequence_label ?? "?";
  const weightOf = (code) => byCode.value.get(code)?.weight_kg ?? 0;

  function gaugesOf(pallet) {
    const wMax = Number(pallet.max_weight_kg) || 0;
    const wLoaded = Number(pallet.loaded_weight_kg) || 0;
    const lMax = Number(pallet.max_layers) || 0;
    const lLoaded = Number(pallet.layer_count) || 0;
    return [
      {
        key: "weight",
        label: t("logistics.pallet.weight"),
        text: `${wLoaded} / ${wMax} kg`,
        percent: wMax ? (wLoaded / wMax) * 100 : 0,
        exceeded: wMax > 0 && wLoaded > wMax,
      },
      {
        key: "layers",
        label: t("logistics.pallet.layers"),
        text: `${lLoaded} / ${lMax}`,
        percent: lMax ? (lLoaded / lMax) * 100 : 0,
        exceeded: lMax > 0 && lLoaded > lMax,
      },
    ];
  }

  const totals = computed(() => [
    { key: "pallets", label: t("logistics.pallet.totalPallets"), value: pallets.value.length },
    {
      key: "packages",
      label: t("logistics.pallet.totalPackages"),
      value: pallets.value.reduce((s, p) => s + (Number(p.package_count) || 0), 0),
    },
    {
      key: "weight",
      label: t("logistics.pallet.totalWeight"),
      value: `${pallets.value.reduce((s, p) => s + (Number(p.loaded_weight_kg) || 0), 0).toFixed(1)} kg`,
    },
  ]);

  function capture(e) {
    error.value =
      e instanceof LogisticsApiError
        ? { code: e.code, message: e.message }
        : { code: "INTERNAL_ERROR", message: e?.message || "Beklenmeyen bir hata oluştu." };
  }

  function adopt(data) {
    pallets.value = (data?.pallets ?? []).map((p) => ({ ...p, packages: [...(p.packages ?? [])] }));
    packages.value = data?.packages ?? [];
    palletTypes.value = data?.pallet_types ?? [];
    baseModified.value = data?.modified ?? null;
    dirty.value = false;
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      adopt(await getPalletPlan(shipmentName.value));
    } catch (e) {
      pallets.value = [];
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    saving.value = true;
    error.value = null;
    try {
      adopt(await savePalletPlan(shipmentName.value, pallets.value, baseModified.value));
    } catch (e) {
      capture(e);
    } finally {
      saving.value = false;
    }
  }

  function touch() {
    dirty.value = true;
  }

  function addPallet() {
    const type =
      palletTypes.value.find((tp) => tp.is_default) ??
      palletTypes.value[0] ??
      { name: "Euro Palet (EPAL)", max_weight_kg: 1000, max_layers: 5 };
    pallets.value = [
      ...pallets.value,
      {
        row_id: null,
        pallet_code: `PLT-${String(pallets.value.length + 1).padStart(3, "0")}`,
        pallet_type: type.name,
        max_weight_kg: type.max_weight_kg,
        max_layers: type.max_layers,
        layer_count: 0,
        packages: [],
        package_count: 0,
        loaded_weight_kg: 0,
        loaded_desi: 0,
        is_overloaded: 0,
      },
    ];
    touch();
  }

  function removePallet(index) {
    // Üzerindeki koliler havuza geri düşüyor — atama kaybolmasın diye
    // ayrıca bir şey yapmaya gerek yok, `unassigned` türetilmiş.
    pallets.value = pallets.value.filter((_, i) => i !== index);
    touch();
  }

  function changeType(index, typeName) {
    const type = palletTypes.value.find((tp) => tp.name === typeName);
    patch(index, type
      ? { pallet_type: typeName, max_weight_kg: type.max_weight_kg, max_layers: type.max_layers }
      : { pallet_type: typeName });
  }

  function changeLayers(index, value) {
    patch(index, { layer_count: Number(value) || 0 });
  }

  function patch(index, values) {
    pallets.value = pallets.value.map((p, i) => (i === index ? { ...p, ...values } : p));
    touch();
  }

  /** Koliyi palete koyar. Bir koli aynı anda tek palette olabilir. */
  function assign(index, code) {
    pallets.value = pallets.value.map((p, i) => ({
      ...p,
      packages: i === index
        ? [...p.packages, code]
        : p.packages.filter((c) => c !== code),
    }));
    touch();
  }

  function unassign(index, code) {
    pallets.value = pallets.value.map((p, i) =>
      i === index ? { ...p, packages: p.packages.filter((c) => c !== code) } : p
    );
    touch();
  }

  function goPacking() {
    router.push({ name: "LogisticsPacking", params: { name: shipmentName.value } });
  }

  onMounted(async () => {
    await logisticsStore.fetchPermissions();
    load();
  });

  watch(shipmentName, load);
</script>

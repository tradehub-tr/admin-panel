<template>
  <form class="space-y-6" @submit.prevent="$emit('save', draft)">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("logistics.manual.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.manual.subtitle") }}</p>
      </div>
      <div class="ms-auto flex gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button type="submit" class="hdr-btn-primary" :disabled="saving || !isValid">
          {{ saving ? t("logistics.form.saving") : t("logistics.form.save") }}
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ t("logistics.manual.carrierSection") }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="form-label">{{ t("logistics.manual.order") }} *</span>
          <LinkInput v-model="draft.order" doctype="Order" />
        </label>

        <label class="block">
          <span class="form-label">{{ t("logistics.manual.channel") }} *</span>
          <AppSelect v-model="draft.channel" :options="channelOptions" />
        </label>

        <!-- Kargo dışı kanallarda taşıyıcı ALANI GÖSTERİLMİYOR: satıcı kendi
             aracıyla teslim ediyorsa "taşıyıcı seç" sormak yanlış soru. -->
        <template v-if="needsCarrier">
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.carrier") }} *</span>
            <LinkInput v-model="draft.carrier" doctype="Logistics Provider" />
          </label>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.service") }}</span>
            <LinkInput v-model="draft.carrier_service" doctype="Carrier Service" />
          </label>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.trackingNumber") }}</span>
            <input v-model="draft.tracking_number" type="text" class="form-input" />
            <span class="mt-1 block text-xs text-gray-400 dark:text-gray-500">
              {{ t("logistics.manual.trackingHint") }}
            </span>
          </label>
        </template>

        <template v-else>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.driverName") }}</span>
            <input v-model="draft.driver_name" type="text" class="form-input" />
          </label>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.vehiclePlate") }}</span>
            <input v-model="draft.vehicle_plate" type="text" class="form-input font-mono uppercase" />
          </label>
        </template>
      </div>
    </section>

    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ t("logistics.manual.datesSection") }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="form-label">{{ t("logistics.manual.shippedDate") }}</span>
          <input v-model="draft.ship_date" type="date" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.manual.estimatedDate") }}</span>
          <input v-model="draft.estimated_delivery" type="date" class="form-input" />
        </label>
      </div>
      <!-- Geçmişe dönük kayıt olağan (offline sevkiyat sonradan giriliyor) ama
           tahmini teslim sevkten ÖNCE olamaz — sessiz geçmek yerine uyarı. -->
      <p v-if="dateOrderInvalid" class="text-xs text-red-600 dark:text-red-400" role="alert">
        {{ t("logistics.manual.dateOrderWarning") }}
      </p>
    </section>

    <!-- G0/K1: maliyet bölümü yalnız yetkili göze çizilir. Satıcı platformun
         taşıyıcı anlaşma maliyetini GÖRMEZ (maliyet asimetrisi) — ona bu
         bölümü göstermek hem karar sızıntısı hem doldursa da backend'in
         yok sayacağı alan olurdu. cost_paid_by zorunlu alan olduğundan
         bölüm gizliyken varsayılanı view atar. -->
    <section v-if="can.viewCost" class="card space-y-3 p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ t("logistics.manual.costSection") }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block">
          <span class="form-label">{{ t("logistics.cost.carrierCost") }}</span>
          <input v-model.number="draft.carrier_cost" type="number" step="0.01" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.cost.customerCharge") }}</span>
          <input v-model.number="draft.customer_charge" type="number" step="0.01" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.cost.paidBy") }} *</span>
          <AppSelect v-model="draft.cost_paid_by" :options="paidByOptions" />
        </label>
      </div>
      <!-- TUR-121: alış ve satış AYRI raporlanır. Zarar eden bir sevkiyat
           kaydedilebilir ama operatör bunu görerek yapmalı. -->
      <p v-if="marginNegative" class="text-xs text-amber-700 dark:text-amber-400">
        {{ t("logistics.manual.negativeMargin", { amount: marginLabel }) }}
      </p>
    </section>

    <p v-if="!isValid" class="text-xs text-gray-400 dark:text-gray-500">
      {{ t("logistics.manual.requiredHint") }}
    </p>
  </form>
</template>

<script setup>
  import { computed, ref, toRaw, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import LinkInput from "@/components/common/LinkInput.vue";

  import ErrorState from "./ErrorState.vue";
  import { CARRIER_LESS_CHANNELS, COST_PAID_BY } from "./constants";

  /**
   * **C1 · Manuel sevkiyat formu** (TUR-107).
   *
   * Entegrasyonu olmayan taşıyıcılar ve kargo dışı kanallar için. Form
   * KANALA göre şekil değiştiriyor: satıcı aracıyla teslimatta "taşıyıcı seç"
   * sormak anlamsız, "plaka" sormak gerekli.
   *
   * 2026-08-19: panel diline çevrildi (hdr-btn, card, form-input, gray
   * tonları) ve maliyet bölümü `can.viewCost` kapısına bağlandı (G0/K1).
   */
  const props = defineProps({
    modelValue: { type: Object, default: () => ({}) },
    channels: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ viewCost: false }) },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["save", "cancel", "retry"]);

  const { t } = useI18n();

  const cloneDoc = (value) => structuredClone(toRaw(value) ?? {});
  const draft = ref(cloneDoc(props.modelValue));
  watch(
    () => props.modelValue,
    (next) => {
      draft.value = cloneDoc(next);
    },
    { deep: true }
  );

  // QA bulgusu: kargo kanalında taşıyıcı doldurup SELLER_VEHICLE'a geçen
  // kullanıcının payload'ında iki grubun alanları BİRLİKTE gidiyordu —
  // çelişkili kayıt. Kanal değişince aktif kanala ait olmayan alanlar
  // draft'tan silinir. Yukarıdaki modelValue watch'ı draft'ı komple yeniden
  // klonladığı için burada draft nesnesini yeniden yaratmıyoruz; yalnız
  // ilgili alanları düşürüyoruz — iki watcher aynı nesneyi ezmez.
  watch(
    () => draft.value.channel,
    (channel) => {
      const staleFields = CARRIER_LESS_CHANNELS.includes(channel)
        ? ["carrier", "carrier_service", "tracking_number"]
        : ["driver_name", "vehicle_plate"];
      for (const field of staleFields) delete draft.value[field];
    }
  );

  const channelOptions = computed(() =>
    props.channels.map((c) => ({ value: c.channel_code ?? c.name, label: c.channel_name ?? c.name }))
  );

  const paidByOptions = computed(() =>
    COST_PAID_BY.map((value) => ({ value, label: t(`logistics.paidBy.${value}`) }))
  );

  const needsCarrier = computed(() => !CARRIER_LESS_CHANNELS.includes(draft.value.channel));

  const dateOrderInvalid = computed(() => {
    const { ship_date: shipped, estimated_delivery: eta } = draft.value;
    return Boolean(shipped && eta) && eta < shipped;
  });

  const margin = computed(
    () => Number(draft.value.customer_charge ?? 0) - Number(draft.value.carrier_cost ?? 0)
  );
  const marginNegative = computed(
    () => draft.value.carrier_cost != null && draft.value.customer_charge != null && margin.value < 0
  );
  const marginLabel = computed(() =>
    Math.abs(margin.value).toLocaleString(undefined, { style: "currency", currency: "TRY" })
  );

  const isValid = computed(() => {
    const d = draft.value;
    if (!d.order || !d.channel || !d.cost_paid_by) return false;
    if (needsCarrier.value && !d.carrier) return false;
    return !dateOrderInvalid.value;
  });
</script>

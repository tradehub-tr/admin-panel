<template>
  <form ref="formRef" class="space-y-6" @submit.prevent="submit">
    <!-- KALICI canlı bölge (WCAG 4.1.3): başarısız kaydetmede eksik alanlar
         duyurulur. Kap koşullu bloğun içinde doğsaydı kap+içerik DOM'a
         birlikte girer ve polite duyuru çoğu okuyucuda okunmazdı. -->
    <span role="status" class="sr-only">{{ errorAnnouncement }}</span>

    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("logistics.manual.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.manual.subtitle") }}</p>
        <!-- WCAG 3.3.2: yıldızın anlamı formun başında bir kez açıklanır -->
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("a11y.requiredFields") }}</p>
      </div>
      <div class="ms-auto flex gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <!-- Buton eksik alan varken de AKTİF (ResolveDialog deseni, WCAG
             denetimi 2026-08-24). Pasif butonda submit'e hiç gelinemiyordu,
             dolayısıyla "neden kaydedemiyorum" sorusu ekran okuyucuya HİÇ
             cevaplanmıyordu (WCAG 3.3.1). Doğrulama artık submit'te çalışır,
             eksikleri duyurur ve odağı ilk hatalı kontrole taşır. -->
        <button type="submit" class="hdr-btn-primary" :disabled="saving">
          {{ saving ? t("logistics.form.saving") : t("logistics.form.save") }}
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Hata özeti: her madde ilgili kontrole atlar. Aynı sözlük anahtarı
         hem burada başlık ("Eksik zorunlu alanlar:") hem canlı bölgede tam
         liste olarak kullanılıyor. -->
    <div
      v-if="submitAttempted && problems.length"
      class="card border-red-300 dark:border-red-700"
      role="group"
      :aria-labelledby="`${uid}-error-summary`"
    >
      <p :id="`${uid}-error-summary`" class="text-sm font-bold text-red-700 dark:text-red-400">
        {{ t("docTypeForm.requiredFieldsMissing", { fields: "" }) }}
      </p>
      <ul class="mt-2 list-disc space-y-1 ps-5 text-sm">
        <li v-for="problem in problems" :key="problem.field">
          <button
            type="button"
            class="underline text-red-700 dark:text-red-400"
            @click="focusField(problem.field)"
          >
            {{ problem.label }}
          </button>
        </li>
      </ul>
    </div>

    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ t("logistics.manual.carrierSection") }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Zorunlu alan boşken (submit bu yüzden kilitli) ipucu alanın
             ALTINDA yazılı — buton neden basılmıyor sorusu cevapsız kalmasın
             (WCAG 3.3.1/3.3.2). LinkInput/AppSelect sarmalı kontrole
             aria-invalid/aria-describedby geçiremiyor (prop yok) — metin
             görünür ipucu olarak veriliyor. -->
        <!-- `data-field`: hata özetinden ve başarısız submit'ten odak
             taşımanın çapası. LinkInput/AppSelect id ALMIYOR (sarmalayıcı
             bileşen), hedef sarmalın ilk odaklanabilir öğesi. -->
        <div class="block" data-field="order">
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.order") }} *</span>
            <LinkInput
              v-model="draft.order"
              doctype="Order"
              :aria-label="t('logistics.manual.order')"
              required
            />
          </label>
          <span v-if="!draft.order" class="mt-1 block text-xs text-gray-600 dark:text-gray-400">
            {{ t("a11y.fieldRequired") }}
          </span>
        </div>

        <div class="block" data-field="channel">
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.channel") }} *</span>
            <AppSelect
              v-model="draft.channel"
              :options="channelOptions"
              :aria-label="t('logistics.manual.channel')"
            />
          </label>
          <span v-if="!draft.channel" class="mt-1 block text-xs text-gray-600 dark:text-gray-400">
            {{ t("a11y.fieldRequired") }}
          </span>
        </div>

        <!-- Kargo dışı kanallarda taşıyıcı ALANI GÖSTERİLMİYOR: satıcı kendi
             aracıyla teslim ediyorsa "taşıyıcı seç" sormak yanlış soru. -->
        <template v-if="needsCarrier">
          <div class="block" data-field="carrier">
            <label class="block">
              <span class="form-label">{{ t("logistics.manual.carrier") }} *</span>
              <LinkInput
                v-model="draft.carrier"
                doctype="Logistics Provider"
                :aria-label="t('logistics.manual.carrier')"
                required
              />
            </label>
            <span v-if="!draft.carrier" class="mt-1 block text-xs text-gray-600 dark:text-gray-400">
              {{ t("a11y.fieldRequired") }}
            </span>
          </div>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.service") }}</span>
            <LinkInput
              v-model="draft.carrier_service"
              doctype="Carrier Service"
              :aria-label="t('logistics.manual.service')"
            />
          </label>
          <label class="block">
            <span class="form-label">{{ t("logistics.manual.trackingNumber") }}</span>
            <input v-model="draft.tracking_number" type="text" class="form-input" />
            <span class="mt-1 block text-xs text-gray-600 dark:text-gray-400">
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
            <input
              v-model="draft.vehicle_plate"
              type="text"
              class="form-input font-mono uppercase"
            />
          </label>
        </template>
      </div>
    </section>

    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ t("logistics.manual.datesSection") }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block" data-field="ship_date">
          <span class="form-label">{{ t("logistics.manual.shippedDate") }}</span>
          <input
            v-model="draft.ship_date"
            type="date"
            class="form-input"
            :aria-invalid="dateOrderInvalid ? 'true' : undefined"
            :aria-describedby="dateOrderInvalid ? dateWarningId : undefined"
          />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.manual.estimatedDate") }}</span>
          <input
            v-model="draft.estimated_delivery"
            type="date"
            class="form-input"
            :aria-invalid="dateOrderInvalid ? 'true' : undefined"
            :aria-describedby="dateOrderInvalid ? dateWarningId : undefined"
          />
        </label>
      </div>
      <!-- Geçmişe dönük kayıt olağan (offline sevkiyat sonradan giriliyor) ama
           tahmini teslim sevkten ÖNCE olamaz — sessiz geçmek yerine uyarı.
           id: iki tarih girdisi de aria-describedby ile buna bağlı; `useId`
           çünkü sabit id bileşen sayfada iki kez render edilince çakışıyordu
           (Storybook grid, ileride sekme/drawer — WCAG 4.1.1). -->
      <p
        v-if="dateOrderInvalid"
        :id="dateWarningId"
        class="text-xs text-red-600 dark:text-red-400"
        role="alert"
      >
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
          <input
            v-model.number="draft.customer_charge"
            type="number"
            step="0.01"
            class="form-input"
          />
        </label>
        <div class="block" data-field="cost_paid_by">
          <label class="block">
            <span class="form-label">{{ t("logistics.cost.paidBy") }} *</span>
            <AppSelect
              v-model="draft.cost_paid_by"
              :options="paidByOptions"
              :aria-label="t('logistics.cost.paidBy')"
            />
          </label>
          <span
            v-if="!draft.cost_paid_by"
            class="mt-1 block text-xs text-gray-600 dark:text-gray-400"
          >
            {{ t("a11y.fieldRequired") }}
          </span>
        </div>
      </div>
      <!-- TUR-121: alış ve satış AYRI raporlanır. Zarar eden bir sevkiyat
           kaydedilebilir ama operatör bunu görerek yapmalı. -->
      <p v-if="marginNegative" class="text-xs text-amber-700 dark:text-amber-400">
        {{ t("logistics.manual.negativeMargin", { amount: marginLabel }) }}
      </p>
    </section>

    <p v-if="!isValid" class="text-xs text-gray-600 dark:text-gray-400">
      {{ t("logistics.manual.requiredHint") }}
    </p>
  </form>
</template>

<script setup>
  import { computed, nextTick, ref, toRaw, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import { formatTry } from "@/utils/format";

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

  const emit = defineEmits(["save", "cancel", "retry"]);

  const { t } = useI18n();

  // Sabit id bileşen sayfada iki kez render edilince çakışıyordu (WCAG 4.1.1).
  const uid = useId();
  const dateWarningId = `${uid}-date-order-warning`;

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
    props.channels.map((c) => ({
      value: c.channel_code ?? c.name,
      label: c.channel_name ?? c.name,
    }))
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
    () =>
      draft.value.carrier_cost != null && draft.value.customer_charge != null && margin.value < 0
  );
  // Yerel `toLocaleString(undefined, …)` kopyası kaldırıldı: biçim kullanıcının
  // TARAYICI diline bağlıydı ve boş değerde "NaN"e düşüyordu (SOLID denetimi).
  const marginLabel = computed(() => formatTry(Math.abs(margin.value)));

  /**
   * Formun TEK doğruluk kaynağı: hem `isValid`, hem hata özeti, hem canlı
   * duyuru buradan besleniyor. Eskiden `isValid` ayrı bir koşul zinciriydi ve
   * "hangi alan eksik" bilgisi hiçbir yerde YOKTU.
   *
   * `cost_paid_by` maliyet bölümü gizliyken de aranıyor (uç zorunlu tutuyor;
   * varsayılanı container atıyor) — kullanıcıya sessiz kalmaktansa eksik
   * alanı söylemek doğru.
   */
  const problems = computed(() => {
    const d = draft.value;
    const list = [];
    if (!d.order) list.push({ field: "order", label: t("logistics.manual.order") });
    if (!d.channel) list.push({ field: "channel", label: t("logistics.manual.channel") });
    if (needsCarrier.value && !d.carrier) {
      list.push({ field: "carrier", label: t("logistics.manual.carrier") });
    }
    if (!d.cost_paid_by) list.push({ field: "cost_paid_by", label: t("logistics.cost.paidBy") });
    if (dateOrderInvalid.value) {
      list.push({ field: "ship_date", label: t("logistics.manual.dateOrderWarning") });
    }
    return list;
  });

  const isValid = computed(() => problems.value.length === 0);

  /** Doğrulama SUBMIT'ten sonra konuşur, yazarken susar (ResolveDialog deseni). */
  const submitAttempted = ref(false);

  const errorAnnouncement = computed(() =>
    submitAttempted.value && problems.value.length
      ? t("docTypeForm.requiredFieldsMissing", {
          fields: problems.value.map((problem) => problem.label).join(", "),
        })
      : ""
  );

  const formRef = ref(null);

  /**
   * Odağı bir alanın KONTROLÜNE taşır — LinkInput/AppSelect id almadığı için
   * sarmalın `data-field` çapasından ilk odaklanabilir öğeye inilir.
   */
  function focusField(name) {
    const scope = `[data-field="${name}"]`;
    const el = formRef.value?.querySelector(
      `${scope} input, ${scope} select, ${scope} textarea, ${scope} button`
    );
    el?.focus();
  }

  async function submit() {
    if (problems.value.length) {
      submitAttempted.value = true;
      // Özet DOM'a girdikten SONRA odak taşınır.
      await nextTick();
      focusField(problems.value[0].field);
      return;
    }
    emit("save", draft.value);
  }
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.returnDecision.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.returnDecision.subtitle", { request: request.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Kapanmış talep DEĞİŞTİRİLEMEZ (TUR-116). Formu devre dışı bir hâlde
         göstermek yerine hiç göstermiyoruz: düzenlenebilir görünen bir form
         kapalı kaydı da düzenlenebilir sanmaya davet eder. -->
    <div
      v-else-if="request.is_closed"
      class="rounded border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
    >
      {{ t("logistics.returnDecision.closedBlocked") }}
    </div>

    <div
      v-else-if="request.decided_at"
      class="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300"
    >
      <p class="font-medium">
        {{ t("logistics.returnDecision.alreadyDecided", { at: formatTime(request.decided_at) }) }}
      </p>
      <p v-if="request.decision_note" class="mt-1">{{ request.decision_note }}</p>
    </div>

    <template v-else>
      <!-- Talep bağlamı: karar veren, neyin iadesine baktığını görmeli -->
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.returnDecision.reason") }}</dt>
          <dd class="mt-0.5 font-medium">{{ t(`logistics.returnReason.${request.reason}`) }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.returnDecision.originalShipment") }}</dt>
          <dd class="mt-0.5 font-mono">{{ request.shipment || "—" }}</dd>
        </div>
      </dl>

      <ul v-if="request.items?.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        <li v-for="item in request.items" :key="item.item" class="flex flex-wrap items-baseline gap-3 p-3 text-sm">
          <span class="min-w-0 grow font-medium">{{ item.item_name }}</span>
          <span class="tabular-nums text-slate-500">
            {{ item.requested_qty }} {{ item.uom }}
          </span>
        </li>
      </ul>

      <fieldset class="space-y-2">
        <legend class="mb-1 text-sm font-medium">{{ t("logistics.returnDecision.decision") }} *</legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in DECISIONS"
            :key="option.value"
            type="button"
            class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            :class="
              option.value === decision
                ? option.activeClass
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            "
            :aria-pressed="option.value === decision"
            @click="decision = option.value"
          >
            {{ t(option.labelKey) }}
          </button>
        </div>
      </fieldset>

      <label class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ t("logistics.returnDecision.note") }}
          <template v-if="noteRequired"> *</template>
        </span>
        <textarea
          v-model="note"
          rows="3"
          class="form-input"
          :aria-invalid="noteRequired && noteTooShort"
          :placeholder="t('logistics.returnDecision.notePlaceholder')"
        />
        <!-- Red kararında gerekçe ZORUNLU: alıcıya "reddedildi" demek,
             sebebini söylemeden, ilk itiraz sebebi. Onayda serbest. -->
        <span
          class="mt-1 block text-xs"
          :class="noteRequired && noteTooShort ? 'text-red-600 dark:text-red-400' : 'text-slate-500'"
        >
          {{ noteRequired
            ? t("logistics.returnDecision.noteRequiredHint", { min: MIN_NOTE_LENGTH })
            : t("logistics.returnDecision.noteOptionalHint") }}
        </span>
      </label>

      <!-- Onaylanan iade için ters yönlü sevkiyat ve etiket gerekiyor -->
      <label v-if="decision === 'approved'" class="flex items-start gap-2 text-sm">
        <input v-model="createReturnShipment" type="checkbox" class="mt-0.5" />
        <span>
          {{ t("logistics.returnDecision.createShipment") }}
          <span class="block text-xs text-slate-500">
            {{ t("logistics.returnDecision.createShipmentHint") }}
          </span>
        </span>
      </label>

      <div class="flex gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button type="submit" class="th-btn-primary text-sm" :disabled="saving || !canSubmit">
          {{ saving ? t("logistics.form.saving") : t("logistics.returnDecision.apply") }}
        </button>
      </div>
    </template>
  </form>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";

  /**
   * **I2 · İade operasyonu / karar** (TUR-116).
   *
   * Red kararında gerekçe ZORUNLU, onayda serbest. Gerekçesiz bir red
   * alıcıya "hayır" demek ve sebebini söylememek demek — ilk itiraz
   * sebebi bu.
   *
   * Kapanmış talepte form HİÇ render edilmiyor; devre dışı bir form
   * "aslında düzenlenebilir" izlenimi bırakır.
   */
  defineProps({
    request: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  const emit = defineEmits(["apply", "cancel", "retry"]);

  const { t } = useI18n();

  const MIN_NOTE_LENGTH = 10;

  const DECISIONS = [
    {
      value: "approved",
      labelKey: "logistics.returnDecision.approve",
      activeClass: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      value: "rejected",
      labelKey: "logistics.returnDecision.reject",
      activeClass: "border-red-500 bg-red-50 dark:bg-red-900/30",
    },
  ];

  const decision = ref("");
  const note = ref("");
  const createReturnShipment = ref(true);

  const noteRequired = computed(() => decision.value === "rejected");
  const noteTooShort = computed(() => note.value.trim().length < MIN_NOTE_LENGTH);

  const canSubmit = computed(() => {
    if (!decision.value) return false;
    return !noteRequired.value || !noteTooShort.value;
  });

  function submit() {
    if (!canSubmit.value) return;
    emit("apply", {
      status: decision.value,
      decision_note: note.value.trim() || null,
      create_return_shipment: decision.value === "approved" ? createReturnShipment.value : false,
    });
  }

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
</script>

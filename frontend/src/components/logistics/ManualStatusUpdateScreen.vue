<template>
  <form ref="formRef" class="space-y-5" @submit.prevent="submit">
    <LiveStatus :text="errorAnnouncement" />

    <header class="min-w-0">
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
        {{ t("logistics.statusUpdate.title") }}
      </h1>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ t("logistics.statusUpdate.subtitle", { shipment: shipment.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div class="card flex flex-wrap items-center gap-3">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ t("logistics.statusUpdate.current") }}
      </span>
      <StatusBadge :status="shipment.status" />
      <span aria-hidden="true" class="text-gray-600">→</span>
      <StatusBadge v-if="target" :status="target" />
      <span v-else class="text-sm text-gray-600">{{ t("logistics.statusUpdate.pickTarget") }}</span>
    </div>

    <!-- Terminal durumdan ileri geçiş YOK (constants.py TERMINAL_STATUSES).
         Seçenek listesini boş bırakıp sebebini söylemek, geçersiz seçenek
         gösterip kaydederken reddetmekten dürüst. -->
    <div
      v-if="isTerminal"
      class="rounded border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
    >
      {{ t("logistics.statusUpdate.terminalBlocked") }}
    </div>

    <template v-else>
      <!-- Hata özeti: her madde ilgili kontrole atlar (ManualShipmentFormScreen
           deseni). Doğrulama SUBMIT'ten sonra konuşur, yazarken susar. -->
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

      <fieldset class="space-y-2" data-field="target">
        <legend class="form-label">
          {{ t("logistics.statusUpdate.target") }}
          <span class="text-red-500 ml-0.5">*</span>
        </legend>
        <!-- TEK SEÇİMLİ grup RADIOGROUP olarak modelleniyor (WCAG turu
             2026-08-25): butonlar `aria-pressed` taşıyordu, yani okuyucu
             birbirinden bağımsız N adet aç/kapa düğmesi duyuruyordu — oysa
             seçenekler birbirini dışlıyor ve fieldset/legend zaten grubu
             adlandırıyor. `aria-checked` + gezici tabindex + ok tuşları ARIA
             APG radiogroup sözleşmesinin tamamı; ok tuşları olmadan rolü
             ilan etmek okuyucuya yalan söylerdi. -->
        <div class="flex flex-wrap gap-2" role="radiogroup" :aria-required="true">
          <button
            v-for="(status, index) in allowedTargets"
            :key="status"
            ref="targetButtons"
            type="button"
            role="radio"
            class="hdr-btn-outlined status-choice"
            :class="{ 'is-selected': status === target }"
            :aria-checked="status === target"
            :tabindex="rovingIndex === index ? 0 : -1"
            @click="pickTarget(index)"
            @keydown.left.prevent="moveTarget(-1)"
            @keydown.up.prevent="moveTarget(-1)"
            @keydown.right.prevent="moveTarget(1)"
            @keydown.down.prevent="moveTarget(1)"
          >
            <StatusBadge :status="status" :show-dot="false" />
          </button>
        </div>
        <p v-if="!allowedTargets.length" class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.statusUpdate.noTransition") }}
        </p>
      </fieldset>

      <label class="block" data-field="reason">
        <span class="form-label">
          {{ t("logistics.statusUpdate.reason") }}
          <span class="text-red-500 ml-0.5">*</span>
        </span>
        <textarea
          v-model="reason"
          rows="3"
          class="form-input"
          :aria-required="true"
          :aria-invalid="reasonTooShort"
          :aria-describedby="reasonHintId"
          :placeholder="t('logistics.statusUpdate.reasonPlaceholder')"
        />
        <!-- TUR-107 audit kriteri: manuel değişiklik GEREKÇESİZ yapılamaz.
             Gerekçe olay akışına yazılıyor ve orada kalıcı. id: textarea
             aria-describedby ile bu ipucuna bağlı (WCAG 3.3.1) ve `useId`
             ile üretiliyor — sabit id, bileşen sayfada iki kez render
             edilince çakışıp describedby'ı yanlış düğüme bağlıyordu
             (WCAG 4.1.1). -->
        <span
          :id="reasonHintId"
          class="mt-1 block text-xs"
          :class="reasonTooShort ? 'text-red-600 dark:text-red-400' : 'text-gray-600'"
        >
          {{ t("logistics.statusUpdate.reasonHint", { min: MIN_REASON_LENGTH }) }}
        </span>
      </label>

      <!-- Bilgilendirme kutusu yalnız ucun bunu taşıyabildiği yerde çizilir;
           gerekçesi script bloğunda (`canNotifyBuyer`). -->
      <!-- `.form-checkbox`: çıplak kutucuk tarayıcı varsayılanı ~13px kalıyordu;
           sınıf panelin 24×24 dokunma hedefi garantisini getiriyor (WCAG 2.5.8). -->
      <label v-if="canNotifyBuyer" class="flex items-start gap-2 text-sm">
        <input v-model="notifyBuyer" type="checkbox" class="form-checkbox mt-0.5" />
        <span>
          {{ t("logistics.statusUpdate.notifyBuyer") }}
          <span class="block text-xs text-gray-600 dark:text-gray-400">
            {{ t("logistics.statusUpdate.notifyHint") }}
          </span>
        </span>
      </label>

      <div class="flex gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <!-- Buton eksik alan varken de AKTİF (ResolveDialog /
             ManualShipmentFormScreen deseni, WCAG denetimi 2026-08-25). Pasif
             butonda submit'e hiç gelinemiyordu, dolayısıyla "neden
             kaydedemiyorum" sorusu ekran okuyucuya HİÇ cevaplanmıyordu
             (WCAG 3.3.1). Doğrulama artık submit'te çalışır, eksikleri
             duyurur ve odağı ilk eksik kontrole taşır. -->
        <button type="submit" class="hdr-btn-primary" :disabled="saving">
          {{ saving ? t("logistics.form.saving") : t("logistics.statusUpdate.apply") }}
        </button>
      </div>
    </template>
  </form>
</template>

<script setup>
  import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import LiveStatus from "@/components/common/LiveStatus.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { TERMINAL_STATUSES } from "./constants";

  /**
   * **C2 · Manuel durum güncelleme** (TUR-107).
   *
   * TUR-107 kabul kriteri: *"Manuel değişiklikler gerekçe ile denetim kaydına
   * yazılır."* Gerekçe alanı bu yüzden isteğe bağlı değil. Kaydet butonu
   * eksik alan varken de AKTİF: doğrulama submit'te çalışıp eksikleri
   * duyuruyor ve odağı ilk eksik kontrole taşıyor (pasif butonda "neden
   * kaydedemiyorum" sorusu cevapsız kalıyordu — WCAG 3.3.1). Asıl doğrulama
   * backend'de; sunum katmanı tek başına garanti veremez ama kullanıcıyı da
   * şaşırtmamalı.
   *
   * İzin verilen geçişler dışarıdan geliyor (`allowedTransitions`); geçiş
   * kuralı sözleşmenin parçası, ekranın kararı değil.
   */
  const props = defineProps({
    shipment: { type: Object, required: true },
    /** `{ "In Transit": ["Delivered", "Failed"], ... }` — constants.py'den. */
    allowedTransitions: { type: Object, default: () => ({}) },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /**
     * "Alıcıyı bilgilendir" kutusu çizilsin mi?
     *
     * VARSAYILAN KAPALI ve bu bilinçli. `update_shipment_status(name, status,
     * note)` üçüncü bir parametre almıyor — bildirim tercihi gönderilse bile
     * hiçbir yere yazılmaz. Kutuyu göstermek, kullanıcının işaretleyip
     * "alıcı haber aldı" sanmasına yol açardı; sessizce hiçbir şey yapmayan
     * bir onay kutusu ölü butondan daha kötü, çünkü tıklanınca form GERÇEKTEN
     * gönderiliyor.
     *
     * Uç bildirim parametresi kazandığında container burayı açar.
     */
    canNotifyBuyer: { type: Boolean, default: false },
  });

  const emit = defineEmits(["apply", "cancel", "retry"]);

  const { t } = useI18n();

  const uid = useId();
  const reasonHintId = `${uid}-reason-hint`;

  /** Tek kelimelik "düzeltme" gerekçe değildir — denetim kaydı okunabilir olmalı. */
  const MIN_REASON_LENGTH = 10;

  const target = ref("");
  const reason = ref("");
  const notifyBuyer = ref(false);

  const isTerminal = computed(() => TERMINAL_STATUSES.includes(props.shipment.status));
  const allowedTargets = computed(() => props.allowedTransitions[props.shipment.status] ?? []);

  const reasonTooShort = computed(
    () => reason.value.length > 0 && reason.value.trim().length < MIN_REASON_LENGTH
  );

  /**
   * Formun TEK doğruluk kaynağı — hem hata özeti hem canlı duyuru buradan.
   * Saf computed; durum tutan bir `Set` ya da deep watcher YOK
   * (ManualShipmentFormScreen deseni).
   */
  const problems = computed(() => {
    const list = [];
    if (!target.value) {
      list.push({ field: "target", label: t("logistics.statusUpdate.target") });
    }
    if (reason.value.trim().length < MIN_REASON_LENGTH) {
      list.push({ field: "reason", label: t("logistics.statusUpdate.reason") });
    }
    return list;
  });

  /** Doğrulama SUBMIT'ten sonra konuşur, yazarken susar. */
  const submitAttempted = ref(false);

  const errorAnnouncement = computed(() =>
    submitAttempted.value && problems.value.length
      ? t("docTypeForm.requiredFieldsMissing", {
          fields: problems.value.map((problem) => problem.label).join(", "),
        })
      : ""
  );

  const formRef = ref(null);

  /** Odağı bir alanın KONTROLÜNE taşır — `data-field` çapasından ilk odaklanabilir öğeye. */
  function focusField(name) {
    const scope = `[data-field="${name}"]`;
    formRef.value
      ?.querySelector(`${scope} input, ${scope} select, ${scope} textarea, ${scope} button`)
      ?.focus();
  }

  // ── Radiogroup gezici odağı (ARIA APG) ───────────────────────────────
  // Grup TEK sekme durağı: içinde yalnız bir buton `tabindex="0"` taşır,
  // seçim ok tuşlarıyla değişir. Seçim yokken ilk seçenek duraktır.
  const targetButtons = useTemplateRef("targetButtons");
  const rovingIndex = ref(0);

  watch(allowedTargets, () => {
    rovingIndex.value = 0;
  });

  function pickTarget(index) {
    rovingIndex.value = index;
    target.value = allowedTargets.value[index];
  }

  async function moveTarget(step) {
    const count = allowedTargets.value.length;
    if (!count) return;
    // Radiogroup'ta ok tuşu seçimi de DEĞİŞTİRİR (APG); odak izler.
    pickTarget((rovingIndex.value + step + count) % count);
    await nextTick();
    targetButtons.value?.[rovingIndex.value]?.focus();
  }

  async function submit() {
    if (problems.value.length) {
      submitAttempted.value = true;
      // Özet DOM'a girdikten SONRA odak taşınır.
      await nextTick();
      focusField(problems.value[0].field);
      return;
    }
    submitAttempted.value = false;
    // Kutu çizilmediyse alan HİÇ gönderilmiyor — `false` göndermek de bir
    // tercih bildirmek olurdu, oysa burada tercih diye bir şey yok.
    emit("apply", {
      status: target.value,
      reason: reason.value.trim(),
      ...(props.canNotifyBuyer ? { notify_buyer: notifyBuyer.value } : {}),
    });
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  /* Hedef durum seçici: taban `hdr-btn-outlined`, üzerine yalnız seçim
     vurgusu biniyor. Rozet içerdiği için sabit 34px yüksekliği bırakılıyor. */
  .status-choice {
    height: auto;
    padding: 5px 10px;
  }

  /* Marka vurgusu SCSS'te, Tailwind `dark:` utility'siyle değil: header.scss'in
     `html.dark .hdr-btn-outlined` kuralı `!important` + daha yüksek özgüllük
     taşıyor, utility onu ezemiyordu (scss.md §6 — marka rengi zaten SCSS'in). */
  .status-choice.is-selected {
    border-color: $brand;
    background: rgba($brand, 0.12);

    @include dark {
      border-color: $brand !important;
      background: rgba($brand, 0.14) !important;
    }
  }
</style>

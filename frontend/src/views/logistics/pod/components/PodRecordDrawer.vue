<template>
  <div class="card !p-4 space-y-4">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h2 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ amend ? t("logistics.pod.record.amendTitle") : t("logistics.pod.record.title") }}
      </h2>
      <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
        {{ t("logistics.pod.record.cancel") }}
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <form class="space-y-3" @submit.prevent="submit">
        <div>
          <label class="form-label" for="pod-delivered-at">{{ t("logistics.pod.fields.deliveredAt") }} *</label>
          <input id="pod-delivered-at" v-model="draft.delivered_at" type="datetime-local" class="form-input" />
          <p v-if="errors.delivered_at" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.delivered_at }}</p>
        </div>

        <div>
          <label class="form-label" for="pod-received-by">{{ t("logistics.pod.fields.receivedBy") }} *</label>
          <input id="pod-received-by" v-model="draft.received_by" type="text" class="form-input" />
          <p v-if="errors.received_by" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.received_by }}</p>
        </div>

        <div>
          <label class="form-label" for="pod-title">{{ t("logistics.pod.fields.receivedByTitle") }} *</label>
          <!-- Sıfat listesi bileşene GÖMÜLÜ DEĞİL, i18n sözlüğünden geliyor:
               yeni bir sıfat gerektiğinde çeviri dosyasından ekleniyor. -->
          <AppSelect id="pod-title" v-model="draft.received_by_title" :options="titleOptions" />
          <p v-if="errors.received_by_title" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ errors.received_by_title }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="form-label" for="pod-delivered">{{ t("logistics.pod.fields.deliveredPackages") }} *</label>
            <input id="pod-delivered" v-model.number="draft.delivered_package_count" type="number" min="0" class="form-input" />
            <p v-if="errors.delivered_package_count" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ errors.delivered_package_count }}
            </p>
          </div>
          <div>
            <label class="form-label" for="pod-total">{{ t("logistics.pod.fields.totalPackages") }} *</label>
            <input id="pod-total" v-model.number="draft.total_package_count" type="number" min="1" class="form-input" />
            <p v-if="errors.total_package_count" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ errors.total_package_count }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="form-label" for="pod-pallet-out">{{ t("logistics.pod.fields.deliveredPallets") }}</label>
            <input id="pod-pallet-out" v-model.number="draft.delivered_pallet_count" type="number" min="0" class="form-input" />
          </div>
          <div>
            <label class="form-label" for="pod-pallet-back">{{ t("logistics.pod.fields.returnedPallets") }}</label>
            <input id="pod-pallet-back" v-model.number="draft.returned_pallet_count" type="number" min="0" class="form-input" />
          </div>
        </div>

        <!-- TUTARSIZLIK: kısmi teslimde ZORUNLU. Aksi hâlde sipariş "tam
             teslim" sayılır ve alacak/iade süreci yanlış işler. -->
        <fieldset
          class="rounded-lg border p-3"
          :class="partial ? 'border-red-300 dark:border-red-500/40' : 'border-gray-200 dark:border-white/10'"
        >
          <legend class="px-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t("logistics.pod.record.discrepancySection") }}
          </legend>

          <label class="flex items-center gap-2 text-[13px] text-gray-900 dark:text-gray-100">
            <input v-model="draft.has_discrepancy" type="checkbox" :disabled="partial" />
            {{ t("logistics.pod.fields.hasDiscrepancy") }}
          </label>
          <p v-if="partial" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ t("logistics.pod.record.discrepancyRequired") }}
          </p>

          <div v-if="draft.has_discrepancy" class="mt-3 space-y-3">
            <div>
              <label class="form-label" for="pod-exception">{{ t("logistics.pod.fields.exceptionCode") }} *</label>
              <!-- Katalogdan besleniyor (sözleşme §5.1) — gömülü liste olsaydı
                   "yeni tip nereden eklenecek?" sorusunun cevabı olmazdı. -->
              <AppSelect id="pod-exception" v-model="draft.exception_code" :options="exceptionOptions" />
              <p v-if="errors.exception_code" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ errors.exception_code }}
              </p>
            </div>
            <div>
              <label class="form-label" for="pod-note">{{ t("logistics.pod.fields.discrepancyNote") }}</label>
              <textarea id="pod-note" v-model="draft.discrepancy_note" rows="2" class="form-input"></textarea>
            </div>
          </div>
        </fieldset>

        <div v-if="amend">
          <label class="form-label" for="pod-reason">{{ t("logistics.pod.record.reason") }} *</label>
          <textarea id="pod-reason" v-model="draft.reason" rows="2" class="form-input"></textarea>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t("logistics.pod.record.reasonHint") }}</p>
          <p v-if="errors.reason" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.reason }}</p>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <!-- Doğrulama geçmeden kaydet KAPALI: tıklanabilen ama hiçbir şey
               yapmayan buton günün sonunda tıklanır. -->
          <button type="submit" class="hdr-btn-primary" :disabled="saving || !isValid">
            {{ amend ? t("logistics.pod.record.amendSubmit") : t("logistics.pod.record.submit") }}
          </button>
          <span v-if="saving" class="text-xs text-gray-500 dark:text-gray-400" aria-busy="true">…</span>
        </div>
      </form>

      <!-- YAZDIRILABİLİR TUTANAK: yer tutucu bağlantı değil, gerçekten açılan
           bir belge (FE-MOCK-DİSİPLİNİ §2.3). -->
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
            {{ t("logistics.pod.record.receiptPreview") }}
          </h3>
          <button type="button" class="hdr-btn-outlined" @click="printReceipt">
            {{ t("logistics.pod.record.print") }}
          </button>
        </div>
        <div
          class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 text-[12px] text-gray-900 dark:text-gray-100"
        >
          <p class="font-bold">{{ t("logistics.pod.detail.title") }}</p>
          <p class="text-gray-500 dark:text-gray-400">{{ shipment }}</p>
          <hr class="my-2 border-gray-200 dark:border-white/10" />
          <p>{{ t("logistics.pod.fields.deliveredAt") }}: {{ draft.delivered_at || "—" }}</p>
          <p>{{ t("logistics.pod.fields.receivedBy") }}: {{ draft.received_by || "—" }}</p>
          <p>{{ t("logistics.pod.fields.receivedByTitle") }}: {{ draft.received_by_title || "—" }}</p>
          <p :class="partial ? 'text-red-600 dark:text-red-400 font-semibold' : ''">
            {{ t("logistics.pod.fields.deliveredPackages") }}:
            {{ draft.delivered_package_count }} / {{ draft.total_package_count }}
            <template v-if="partial">
              · {{ t("logistics.pod.detail.missingPackages", { count: missing }) }}
            </template>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";

  const props = defineProps({
    shipment: { type: String, required: true },
    /** Düzeltme modu — gerekçe zorunlu olur, başlık ve buton değişir. */
    amend: { type: Boolean, default: false },
    /** Düzeltmede mevcut kayıt taslağa yüklenir. */
    initial: { type: Object, default: null },
    exceptionCodes: { type: Array, default: () => [] },
    /** Sunucudan gelen alan bazlı hatalar (`VALIDATION_ERROR.fields`). */
    serverErrors: { type: Object, default: null },
    saving: { type: Boolean, default: false },
    defaultTotalPackages: { type: Number, default: 1 },
  });
  const emit = defineEmits(["submit", "cancel"]);

  const { t } = useI18n();

  const draft = reactive({
    delivered_at: "",
    received_by: "",
    received_by_title: "",
    delivered_package_count: props.defaultTotalPackages,
    total_package_count: props.defaultTotalPackages,
    delivered_pallet_count: null,
    returned_pallet_count: null,
    has_discrepancy: false,
    exception_code: "",
    discrepancy_note: "",
    reason: "",
  });

  watch(
    () => props.initial,
    (v) => {
      if (!v) return;
      Object.assign(draft, {
        ...v,
        has_discrepancy: !!v.has_discrepancy,
        exception_code: v.exception_code ?? "",
        discrepancy_note: v.discrepancy_note ?? "",
        reason: "",
      });
    },
    { immediate: true }
  );

  const missing = computed(() =>
    Math.max(0, Number(draft.total_package_count) - Number(draft.delivered_package_count))
  );
  const partial = computed(
    () => Number(draft.delivered_package_count) < Number(draft.total_package_count)
  );

  /** Kısmi teslim seçilir seçilmez tutarsızlık işaretleniyor ve kilitleniyor. */
  watch(partial, (v) => {
    if (v) draft.has_discrepancy = true;
  });

  const titleOptions = computed(() =>
    ["purchasing", "warehouse", "driver", "authorized", "other"].map((k) => ({
      value: t(`logistics.pod.title.${k}`),
      label: t(`logistics.pod.title.${k}`),
    }))
  );

  const exceptionOptions = computed(() => [
    { value: "", label: t("logistics.pod.fields.select") },
    ...props.exceptionCodes.map((c) => ({ value: c.code, label: `${c.label} (${c.code})` })),
  ]);

  /** Alan BAZINDA hata — tek genel mesaj değil (sözleşme §3). */
  const errors = computed(() => {
    const e = { ...(props.serverErrors ?? {}) };
    if (!draft.delivered_at) e.delivered_at ??= t("logistics.pod.fields.deliveredAt");
    if (!draft.received_by?.trim()) e.received_by ??= t("logistics.pod.fields.receivedBy");
    if (!draft.received_by_title) e.received_by_title ??= t("logistics.pod.fields.receivedByTitle");
    if (Number(draft.delivered_package_count) > Number(draft.total_package_count))
      e.delivered_package_count ??= t("logistics.pod.fields.deliveredPackages");
    if (draft.has_discrepancy && !draft.exception_code)
      e.exception_code ??= t("logistics.pod.fields.exceptionCode");
    if (props.amend && !draft.reason?.trim()) e.reason ??= t("logistics.pod.record.reason");
    return e;
  });

  const isValid = computed(() => !Object.keys(errors.value).length);

  function submit() {
    if (!isValid.value) return;
    emit("submit", {
      shipment: props.shipment,
      delivered_at: draft.delivered_at.replace("T", " "),
      received_by: draft.received_by,
      received_by_title: draft.received_by_title,
      delivered_package_count: Number(draft.delivered_package_count),
      total_package_count: Number(draft.total_package_count),
      delivered_pallet_count: draft.delivered_pallet_count,
      returned_pallet_count: draft.returned_pallet_count,
      has_discrepancy: draft.has_discrepancy ? 1 : 0,
      exception_code: draft.has_discrepancy ? draft.exception_code : null,
      discrepancy_note: draft.has_discrepancy ? draft.discrepancy_note : null,
      ...(props.amend ? { reason: draft.reason } : {}),
    });
  }

  const printWindow = ref(null);

  /**
   * Tutanağı YENİ SEKMEDE açar — `Ctrl+P` çalışır.
   *
   * `#yer-tutucu` bağlantı düğmenin çalışmadığını gizlerdi; operatör
   * "yazdır"a bastığında önüne yazdırılabilir bir şey gelmeli.
   */
  function printReceipt() {
    const esc = (v) => String(v ?? "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const eksikSatir = partial.value
      ? `<p class="bad">${esc(t("logistics.pod.detail.missingPackages", { count: missing.value }))}</p>`
      : "";
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${esc(t("logistics.pod.detail.title"))} — ${esc(props.shipment)}</title>
<style>
  body{font:13px/1.5 system-ui,sans-serif;margin:32px;color:#111}
  h1{font-size:16px;margin:0 0 4px} .muted{color:#666;margin:0 0 16px}
  table{border-collapse:collapse;width:100%;max-width:520px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb}
  th{width:44%;color:#444;font-weight:600}
  .bad{color:#b91c1c;font-weight:600}
  .sign{margin-top:40px;display:flex;gap:48px}
  .sign div{flex:1;border-top:1px solid #111;padding-top:6px;color:#666}
</style></head><body>
<h1>${esc(t("logistics.pod.detail.title"))}</h1>
<p class="muted">${esc(props.shipment)}</p>
<table>
  <tr><th>${esc(t("logistics.pod.fields.deliveredAt"))}</th><td>${esc(draft.delivered_at)}</td></tr>
  <tr><th>${esc(t("logistics.pod.fields.receivedBy"))}</th><td>${esc(draft.received_by)}</td></tr>
  <tr><th>${esc(t("logistics.pod.fields.receivedByTitle"))}</th><td>${esc(draft.received_by_title)}</td></tr>
  <tr><th>${esc(t("logistics.pod.fields.deliveredPackages"))}</th><td>${esc(draft.delivered_package_count)} / ${esc(draft.total_package_count)}</td></tr>
</table>
${eksikSatir}
<div class="sign"><div>${esc(t("logistics.pod.fields.receivedBy"))}</div><div>${esc(t("logistics.pod.title.driver"))}</div></div>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    printWindow.value = w;
  }
</script>

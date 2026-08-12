<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.label.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.label.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <button
        v-if="can.write"
        type="button"
        class="ms-auto th-btn-primary text-sm"
        :disabled="!selection.length"
        @click="$emit('print', selection)"
      >
        {{ t("logistics.label.printSelected", { count: selection.length }) }}
      </button>
    </header>

    <div
      v-if="unlabeled.length"
      class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
      role="alert"
    >
      {{ t("logistics.package.unlabeledWarning", { count: unlabeled.length }) }}
    </div>

    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        :checked="allSelected"
        :indeterminate.prop="someSelected"
        @change="toggleAll"
      />
      {{ t("logistics.label.selectAll") }}
    </label>

    <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="pkg in packages"
        :key="pkg.package_code"
        class="rounded-lg border p-3"
        :class="pkg.label_url ? 'border-slate-200 dark:border-slate-700' : 'border-amber-300 dark:border-amber-800'"
      >
        <label class="flex items-start gap-2">
          <input
            type="checkbox"
            class="mt-1"
            :checked="selection.includes(pkg.package_code)"
            @change="toggle(pkg.package_code)"
          />
          <span class="min-w-0 grow">
            <span class="block text-sm font-medium">{{ pkg.sequence_label }}</span>
            <code class="block font-mono text-xs text-slate-500">{{ pkg.package_code }}</code>
          </span>
        </label>

        <!-- Etiket ÖNİZLEMESİ gerçek dosya değil, yer tutucu: PDF'i iframe'e
             gömmek Storybook'ta ve panelde ağır, ayrıca yazdırma akışı zaten
             yeni sekmede açıyor. Barkod görseli ise hafif ve doğrulanabilir. -->
        <div class="mt-2 flex h-24 items-center justify-center rounded bg-slate-50 dark:bg-slate-800">
          <!-- Dosya silinmiş veya yetkisizse tarayıcının kırık-resim ikonu
               çıkar; bu, "barkod yok" ile "barkod yüklenemedi" arasındaki
               farkı kullanıcıya anlatmaz. Yükleme hatasında yer tutucuya
               düşülüyor. -->
          <img
            v-if="pkg.barcode_url && !brokenBarcodes.has(pkg.package_code)"
            :src="pkg.barcode_url"
            :alt="t('logistics.label.barcodeAlt', { code: pkg.package_code })"
            class="max-h-20 max-w-full object-contain"
            @error="markBroken(pkg.package_code)"
          />
          <span v-else class="text-xs text-slate-400">
            {{ pkg.barcode_url ? t("logistics.label.barcodeUnavailable") : t("logistics.label.noBarcode") }}
          </span>
        </div>

        <!-- Yeniden üretim geçmişi (TUR-114): etiket kaç kez basıldı,
             en son ne zaman. İkinci baskı kargo şubesinde çift kayıt riski. -->
        <p v-if="pkg.label_printed_at" class="mt-2 text-xs text-slate-500">
          {{ t("logistics.package.printedAt") }}: {{ pkg.label_printed_at }}
          <span v-if="reprintCounts[pkg.package_code] > 1" class="block text-amber-600 dark:text-amber-400">
            {{ t("logistics.label.reprinted", { count: reprintCounts[pkg.package_code] }) }}
          </span>
        </p>
        <p v-else class="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {{ t("logistics.label.neverPrinted") }}
        </p>

        <div class="mt-2 flex gap-2">
          <a
            v-if="pkg.label_url"
            :href="pkg.label_url"
            class="th-btn-outline text-xs"
            target="_blank"
            rel="noopener"
          >
            {{ t("logistics.label.open") }}
          </a>
          <button
            v-if="can.write && !pkg.label_url"
            type="button"
            class="th-btn-dark text-xs"
            @click="$emit('generate', pkg)"
          >
            {{ t("logistics.package.generateLabel") }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **G2 · Etiket önizleme + toplu yazdırma** (TUR-114).
   *
   * Yeniden basım sayısı görünür: aynı etiketin ikinci kez basılması kargo
   * şubesinde çift kayıt riski taşıyor, sessiz geçilecek bir bilgi değil.
   *
   * Etiket dosyası yeni sekmede açılıyor; PDF'i iframe'e gömmek hem ağır
   * hem de tarayıcı eklentileriyle güvenilmez.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    packages: { type: Array, default: () => [] },
    /** `{ "PKG-42-001": 2 }` — etiket kaç kez üretildi. */
    reprintCounts: { type: Object, default: () => ({}) },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["print", "generate"]);

  const { t } = useI18n();

  const selection = ref([]);

  /** Yüklenemeyen barkod görselleri — Set mutasyonu reaktif değil, yeni referans atanıyor. */
  const brokenBarcodes = ref(new Set());
  function markBroken(code) {
    brokenBarcodes.value = new Set(brokenBarcodes.value).add(code);
  }

  const unlabeled = computed(() => props.packages.filter((pkg) => !pkg.label_url));

  const allSelected = computed(
    () => props.packages.length > 0 && selection.value.length === props.packages.length
  );
  const someSelected = computed(
    () => selection.value.length > 0 && selection.value.length < props.packages.length
  );

  function toggle(code) {
    selection.value = selection.value.includes(code)
      ? selection.value.filter((c) => c !== code)
      : [...selection.value, code];
  }

  function toggleAll() {
    selection.value = allSelected.value ? [] : props.packages.map((pkg) => pkg.package_code);
  }
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="unlabeled.length"
      class="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
    >
      {{ t("logistics.package.unlabeledWarning", { count: unlabeled.length }) }}
    </div>

    <div v-if="rows.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="pkg in rows"
        :key="pkg.package_code"
        class="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
      >
        <div class="flex items-center gap-2">
          <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-700">
            {{ pkg.sequence_label }}
          </span>
          <code class="truncate text-xs">{{ pkg.package_code }}</code>
        </div>

        <dl class="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
          <div class="flex justify-between">
            <dt>{{ t("logistics.package.dimensions") }}</dt>
            <dd class="tabular-nums">
              {{ pkg.length_cm }}×{{ pkg.width_cm }}×{{ pkg.height_cm }} cm
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t("logistics.package.weight") }}</dt>
            <dd class="tabular-nums">{{ pkg.weight_kg }} kg</dd>
          </div>
          <!-- Desi ve ağırlık birlikte: ücretlendirme büyük olana göre yapılır -->
          <div
            class="flex justify-between"
            :class="
              pkg.desi > pkg.weight_kg ? 'font-medium text-indigo-600 dark:text-indigo-400' : ''
            "
          >
            <dt>{{ t("logistics.package.desi") }}</dt>
            <dd class="tabular-nums">{{ pkg.desi }}</dd>
          </div>
        </dl>

        <div class="mt-3 flex items-center gap-2">
          <a
            v-if="pkg.safeLabelUrl"
            :href="pkg.safeLabelUrl"
            class="hdr-btn-outlined"
            target="_blank"
            rel="noopener"
          >
            {{ t("logistics.package.label") }}
          </a>
          <button
            v-else-if="canGenerateLabel"
            type="button"
            class="hdr-btn-outlined"
            @click="$emit('generate-label', pkg)"
          >
            {{ t("logistics.package.generateLabel") }}
          </button>
          <span v-if="pkg.label_printed_at" class="text-[11px] text-gray-400">
            {{ t("logistics.package.printedAt") }}
          </span>
        </div>
      </article>
    </div>
    <p v-else class="py-6 text-center text-sm text-gray-500">{{ t("logistics.package.empty") }}</p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { safeExternalUrl } from "@/utils/sanitize";

  /**
   * **B4 · Paketler sekmesi** (TUR-114, TUR-120).
   *
   * Desi ağırlıktan büyükse vurgulanıyor — ücretlendirme büyük olana göre
   * yapılıyor, operasyon hangisinin belirleyici olduğunu görmeli.
   * Etiketsiz paket uyarısı: TUR-114 "tüm ürünler paketlenmeden sevkiyat
   * tamamlanamaz".
   *
   * `label_url` backend'de serbest metin (`Data`) — etiket üreten adapter,
   * CSV import ya da manuel düzenleme keyfi bir şema yazabilir.
   * `safeExternalUrl` beyaz listeye uymayan URL'de bağlantıyı çizmiyor.
   */
  const props = defineProps({
    packages: { type: Array, default: () => [] },
    // `can` BİLEREK YOK: bu sekme hiçbir yetki bayrağı okumuyor. Sözleşme
    // "sekme neyi okuduğunu ilan eder" diyorsa, okumadığını ilan etmemeli.
    /**
     * Etiket üretme butonu AYRI bayrakta, `can.write`te değil.
     *
     * ÖLÜ BUTON YASAĞI: `generate-label` emit'ini dinleyen kimse yok ve G2
     * (etiket üretimi) manifestte `ready: false` — ucu 13-BE'de. `can.write`
     * ile çizilseydi kullanıcı tıklar, hiçbir şey olmazdı.
     */
    canGenerateLabel: { type: Boolean, default: false },
  });
  defineEmits(["generate-label"]);

  const { t } = useI18n();

  /**
   * Şema denetimi TEK KEZ (bkz. ShipmentDocumentsTab'daki gerekçe).
   * `safeLabelUrl` null ise bağlantı çizilmiyor, "etiket üret" dalına düşüyor.
   */
  const rows = computed(() =>
    props.packages.map((pkg) => ({ ...pkg, safeLabelUrl: safeExternalUrl(pkg.label_url) }))
  );

  const unlabeled = computed(() => props.packages.filter((p) => !p.label_url));
</script>

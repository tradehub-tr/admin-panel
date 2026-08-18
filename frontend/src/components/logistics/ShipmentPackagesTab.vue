<template>
  <div class="space-y-4">
    <div v-if="unlabeled.length" class="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
      {{ t("logistics.package.unlabeledWarning", { count: unlabeled.length }) }}
    </div>

    <!-- Bu sekme koli ÖZETİ; düzenleme paketleme ekranında (13-FE).
         İki yerde düzenleme sunmak, hangi kaydın kazandığını belirsiz
         bırakırdı — burada yalnız okunuyor ve oraya yönlendiriliyor. -->
    <div v-if="can.pack" class="flex justify-end">
      <button type="button" class="th-btn-outline text-xs" @click="$emit('open-packing')">
        {{ t("logistics.package.openPacking") }}
      </button>
    </div>

    <div v-if="packages.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="pkg in packages" :key="pkg.package_code" class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <div class="flex items-center gap-2">
          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-slate-700">
            {{ pkg.sequence_label }}
          </span>
          <code class="truncate text-xs">{{ pkg.package_code }}</code>
        </div>

        <dl class="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
          <div class="flex justify-between">
            <dt>{{ t("logistics.package.dimensions") }}</dt>
            <dd class="tabular-nums">{{ pkg.length_cm }}×{{ pkg.width_cm }}×{{ pkg.height_cm }} cm</dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t("logistics.package.weight") }}</dt>
            <dd class="tabular-nums">{{ pkg.weight_kg }} kg</dd>
          </div>
          <!-- Desi ve ağırlık birlikte: ücretlendirme büyük olana göre yapılır -->
          <div class="flex justify-between" :class="pkg.desi > pkg.weight_kg ? 'font-medium text-indigo-600 dark:text-indigo-400' : ''">
            <dt>{{ t("logistics.package.desi") }}</dt>
            <dd class="tabular-nums">{{ pkg.desi }}</dd>
          </div>
        </dl>

        <div class="mt-3 flex items-center gap-2">
          <a v-if="pkg.label_url" :href="pkg.label_url" class="th-btn-outline text-xs" target="_blank" rel="noopener">
            {{ t("logistics.package.label") }}
          </a>
          <button v-else-if="can.write" type="button" class="th-btn-outline text-xs" @click="$emit('generate-label', pkg)">
            {{ t("logistics.package.generateLabel") }}
          </button>
          <span v-if="pkg.label_printed_at" class="text-[11px] text-slate-400">
            {{ t("logistics.package.printedAt") }}
          </span>
        </div>
      </article>
    </div>
    <p v-else class="py-6 text-center text-sm text-slate-500">{{ t("logistics.package.empty") }}</p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **B4 · Paketler sekmesi** (TUR-114, TUR-120).
   *
   * Desi ağırlıktan büyükse vurgulanıyor — ücretlendirme büyük olana göre
   * yapılıyor, operasyon hangisinin belirleyici olduğunu görmeli.
   * Etiketsiz paket uyarısı: TUR-114 "tüm ürünler paketlenmeden sevkiyat
   * tamamlanamaz".
   */
  const props = defineProps({
    packages: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ write: false }) },
  });
  defineEmits(["generate-label", "open-packing"]);

  const { t } = useI18n();
  const unlabeled = computed(() => props.packages.filter((p) => !p.label_url));
</script>

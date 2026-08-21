<template>
  <div class="card p-0 overflow-hidden overflow-x-auto">
    <!-- Erişilebilir ad ŞART: etiket ekranında (K8) sayfada iki tablo var;
         adsız tablolar ekran okuyucuda da testte de birbirine karışıyor. -->
    <table class="w-full text-sm" :aria-label="t('logistics.simulation.quotes')">
      <thead>
        <tr>
          <th v-if="selectable" class="w-8 p-3"></th>
          <th class="tbl-th">{{ t("logistics.quotes.carrier") }}</th>
          <th v-if="showCost" class="w-28 p-3 text-start">{{ t("logistics.cost.carrierCost") }}</th>
          <th class="tbl-th w-36">{{ t("logistics.cost.customerCharge") }}</th>
          <th v-if="showCost" class="w-28 p-3 text-start">{{ t("logistics.cost.margin") }}</th>
          <th class="tbl-th w-24">{{ t("logistics.quotes.days") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="quote in quotes"
          :key="quote.carrier_account"
          class="border-b border-gray-100 transition-colors last:border-0 dark:border-gray-800"
          :class="rowClass(quote)"
          @click="pick(quote)"
        >
          <td v-if="selectable" class="p-3">
            <!-- Radyo GÖRÜNÜMÜ; gerçek input satır tıklanabilir olduğu için
                 gereksiz. Kullanılamayan hesapta hiç çizilmiyor: seçilemeyen
                 bir seçenek sunmak ölü buton olurdu. -->
            <span
              v-if="quote.available"
              class="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                quote.carrier_account === modelValue
                  ? 'border-brand-500 dark:border-brand-400'
                  : 'border-gray-300 dark:border-gray-600'
              "
              role="radio"
              :aria-checked="quote.carrier_account === modelValue"
            >
              <span
                v-if="quote.carrier_account === modelValue"
                class="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-400"
              />
            </span>
          </td>

          <td class="tbl-td">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="font-semibold"
                :class="quote.available ? '' : 'text-gray-500 dark:text-gray-400'"
              >
                {{ carrierLabel(quote) }}
              </span>
              <StatusBadge
                :status="quote.account_owner ? 'own' : 'platform'"
                :tone="quote.account_owner ? 'warning' : 'neutral'"
                :label="
                  quote.account_owner
                    ? t('logistics.quotes.ownAgreement')
                    : t('logistics.quotes.platform')
                "
                :show-dot="false"
              />
              <span
                v-if="quote.carrier_account === recommended"
                class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
              >
                ✓ {{ t("logistics.simulation.recommended") }}
              </span>
            </div>
            <p class="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
              {{ quote.applied_rule_name || t("logistics.quotes.noRule") }}
            </p>
          </td>

          <template v-if="quote.available">
            <td v-if="showCost" class="p-3 tabular-nums">
              <MaskedValue :value="quote.carrier_cost" :hint="maskHint(quote)" />
            </td>
            <td class="tbl-td font-semibold tabular-nums">{{ money(quote.customer_charge) }}</td>
            <td v-if="showCost" class="p-3 tabular-nums">
              <MaskedValue :value="quote.margin" :hint="maskHint(quote)" positive />
            </td>
            <td class="tbl-td text-xs">{{ etaLabel(quote) }}</td>
          </template>
          <td
            v-else
            :colspan="showCost ? 4 : 2"
            class="p-3 text-xs text-gray-600 dark:text-gray-400"
          >
            {{ t("logistics.quotes.noRule") }}
            <code class="ms-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-700">
              {{ quote.unavailable_reason }}
            </code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import MaskedValue from "./MaskedValue.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * Taşıyıcı teklifleri — K3 simülasyonu ve K8 etiket akışı AYNI bileşeni
   * kullanıyor.
   *
   * NEDEN ORTAK: iki ekran da "hangi taşıyıcı, ne kadar, kaç günde" sorusunu
   * soruyor ve aynı `price_quote` yükünü tüketiyor. İki kopya olsaydı biri
   * maskeleme kuralını unuturdu — ve maskeleme burada bir GÜVENLİK sınırının
   * arayüz karşılığı (sözleşme §7.2).
   *
   * Kullanılamayan hesap listeden DÜŞMÜYOR: "PTT neden yok?" sorusunu boş
   * liste cevaplayamaz. Sebebi satırın kendisinde yazılı.
   */
  const props = defineProps({
    /** `price_quote` sözleşmesindeki satırlar. */
    quotes: { type: Array, default: () => [] },
    /** Sunucunun önerdiği hesap — arayüz "en ucuzu" kendi seçmiyor. */
    recommended: { type: String, default: null },
    /** Seçili hesap (K8'de `v-model`). */
    modelValue: { type: String, default: null },
    /** K8'de seçilebilir, K3'te yalnız gösterim. */
    selectable: { type: Boolean, default: false },
    /** Alış/marj sütunları — yetki yoksa sütun HİÇ çizilmiyor. */
    showCost: { type: Boolean, default: true },
  });

  const emit = defineEmits(["select", "update:modelValue"]);
  const { t } = useI18n();

  const carrierLabel = (q) => q.carrier_name || q.carrier;

  /** Kullanılamayan hesap seçilemiyor — tıklama sessizce yutulmuyor, hiç bağlanmıyor. */
  function pick(quote) {
    if (!props.selectable || !quote.available) return;
    emit("update:modelValue", quote.carrier_account);
    emit("select", quote.carrier_account);
  }

  const maskHint = (q) =>
    q.account_owner ? t("logistics.rates.maskedOwn") : t("logistics.rates.maskedPlatform");

  function rowClass(quote) {
    if (!quote.available) return "opacity-60";
    if (quote.carrier_account === props.modelValue) return "bg-brand-50 dark:bg-brand-900/20";
    return props.selectable ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : "";
  }

  function etaLabel(q) {
    if (q.estimated_days_min == null) return "—";
    return q.estimated_days_max && q.estimated_days_max !== q.estimated_days_min
      ? t("logistics.simulation.days", { min: q.estimated_days_min, max: q.estimated_days_max })
      : t("logistics.simulation.daysOne", { min: q.estimated_days_min });
  }

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
</script>

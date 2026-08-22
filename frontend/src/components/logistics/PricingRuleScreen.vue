<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{
            asSeller ? t("logistics.pricingRules.sellerTitle") : t("logistics.pricingRules.title")
          }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.pricingRules.subtitle") }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="hdr-btn-primary" @click="$emit('create')">
        <AppIcon name="plus" :size="14" />
        <span>{{
          asSeller ? t("logistics.pricingRules.newSeller") : t("logistics.pricingRules.new")
        }}</span>
      </button>
    </div>

    <slot name="devpanel" />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="64px" class="mb-2" />
    </div>

    <EmptyState
      v-else-if="!total"
      :entity="t('logistics.rates.entity')"
      @clear-filters="$emit('clear-filters')"
    >
      <template #hint>{{ t("logistics.pricingRules.empty") }}</template>
    </EmptyState>

    <template v-else>
      <div
        class="mb-4 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
      >
        <AppIcon name="info" :size="14" class="mt-0.5 shrink-0" />
        <p>{{ t("logistics.pricingRules.layersIntro") }}</p>
      </div>

      <!-- Üç katman GÖRSEL OLARAK ayrı: tek listede sıralamak, "satıcı kuralı
           neden platformunkinden önce?" sorusunu ekranda cevapsız bırakırdı. -->
      <section v-for="layer in LAYERS" :key="layer" class="mb-5">
        <!-- `<header>` DEĞİL `<div>`: global `header { background-color:
             $d-bg-card !important }` (base.scss:154) `!important` olduğu için
             katman renklerini koyu temada EZİYOR — üç katman aynı renge
             düşüyor ve "hangi katmandayım" bilgisi kayboluyor. -->
        <div
          class="flex flex-wrap items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-[11px] font-bold tracking-wide"
          :class="headClass(layer)"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-extrabold"
            :class="numClass(layer)"
          >
            {{ LAYERS.indexOf(layer) + 1 }}
          </span>
          {{ layerTitle(layer) }}
          <span class="font-normal opacity-80">{{
            t(`logistics.pricingRules.layerHint${suffix(layer)}`)
          }}</span>
        </div>

        <div class="rounded-b-lg border p-2.5" :class="bodyClass(layer)">
          <p
            v-if="!byLayer[layer]?.length"
            class="py-2.5 text-center text-xs text-gray-600 dark:text-gray-400"
          >
            {{ t("logistics.pricingRules.layerEmpty") }}
          </p>

          <!-- `byLayer` DEĞİL `siralanabilir`: `byLayer` bir COMPUTED ve her
               okunuşta YENİ dizi üretiyor. Doğrudan bağlandığında SortableJS
               o geçici diziyi değiştiriyor, `@end` içinde prop yeniden
               hesaplanıyor ve ESKİ sıra emit ediliyordu — sürükleme ekranda
               oluyor ama HİÇ kaydedilmiyordu (ölçüldü 2026-08-21: yenilemede
               sıra geri dönüyordu). Kimliği sabit yerel bir kopya tutuyoruz;
               SortableJS onu değiştiriyor, emit onu okuyor. -->
          <draggable
            v-else
            :list="siralanabilir[layer]"
            item-key="name"
            handle=".rule-grip"
            :disabled="!can.write"
            @end="$emit('reorder', { layer, order: siralanabilir[layer].map((r) => r.name) })"
          >
            <template #item="{ element: rule, index }">
              <article
                class="mb-1.5 flex items-start gap-2.5 rounded-lg border bg-white p-2.5 last:mb-0 dark:bg-gray-900"
                :class="ruleClass(rule)"
              >
                <!-- Öncelik SÜRÜKLEYEREK değişiyor; sayı yazmak gerekmiyor
                     (kök CLAUDE.md §4.14e). Yetkisizde tutamaç çizilmiyor. -->
                <span
                  v-if="can.write && canEdit(rule)"
                  class="rule-grip mt-0.5 cursor-grab select-none text-gray-400 dark:text-gray-500"
                  :title="t('logistics.pricingRules.dragHint')"
                  >⠿</span
                >
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[11px] font-extrabold text-gray-700 tabular-nums dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ index + 1 }}
                </span>

                <div class="min-w-0 grow">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[13px] font-semibold">{{ rule.rule_name }}</span>
                    <code
                      class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px] text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {{ t("logistics.pricingRules.priority") }} {{ rule.priority }}
                    </code>
                    <StatusBadge
                      v-if="rule.is_mandatory"
                      status="mandatory"
                      tone="error"
                      :label="t('logistics.rates.mandatory')"
                      :show-dot="false"
                    />
                    <StatusBadge
                      v-if="!rule.is_active"
                      status="passive"
                      tone="neutral"
                      :label="t('logistics.catalog.passive')"
                      :show-dot="false"
                    />
                    <StatusBadge
                      v-if="!asSeller && rule.seller_profile"
                      status="seller"
                      tone="warning"
                      :label="rule.owner_label"
                      :show-dot="false"
                    />
                  </div>

                  <div class="mt-1.5 flex flex-wrap gap-1">
                    <span
                      v-for="c in criteriaOf(rule)"
                      :key="c"
                      class="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10.5px] text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >{{ c }}</span
                    >
                    <span
                      v-if="!criteriaOf(rule).length"
                      class="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      >{{ t("logistics.pricingRules.catchAll") }}</span
                    >
                  </div>

                  <div
                    class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400"
                  >
                    <span
                      >{{ t("logistics.rates.cost") }}:
                      <MaskedValue :value="rule.min_base_cost" :hint="maskHint(rule)"
                    /></span>
                    <span
                      >{{ t("logistics.rates.charge") }}:
                      <b class="tabular-nums">{{ money(rule.min_base_charge) }}</b></span
                    >
                    <span v-if="rule.valid_until">{{
                      t("logistics.pricingRules.validUntil", { date: rule.valid_until })
                    }}</span>
                  </div>

                  <!-- Uyarılar SUNUCUDAN geliyor: sayfalanmış listede arayüz
                       2. sayfadaki gölgeleyen kuralı göremez (sözleşme §1.1). -->
                  <div
                    v-if="rule.priority_conflict_with?.length"
                    class="mt-2 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-2 text-[11px] text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                    role="alert"
                  >
                    <AppIcon name="triangle-alert" :size="13" class="mt-0.5 shrink-0" />
                    <span>{{
                      t("logistics.pricingRules.conflictOne", { priority: rule.priority })
                    }}</span>
                  </div>
                  <div
                    v-if="rule.shadowed_by"
                    class="mt-2 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <AppIcon name="eye-off" :size="13" class="mt-0.5 shrink-0" />
                    <span>{{
                      t("logistics.pricingRules.shadowedOne", { rule: shadowLabel(rule) })
                    }}</span>
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-1.5">
                  <button type="button" class="hdr-btn-outlined" @click="$emit('open', rule)">
                    {{
                      canEdit(rule) && can.write
                        ? t("logistics.legOps.edit")
                        : t("logistics.pricingRules.view")
                    }}
                  </button>
                  <button
                    v-if="can.write && canEdit(rule)"
                    type="button"
                    class="hdr-btn-danger"
                    @click="$emit('remove', rule)"
                  >
                    {{ t("logistics.pricingRules.delete") }}
                  </button>
                  <StatusBadge
                    v-else-if="!canEdit(rule)"
                    status="readonly"
                    tone="neutral"
                    :label="t('logistics.pricingRules.readOnly')"
                    :show-dot="false"
                  />
                </div>
              </article>
            </template>
          </draggable>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import MaskedValue from "./MaskedValue.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **K2 · Fiyat kuralları** (TUR-121).
   *
   * "Bir gönderi geldiğinde hangi kural kazanır, neden?"
   *
   * Liste değil SIRALI liste ve üç KATMAN (prototip kararı #3 + 20-FE K1):
   * kurallar zorunlu platform → satıcı → normal platform sırasıyla deneniyor
   * ve bir katmanda eşleşme bulunursa aşağı inilmiyor. Tek düz listede bu
   * sıra görünmezdi.
   *
   * Çakışma (aynı katman + aynı öncelik) KIRMIZI, gölgeleme SARI — ikisi de
   * SUNUCUDAN geliyor. Arayüzde hesaplansaydı liste sayfalandığı an yanlış
   * söylerdi: 2. sayfadaki kural 1. sayfadakini gölgeliyorsa arayüz göremez.
   */
  const props = defineProps({
    byLayer: { type: Object, default: () => ({}) },
    total: { type: Number, default: 0 },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    asSeller: { type: Boolean, default: false },
    sellerName: { type: String, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "open", "remove", "reorder", "retry", "clear-filters"]);

  const { t } = useI18n();

  const LAYERS = ["platform_mandatory", "seller", "platform"];

  /**
   * Sürüklenebilir YEREL kopya.
   *
   * SortableJS bağlandığı diziyi yerinde değiştiriyor. `byLayer` prop'u bir
   * computed olduğu için her okunuşta yeni dizi dönüyordu: mutasyon geçici
   * bir nesneye gidiyor, emit ise yeniden hesaplanmış ESKİ sırayı okuyordu.
   * Kimliği sabit bir kopya bu ikisini aynı diziye bakar hâle getiriyor.
   */
  const siralanabilir = ref({});
  watch(
    () => props.byLayer,
    (v) => {
      siralanabilir.value = Object.fromEntries(
        LAYERS.map((katman) => [katman, [...(v?.[katman] ?? [])]])
      );
    },
    { immediate: true, deep: true }
  );
  const suffix = (layer) =>
    ({ platform_mandatory: "Mandatory", seller: "Seller", platform: "Platform" })[layer];

  function layerTitle(layer) {
    if (layer === "seller") {
      return props.asSeller
        ? t("logistics.pricingRules.layerSellerOwn")
        : t("logistics.pricingRules.layerSeller");
    }
    return t(`logistics.pricingRules.layer${suffix(layer)}`);
  }

  const headClass = (layer) =>
    ({
      platform_mandatory:
        "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200",
      seller:
        "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200",
      platform:
        "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
    })[layer];

  const numClass = (layer) =>
    ({
      platform_mandatory: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
      seller: "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
      platform: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    })[layer];

  const bodyClass = (layer) =>
    ({
      platform_mandatory: "border-red-300 dark:border-red-800",
      seller: "border-amber-300 dark:border-amber-700",
      platform: "border-gray-200 dark:border-gray-700",
    })[layer];

  function ruleClass(rule) {
    if (!rule.is_active) return "border-gray-200 opacity-60 dark:border-gray-700";
    if (rule.priority_conflict_with?.length) return "border-red-300 dark:border-red-800";
    if (rule.shadowed_by) return "border-amber-400 dark:border-amber-700";
    return "border-gray-200 dark:border-gray-700";
  }

  const canEdit = (rule) =>
    props.asSeller ? rule.seller_profile === props.sellerName : !rule.seller_profile;

  const maskHint = (rule) =>
    rule.seller_profile ? t("logistics.rates.maskedOwn") : t("logistics.rates.maskedPlatform");

  /** Gölgeleyen kuralın OKUNABİLİR adı — kod değil, kullanıcı onu tanımalı. */
  function shadowLabel(rule) {
    const golgeleyen = Object.values(props.byLayer)
      .flat()
      .find((r) => r.name === rule.shadowed_by);
    return golgeleyen?.rule_name ?? rule.shadowed_by;
  }

  function criteriaOf(rule) {
    const parts = [];
    if (rule.carrier_account) parts.push(accountLabel(rule.carrier_account));
    if (rule.shipping_method) parts.push(rule.shipping_method);
    if (rule.zone_label) parts.push(rule.zone_label);
    if (rule.min_weight_kg != null || rule.max_weight_kg != null) {
      parts.push(
        t("logistics.rates.weightRange", {
          min: rule.min_weight_kg ?? "0",
          max: rule.max_weight_kg ?? "∞",
        })
      );
    }
    if (rule.min_order_total != null) {
      parts.push(t("logistics.rates.orderTotal", { amount: money(rule.min_order_total) }));
    }
    if (rule.tier_count > 1) parts.push(t("logistics.rates.tierCount", { count: rule.tier_count }));
    if (rule.surcharge_count)
      parts.push(t("logistics.rates.surchargeCount", { count: rule.surcharge_count }));
    return parts;
  }

  const accountLabel = (name) => props.accounts.find((a) => a.name === name)?.account_name ?? name;

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
</script>

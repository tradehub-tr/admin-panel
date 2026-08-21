<template>
  <div class="space-y-4">
    <!-- `<header>` DEĞİL `<div>`: koyu temada `base.scss:154` global
         `header { background-color: $d-bg-card !important }` her `<header>`'ı
         kart rengine boyuyor ve sayfa zeminiyle arasında GRİ BİR BANT
         bırakıyor (kullanıcı bildirdi 2026-08-21). Aynı tuzak
         `LabelPrintView.vue`'de de yazılı. Blok `<main>` içinde olduğu için
         zaten `banner` landmark'ı üretmiyordu — semantik kayıp yok. -->
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ asSeller ? t("logistics.rates.sellerTitle") : t("logistics.rates.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ asSeller ? t("logistics.rates.sellerSubtitle") : t("logistics.rates.subtitle") }}
        </p>
      </div>
      <button
        v-if="can.write"
        type="button"
        class="ms-auto hdr-btn-primary"
        @click="$emit('create')"
      >
        {{ asSeller ? t("logistics.pricingRules.newSeller") : t("logistics.rates.new") }}
      </button>
    </div>

    <slot name="devpanel" />

    <!-- Filtreler. Seçenekler PROP olarak geliyor (katalog uçlarından);
         bileşene gömülü liste, "yeni bölge nereden eklenecek?" sorusunu
         cevapsız bırakırdı (13-FE'nin palet tipi hatası). -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[220px] max-w-sm grow">
        <AppIcon
          name="search"
          :size="14"
          class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400"
        />
        <input
          :value="search"
          type="search"
          class="form-input-sm w-full !ps-9"
          :placeholder="t('logistics.rates.searchPlaceholder')"
          @input="$emit('update:search', $event.target.value)"
        />
      </div>
      <select
        :value="zone"
        class="form-input-sm w-auto"
        @change="$emit('update:zone', $event.target.value || null)"
      >
        <option value="">{{ t("logistics.rates.allZones") }}</option>
        <option v-for="z in zones" :key="z.name" :value="z.name">{{ z.zone_name }}</option>
      </select>
      <select
        :value="account"
        class="form-input-sm w-auto"
        @change="$emit('update:account', $event.target.value || null)"
      >
        <option value="">{{ t("logistics.rates.allCarriers") }}</option>
        <option v-for="a in accounts" :key="a.name" :value="a.name">{{ a.account_name }}</option>
      </select>
      <select
        :value="String(activeOnly)"
        class="form-input-sm w-auto"
        @change="$emit('update:activeOnly', $event.target.value === 'true')"
      >
        <option value="false">{{ t("logistics.rates.allStatuses") }}</option>
        <option value="true">{{ t("logistics.rates.onlyActive") }}</option>
      </select>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 5" :key="i" variant="rect" height="52px" />
    </div>

    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasFilters"
      :entity="t('logistics.rates.entity')"
      @clear-filters="$emit('clear-filters')"
    >
      <template #hint>{{
        hasFilters ? t("logistics.rates.filteredEmptyHint") : t("logistics.rates.emptyHint")
      }}</template>
    </EmptyState>

    <template v-else>
      <p v-if="can.write" class="text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.rates.inlineEditHint") }}
      </p>

      <div class="card p-0 overflow-hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="tbl-th w-16">{{ t("logistics.pricingRules.priority") }}</th>
              <th class="tbl-th">{{ t("logistics.rates.title") }}</th>
              <th v-if="!asSeller" class="w-32 p-3 text-start">{{ t("logistics.rates.owner") }}</th>
              <th class="tbl-th w-32">{{ t("logistics.rates.cost") }}</th>
              <th class="tbl-th w-40">{{ t("logistics.rates.charge") }}</th>
              <th class="tbl-th w-28">{{ t("logistics.rates.margin") }}</th>
              <th class="tbl-th w-24">{{ t("docTypeList.colStatus") }}</th>
              <th class="tbl-th w-32">{{ t("logistics.rates.validity") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.name"
              class="cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              :class="{ 'opacity-60': !row.is_active }"
              @click="$emit('open', row)"
            >
              <td class="tbl-td">
                <code
                  class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold dark:bg-gray-700"
                >
                  #{{ row.priority }}
                </code>
              </td>

              <td class="tbl-td">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[13px] font-semibold">{{ row.rule_name }}</span>
                  <StatusBadge
                    v-if="row.is_mandatory"
                    status="mandatory"
                    tone="error"
                    :label="t('logistics.rates.mandatory')"
                    :show-dot="false"
                  />
                </div>
                <!-- Ölçütler etiket etiket: tek cümleye sıkıştırmak, hangi
                     koşulun neden eşleştiğini simülasyonda takip edilemez
                     kılar (prototip kararı #4). -->
                <div class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="c in criteriaOf(row)"
                    :key="c"
                    class="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10.5px] text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >{{ c }}</span
                  >
                  <span
                    v-if="!criteriaOf(row).length"
                    class="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                    >{{ t("logistics.pricingRules.catchAll") }}</span
                  >
                </div>
              </td>

              <td v-if="!asSeller" class="p-3">
                <StatusBadge
                  :status="row.seller_profile ? 'seller' : 'platform'"
                  :tone="row.seller_profile ? 'warning' : 'neutral'"
                  :label="row.owner_label"
                  :show-dot="false"
                />
              </td>

              <td class="tbl-td">
                <MaskedValue :value="costRange(row)" :hint="maskHint(row)" />
                <span
                  v-if="isCostRange(row)"
                  class="ms-1 text-[10.5px] text-gray-600 dark:text-gray-400"
                  >…</span
                >
              </td>

              <td class="tbl-td" @click.stop>
                <InlineMoney
                  :value="row.min_base_charge"
                  :editable="can.write && canEdit(row) && row.tier_count === 1"
                  @commit="$emit('quick-charge', { row, value: $event })"
                />
                <div
                  v-if="row.tier_count > 1"
                  class="text-[10.5px] text-gray-600 dark:text-gray-400"
                >
                  {{ t("logistics.rates.tierCount", { count: row.tier_count }) }}
                </div>
                <div
                  v-if="row.has_negative_margin"
                  class="mt-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400"
                  :title="t('logistics.rates.negativeMarginHint')"
                >
                  {{ t("logistics.rates.negativeMargin") }}
                </div>
              </td>

              <td class="tbl-td">
                <MaskedValue :value="marginOf(row)" :hint="maskHint(row)" positive />
              </td>

              <td class="tbl-td">
                <StatusBadge
                  :status="row.is_active ? 'active' : 'passive'"
                  :tone="row.is_active ? 'success' : 'neutral'"
                  :label="
                    row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')
                  "
                  :show-dot="false"
                />
              </td>

              <td class="p-3 text-[11px] text-gray-600 dark:text-gray-400">
                {{ row.valid_from
                }}<template v-if="row.valid_until"> → {{ row.valid_until }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-gray-600 dark:text-gray-400">
        {{ total }} · {{ t("logistics.rates.taxNote") }}
      </p>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import InlineMoney from "./InlineMoney.vue";
  import MaskedValue from "./MaskedValue.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **K1 · Tarifeler** (TUR-121).
   *
   * "Elimizde hangi tarifeler var, hangisi zararda, hangisi pasif?"
   *
   * Eşleşme ölçütleri tek okunabilir sütunda toplanıyor: her ölçüt için ayrı
   * sütun on kolonluk ve çoğu boş bir tablo üretirdi (prototip kararı #8).
   *
   * ALIŞ ve MARJ sütunları İKİ YÖNLÜ maskeli (sözleşme §7.2): platform
   * satıcının maliyetini, satıcı platformunkini görmüyor. Sunucu alanı hiç
   * göndermiyor; `MaskedValue` bunu okunabilir bir "—" ve gerekçe ipucuyla
   * çiziyor — silik bir tire "veri yok" sanılırdı.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    total: { type: String, default: "" },
    zones: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    search: { type: String, default: "" },
    zone: { type: String, default: null },
    account: { type: String, default: null },
    activeOnly: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    asSeller: { type: Boolean, default: false },
    sellerName: { type: String, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits([
    "create",
    "open",
    "retry",
    "clear-filters",
    "quick-charge",
    "update:search",
    "update:zone",
    "update:account",
    "update:activeOnly",
  ]);

  const { t } = useI18n();

  const hasFilters = computed(() =>
    Boolean(props.search || props.zone || props.account || props.activeOnly)
  );

  /** Satıcı yalnız KENDİ kuralını düzenleyebilir; platform kuralı salt-okunur. */
  const canEdit = (row) =>
    props.asSeller ? row.seller_profile === props.sellerName : !row.seller_profile;

  /** Maskeleme gerekçesi — hangi yönde kapalı olduğunu söylüyor. */
  const maskHint = (row) =>
    row.seller_profile ? t("logistics.rates.maskedOwn") : t("logistics.rates.maskedPlatform");

  const isCostRange = (row) => row.min_base_cost != null && row.min_base_cost !== row.max_base_cost;
  const costRange = (row) => (row.min_base_cost == null ? null : row.min_base_cost);

  /**
   * Marj: yalnız TEK kademeli kuralda anlamlı bir tek sayı.
   *
   * Çok kademeli kuralda kademe kademe değişiyor; tek bir sayı göstermek
   * yanıltırdı. Alışı göremeyen marjı da göremez — ikisi birlikte maskeleniyor.
   */
  function marginOf(row) {
    if (row.min_base_cost == null || row.min_base_charge == null) return null;
    if (row.tier_count !== 1) return null;
    return row.min_base_charge - row.min_base_cost;
  }

  /** Dolu olan ölçütler — boş olan "sınırlama yok" demek. */
  function criteriaOf(row) {
    const parts = [];
    if (row.carrier_account) parts.push(accountLabel(row.carrier_account));
    if (row.shipping_method) parts.push(row.shipping_method);
    if (row.zone_label) parts.push(row.zone_label);
    if (row.origin_city) parts.push(row.origin_city);
    if (row.destination_city) parts.push(row.destination_city);
    if (row.min_weight_kg != null || row.max_weight_kg != null) {
      parts.push(
        t("logistics.rates.weightRange", {
          min: row.min_weight_kg ?? "0",
          max: row.max_weight_kg ?? "∞",
        })
      );
    }
    if (row.min_order_total != null) {
      parts.push(t("logistics.rates.orderTotal", { amount: money(row.min_order_total) }));
    }
    if (row.tier_count > 1) parts.push(t("logistics.rates.tierCount", { count: row.tier_count }));
    if (row.surcharge_count)
      parts.push(t("logistics.rates.surchargeCount", { count: row.surcharge_count }));
    return parts;
  }

  const accountLabel = (name) => props.accounts.find((a) => a.name === name)?.account_name ?? name;

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
</script>

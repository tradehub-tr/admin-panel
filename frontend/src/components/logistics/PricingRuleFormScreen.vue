<template>
  <!-- ŞABLON SEÇİMİ — boş formdan başlatma yok (kök CLAUDE.md §4.14b) -->
  <div v-if="mode === 'template'" class="card mx-auto max-w-3xl p-5">
    <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
      {{ t("logistics.pricingForm.templateTitle") }}
    </h1>
    <p class="mb-4 text-xs text-gray-600 dark:text-gray-400">
      {{ t("logistics.pricingForm.templateHint") }}
    </p>

    <div class="grid gap-2.5 sm:grid-cols-2">
      <button
        v-for="tpl in templates"
        :key="tpl.key"
        type="button"
        class="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 text-start transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:hover:bg-brand-900/20"
        @click="$emit('pick-template', tpl.key)"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"
        >
          <AppIcon :name="tpl.icon" :size="16" />
        </span>
        <span>
          <span class="block text-[13px] font-bold text-gray-900 dark:text-gray-100">{{
            t(tpl.labelKey)
          }}</span>
          <span class="mt-0.5 block text-[11px] text-gray-600 dark:text-gray-400">{{
            t(tpl.descKey)
          }}</span>
        </span>
      </button>
    </div>

    <div class="mt-4 border-t border-gray-200 pt-3.5 dark:border-gray-700">
      <button type="button" class="hdr-btn-outlined" @click="$emit('pick-template', null)">
        {{ t("logistics.pricingForm.blankStart") }}
      </button>
      <span class="ms-2 text-[11px] text-gray-600 dark:text-gray-400">{{
        t("logistics.pricingForm.blankHint")
      }}</span>
    </div>
  </div>

  <!-- SİLME ONAYI -->
  <div v-else-if="mode === 'delete'" class="card mx-auto max-w-2xl p-5">
    <h1 class="mb-2 text-[15px] font-bold text-gray-900 dark:text-gray-100">
      {{ t("logistics.pricingForm.deleteTitle") }}
    </h1>
    <div class="mb-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p class="text-[13px] font-semibold">{{ model.rule_name }}</p>
    </div>
    <div
      v-if="inUseCount"
      class="mb-2.5 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
      role="alert"
    >
      <AppIcon name="triangle-alert" :size="14" class="mt-0.5 shrink-0" />
      <p>{{ t("logistics.pricingForm.deleteInUse", { count: inUseCount }) }}</p>
    </div>
    <div
      class="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
    >
      <AppIcon name="info" :size="14" class="mt-0.5 shrink-0" />
      <p>{{ t("logistics.pricingForm.deleteSuggest") }}</p>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <button v-if="can.write" type="button" class="hdr-btn-primary" @click="$emit('deactivate')">
        {{ t("logistics.pricingForm.deactivate") }}
      </button>
      <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
        {{ t("logistics.pricingForm.cancel") }}
      </button>
      <!-- Kullanımdaki kuralda "yine de sil" DEVRE DIŞI: tıklanabilir bırakmak
           günün sonunda tıklanır ve fiyat gerekçesi kaybolur. -->
      <button
        type="button"
        class="hdr-btn-danger ms-auto"
        :disabled="Boolean(inUseCount)"
        @click="$emit('confirm-delete')"
      >
        {{ t("logistics.pricingForm.delete") }}
      </button>
    </div>
  </div>

  <!-- YÜKLENİYOR — veri gelene kadar boş form göstermek "kayıt boş" dedirtir -->
  <div v-else-if="loading" class="card p-5" :aria-busy="true">
    <Skeleton v-for="i in 6" :key="i" variant="rect" height="44px" class="mb-3" />
  </div>

  <!-- FORM -->
  <div v-else class="grid items-start gap-4 xl:grid-cols-[1fr_300px]">
    <div class="card p-5" :class="{ 'pointer-events-none opacity-90': readOnly }">
      <div
        v-if="readOnly"
        class="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <AppIcon name="lock" :size="14" class="mt-0.5 shrink-0" />
        <p>
          <b>{{ t("logistics.pricingForm.foreignTitle", { owner: model.owner_label }) }}</b>
          {{ t("logistics.pricingForm.foreignBody") }}
        </p>
      </div>

      <!-- SAYFA BAŞLIĞI: form kipinde `h1` YOKTU — ekranın "neredeyim"
           cevabı yalnız kırıntı yolundaydı ve ekran okuyucuda sayfa
           adsız açılıyordu (ölçüldü 2026-08-21, kontrast taraması
           `main h1` bulamadı). Yeni kayıtta ad henüz boş; o yüzden
           başlık kuralın adına DÜŞÜYOR, yoksa "Yeni kural" diyor. -->
      <h1 class="mb-3 text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ model.rule_name || t("logistics.pricingForm.new") }}
      </h1>

      <h2
        class="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.pricingForm.identity") }}
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="form-label"
            >{{ t("logistics.pricingForm.ruleName") }}
            <span class="text-red-700 dark:text-red-400">*</span></span
          >
          <input
            v-model="model.rule_name"
            type="text"
            class="form-input"
            :class="{ 'border-red-500': fieldErrors.rule_name }"
          />
          <span
            v-if="fieldErrors.rule_name"
            class="text-[11px] font-semibold text-red-700 dark:text-red-400"
            >{{ fieldErrors.rule_name }}</span
          >
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.owner") }}</span>
          <!-- Sahip DEĞİŞTİRİLEMEZ: bir kuralın sahibini sonradan değiştirmek
               onu başka bir katmana taşır ve geçmiş fiyat gerekçelerini bozar. -->
          <input
            :value="model.owner_label || t('logistics.rates.ownerPlatform')"
            type="text"
            class="form-input"
            disabled
          />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.priority") }}</span>
          <input v-model.number="model.priority" type="number" min="1" class="form-input" />
          <span class="text-[11px] text-gray-600 dark:text-gray-400">{{
            t("logistics.pricingForm.priorityHint")
          }}</span>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.status") }}</span>
          <select v-model="model.is_active" class="form-input">
            <option :value="1">{{ t("logistics.pricingForm.active") }}</option>
            <option :value="0">{{ t("logistics.pricingForm.passive") }}</option>
          </select>
        </label>
      </div>

      <!-- Zorunlu bayrağı YALNIZ platform kuralında var. Kapı arayüz değil,
           uç (sözleşme §7.3) — burada gizlemek yalnız kolaylık. -->
      <div
        v-if="!asSeller && !readOnly"
        class="mt-3 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
      >
        <AppIcon name="triangle-alert" :size="14" class="mt-0.5 shrink-0" />
        <label class="flex cursor-pointer items-start gap-2">
          <input
            v-model="model.is_mandatory"
            type="checkbox"
            :true-value="1"
            :false-value="0"
            class="mt-0.5"
          />
          <span
            ><b>{{ t("logistics.pricingForm.mandatory") }}</b> —
            {{ t("logistics.pricingForm.mandatoryHint") }}</span
          >
        </label>
      </div>

      <h2
        class="mb-1 mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.pricingForm.criteria") }}
      </h2>
      <p class="mb-2.5 text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.pricingForm.criteriaHint") }}
      </p>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.carrierAccount") }}</span>
          <select v-model="model.carrier_account" class="form-input">
            <option :value="null">{{ t("logistics.pricingForm.none") }}</option>
            <option v-for="a in accounts" :key="a.name" :value="a.name">
              {{ a.account_name }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.method") }}</span>
          <select v-model="model.shipping_method" class="form-input">
            <option :value="null">{{ t("logistics.pricingForm.none") }}</option>
            <option v-for="m in methods" :key="m.name" :value="m.method_name">
              {{ m.method_name }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.zone") }}</span>
          <select v-model="model.zone" class="form-input">
            <option :value="null">{{ t("logistics.pricingForm.none") }}</option>
            <option v-for="z in zones" :key="z.name" :value="z.name">{{ z.zone_name }}</option>
          </select>
          <span class="text-[11px] text-gray-600 dark:text-gray-400">{{
            t("logistics.pricingForm.zoneSource")
          }}</span>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.originCity") }}</span>
          <input
            v-model="model.origin_city"
            type="text"
            class="form-input"
            :placeholder="t('logistics.pricingForm.none')"
          />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.weight") }}</span>
          <span class="flex items-center gap-1.5">
            <input
              v-model.number="model.min_weight_kg"
              type="number"
              class="form-input"
              :placeholder="t('logistics.pricingForm.min')"
            />
            <span class="text-gray-600 dark:text-gray-400">–</span>
            <input
              v-model.number="model.max_weight_kg"
              type="number"
              class="form-input"
              :placeholder="t('logistics.pricingForm.max')"
            />
          </span>
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.orderTotal") }}</span>
          <input
            v-model.number="model.min_order_total"
            type="number"
            class="form-input"
            :placeholder="t('logistics.pricingForm.none')"
          />
        </label>
      </div>

      <div class="mb-1 mt-5 flex items-center justify-between">
        <h2 class="text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {{ t("logistics.pricingForm.tiers") }}
        </h2>
        <button v-if="!readOnly" type="button" class="hdr-btn-outlined" @click="addTier">
          {{ t("logistics.pricingForm.addTier") }}
        </button>
      </div>
      <div class="card p-0 overflow-hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="tbl-th w-24">{{ t("logistics.pricingForm.tierMin") }}</th>
              <th class="tbl-th w-24">{{ t("logistics.pricingForm.tierMax") }}</th>
              <th class="tbl-th w-28">{{ t("logistics.pricingForm.tierCost") }}</th>
              <th class="tbl-th w-28">{{ t("logistics.pricingForm.tierCharge") }}</th>
              <th class="tbl-th w-28">{{ t("logistics.pricingForm.tierPerDesi") }}</th>
              <th class="tbl-th w-24">{{ t("logistics.pricingForm.tierMinCharge") }}</th>
              <th class="tbl-th w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tier, i) in model.tiers"
              :key="i"
              :class="{ 'bg-red-50 dark:bg-red-900/20': badTierIndex === i }"
            >
              <td class="tbl-td">
                <input v-model.number="tier.min_desi" type="number" class="form-input-sm w-full" />
              </td>
              <td class="tbl-td">
                <input
                  v-model.number="tier.max_desi"
                  type="number"
                  class="form-input-sm w-full"
                  placeholder="∞"
                />
              </td>
              <td class="tbl-td">
                <!-- Alışı göremeyen KUTUYU da görmüyor: boş bir giriş kutusu
                     "doldurabilirim" der, oysa alan hiç gelmiyor (§7.2). -->
                <input
                  v-if="showCost"
                  v-model.number="tier.base_cost"
                  type="number"
                  class="form-input-sm w-full"
                />
                <MaskedValue v-else :value="null" :hint="t('logistics.rates.maskedOwn')" />
              </td>
              <td class="tbl-td">
                <input
                  v-model.number="tier.base_charge"
                  type="number"
                  class="form-input-sm w-full"
                />
              </td>
              <td class="tbl-td">
                <input
                  v-model.number="tier.per_desi_charge"
                  type="number"
                  class="form-input-sm w-full"
                />
              </td>
              <td class="tbl-td">
                <input
                  v-model.number="tier.min_charge"
                  type="number"
                  class="form-input-sm w-full"
                />
              </td>
              <td class="tbl-td">
                <button
                  v-if="!readOnly && model.tiers.length > 1"
                  type="button"
                  class="text-gray-500 hover:text-red-700 dark:hover:text-red-400"
                  :title="t('logistics.pricingForm.removeTier')"
                  @click="model.tiers.splice(i, 1)"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-if="tierError"
        class="mt-1.5 rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-300"
      >
        {{ tierError.message }} · <code>{{ tierError.code }}</code>
      </p>

      <div class="mb-1 mt-5 flex items-center justify-between">
        <h2 class="text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {{ t("logistics.pricingForm.surcharges") }}
        </h2>
        <button v-if="!readOnly" type="button" class="hdr-btn-outlined" @click="addSurcharge">
          {{ t("logistics.pricingForm.addSurcharge") }}
        </button>
      </div>
      <div class="card p-0 overflow-hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="tbl-th">{{ t("logistics.pricingForm.surchargeType") }}</th>
              <th class="tbl-th w-32">{{ t("logistics.pricingForm.calcMethod") }}</th>
              <th class="tbl-th w-24">{{ t("logistics.pricingForm.value") }}</th>
              <th class="tbl-th w-40">{{ t("logistics.pricingForm.appliesTo") }}</th>
              <th class="tbl-th w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in model.surcharges" :key="i">
              <td class="tbl-td">
                <input v-model="s.surcharge_type" type="text" class="form-input-sm w-full" />
              </td>
              <td class="tbl-td">
                <select v-model="s.calc_method" class="form-input-sm w-full">
                  <option value="fixed">{{ t("logistics.pricingForm.fixed") }}</option>
                  <option value="percent">{{ t("logistics.pricingForm.percent") }}</option>
                </select>
              </td>
              <td class="tbl-td">
                <input v-model.number="s.value" type="number" class="form-input-sm w-full" />
              </td>
              <td class="tbl-td">
                <select v-model="s.applies_to" class="form-input-sm w-full">
                  <option value="both">{{ t("logistics.pricingForm.appliesBoth") }}</option>
                  <option value="charge">{{ t("logistics.pricingForm.appliesCharge") }}</option>
                  <option value="cost">{{ t("logistics.pricingForm.appliesCost") }}</option>
                </select>
              </td>
              <td class="tbl-td">
                <button
                  v-if="!readOnly"
                  type="button"
                  class="text-gray-500 hover:text-red-700 dark:hover:text-red-400"
                  @click="model.surcharges.splice(i, 1)"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2
        class="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.pricingForm.validity") }}
      </h2>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.from") }}</span>
          <input v-model="model.valid_from" type="date" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.until") }}</span>
          <input
            v-model="model.valid_until"
            type="date"
            class="form-input"
            :placeholder="t('logistics.pricingForm.unlimited')"
          />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.pricingForm.taxRate") }}</span>
          <input v-model.number="model.tax_rate" type="number" class="form-input" />
          <span class="text-[11px] text-gray-600 dark:text-gray-400">{{
            t("logistics.pricingForm.taxHint")
          }}</span>
        </label>
      </div>

      <div class="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <template v-if="readOnly">
          <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
            {{ t("logistics.pricingForm.close") }}
          </button>
          <button type="button" class="hdr-btn-danger ms-auto" @click="$emit('deactivate')">
            {{ t("logistics.pricingForm.deactivate") }}
          </button>
        </template>
        <template v-else>
          <!-- Yetkisiz kullanıcıya çalışmayacak buton çizmek, ona backend
               hatası yedirmek demek — düğme hiç render edilmiyor. -->
          <button
            v-if="can.write"
            type="button"
            class="hdr-btn-primary"
            :disabled="Boolean(tierError) || saving"
            @click="$emit('save', model)"
          >
            {{ t("logistics.pricingForm.save") }}
          </button>
          <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
            {{ t("logistics.pricingForm.cancel") }}
          </button>
          <button
            v-if="can.write && model.name"
            type="button"
            class="hdr-btn-danger ms-auto"
            @click="$emit('ask-delete')"
          >
            {{ t("logistics.pricingForm.delete") }}
          </button>
        </template>
      </div>
    </div>

    <!-- CANLI HESAP — kaydetmeden sonucu gör (kök CLAUDE.md §4.14c) -->
    <aside class="card sticky top-20 p-3.5">
      <div class="mb-2.5 flex items-center gap-2">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <h2 class="text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {{ t("logistics.pricingForm.live") }}
        </h2>
      </div>

      <div class="mb-3 space-y-2">
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.desi") }}</span>
          <input v-model.number="probe.desi" type="number" class="form-input" />
        </label>
        <label class="block">
          <span class="form-label">{{ t("logistics.simulation.orderTotal") }}</span>
          <input v-model.number="probe.order_total" type="number" class="form-input" />
        </label>
      </div>

      <div
        v-if="tierError"
        class="rounded-lg border border-red-300 bg-red-50 p-2 text-[11px] text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
      >
        {{ tierError.message }}
      </div>
      <div v-else-if="!liveQuote" class="text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.simulation.noResult") }}
      </div>
      <dl v-else class="text-xs">
        <div
          class="flex items-baseline justify-between border-b border-gray-100 py-1 dark:border-gray-800"
        >
          <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pricingForm.tiers") }}</dt>
          <dd class="font-semibold">{{ liveQuote.applied_tier_label }}</dd>
        </div>
        <div
          v-for="line in liveQuote.surcharges"
          :key="line.surcharge_type"
          class="flex items-baseline justify-between border-b border-gray-100 py-1 dark:border-gray-800"
        >
          <dt class="text-gray-600 dark:text-gray-400">{{ line.surcharge_type }}</dt>
          <dd class="tabular-nums">{{ money(line.amount) }}</dd>
        </div>
        <div
          class="flex items-baseline justify-between border-b border-gray-100 py-1 dark:border-gray-800"
        >
          <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.pricingForm.taxRate") }}</dt>
          <dd class="tabular-nums">{{ money(liveQuote.tax_amount) }}</dd>
        </div>
        <div
          class="mt-1.5 flex items-baseline justify-between border-t border-gray-200 pt-2 dark:border-gray-700"
        >
          <dt class="font-semibold">{{ t("logistics.simulation.buyerPays") }}</dt>
          <dd class="text-base font-bold tabular-nums">{{ money(liveQuote.total_with_tax) }}</dd>
        </div>
        <div v-if="showCost" class="flex items-baseline justify-between py-1">
          <dt class="text-gray-600 dark:text-gray-400">{{ t("logistics.rates.margin") }}</dt>
          <dd>
            <MaskedValue
              :value="liveQuote.margin"
              :hint="t('logistics.rates.maskedOwn')"
              positive
            />
          </dd>
        </div>
      </dl>

      <!-- ZARAR UYARISI — kaydetmeden ÖNCE (kabul senaryosu S3).
           Marjı kırmızı yazmak yetmiyor: renk tek ayırt edici olamaz
           (13-FE madde 11'de ölçüldü) ve "-84,20 ₺" ne yapılması
           gerektiğini söylemiyor. Tek cümle, eylem söylüyor
           (CLAUDE.md §4.14d). Kayıt ENGELLENMİYOR: kampanya kuralları
           bilerek zararına yazılabiliyor. -->
      <div
        v-if="showCost && liveQuote && liveQuote.margin < 0"
        class="mt-2.5 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-[11px] text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        role="alert"
      >
        <AppIcon name="triangle-alert" :size="13" class="mt-0.5 shrink-0" />
        <p>
          <b>{{ t("logistics.rates.negativeMargin") }}</b>
          — {{ t("logistics.rates.negativeMarginHint") }}
          {{ t("logistics.pricingForm.lossHint") }}
        </p>
      </div>

      <p class="mt-2.5 text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.pricingForm.liveHint") }}
      </p>
    </aside>
  </div>
</template>

<script setup>
  import { computed, reactive } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import { quoteFromRule, tierFor, tierProblems } from "@/api/pricingMock";

  import MaskedValue from "./MaskedValue.vue";
  import { RULE_TEMPLATES } from "@/constants/pricingTemplates";

  /**
   * **K4 · Kural formu** (20-FE, YENİ ekran).
   *
   * Görevin adında "CRUD" vardı ama C/U/D'nin ekranı hiç tasarlanmamıştı:
   * prototipler `create`/`edit` yayıyor, dinleyen yoktu.
   *
   * ÜÇ MOD tek bileşende: `template` (şablon seçimi), `form`, `delete`.
   * Ayrı ekranlar açmak üç rota + üç kabuk demekti; kullanıcı için hepsi
   * "kural oluşturuyorum" akışının parçası.
   *
   * CANLI HESAP sağda: örnek yükü gir, kaydetmeden sonucu gör. Hesap
   * `pricingMock`'un SAF çekirdeğinden geliyor — ekran kendi formülünü
   * yazmıyor, yoksa iki hesap iki farklı sonuç verirdi.
   */
  /**
   * Düzenlenen kayıt.
   *
   * `defineModel` — düz prop OLMAZ: form alanları kaydı doğrudan değiştiriyor
   * ve prop mutasyonu proje kuralınca yasak (`workflow.md` §1.6, ESLint
   * `vue/no-mutating-props`). Container `reactive` bir TASLAK veriyor; kaydet
   * denene kadar gerçek kayda dokunulmuyor.
   */
  const model = defineModel("model", { type: Object, required: true });

  defineProps({
    mode: { type: String, default: "form" }, // template | form | delete
    loading: { type: Boolean, default: false },
    /** Yazma yetkisi — yoksa Kaydet/Sil HİÇ çizilmiyor (devre dışı değil, yok). */
    can: { type: Object, default: () => ({ read: true, write: false }) },
    zones: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    methods: { type: Array, default: () => [] },
    fieldErrors: { type: Object, default: () => ({}) },
    inUseCount: { type: Number, default: 0 },
    saving: { type: Boolean, default: false },
    asSeller: { type: Boolean, default: false },
    /** Başkasının kuralı: alış alanları hiç doldurulmuyor, kaydet yok (§6.1). */
    readOnly: { type: Boolean, default: false },
    showCost: { type: Boolean, default: true },
  });

  defineEmits(["save", "cancel", "ask-delete", "confirm-delete", "deactivate", "pick-template"]);

  const { t } = useI18n();
  const templates = RULE_TEMPLATES;

  const probe = reactive({ desi: 42, order_total: 4200 });

  /** İlk kademe sorunu — kaydet düğmesini kapatan ve canlı hesabı durduran şey. */
  const tierError = computed(() => {
    const sorunlar = tierProblems(model.value.tiers);
    return sorunlar.length ? sorunlar[0] : null;
  });

  const badTierIndex = computed(() => {
    if (!tierError.value) return -1;
    const sirali = [...(model.value.tiers ?? [])].sort(
      (a, b) => Number(a.min_desi ?? 0) - Number(b.min_desi ?? 0)
    );
    return model.value.tiers.indexOf(sirali[sirali.length - 1]);
  });

  /**
   * Canlı hesap — sözleşme §5.3'ün AYNI uygulaması.
   *
   * Sipariş tutarı eşiği doluysa ve probe onun altındaysa kural zaten
   * eşleşmezdi; bunu hesaplamak yanıltıcı olurdu.
   */
  const liveQuote = computed(() => {
    if (tierError.value) return null;
    if (model.value.min_order_total != null && probe.order_total < model.value.min_order_total)
      return null;
    const tier = tierFor(model.value, probe.desi);
    if (!tier) return null;
    return quoteFromRule(model.value, tier, { desi: probe.desi });
  });

  function addTier() {
    const sonuncu = model.value.tiers[model.value.tiers.length - 1];
    model.value.tiers.push({
      min_desi: sonuncu?.max_desi ?? 0,
      max_desi: null,
      base_cost: null,
      base_charge: null,
      per_desi_charge: null,
      min_charge: null,
    });
  }

  function addSurcharge() {
    model.value.surcharges.push({
      surcharge_type: "",
      calc_method: "percent",
      value: 0,
      applies_to: "both",
    });
  }

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
</script>

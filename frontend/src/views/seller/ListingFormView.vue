<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
          @click="goBack"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <div>
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ isNew ? t("listingForm.newProduct") : form.title || docName }}
          </h1>
          <p class="text-xs text-gray-400">
            {{ isNew ? t("listingForm.createNewListing") : docName }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Completeness Score Badge -->
        <div
          v-if="!isNew && form.completeness_score !== undefined"
          class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          :class="
            form.completeness_score >= 80
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
              : form.completeness_score >= 50
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
          "
        >
          <div class="relative w-9 h-9">
            <svg class="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke-width="3"
                class="stroke-gray-200 dark:stroke-gray-700"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke-width="3"
                stroke-linecap="round"
                :class="
                  form.completeness_score >= 80
                    ? 'stroke-green-500'
                    : form.completeness_score >= 50
                      ? 'stroke-amber-500'
                      : 'stroke-red-500'
                "
                :stroke-dasharray="`${(form.completeness_score || 0) * 0.9425} 94.25`"
              />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
              :class="
                form.completeness_score >= 80
                  ? 'text-green-600'
                  : form.completeness_score >= 50
                    ? 'text-amber-600'
                    : 'text-red-500'
              "
            >
              {{ form.completeness_score || 0 }}
            </span>
          </div>
          <div class="leading-tight">
            <p
              class="text-[10px] font-semibold"
              :class="
                form.completeness_score >= 80
                  ? 'text-green-700 dark:text-green-400'
                  : form.completeness_score >= 50
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              "
            >
              {{
                form.completeness_score >= 90
                  ? t("listingForm.scoreExcellent")
                  : form.completeness_score >= 70
                    ? t("listingForm.scoreGood")
                    : form.completeness_score >= 50
                      ? t("listingForm.scoreFair")
                      : t("listingForm.scoreImprovable")
              }}
            </p>
            <button
              type="button"
              class="text-[9px] text-violet-500 hover:underline"
              @click="showCompletenessBreakdown = true"
            >
              {{ t("listingForm.detail") }}
            </button>
          </div>
        </div>
        <button class="hdr-btn-outlined" @click="goBack">{{ t("listingForm.back") }}</button>
        <button class="hdr-btn-primary" :disabled="saving" data-tour="lfv-save" @click="saveDoc">
          <AppIcon v-if="saving" name="loader" :size="13" class="animate-spin" />
          <AppIcon v-else name="save" :size="13" />
          {{ isNew ? t("listingForm.create") : t("listingForm.save") }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("listingForm.loading") }}</p>
    </div>

    <div v-else>
      <!-- Reddedildi banner -->
      <div
        v-if="!isAdmin && form.status === 'Rejected'"
        class="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3"
      >
        <AppIcon name="alert-circle" :size="16" class="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-xs font-semibold text-red-700 dark:text-red-400">
            {{ t("listingForm.listingRejected") }}
          </p>
          <p v-if="form.rejection_reason" class="text-xs text-red-600 dark:text-red-300 mt-0.5">
            {{ form.rejection_reason }}
          </p>
          <p class="text-[11px] text-red-500 dark:text-red-400 mt-1">
            {{ t("listingForm.editResubmitHint") }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div
        class="flex overflow-x-auto gap-1 mb-4 bg-white dark:bg-[#13131a] border border-gray-200 dark:border-white/8 rounded-xl p-1"
        data-tour="lfv-tabs"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
            activeTab === tab.key
              ? 'bg-violet-600 text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
          ]"
          @click="activeTab = tab.key"
        >
          <AppIcon :name="tab.icon" :size="12" />
          {{ tab.label }}
        </button>
      </div>

      <!-- ───── TAB: Genel ───── -->
      <div v-show="activeTab === 'details'" class="card space-y-4">
        <h3 class="section-title">{{ t("listingForm.basicInfo") }}</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label"
              >{{ t("listingForm.listingCode") }}
              <span class="text-gray-400 font-normal text-[10px]">{{
                t("listingForm.automatic")
              }}</span></label
            >
            <input
              :value="form.listing_code"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div data-tour="lfv-title">
            <div class="flex items-center justify-between mb-1">
              <label class="form-label mb-0"
                >{{ t("listingForm.titleLabel") }} <span class="text-red-500">*</span></label
              >
              <LangToggle v-model="editLang" :filled="langFill" />
            </div>
            <input
              v-model="form[langKey('title')]"
              type="text"
              class="form-input"
              :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
              :placeholder="t('listingForm.productTitlePlaceholder')"
            />
            <div
              v-if="fieldCanCopy('title') || fieldStale('title')"
              class="mt-1 flex items-center gap-2 text-[11px]"
            >
              <button
                v-if="fieldCanCopy('title')"
                type="button"
                class="rounded border border-gray-200 px-2 py-0.5 text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                @click="copyFieldFromSource('title')"
              >
                {{ t("categoryManagement.copyFromSource") }}
              </button>
              <span
                v-if="fieldStale('title')"
                class="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
              >
                <AppIcon name="triangle-alert" :size="11" />
                {{ t("categoryManagement.sourceChangedReview") }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
              <span>{{ t("categoryManagement.contentDefaultLang") }}:</span>
              <button
                v-for="lng in CONTENT_LANGS"
                :key="lng"
                type="button"
                class="px-2 py-0.5 rounded border transition-colors"
                :class="
                  form.content_default_lang === lng
                    ? 'border-violet-400 text-violet-700 bg-violet-50'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                "
                @click="form.content_default_lang = lng"
              >
                {{ lng.toUpperCase() }}
              </button>
            </div>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.sellerProfile") }}</label>
            <input
              :value="form.seller_profile"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label"
              >{{ t("listingForm.statusLabel") }} <span class="text-red-500">*</span></label
            >
            <select v-model="form.status" class="form-input">
              <option
                v-for="opt in statusOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="!isAdmin && adminOnlyStatuses.includes(opt.value)"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.listingType") }}</label>
            <select v-model="form.listing_type" class="form-input">
              <option value="Fixed Price">{{ t("listingForm.listingTypeFixedPrice") }}</option>
              <option value="Auction">{{ t("listingForm.listingTypeAuction") }}</option>
              <option value="RFQ Only">{{ t("listingForm.listingTypeRfqOnly") }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.category") }}</label>
            <select v-model="form.category" class="form-input">
              <option value="">{{ t("listingForm.selectCategory") }}</option>
              <option v-for="cat in sellerCategories" :key="cat.name" :value="cat.name">
                {{ cat.category_name }}
              </option>
            </select>
            <p v-if="sellerCategories.length === 0" class="text-[10px] text-amber-500 mt-1">
              {{ t("listingForm.noApprovedCategory") }}
              <a href="#" class="underline" @click.prevent="$router.push('/seller-categories')">{{
                t("listingForm.addCategory")
              }}</a
              >.
            </p>
          </div>
          <!-- Platform Kategorisi -->
          <div class="lg:col-span-2">
            <label class="form-label">{{ t("listingForm.platformCategory") }}</label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 form-input text-left flex items-center gap-2 min-h-[38px] hover:border-violet-400 transition-colors cursor-pointer"
                :class="
                  categoryPickerPath.length ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                "
                @click="openCategoryPicker"
              >
                <AppIcon name="folder-tree" :size="14" class="flex-shrink-0 text-violet-500" />
                <span v-if="categoryPickerPath.length" class="text-xs truncate">
                  {{ categoryPickerPath.map((c) => c.category_name).join(" › ") }}
                </span>
                <span v-else class="text-xs">{{ t("listingForm.clickToSelectCategory") }}</span>
              </button>
              <button
                v-if="categoryPickerPath.length"
                type="button"
                class="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                :title="t('listingForm.clear')"
                @click="clearProductCategory"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
          </div>

          <div>
            <label class="form-label">{{ t("listingForm.brand") }}</label>
            <LinkInput
              v-model="form.brand"
              doctype="Brand"
              :placeholder="t('listingForm.searchBrand')"
              :filters="[
                ['status', '!=', 'Rejected'],
                ['is_active', '=', 1],
              ]"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.condition") }}</label>
            <select v-model="form.condition" class="form-input">
              <option value="New">{{ t("listingForm.conditionNew") }}</option>
              <option value="Used - Like New">{{ t("listingForm.conditionLikeNew") }}</option>
              <option value="Used - Good">{{ t("listingForm.conditionGood") }}</option>
              <option value="Refurbished">{{ t("listingForm.conditionRefurbished") }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.productType") }}</label>
            <LinkInput
              v-model="form.product_type"
              doctype="Product Type"
              :placeholder="t('listingForm.searchType')"
              :filters="[['is_active', '=', 1]]"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.productFamily") }}</label>
            <LinkInput
              v-model="form.product_family"
              doctype="Product Family"
              :placeholder="t('listingForm.searchFamily')"
              :filters="[['is_active', '=', 1]]"
            />
          </div>
          <div class="lg:col-span-2">
            <label class="form-label">{{ t("listingForm.attributeSet") }}</label>
            <LinkInput
              v-model="form.attribute_set"
              doctype="Attribute Set"
              :placeholder="t('listingForm.searchSet')"
              :filters="[['is_active', '=', 1]]"
            />
            <p v-if="form.attribute_set" class="text-[10px] text-gray-400 mt-1">
              {{ t("listingForm.attributeSetHint") }}
            </p>
          </div>
        </div>
      </div>

      <!-- ───── Genel tab — Görünürlük & Etiketler (eski Ayarlar tabı) ───── -->
      <div v-show="activeTab === 'details'" class="card space-y-4">
        <h3 class="section-title">{{ t("listingForm.visibilityAndTags") }}</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="space-y-3">
            <label
              v-for="f in checkboxFields"
              :key="f.key"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="form[f.key]"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ f.label }}</span>
            </label>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.sellingPoint") }}</label>
            <input
              v-model="form[langKey('selling_point')]"
              type="text"
              class="form-input"
              :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
              :placeholder="t('listingForm.sellingPointPlaceholder')"
            />
            <div
              v-if="fieldCanCopy('selling_point') || fieldStale('selling_point')"
              class="mt-1 flex items-center gap-2 text-[11px]"
            >
              <button
                v-if="fieldCanCopy('selling_point')"
                type="button"
                class="rounded border border-gray-200 px-2 py-0.5 text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                @click="copyFieldFromSource('selling_point')"
              >
                {{ t("categoryManagement.copyFromSource") }}
              </button>
              <span
                v-if="fieldStale('selling_point')"
                class="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
              >
                <AppIcon name="triangle-alert" :size="11" />
                {{ t("categoryManagement.sourceChangedReview") }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Açıklama ───── -->
      <div v-show="activeTab === 'description'" class="card space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="section-title mb-0">{{ t("listingForm.description") }}</h3>
          <LangToggle v-model="editLang" :filled="langFill" />
        </div>
        <div>
          <label class="form-label">{{ t("listingForm.shortDescription") }}</label>
          <textarea
            v-model="form[langKey('short_description')]"
            rows="3"
            class="form-input resize-none"
            :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
            :placeholder="t('listingForm.shortDescriptionPlaceholder')"
          ></textarea>
          <div
            v-if="fieldCanCopy('short_description') || fieldStale('short_description')"
            class="mt-1 flex items-center gap-2 text-[11px]"
          >
            <button
              v-if="fieldCanCopy('short_description')"
              type="button"
              class="rounded border border-gray-200 px-2 py-0.5 text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              @click="copyFieldFromSource('short_description')"
            >
              {{ t("categoryManagement.copyFromSource") }}
            </button>
            <span
              v-if="fieldStale('short_description')"
              class="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
            >
              <AppIcon name="triangle-alert" :size="11" />
              {{ t("categoryManagement.sourceChangedReview") }}
            </span>
          </div>
        </div>
        <div>
          <label class="form-label">{{ t("listingForm.description") }}</label>
          <textarea
            v-model="form[langKey('description')]"
            rows="8"
            class="form-input resize-none font-mono text-xs"
            :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
            :placeholder="t('listingForm.descriptionPlaceholder')"
          ></textarea>
          <div
            v-if="fieldCanCopy('description') || fieldStale('description')"
            class="mt-1 flex items-center gap-2 text-[11px]"
          >
            <button
              v-if="fieldCanCopy('description')"
              type="button"
              class="rounded border border-gray-200 px-2 py-0.5 text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              @click="copyFieldFromSource('description')"
            >
              {{ t("categoryManagement.copyFromSource") }}
            </button>
            <span
              v-if="fieldStale('description')"
              class="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
            >
              <AppIcon name="triangle-alert" :size="11" />
              {{ t("categoryManagement.sourceChangedReview") }}
            </span>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Fiyatlandırma ───── -->
      <div v-show="activeTab === 'pricing'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.pricing") }}</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label"
                >{{ t("listingForm.currency") }} <span class="text-red-500">*</span></label
              >
              <select v-model="form.currency" class="form-input">
                <option value="">{{ t("listingForm.select") }}</option>
                <option v-for="c in currencies" :key="c.name" :value="c.name">
                  {{ c.name
                  }}{{
                    c.currency_name && c.currency_name !== c.name ? " — " + c.currency_name : ""
                  }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label"
                >{{ t("listingForm.listPrice") }} <span class="text-red-500">*</span></label
              >
              <input
                v-model.number="form.base_price"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label"
                >{{ t("listingForm.sellingPriceLabel") }} <span class="text-red-500">*</span></label
              >
              <input
                v-model.number="form.selling_price"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.discountPercent") }}</label>
              <input
                v-model.number="form.discount_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                class="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.samplePrice") }}</label>
              <input
                v-model.number="form.sample_price"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <div class="flex items-center gap-3">
            <input
              id="b2b_enabled"
              v-model="form.b2b_enabled"
              type="checkbox"
              :true-value="1"
              :false-value="0"
              class="form-checkbox rounded text-violet-600 w-4 h-4"
            />
            <label
              for="b2b_enabled"
              class="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
              >{{ t("listingForm.enableB2bBulkPricing") }}</label
            >
          </div>
          <div v-if="form.b2b_enabled">
            <ChildTable
              v-model="childData.pricing_tiers"
              :columns="[
                { key: 'min_qty', label: t('listingForm.minQty'), type: 'number', reqd: true },
                { key: 'max_qty', label: t('listingForm.maxQty'), type: 'number' },
                { key: 'price', label: t('listingForm.price'), type: 'number', reqd: true },
                {
                  key: 'discount_percentage',
                  label: t('listingForm.discountPercent'),
                  type: 'number',
                },
              ]"
              child-doctype="Listing Bulk Pricing Tier"
              :add-label="t('listingForm.addPricingTier')"
            />
          </div>
        </div>
      </div>

      <!-- ───── TAB: Envanter ───── -->
      <div v-show="activeTab === 'inventory'" class="card space-y-4">
        <h3 class="section-title">{{ t("listingForm.inventory") }}</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label">{{ t("listingForm.stockQty") }}</label>
            <input
              v-model.number="form.stock_qty"
              type="number"
              step="0.001"
              min="0"
              class="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label class="form-label"
              >{{ t("listingForm.reservedQty") }}
              <span class="text-gray-400 font-normal text-[10px]">{{
                t("listingForm.readOnly")
              }}</span></label
            >
            <input
              :value="form.reserved_qty || 0"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label"
              >{{ t("listingForm.availableQty") }}
              <span class="text-gray-400 font-normal text-[10px]">{{
                t("listingForm.readOnly")
              }}</span></label
            >
            <input
              :value="form.available_qty || 0"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.stockUom") }}</label>
            <LinkInput
              v-model="form.stock_uom"
              doctype="UOM"
              :placeholder="t('listingForm.searchUnit')"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.minOrderQty") }}</label>
            <input
              v-model.number="form.min_order_qty"
              type="number"
              min="1"
              class="form-input"
              :class="{ 'opacity-60 cursor-not-allowed': isMinOrderQtyLockedByB2B }"
              :readonly="isMinOrderQtyLockedByB2B"
              placeholder="1"
            />
            <p
              v-if="isMinOrderQtyLockedByB2B"
              class="text-[11px] text-gray-500 dark:text-gray-400 mt-1"
            >
              {{ t("listingForm.minOrderQtyB2bHint") }}
            </p>
            <label class="flex items-center gap-2 cursor-pointer mt-2">
              <input
                v-model="form.sell_in_moq_multiples"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-xs text-gray-700 dark:text-gray-300">{{
                t("listingForm.sellInMoqMultiples")
              }}</span>
            </label>
            <p
              v-if="form.sell_in_moq_multiples"
              class="text-[11px] text-gray-500 dark:text-gray-400 mt-1"
            >
              {{ t("listingForm.moqMultiplesHint", { step: form.min_order_qty || 1 }) }}
            </p>
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.maxOrderQty") }}</label>
            <input
              v-model.number="form.max_order_qty"
              type="number"
              min="0"
              class="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.lowStockThreshold") }}</label>
            <input
              v-model.number="form.low_stock_threshold"
              type="number"
              min="0"
              class="form-input"
              placeholder="5"
            />
          </div>
          <div class="flex flex-col gap-3 pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.track_inventory"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{
                t("listingForm.trackInventory")
              }}</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.allow_backorders"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{
                t("listingForm.allowBackorders")
              }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Medya ───── -->
      <div v-show="activeTab === 'media'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.primaryImage") }}</h3>
          <div class="flex items-start gap-4">
            <div
              v-if="form.primary_image || uploads.states['primary_image']"
              class="relative w-32 h-32 rounded-xl border border-gray-200 dark:border-white/10 shrink-0 overflow-hidden bg-gray-100"
            >
              <img
                v-if="form.primary_image"
                :src="form.primary_image"
                class="w-full h-full object-cover"
                :alt="t('listingForm.primaryImage')"
              />
              <!-- Upload progress: opak dim overlay (sızıntıyı önler) + bar + % metni -->
              <div
                v-if="uploads.states['primary_image']?.status === 'uploading'"
                class="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center gap-2 bg-black/85 rounded-xl"
              >
                <div class="w-3/4 max-w-[140px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                    :style="{ width: Math.max(6, uploads.states['primary_image'].progress) + '%' }"
                  ></div>
                </div>
                <span class="text-[11px] text-white font-semibold">
                  {{ Math.round(uploads.states["primary_image"].progress) }}%
                </span>
              </div>
              <Transition name="fade">
                <div
                  v-if="uploads.states['primary_image']?.status === 'success'"
                  class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85 rounded-xl"
                >
                  <div
                    class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-emerald-500 text-2xl font-bold shadow-xl"
                  >
                    ✓
                  </div>
                </div>
              </Transition>
            </div>
            <div class="flex-1 space-y-2">
              <p v-if="form.primary_image" class="text-xs text-gray-400 break-all">
                {{ form.primary_image }}
              </p>
              <label
                class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-white/15 cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors w-fit"
                :class="uploadingField === 'primary_image' ? 'opacity-60 pointer-events-none' : ''"
              >
                <AppIcon
                  :name="uploadingField === 'primary_image' ? 'loader' : 'image'"
                  :size="14"
                  :class="
                    uploadingField === 'primary_image'
                      ? 'animate-spin text-violet-500'
                      : 'text-gray-400'
                  "
                />
                <span class="text-xs text-gray-500">{{
                  uploadingField === "primary_image"
                    ? t("listingForm.uploading")
                    : form.primary_image
                      ? t("listingForm.change")
                      : t("listingForm.selectPrimaryImage")
                }}</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="uploadImage('primary_image', $event)"
                />
              </label>
              <button
                v-if="form.primary_image"
                class="text-xs text-red-500 hover:text-red-700"
                @click="form.primary_image = ''"
              >
                {{ t("listingForm.remove") }}
              </button>
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.additionalImages") }}</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div
              v-for="(img, idx) in childData.listing_images"
              :key="img._uploadKey || idx"
              class="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3"
            >
              <img
                v-if="img.image || img._previewUrl"
                :src="img.image || img._previewUrl"
                class="w-full h-full object-cover"
                :alt="img.alt_text || ''"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <AppIcon name="image" :size="24" class="text-gray-300" />
              </div>

              <!-- Upload progress: opak dim overlay (sızıntıyı önler) + bar + % metni.
                   Yeni eklenen kartlar `_uploadKey`, mevcut satır güncellemeleri `row-${idx}`. -->
              <div
                v-if="uploads.states[img._uploadKey || `row-${idx}`]?.status === 'uploading'"
                class="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center gap-2 bg-black/85 rounded-xl"
              >
                <div class="w-3/4 max-w-[140px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                    :style="{
                      width:
                        Math.max(6, uploads.states[img._uploadKey || `row-${idx}`].progress) + '%',
                    }"
                  ></div>
                </div>
                <span class="text-[11px] text-white font-semibold">
                  {{ Math.round(uploads.states[img._uploadKey || `row-${idx}`].progress) }}%
                </span>
              </div>
              <Transition name="fade">
                <div
                  v-if="uploads.states[img._uploadKey || `row-${idx}`]?.status === 'success'"
                  class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85 rounded-xl"
                >
                  <div
                    class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-emerald-500 text-2xl font-bold shadow-xl"
                  >
                    ✓
                  </div>
                </div>
              </Transition>

              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
              >
                <label
                  class="cursor-pointer bg-white/20 rounded-lg p-1.5 hover:bg-white/30"
                  :title="t('listingForm.changeImage')"
                >
                  <AppIcon name="upload" :size="14" class="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="uploadImageRow(idx, $event)"
                  />
                </label>
                <button
                  class="bg-red-500/80 rounded-lg p-1.5 hover:bg-red-600"
                  :title="t('listingForm.remove')"
                  @click="removeImageRow(idx)"
                >
                  <AppIcon name="trash-2" :size="14" class="text-white" />
                </button>
              </div>
              <input
                v-model="img.alt_text"
                type="text"
                class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 border-0 outline-none placeholder-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                :placeholder="t('listingForm.altTextPlaceholder')"
              />
            </div>
            <!-- Ekle butonu — drop-target (drag-drop + multi-file). -->
            <label
              class="relative aspect-square rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
              :class="
                addImagesDropzone.isOver.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                  : 'border-gray-300 dark:border-white/15 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20'
              "
              @dragenter="addImagesDropzone.onDragEnter"
              @dragover="addImagesDropzone.onDragOver"
              @dragleave="addImagesDropzone.onDragLeave"
              @drop="addImagesDropzone.onDrop"
            >
              <!-- Per-file progress yeni eklenen kartlarda görünüyor (img._uploadKey);
                   placeholder her zaman aktif ve drop-target. -->
              <AppIcon
                :name="addImagesDropzone.isOver.value ? 'upload' : 'plus'"
                :size="20"
                :class="addImagesDropzone.isOver.value ? 'text-violet-500' : 'text-gray-400'"
              />
              <span
                class="text-xs"
                :class="
                  addImagesDropzone.isOver.value ? 'text-violet-600 font-medium' : 'text-gray-400'
                "
              >
                {{
                  addImagesDropzone.isOver.value
                    ? t("listingForm.drop")
                    : t("listingForm.addOrDragImage")
                }}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="addImageRow($event)"
              />
            </label>
          </div>
        </div>

        <div class="card">
          <label class="form-label">{{ t("listingForm.videoUrl") }}</label>
          <input v-model="form.video_url" type="url" class="form-input" placeholder="https://..." />
        </div>
      </div>

      <!-- ───── TAB: Özellikler ───── -->
      <div v-show="activeTab === 'specs'" class="space-y-4">
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="section-title mb-0">{{ t("listingForm.productAttributes") }}</h3>
            <LangToggle v-model="editLang" :filled="langFill" />
          </div>
          <ChildTable
            v-model="childData.attribute_values"
            :columns="specColumns"
            child-doctype="Listing Attribute Value"
            :add-label="t('listingForm.addAttribute')"
          />
        </div>

        <!-- v4: Sertifika yönetimi Sertifikalarım'a taşındı (Image #119 yönlendirme kartı) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="section-title flex items-center gap-2 mb-0">
              <AppIcon name="award" :size="16" class="text-emerald-500" />
              {{ t("listingForm.certifications") }}
            </h3>
            <span class="text-xs text-gray-400">{{
              t("listingForm.recordCount", { count: listingCertCount })
            }}</span>
          </div>
          <div
            class="border-2 border-dashed border-emerald-300 dark:border-emerald-800/40 rounded-lg p-5 text-center"
          >
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {{ t("listingForm.certManageHintPre") }}
              <strong>{{ t("listingForm.myCertifications") }}</strong>
              {{ t("listingForm.certManageHintPost") }}
            </p>
            <router-link
              to="/my-certifications#product"
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              {{ t("listingForm.goToMyCertifications") }}
              <AppIcon name="arrow-right" :size="14" />
            </router-link>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Varyantlar (Alibaba SKU Matrix) ───── -->
      <div v-show="activeTab === 'variants'" class="space-y-4">
        <div class="card space-y-4">
          <!-- Tekil ürün / Varyantlı seçimi (sıfır-bilgi: checkbox değil net seçim) -->
          <div class="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              class="flex-1 flex items-center gap-2 p-3 rounded-lg border text-left transition-colors"
              :class="
                !form.has_variants
                  ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20'
                  : 'border-gray-200 dark:border-white/10 hover:border-violet-200'
              "
              @click="setVariantMode(0)"
            >
              <AppIcon name="box" :size="16" class="text-violet-500 flex-shrink-0" />
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{
                t("listingForm.modeSingleProduct")
              }}</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center gap-2 p-3 rounded-lg border text-left transition-colors"
              :class="
                form.has_variants
                  ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20'
                  : 'border-gray-200 dark:border-white/10 hover:border-violet-200'
              "
              @click="setVariantMode(1)"
            >
              <AppIcon name="layers" :size="16" class="text-violet-500 flex-shrink-0" />
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{
                t("listingForm.modeVariantProduct")
              }}</span>
            </button>
          </div>

          <div v-if="form.has_variants">
            <!-- Giriş yöntemi: Sihirbaz (önerilen) / Manuel -->
            <div class="flex items-center gap-1 mb-4">
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                :class="
                  variantInputMode === 'wizard'
                    ? 'bg-violet-500 text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                "
                @click="variantInputMode = 'wizard'"
              >
                {{ t("listingForm.variantModeWizard") }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                :class="
                  variantInputMode === 'manual'
                    ? 'bg-violet-500 text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                "
                @click="variantInputMode = 'manual'"
              >
                {{ t("listingForm.variantModeManual") }}
              </button>
            </div>

            <!-- SİHİRBAZ: taksonomi özelliği seç → değerleri çip olarak işaretle -->
            <div
              v-if="variantInputMode === 'wizard'"
              class="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2"
            >
              <VariantWizard
                :key="wizardKey"
                :initial-axes="variantAxes"
                @apply="onWizardApply"
                @cancel="variantInputMode = 'manual'"
              />
            </div>

            <!-- MANUEL: serbest eksen tanımı (mevcut Alibaba matris arayüzü) -->
            <div
              v-else
              class="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 space-y-4"
            >
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                {{ t("listingForm.step1VariantAxes") }}
              </h4>

              <div
                v-for="(axis, ai) in variantAxes"
                :key="ai"
                class="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{
                      t("listingForm.axis", { n: ai + 1 })
                    }}</span>
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="axis.hasImage"
                        type="checkbox"
                        class="form-checkbox rounded text-violet-500 w-3 h-3"
                        @change="syncAxesConfig()"
                      />
                      <span class="text-[10px] text-gray-400">{{
                        t("listingForm.withImage")
                      }}</span>
                    </label>
                  </div>
                  <button
                    v-if="variantAxes.length > 1"
                    type="button"
                    class="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    @click="
                      variantAxes.splice(ai, 1);
                      syncAxesConfig();
                    "
                  >
                    <AppIcon name="trash-2" :size="12" />
                  </button>
                </div>
                <div class="grid grid-cols-[120px_1fr] gap-2">
                  <div>
                    <label class="text-[10px] text-gray-500 mb-0.5 block">{{
                      t("listingForm.axisName")
                    }}</label>
                    <input
                      v-model="axis.name"
                      type="text"
                      :placeholder="
                        ai === 0
                          ? t('listingForm.axisNamePlaceholder1')
                          : t('listingForm.axisNamePlaceholder2')
                      "
                      class="form-input py-1.5 text-sm"
                      @blur="syncAxesConfig()"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-gray-500 mb-0.5 block"
                      >{{ t("listingForm.values") }}
                      <span class="text-gray-400">{{
                        t("listingForm.commaSeparated")
                      }}</span></label
                    >
                    <input
                      v-model="axis.valuesStr"
                      type="text"
                      :placeholder="
                        ai === 0
                          ? t('listingForm.axisValuesPlaceholder1')
                          : t('listingForm.axisValuesPlaceholder2')
                      "
                      class="form-input py-1.5 text-sm"
                      @blur="syncAxesConfig()"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  @click="
                    variantAxes.push({ name: '', valuesStr: '', hasImage: false });
                    syncAxesConfig();
                  "
                >
                  <AppIcon name="plus" :size="12" />
                  {{ t("listingForm.addAxis") }}
                </button>
                <span class="text-[10px] text-gray-400">{{ t("listingForm.withImageHint") }}</span>
              </div>

              <button
                type="button"
                class="flex items-center gap-1.5 px-4 py-2 rounded-md bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
                @click="generateSkuMatrix()"
              >
                <AppIcon name="grid" :size="14" />
                {{ t("listingForm.generateMatrix", { count: matrixPreviewCount }) }}
              </button>
            </div>

            <!-- ADIM 2: SKU Matrisi (tablo veya grid) -->
            <div v-if="childData.variant_items.length > 0" class="mt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {{ t("listingForm.step2SkuMatrix", { count: childData.variant_items.length }) }}
                </h4>
                <span class="text-[11px] text-gray-400">{{
                  t("listingForm.enterStockPriceHint")
                }}</span>
              </div>

              <!-- Matrix Grid View (TAM 2 eksen varsa — grid; 3+ eksen → flat tablo aşağıda) -->
              <div
                v-if="variantAxis2Name && matrixAxis2Values.length > 0 && variantAxes.length <= 2"
                class="overflow-x-auto"
              >
                <table
                  class="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"
                >
                  <thead>
                    <tr class="bg-gray-50 dark:bg-white/3">
                      <th
                        class="px-3 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-white/10 w-36"
                      >
                        {{ variantAxis1Name || t("listingForm.axisFallback1") }} ↓ /
                        {{ variantAxis2Name }} →
                      </th>
                      <th
                        v-for="v2 in matrixAxis2Values"
                        :key="v2"
                        class="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-white/10 min-w-[100px]"
                      >
                        {{ v2 }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="v1 in matrixAxis1Values"
                      :key="v1"
                      class="border-b border-gray-100 dark:border-white/5"
                    >
                      <td
                        class="px-3 py-2 border-r border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2"
                      >
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                            :class="
                              isColorDefault(v1)
                                ? 'bg-amber-400 text-white'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-400 hover:bg-amber-200'
                            "
                            :title="
                              isColorDefault(v1)
                                ? t('listingForm.defaultColor')
                                : t('listingForm.makeDefault')
                            "
                            @click="setColorDefault(v1)"
                          >
                            <AppIcon name="star" :size="10" />
                          </button>
                          <div
                            class="w-8 h-8 rounded border border-gray-200 dark:border-white/10 overflow-hidden flex-shrink-0 bg-white"
                          >
                            <img
                              v-if="getSkuRow(v1, matrixAxis2Values[0])?.variant_image"
                              :src="getSkuRow(v1, matrixAxis2Values[0])?.variant_image"
                              class="w-full h-full object-cover"
                            />
                          </div>
                          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200">{{
                            v1
                          }}</span>
                        </div>
                      </td>
                      <td
                        v-for="v2 in matrixAxis2Values"
                        :key="v2"
                        class="px-2 py-1.5 border-r border-gray-100 dark:border-white/5 text-center"
                        :class="
                          getSkuRow(v1, v2)?.variant_stock == 0
                            ? 'bg-red-50/50 dark:bg-red-950/10'
                            : ''
                        "
                      >
                        <template v-if="getSkuRow(v1, v2)">
                          <input
                            v-model.number="getSkuRow(v1, v2).variant_stock"
                            type="number"
                            :placeholder="t('listingForm.stock')"
                            class="w-full text-center bg-transparent border-0 border-b border-gray-200 dark:border-white/10 py-0.5 text-xs font-bold focus:outline-none focus:border-violet-400"
                            :class="
                              getSkuRow(v1, v2).variant_stock == 0
                                ? 'text-red-500'
                                : 'text-gray-800 dark:text-gray-200'
                            "
                          />
                          <input
                            v-model.number="getSkuRow(v1, v2).variant_price"
                            type="number"
                            :placeholder="t('listingForm.price')"
                            class="w-full text-center bg-transparent border-0 py-0.5 text-[10px] text-gray-400 focus:outline-none focus:text-gray-600"
                          />
                        </template>
                        <span v-else class="text-[10px] text-gray-300">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p class="text-[10px] text-gray-400 mt-2">
                  <AppIcon name="circle" :size="10" class="text-red-500" />
                  {{ t("listingForm.redCellsHint") }}
                </p>
              </div>

              <!-- Flat List View (tek eksen, veya 3+ eksen — tüm kolonlar) -->
              <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-white/10 text-left">
                      <th
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs w-8"
                      >
                        #
                      </th>
                      <th
                        v-for="axis in variantAxes"
                        :key="axis.name"
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs"
                      >
                        {{ axis.name || t("listingForm.axisFallback") }}
                      </th>
                      <th
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs text-center w-10"
                      >
                        <AppIcon name="star" :size="14" />
                      </th>
                      <th
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs w-16"
                      >
                        {{ t("listingForm.image") }}
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        {{ t("listingForm.price") }}
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        {{ t("listingForm.stock") }}
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        {{ t("listingForm.sku") }}
                      </th>
                      <th class="pb-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, idx) in childData.variant_items"
                      :key="idx"
                      class="border-b border-gray-100 dark:border-white/5"
                      :class="row.variant_stock == 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''"
                    >
                      <td class="py-1.5 pr-2 text-gray-400 text-[11px]">{{ idx + 1 }}</td>
                      <!-- Eksen değerleri -->
                      <td class="py-1.5 pr-2 text-xs font-medium">{{ row.attribute_value }}</td>
                      <td v-if="variantAxes.length >= 2" class="py-1.5 pr-2 text-xs">
                        {{ row.attribute_value_2 }}
                      </td>
                      <td v-if="variantAxes.length >= 3" class="py-1.5 pr-2 text-xs">
                        {{ getAxisValue(row, 2) }}
                      </td>
                      <td v-if="variantAxes.length >= 4" class="py-1.5 pr-2 text-xs">
                        {{ getAxisValue(row, 3) }}
                      </td>
                      <!-- Varsayılan -->
                      <td class="py-1.5 pr-2 text-center">
                        <input
                          type="checkbox"
                          :checked="!!row.is_default"
                          class="form-checkbox rounded text-amber-500 w-3.5 h-3.5"
                          @change="setVariantDefault(idx, $event.target.checked)"
                        />
                      </td>
                      <!-- Görsel -->
                      <td class="py-1.5 pr-2">
                        <label
                          class="relative flex items-center justify-center w-8 h-8 rounded border border-dashed border-gray-300 dark:border-white/15 cursor-pointer overflow-hidden"
                        >
                          <img
                            v-if="row.variant_image"
                            :src="row.variant_image"
                            class="absolute inset-0 w-full h-full object-cover"
                          />
                          <AppIcon v-else name="image" :size="12" class="text-gray-300" />
                          <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="uploadVariantImage(idx, $event)"
                          />
                          <!-- Variant thumb upload (küçük — opak dim + ince bar, % yok) -->
                          <div
                            v-if="uploads.states[`variant-${idx}`]?.status === 'uploading'"
                            class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/85 rounded"
                          >
                            <div class="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div
                                class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                                :style="{
                                  width:
                                    Math.max(6, uploads.states[`variant-${idx}`].progress) + '%',
                                }"
                              ></div>
                            </div>
                          </div>
                          <Transition name="fade">
                            <div
                              v-if="uploads.states[`variant-${idx}`]?.status === 'success'"
                              class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85 rounded"
                            >
                              <div
                                class="w-6 h-6 rounded-full bg-white flex items-center justify-center text-emerald-500 text-xs font-bold shadow-xl"
                              >
                                ✓
                              </div>
                            </div>
                          </Transition>
                        </label>
                      </td>
                      <!-- Fiyat -->
                      <td class="py-1.5 pr-2">
                        <input
                          v-model.number="row.variant_price"
                          type="number"
                          placeholder="—"
                          class="form-input py-1 text-xs w-20"
                        />
                      </td>
                      <!-- Stok -->
                      <td class="py-1.5 pr-2">
                        <input
                          v-model.number="row.variant_stock"
                          type="number"
                          placeholder="0"
                          class="form-input py-1 text-xs w-16"
                          :class="row.variant_stock == 0 ? 'text-red-500 border-red-300' : ''"
                        />
                      </td>
                      <!-- SKU -->
                      <td class="py-1.5 pr-2">
                        <input
                          v-model="row.variant_sku"
                          type="text"
                          :placeholder="t('listingForm.sku')"
                          class="form-input py-1 text-xs w-24"
                        />
                      </td>
                      <td class="py-1.5">
                        <button
                          class="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                          @click="childData.variant_items.splice(idx, 1)"
                        >
                          <AppIcon name="trash-2" :size="12" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Görselli eksen görselleri + galeri -->
              <div
                v-for="imgAxis in imageAxes"
                :key="imgAxis.name"
                class="mt-4 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2"
              >
                <h4 class="text-xs font-bold text-gray-500 mb-2">
                  {{ t("listingForm.axisImagesAndGallery", { axis: imgAxis.name }) }}
                </h4>
                <div class="space-y-3">
                  <div v-for="v1 in imgAxis.values" :key="v1" class="flex items-start gap-3">
                    <label
                      class="relative flex items-center justify-center w-14 h-14 rounded-lg border border-dashed transition-colors cursor-pointer overflow-hidden group flex-shrink-0"
                      :class="
                        getColorThumbDropzone(v1).isOver.value
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                          : 'border-gray-300 dark:border-white/15 hover:border-violet-400'
                      "
                      @dragenter="getColorThumbDropzone(v1).onDragEnter"
                      @dragover="getColorThumbDropzone(v1).onDragOver"
                      @dragleave="getColorThumbDropzone(v1).onDragLeave"
                      @drop="getColorThumbDropzone(v1).onDrop"
                    >
                      <img
                        v-if="getColorImage(v1)"
                        :src="getColorImage(v1)"
                        class="absolute inset-0 w-full h-full object-cover rounded-lg"
                      />
                      <AppIcon v-else name="image" :size="16" class="text-gray-300" />
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="uploadColorImage(v1, $event)"
                      />
                      <!-- Color thumb upload (küçük 14×14 — opak dim + ince bar, % yok) -->
                      <div
                        v-if="uploads.states[`color-${v1}`]?.status === 'uploading'"
                        class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/85 rounded-lg"
                      >
                        <div class="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div
                            class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                            :style="{
                              width: Math.max(6, uploads.states[`color-${v1}`].progress) + '%',
                            }"
                          ></div>
                        </div>
                      </div>
                      <Transition name="fade">
                        <div
                          v-if="uploads.states[`color-${v1}`]?.status === 'success'"
                          class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85 rounded-lg"
                        >
                          <div
                            class="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-500 text-lg font-bold shadow-xl"
                          >
                            ✓
                          </div>
                        </div>
                      </Transition>
                    </label>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{
                          v1
                        }}</span>
                        <button
                          type="button"
                          class="text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                          @click="toggleColorGallery(v1)"
                        >
                          {{
                            t("listingForm.extraImagesCount", { count: getColorGalleryCount(v1) })
                          }}
                        </button>
                      </div>
                      <div v-if="expandedColorGallery === v1" class="flex flex-wrap gap-2 mt-1">
                        <div
                          v-for="(url, gi) in getColorGalleryUrls(v1)"
                          :key="`url-${gi}`"
                          class="relative group w-32 h-32 shrink-0 rounded overflow-hidden border border-gray-200 dark:border-white/10"
                          style="flex: 0 0 128px; width: 128px; height: 128px"
                        >
                          <img :src="url" class="w-full h-full object-cover" />
                          <button
                            class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            @click="removeColorGalleryImage(v1, gi)"
                          >
                            <AppIcon name="x" :size="10" />
                          </button>
                        </div>
                        <!-- Pending uploads — drop edilir edilmez kart, RFQ pattern:
                             ortalanmış bar + % + tamamlanınca ortalanmış ✓ rozet. -->
                        <div
                          v-for="entry in pendingGalleryUploads[v1] || []"
                          :key="entry._key"
                          class="relative w-32 h-32 shrink-0 rounded overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                          style="flex: 0 0 128px; width: 128px; height: 128px"
                        >
                          <img
                            v-if="entry._previewUrl"
                            :src="entry._previewUrl"
                            class="w-full h-full object-cover"
                          />
                          <div v-else class="w-full h-full flex items-center justify-center">
                            <AppIcon name="image" :size="16" class="text-gray-300" />
                          </div>
                          <!-- Uploading: opak dim + ortalanmış bar + % metni -->
                          <div
                            v-if="uploads.states[entry._key]?.status === 'uploading'"
                            class="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center gap-1.5 bg-black/85"
                          >
                            <div class="w-3/4 h-1 bg-white/25 rounded-full overflow-hidden">
                              <div
                                class="h-full bg-white rounded-full transition-[width] duration-300 ease-out"
                                :style="{
                                  width: Math.max(6, uploads.states[entry._key].progress) + '%',
                                }"
                              ></div>
                            </div>
                            <span class="text-[10px] text-white font-semibold">
                              {{ Math.round(uploads.states[entry._key].progress) }}%
                            </span>
                          </div>
                          <!-- Success: opak emerald + ortalanmış ✓ rozet -->
                          <Transition name="fade">
                            <div
                              v-if="uploads.states[entry._key]?.status === 'success'"
                              class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-500/85"
                            >
                              <div
                                class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-500 text-lg font-bold shadow-lg"
                              >
                                ✓
                              </div>
                            </div>
                          </Transition>
                        </div>
                        <!-- Drop-target placeholder (per-file bar artık kartlarda) -->
                        <label
                          class="relative w-32 h-32 shrink-0 rounded border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
                          style="flex: 0 0 128px; width: 128px; height: 128px"
                          :class="
                            getColorGalleryDropzone(v1).isOver.value
                              ? 'border-violet-600 bg-violet-100 dark:bg-violet-950/40'
                              : 'border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20'
                          "
                          @dragenter="getColorGalleryDropzone(v1).onDragEnter"
                          @dragover="getColorGalleryDropzone(v1).onDragOver"
                          @dragleave="getColorGalleryDropzone(v1).onDragLeave"
                          @drop="getColorGalleryDropzone(v1).onDrop"
                        >
                          <AppIcon
                            :name="
                              getColorGalleryDropzone(v1).isOver.value ? 'upload' : 'image-plus'
                            "
                            :size="16"
                            class="text-violet-500"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            class="hidden"
                            @change="uploadColorGalleryImages(v1, $event)"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <p class="text-[10px] text-gray-400 mt-2">
                  {{ t("listingForm.galleryBuildHint") }}
                </p>
              </div>

              <!-- Varyant çevirileri — kaynak eksen adı/değeri → dil-bazlı DISPLAY.
                   Sepet/SKU eşleşmesi kaynak değere bağlı; bu yalnızca gösterim. -->
              <div
                class="mt-4 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {{ t("listingForm.variantTranslations") }}
                  </h4>
                  <LangToggle v-model="editLang" :filled="langFill" />
                </div>

                <p v-if="editLang === form.content_default_lang" class="text-[11px] text-gray-400">
                  {{ t("listingForm.variantTranslationsSourceHint") }}
                </p>

                <template v-else>
                  <div v-if="variantUniqueTypes.length" class="space-y-2">
                    <span
                      class="text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                      >{{ t("listingForm.axisNames") }}</span
                    >
                    <div
                      v-for="name in variantUniqueTypes"
                      :key="`vt-${name}`"
                      class="grid grid-cols-[1fr_1fr] gap-2 items-center"
                    >
                      <span class="text-xs text-gray-500 truncate">{{ name }}</span>
                      <input
                        :value="variantTypeXlat[`${editLang}::${name}`] || ''"
                        type="text"
                        class="form-input py-1.5 text-sm"
                        :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
                        :placeholder="name"
                        @input="variantTypeXlat[`${editLang}::${name}`] = $event.target.value"
                      />
                    </div>
                  </div>

                  <div v-if="variantUniqueValues.length" class="space-y-2">
                    <span
                      class="text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                      >{{ t("listingForm.values") }}</span
                    >
                    <div
                      v-for="val in variantUniqueValues"
                      :key="`vv-${val}`"
                      class="grid grid-cols-[1fr_1fr] gap-2 items-center"
                    >
                      <span class="text-xs text-gray-500 truncate">{{ val }}</span>
                      <input
                        :value="variantValueXlat[`${editLang}::${val}`] || ''"
                        type="text"
                        class="form-input py-1.5 text-sm"
                        :dir="editLang === 'ar' ? 'rtl' : 'ltr'"
                        :placeholder="val"
                        @input="variantValueXlat[`${editLang}::${val}`] = $event.target.value"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.customizationOptions") }}</h3>
          <ChildTable
            v-model="childData.customization_options"
            :columns="[
              {
                key: 'option_name',
                label: t('listingForm.optionName'),
                type: 'text',
                reqd: true,
                placeholder: t('listingForm.optionNamePlaceholder'),
              },
              { key: 'description', label: t('listingForm.descriptionCol'), type: 'text' },
              { key: 'additional_cost', label: t('listingForm.additionalCost'), type: 'number' },
              { key: 'min_qty', label: t('listingForm.minQty'), type: 'number' },
            ]"
            child-doctype="Listing Customization Option"
            :add-label="t('listingForm.addOption')"
          />
        </div>
      </div>

      <!-- ───── TAB: Kargo ───── -->
      <div v-show="activeTab === 'shipping'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.shippingInfo") }}</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="flex items-center gap-2 pt-1 lg:col-span-2">
              <input
                id="is_free_shipping"
                v-model="form.is_free_shipping"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <label
                for="is_free_shipping"
                class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >{{ t("listingForm.freeShipping") }}</label
              >
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.shippingWeightKg") }}</label>
              <input
                v-model.number="form.shipping_weight"
                type="number"
                step="0.001"
                min="0"
                class="form-input"
                placeholder="0.000"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.handlingDays") }}</label>
              <input
                v-model.number="form.handling_days"
                type="number"
                min="0"
                class="form-input"
                placeholder="1"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.shipsFromCountry") }}</label>
              <LinkInput
                v-model="form.ships_from_country"
                doctype="Country"
                :placeholder="t('listingForm.searchCountry')"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.shipsFromCity") }}</label>
              <input
                v-model="form.ships_from_city"
                type="text"
                class="form-input"
                :placeholder="t('listingForm.cityPlaceholder')"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.countryOfOrigin") }}</label>
              <LinkInput
                v-model="form.country_of_origin"
                doctype="Country"
                :placeholder="t('listingForm.searchCountry')"
              />
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.packageDimensions") }}</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label">{{ t("listingForm.packageType") }}</label>
              <select v-model="form.package_type" class="form-input">
                <option value="">{{ t("listingForm.select") }}</option>
                <option value="Karton Kutu">{{ t("listingForm.packageTypeCardboardBox") }}</option>
                <option value="Poşet">{{ t("listingForm.packageTypePouch") }}</option>
                <option value="Ahşap Kasa">{{ t("listingForm.packageTypeWoodenCrate") }}</option>
                <option value="Palet">{{ t("listingForm.packageTypePallet") }}</option>
                <option value="File">{{ t("listingForm.packageTypeNet") }}</option>
                <option value="Torba">{{ t("listingForm.packageTypeBag") }}</option>
                <option value="Diğer">{{ t("listingForm.packageTypeOther") }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.unitsPerPackage") }}</label>
              <input
                v-model.number="form.units_per_package"
                type="number"
                min="0"
                class="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.lengthCm") }}</label>
              <input
                v-model.number="form.package_length"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.widthCm") }}</label>
              <input
                v-model.number="form.package_width"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.heightCm") }}</label>
              <input
                v-model.number="form.package_height"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.weightKg") }}</label>
              <input
                v-model.number="form.package_weight"
                type="number"
                step="0.001"
                min="0"
                class="form-input"
                placeholder="0.000"
              />
            </div>
          </div>
          <h4
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-2"
          >
            {{ t("listingForm.cartonDimensions") }}
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label">{{ t("listingForm.lengthCm") }}</label>
              <input
                v-model.number="form.carton_length"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.widthCm") }}</label>
              <input
                v-model.number="form.carton_width"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.heightCm") }}</label>
              <input
                v-model.number="form.carton_height"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="form-label">{{ t("listingForm.grossWeightKg") }}</label>
              <input
                v-model.number="form.carton_gross_weight"
                type="number"
                step="0.001"
                min="0"
                class="form-input"
                placeholder="0.000"
              />
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.leadTimes") }}</h3>
          <ChildTable
            v-model="childData.lead_time_ranges"
            :columns="[
              { key: 'min_qty', label: t('listingForm.minQty'), type: 'number', reqd: true },
              { key: 'max_qty', label: t('listingForm.maxQty'), type: 'number' },
              { key: 'lead_days', label: t('listingForm.days'), type: 'number', reqd: true },
            ]"
            child-doctype="Listing Lead Time Range"
            :add-label="t('listingForm.addLeadTime')"
          />
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">{{ t("listingForm.shippingMethods") }}</h3>
          <ChildTable
            v-model="childData.shipping_methods"
            :columns="[
              {
                key: 'shipping_method_name',
                label: t('listingForm.methodName'),
                type: 'text',
                reqd: true,
              },
              { key: 'cost', label: t('listingForm.cost'), type: 'number', reqd: true },
              { key: 'min_days', label: t('listingForm.minDays'), type: 'number' },
              { key: 'max_days', label: t('listingForm.maxDays'), type: 'number' },
            ]"
            child-doctype="Shipping Method Item"
            :add-label="t('listingForm.addMethod')"
          />
        </div>
      </div>

      <!-- ───── TAB: İstatistikler ───── -->
      <div v-show="activeTab === 'statistics'" class="space-y-5">
        <div v-if="statsLoading" class="card text-center py-12">
          <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
          <p class="text-sm text-gray-400 mt-3">{{ t("listingForm.statsLoading") }}</p>
        </div>
        <template v-else-if="statsData">
          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                {{ t("listingForm.views") }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatK(statsData.summary.views) }}
              </p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                {{ t("listingForm.orders") }}
              </p>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatK(statsData.summary.orders) }}
              </p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                {{ t("listingForm.revenue") }}
              </p>
              <p class="text-xl font-bold text-violet-600 dark:text-violet-400">
                {{ formatCurrency(statsData.summary.revenue) }}
              </p>
              <p class="text-[10px] text-gray-400">{{ statsData.summary.currency }}</p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                {{ t("listingForm.conversion") }}
              </p>
              <p
                class="text-2xl font-bold"
                :class="
                  statsData.summary.conversionRate > 2 ? 'text-emerald-600' : 'text-amber-500'
                "
              >
                %{{ statsData.summary.conversionRate }}
              </p>
            </div>
          </div>

          <!-- Secondary KPI Row -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card !p-3 flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center"
              >
                <AppIcon name="star" :size="16" class="text-amber-500" />
              </div>
              <div>
                <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {{ statsData.summary.avgRating }}
                </p>
                <p class="text-[10px] text-gray-400">
                  {{ t("listingForm.reviewsCount", { count: statsData.summary.reviewCount }) }}
                </p>
              </div>
            </div>
            <div class="card !p-3 flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center"
              >
                <AppIcon name="heart" :size="16" class="text-rose-500" />
              </div>
              <div>
                <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {{ statsData.summary.wishlist }}
                </p>
                <p class="text-[10px] text-gray-400">{{ t("listingForm.inWishlist") }}</p>
              </div>
            </div>
            <div class="card !p-3 flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center"
              >
                <AppIcon name="package" :size="16" class="text-blue-500" />
              </div>
              <div>
                <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {{ statsData.summary.stockQty }}
                </p>
                <p class="text-[10px] text-gray-400">{{ t("listingForm.stock") }}</p>
              </div>
            </div>
            <div class="card !p-3 flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center"
              >
                <AppIcon name="trending-up" :size="16" class="text-violet-500" />
              </div>
              <div>
                <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {{ formatK(statsData.summary.orders) }}
                </p>
                <p class="text-[10px] text-gray-400">{{ t("listingForm.sales30Days") }}</p>
              </div>
            </div>
          </div>

          <!-- Views + Orders Trend Chart -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3
                class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
              >
                <AppIcon name="trending-up" :size="14" class="text-violet-500" />
                {{ t("listingForm.viewsOrdersTrend") }}
              </h3>
              <span class="text-[11px] text-gray-400">{{ t("listingForm.last30Days") }}</span>
            </div>
            <div class="relative" style="height: 260px">
              <canvas ref="trendChartCanvas"></canvas>
            </div>
          </div>

          <!-- Revenue Chart -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3
                class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
              >
                <AppIcon name="bar-chart-2" :size="14" class="text-emerald-500" />
                {{ t("listingForm.revenueTrend") }}
              </h3>
              <span class="text-[11px] text-gray-400">{{ t("listingForm.last30Days") }}</span>
            </div>
            <div class="relative" style="height: 220px">
              <canvas ref="revenueChartCanvas"></canvas>
            </div>
          </div>

          <!-- Top Variants -->
          <div v-if="statsData.topVariants && statsData.topVariants.length > 0" class="card">
            <h3
              class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
            >
              <AppIcon name="git-branch" :size="14" class="text-blue-500" />
              {{ t("listingForm.variantPerformance") }}
            </h3>
            <div class="space-y-2">
              <div
                v-for="(v, idx) in statsData.topVariants"
                :key="idx"
                class="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/3"
              >
                <span
                  class="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[11px] font-bold text-violet-600"
                  >{{ idx + 1 }}</span
                >
                <span
                  class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
                  >{{ v.label }}</span
                >
                <span class="text-xs text-gray-500"
                  >{{ v.orders || v.stock || 0 }}
                  {{ v.orders ? t("listingForm.ordersLower") : t("listingForm.stockLower") }}</span
                >
                <span v-if="v.revenue" class="text-xs font-medium text-emerald-600">{{
                  formatCurrency(v.revenue)
                }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="card text-center py-12 text-gray-400">
          <AppIcon name="bar-chart-2" :size="28" class="mx-auto mb-2 opacity-50" />
          <p>{{ t("listingForm.statsLoadFailed") }}</p>
        </div>
      </div>

      <!-- ───── TAB: SEO ───── -->
      <div v-show="activeTab === 'seo'">
        <div v-if="isNew" class="card text-center py-12 text-sm text-gray-500">
          {{ t("listingForm.seoSaveFirstHint") }}
        </div>
        <SeoTab
          v-else
          doctype="Listing"
          :record-name="docName"
          :fallback-title="form.title"
          :fallback-description="form.description"
        />
      </div>

      <!-- ───── TAB: Sistem ───── -->
      <div v-show="activeTab === 'system'" class="card space-y-4">
        <h3 class="section-title">
          {{ t("listingForm.system") }}
          <span class="font-normal text-xs text-gray-400">{{ t("listingForm.readOnly") }}</span>
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label">{{ t("listingForm.erpnextItem") }}</label>
            <input
              :value="form.erpnext_item || '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.publishedAt") }}</label>
            <input
              :value="form.published_at ? new Date(form.published_at).toLocaleString('tr-TR') : '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.createdAt") }}</label>
            <input
              :value="form.creation ? new Date(form.creation).toLocaleString('tr-TR') : '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">{{ t("listingForm.lastModified") }}</label>
            <input
              :value="form.modified ? new Date(form.modified).toLocaleString('tr-TR') : '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Platform Kategori Seçici Modal ───────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="categoryPicker.show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="categoryPicker.show = false"
    >
      <div
        class="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <!-- Modal başlık -->
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/8 flex-shrink-0"
        >
          <div class="flex items-center gap-2">
            <AppIcon name="folder-tree" :size="16" class="text-violet-500" />
            <h2 class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ t("listingForm.selectPlatformCategory") }}
            </h2>
          </div>
          <button
            class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            @click="categoryPicker.show = false"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <!-- Breadcrumb navigasyon -->
        <div
          class="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100 dark:border-white/5 flex-shrink-0 overflow-x-auto"
        >
          <button
            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
            :class="
              categoryPicker.path.length === 0
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
            "
            @click="categoryPickerGoTo(-1)"
          >
            <AppIcon name="home" :size="11" />
            <span>{{ t("listingForm.root") }}</span>
          </button>
          <template v-for="(crumb, idx) in categoryPicker.path" :key="crumb.name">
            <AppIcon
              name="chevron-right"
              :size="11"
              class="text-gray-300 dark:text-gray-600 flex-shrink-0"
            />
            <button
              class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 max-w-[120px]"
              :class="
                idx === categoryPicker.path.length - 1
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
              "
              @click="categoryPickerGoTo(idx)"
            >
              <span class="truncate">{{ crumb.category_name }}</span>
            </button>
          </template>
        </div>

        <!-- Search bar -->
        <div class="px-5 py-2.5 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
          <div class="relative">
            <AppIcon
              name="search"
              :size="13"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              v-model="categoryPicker.search"
              type="text"
              :placeholder="t('listingForm.categorySearchPlaceholder')"
              class="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#13131a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              @input="onCategorySearchInput"
            />
            <button
              v-if="categoryPicker.search"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              :title="t('listingForm.clearSearch')"
              @click="clearCategorySearch"
            >
              <AppIcon name="x" :size="13" />
            </button>
          </div>
          <p
            v-if="categoryPicker.search && categoryPicker.search.length < 2"
            class="text-[10px] text-gray-400 mt-1.5 px-1"
          >
            {{ t("listingForm.minTwoChars") }}
          </p>
        </div>

        <!-- Kategori listesi -->
        <div class="flex-1 overflow-y-auto py-2">
          <!-- Yükleniyor (tree veya search) -->
          <div
            v-if="categoryPicker.loading || categoryPicker.searching"
            class="flex items-center justify-center py-10 gap-2 text-gray-400"
          >
            <AppIcon name="loader" :size="18" class="animate-spin text-violet-500" />
            <span class="text-sm">{{
              categoryPicker.searching ? t("listingForm.searching") : t("listingForm.loading")
            }}</span>
          </div>

          <!-- ╭── Search aktif (>=2 karakter): flat sonuç listesi ──╮ -->
          <template v-else-if="categoryPicker.search && categoryPicker.search.trim().length >= 2">
            <!-- Sonuç yok -->
            <div
              v-if="categoryPicker.searchResults.length === 0"
              class="flex flex-col items-center justify-center py-10 gap-2 text-gray-400"
            >
              <AppIcon name="search-x" :size="28" />
              <p class="text-sm">
                {{ t("listingForm.noResultsFor", { query: categoryPicker.search }) }}
              </p>
            </div>
            <!-- Sonuçlar (path bilgisi ile) -->
            <div v-else class="px-2 space-y-0.5">
              <div
                v-for="cat in categoryPicker.searchResults"
                :key="cat.name"
                class="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
                @click="confirmCategory(cat)"
              >
                <div
                  class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-900/40"
                >
                  <AppIcon name="tag" :size="14" class="text-violet-600 dark:text-violet-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {{ cat.category_name }}
                  </p>
                  <p v-if="cat.path" class="text-[10px] text-gray-400 truncate" :title="cat.path">
                    {{ cat.path }}
                  </p>
                </div>
                <button
                  type="button"
                  class="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all flex-shrink-0"
                  @click.stop="confirmCategory(cat)"
                >
                  {{ t("listingForm.selectButton") }}
                </button>
              </div>
            </div>
          </template>

          <!-- ╰── Search yokken: normal tree navigasyonu ──╯ -->
          <!-- Boş -->
          <div
            v-else-if="categoryPicker.items.length === 0"
            class="flex flex-col items-center justify-center py-10 gap-2 text-gray-400"
          >
            <AppIcon name="folder-open" :size="28" />
            <p class="text-sm">{{ t("listingForm.noCategoryAtLevel") }}</p>
          </div>

          <!-- Liste -->
          <div v-else class="px-2 space-y-0.5">
            <div
              v-for="cat in categoryPicker.items"
              :key="cat.name"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
              @click="selectCategoryItem(cat)"
            >
              <!-- İkon -->
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="
                  cat.child_count > 0
                    ? 'bg-violet-100 dark:bg-violet-900/40'
                    : 'bg-gray-100 dark:bg-white/8'
                "
              >
                <AppIcon
                  :name="cat.child_count > 0 ? 'folder' : 'tag'"
                  :size="14"
                  :class="
                    cat.child_count > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'
                  "
                />
              </div>

              <!-- İsim ve alt sayı -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {{ cat.category_name }}
                </p>
                <p v-if="cat.child_count > 0" class="text-[10px] text-gray-400">
                  {{ t("listingForm.subcategoriesCount", { count: cat.child_count }) }}
                </p>
              </div>

              <!-- Aksiyon -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <!-- Yaprak → Seç butonu -->
                <button
                  v-if="cat.child_count === 0"
                  type="button"
                  class="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  @click.stop="confirmCategory(cat)"
                >
                  {{ t("listingForm.selectButton") }}
                </button>
                <!-- Alt kategori varsa hem seç hem drill-down ok -->
                <template v-else>
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg text-[11px] font-semibold border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all"
                    @click.stop="confirmCategory(cat)"
                  >
                    {{ t("listingForm.selectButton") }}
                  </button>
                  <div
                    class="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-violet-500 transition-colors"
                  >
                    <AppIcon name="chevron-right" :size="16" />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal alt -->
        <div
          class="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-white/8 flex-shrink-0"
        >
          <button
            type="button"
            class="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
            @click="
              clearProductCategory();
              categoryPicker.show = false;
            "
          >
            <AppIcon name="trash-2" :size="12" />
            {{ t("listingForm.clearSelection") }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors"
            @click="categoryPicker.show = false"
          >
            {{ t("listingForm.close") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Completeness Breakdown Modal -->
  <Teleport to="body">
    <div
      v-if="showCompletenessBreakdown"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showCompletenessBreakdown = false"
    >
      <div class="bg-white dark:bg-[#1a1a25] rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">
            {{ t("listingForm.completenessDetail") }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600"
            @click="showCompletenessBreakdown = false"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>
        <div v-if="completenessBreakdown" class="space-y-3">
          <div
            v-for="(cat, key) in completenessBreakdown.categories"
            :key="key"
            class="flex items-center gap-3"
          >
            <span class="text-xs text-gray-500 w-28 shrink-0">{{ cat.label }}</span>
            <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="
                  cat.pct >= 80 ? 'bg-green-500' : cat.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                "
                :style="{ width: cat.pct + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-mono text-gray-500 w-12 text-right"
              >{{ cat.score }}/{{ cat.max }}</span
            >
          </div>
        </div>
        <div
          v-if="completenessBreakdown?.missing_fields?.length"
          class="mt-4 pt-3 border-t border-gray-100 dark:border-white/8"
        >
          <p class="text-[10px] text-gray-400 mb-2">{{ t("listingForm.missingFields") }}</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="f in completenessBreakdown.missing_fields"
              :key="f"
              class="text-[10px] px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full"
            >
              {{ f }}
            </span>
          </div>
        </div>
        <button
          class="mt-5 w-full hdr-btn-outlined text-xs"
          @click="showCompletenessBreakdown = false"
        >
          {{ t("listingForm.close") }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgressMap } from "@/composables/useImageUploadProgressMap";
  import { useDropzone } from "@/composables/useDropzone";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import ChildTable from "@/components/common/ChildTable.vue";
  import VariantWizard from "@/components/seller/VariantWizard.vue";
  import SeoTab from "@/components/seo/SeoTab.vue";
  import { useSeoEditorStore } from "@/stores/seoEditor";
  import LangToggle from "@/components/seo/LangToggle.vue";
  import { CONTENT_LANGS } from "@/composables/useLangFields";
  import { usePageTour } from "@/composables/usePageTour";

  // tradehub-upload-ui pattern — 6 upload yeri için ortak key-bazlı progress
  // Key sistematiği:
  //   'primary'          → ana resim
  //   'row-new'          → yeni galeri satırı
  //   'row-<idx>'        → galeri satırı değişti
  //   'variant-<idx>'    → varyant öğesi
  //   'color-<value>'    → renk varyantı tek resim
  //   'gallery-<value>-<i>' → renk galeri çoklu
  const uploads = useImageUploadProgressMap();

  const route = useRoute();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const auth = useAuthStore();
  const seoStore = useSeoEditorStore();

  // Sayfa-içi onboarding: sekmeler → başlık (dil-bazlı) → kaydet.
  usePageTour("listing-form", () => [
    {
      target: '[data-tour="lfv-tabs"]',
      title: t("tourSteps.page.lfvTabs_t"),
      desc: t("tourSteps.page.lfvTabs_d"),
    },
    {
      target: '[data-tour="lfv-title"]',
      title: t("tourSteps.page.lfvTitle_t"),
      desc: t("tourSteps.page.lfvTitle_d"),
    },
    {
      target: '[data-tour="lfv-save"]',
      title: t("tourSteps.page.lfvSave_t"),
      desc: t("tourSteps.page.lfvSave_d"),
    },
  ]);

  // i18n: içerik alanlarını (başlık/açıklama vb.) dil-bazlı düzenleme.
  const editLang = ref("tr");
  const langKey = (base) => `${base}_${editLang.value}`;

  // ── Çeviri UX (hafif): dolu/eksik göstergesi + kaynaktan kopyala + bayatlama ──
  // Ana çevrilebilir metin alanları (form-level dil sekmesiyle düzenlenir).
  const TRANSLATABLE_TEXT = ["title", "short_description", "description", "selling_point"];
  const srcSnapshot = ref({});

  // LangToggle dolu/eksik noktası: bir dilde başlık (zorunlu birincil alan) doluysa "dolu".
  const langFill = computed(() => {
    const out = {};
    for (const lng of CONTENT_LANGS) out[lng] = !!(form[`title_${lng}`] || "").trim();
    return out;
  });

  const srcFieldKey = (base) => `${base}_${form.content_default_lang || "tr"}`;
  const isActiveSource = () => editLang.value === (form.content_default_lang || "tr");
  const fieldCanCopy = (base) =>
    !isActiveSource() &&
    !(form[langKey(base)] || "").trim() &&
    !!(form[srcFieldKey(base)] || "").trim();
  const copyFieldFromSource = (base) => {
    form[langKey(base)] = form[srcFieldKey(base)];
  };
  // Kaynak (varsayılan dil) yüklemeden beri değiştiyse, aktif dildeki dolu alan bayat.
  const fieldStale = (base) =>
    !isActiveSource() &&
    !!(form[langKey(base)] || "").trim() &&
    (form[srcFieldKey(base)] || "").trim() !== (srcSnapshot.value[base] || "").trim();
  function snapshotSource() {
    const snap = {};
    for (const base of TRANSLATABLE_TEXT) snap[base] = form[srcFieldKey(base)] || "";
    srcSnapshot.value = snap;
  }

  // Teknik özellikler (specs) grid'i — etiket/değer aktif dile bağlanır
  // (attribute_group çevrilmez). Zorunluluk yalnızca varsayılan dilde.
  const specColumns = computed(() => [
    {
      key: `attribute_label_${editLang.value}`,
      label: t("listingForm.attributeName"),
      type: "text",
      reqd: editLang.value === form.content_default_lang,
      placeholder: t("listingForm.attributeNamePlaceholder"),
    },
    {
      key: `attribute_value_${editLang.value}`,
      label: t("listingForm.value"),
      type: "text",
      reqd: editLang.value === form.content_default_lang,
      placeholder: t("listingForm.attributeValuePlaceholder"),
    },
    {
      key: "attribute_group",
      label: t("listingForm.group"),
      type: "text",
      placeholder: t("listingForm.attributeGroupPlaceholder"),
    },
  ]);

  const loading = ref(false);
  const saving = ref(false);
  const showCompletenessBreakdown = ref(false);
  const completenessBreakdown = ref(null);

  watch(showCompletenessBreakdown, async (val) => {
    if (val && !completenessBreakdown.value && docName.value) {
      try {
        const res = await api.callMethod("tradehub_core.api.listing.get_completeness_breakdown", {
          listing_name: docName.value,
        });
        completenessBreakdown.value = res.data?.message || res.data || res;
      } catch (e) {
        console.warn("Completeness breakdown load failed:", e);
      }
    }
  });
  const uploadingField = ref(null);
  const uploadingImageRow = ref(false);
  const uploadingVariantIdx = ref(null);
  const uploadingGalleryIdx = ref(null);
  const sellerCategories = ref([]);
  const currencies = ref([]);
  // v4: productCertOptions / selectedProductCerts kaldırıldı — yönetim Sertifikalarım'a taşındı

  const docName = computed(() => decodeURIComponent(route.params.name || ""));
  const isNew = computed(() => docName.value === "new");
  const isAdmin = computed(() => auth.isAdmin);

  const adminOnlyStatuses = ["Pending", "Rejected", "Draft"];

  const statusOptions = [
    { value: "Pending", label: t("listingForm.statusPending") },
    { value: "Draft", label: t("listingForm.statusDraft") },
    { value: "Active", label: t("listingForm.statusActive") },
    { value: "Paused", label: t("listingForm.statusPaused") },
    { value: "Out of Stock", label: t("listingForm.statusOutOfStock") },
    { value: "Archived", label: t("listingForm.statusArchived") },
    { value: "Rejected", label: t("listingForm.statusRejected") },
  ];

  const tabs = [
    { key: "details", label: t("listingForm.tabDetails"), icon: "file-text" },
    { key: "description", label: t("listingForm.tabDescription"), icon: "align-left" },
    { key: "pricing", label: t("listingForm.tabPricing"), icon: "tag" },
    { key: "inventory", label: t("listingForm.tabInventory"), icon: "package" },
    { key: "media", label: t("listingForm.tabMedia"), icon: "image" },
    { key: "specs", label: t("listingForm.tabSpecs"), icon: "list" },
    { key: "variants", label: t("listingForm.tabVariants"), icon: "layers" },
    { key: "shipping", label: t("listingForm.tabShipping"), icon: "truck" },
    { key: "statistics", label: t("listingForm.tabStatistics"), icon: "bar-chart-2" },
    { key: "seo", label: t("listingForm.tabSeo"), icon: "search" },
    { key: "system", label: t("listingForm.tabSystem"), icon: "cpu" },
  ];

  const activeTab = ref("details");
  let statsLoaded = false;
  watch(activeTab, (tab) => {
    if (tab === "statistics" && !statsLoaded) {
      statsLoaded = true;
      loadStats();
    }
  });

  const isMinOrderQtyLockedByB2B = computed(
    () =>
      !!form.b2b_enabled &&
      Array.isArray(childData.pricing_tiers) &&
      childData.pricing_tiers.length > 0 &&
      Number(childData.pricing_tiers[0]?.min_qty) > 0
  );

  const form = reactive({
    listing_code: "",
    title: "",
    // i18n: dil-bazlı içerik kolonları + kaynak/varsayılan dil.
    title_tr: "",
    title_en: "",
    title_ar: "",
    title_ru: "",
    short_description_tr: "",
    short_description_en: "",
    short_description_ar: "",
    short_description_ru: "",
    description_tr: "",
    description_en: "",
    description_ar: "",
    description_ru: "",
    selling_point_tr: "",
    selling_point_en: "",
    selling_point_ar: "",
    selling_point_ru: "",
    content_default_lang: "tr",
    seller_profile: "",
    supplier_display_name: "",
    status: "Pending",
    listing_type: "Fixed Price",
    category: "",
    category_name: "",
    product_category: "",
    product_category_name: "",
    brand: "",
    brand_name: "",
    product_type: "",
    product_type_name: "",
    product_family: "",
    product_family_name: "",
    attribute_set: "",
    attribute_set_name: "",
    condition: "New",
    short_description: "",
    description: "",
    currency: "USD",
    base_price: 0,
    selling_price: 0,
    discount_percentage: 0,
    sample_price: 0,
    b2b_enabled: 1,
    stock_qty: 0,
    reserved_qty: 0,
    available_qty: 0,
    stock_uom: "Adet",
    min_order_qty: 1,
    sell_in_moq_multiples: 0,
    max_order_qty: 0,
    low_stock_threshold: 5,
    track_inventory: 1,
    allow_backorders: 0,
    primary_image: "",
    video_url: "",
    has_variants: 0,
    variant_axes_config: "",
    is_free_shipping: 0,
    shipping_weight: 0,
    ships_from_country: "Turkey",
    ships_from_city: "",
    handling_days: 1,
    country_of_origin: "",
    package_type: "",
    package_length: 0,
    package_width: 0,
    package_height: 0,
    package_weight: 0,
    units_per_package: 0,
    carton_length: 0,
    carton_width: 0,
    carton_height: 0,
    carton_gross_weight: 0,
    is_featured: 0,
    is_best_seller: 0,
    is_new_arrival: 0,
    is_visible: 1,
    is_searchable: 1,
    selling_point: "",
    view_count: 0,
    wishlist_count: 0,
    order_count: 0,
    average_rating: 0,
    review_count: 0,
    route: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    erpnext_item: "",
    published_at: "",
    creation: "",
    modified: "",
  });

  const childData = reactive({
    pricing_tiers: [],
    listing_images: [],
    attribute_values: [],
    product_certifications: [],
    variant_items: [],
    customization_options: [],
    lead_time_ranges: [],
    shipping_methods: [],
  });

  watch(
    () => [
      form.b2b_enabled,
      childData.pricing_tiers?.[0]?.min_qty,
      childData.pricing_tiers?.length,
    ],
    () => {
      if (!form.b2b_enabled) return;
      const firstTierMin = Number(childData.pricing_tiers?.[0]?.min_qty);
      if (firstTierMin > 0 && form.min_order_qty !== firstTierMin) {
        form.min_order_qty = firstTierMin;
      }
    },
    { immediate: true }
  );

  const checkboxFields = [
    { key: "is_featured", label: t("listingForm.flagFeatured") },
    { key: "is_best_seller", label: t("listingForm.flagBestSeller") },
    { key: "is_new_arrival", label: t("listingForm.flagNewArrival") },
    { key: "is_visible", label: t("listingForm.flagVisible") },
    { key: "is_searchable", label: t("listingForm.flagSearchable") },
  ];

  // ── İstatistikler (Chart.js) ──────────────────────────────────────────────────
  const statsLoading = ref(false);
  const statsData = ref(null);
  const trendChartCanvas = ref(null);
  const revenueChartCanvas = ref(null);
  let trendChart = null;
  let revenueChart = null;

  function formatK(n) {
    if (!n) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }
  function formatCurrency(n) {
    if (!n) return "0";
    return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  }

  async function loadStats() {
    if (!docName.value || isNew.value) return;
    statsLoading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.listing_stats.get_listing_stats", {
        listing: docName.value,
        days: 30,
      });
      statsData.value = res.message || null;
      nextTick(() => renderCharts());
    } catch (err) {
      console.error("loadStats error", err);
      statsData.value = null;
    } finally {
      statsLoading.value = false;
    }
  }

  function renderCharts() {
    if (!statsData.value?.daily) return;

    import("chart.js").then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      const daily = statsData.value.daily;
      const labels = daily.dates.map((d) => {
        const dt = new Date(d);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
      });

      const isDark = document.documentElement.classList.contains("dark");
      const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
      const textColor = isDark ? "#9ca3af" : "#6b7280";

      // ── Trend Chart (Views + Orders) ──
      if (trendChart) trendChart.destroy();
      const trendCtx = trendChartCanvas.value?.getContext("2d");
      if (trendCtx) {
        trendChart = new Chart(trendCtx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: t("listingForm.views"),
                data: daily.views,
                borderColor: "#8b5cf6",
                backgroundColor: "rgba(139,92,246,0.08)",
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                yAxisID: "y",
              },
              {
                label: t("listingForm.orders"),
                data: daily.orders,
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.08)",
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                yAxisID: "y1",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: textColor,
                  usePointStyle: true,
                  pointStyle: "circle",
                  padding: 16,
                  font: { size: 11 },
                },
              },
              tooltip: {
                backgroundColor: isDark ? "#1e1e2d" : "#fff",
                titleColor: textColor,
                bodyColor: isDark ? "#e5e7eb" : "#111827",
                borderColor: gridColor,
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
              },
            },
            scales: {
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 10 },
              },
              y: {
                position: "left",
                grid: { color: gridColor },
                ticks: { color: "#8b5cf6", font: { size: 10 } },
                title: {
                  display: true,
                  text: t("listingForm.views"),
                  color: "#8b5cf6",
                  font: { size: 10 },
                },
              },
              y1: {
                position: "right",
                grid: { drawOnChartArea: false },
                ticks: { color: "#10b981", font: { size: 10 } },
                title: {
                  display: true,
                  text: t("listingForm.orders"),
                  color: "#10b981",
                  font: { size: 10 },
                },
              },
            },
          },
        });
      }

      // ── Revenue Chart (Bar) ──
      if (revenueChart) revenueChart.destroy();
      const revCtx = revenueChartCanvas.value?.getContext("2d");
      if (revCtx) {
        revenueChart = new Chart(revCtx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: t("listingForm.revenue"),
                data: daily.revenue,
                backgroundColor: "rgba(139,92,246,0.6)",
                hoverBackgroundColor: "#8b5cf6",
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? "#1e1e2d" : "#fff",
                titleColor: textColor,
                bodyColor: isDark ? "#e5e7eb" : "#111827",
                borderColor: gridColor,
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) =>
                    `${Number(ctx.raw).toLocaleString("tr-TR")} ${statsData.value?.summary?.currency || "TRY"}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 10 },
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { size: 10 }, callback: (v) => formatK(v) },
              },
            },
          },
        });
      }
    });
  }

  // ── Para birimlerini yükle ────────────────────────────────────────────────────
  async function loadCurrencies() {
    try {
      const res = await api.getList("Currency", {
        filters: [["enabled", "=", 1]],
        fields: ["name", "currency_name"],
        order_by: "name asc",
        limit_page_length: 500,
      });
      currencies.value = res.data || [];
    } catch {
      // Fallback: yaygın para birimleri
      currencies.value = [
        { name: "USD", currency_name: "US Dollar" },
        { name: "EUR", currency_name: "Euro" },
        { name: "TRY", currency_name: "Turkish Lira" },
        { name: "GBP", currency_name: "British Pound" },
        { name: "AED", currency_name: "UAE Dirham" },
        { name: "SAR", currency_name: "Saudi Riyal" },
        { name: "CNY", currency_name: "Chinese Yuan" },
        { name: "JPY", currency_name: "Japanese Yen" },
      ];
    }
  }

  // v4: Sertifika yönetimi MyCertificationsView'a taşındı.
  // Listing form yalnız atanmış cert sayısını gösterir.
  const listingCertCount = computed(() => {
    const arr = childData.product_certifications;
    return Array.isArray(arr) ? arr.length : 0;
  });

  // ── Seller kategorilerini yükle ───────────────────────────────────────────────
  async function loadSellerCategories() {
    try {
      if (auth.isAdmin) {
        // Admin: tüm aktif kategorileri getir
        const res = await api.getList("Seller Category", {
          filters: [["status", "=", "Active"]],
          fields: ["name", "category_name", "status"],
          limit_page_length: 200,
        });
        sellerCategories.value = res.data || [];
      } else {
        // Satıcı: kendi onaylı kategorileri
        const res = await api.callMethod("tradehub_core.api.seller.get_my_seller_categories");
        const all = res.message?.categories || res.message || [];
        sellerCategories.value = all.filter((c) => c.status === "Active");
      }
    } catch {
      sellerCategories.value = [];
    }
  }

  // ── Platform Kategori Cascade Picker ─────────────────────────────────────────
  const categoryPickerPath = ref([]); // Seçilen kategorinin tam yolu (breadcrumb gösterimi)

  const categoryPicker = ref({
    show: false,
    loading: false,
    items: [],
    path: [], // Navigasyon geçmişi (modal içi breadcrumb)
    search: "", // Arama metni
    searching: false, // Backend search devam ediyor mu?
    searchResults: [], // Arama sonuçları (path bilgisi ile)
  });
  let _categorySearchDebounce = null;

  async function openCategoryPicker() {
    categoryPicker.value.show = true;
    categoryPicker.value.path = [];
    categoryPicker.value.search = "";
    categoryPicker.value.searchResults = [];
    await loadCategoryChildren(null);
  }

  function onCategorySearchInput() {
    if (_categorySearchDebounce) clearTimeout(_categorySearchDebounce);
    _categorySearchDebounce = setTimeout(() => {
      void performCategorySearch();
    }, 300);
  }

  async function performCategorySearch() {
    const q = (categoryPicker.value.search || "").trim();
    if (q.length < 2) {
      // Boşalınca tree navigasyonuna geri dön
      categoryPicker.value.searchResults = [];
      categoryPicker.value.searching = false;
      return;
    }
    categoryPicker.value.searching = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.search_platform_categories", {
        query: q,
        limit: 30,
        lang: locale.value,
      });
      categoryPicker.value.searchResults = res.message || [];
    } catch (err) {
      categoryPicker.value.searchResults = [];
      toast.error(t("listingForm.searchFailed") + (err.message || ""));
    } finally {
      categoryPicker.value.searching = false;
    }
  }

  function clearCategorySearch() {
    categoryPicker.value.search = "";
    categoryPicker.value.searchResults = [];
    categoryPicker.value.searching = false;
  }

  async function loadCategoryChildren(parentId) {
    categoryPicker.value.loading = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_platform_category_tree", {
        parent: parentId || "",
        lang: locale.value,
      });
      categoryPicker.value.items = res.message || [];
    } catch (err) {
      toast.error(t("listingForm.categoriesLoadFailed") + (err.message || ""));
      categoryPicker.value.items = [];
    } finally {
      categoryPicker.value.loading = false;
    }
  }

  async function drillDown(cat) {
    categoryPicker.value.path.push({ name: cat.name, category_name: cat.category_name });
    await loadCategoryChildren(cat.name);
  }

  async function categoryPickerGoTo(idx) {
    if (idx === -1) {
      categoryPicker.value.path = [];
      await loadCategoryChildren(null);
    } else {
      categoryPicker.value.path = categoryPicker.value.path.slice(0, idx + 1);
      await loadCategoryChildren(categoryPicker.value.path[idx].name);
    }
  }

  function selectCategoryItem(cat) {
    if (cat.child_count > 0) {
      drillDown(cat);
    } else {
      confirmCategory(cat);
    }
  }

  function confirmCategory(cat) {
    form.product_category = cat.name;
    categoryPickerPath.value = [
      ...categoryPicker.value.path,
      { name: cat.name, category_name: cat.category_name },
    ];
    categoryPicker.value.show = false;
  }

  function clearProductCategory() {
    form.product_category = "";
    categoryPickerPath.value = [];
  }

  async function loadCategoryPath(categoryId) {
    if (!categoryId) {
      categoryPickerPath.value = [];
      return;
    }
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_category_ancestors", {
        name: categoryId,
        lang: locale.value,
      });
      categoryPickerPath.value = res.message || [];
    } catch {
      categoryPickerPath.value = [];
    }
  }

  // ── Veri yükleme ──────────────────────────────────────────────────────────────
  async function loadDoc() {
    if (isNew.value) return;

    loading.value = true;
    try {
      const res = await api.getDoc("Listing", docName.value);
      const data = res.data || {};

      // Ownership check: seller can only view/edit their own listings
      if (!auth.isAdmin && auth.isSeller && data.seller_profile) {
        const mySellerCode = auth.user?.admin_seller_profile?.seller_code;
        if (mySellerCode && data.seller_profile !== mySellerCode) {
          toast.error(t("listingForm.noAccessToListing"));
          router.push("/seller-listings");
          return;
        }
      }

      Object.keys(form).forEach((k) => {
        if (data[k] !== undefined) form[k] = data[k];
      });

      // i18n: aktif dil sekmesini kaynak dile ayarla; sufix boşsa base'den doldur.
      editLang.value = form.content_default_lang || "tr";
      for (const base of ["title", "short_description", "description", "selling_point"]) {
        const dlKey = `${base}_${editLang.value}`;
        if (!form[dlKey] && form[base]) form[dlKey] = form[base];
      }
      // Bayatlama referansı: yüklenen kaynak metinler "senkron" başlangıç durumu.
      snapshotSource();

      // Seçili platform kategorisinin tam yolunu yükle
      if (form.product_category) {
        await loadCategoryPath(form.product_category);
      }

      // Child tablelara doldur (Frappe child tableları parent doc içinde gelir)
      childData.pricing_tiers = (data.pricing_tiers || []).map(clean);
      childData.listing_images = (data.listing_images || []).map(clean);
      childData.attribute_values = (data.attribute_values || []).map(clean);
      childData.product_certifications = (data.product_certifications || []).map(clean);
      // v4: selectedProductCerts kaldırıldı — yönetim Sertifikalarım'a taşındı
      childData.variant_items = (data.variant_items || []).map(clean);
      syncVariantXlatFromRows();
      childData.customization_options = (data.customization_options || []).map(clean);
      // Init axis inputs from existing variants
      nextTick(() => initAxisFromExistingVariants());
      childData.lead_time_ranges = (data.lead_time_ranges || []).map(clean);
      childData.shipping_methods = (data.shipping_methods || []).map(clean);
    } catch (err) {
      toast.error(err.message || t("listingForm.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function clean(row) {
    const {
      name,
      parent: _parent,
      parenttype: _parenttype,
      parentfield: _parentfield,
      idx: _idx,
      doctype: _doctype,
      ...rest
    } = row;
    return { _name: name, ...rest };
  }

  // Zorunlu alanları boş olan satırları kaydetme
  const REQUIRED_KEYS = {
    "Listing Bulk Pricing Tier": ["min_qty", "price"],
    "Listing Image": ["image"],
    "Listing Attribute Value": ["attribute_label", "attribute_value"],
    "Listing Certification": ["certification_type"],
    "Listing Variant Item": ["attribute_type", "attribute_value"],
    "Listing Customization Option": ["option_name"],
    "Listing Lead Time Range": ["min_qty", "lead_days"],
    "Shipping Method Item": ["shipping_method_name", "cost"],
  };

  function prepareChildRows(rows, childDoctype) {
    const requiredKeys = REQUIRED_KEYS[childDoctype] || [];
    return rows
      .filter((row) => {
        // İlk zorunlu alan boşsa satırı atla
        if (requiredKeys.length === 0) return true;
        const firstKey = requiredKeys[0];
        const v = row[firstKey];
        return v !== "" && v !== null && v !== undefined;
      })
      .map((row) => {
        const { _name, ...rest } = row;
        const out = { doctype: childDoctype, ...rest };
        if (_name) out.name = _name;
        return out;
      });
  }

  // ── Kaydet ───────────────────────────────────────────────────────────────────
  async function saveDoc() {
    // i18n: base kolonları kaynak/varsayılan dil değerine senkronla (backend de doğrular).
    for (const base of ["title", "short_description", "description", "selling_point"]) {
      const dv = form[`${base}_${form.content_default_lang}`];
      if (dv) form[base] = dv;
    }
    if (!form.title) {
      toast.error(t("listingForm.titleRequired"));
      return;
    }
    if (!form.currency) {
      toast.error(t("listingForm.currencyRequired"));
      return;
    }
    if (!form.base_price) {
      toast.error(t("listingForm.basePriceRequired"));
      return;
    }
    if (!form.selling_price) {
      toast.error(t("listingForm.sellingPriceRequired"));
      return;
    }

    saving.value = true;
    try {
      const READONLY = [
        "listing_code",
        "supplier_display_name",
        "category_name",
        "product_category_name",
        "reserved_qty",
        "available_qty",
        "view_count",
        "wishlist_count",
        "order_count",
        "average_rating",
        "review_count",
        "completeness_score",
        "erpnext_item",
        "published_at",
        "creation",
        "modified",
        // SEO field'ları SeoTab'ın kendi save endpoint'i tarafından yazılır
        // (api/seo_admin.save_seo_fields). Listing top-level Kaydet'i bu
        // değerleri ezmesin diye payload'a dahil edilmez.
        "route",
        "slug",
        "slug_en",
        "meta_title",
        "meta_title_en",
        "meta_description",
        "meta_description_en",
        "meta_keywords",
        "focus_keyword",
        "noindex",
        "og_image",
        "og_title_override",
        "og_title_override_en",
        "og_description_override",
        "og_description_override_en",
        "canonical_url_override",
        "robots_directive_override",
        "primary_image_alt",
      ];

      const payload = {};
      Object.keys(form).forEach((k) => {
        if (!READONLY.includes(k)) payload[k] = form[k];
      });

      // Satıcı statü değiştiremez (admin-only statüler)
      if (!isAdmin.value && adminOnlyStatuses.includes(payload.status)) {
        delete payload.status;
      }

      // Child tables
      payload.pricing_tiers = prepareChildRows(
        childData.pricing_tiers,
        "Listing Bulk Pricing Tier"
      );
      payload.listing_images = prepareChildRows(childData.listing_images, "Listing Image");
      payload.attribute_values = prepareChildRows(
        childData.attribute_values,
        "Listing Attribute Value"
      );
      payload.product_certifications = prepareChildRows(
        childData.product_certifications,
        "Listing Certification"
      );
      applyVariantXlatToRows();
      payload.variant_items = prepareChildRows(childData.variant_items, "Listing Variant Item");
      payload.customization_options = prepareChildRows(
        childData.customization_options,
        "Listing Customization Option"
      );
      payload.lead_time_ranges = prepareChildRows(
        childData.lead_time_ranges,
        "Listing Lead Time Range"
      );
      payload.shipping_methods = prepareChildRows(
        childData.shipping_methods,
        "Shipping Method Item"
      );

      if (isNew.value) {
        const res = await api.createDoc("Listing", payload);
        const newName = res.data?.name;
        toast.success(t("listingForm.listingCreated"));
        const returnTo = route.query.returnTo;
        if (returnTo) router.push(returnTo);
        else if (newName)
          router.replace(`/app/Listing/${encodeURIComponent(newName)}?returnTo=/seller-listings`);
      } else {
        await api.updateDoc("Listing", docName.value, payload);
        // SEO sekmesinde değişiklik varsa ayrı endpoint'e kaydet
        // (api/seo_admin.save_seo_fields — SeoTab kendi endpoint'i).
        if (seoStore.dirty && seoStore.recordName === docName.value) {
          const seoResult = await seoStore.save();
          if (!seoResult.ok) {
            toast.error(t("listingForm.seoSaveFailed", { error: seoResult.error }));
            return;
          }
        }
        toast.success(t("listingForm.saved"));
        await loadDoc();
      }
    } catch (err) {
      toast.error(err.message || t("listingForm.saveError"));
    } finally {
      saving.value = false;
    }
  }

  // ── Görsel yükleme ────────────────────────────────────────────────────────────
  async function uploadImage(fieldName, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadingField.value = fieldName;
    uploads.start(fieldName);
    try {
      const url = await doUpload(file);
      form[fieldName] = url;
      await uploads.finish(fieldName);
      toast.success(t("listingForm.imageUploaded"));
    } catch (err) {
      uploads.fail(fieldName);
      toast.error(err.message || t("listingForm.uploadError"));
    } finally {
      uploadingField.value = null;
      event.target.value = "";
    }
  }

  async function addImageRow(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) await addImageRows(files);
  }

  async function addImageRows(files) {
    if (!files?.length) return;
    uploadingImageRow.value = true;
    // 1) Her dosya için anında boş kart push — optimistic preview kart-bazlı progress
    //    gösterebilsin diye. `_uploadKey` template'te bar/✓ overlay'i bulmak için.
    const newRows = files.map((file, i) => {
      const _uploadKey = `new-${Date.now()}-${i}`;
      // Image dosyalar için anlık blob preview — gerçek URL backend'den geldikten sonra değiştirilir.
      const _previewUrl = file.type?.startsWith("image/") ? URL.createObjectURL(file) : "";
      const row = {
        image: "",
        alt_text: "",
        sort_order: childData.listing_images.length + 1,
        _uploadKey,
        _previewUrl,
        _file: file,
      };
      childData.listing_images.push(row);
      return row;
    });
    // 2) Her satır için sırayla upload + progress
    try {
      for (const row of newRows) {
        uploads.start(row._uploadKey);
        try {
          const url = await doUpload(row._file);
          row.image = url;
          await uploads.finish(row._uploadKey);
        } catch (err) {
          uploads.fail(row._uploadKey);
          toast.error(`${row._file.name}: ${err.message || t("listingForm.uploadFailedShort")}`);
          const idx = childData.listing_images.indexOf(row);
          if (idx >= 0) {
            if (row._previewUrl) URL.revokeObjectURL(row._previewUrl);
            childData.listing_images.splice(idx, 1);
          }
        } finally {
          // Blob preview artık image URL'ine yer açabilir (saklama gerek yok)
          if (row._previewUrl) {
            URL.revokeObjectURL(row._previewUrl);
            row._previewUrl = "";
          }
          delete row._file;
        }
      }
    } finally {
      uploadingImageRow.value = false;
    }
  }

  async function uploadImageRow(idx, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const key = `row-${idx}`;
    uploads.start(key);
    try {
      const url = await doUpload(file);
      childData.listing_images[idx].image = url;
      await uploads.finish(key);
      toast.success(t("listingForm.imageUpdated"));
    } catch (err) {
      uploads.fail(key);
      toast.error(err.message || t("listingForm.uploadError"));
    } finally {
      event.target.value = "";
    }
  }

  function removeImageRow(idx) {
    childData.listing_images.splice(idx, 1);
  }

  async function uploadVariantImage(idx, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadingVariantIdx.value = idx;
    const key = `variant-${idx}`;
    uploads.start(key);
    try {
      const url = await api.uploadFile(file);
      childData.variant_items[idx].variant_image = url;
      await uploads.finish(key);
    } catch (err) {
      uploads.fail(key);
      toast.error(err.message || t("listingForm.uploadError"));
    } finally {
      uploadingVariantIdx.value = null;
      event.target.value = "";
    }
  }

  // ── SKU Matrix Logic (N-axis) ─────────────────────────────────────────────────
  const variantAxes = reactive([
    { name: t("listingForm.axisColor"), valuesStr: "", hasImage: true },
  ]);

  // Varyant giriş yöntemi: 'wizard' (taksonomiden çip seçimi) | 'manual' (serbest eksen).
  // Sıfır-bilgi prensibi gereği yeni kullanıcıya sihirbaz varsayılan gelir.
  const variantInputMode = ref("wizard");
  // VariantWizard'ı yeniden monte etmek (initialAxes'i tazelemek) için key.
  const wizardKey = ref(0);

  function setVariantMode(value) {
    form.has_variants = value;
    if (value) wizardKey.value++;
  }

  // Sihirbaz "Uygula" → eksen yapılandırmasını variantAxes'e yükle ve mevcut
  // generateSkuMatrix() akışını çalıştır (yeni backend yazılmaz).
  function onWizardApply(config) {
    if (!Array.isArray(config) || config.length === 0) return;
    variantAxes.length = 0;
    config.forEach((a) =>
      variantAxes.push({
        name: a.name || "",
        valuesStr: a.valuesStr || "",
        hasImage: !!a.hasImage,
      })
    );
    generateSkuMatrix();
  }

  // Computed helpers backward-compat
  const variantAxis1Name = computed(() => variantAxes[0]?.name || "Renk");
  const variantAxis2Name = computed(() => variantAxes[1]?.name || "");
  const matrixAxis1Values = computed(() =>
    (variantAxes[0]?.valuesStr || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
  const matrixAxis2Values = computed(() =>
    (variantAxes[1]?.valuesStr || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
  const imageAxes = computed(() =>
    variantAxes
      .filter((a) => a.hasImage && a.name && a.valuesStr)
      .map((a) => ({
        name: a.name,
        values: (a.valuesStr || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((a) => a.values.length > 0)
  );

  const matrixPreviewCount = computed(() => {
    let count = 1;
    for (const axis of variantAxes) {
      const vals = (axis.valuesStr || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (vals.length > 0) count *= vals.length;
    }
    return count;
  });

  // ── Varyant çevirileri (ürün-bazlı, başlık gibi) ──────────────────────────
  // Kaynak eksen adı/değeri → dil-bazlı DISPLAY çevirisi. Sepet/SKU eşleşmesi
  // KAYNAK değere bağlı olduğundan (varyant ID'leri `LST-..-Renk-Siyah`), çeviri
  // yalnızca storefront gösterimi içindir. Map key: `${lang}::${kaynakMetin}`.
  // Aynı değer (örn. "Siyah") birden çok satırda tekrar ettiği için bir kez
  // düzenlenir, kaydederken eşleşen tüm satırlara yazılır.
  const variantTypeXlat = reactive({});
  const variantValueXlat = reactive({});

  const variantUniqueTypes = computed(() => {
    const seen = new Set();
    for (const r of childData.variant_items) {
      if (r.attribute_type) seen.add(r.attribute_type);
      if (r.attribute_type_2) seen.add(r.attribute_type_2);
    }
    return [...seen];
  });
  const variantUniqueValues = computed(() => {
    const seen = new Set();
    for (const r of childData.variant_items) {
      if (r.attribute_value) seen.add(r.attribute_value);
      if (r.attribute_value_2) seen.add(r.attribute_value_2);
    }
    return [...seen];
  });

  // Yüklenen satırlardaki mevcut çevirileri editöre doldur.
  function syncVariantXlatFromRows() {
    for (const r of childData.variant_items) {
      for (const lng of CONTENT_LANGS) {
        const t1 = r[`attribute_type_${lng}`];
        if (r.attribute_type && t1) variantTypeXlat[`${lng}::${r.attribute_type}`] = t1;
        const t2 = r[`attribute_type_2_${lng}`];
        if (r.attribute_type_2 && t2) variantTypeXlat[`${lng}::${r.attribute_type_2}`] = t2;
        const v1 = r[`attribute_value_${lng}`];
        if (r.attribute_value && v1) variantValueXlat[`${lng}::${r.attribute_value}`] = v1;
        const v2 = r[`attribute_value_2_${lng}`];
        if (r.attribute_value_2 && v2) variantValueXlat[`${lng}::${r.attribute_value_2}`] = v2;
      }
    }
  }

  // Kaydetmeden önce çevirileri satırlara yaz; varsayılan dil kolonu = kaynak
  // (backend resolver eksik dilde varsayılana düşer).
  function applyVariantXlatToRows() {
    const dl = form.content_default_lang || "tr";
    const pick = (map, src, lng) => map[`${lng}::${src}`] || (lng === dl ? src : "");
    for (const r of childData.variant_items) {
      for (const lng of CONTENT_LANGS) {
        if (r.attribute_type)
          r[`attribute_type_${lng}`] = pick(variantTypeXlat, r.attribute_type, lng);
        if (r.attribute_value)
          r[`attribute_value_${lng}`] = pick(variantValueXlat, r.attribute_value, lng);
        if (r.attribute_type_2)
          r[`attribute_type_2_${lng}`] = pick(variantTypeXlat, r.attribute_type_2, lng);
        if (r.attribute_value_2)
          r[`attribute_value_2_${lng}`] = pick(variantValueXlat, r.attribute_value_2, lng);
      }
    }
  }

  function generateSkuMatrix() {
    // Parse all axes
    const axes = variantAxes
      .map((a) => ({
        name: (a.name || "").trim(),
        values: (a.valuesStr || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((a) => a.name && a.values.length > 0);

    if (axes.length === 0) {
      toast.error(t("listingForm.atLeastOneAxis"));
      return;
    }

    // Cartesian product of all axes
    function cartesian(arrays) {
      return arrays.reduce(
        (acc, arr) => {
          const result = [];
          for (const a of acc) {
            for (const v of arr) {
              result.push([...a, v]);
            }
          }
          return result;
        },
        [[]]
      );
    }

    const combos = cartesian(axes.map((a) => a.values));

    // Build a normalized {axisName: value} map for every existing row so we can
    // merge by axis NAME (not positional keys). This survives axis add/remove/reorder.
    const oldRows = (childData.variant_items || []).map((row) => {
      const axisMap = {};
      if (row.attribute_type && row.attribute_value) {
        axisMap[row.attribute_type] = row.attribute_value;
      }
      if (row.attribute_type_2 && row.attribute_value_2) {
        axisMap[row.attribute_type_2] = row.attribute_value_2;
      }
      if (row.axis_values_json) {
        try {
          const parsed = JSON.parse(row.axis_values_json);
          if (parsed && typeof parsed === "object") {
            for (const k of Object.keys(parsed)) {
              if (parsed[k]) axisMap[k] = parsed[k];
            }
          }
        } catch {
          /* yoksay */
        }
      }
      return { row, axisMap };
    });

    // For a new combo, find the best old row to inherit values from:
    // - axes shared between old and new MUST match exactly (else disqualified)
    // - among non-disqualified rows, the one with the MOST shared matching axes wins
    function findOldRow(newAxisMap) {
      let best = null;
      let bestScore = 0;
      for (const { row, axisMap } of oldRows) {
        let score = 0;
        let disqualified = false;
        for (const [k, v] of Object.entries(axisMap)) {
          if (!(k in newAxisMap)) continue; // axis dropped from new — neutral
          if (newAxisMap[k] === v) {
            score++;
          } else {
            disqualified = true;
            break;
          }
        }
        if (disqualified) continue;
        if (score > bestScore) {
          bestScore = score;
          best = row;
        }
      }
      return best;
    }

    const newRows = [];

    for (const combo of combos) {
      // Build axis_values_json
      const axisObj = {};
      axes.forEach((ax, i) => {
        axisObj[ax.name] = combo[i];
      });
      const axisJson = JSON.stringify(axisObj);

      // Legacy compat keys
      const v1 = combo[0] || "";
      const v2 = combo[1] || "";
      const old = findOldRow(axisObj);

      const skuParts = combo.map((v) => v.substring(0, 3).toUpperCase());

      newRows.push({
        attribute_type: axes[0]?.name || "",
        attribute_value: v1,
        attribute_type_2: axes[1]?.name || "",
        attribute_value_2: v2,
        axis_values_json: axes.length > 2 ? axisJson : "",
        is_default: old?.is_default ? 1 : 0,
        variant_image: old?.variant_image || "",
        variant_gallery: old?.variant_gallery || "",
        variant_video_url: old?.variant_video_url || "",
        variant_price: old?.variant_price ?? null,
        variant_stock: old?.variant_stock ?? 0,
        variant_sku: old?.variant_sku || skuParts.join("-"),
      });
    }

    // Ensure exactly one default exists across the new matrix.
    const defaultCount = newRows.reduce((n, r) => n + (r.is_default ? 1 : 0), 0);
    if (defaultCount === 0 && newRows.length > 0) {
      newRows[0].is_default = 1;
    } else if (defaultCount > 1) {
      // Keep the first one, clear the rest
      let kept = false;
      for (const r of newRows) {
        if (r.is_default) {
          if (kept) r.is_default = 0;
          else kept = true;
        }
      }
    }

    childData.variant_items = newRows;
    // Save axis config to listing field (persists across reloads)
    syncAxesConfig();
    toast.success(t("listingForm.skuCombinationsCreated", { count: newRows.length }));
  }

  function getAxisValue(row, axisIndex) {
    // axis 0 = attribute_value, axis 1 = attribute_value_2, axis 2+ = from axis_values_json
    if (axisIndex === 0) return row.attribute_value || "";
    if (axisIndex === 1) return row.attribute_value_2 || "";
    if (row.axis_values_json) {
      try {
        const obj = JSON.parse(row.axis_values_json);
        const axisName = variantAxes[axisIndex]?.name;
        return axisName ? obj[axisName] || "" : "";
      } catch {
        /* yoksay */
      }
    }
    return "";
  }

  function isColorDefault(colorValue) {
    return childData.variant_items.some((r) => r.attribute_value === colorValue && r.is_default);
  }

  function setColorDefault(colorValue) {
    // Tüm default'ları kaldır, seçilen rengin İLK satırını default yap
    let setFirst = false;
    childData.variant_items.forEach((r) => {
      if (r.attribute_value === colorValue && !setFirst) {
        r.is_default = 1;
        setFirst = true;
      } else {
        r.is_default = 0;
      }
    });
  }

  function syncAxesConfig() {
    const config = variantAxes.map((a) => ({
      name: a.name,
      valuesStr: a.valuesStr,
      hasImage: !!a.hasImage,
    }));
    form.variant_axes_config = JSON.stringify(config);
  }

  function getSkuRow(v1, v2) {
    return childData.variant_items.find(
      (r) => r.attribute_value === v1 && r.attribute_value_2 === v2
    );
  }

  function getColorImage(colorValue) {
    const row = childData.variant_items.find(
      (r) => r.attribute_value === colorValue && r.variant_image
    );
    return row?.variant_image || "";
  }

  async function uploadColorImage(colorValue, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadColorImageFile(colorValue, file);
  }

  function initAxisFromExistingVariants() {
    // Mevcut varyantlı ürün açılırken kullanıcı verisini doğrudan görsün diye
    // manuel moda düş; sihirbaza geçmek isterse sekme üstünden seçebilir.
    if (childData.variant_items && childData.variant_items.length > 0) {
      variantInputMode.value = "manual";
    }

    // Primary: load from saved variant_axes_config on Listing (persisted)
    if (form.variant_axes_config) {
      try {
        const saved = JSON.parse(form.variant_axes_config);
        if (Array.isArray(saved) && saved.length > 0) {
          variantAxes.length = 0;
          saved.forEach((a, i) =>
            variantAxes.push({
              name: a.name || "",
              valuesStr: a.valuesStr || "",
              hasImage: a.hasImage !== undefined ? !!a.hasImage : i === 0,
            })
          );
          return;
        }
      } catch {
        /* yoksay */
      }
    }

    // Fallback: derive from variant_items data
    if (!childData.variant_items || childData.variant_items.length === 0) return;
    const first = childData.variant_items[0];
    const axes = [];
    if (first.attribute_type) {
      const v1Set = new Set();
      childData.variant_items.forEach((r) => {
        if (r.attribute_value) v1Set.add(r.attribute_value);
      });
      axes.push({ name: first.attribute_type, valuesStr: [...v1Set].join(", "), hasImage: true });
    }
    if (first.attribute_type_2) {
      const v2Set = new Set();
      childData.variant_items.forEach((r) => {
        if (r.attribute_value_2) v2Set.add(r.attribute_value_2);
      });
      axes.push({
        name: first.attribute_type_2,
        valuesStr: [...v2Set].join(", "),
        hasImage: false,
      });
    }
    if (axes.length > 0) {
      variantAxes.length = 0;
      axes.forEach((a) => variantAxes.push(a));
    }
  }

  function setVariantDefault(idx, checked) {
    const row = childData.variant_items[idx];
    if (!row) return;
    if (checked) {
      // Aynı attribute_type grubunda diğer varsayılanları kaldır
      const group = (row.attribute_type || "").trim();
      childData.variant_items.forEach((r, i) => {
        if (i !== idx && (r.attribute_type || "").trim() === group) {
          r.is_default = 0;
        }
      });
    }
    row.is_default = checked ? 1 : 0;
  }

  // ── Color gallery (per-color multi-image in matrix mode) ──────────────────────
  const expandedColorGallery = ref(null);

  function toggleColorGallery(color) {
    expandedColorGallery.value = expandedColorGallery.value === color ? null : color;
  }
  function getColorGalleryCount(color) {
    const row = childData.variant_items.find((r) => r.attribute_value === color);
    return row ? parseVariantGallery(row).length : 0;
  }
  function getColorGalleryUrls(color) {
    const row = childData.variant_items.find((r) => r.attribute_value === color);
    return row ? parseVariantGallery(row) : [];
  }
  function removeColorGalleryImage(color, imgIdx) {
    const idx = childData.variant_items.findIndex((r) => r.attribute_value === color);
    if (idx >= 0) removeVariantGalleryImage(idx, imgIdx);
  }
  async function uploadColorGalleryImages(color, event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) await uploadColorGalleryFiles(color, files);
  }

  // ── Variant gallery (multi-image per variant) ─────────────────────────────────
  function parseVariantGallery(row) {
    if (!row || !row.variant_gallery) return [];
    try {
      const parsed = JSON.parse(row.variant_gallery);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function setVariantGallery(idx, urls) {
    const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
    childData.variant_items[idx].variant_gallery = list.length > 0 ? JSON.stringify(list) : "";
  }

  function removeVariantGalleryImage(idx, imgIdx) {
    const current = parseVariantGallery(childData.variant_items[idx]);
    current.splice(imgIdx, 1);
    setVariantGallery(idx, current);
  }

  async function doUpload(file) {
    return api.uploadFile(file);
  }

  // ── Dropzone instance'ları ────────────────────────────────────────────────────
  // Tek bir handler set'i — yalnızca image/*, 10MB/dosya. Validation hatalarını toast'a düşür.
  function onUploadValidationError(kind, file) {
    if (kind === "unsupported")
      toast.error(
        `${file?.name || t("listingForm.fileFallback")}: ${t("listingForm.onlyImagesAllowed")}`
      );
    else if (kind === "tooLarge")
      toast.error(`${file?.name || t("listingForm.fileFallback")}: ${t("listingForm.tooLarge")}`);
  }

  // Ek Görseller — multi-file drop
  const addImagesDropzone = useDropzone((files) => addImageRows(files), {
    accept: "image/*",
    multiple: true,
    onValidationError: onUploadValidationError,
  });

  // Renk thumbnail dropzone'larını runtime'da renge göre üret (axis values dinamik).
  // reactive() içine konulmaz — Vue iç ref'leri auto-unwrap eder, template'te
  // `.isOver.value` çalışmaz. İç ref'in kendisi zaten reactivity sağlar.
  const colorThumbDropzones = {};
  function getColorThumbDropzone(colorValue) {
    if (!colorThumbDropzones[colorValue]) {
      colorThumbDropzones[colorValue] = useDropzone(
        async (files) => {
          if (!files[0]) return;
          await uploadColorImageFile(colorValue, files[0]);
        },
        { accept: "image/*", multiple: false, onValidationError: onUploadValidationError }
      );
    }
    return colorThumbDropzones[colorValue];
  }

  const colorGalleryDropzones = {};
  function getColorGalleryDropzone(colorValue) {
    if (!colorGalleryDropzones[colorValue]) {
      colorGalleryDropzones[colorValue] = useDropzone(
        async (files) => {
          await uploadColorGalleryFiles(colorValue, files);
        },
        { accept: "image/*", multiple: true, onValidationError: onUploadValidationError }
      );
    }
    return colorGalleryDropzones[colorValue];
  }

  // Bu helpers, mevcut color/gallery handler'larını dosya nesnesi kabul edecek şekilde sarar
  async function uploadColorImageFile(colorValue, file) {
    const key = `color-${colorValue}`;
    uploads.start(key);
    try {
      const url = await api.uploadFile(file);
      for (const row of childData.variant_items) {
        if (row.attribute_value === colorValue) row.variant_image = url;
      }
      await uploads.finish(key);
      toast.success(t("listingForm.colorImageUploaded", { color: colorValue }));
    } catch (err) {
      uploads.fail(key);
      toast.error(err.message || t("listingForm.uploadError"));
    }
  }

  // Renk galerisinde drop edildiği anda kart oluşacak pending upload'ları tutar —
  // variant_gallery JSON string olduğu için "uploading" placeholder'ı array'e push
  // edemiyoruz (save'de kirli data); ayrı reactive state ile render zamanı birleşir.
  const pendingGalleryUploads = reactive({}); // { [colorValue]: [{ _key, _previewUrl, _file }] }

  async function uploadColorGalleryFiles(colorValue, files) {
    const idx = childData.variant_items.findIndex((r) => r.attribute_value === colorValue);
    if (idx < 0) return;
    if (!pendingGalleryUploads[colorValue]) pendingGalleryUploads[colorValue] = [];
    uploadingGalleryIdx.value = idx;

    // 1) Drop edilen her dosya için anında pending kart push (blob preview ile)
    const queue = files.map((file, i) => {
      const _key = `gallery-${colorValue}-${Date.now()}-${i}`;
      const _previewUrl = file.type?.startsWith("image/") ? URL.createObjectURL(file) : "";
      const entry = { _key, _previewUrl, _file: file };
      pendingGalleryUploads[colorValue].push(entry);
      return entry;
    });

    // 2) Her entry için sıralı upload + per-entry progress
    try {
      for (const entry of queue) {
        uploads.start(entry._key);
        try {
          const url = await api.uploadFile(entry._file);
          if (url) {
            const existing = parseVariantGallery(childData.variant_items[idx]);
            existing.push(url);
            setVariantGallery(idx, existing);
            // Sync to all rows of same color
            const gallery = childData.variant_items[idx].variant_gallery;
            childData.variant_items.forEach((r) => {
              if (r.attribute_value === colorValue) r.variant_gallery = gallery;
            });
          }
          await uploads.finish(entry._key);
        } catch (err) {
          uploads.fail(entry._key);
          toast.error(`${entry._file.name}: ${err.message || t("listingForm.uploadFailedShort")}`);
        } finally {
          // Pending'den çıkar + blob revoke
          const arr = pendingGalleryUploads[colorValue];
          const i = arr.indexOf(entry);
          if (i >= 0) arr.splice(i, 1);
          if (entry._previewUrl) URL.revokeObjectURL(entry._previewUrl);
        }
      }
    } finally {
      uploadingGalleryIdx.value = null;
    }
  }

  function goBack() {
    const returnTo = route.query.returnTo;
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    // Admin: generic Listing listesine; satıcı: kendi ürünleri sayfasına
    router.push(auth.isAdmin ? "/app/Listing" : "/seller-listings");
  }

  onMounted(() => {
    loadCurrencies();
    loadSellerCategories();
    loadDoc();
  });
</script>

<style scoped>
  .section-title {
    @apply text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2;
  }
</style>

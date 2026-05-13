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
            {{ isNew ? "Yeni Ürün" : form.title || docName }}
          </h1>
          <p class="text-xs text-gray-400">{{ isNew ? "Yeni listing oluştur" : docName }}</p>
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
                  ? "Mükemmel"
                  : form.completeness_score >= 70
                    ? "İyi"
                    : form.completeness_score >= 50
                      ? "Orta"
                      : "Geliştirilebilir"
              }}
            </p>
            <button
              type="button"
              class="text-[9px] text-violet-500 hover:underline"
              @click="showCompletenessBreakdown = true"
            >
              Detay
            </button>
          </div>
        </div>
        <button class="hdr-btn-outlined" @click="goBack">Geri</button>
        <button class="hdr-btn-primary" :disabled="saving" @click="saveDoc">
          <AppIcon v-if="saving" name="loader" :size="13" class="animate-spin" />
          <AppIcon v-else name="save" :size="13" />
          {{ isNew ? "Oluştur" : "Kaydet" }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <div v-else>
      <!-- Reddedildi banner -->
      <div
        v-if="!isAdmin && form.status === 'Rejected'"
        class="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3"
      >
        <AppIcon name="alert-circle" :size="16" class="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-xs font-semibold text-red-700 dark:text-red-400">Bu ürün reddedildi</p>
          <p v-if="form.rejection_reason" class="text-xs text-red-600 dark:text-red-300 mt-0.5">
            {{ form.rejection_reason }}
          </p>
          <p class="text-[11px] text-red-500 dark:text-red-400 mt-1">
            Düzenleyip kaydettiğinizde tekrar onaya gönderilir.
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div
        class="flex overflow-x-auto gap-1 mb-4 bg-white dark:bg-[#13131a] border border-gray-200 dark:border-white/8 rounded-xl p-1"
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
        <h3 class="section-title">Temel Bilgiler</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label"
              >Listing Kodu
              <span class="text-gray-400 font-normal text-[10px]">(otomatik)</span></label
            >
            <input
              :value="form.listing_code"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Başlık <span class="text-red-500">*</span></label>
            <input v-model="form.title" type="text" class="form-input" placeholder="Ürün başlığı" />
          </div>
          <div>
            <label class="form-label">Satıcı Profili</label>
            <input
              :value="form.seller_profile"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Durum <span class="text-red-500">*</span></label>
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
            <label class="form-label">Listing Tipi</label>
            <select v-model="form.listing_type" class="form-input">
              <option value="Fixed Price">Fixed Price</option>
              <option value="Auction">Auction</option>
              <option value="RFQ Only">RFQ Only</option>
            </select>
          </div>
          <div>
            <label class="form-label">Kategori</label>
            <select v-model="form.category" class="form-input">
              <option value="">Kategori seçiniz...</option>
              <option v-for="cat in sellerCategories" :key="cat.name" :value="cat.name">
                {{ cat.category_name }}
              </option>
            </select>
            <p v-if="sellerCategories.length === 0" class="text-[10px] text-amber-500 mt-1">
              Onaylanmış kategoriniz yok. Önce
              <a href="#" class="underline" @click.prevent="$router.push('/seller-categories')"
                >kategori ekleyin</a
              >.
            </p>
          </div>
          <!-- Platform Kategorisi -->
          <div class="lg:col-span-2">
            <label class="form-label">Platform Kategorisi</label>
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
                <span v-else class="text-xs">Kategori seçmek için tıklayın...</span>
              </button>
              <button
                v-if="categoryPickerPath.length"
                type="button"
                class="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Temizle"
                @click="clearProductCategory"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
          </div>

          <div>
            <label class="form-label">Marka</label>
            <LinkInput
              v-model="form.brand"
              doctype="Brand"
              placeholder="Marka ara..."
              :filters="[
                ['status', '!=', 'Rejected'],
                ['is_active', '=', 1],
              ]"
            />
          </div>
          <div>
            <label class="form-label">Kondisyon</label>
            <select v-model="form.condition" class="form-input">
              <option value="New">Yeni</option>
              <option value="Used - Like New">Kullanılmış - Yeni Gibi</option>
              <option value="Used - Good">Kullanılmış - İyi</option>
              <option value="Refurbished">Yenilenmiş</option>
            </select>
          </div>
          <div>
            <label class="form-label">Ürün Tipi</label>
            <LinkInput
              v-model="form.product_type"
              doctype="Product Type"
              placeholder="Tip ara..."
              :filters="[['is_active', '=', 1]]"
            />
          </div>
          <div>
            <label class="form-label">Ürün Ailesi</label>
            <LinkInput
              v-model="form.product_family"
              doctype="Product Family"
              placeholder="Aile ara..."
              :filters="[['is_active', '=', 1]]"
            />
          </div>
          <div class="lg:col-span-2">
            <label class="form-label">Özellik Seti</label>
            <LinkInput
              v-model="form.attribute_set"
              doctype="Attribute Set"
              placeholder="Set ara..."
              :filters="[['is_active', '=', 1]]"
            />
            <p v-if="form.attribute_set" class="text-[10px] text-gray-400 mt-1">
              Specs sekmesindeki zorunlu özellikler bu setten gelir.
            </p>
          </div>
        </div>
      </div>

      <!-- ───── Genel tab — Görünürlük & Etiketler (eski Ayarlar tabı) ───── -->
      <div v-show="activeTab === 'details'" class="card space-y-4">
        <h3 class="section-title">Görünürlük & Etiketler</h3>
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
            <label class="form-label">Satış Noktası</label>
            <input
              v-model="form.selling_point"
              type="text"
              class="form-input"
              placeholder="ör: 180 gün en düşük fiyat"
            />
          </div>
        </div>
      </div>

      <!-- ───── TAB: Açıklama ───── -->
      <div v-show="activeTab === 'description'" class="card space-y-4">
        <h3 class="section-title">Açıklama</h3>
        <div>
          <label class="form-label">Kısa Açıklama</label>
          <textarea
            v-model="form.short_description"
            rows="3"
            class="form-input resize-none"
            placeholder="Kısa açıklama..."
          ></textarea>
        </div>
        <div>
          <label class="form-label">Açıklama</label>
          <textarea
            v-model="form.description"
            rows="8"
            class="form-input resize-none font-mono text-xs"
            placeholder="Detaylı ürün açıklaması..."
          ></textarea>
        </div>
      </div>

      <!-- ───── TAB: Fiyatlandırma ───── -->
      <div v-show="activeTab === 'pricing'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">Fiyatlandırma</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Para Birimi <span class="text-red-500">*</span></label>
              <select v-model="form.currency" class="form-input">
                <option value="">Seçiniz...</option>
                <option v-for="c in currencies" :key="c.name" :value="c.name">
                  {{ c.name
                  }}{{
                    c.currency_name && c.currency_name !== c.name ? " — " + c.currency_name : ""
                  }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Listeleme Fiyatı <span class="text-red-500">*</span></label>
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
              <label class="form-label">Satış Fiyatı <span class="text-red-500">*</span></label>
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
              <label class="form-label">İndirim %</label>
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
              <label class="form-label">Numune Fiyatı</label>
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
              >B2B Toplu Fiyatlandırma Etkinleştir</label
            >
          </div>
          <div v-if="form.b2b_enabled">
            <ChildTable
              v-model="childData.pricing_tiers"
              :columns="[
                { key: 'min_qty', label: 'Min Adet', type: 'number', reqd: true },
                { key: 'max_qty', label: 'Max Adet', type: 'number' },
                { key: 'price', label: 'Fiyat', type: 'number', reqd: true },
                { key: 'discount_percentage', label: 'İndirim %', type: 'number' },
              ]"
              child-doctype="Listing Bulk Pricing Tier"
              add-label="Fiyat Kademesi Ekle"
            />
          </div>
        </div>
      </div>

      <!-- ───── TAB: Envanter ───── -->
      <div v-show="activeTab === 'inventory'" class="card space-y-4">
        <h3 class="section-title">Envanter</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Stok Adedi</label>
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
              >Rezerve Adedi
              <span class="text-gray-400 font-normal text-[10px]">(salt okunur)</span></label
            >
            <input
              :value="form.reserved_qty || 0"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label"
              >Mevcut Adedi
              <span class="text-gray-400 font-normal text-[10px]">(salt okunur)</span></label
            >
            <input
              :value="form.available_qty || 0"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Stok Birimi</label>
            <LinkInput v-model="form.stock_uom" doctype="UOM" placeholder="Birim ara..." />
          </div>
          <div>
            <label class="form-label">Min Sipariş Adedi</label>
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
              B2B Toplu Fiyatlandırma aktif olduğu için ilk kademenin Min Adet değerinden alınıyor.
            </p>
            <label class="flex items-center gap-2 cursor-pointer mt-2">
              <input
                v-model="form.sell_in_moq_multiples"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-xs text-gray-700 dark:text-gray-300"
                >Sadece MOQ katlarıyla sat</span
              >
            </label>
            <p
              v-if="form.sell_in_moq_multiples"
              class="text-[11px] text-gray-500 dark:text-gray-400 mt-1"
            >
              Alıcı miktarı {{ form.min_order_qty || 1 }}'{{
                (form.min_order_qty || 1) % 10 === 1 && (form.min_order_qty || 1) !== 11
                  ? "er"
                  : "ar"
              }}
              {{ form.min_order_qty || 1 }}'{{
                (form.min_order_qty || 1) % 10 === 1 && (form.min_order_qty || 1) !== 11
                  ? "er"
                  : "ar"
              }}
              değiştirir.
            </p>
          </div>
          <div>
            <label class="form-label">Max Sipariş Adedi</label>
            <input
              v-model.number="form.max_order_qty"
              type="number"
              min="0"
              class="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label class="form-label">Düşük Stok Eşiği</label>
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
              <span class="text-sm text-gray-700 dark:text-gray-300">Stok Takibi</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.allow_backorders"
                type="checkbox"
                :true-value="1"
                :false-value="0"
                class="form-checkbox rounded text-violet-600 w-4 h-4"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Stoksuz Sipariş İzni</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Medya ───── -->
      <div v-show="activeTab === 'media'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">Ana Görsel</h3>
          <div class="flex items-start gap-4">
            <img
              v-if="form.primary_image"
              :src="form.primary_image"
              class="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-white/10 flex-shrink-0"
              alt="Ana görsel"
            />
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
                    ? "Yükleniyor..."
                    : form.primary_image
                      ? "Değiştir"
                      : "Ana görsel seç"
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
                Kaldır
              </button>
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">Ek Görseller</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              v-for="(img, idx) in childData.listing_images"
              :key="idx"
              class="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3"
            >
              <img
                v-if="img.image"
                :src="img.image"
                class="w-full h-full object-cover"
                :alt="img.alt_text || ''"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <AppIcon name="image" :size="24" class="text-gray-300" />
              </div>
              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
              >
                <label
                  class="cursor-pointer bg-white/20 rounded-lg p-1.5 hover:bg-white/30"
                  title="Görsel değiştir"
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
                  title="Kaldır"
                  @click="removeImageRow(idx)"
                >
                  <AppIcon name="trash-2" :size="14" class="text-white" />
                </button>
              </div>
              <input
                v-model="img.alt_text"
                type="text"
                class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 border-0 outline-none placeholder-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                placeholder="Alt metin..."
              />
            </div>
            <!-- Ekle butonu -->
            <label
              class="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-white/15 cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors flex flex-col items-center justify-center gap-1"
              :class="uploadingImageRow ? 'opacity-60 pointer-events-none' : ''"
            >
              <AppIcon
                :name="uploadingImageRow ? 'loader' : 'plus'"
                :size="20"
                :class="uploadingImageRow ? 'animate-spin text-violet-500' : 'text-gray-400'"
              />
              <span class="text-xs text-gray-400">{{
                uploadingImageRow ? "Yükleniyor..." : "Görsel ekle"
              }}</span>
              <input type="file" accept="image/*" class="hidden" @change="addImageRow($event)" />
            </label>
          </div>
        </div>

        <div class="card">
          <label class="form-label">Video URL</label>
          <input v-model="form.video_url" type="url" class="form-input" placeholder="https://..." />
        </div>
      </div>

      <!-- ───── TAB: Özellikler ───── -->
      <div v-show="activeTab === 'specs'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">Ürün Özellikleri</h3>
          <ChildTable
            v-model="childData.attribute_values"
            :columns="[
              {
                key: 'attribute_label',
                label: 'Özellik Adı',
                type: 'text',
                reqd: true,
                placeholder: 'ör: Renk',
              },
              {
                key: 'attribute_value',
                label: 'Değer',
                type: 'text',
                reqd: true,
                placeholder: 'ör: Kırmızı',
              },
              { key: 'attribute_group', label: 'Grup', type: 'text', placeholder: 'ör: Fiziksel' },
            ]"
            child-doctype="Listing Attribute Value"
            add-label="Özellik Ekle"
          />
        </div>

        <!-- v4: Sertifika yönetimi Sertifikalarım'a taşındı (Image #119 yönlendirme kartı) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="section-title flex items-center gap-2 mb-0">
              <AppIcon name="award" :size="16" class="text-emerald-500" />
              Sertifikalar
            </h3>
            <span class="text-xs text-gray-400">{{ listingCertCount }} kayıt</span>
          </div>
          <div
            class="border-2 border-dashed border-emerald-300 dark:border-emerald-800/40 rounded-lg p-5 text-center"
          >
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Mağaza sertifikalarını
              <strong>Sertifikalarım</strong>
              sayfasından yönet — belge yükleme, süre tracking ve toplu işlemler tek noktada.
            </p>
            <router-link
              to="/my-certifications#product"
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              Sertifikalarım sayfasına git
              <AppIcon name="arrow-right" :size="14" />
            </router-link>
          </div>
        </div>
      </div>

      <!-- ───── TAB: Varyantlar (Alibaba SKU Matrix) ───── -->
      <div v-show="activeTab === 'variants'" class="space-y-4">
        <div class="card space-y-4">
          <div class="flex items-center gap-3">
            <input
              id="has_variants"
              v-model="form.has_variants"
              type="checkbox"
              :true-value="1"
              :false-value="0"
              class="form-checkbox rounded text-violet-600 w-4 h-4"
            />
            <label
              for="has_variants"
              class="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
              >Varyant Var</label
            >
          </div>

          <div v-if="form.has_variants">
            <!-- ADIM 1: Eksen tanımları -->
            <div
              class="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2 space-y-4"
            >
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                Adım 1 — Varyant Eksenleri
              </h4>

              <div
                v-for="(axis, ai) in variantAxes"
                :key="ai"
                class="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400"
                      >Eksen {{ ai + 1 }}</span
                    >
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="axis.hasImage"
                        type="checkbox"
                        class="form-checkbox rounded text-violet-500 w-3 h-3"
                        @change="syncAxesConfig()"
                      />
                      <span class="text-[10px] text-gray-400">Görselli</span>
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
                    <label class="text-[10px] text-gray-500 mb-0.5 block">Eksen adı</label>
                    <input
                      v-model="axis.name"
                      type="text"
                      :placeholder="ai === 0 ? 'Renk' : 'Beden'"
                      class="form-input py-1.5 text-sm"
                      @blur="syncAxesConfig()"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-gray-500 mb-0.5 block"
                      >Değerler <span class="text-gray-400">(virgülle ayır)</span></label
                    >
                    <input
                      v-model="axis.valuesStr"
                      type="text"
                      :placeholder="ai === 0 ? 'Siyah, Kırmızı, Mavi, Beyaz' : 'S, M, L, XL, 2XL'"
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
                  Eksen Ekle
                </button>
                <span class="text-[10px] text-gray-400"
                  >"Görselli" işaretli eksenler storefront'ta fotoğraflı gösterilir</span
                >
              </div>

              <button
                type="button"
                class="flex items-center gap-1.5 px-4 py-2 rounded-md bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
                @click="generateSkuMatrix()"
              >
                <AppIcon name="grid" :size="14" />
                Matris Oluştur ({{ matrixPreviewCount }} SKU)
              </button>
            </div>

            <!-- ADIM 2: SKU Matrisi (tablo veya grid) -->
            <div v-if="childData.variant_items.length > 0" class="mt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Adım 2 — SKU Matrisi ({{ childData.variant_items.length }} kombinasyon)
                </h4>
                <span class="text-[11px] text-gray-400">Her hücrede stok ve fiyat girin</span>
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
                        {{ variantAxis1Name || "Eksen 1" }} ↓ / {{ variantAxis2Name }} →
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
                            :title="isColorDefault(v1) ? 'Varsayılan renk' : 'Varsayılan yap'"
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
                            placeholder="Stok"
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
                            placeholder="Fiyat"
                            class="w-full text-center bg-transparent border-0 py-0.5 text-[10px] text-gray-400 focus:outline-none focus:text-gray-600"
                          />
                        </template>
                        <span v-else class="text-[10px] text-gray-300">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p class="text-[10px] text-gray-400 mt-2">
                  🔴 Kırmızı hücreler = stok 0 (tükenmiş). Stok 0 olan kombinasyonlar storefront'ta
                  devre dışı görünür.
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
                        {{ axis.name || "Eksen" }}
                      </th>
                      <th
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs text-center w-10"
                      >
                        ⭐
                      </th>
                      <th
                        class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs w-16"
                      >
                        Görsel
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        Fiyat
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        Stok
                      </th>
                      <th class="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                        SKU
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
                          placeholder="SKU"
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
                  {{ imgAxis.name }} Görselleri & Galeri
                </h4>
                <div class="space-y-3">
                  <div v-for="v1 in imgAxis.values" :key="v1" class="flex items-start gap-3">
                    <label
                      class="relative flex items-center justify-center w-14 h-14 rounded-lg border border-dashed border-gray-300 dark:border-white/15 cursor-pointer hover:border-violet-400 transition-colors overflow-hidden group flex-shrink-0"
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
                          +{{ getColorGalleryCount(v1) }} ek görsel
                        </button>
                      </div>
                      <div
                        v-if="expandedColorGallery === v1"
                        class="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-1"
                      >
                        <div
                          v-for="(url, gi) in getColorGalleryUrls(v1)"
                          :key="gi"
                          class="relative group aspect-square rounded overflow-hidden border border-gray-200 dark:border-white/10"
                        >
                          <img :src="url" class="w-full h-full object-cover" />
                          <button
                            class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            @click="removeColorGalleryImage(v1, gi)"
                          >
                            <AppIcon name="x" :size="10" />
                          </button>
                        </div>
                        <label
                          class="aspect-square rounded border-2 border-dashed border-violet-300 flex items-center justify-center cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20"
                        >
                          <AppIcon name="image-plus" :size="16" class="text-violet-500" />
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
                  Ana görsel + ek görseller storefront'ta renk seçildiğinde galeriyi oluşturur.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">Özelleştirme Seçenekleri</h3>
          <ChildTable
            v-model="childData.customization_options"
            :columns="[
              {
                key: 'option_name',
                label: 'Seçenek Adı',
                type: 'text',
                reqd: true,
                placeholder: 'ör: Kişiselleştirme',
              },
              { key: 'description', label: 'Açıklama', type: 'text' },
              { key: 'additional_cost', label: 'Ek Ücret', type: 'number' },
              { key: 'min_qty', label: 'Min Adet', type: 'number' },
            ]"
            child-doctype="Listing Customization Option"
            add-label="Seçenek Ekle"
          />
        </div>
      </div>

      <!-- ───── TAB: Kargo ───── -->
      <div v-show="activeTab === 'shipping'" class="space-y-4">
        <div class="card space-y-4">
          <h3 class="section-title">Kargo Bilgileri</h3>
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
                >Ücretsiz Kargo</label
              >
            </div>
            <div>
              <label class="form-label">Kargo Ağırlığı (kg)</label>
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
              <label class="form-label">Kargolama Günü</label>
              <input
                v-model.number="form.handling_days"
                type="number"
                min="0"
                class="form-input"
                placeholder="1"
              />
            </div>
            <div>
              <label class="form-label">Kargolanan Ülke</label>
              <LinkInput
                v-model="form.ships_from_country"
                doctype="Country"
                placeholder="Ülke ara..."
              />
            </div>
            <div>
              <label class="form-label">Kargolanan Şehir</label>
              <input
                v-model="form.ships_from_city"
                type="text"
                class="form-input"
                placeholder="Şehir"
              />
            </div>
            <div>
              <label class="form-label">Menşei Ülke</label>
              <LinkInput
                v-model="form.country_of_origin"
                doctype="Country"
                placeholder="Ülke ara..."
              />
            </div>
          </div>
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">Paket Boyutları</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Paket Tipi</label>
              <select v-model="form.package_type" class="form-input">
                <option value="">Seçiniz...</option>
                <option>Karton Kutu</option>
                <option>Poşet</option>
                <option>Ahşap Kasa</option>
                <option>Palet</option>
                <option>File</option>
                <option>Torba</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label class="form-label">Adet / Paket</label>
              <input
                v-model.number="form.units_per_package"
                type="number"
                min="0"
                class="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label class="form-label">Uzunluk (cm)</label>
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
              <label class="form-label">Genişlik (cm)</label>
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
              <label class="form-label">Yükseklik (cm)</label>
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
              <label class="form-label">Ağırlık (kg)</label>
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
            Karton Ölçüleri
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Uzunluk (cm)</label>
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
              <label class="form-label">Genişlik (cm)</label>
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
              <label class="form-label">Yükseklik (cm)</label>
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
              <label class="form-label">Brüt Ağırlık (kg)</label>
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
          <h3 class="section-title">Teslim Süreleri</h3>
          <ChildTable
            v-model="childData.lead_time_ranges"
            :columns="[
              { key: 'min_qty', label: 'Min Adet', type: 'number', reqd: true },
              { key: 'max_qty', label: 'Max Adet', type: 'number' },
              { key: 'lead_days', label: 'Gün', type: 'number', reqd: true },
            ]"
            child-doctype="Listing Lead Time Range"
            add-label="Süre Ekle"
          />
        </div>

        <div class="card space-y-4">
          <h3 class="section-title">Kargo Yöntemleri</h3>
          <ChildTable
            v-model="childData.shipping_methods"
            :columns="[
              { key: 'shipping_method_name', label: 'Yöntem Adı', type: 'text', reqd: true },
              { key: 'cost', label: 'Ücret', type: 'number', reqd: true },
              { key: 'min_days', label: 'Min Gün', type: 'number' },
              { key: 'max_days', label: 'Max Gün', type: 'number' },
            ]"
            child-doctype="Shipping Method Item"
            add-label="Yöntem Ekle"
          />
        </div>
      </div>

      <!-- ───── TAB: İstatistikler ───── -->
      <div v-show="activeTab === 'statistics'" class="space-y-5">
        <div v-if="statsLoading" class="card text-center py-12">
          <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
          <p class="text-sm text-gray-400 mt-3">İstatistikler yükleniyor...</p>
        </div>
        <template v-else-if="statsData">
          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Görüntülenme</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatK(statsData.summary.views) }}
              </p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Sipariş</p>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatK(statsData.summary.orders) }}
              </p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Gelir</p>
              <p class="text-xl font-bold text-violet-600 dark:text-violet-400">
                {{ formatCurrency(statsData.summary.revenue) }}
              </p>
              <p class="text-[10px] text-gray-400">{{ statsData.summary.currency }}</p>
            </div>
            <div class="card !p-4 text-center">
              <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Dönüşüm</p>
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
                  {{ statsData.summary.reviewCount }} değerlendirme
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
                <p class="text-[10px] text-gray-400">Favorilerde</p>
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
                <p class="text-[10px] text-gray-400">Stok</p>
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
                <p class="text-[10px] text-gray-400">Satış (30 gün)</p>
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
                Görüntülenme & Sipariş Trendi
              </h3>
              <span class="text-[11px] text-gray-400">Son 30 gün</span>
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
                Gelir Trendi
              </h3>
              <span class="text-[11px] text-gray-400">Son 30 gün</span>
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
              Varyant Performansı
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
                  >{{ v.orders || v.stock || 0 }} {{ v.orders ? "sipariş" : "stok" }}</span
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
          <p>İstatistik verisi yüklenemedi.</p>
        </div>
      </div>

      <!-- ───── TAB: SEO ───── -->
      <div v-show="activeTab === 'seo'" class="card space-y-4">
        <h3 class="section-title">SEO</h3>
        <div>
          <label class="form-label">Route</label>
          <input v-model="form.route" type="text" class="form-input" placeholder="/urun/gömlek" />
        </div>
        <div>
          <label class="form-label">Meta Başlık</label>
          <input
            v-model="form.meta_title"
            type="text"
            class="form-input"
            placeholder="Sayfa başlığı"
          />
        </div>
        <div>
          <label class="form-label">Meta Açıklama</label>
          <textarea
            v-model="form.meta_description"
            rows="3"
            class="form-input resize-none"
            placeholder="Sayfa açıklaması..."
          ></textarea>
        </div>
        <div>
          <label class="form-label">Meta Anahtar Kelimeler</label>
          <textarea
            v-model="form.meta_keywords"
            rows="2"
            class="form-input resize-none"
            placeholder="kelime1, kelime2, ..."
          ></textarea>
        </div>
      </div>

      <!-- ───── TAB: Sistem ───── -->
      <div v-show="activeTab === 'system'" class="card space-y-4">
        <h3 class="section-title">
          Sistem <span class="font-normal text-xs text-gray-400">(salt okunur)</span>
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label class="form-label">ERPNext Ürünü</label>
            <input
              :value="form.erpnext_item || '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Yayınlanma Tarihi</label>
            <input
              :value="form.published_at ? new Date(form.published_at).toLocaleString('tr-TR') : '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Oluşturulma</label>
            <input
              :value="form.creation ? new Date(form.creation).toLocaleString('tr-TR') : '-'"
              readonly
              class="form-input opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="form-label">Son Güncelleme</label>
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
              Platform Kategorisi Seç
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
            <span>Kök</span>
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
              placeholder="Kategori ara (örn: pantolon, kozmetik)…"
              class="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#13131a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              @input="onCategorySearchInput"
            />
            <button
              v-if="categoryPicker.search"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              title="Aramayı temizle"
              @click="clearCategorySearch"
            >
              <AppIcon name="x" :size="13" />
            </button>
          </div>
          <p
            v-if="categoryPicker.search && categoryPicker.search.length < 2"
            class="text-[10px] text-gray-400 mt-1.5 px-1"
          >
            En az 2 karakter girin
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
              categoryPicker.searching ? "Aranıyor..." : "Yükleniyor..."
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
              <p class="text-sm">"{{ categoryPicker.search }}" için sonuç yok</p>
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
                  Seç
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
            <p class="text-sm">Bu seviyede kategori yok</p>
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
                  {{ cat.child_count }} alt kategori
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
                  Seç
                </button>
                <!-- Alt kategori varsa hem seç hem drill-down ok -->
                <template v-else>
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg text-[11px] font-semibold border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all"
                    @click.stop="confirmCategory(cat)"
                  >
                    Seç
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
            Seçimi Temizle
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors"
            @click="categoryPicker.show = false"
          >
            Kapat
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
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Tamamlanma Detayı</h3>
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
          <p class="text-[10px] text-gray-400 mb-2">Eksik alanlar:</p>
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
          Kapat
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import ChildTable from "@/components/common/ChildTable.vue";

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const auth = useAuthStore();

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
  const expandedVariantIdx = ref(null);
  const sellerCategories = ref([]);
  const currencies = ref([]);
  // v4: productCertOptions / selectedProductCerts kaldırıldı — yönetim Sertifikalarım'a taşındı

  const docName = computed(() => decodeURIComponent(route.params.name || ""));
  const isNew = computed(() => docName.value === "new");
  const isAdmin = computed(() => auth.isAdmin);

  const adminOnlyStatuses = ["Pending", "Rejected", "Draft"];

  const statusOptions = [
    { value: "Pending", label: "Onay Bekliyor" },
    { value: "Draft", label: "Taslak" },
    { value: "Active", label: "Aktif" },
    { value: "Paused", label: "Duraklatıldı" },
    { value: "Out of Stock", label: "Stok Yok" },
    { value: "Archived", label: "Arşivlendi" },
    { value: "Rejected", label: "Reddedildi" },
  ];

  const tabs = [
    { key: "details", label: "Genel", icon: "file-text" },
    { key: "description", label: "Açıklama", icon: "align-left" },
    { key: "pricing", label: "Fiyatlandırma", icon: "tag" },
    { key: "inventory", label: "Envanter", icon: "package" },
    { key: "media", label: "Medya", icon: "image" },
    { key: "specs", label: "Özellikler", icon: "list" },
    { key: "variants", label: "Varyantlar", icon: "layers" },
    { key: "shipping", label: "Kargo", icon: "truck" },
    { key: "statistics", label: "İstatistikler", icon: "bar-chart-2" },
    { key: "seo", label: "SEO", icon: "search" },
    { key: "system", label: "Sistem", icon: "cpu" },
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
    { key: "is_featured", label: "Öne Çıkan" },
    { key: "is_best_seller", label: "Çok Satan" },
    { key: "is_new_arrival", label: "Yeni Gelenler" },
    { key: "is_visible", label: "Görünür" },
    { key: "is_searchable", label: "Aranabilir" },
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
                label: "Görüntülenme",
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
                label: "Sipariş",
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
                  text: "Görüntülenme",
                  color: "#8b5cf6",
                  font: { size: 10 },
                },
              },
              y1: {
                position: "right",
                grid: { drawOnChartArea: false },
                ticks: { color: "#10b981", font: { size: 10 } },
                title: { display: true, text: "Sipariş", color: "#10b981", font: { size: 10 } },
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
                label: "Gelir",
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
      });
      categoryPicker.value.searchResults = res.message || [];
    } catch (err) {
      categoryPicker.value.searchResults = [];
      toast.error("Arama başarısız: " + (err.message || ""));
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
      });
      categoryPicker.value.items = res.message || [];
    } catch (err) {
      toast.error("Kategoriler yüklenemedi: " + (err.message || ""));
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
          toast.error("Bu ürüne erişim yetkiniz yok");
          router.push("/seller-listings");
          return;
        }
      }

      Object.keys(form).forEach((k) => {
        if (data[k] !== undefined) form[k] = data[k];
      });

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
      childData.customization_options = (data.customization_options || []).map(clean);
      // Init axis inputs from existing variants
      nextTick(() => initAxisFromExistingVariants());
      childData.lead_time_ranges = (data.lead_time_ranges || []).map(clean);
      childData.shipping_methods = (data.shipping_methods || []).map(clean);
    } catch (err) {
      toast.error(err.message || "Yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  function clean(row) {
    const { name, parent, parenttype, parentfield, idx, doctype, ...rest } = row;
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
    if (!form.title) {
      toast.error("Başlık zorunludur");
      return;
    }
    if (!form.currency) {
      toast.error("Para birimi zorunludur");
      return;
    }
    if (!form.base_price) {
      toast.error("Listeleme Fiyatı zorunludur");
      return;
    }
    if (!form.selling_price) {
      toast.error("Satış fiyatı zorunludur");
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
        toast.success("Ürün oluşturuldu");
        const returnTo = route.query.returnTo;
        if (returnTo) router.push(returnTo);
        else if (newName)
          router.replace(`/app/Listing/${encodeURIComponent(newName)}?returnTo=/seller-listings`);
      } else {
        await api.updateDoc("Listing", docName.value, payload);
        toast.success("Kaydedildi");
        await loadDoc();
      }
    } catch (err) {
      toast.error(err.message || "Kayıt hatası");
    } finally {
      saving.value = false;
    }
  }

  // ── Görsel yükleme ────────────────────────────────────────────────────────────
  async function uploadImage(fieldName, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadingField.value = fieldName;
    try {
      const url = await doUpload(file);
      form[fieldName] = url;
      toast.success("Görsel yüklendi");
    } catch (err) {
      toast.error(err.message || "Yükleme hatası");
    } finally {
      uploadingField.value = null;
      event.target.value = "";
    }
  }

  async function addImageRow(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadingImageRow.value = true;
    try {
      const url = await doUpload(file);
      childData.listing_images.push({
        image: url,
        alt_text: "",
        sort_order: childData.listing_images.length + 1,
      });
    } catch (err) {
      toast.error(err.message || "Yükleme hatası");
    } finally {
      uploadingImageRow.value = false;
      event.target.value = "";
    }
  }

  async function uploadImageRow(idx, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await doUpload(file);
      childData.listing_images[idx].image = url;
      toast.success("Görsel güncellendi");
    } catch (err) {
      toast.error(err.message || "Yükleme hatası");
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
    try {
      const url = await api.uploadFile(file);
      childData.variant_items[idx].variant_image = url;
    } catch (err) {
      toast.error(err.message || "Yükleme hatası");
    } finally {
      uploadingVariantIdx.value = null;
      event.target.value = "";
    }
  }

  // ── SKU Matrix Logic (N-axis) ─────────────────────────────────────────────────
  const variantAxes = reactive([{ name: "Renk", valuesStr: "", hasImage: true }]);

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
      toast.error("En az bir eksen ve değer girin");
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
    toast.success(`${newRows.length} SKU kombinasyonu oluşturuldu`);
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
    if (!file) return;
    try {
      const url = await api.uploadFile(file);
      // Aynı renkteki TÜM satırlara aynı görseli ata
      for (const row of childData.variant_items) {
        if (row.attribute_value === colorValue) {
          row.variant_image = url;
        }
      }
      toast.success(`${colorValue} görseli yüklendi`);
    } catch (err) {
      toast.error(err.message || "Yükleme hatası");
    }
    event.target.value = "";
  }

  function initAxisFromExistingVariants() {
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
    const idx = childData.variant_items.findIndex((r) => r.attribute_value === color);
    if (idx >= 0) {
      await uploadVariantGalleryImages(idx, event);
      // Sync gallery to ALL rows of same color
      const gallery = childData.variant_items[idx].variant_gallery;
      childData.variant_items.forEach((r) => {
        if (r.attribute_value === color) r.variant_gallery = gallery;
      });
    }
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

  function toggleVariantGallery(idx) {
    expandedVariantIdx.value = expandedVariantIdx.value === idx ? null : idx;
  }

  function removeVariantGalleryImage(idx, imgIdx) {
    const current = parseVariantGallery(childData.variant_items[idx]);
    current.splice(imgIdx, 1);
    setVariantGallery(idx, current);
  }

  async function uploadVariantGalleryImages(idx, event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    uploadingGalleryIdx.value = idx;
    try {
      const existing = parseVariantGallery(childData.variant_items[idx]);
      for (const file of files) {
        try {
          const url = await api.uploadFile(file);
          if (url) existing.push(url);
        } catch (err) {
          toast.error(`${file.name}: ${err.message || "Yüklenemedi"}`);
        }
      }
      setVariantGallery(idx, existing);
      toast.success(`${files.length} görsel eklendi`);
    } finally {
      uploadingGalleryIdx.value = null;
      event.target.value = "";
    }
  }

  async function doUpload(file) {
    return api.uploadFile(file);
  }

  function goBack() {
    const returnTo = route.query.returnTo;
    if (returnTo) router.push(returnTo);
    else router.push("/seller-listings");
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

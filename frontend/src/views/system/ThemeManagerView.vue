<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="$router.push('/dashboard')"
          class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          <i class="fas fa-arrow-left text-xs"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">Site Teması</h1>
          <p class="text-xs text-gray-400">Tüm butonların görünümünü ve davranışını tek yerden yönetin</p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <a
          v-if="storefrontUrl"
          :href="storefrontUrl"
          target="_blank"
          class="hdr-btn-outlined text-xs"
        >
          <i class="fas fa-external-link mr-1.5"></i>Canlı Site
        </a>
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          @click="discardChanges"
          title="Kaydedilmemiş değişiklikleri at"
        >
          <i class="fas fa-undo mr-1.5 text-xs"></i>Değişiklikleri Geri Al
        </button>
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': saving }"
          :disabled="saving"
          @click="confirmResetDefaults"
          title="Tüm özelleştirmeleri silip fabrika ayarlarına dön"
        >
          <i class="fas fa-rotate-left mr-1.5 text-xs"></i>Varsayılana Dön
        </button>
        <button
          class="hdr-btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          @click="saveChanges"
        >
          <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'" class="mr-1.5 text-xs"></i>
          {{ saving ? 'Kaydediliyor...' : hasChanges ? `Kaydet (${dirtyCount})` : 'Kaydet' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
      <p class="text-sm text-gray-400 mt-3">Tema ayarları yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <i class="fas fa-triangle-exclamation text-2xl text-red-500"></i>
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">Yükleme Hatası</h3>
      <p class="text-xs text-gray-400 mb-3">{{ loadError }}</p>
      <button class="hdr-btn-outlined text-xs" @click="loadSettings">
        <i class="fas fa-rotate mr-1.5"></i>Tekrar Dene
      </button>
    </div>

    <!-- Editor -->
    <template v-else>
      <!-- Tab switcher -->
      <div class="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'palette'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'palette'"
        >
          <i class="fas fa-palette mr-1.5"></i>Palet
          <span class="text-[10px] text-gray-400 ml-1">({{ paletteTokenGroups.length }})</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'typography'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'typography'"
        >
          <i class="fas fa-font mr-1.5"></i>Tipografi
          <span class="text-[10px] text-gray-400 ml-1">({{ typographyTokenGroups.length }})</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'spacing'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'spacing'"
        >
          <i class="fas fa-ruler mr-1.5"></i>Spacing & Radius
          <span class="text-[10px] text-gray-400 ml-1">({{ radiusTokenGroups.length + spacingTokenGroups.length }})</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'forms'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'forms'"
        >
          <i class="fas fa-keyboard mr-1.5"></i>Form Elemanları
          <span class="text-[10px] text-gray-400 ml-1">({{ inputTokenGroups.length + checkboxTokenGroups.length + quantityTokenGroups.length }})</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === 'components'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'components'"
        >
          <i class="fas fa-cube mr-1.5"></i>Butonlar
          <span class="text-[10px] text-gray-400 ml-1">({{ buttonTokenGroups.length }})</span>
        </button>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <!-- LEFT: Form sections -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <div
            v-for="group in groups"
            :key="group.id"
            class="card"
          >
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <i class="fas text-amber-500" :class="iconClassFor(group.icon)"></i>
                  {{ group.title }}
                </h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ group.subtitle }}</p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  v-if="group.scale"
                  type="button"
                  class="text-[10px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded whitespace-nowrap transition-colors"
                  @click="openScaleModal(group)"
                  title="Tek baz renkten 50→950 scale üret"
                >
                  <i class="fas fa-wand-magic-sparkles mr-1"></i>Oto Üret
                </button>
                <span
                  v-if="dirtyCountInGroup(group) > 0"
                  class="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap"
                >
                  {{ dirtyCountInGroup(group) }} değişiklik
                </span>
              </div>
            </div>

            <div class="space-y-3">
              <div
                v-for="token in group.tokens"
                :key="token.var"
                class="grid grid-cols-12 gap-3 items-center"
              >
                <label class="col-span-12 sm:col-span-4 text-xs font-semibold text-gray-600 flex items-center gap-2">
                  {{ token.label }}
                  <span
                    v-if="isDirty(token.var)"
                    class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
                    title="Değiştirildi"
                  ></span>
                </label>

                <!-- Color -->
                <div v-if="token.type === 'color'" class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="color"
                    :value="colorAsHex(getValue(token.var))"
                    @input="onColorInput(token.var, $event)"
                    class="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    :value="getValue(token.var)"
                    @input="onTextInput(token.var, $event)"
                    class="form-input text-xs flex-1 font-mono"
                    :placeholder="String(token.default)"
                  />
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>

                <!-- Range -->
                <div v-else-if="token.type === 'range'" class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="range"
                    :min="token.min"
                    :max="token.max"
                    :step="token.step"
                    :value="numericPart(getValue(token.var))"
                    @input="onRangeInput(token, $event)"
                    class="flex-1"
                  />
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      :min="token.min"
                      :max="token.max"
                      :step="token.step"
                      :value="numericPart(getValue(token.var))"
                      @input="onRangeInput(token, $event)"
                      class="form-input text-xs w-20 text-right"
                    />
                    <span v-if="token.unit" class="text-[10px] text-gray-400 w-6">{{ token.unit }}</span>
                  </div>
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>

                <!-- Text -->
                <div v-else class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="text"
                    :value="getValue(token.var)"
                    @input="onTextInput(token.var, $event)"
                    class="form-input text-xs flex-1"
                    :placeholder="String(token.default)"
                  />
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Info note: Bileşenler sekmesinde -->
          <div
            v-if="activeTab === 'components'"
            class="card bg-amber-50/50 border border-amber-100"
          >
            <div class="flex gap-3">
              <i class="fas fa-circle-info text-amber-500 mt-0.5"></i>
              <div class="text-xs text-amber-900 space-y-1.5">
                <p class="font-semibold">Ortak ayarlar hem dolu hem outline butonu etkiler.</p>
                <p class="text-amber-700">
                  Köşe yuvarlaklığı, padding, yazı boyutu ve kalınlığı iki varyant için ortaktır
                  (CSS tarafında aynı değişkeni paylaşıyorlar). Sadece arka plan, yazı rengi ve
                  çerçeve gibi ayırıcı özellikler varyanta özeldir.
                </p>
              </div>
            </div>
          </div>

          <!-- Info note: Palet sekmesinde -->
          <div
            v-if="activeTab === 'palette'"
            class="card bg-amber-50/50 border border-amber-100"
          >
            <div class="flex gap-3">
              <i class="fas fa-circle-info text-amber-500 mt-0.5"></i>
              <div class="text-xs text-amber-900 space-y-1.5">
                <p class="font-semibold">Palet değişiklikleri TÜM site genelini etkiler.</p>
                <p class="text-amber-700">
                  Primary, secondary ve accent scale'leri butonlar, linkler, border-focus, badge,
                  mega menü, mobil kategori barı gibi her yeri besler. Tek baz renkten 11 ton
                  üretmek için her scale grubunun sağ üstündeki
                  <i class="fas fa-wand-magic-sparkles mx-0.5"></i><b>Oto Üret</b> butonunu
                  kullanabilirsiniz. Hatalı sonuçta "Varsayılana Dön" güvenli çıkıştır.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Live preview (sticky) -->
        <div class="col-span-12 lg:col-span-4">
          <div class="card sticky top-4">
            <h3 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-eye text-amber-500"></i>
              Canlı Önizleme
            </h3>

            <div class="space-y-4" :style="previewVars">
              <!-- Palet swatch grid (sadece palet sekmesinde) -->
              <template v-if="activeTab === 'palette'">
                <div v-for="sg in paletteSwatchGroups" :key="sg.id">
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">{{ sg.title }}</p>
                  <div class="grid grid-cols-11 gap-0.5">
                    <div
                      v-for="sw in sg.swatches"
                      :key="sw.var"
                      class="aspect-square rounded-sm border border-gray-200"
                      :style="{ background: sw.color }"
                      :title="`${sw.var} — ${sw.color}`"
                    ></div>
                  </div>
                  <div class="flex justify-between text-[9px] text-gray-400 mt-0.5 px-0.5">
                    <span>50</span><span>500</span><span>950</span>
                  </div>
                </div>

                <!-- Tipik kullanım örnekleri -->
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Tipik Kullanım</p>
                  <div class="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        :style="{
                          background: getValue('--color-primary-50'),
                          color: getValue('--color-primary-700'),
                        }"
                      >Badge 50/700</span>
                      <span
                        class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        :style="{
                          background: getValue('--color-accent-100'),
                          color: getValue('--color-accent-700'),
                        }"
                      >Accent</span>
                      <span
                        class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        :style="{
                          background: getValue('--color-success-50'),
                          color: getValue('--color-success-700'),
                        }"
                      >Başarılı</span>
                    </div>
                    <div>
                      <a
                        href="#"
                        class="text-xs font-medium"
                        :style="{ color: getValue('--color-text-link') }"
                        @click.prevent
                      >Ürün sayfasına git →</a>
                    </div>
                    <div class="text-[11px]" :style="{ color: getValue('--color-text-primary') }">
                      Primary metin —
                      <span :style="{ color: getValue('--color-text-secondary') }">secondary</span> —
                      <span :style="{ color: getValue('--color-text-tertiary') }">tertiary</span>
                    </div>
                    <div
                      class="rounded p-2 text-[11px]"
                      :style="{
                        background: getValue('--color-surface-muted'),
                        border: `1px solid ${getValue('--color-border-default')}`,
                        color: getValue('--color-text-primary'),
                      }"
                    >
                      Kart • surface-muted + border-default
                    </div>
                  </div>
                </div>
              </template>

              <!-- Form elemanları preview -->
              <template v-if="activeTab === 'forms'">
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Normal</p>
                  <input class="th-preview-input" placeholder="Örnek input metni" />
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Focus (Tıklanma)</p>
                  <input class="th-preview-input th-preview-input--focus" value="Focus durumu" readonly />
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Disabled</p>
                  <input class="th-preview-input" disabled value="Devre dışı" />
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Error</p>
                  <input class="th-preview-input th-preview-input--error" value="Hatalı değer" readonly />
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Select</p>
                  <select class="th-preview-input th-preview-select">
                    <option>Birinci seçenek</option>
                    <option>İkinci seçenek</option>
                  </select>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Textarea</p>
                  <textarea class="th-preview-input th-preview-textarea" rows="2" placeholder="Çok satırlı..."></textarea>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Boyutlar (SM / MD / LG)</p>
                  <div class="flex flex-col gap-1.5">
                    <input class="th-preview-input th-preview-input--sm" placeholder="Small (toolbar)" />
                    <input class="th-preview-input" placeholder="Medium (default)" />
                    <input class="th-preview-input th-preview-input--lg" placeholder="Large (auth)" />
                  </div>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Checkbox</p>
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span class="th-preview-checkbox"></span>
                    <span class="th-preview-checkbox th-preview-checkbox--checked">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                    </span>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Quantity Stepper</p>
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="th-preview-quantity">
                      <button type="button" class="th-preview-quantity__button">−</button>
                      <input type="text" class="th-preview-quantity__input" value="1" readonly />
                      <button type="button" class="th-preview-quantity__button">+</button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Buton örnekleri (her iki sekmede) -->
              <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase mb-2">Dolu Buton</p>
                <div class="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  <button type="button" class="preview-btn preview-btn-solid">Normal</button>
                  <button type="button" class="preview-btn preview-btn-solid preview-btn-hover">Hover</button>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase mb-2">Outline Buton</p>
                <div class="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  <button type="button" class="preview-btn preview-btn-outline">Normal</button>
                  <button type="button" class="preview-btn preview-btn-outline preview-btn-hover-outline">Hover</button>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
              <div v-if="lastUpdatedAt">Son kayıt: {{ lastUpdatedAt }}</div>
              <div v-if="lastUpdatedBy">Güncelleyen: {{ lastUpdatedBy }}</div>
              <div v-if="!hasChanges && !lastUpdatedAt">Henüz kayıt yok</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Scale generator modal -->
    <div
      v-if="showScaleModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showScaleModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-wand-magic-sparkles text-amber-500"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900">
              {{ scaleModalGroup?.title }} — Oto Üret
            </h3>
            <p class="text-xs text-gray-500 mt-1">
              Tek bir baz renk seçin. 50 (en açık) → 950 (en koyu) ton dizisi
              otomatik üretilir. Henüz kaydetmez, sadece draft'a yazar.
            </p>
          </div>
        </div>

        <div class="mb-4">
          <label class="text-xs font-semibold text-gray-600 mb-2 block">Baz Renk (500 tonu)</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="scaleBaseColor"
              @input="onScaleBaseInput"
              class="w-12 h-12 rounded border border-gray-200 cursor-pointer flex-shrink-0"
            />
            <input
              type="text"
              :value="scaleBaseColor"
              @input="onScaleBaseInput"
              class="form-input text-sm flex-1 font-mono"
              placeholder="#cc9900"
            />
          </div>
        </div>

        <div class="mb-5">
          <label class="text-xs font-semibold text-gray-600 mb-2 block">Önizleme</label>
          <div class="grid grid-cols-11 gap-0.5 rounded overflow-hidden">
            <div
              v-for="(hex, step) in scalePreview"
              :key="step"
              class="aspect-square relative"
              :style="{ background: hex }"
              :title="`${step}: ${hex}`"
            >
              <span class="absolute bottom-0 left-0 right-0 text-center text-[8px] text-white/70 font-mono leading-none pb-0.5">{{ step }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <button class="hdr-btn-outlined text-xs" @click="showScaleModal = false">Vazgeç</button>
          <button class="hdr-btn-primary text-xs" @click="applyScaleToDraft">
            <i class="fas fa-check mr-1.5"></i>Draft'a Uygula
          </button>
        </div>
      </div>
    </div>

    <!-- Reset confirm modal -->
    <div
      v-if="showResetModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showResetModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-triangle-exclamation text-red-500"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-900">Varsayılana Dönülsün mü?</h3>
            <p class="text-xs text-gray-500 mt-1">
              Tüm özel buton ayarları silinecek ve site orijinal görünüme dönecek.
              Bu işlem hemen kaydedilir ve geri alınamaz.
            </p>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button class="hdr-btn-outlined text-xs" @click="showResetModal = false">Vazgeç</button>
          <button class="hdr-btn-primary text-xs" style="background:#ef4444" @click="resetToDefaults">
            <i class="fas fa-rotate-left mr-1.5"></i>Evet, Varsayılana Dön
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import {
  buttonTokenGroups,
  paletteTokenGroups,
  typographyTokenGroups,
  radiusTokenGroups,
  spacingTokenGroups,
  inputTokenGroups,
  checkboxTokenGroups,
  quantityTokenGroups,
  allTokenGroups,
  buildDefaultsMap,
} from '@/data/themeTokens'
import { generateScale, scaleToOverrides } from '@/utils/colorScale'

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const showResetModal = ref(false)

// Backend'den gelen "kaydedilmiş" override'lar
const loaded = ref({})
// Kullanıcının değiştirdiği çalışan kopya
const draft = ref({})

const lastUpdatedAt = ref('')
const lastUpdatedBy = ref('')

const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || ''

// Sekme durumu: 'palette' | 'typography' | 'spacing' | 'forms' | 'components'
const activeTab = ref('palette')

// Aktif sekmeye göre gösterilecek gruplar
const groups = computed(() => {
  switch (activeTab.value) {
    case 'palette':    return paletteTokenGroups
    case 'typography': return typographyTokenGroups
    case 'spacing':    return [...radiusTokenGroups, ...spacingTokenGroups]
    case 'forms':      return [
      ...inputTokenGroups,
      ...checkboxTokenGroups,
      ...quantityTokenGroups,
    ]
    case 'components': return buttonTokenGroups
    default:           return paletteTokenGroups
  }
})

// Defaults tüm token'lar için — sekme değişse bile çalışsın
const defaults = buildDefaultsMap(allTokenGroups)

// Scale generator modal durumu
const showScaleModal = ref(false)
const scaleModalGroup = ref(null)
const scaleBaseColor = ref('#cc9900')
const scalePreview = ref({})

// ---------- Computed ----------

const dirtyCount = computed(() => {
  let n = 0
  const keys = new Set([...Object.keys(draft.value), ...Object.keys(loaded.value)])
  for (const k of keys) {
    if ((draft.value[k] || '') !== (loaded.value[k] || '')) n++
  }
  return n
})

const hasChanges = computed(() => dirtyCount.value > 0)

// Preview için draft + default birleştirilip CSS vars olarak verilir
const previewVars = computed(() => {
  const vars = { ...defaults }
  for (const [k, v] of Object.entries(draft.value)) {
    if (v) vars[k] = v
  }
  return vars
})

// ---------- Methods ----------

function isDirty(varName) {
  return (draft.value[varName] || '') !== (loaded.value[varName] || '')
}

function dirtyCountInGroup(group) {
  let n = 0
  for (const t of group.tokens) {
    if (isDirty(t.var)) n++
  }
  return n
}

function getValue(varName) {
  if (varName in draft.value) return draft.value[varName]
  return defaults[varName] || ''
}

function setValue(varName, value) {
  // Default ile aynıysa override'ı kaldır (clean JSON)
  const def = defaults[varName] || ''
  if (!value || value === def) {
    delete draft.value[varName]
  } else {
    draft.value[varName] = value
  }
  // Reactivity için referansı yenile
  draft.value = { ...draft.value }
}

function resetToken(varName) {
  delete draft.value[varName]
  draft.value = { ...draft.value }
}

function discardChanges() {
  draft.value = { ...loaded.value }
}

function confirmResetDefaults() {
  showResetModal.value = true
}

async function resetToDefaults() {
  showResetModal.value = false
  draft.value = {}
  await saveChanges()
}

async function loadSettings() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.callMethod('tradehub_core.api.theme.get_theme_settings')
    const msg = res?.message || {}
    const overrides = (msg.overrides && typeof msg.overrides === 'object') ? msg.overrides : {}
    loaded.value = { ...overrides }
    draft.value = { ...overrides }
    lastUpdatedAt.value = msg.last_updated_at || ''
    lastUpdatedBy.value = msg.last_updated_by || ''
  } catch (e) {
    loadError.value = e.message || 'Tema ayarları yüklenemedi'
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  if (saving.value) return
  saving.value = true
  try {
    const res = await api.callMethod('tradehub_core.api.theme.save_theme_settings', {
      overrides: draft.value,
    })
    if (res?.message?.ok) {
      loaded.value = { ...draft.value }
      // Yeniden yükle ki audit alanları güncellensin
      await loadSettings()
    } else {
      throw new Error('Beklenmeyen cevap')
    }
  } catch (e) {
    alert('Kaydedilemedi: ' + (e.message || e))
  } finally {
    saving.value = false
  }
}

// ---------- Scale Generator ----------

function openScaleModal(group) {
  scaleModalGroup.value = group
  // Başlangıç: mevcut -500 değeri veya default
  const current500 = getValue(`--color-${group.id}-500`)
  scaleBaseColor.value = colorAsHex(current500 || '#cc9900')
  recomputeScalePreview()
  showScaleModal.value = true
}

function recomputeScalePreview() {
  scalePreview.value = generateScale(scaleBaseColor.value)
}

function onScaleBaseInput(event) {
  scaleBaseColor.value = event.target.value
  recomputeScalePreview()
}

function applyScaleToDraft() {
  if (!scaleModalGroup.value) return
  const overrides = scaleToOverrides(scaleModalGroup.value.id, scalePreview.value)
  for (const [k, v] of Object.entries(overrides)) {
    setValue(k, v)
  }
  showScaleModal.value = false
  scaleModalGroup.value = null
}

// ---------- Input handlers ----------

function onColorInput(varName, event) {
  setValue(varName, event.target.value)
}

function onTextInput(varName, event) {
  setValue(varName, event.target.value)
}

function onRangeInput(token, event) {
  const n = event.target.value
  const unit = token.unit || ''
  setValue(token.var, `${n}${unit}`)
}

// ---------- Utils ----------

function numericPart(value) {
  if (!value) return 0
  const match = String(value).match(/^-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function colorAsHex(value) {
  if (!value) return '#000000'
  const v = String(value).trim()
  if (v.startsWith('#')) {
    // #rgb → #rrggbb
    if (v.length === 4) {
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
    }
    if (v.length === 7) return v
    if (v.length === 9) return v.slice(0, 7)
  }
  // rgba/hsla gibi değerler için color picker neutralize
  return '#000000'
}

function iconClassFor(name) {
  const map = {
    // Buton grupları
    sliders: 'fa-sliders',
    square: 'fa-square',
    'square-dashed': 'fa-square-dashed',
    // Palet grupları
    palette: 'fa-palette',
    'circle-half-stroke': 'fa-circle-half-stroke',
    'wand-magic-sparkles': 'fa-wand-magic-sparkles',
    bell: 'fa-bell',
    'layer-group': 'fa-layer-group',
    font: 'fa-font',
    'border-all': 'fa-border-all',
    // Tipografi / spacing
    'text-height': 'fa-text-height',
    'text-width': 'fa-text-width',
    bold: 'fa-bold',
    'grip-lines': 'fa-grip-lines',
    'bezier-curve': 'fa-bezier-curve',
    'arrows-left-right-to-line': 'fa-arrows-left-right-to-line',
    // Form elemanları
    'i-cursor': 'fa-i-cursor',
    crosshairs: 'fa-crosshairs',
    ban: 'fa-ban',
    'triangle-exclamation': 'fa-triangle-exclamation',
    'arrows-up-down': 'fa-arrows-up-down',
    'square-check': 'fa-square-check',
    calculator: 'fa-calculator',
  }
  return map[name] || 'fa-palette'
}

// Preview swatch'lar için palet gruplarının mevcut değerleri
const paletteSwatchGroups = computed(() => {
  return paletteTokenGroups
    .filter((g) => ['primary', 'secondary', 'accent'].includes(g.id))
    .map((g) => ({
      id: g.id,
      title: g.title,
      swatches: g.tokens.map((t) => ({
        var: t.var,
        step: t.var.split('-').pop(),
        color: getValue(t.var),
      })),
    }))
})

// ---------- Lifecycle ----------

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
/* Preview butonlar — scope'lu, admin panelin hiçbir global stilini etkilemez */
.preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  line-height: 1.25;
  transition: all 0.15s ease;
  border-radius: var(--radius-button);
  padding: var(--spacing-button-y) var(--spacing-button-x);
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
}

.preview-btn-solid {
  background: var(--btn-bg);
  color: var(--btn-text);
  border: var(--btn-border-width) solid var(--btn-border-color);
  box-shadow: var(--btn-shadow);
}

.preview-btn-outline {
  background: var(--btn-outline-bg);
  color: var(--btn-outline-text);
  border: var(--btn-outline-border-width) solid var(--btn-outline-border-color);
}

.preview-btn-gradient {
  background: linear-gradient(135deg, var(--btn-bg), var(--btn-hover-bg));
  color: var(--btn-text);
  border: none;
}

/* Hover durumunu sabit göstermek için */
.preview-btn-hover {
  background: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}

.preview-btn-hover-outline {
  background: var(--btn-outline-hover-bg) !important;
  color: var(--btn-outline-hover-text) !important;
}

.preview-btn-hover-gradient {
  background: linear-gradient(135deg, var(--btn-hover-bg), var(--btn-bg)) !important;
  color: var(--btn-hover-text, var(--btn-text)) !important;
}

/* =====================================================
   Form elemanları preview — scoped, admin paneli etkilemez
   ===================================================== */
.th-preview-input {
  display: block;
  width: 100%;
  height: var(--input-height-md);
  background: var(--input-bg);
  color: var(--input-text-color);
  font-size: var(--input-font-size);
  font-weight: var(--input-font-weight);
  line-height: var(--input-line-height);
  border: var(--input-border-width) solid var(--input-border-color);
  border-radius: var(--radius-input);
  padding: 0 var(--spacing-input-x);
  outline: none;
  transition: all 0.15s ease;
  font-family: inherit;
}
.th-preview-input::placeholder {
  color: var(--input-placeholder-color);
  opacity: 1;
}
.th-preview-input:disabled {
  background: var(--input-disabled-bg);
  color: var(--input-disabled-text);
  border-color: var(--input-disabled-border-color);
  opacity: var(--input-disabled-opacity);
  cursor: not-allowed;
}

.th-preview-input--focus {
  border-color: var(--input-focus-border-color) !important;
  box-shadow: 0 0 0 var(--input-focus-ring-width) var(--input-focus-ring-color) !important;
}
.th-preview-input--error {
  border-color: var(--input-error-border-color) !important;
  background: var(--input-error-bg) !important;
  color: var(--input-error-text) !important;
}
.th-preview-input--sm { height: var(--input-height-sm); font-size: 0.75rem; }
.th-preview-input--lg { height: var(--input-height-lg); font-size: 1rem; }

.th-preview-select {
  padding-right: calc(var(--spacing-input-x) + 24px);
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-input-x) center;
  background-size: 16px;
  appearance: none;
  -webkit-appearance: none;
}
.th-preview-textarea {
  height: auto !important;
  min-height: calc(var(--input-height-md) * 2);
  padding: var(--spacing-input-y) var(--spacing-input-x);
  line-height: 1.5;
  resize: vertical;
}

.th-preview-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  background: var(--checkbox-bg);
  border: var(--checkbox-border-width) solid var(--checkbox-border-color);
  border-radius: var(--checkbox-radius);
  color: transparent;
  flex-shrink: 0;
}
.th-preview-checkbox--checked {
  background: var(--checkbox-checked-bg);
  border-color: var(--checkbox-checked-border);
  color: var(--checkbox-checked-icon);
}

.th-preview-quantity {
  display: inline-flex;
  align-items: center;
  width: var(--quantity-width);
  height: var(--quantity-height);
  background: var(--quantity-bg);
  border: var(--quantity-border-width) solid var(--quantity-border-color);
  border-radius: var(--quantity-radius);
  padding: 2px;
}
.th-preview-quantity__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--quantity-button-size);
  height: var(--quantity-button-size);
  border-radius: 9999px;
  color: var(--quantity-text-color);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}
.th-preview-quantity__button:hover {
  background: var(--quantity-button-bg-hover);
}
.th-preview-quantity__input {
  flex: 1;
  min-width: 0;
  width: 0;
  height: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: var(--quantity-text-size);
  font-weight: 500;
  color: var(--quantity-text-color);
  padding: 0;
  outline: none;
}
</style>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
          @click="goBack"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
            {{ isNew ? `Yeni ${doctypeLabel}` : docName }}
          </h1>
          <p class="text-xs text-gray-400">{{ doctypeLabel }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button class="hdr-btn-outlined" @click="goBack">Geri</button>
        <button v-if="canEdit" class="hdr-btn-primary" :disabled="saving" @click="saveDoc">
          <AppIcon v-if="saving" name="loader" :size="13" class="animate-spin" />
          <AppIcon v-else name="save" :size="13" />
          <span>{{ isNew ? "Oluştur" : "Kaydet" }}</span>
        </button>
        <span v-else class="text-xs text-gray-400 italic">Salt okunur görünüm</span>
      </div>
    </div>

    <!-- Quick Actions (doctype-specific, e.g. Seller Application) -->
    <div v-if="quickActions.length > 0 && !isNew && !loading" class="card mb-5">
      <h3
        class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"
      >
        <AppIcon name="zap" :size="12" class="text-amber-500" />
        Hızlı İşlemler
      </h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="action in quickActions"
          :key="action.key"
          :disabled="action.disabled || actionLoading"
          :class="[
            'hdr-btn-outlined text-sm transition-colors',
            action.class,
            action.disabled ? 'opacity-40 cursor-not-allowed' : '',
          ]"
          @click="runQuickAction(action)"
        >
          <AppIcon
            :name="actionLoading && pendingAction === action.key ? 'loader' : action.icon"
            :size="13"
            :class="actionLoading && pendingAction === action.key ? 'animate-spin' : ''"
          />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Document Fields -->
    <div v-else class="space-y-5">
      <!-- Live preview for Dashboard Widget editing -->
      <WidgetPreview v-if="doctype === 'Dashboard Widget'" :form-data="formData" />

      <!-- Tab Navigation (only if doctype has tabs) -->
      <div v-if="formTabs.length > 1" class="card !p-0 overflow-hidden">
        <div class="flex border-b border-gray-100 dark:border-white/10 overflow-x-auto">
          <button
            v-for="tab in formTabs"
            :key="tab.id"
            class="px-5 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all flex-shrink-0"
            :class="
              activeTab === tab.id
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <template v-for="tab in formTabs" :key="tab.id">
        <template v-if="formTabs.length <= 1 || activeTab === tab.id">
          <!-- Tab extension: özel component varsa default section/childTable render'ını bypass et -->
          <component
            :is="getTabExtension(doctype, tab.id)"
            v-if="getTabExtension(doctype, tab.id)"
            :doc-name="docName"
            :is-new="isNew"
          />
          <template v-else>
            <div v-for="section in tab.sections" :key="section.id" class="card">
              <!-- Section header -->
              <h3
                v-if="section.label"
                class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5"
              >
                <AppIcon name="layout-list" :size="14" class="text-violet-500" />
                {{ section.label }}
              </h3>

              <div
                :class="
                  hasColumnBreak(section)
                    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
                    : 'flex flex-col gap-4'
                "
              >
                <div
                  v-for="(group, gIdx) in splitByColumnBreaks(section.fields)"
                  :key="gIdx"
                  class="flex flex-col gap-4"
                >
                  <template v-for="field in group" :key="field.fieldname">
                    <!-- depends_on: hide field if expression evaluates to false -->
                    <template v-if="evaluateDependsOn(field.depends_on)">
                      <!-- HTML info block (info/help content from DocType) -->
                      <div v-if="field.fieldtype === 'HTML'" v-html="field.options"></div>

                      <!-- Regular field -->
                      <div v-else>
                        <label class="form-label">
                          {{ field.label }}
                          <span v-if="field.reqd" class="text-red-500 ml-0.5">*</span>
                          <span
                            v-if="isReadOnly(field)"
                            class="ml-1 text-xs text-gray-400 font-normal"
                            >(salt okunur)</span
                          >
                        </label>

                        <!-- ── CUSTOM FIELD RENDERER ── (per (DocType, fieldname) override) -->
                        <component
                          :is="customRendererFor(field).component"
                          v-if="customRendererFor(field)"
                          v-bind="customRendererFor(field).props || {}"
                          :model-value="formData[field.fieldname]"
                          :form-data="formData"
                          :field="field"
                          @update:model-value="formData[field.fieldname] = $event"
                        />

                        <!-- ── READONLY (multiline / Small Text / Long Text vb.) ── -->
                        <textarea
                          v-else-if="isReadOnly(field) && isTextarea(field)"
                          :value="formatReadOnly(field, formData[field.fieldname])"
                          rows="3"
                          class="form-input bg-gray-50 dark:bg-white/3 opacity-70 cursor-not-allowed resize-y"
                          readonly
                          tabindex="-1"
                        />

                        <!-- ── READONLY (tek satır) ── -->
                        <input
                          v-else-if="isReadOnly(field)"
                          :value="formatReadOnly(field, formData[field.fieldname])"
                          type="text"
                          class="form-input bg-gray-50 dark:bg-white/3 opacity-70 cursor-not-allowed select-none"
                          readonly
                          tabindex="-1"
                        />

                        <!-- ── TEXT AREA (editable) ── -->
                        <textarea
                          v-else-if="isTextarea(field)"
                          v-model="formData[field.fieldname]"
                          rows="3"
                          class="form-input resize-y"
                          :placeholder="field.label"
                        />

                        <!-- ── CHECKBOX ── -->
                        <div
                          v-else-if="field.fieldtype === 'Check'"
                          class="flex items-center gap-2 mt-1"
                        >
                          <input
                            type="checkbox"
                            :checked="!!formData[field.fieldname]"
                            class="form-checkbox rounded text-violet-600 w-4 h-4"
                            @change="formData[field.fieldname] = $event.target.checked ? 1 : 0"
                          />
                          <span class="text-xs text-gray-500">{{ field.label }}</span>
                        </div>

                        <!-- ── SELECT ── -->
                        <select
                          v-else-if="field.fieldtype === 'Select'"
                          v-model="formData[field.fieldname]"
                          class="form-input"
                        >
                          <option value="">Seçiniz...</option>
                          <option
                            v-for="opt in parseOptions(field.options)"
                            :key="opt"
                            :value="opt"
                          >
                            {{ translateOption(opt) }}
                          </option>
                        </select>

                        <!-- ── LINK (autocomplete) ── -->
                        <div v-else-if="field.fieldtype === 'Link'" class="relative">
                          <input
                            v-model="formData[field.fieldname]"
                            type="text"
                            class="form-input pr-8"
                            :placeholder="`${field.options || 'Kayıt'} ara...`"
                            autocomplete="off"
                            @input="onLinkInput(field, $event.target.value)"
                            @focus="onLinkInput(field, formData[field.fieldname])"
                            @blur="scheduleCloseLinkDropdown(field.fieldname)"
                          />
                          <AppIcon
                            name="search"
                            :size="12"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          />
                          <div
                            v-if="linkDropdowns[field.fieldname]?.show"
                            class="absolute z-30 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-52 overflow-y-auto"
                          >
                            <div
                              v-if="linkDropdowns[field.fieldname]?.loading"
                              class="px-3 py-3 text-xs text-gray-400 flex items-center gap-2"
                            >
                              <AppIcon name="loader" :size="12" class="animate-spin" /> Aranıyor...
                            </div>
                            <div
                              v-else-if="linkDropdowns[field.fieldname]?.results?.length === 0"
                              class="px-3 py-3 text-xs text-gray-400"
                            >
                              Sonuç bulunamadı
                            </div>
                            <div
                              v-for="result in linkDropdowns[field.fieldname]?.results"
                              :key="result.value"
                              class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              @mousedown.prevent="selectLink(field.fieldname, result.value)"
                            >
                              {{ result.value }}
                              <span v-if="result.description" class="text-xs text-gray-400 ml-2">{{
                                result.description
                              }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- ── DATE ── -->
                        <input
                          v-else-if="field.fieldtype === 'Date'"
                          v-model="formData[field.fieldname]"
                          type="date"
                          class="form-input"
                        />

                        <!-- ── DATETIME ── -->
                        <input
                          v-else-if="field.fieldtype === 'Datetime'"
                          v-model="formData[field.fieldname]"
                          type="datetime-local"
                          class="form-input"
                        />

                        <!-- ── NUMBER ── -->
                        <input
                          v-else-if="isNumberField(field)"
                          v-model.number="formData[field.fieldname]"
                          type="number"
                          class="form-input"
                          :placeholder="field.label"
                        />

                        <!-- ── ATTACH / ATTACH IMAGE ── -->
                        <div v-else-if="isAttachField(field)">
                          <!-- Mevcut dosya — compact 240×160 thumbnail + aksiyon butonları -->
                          <div v-if="formData[field.fieldname]" class="mb-2">
                            <!-- Resim önizleme — 240×160 thumbnail -->
                            <div
                              v-if="isImageFile(formData[field.fieldname])"
                              class="w-60 h-40 rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden mb-2 cursor-pointer hover:opacity-90 bg-gray-50 dark:bg-gray-900"
                              @click="openPreview(field, 'image')"
                            >
                              <img
                                :src="getFileUrl(formData[field.fieldname])"
                                class="w-full h-full object-cover"
                                alt="önizleme"
                              />
                            </div>
                            <!-- PDF — 240×160 ikon kartı -->
                            <div
                              v-else-if="isPdfFile(formData[field.fieldname])"
                              class="w-60 h-40 rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-2 cursor-pointer hover:opacity-90"
                              @click="openPreview(field, 'pdf')"
                            >
                              <div class="text-center px-3">
                                <svg
                                  width="48"
                                  height="48"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  class="text-red-500 mx-auto"
                                >
                                  <path
                                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                  <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" />
                                </svg>
                                <div
                                  class="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1"
                                >
                                  PDF
                                </div>
                                <div
                                  class="text-[10px] text-red-700/70 dark:text-red-300/70 mt-0.5 truncate"
                                >
                                  {{ getFileName(formData[field.fieldname]) }}
                                </div>
                              </div>
                            </div>
                            <!-- DOCX / diğer office belgeleri — 240×160 W kart, modal preview YOK -->
                            <div
                              v-else-if="isOfficeFile(formData[field.fieldname])"
                              class="w-60 h-40 rounded-lg border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mb-2"
                            >
                              <div class="text-center px-3">
                                <div
                                  class="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xl font-bold mx-auto"
                                >
                                  W
                                </div>
                                <div
                                  class="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-2 truncate"
                                >
                                  {{ getFileName(formData[field.fieldname]) }}
                                </div>
                              </div>
                            </div>
                            <!-- Diğer dosyalar — jenerik ikon kart -->
                            <div
                              v-else
                              class="w-60 h-40 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-2"
                            >
                              <div class="text-center px-3">
                                <AppIcon
                                  name="paperclip"
                                  :size="36"
                                  class="text-gray-400 mx-auto"
                                />
                                <div class="text-[10px] text-gray-500 mt-2 truncate">
                                  {{ getFileName(formData[field.fieldname]) }}
                                </div>
                              </div>
                            </div>
                            <!-- Aksiyonlar — Önizle yok; thumbnail tıklaması zaten modal açıyor -->
                            <div class="flex items-center gap-2 flex-wrap" style="max-width: 240px">
                              <button
                                type="button"
                                class="text-xs px-3 py-1.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 inline-flex items-center gap-1.5"
                                @click="openInNewTab(formData[field.fieldname])"
                              >
                                <AppIcon name="external-link" :size="12" />
                                Yeni Sekmede Aç
                              </button>
                              <button
                                type="button"
                                class="text-xs px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5"
                                @click="downloadFile(formData[field.fieldname])"
                              >
                                <AppIcon name="download" :size="12" />
                                İndir
                              </button>
                              <button
                                type="button"
                                class="text-xs text-red-500 hover:text-red-700 ml-auto"
                                @click="formData[field.fieldname] = ''"
                              >
                                Kaldır
                              </button>
                            </div>
                          </div>
                          <!-- Upload alanı -->
                          <label
                            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-white/15 cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                            :class="
                              uploadingField === field.fieldname
                                ? 'opacity-60 pointer-events-none'
                                : ''
                            "
                          >
                            <AppIcon
                              :name="
                                uploadingField === field.fieldname
                                  ? 'loader'
                                  : field.fieldtype === 'Attach Image'
                                    ? 'image'
                                    : 'paperclip'
                              "
                              :size="14"
                              :class="
                                uploadingField === field.fieldname
                                  ? 'animate-spin text-violet-500'
                                  : 'text-gray-400'
                              "
                            />
                            <span class="text-xs text-gray-500">
                              {{
                                uploadingField === field.fieldname
                                  ? "Yükleniyor..."
                                  : formData[field.fieldname]
                                    ? "Değiştir"
                                    : "Dosya seç"
                              }}
                            </span>
                            <input
                              type="file"
                              class="hidden"
                              :accept="acceptForField(field)"
                              @change="uploadFile(field, $event.target.files[0])"
                            />
                          </label>
                          <!-- KYB ipucu metni -->
                          <div
                            v-if="isKybDocumentField(field)"
                            class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400"
                          >
                            PDF, JPG, JPEG, PNG, WEBP, DOCX · Maks 10 MB
                          </div>
                        </div>

                        <!-- ── PASSWORD ── -->
                        <input
                          v-else-if="field.fieldtype === 'Password'"
                          v-model="formData[field.fieldname]"
                          type="password"
                          class="form-input"
                          :placeholder="field.label"
                        />

                        <!-- ── DEFAULT (Data / other) ── -->
                        <input
                          v-else
                          v-model="formData[field.fieldname]"
                          type="text"
                          class="form-input"
                          :placeholder="field.label"
                        />

                        <!-- Field description — input/upload sonrası, sade UX için altta -->
                        <p
                          v-if="field.description"
                          class="text-xs text-gray-500 dark:text-gray-400 mt-1"
                        >
                          {{ field.description }}
                        </p>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </div>

            <!-- Child Tables within this tab -->
            <div v-for="table in tab.childTables || []" :key="table.fieldname" class="card">
              <!-- Custom: Admin Seller Profile.certifications → Sertifikalarım'a yönlendir -->
              <template
                v-if="doctype === 'Admin Seller Profile' && table.fieldname === 'certifications'"
              >
                <div class="flex items-center justify-between mb-3">
                  <h3
                    class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                  >
                    <AppIcon name="award" :size="14" class="text-emerald-500" />
                    {{ table.label }}
                  </h3>
                  <span
                    class="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full"
                  >
                    {{ (childTableData[table.fieldname] || []).length }} kayıt
                  </span>
                </div>
                <div
                  class="border-2 border-dashed border-emerald-200 dark:border-emerald-800/40 rounded-lg p-5 text-center"
                >
                  <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Mağaza sertifikalarını
                    <strong>Sertifikalarım</strong>
                    sayfasından yönet — belge yükleme, süre tracking ve toplu işlemler tek noktada.
                  </p>
                  <router-link
                    to="/my-certifications#seller"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                  >
                    Sertifikalarım sayfasına git
                    <AppIcon name="arrow-right" :size="14" />
                  </router-link>
                </div>
              </template>

              <template v-else>
                <div class="flex items-center justify-between mb-4">
                  <h3
                    class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                  >
                    <AppIcon name="table-2" :size="14" class="text-violet-500" />
                    {{ table.label }}
                  </h3>
                  <span
                    class="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full"
                  >
                    {{ (childTableData[table.fieldname] || []).length }} satır
                  </span>
                </div>

                <!-- Image-only child table: show as photo gallery with multi-upload -->
                <template v-if="canEdit && isImageChildTable(table.options)">
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    <div
                      v-for="(row, idx) in childTableData[table.fieldname] || []"
                      :key="row.name || idx"
                      class="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                    >
                      <img
                        v-if="getFirstImageField(row, table.options)"
                        :src="getFirstImageField(row, table.options)"
                        class="w-full h-full object-cover"
                      />
                      <button
                        class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Sil"
                        @click="removeChildRow(table.fieldname, idx)"
                      >
                        <AppIcon name="x" :size="12" />
                      </button>
                      <span
                        class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]"
                        >{{ idx + 1 }}</span
                      >
                    </div>
                    <label
                      class="relative aspect-square rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700/50 flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                      :class="
                        uploadingField === table.fieldname ? 'opacity-60 pointer-events-none' : ''
                      "
                    >
                      <AppIcon
                        v-if="uploadingField === table.fieldname"
                        name="loader"
                        :size="20"
                        class="text-violet-500 animate-spin"
                      />
                      <AppIcon v-else name="image-plus" :size="22" class="text-violet-500" />
                      <span
                        class="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-1"
                      >
                        {{ uploadingField === table.fieldname ? "Yükleniyor..." : "Görsel Ekle" }}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        class="hidden"
                        @change="uploadToChildTable(table.fieldname, table.options, $event)"
                      />
                    </label>
                  </div>
                  <p class="text-[11px] text-gray-400 mt-2">
                    Birden fazla görsel seçebilirsin — seçtiklerin otomatik satır olarak eklenir.
                  </p>
                </template>

                <div v-else class="overflow-x-auto">
                  <table
                    v-if="(childTableData[table.fieldname] || []).length > 0"
                    class="w-full text-xs"
                  >
                    <thead>
                      <tr class="border-b border-gray-100 dark:border-white/5">
                        <th class="tbl-th w-8">#</th>
                        <th
                          v-for="col in getChildTableColumns(table.options)"
                          :key="col.fieldname"
                          class="tbl-th"
                          :class="childColHeaderClass(col)"
                        >
                          {{ col.label }}
                        </th>
                        <th v-if="canEdit" class="tbl-th w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, idx) in childTableData[table.fieldname]"
                        :key="row.name || idx"
                        class="border-b border-gray-50 dark:border-white/3 hover:bg-gray-50 dark:hover:bg-white/2"
                      >
                        <td class="tbl-td text-gray-400">{{ idx + 1 }}</td>
                        <td
                          v-for="col in getChildTableColumns(table.options)"
                          :key="col.fieldname"
                          class="tbl-td"
                          :class="childColCellClass(col)"
                        >
                          <template v-if="canEdit">
                            <LinkInput
                              v-if="col.fieldtype === 'Link' && col.options"
                              :model-value="row[col.fieldname]"
                              :doctype="col.options"
                              :placeholder="col.label"
                              :filters="parseLinkFilters(col.link_filters)"
                              class="w-full min-w-[120px]"
                              @update:model-value="row[col.fieldname] = $event"
                            />
                            <select
                              v-else-if="col.fieldtype === 'Select' && col.options"
                              v-model="row[col.fieldname]"
                              class="w-full min-w-[80px] bg-transparent border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            >
                              <option value="">Seçiniz...</option>
                              <option
                                v-for="opt in parseOptions(col.options)"
                                :key="opt"
                                :value="opt"
                              >
                                {{ translateOption(opt) }}
                              </option>
                            </select>
                            <label
                              v-else-if="col.fieldtype === 'Check'"
                              class="flex items-center justify-center cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                :checked="!!Number(row[col.fieldname])"
                                class="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-violet-600 focus:ring-violet-400"
                                @change="row[col.fieldname] = $event.target.checked ? 1 : 0"
                              />
                            </label>
                            <div
                              v-else-if="col.fieldtype === 'Color'"
                              class="flex items-center gap-1 min-w-[110px]"
                            >
                              <input
                                type="color"
                                :value="row[col.fieldname] || '#000000'"
                                class="w-7 h-7 rounded border border-gray-200 dark:border-white/10 cursor-pointer bg-transparent"
                                @input="row[col.fieldname] = $event.target.value"
                              />
                              <input
                                v-model="row[col.fieldname]"
                                type="text"
                                placeholder="#000000"
                                class="flex-1 min-w-0 bg-transparent border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                            <div
                              v-else-if="
                                col.fieldtype === 'Attach Image' || col.fieldtype === 'Attach'
                              "
                              class="flex items-center gap-2 min-w-[160px]"
                            >
                              <img
                                v-if="row[col.fieldname] && col.fieldtype === 'Attach Image'"
                                :src="row[col.fieldname]"
                                alt=""
                                class="w-10 h-10 object-cover rounded border border-gray-200 dark:border-white/10 shrink-0"
                              />
                              <label
                                class="flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-gray-300 dark:border-white/15 cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-[11px] text-gray-500 transition-colors shrink-0"
                                :class="
                                  uploadingField === `${table.fieldname}-${idx}-${col.fieldname}`
                                    ? 'opacity-60 pointer-events-none'
                                    : ''
                                "
                              >
                                <AppIcon
                                  :name="
                                    uploadingField === `${table.fieldname}-${idx}-${col.fieldname}`
                                      ? 'loader'
                                      : col.fieldtype === 'Attach Image'
                                        ? 'image'
                                        : 'paperclip'
                                  "
                                  :size="12"
                                  :class="
                                    uploadingField === `${table.fieldname}-${idx}-${col.fieldname}`
                                      ? 'animate-spin text-violet-500'
                                      : 'text-gray-400'
                                  "
                                />
                                <span>
                                  {{
                                    uploadingField === `${table.fieldname}-${idx}-${col.fieldname}`
                                      ? "Yükleniyor..."
                                      : row[col.fieldname]
                                        ? "Değiştir"
                                        : "Dosya seç"
                                  }}
                                </span>
                                <input
                                  type="file"
                                  class="hidden"
                                  :accept="col.fieldtype === 'Attach Image' ? 'image/*' : '*/*'"
                                  @change="
                                    uploadRowFile(
                                      row,
                                      col,
                                      table.fieldname,
                                      idx,
                                      $event.target.files[0]
                                    )
                                  "
                                />
                              </label>
                              <button
                                v-if="row[col.fieldname]"
                                type="button"
                                class="text-[11px] text-gray-400 hover:text-red-500 underline"
                                title="Kaldır"
                                @click="row[col.fieldname] = ''"
                              >
                                Kaldır
                              </button>
                            </div>
                            <input
                              v-else
                              v-model="row[col.fieldname]"
                              :type="
                                isNumberField(col)
                                  ? 'number'
                                  : col.fieldtype === 'Date'
                                    ? 'date'
                                    : 'text'
                              "
                              :step="isNumberField(col) ? 'any' : undefined"
                              class="w-full min-w-[80px] bg-transparent border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
                            />
                          </template>
                          <template v-else>
                            <span v-if="col.fieldtype === 'Check'">{{
                              Number(row[col.fieldname]) ? "✓" : "—"
                            }}</span>
                            <span
                              v-else-if="col.fieldtype === 'Color' && row[col.fieldname]"
                              class="inline-flex items-center gap-1.5"
                            >
                              <span
                                class="inline-block w-4 h-4 rounded border border-gray-200 dark:border-white/10"
                                :style="{ backgroundColor: row[col.fieldname] }"
                              ></span>
                              <span class="font-mono text-[11px]">{{ row[col.fieldname] }}</span>
                            </span>
                            <span v-else>{{ row[col.fieldname] ?? "-" }}</span>
                          </template>
                        </td>
                        <td v-if="canEdit" class="tbl-td text-center">
                          <button
                            class="text-red-400 hover:text-red-600 transition-colors p-0.5 rounded"
                            title="Satırı sil"
                            @click="removeChildRow(table.fieldname, idx)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path
                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="text-center py-8 text-xs text-gray-400">
                    <AppIcon name="inbox" :size="20" class="mx-auto mb-2 opacity-50" />
                    Henüz kayıt yok
                  </div>
                </div>
                <button
                  v-if="canEdit && !isImageChildTable(table.options)"
                  type="button"
                  class="mt-3 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium transition-colors"
                  @click="addChildRow(table.fieldname, table.options)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Satır Ekle
                </button>
              </template>
            </div>
          </template>
        </template>
      </template>

      <!-- Fallback: meta yüklenemezse ham veriler -->
      <div v-if="formTabs.length === 0 && !isNew" class="card">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
          <AppIcon name="file-text" :size="14" class="text-violet-500 inline mr-2" />
          Döküman Bilgileri
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div v-for="(value, key) in docData" :key="key">
            <label class="form-label">{{ formatFieldLabel(key) }}</label>
            <input
              :value="value"
              type="text"
              class="form-input"
              :class="READONLY_FIELDS.includes(key) ? 'opacity-60 cursor-not-allowed' : ''"
              :readonly="READONLY_FIELDS.includes(key)"
            />
          </div>
        </div>
      </div>

      <!-- Child Tables (only for doctypes without tabs — fallback) -->
      <template v-if="formTabs.length <= 1">
        <div v-for="table in childTableFields" :key="table.fieldname" class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AppIcon name="table-2" :size="14" class="text-violet-500" />
              {{ table.label }}
            </h3>
            <span
              class="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full"
            >
              {{ (childTableData[table.fieldname] || []).length }} satır
            </span>
          </div>
          <div class="overflow-x-auto">
            <table v-if="(childTableData[table.fieldname] || []).length > 0" class="w-full text-xs">
              <thead>
                <tr class="border-b border-gray-100 dark:border-white/5">
                  <th class="tbl-th w-8">#</th>
                  <th
                    v-for="col in getChildTableColumns(table.options)"
                    :key="col.fieldname"
                    class="tbl-th"
                  >
                    {{ col.label }}
                  </th>
                  <th v-if="canEdit" class="tbl-th w-8"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in childTableData[table.fieldname]"
                  :key="row.name || idx"
                  class="border-b border-gray-50 dark:border-white/3 hover:bg-gray-50 dark:hover:bg-white/2"
                >
                  <td class="tbl-td text-gray-400">{{ idx + 1 }}</td>
                  <td
                    v-for="col in getChildTableColumns(table.options)"
                    :key="col.fieldname"
                    class="tbl-td"
                  >
                    <input
                      v-if="canEdit"
                      v-model="row[col.fieldname]"
                      :type="isNumberField(col) ? 'number' : 'text'"
                      :step="isNumberField(col) ? 'any' : undefined"
                      class="w-full min-w-[80px] bg-transparent border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
                    />
                    <span v-else>{{ row[col.fieldname] ?? "-" }}</span>
                  </td>
                  <td v-if="canEdit" class="tbl-td text-center">
                    <button
                      class="text-red-400 hover:text-red-600 transition-colors p-0.5 rounded"
                      title="Satırı sil"
                      @click="removeChildRow(table.fieldname, idx)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center py-8 text-xs text-gray-400">
              <AppIcon name="inbox" :size="20" class="mx-auto mb-2 opacity-50" />
              Henüz kayıt yok
            </div>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="mt-3 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium transition-colors"
            @click="addChildRow(table.fieldname, table.options)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Satır Ekle
          </button>
        </div>
      </template>
    </div>

    <!-- ── KYB Reject Modal ────────────────────────────────────────── -->
    <div
      v-if="rejectModal.open"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      @click.self="closeRejectModal"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div
          class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3"
        >
          <div class="font-semibold text-base text-gray-900 dark:text-gray-100">
            KYB Doğrulamayı Reddet
          </div>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Kapat"
            @click="closeRejectModal"
          >
            &times;
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="form-label">
              Reddetme Gerekçesi
              <span class="text-red-500 ml-0.5">*</span>
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Satıcı bu mesajı bildirim olarak alır. En az 20 karakter — net bir eylem önerisi
              içersin.
            </p>
            <textarea
              v-model="rejectModal.reason"
              rows="4"
              class="form-input resize-y"
              placeholder="Örn: Faaliyet belgesi süresi dolmuş. Lütfen güncel belge yükleyiniz."
            />
            <div class="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
              <span :class="rejectModal.reason.trim().length < 20 ? 'text-red-500' : ''">
                {{ rejectModal.reason.trim().length }}/20 karakter (min)
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              class="text-xs text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
              @click="rejectModal.notesOpen = !rejectModal.notesOpen"
            >
              <AppIcon :name="rejectModal.notesOpen ? 'minus' : 'plus'" :size="12" />
              Internal not ekle
              <span class="text-gray-400">(sadece admin görür)</span>
            </button>
            <div v-if="rejectModal.notesOpen" class="mt-2">
              <textarea
                v-model="rejectModal.notes"
                rows="3"
                class="form-input resize-y"
                placeholder="Bu satıcı 3. kez aynı eksikle başvurdu, takip lazım..."
              />
              <p class="text-[11px] text-gray-400 mt-1">
                Bu not satıcıya gönderilmez. Mevcut Notes alanına tarih damgalı eklenir.
              </p>
            </div>
          </div>
        </div>
        <div
          class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 bg-gray-50 dark:bg-gray-900/40"
        >
          <button
            type="button"
            class="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            :disabled="rejectModal.submitting"
            @click="closeRejectModal"
          >
            İptal
          </button>
          <button
            type="button"
            class="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            :disabled="rejectModal.submitting || rejectModal.reason.trim().length < 20"
            @click="submitRejectModal"
          >
            <AppIcon v-if="rejectModal.submitting" name="loader" :size="14" class="animate-spin" />
            <AppIcon v-else name="x-circle" :size="14" />
            Reddet ve Bildir
          </button>
        </div>
      </div>
    </div>

    <!-- ── Preview Modal (PDF / Image) ────────────────────────────── -->
    <div
      v-if="preview.open"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      @click.self="closePreview"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div
          class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3"
        >
          <div
            class="font-semibold text-sm truncate text-gray-900 dark:text-gray-100"
            :title="preview.name"
          >
            {{ preview.name }}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              class="text-xs px-3 py-1.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 inline-flex items-center gap-1.5"
              @click="openInNewTab(preview.url)"
            >
              <AppIcon name="external-link" :size="12" />
              Yeni Sekmede Aç
            </button>
            <button
              type="button"
              class="text-xs px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5"
              @click="downloadFile(preview.url)"
            >
              <AppIcon name="download" :size="12" />
              İndir
            </button>
            <button
              type="button"
              class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              :aria-label="'Kapat'"
              @click="closePreview"
            >
              &times;
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 min-h-0">
          <iframe
            v-if="preview.type === 'pdf'"
            :src="preview.url"
            class="w-full h-[80vh]"
            style="border: 0"
            :title="preview.name"
          ></iframe>
          <div v-else-if="preview.type === 'image'" class="flex items-center justify-center p-4">
            <img
              :src="preview.url"
              class="max-w-full max-h-[80vh] object-contain"
              :alt="preview.name"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, reactive, onMounted, onUnmounted, watch, provide } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useToast } from "@/composables/useToast";
  import { useDocTypeStore } from "@/stores/doctype";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import { getTabExtension } from "./tab-extensions";
  import { resolveFieldRenderer } from "@/components/form-fields/registry";
  import WidgetPreview from "@/components/form-fields/WidgetPreview.vue";

  // ── Sabit listeler ────────────────────────────────────────────────────────────
  const READONLY_FIELDS = [
    "name",
    "creation",
    "modified",
    "modified_by",
    "owner",
    "docstatus",
    "idx",
    "parent",
    "parenttype",
    "parentfield",
    "naming_series",
    "amended_from",
  ];

  const SKIP_FIELDTYPES = ["Section Break", "Tab Break", "Button", "Fold", "Heading", "Break"];

  const TEXTAREA_TYPES = ["Text", "Long Text", "Small Text", "Code", "Text Editor"];
  const NUMBER_TYPES = ["Int", "Float", "Currency", "Percent"];
  const ATTACH_TYPES = ["Attach", "Attach Image"];

  // Select alanları için Türkçe çeviri haritası
  const SELECT_TRANSLATIONS = {
    Individual: "Bireysel",
    Corporate: "Kurumsal",
    Business: "Kurumsal",
    Enterprise: "Kurumsal (Büyük)",
    Active: "Aktif",
    Suspended: "Askıya Alındı",
    Deactivated: "Deaktif",
    Pending: "Beklemede",
    Blocked: "Engellendi",
    Approved: "Onaylandı",
    Rejected: "Reddedildi",
    "Under Review": "İnceleniyor",
    Verified: "Doğrulandı",
    Expired: "Süresi Doldu",
    Management: "Yönetim",
    Product: "Ürün",
  };

  // ── Composables & Stores ──────────────────────────────────────────────────────
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const doctypeStore = useDocTypeStore();
  const authStore = useAuthStore();

  // ── State ─────────────────────────────────────────────────────────────────────
  const loading = ref(false);
  const saving = ref(false);
  const actionLoading = ref(false);
  const pendingAction = ref(null);
  const docData = ref({});
  const formData = ref({});
  // Make formData reachable from any descendant custom field renderer with
  // guaranteed reactivity (prop binding via v-bind unwraps the ref into a
  // non-tracked object, breaking deep watchers in nested components).
  provide("formData", formData);
  const metaFields = ref([]);
  const metaPermissions = ref([]);

  // Kullanıcının role'lerine göre erişebileceği maksimum permlevel.
  // permlevel > maxAllowedPermlevel olan field'lar render edilmez.
  const maxAllowedPermlevel = computed(() => {
    const userRoles = new Set(authStore.user?.roles || []);
    const levels = (metaPermissions.value || [])
      .filter((p) => p && p.role && userRoles.has(p.role) && p.read)
      .map((p) => p.permlevel || 0);
    if (levels.length > 0) return Math.max(...levels);
    // Fallback: meta.permissions boş gelirse role'ye göre default
    // System Manager / Marketplace Admin yüksek erişim, Seller seviye 1
    if (authStore.isAdmin) return 9;
    if (userRoles.has("Seller") || userRoles.has("Marketplace Admin")) return 1;
    return 0;
  });

  function isFieldVisible(field) {
    const lvl = field.permlevel || 0;
    if (lvl > maxAllowedPermlevel.value) return false;
    return true;
  }

  // Section içinde Column Break varsa 2-sütun grid; yoksa tek sütun (flex-col).
  function hasColumnBreak(section) {
    return (section.fields || []).some((f) => f.fieldtype === "Column Break" && isFieldVisible(f));
  }

  // Section field'larını Column Break'lere göre gruplara böl. Her grup,
  // kendi sütununda sırayla (flex-col) render edilir. Auto-flow grid'in
  // tuhaf yan-itme davranışı yerine Frappe-faithful "explicit columns".
  // Section'da column break yoksa tek grup döner.
  function splitByColumnBreaks(fields) {
    const groups = [[]];
    for (const f of fields || []) {
      if (!isFieldVisible(f)) continue;
      if (f.fieldtype === "Column Break") {
        groups.push([]);
      } else {
        groups[groups.length - 1].push(f);
      }
    }
    return groups.filter((g) => g.length > 0);
  }
  const childTableMeta = reactive({}); // { doctype: fields[] }
  const childTableData = reactive({}); // { fieldname: rows[] }
  const linkDropdowns = reactive({}); // { fieldname: { show, loading, results[] } }
  const linkTimers = {};
  const uploadingField = ref(null); // fieldname being uploaded

  // ── Computed ──────────────────────────────────────────────────────────────────
  const doctype = computed(() => decodeURIComponent(route.params.doctype || ""));
  const doctypeLabel = computed(() => doctype.value || "Döküman");
  const docName = computed(() => decodeURIComponent(route.params.name || ""));
  const isNew = computed(() => docName.value === "new");

  const activeTab = ref("");

  /**
   * Alanları Tab Break → Section Break → Field hiyerarşisine böler.
   * Her tab birden fazla section içerebilir.
   */
  const formTabs = computed(() => {
    const tabs = [];
    let currentTab = { id: "tab-default", label: "", sections: [], childTables: [] };
    let currentSection = { id: "section-0", label: "", fields: [] };
    let sectionIdx = 0;

    for (const field of metaFields.value) {
      if (field.hidden) continue;
      if (!field.fieldname) continue;

      if (field.fieldtype === "Tab Break") {
        // Hidden tab'ı tamamen atla — yeni tab başlatma, mevcut tab'a devam et
        if (field.hidden) continue;
        // Mevcut section'ı tab'a ekle
        if (currentSection.fields.length > 0) {
          currentTab.sections.push(currentSection);
        }
        // Mevcut tab'ı listeye ekle: section/childTable VAR ise ya da
        // tab-extension registry'de kayıtlı bir custom component varsa.
        // Extension'lı tab'lar HTML-only veya boş içerikli olsa bile render edilir.
        if (
          currentTab.sections.length > 0 ||
          currentTab.childTables.length > 0 ||
          getTabExtension(doctype.value, currentTab.id)
        ) {
          tabs.push(currentTab);
        }
        // Yeni tab başlat
        currentTab = {
          id: `tab-${field.fieldname}`,
          label: field.label || "",
          sections: [],
          childTables: [],
        };
        sectionIdx++;
        currentSection = { id: `section-${sectionIdx}`, label: "", fields: [] };
      } else if (field.fieldtype === "Section Break") {
        if (currentSection.fields.length > 0) {
          currentTab.sections.push(currentSection);
        }
        sectionIdx++;
        currentSection = {
          id: `section-${sectionIdx}`,
          label: field.label || "",
          fields: [],
        };
      } else if (SKIP_FIELDTYPES.includes(field.fieldtype)) {
        // Skip
      } else if (field.fieldtype === "Table" || field.fieldtype === "Table MultiSelect") {
        // Child tables belong to the current tab
        currentTab.childTables.push(field);
      } else {
        currentSection.fields.push(field);
      }
    }

    // Son section ve tab'ı ekle
    if (currentSection.fields.length > 0) {
      currentTab.sections.push(currentSection);
    }
    if (
      currentTab.sections.length > 0 ||
      currentTab.childTables.length > 0 ||
      getTabExtension(doctype.value, currentTab.id)
    ) {
      tabs.push(currentTab);
    }

    // İlk tab'ı aktif yap

    if (tabs.length > 0 && !activeTab.value) {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      activeTab.value = tabs[0].id;
    }

    return tabs;
  });

  /** Child table alanları (Table ve Table MultiSelect) */
  const childTableFields = computed(() =>
    metaFields.value.filter(
      (f) => !f.hidden && (f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect")
    )
  );

  // Sadece admin görebilecek doctype'lar (form view koruması)
  // Seller Category: satıcı yalnız /seller-categories özel view'ı üzerinden
  // erişebilir; generic form (/app/Seller Category/:name) doğrudan açılamaz.
  const ADMIN_ONLY_DOCTYPES = new Set([
    "Buyer Profile",
    "Cart",
    "Supplier Profile",
    "Currency Rate Pair",
    "Seller Application",
    "Seller Category",
  ]);

  // Herkes için salt okunur doctype'lar (TCMB gibi otomatik yönetilen veriler)
  const SYSTEM_READONLY_DOCTYPES = new Set(["Currency Rate Pair"]);

  // Satıcılar için sadece okuma modundaki doctypelar (yazma yetkileri yok)
  const SELLER_READONLY_DOCTYPES = new Set([
    "Seller Balance",
    "Seller Review",
    "Seller Gallery Image",
    "Certification Type",
    // Admin-only master data (satıcı görür ama yazamaz)
    "Product Type",
    "Attribute Set",
  ]);

  // Satıcılar için belirli alanlar salt okunur (doctype bazlı)
  const SELLER_READONLY_FIELDS = {
    "Seller Profile": ["status", "seller_type"],
    "Admin Seller Profile": [
      "user",
      "seller_code",
      "status",
      "seller_type",
      "is_verified",
      "verification_type",
      "commission_rate",
      "subscription",
      "business_type",
      "health_score",
      "note",
      "order_count",
      "rating",
      "review_count",
      "response_time",
      "response_rate",
      "on_time_delivery",
      "approved_by",
      "approval_date",
    ],
  };

  // Satıcı sadece kendi oluşturduğu kayıtları düzenleyebileceği master doctype'lar (if_owner=1)
  // Brand = satıcı önerir admin onaylar; Product Family / Product Attribute = satıcı kendi oluşturur
  const SELLER_IF_OWNER_DOCTYPES = new Set(["Brand", "Product Family", "Product Attribute"]);

  // Satıcı bu doctype'ı düzenleyebilir mi?
  const canEdit = computed(() => {
    if (SYSTEM_READONLY_DOCTYPES.has(doctype.value)) return false;
    if (authStore.isAdmin) return true;
    if (!authStore.isSeller) return false;
    if (SELLER_READONLY_DOCTYPES.has(doctype.value)) return false;
    if (SELLER_IF_OWNER_DOCTYPES.has(doctype.value) && !isNew.value) {
      const owner = docData.value?.owner || formData.value?.owner;
      if (!owner) return true;
      const me = authStore.user?.email || authStore.user?.name;
      return owner === me;
    }
    return true;
  });

  /** Doctype'a özel hızlı işlem butonları — yalnızca adminler görebilir */
  const quickActions = computed(() => {
    if (!authStore.isAdmin) return [];
    if (doctype.value === "Seller Application") {
      const status = formData.value.status || "";
      return [
        {
          key: "approve",
          label: "Onayla",
          icon: "check-circle",
          class:
            "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950",
          disabled: status === "Approved",
          newStatus: "Approved",
        },
        {
          key: "reviewing",
          label: "İnceleniyor",
          icon: "clock",
          class:
            "text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950",
          disabled: status === "Under Review",
          newStatus: "Under Review",
        },
        {
          key: "reject",
          label: "Reddet",
          icon: "x-circle",
          class:
            "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950",
          disabled: status === "Rejected",
          newStatus: "Rejected",
        },
      ];
    }

    if (doctype.value === "Seller Profile") {
      const status = formData.value.status || "";
      return [
        {
          key: "activate",
          label: "Aktif Et",
          icon: "check-circle",
          class: "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
          disabled: status === "Active",
          newStatus: "Active",
        },
        {
          key: "suspend",
          label: "Askıya Al",
          icon: "pause-circle",
          class: "text-amber-600 border-amber-200 hover:bg-amber-50",
          disabled: status === "Suspended",
          newStatus: "Suspended",
        },
        {
          key: "deactivate",
          label: "Deaktif Et",
          icon: "x-circle",
          class: "text-red-600 border-red-200 hover:bg-red-50",
          disabled: status === "Inactive",
          newStatus: "Inactive",
        },
      ];
    }

    if (doctype.value === "Brand") {
      const status = formData.value.status || "";
      return [
        {
          key: "approve",
          label: "Onayla",
          icon: "check-circle",
          class:
            "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950",
          disabled: status === "Approved",
          apiMethod: "tradehub_core.api.brand.approve",
        },
        {
          key: "reject",
          label: "Reddet",
          icon: "x-circle",
          class:
            "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950",
          disabled: status === "Rejected",
          apiMethod: "tradehub_core.api.brand.reject",
          requiresReason: true,
        },
      ];
    }

    if (doctype.value === "KYB Verification") {
      const status = formData.value.status || "";
      // Satıcı için sadece "Yeniden Gönder" (Rejected iken)
      if (!authStore.isAdmin) {
        if (status === "Rejected") {
          return [
            {
              key: "resubmit",
              label: "Yeniden Gönder",
              icon: "refresh-cw",
              class:
                "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950",
              triggerResubmit: true,
            },
          ];
        }
        return [];
      }
      // Admin için 5 buton (mevcut)
      return [
        {
          key: "verify",
          label: "Doğrula",
          icon: "check-circle",
          class:
            "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950",
          disabled: status === "Verified",
          newStatus: "Verified",
        },
        {
          key: "reviewing",
          label: "İnceleniyor",
          icon: "clock",
          class:
            "text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950",
          disabled: status === "Under Review",
          newStatus: "Under Review",
        },
        {
          key: "reject",
          label: "Reddet",
          icon: "x-circle",
          class:
            "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950",
          disabled: status === "Rejected",
          newStatus: "Rejected",
        },
        {
          key: "pending",
          label: "Yeniden İncele",
          icon: "rotate-ccw",
          class:
            "text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950",
          disabled: status === "Pending",
          newStatus: "Pending",
        },
        {
          key: "expired",
          label: "Süresi Doldu",
          icon: "calendar-x",
          class:
            "text-slate-600 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
          disabled: status === "Expired",
          newStatus: "Expired",
        },
      ];
    }

    if (doctype.value === "Currency Rate Pair") {
      return [
        {
          key: "tcmb_refresh",
          label: "TCMB'den Güncelle",
          icon: "refresh-cw",
          class:
            "text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950",
          apiMethod: "tradehub_core.services.tcmb.manual_refresh",
        },
      ];
    }

    return [];
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function isAttachField(field) {
    return ATTACH_TYPES.includes(field.fieldtype);
  }

  function isImageFile(url) {
    if (!url) return false;
    const ext = url.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }

  function isPdfFile(url) {
    if (!url) return false;
    return url.split(".").pop()?.toLowerCase() === "pdf";
  }

  function isOfficeFile(url) {
    if (!url) return false;
    const ext = url.split(".").pop()?.toLowerCase() || "";
    return ["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(ext);
  }

  function getFileName(url) {
    if (!url) return "";
    return decodeURIComponent(url.split("/").pop() || url);
  }

  function getFileUrl(url) {
    // URL'ler relative — nginx proxy backend'e yönlendirir
    return url || "";
  }

  function openInNewTab(url) {
    if (url) window.open(getFileUrl(url), "_blank");
  }

  function downloadFile(url) {
    if (!url) return;
    const a = document.createElement("a");
    a.href = getFileUrl(url);
    a.download = getFileName(url);
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── KYB Reject Modal ─────────────────────────────────────────────
  const rejectModal = ref({
    open: false,
    reason: "",
    notes: "",
    notesOpen: false,
    submitting: false,
  });

  function openRejectModal() {
    rejectModal.value = {
      open: true,
      reason: "",
      notes: "",
      notesOpen: false,
      submitting: false,
    };
  }

  function closeRejectModal() {
    if (rejectModal.value.submitting) return;
    rejectModal.value = {
      open: false,
      reason: "",
      notes: "",
      notesOpen: false,
      submitting: false,
    };
  }

  async function submitRejectModal() {
    const reason = rejectModal.value.reason.trim();
    if (reason.length < 20) {
      toast.error("Reddetme gerekçesi en az 20 karakter olmalı.");
      return;
    }
    rejectModal.value.submitting = true;
    try {
      await api.callMethod("tradehub_core.api.v1.kyb.review_kyb", {
        kyb_name: docName.value,
        action: "Rejected",
        rejection_reason: reason,
        notes: rejectModal.value.notes.trim(),
      });
      toast.success("Reddedildi, satıcı bilgilendirildi");
      rejectModal.value.open = false;
      await loadDoc();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    } finally {
      rejectModal.value.submitting = false;
    }
  }

  // ── Preview Modal ────────────────────────────────────────────────
  const preview = ref({ open: false, type: "", url: "", name: "" });

  function openPreview(field, type) {
    const raw = formData.value[field.fieldname];
    if (!raw) return;
    preview.value = {
      open: true,
      type,
      url: getFileUrl(raw),
      name: getFileName(raw),
    };
  }

  function closePreview() {
    preview.value = { open: false, type: "", url: "", name: "" };
  }

  function handleEscKey(e) {
    if (e.key === "Escape" && preview.value.open) closePreview();
  }

  // KYB Verification belge alanları — backend whitelist ile aynı.
  const KYB_DOCUMENT_FIELDS = new Set([
    "identity_document",
    "imza_sirkuleri",
    "ticaret_sicil_gazetesi",
    "faaliyet_belgesi",
    "vergi_levhasi",
  ]);
  const KYB_ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "webp", "docx"];
  const KYB_MAX_BYTES = 10 * 1024 * 1024;

  function isKybDocumentField(field) {
    return doctype.value === "KYB Verification" && KYB_DOCUMENT_FIELDS.has(field.fieldname);
  }

  function acceptForField(field) {
    if (isKybDocumentField(field)) return ".pdf,.jpg,.jpeg,.png,.webp,.docx";
    return field.fieldtype === "Attach Image" ? "image/*" : "*";
  }

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(field, file) {
    if (!file) return;

    // KYB context — frontend pre-validation + dedicated endpoint
    if (isKybDocumentField(field)) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!KYB_ALLOWED_EXTS.includes(ext)) {
        toast.error("Geçersiz dosya türü. PDF, JPG, JPEG, PNG, WEBP veya DOCX yükleyin.");
        return;
      }
      if (file.size > KYB_MAX_BYTES) {
        toast.error("Dosya 10 MB'dan küçük olmalı.");
        return;
      }
      uploadingField.value = field.fieldname;
      try {
        const filedata = await readAsBase64(file);
        const res = await api.callMethod("tradehub_core.api.v1.kyb.upload_kyb_document", {
          filename: file.name,
          filedata,
        });
        const fileUrl = res?.message?.file_url || "";
        if (!fileUrl) throw new Error("Yükleme başarısız.");
        formData.value[field.fieldname] = fileUrl;
        toast.success("Dosya yüklendi");
      } catch (err) {
        toast.error(err?.message || "Dosya yüklenemedi");
      } finally {
        uploadingField.value = null;
      }
      return;
    }

    // Standart upload — diğer doctype'lar için Frappe upload_file
    uploadingField.value = field.fieldname;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("is_private", "1");
      if (!isNew.value) {
        fd.append("doctype", doctype.value);
        fd.append("docname", docName.value);
        fd.append("fieldname", field.fieldname);
      }
      const apiBase = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${apiBase}/api/method/upload_file`, {
        method: "POST",
        headers: {
          "X-Frappe-CSRF-Token": await api.getCsrfToken(),
          Accept: "application/json",
        },
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      const fileUrl = json.message?.file_url || json.message;
      formData.value[field.fieldname] = fileUrl;
      toast.success("Dosya yüklendi");
    } catch (err) {
      toast.error(err.message || "Dosya yüklenemedi");
    } finally {
      uploadingField.value = null;
    }
  }

  /**
   * Child table satırındaki Attach / Attach Image alanı için inline upload.
   * uploadFile (üst-seviye field) parent doc'a bağlı upload yapar; burada satır
   * yeni eklenmiş olabilir (parent henüz kaydedilmemiş) ya da mevcut satır
   * olabilir — her iki durumda da generic upload_file yeterli, file_url
   * row[col.fieldname]'a yazılır ve parent save edildiğinde child kayıt
   * doğru file_url ile birlikte persist olur.
   */
  async function uploadRowFile(row, col, tableFieldname, idx, file) {
    if (!file) return;
    const key = `${tableFieldname}-${idx}-${col.fieldname}`;
    uploadingField.value = key;
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Storefront galerisi gibi public goruntulenen child table dosyalarini
      // is_private=0 ile yukler — aksi halde storefront guest kullanicisi 403 alir.
      fd.append("is_private", "0");
      const apiBase = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${apiBase}/api/method/upload_file`, {
        method: "POST",
        headers: {
          "X-Frappe-CSRF-Token": await api.getCsrfToken(),
          Accept: "application/json",
        },
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      const fileUrl = json.message?.file_url || json.message;
      row[col.fieldname] = fileUrl;
      toast.success("Dosya yüklendi");
    } catch (err) {
      toast.error(err?.message || "Dosya yüklenemedi");
    } finally {
      uploadingField.value = null;
    }
  }

  function customRendererFor(field) {
    if (isReadOnly(field)) return null;
    return resolveFieldRenderer(doctype.value, field.fieldname);
  }

  function evaluateDependsOn(expr) {
    // Empty / undefined expressions mean "always show".
    if (!expr || typeof expr !== "string") return true;
    const code = expr.startsWith("eval:") ? expr.slice(5) : expr;
    try {
      return !!new Function("doc", `return (${code})`)(formData.value || {});
    } catch {
      // Fail-open: invalid expression should never hide a field by accident.
      return true;
    }
  }

  function isReadOnly(field) {
    // Doctype satıcı için tamamen read-only ise tüm field'lar salt okunur
    if (!canEdit.value) return true;
    if (READONLY_FIELDS.includes(field.fieldname)) return true;
    // Satıcı için belirli alanlar salt okunur
    const sellerRoFields = SELLER_READONLY_FIELDS[doctype.value];
    if (sellerRoFields && !authStore.isAdmin && sellerRoFields.includes(field.fieldname))
      return true;
    // read_only + permlevel > 0 = sistem/audit alanları (verified_by, verified_at gibi)
    // → herkes için salt okunur, admin dahi UI'dan değiştiremez
    if (field.read_only && field.permlevel && field.permlevel > 0) return true;
    // read_only + permlevel:0 = quick-action alanları → sadece non-admin için kilit
    if (field.read_only && !authStore.isAdmin) return true;
    // permlevel > 0 alanlar sadece admin düzenleyebilir
    if (field.permlevel && field.permlevel > 0 && !authStore.isAdmin) return true;
    return false;
  }

  function isTextarea(field) {
    return TEXTAREA_TYPES.includes(field.fieldtype);
  }
  function isNumberField(field) {
    return NUMBER_TYPES.includes(field.fieldtype);
  }
  function parseOptions(options) {
    return (options || "").split("\n").filter(Boolean);
  }
  function translateOption(opt) {
    return SELECT_TRANSLATIONS[opt] || opt;
  }

  function formatReadOnly(field, value) {
    if (value === null || value === undefined) return "";
    if (field.fieldtype === "Check") return value ? "Evet" : "Hayır";
    if (field.fieldtype === "Select" && value) return translateOption(String(value));
    if (field.fieldtype === "Datetime" && value) {
      return new Date(value).toLocaleString("tr-TR");
    }
    return String(value);
  }

  function formatFieldLabel(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Parse link_filters from DocType JSON field meta (e.g. '[["Certification Type","status","=","Approved"]]') */
  function parseLinkFilters(linkFilters) {
    if (!linkFilters) return [];
    try {
      const parsed = typeof linkFilters === "string" ? JSON.parse(linkFilters) : linkFilters;
      if (Array.isArray(parsed)) {
        // Frappe link_filters format: [["DocType","field","op","value"]] (4 elements)
        // searchLink expects: [["field","op","value"]] (3 elements)
        // Handle both formats gracefully
        return parsed.map((f) => {
          if (!Array.isArray(f)) return f;
          if (f.length === 4) return [f[1], f[2], f[3]]; // strip doctype prefix
          if (f.length === 3) return f; // already in correct format
          return f;
        });
      }
      return [];
    } catch {
      return [];
    }
  }

  function childColHeaderClass(col) {
    if (col.fieldtype === "Check") return "w-20 text-center";
    if (col.fieldtype === "Int" || col.fieldtype === "Float" || col.fieldtype === "Currency")
      return "w-20 text-right";
    if (col.fieldtype === "Color") return "w-32";
    return "";
  }
  function childColCellClass(col) {
    if (col.fieldtype === "Check") return "text-center";
    if (col.fieldtype === "Int" || col.fieldtype === "Float" || col.fieldtype === "Currency")
      return "text-right";
    return "";
  }

  function isImageChildTable(childDoctype) {
    // Return true when this child table's first non-internal field is an Attach Image
    // (i.e. the table represents a photo gallery).
    const meta = childTableMeta[childDoctype];
    if (!meta || meta.length === 0) return false;
    const visible = meta.filter(
      (f) => !f.hidden && f.fieldname && !SKIP_FIELDTYPES.includes(f.fieldtype)
    );
    if (visible.length === 0) return false;
    return visible[0].fieldtype === "Attach Image";
  }

  function getFirstImageField(row, childDoctype) {
    const meta = childTableMeta[childDoctype];
    if (!meta) return "";
    for (const f of meta) {
      if (f.fieldtype === "Attach Image" && row[f.fieldname]) return row[f.fieldname];
    }
    return "";
  }

  async function uploadToChildTable(fieldname, childDoctype, event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    uploadingField.value = fieldname;
    try {
      const meta = childTableMeta[childDoctype] || [];
      const imageField = meta.find((f) => f.fieldtype === "Attach Image");
      if (!imageField) return;
      if (!childTableData[fieldname]) childTableData[fieldname] = [];
      for (const file of files) {
        try {
          const url = await api.uploadFile(file);
          const row = {};
          // Pre-fill defaults for all fields
          for (const f of meta) {
            if (!f.fieldname || SKIP_FIELDTYPES.includes(f.fieldtype)) continue;
            if (f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect") continue;
            row[f.fieldname] = f.default ?? (f.fieldtype === "Check" ? 0 : "");
          }
          row[imageField.fieldname] = url;
          // Set sort_order if column exists
          const sortField = meta.find(
            (f) => f.fieldname === "sort_order" || f.fieldname === "display_order"
          );
          if (sortField) row[sortField.fieldname] = childTableData[fieldname].length;
          childTableData[fieldname].push(row);
        } catch (err) {
          toast.error(`${file.name}: ${err.message || "Yüklenemedi"}`);
        }
      }
    } finally {
      uploadingField.value = null;
      event.target.value = "";
    }
  }

  function getChildTableColumns(childDoctype) {
    const meta = childTableMeta[childDoctype];
    if (!meta) return [];
    return meta
      .filter(
        (f) =>
          !f.hidden &&
          f.in_list_view &&
          f.fieldname &&
          !SKIP_FIELDTYPES.includes(f.fieldtype) &&
          f.fieldtype !== "Table" &&
          !(f.read_only && f.fetch_from)
      )
      .slice(0, 10);
  }

  function addChildRow(fieldname, childDoctype) {
    if (!childTableData[fieldname]) childTableData[fieldname] = [];
    const row = {};
    const cols = getChildTableColumns(childDoctype);
    for (const col of cols) {
      row[col.fieldname] = isNumberField(col) ? 0 : "";
    }
    childTableData[fieldname].push(row);
  }

  function removeChildRow(fieldname, idx) {
    if (childTableData[fieldname]) {
      childTableData[fieldname].splice(idx, 1);
    }
  }

  // ── Link field autocomplete ───────────────────────────────────────────────────
  function onLinkInput(field, value) {
    clearTimeout(linkTimers[field.fieldname]);
    if (!linkDropdowns[field.fieldname]) {
      linkDropdowns[field.fieldname] = { show: false, loading: false, results: [] };
    }
    linkDropdowns[field.fieldname].show = true;
    linkDropdowns[field.fieldname].loading = true;

    linkTimers[field.fieldname] = setTimeout(async () => {
      try {
        const res = await api.searchLink(field.options, value || "");
        linkDropdowns[field.fieldname].results = res.results || res.message || res || [];
      } catch {
        linkDropdowns[field.fieldname].results = [];
      } finally {
        linkDropdowns[field.fieldname].loading = false;
      }
    }, 300);
  }

  function selectLink(fieldname, value) {
    formData.value[fieldname] = value;
    if (linkDropdowns[fieldname]) linkDropdowns[fieldname].show = false;
    onLinkSelected(fieldname, value);
  }

  async function onLinkSelected(fieldname, value) {
    if (doctype.value === "Supported Currency" && fieldname === "currency_code" && value) {
      try {
        const res = await api.callMethod("tradehub_core.api.currency.get_currency_info", {
          currency_code: value,
        });
        const info = res?.message;
        if (info) {
          if (info.symbol && !formData.value.symbol) formData.value.symbol = info.symbol;
          if (info.currency_name && !formData.value.name_en)
            formData.value.name_en = info.currency_name;
          if (info.next_order && !formData.value.display_order)
            formData.value.display_order = info.next_order;
        }
      } catch {
        /* silent */
      }
    }
  }

  function scheduleCloseLinkDropdown(fieldname) {
    setTimeout(() => {
      if (linkDropdowns[fieldname]) linkDropdowns[fieldname].show = false;
    }, 200);
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────────
  async function runQuickAction(action) {
    if (action.disabled || actionLoading.value) return;

    // KYB Verification — Reject modal'ı aç (rejection_reason zorunlu)
    if (doctype.value === "KYB Verification" && action.key === "reject") {
      openRejectModal();
      return;
    }

    // KYB Verification — Satıcı "Yeniden Gönder": submit_kyb_documents endpoint'ine
    // form'daki belge ve data alanları gönder; status backend'de Pending'e döner.
    if (action.triggerResubmit && doctype.value === "KYB Verification") {
      actionLoading.value = true;
      pendingAction.value = action.key;
      try {
        const payload = {
          company_title: formData.value.company_title || "",
          business_type: formData.value.business_type || "",
          authorized_person: formData.value.authorized_person || "",
          tax_id_type: formData.value.tax_id_type || "",
          tax_id: formData.value.tax_id || "",
          tax_office: formData.value.tax_office || "",
          trade_registry_number: formData.value.trade_registry_number || "",
          identity_document: formData.value.identity_document || "",
          imza_sirkuleri: formData.value.imza_sirkuleri || "",
          ticaret_sicil_gazetesi: formData.value.ticaret_sicil_gazetesi || "",
          faaliyet_belgesi: formData.value.faaliyet_belgesi || "",
          vergi_levhasi: formData.value.vergi_levhasi || "",
          bank_account_document: formData.value.bank_account_document || "",
          document_expiry_date: formData.value.document_expiry_date || "",
        };
        const res = await api.callMethod("tradehub_core.api.v1.kyb.submit_kyb_documents", payload);
        if (res?.message?.resubmitted) {
          toast.success("Yeniden gönderildi, admin incelemeye alındı");
        } else {
          toast.info("Belgeler kaydedildi. Yeniden inceleme için en az bir belgeyi güncelleyin.");
        }
        await loadDoc();
      } catch (err) {
        toast.error(err.message || "Yeniden gönderme başarısız");
      } finally {
        actionLoading.value = false;
        pendingAction.value = null;
      }
      return;
    }

    let reason = "";
    if (action.requiresReason) {
      reason = window.prompt(`${action.label} gerekçesi:`);
      if (reason === null) return;
      reason = reason.trim();
      if (!reason) {
        toast.error("Gerekçe zorunludur");
        return;
      }
    }

    actionLoading.value = true;
    pendingAction.value = action.key;
    try {
      if (action.apiMethod) {
        const args = { name: docName.value };
        if (action.requiresReason) args.reason = reason;
        await api.callMethod(action.apiMethod, args);
        toast.success(`${action.label} başarılı`);
      } else if (doctype.value === "KYB Verification" && action.newStatus) {
        // KYB Verification — review_kyb endpoint'i kullan (state machine + audit)
        await api.callMethod("tradehub_core.api.v1.kyb.review_kyb", {
          kyb_name: docName.value,
          action: action.newStatus,
        });
        toast.success(`Durum güncellendi: ${action.newStatus}`);
      } else {
        formData.value.status = action.newStatus;
        await api.updateDoc(doctype.value, docName.value, { status: action.newStatus });
        toast.success(`Durum güncellendi: ${action.newStatus}`);
      }
      await loadDoc();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
      formData.value.status = docData.value.status || "";
    } finally {
      actionLoading.value = false;
      pendingAction.value = null;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/app/${encodeURIComponent(doctype.value)}`);
    }
  }

  // ── Data Loading ──────────────────────────────────────────────────────────────
  async function loadMeta() {
    try {
      const meta = await doctypeStore.getMeta(doctype.value);
      metaFields.value = meta.fields || [];
      metaPermissions.value = meta.permissions || [];

      // Child table meta'larını arka planda yükle
      for (const field of metaFields.value) {
        if (
          (field.fieldtype === "Table" || field.fieldtype === "Table MultiSelect") &&
          field.options
        ) {
          loadChildTableMeta(field.options);
        }
      }

      // Boş form objesi oluştur
      const empty = {};
      for (const f of metaFields.value) {
        if (!f.fieldname || SKIP_FIELDTYPES.includes(f.fieldtype)) continue;
        if (f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect") continue;
        empty[f.fieldname] = f.default ?? (f.fieldtype === "Check" ? 0 : "");
      }
      return empty;
    } catch {
      return {};
    }
  }

  async function loadChildTableMeta(childDoctype) {
    if (childTableMeta[childDoctype]) return;
    try {
      const meta = await doctypeStore.getMeta(childDoctype);
      childTableMeta[childDoctype] = meta.fields || [];
    } catch {
      childTableMeta[childDoctype] = [];
    }
  }

  async function loadChildTableData(fieldname, childDoctype) {
    if (!docName.value || docName.value === "new") return;
    try {
      const res = await api.getList(childDoctype, {
        filters: [["parent", "=", docName.value]],
        fields: ["*"],
        limit_page_length: 100,
      });
      childTableData[fieldname] = res.data || [];
    } catch {
      childTableData[fieldname] = [];
    }
  }

  async function loadDoc() {
    // Satıcı admin-only doctype'a erişmeye çalışıyorsa dashboard'a yönlendir
    if (!authStore.isAdmin && authStore.isSeller && ADMIN_ONLY_DOCTYPES.has(doctype.value)) {
      router.push("/dashboard");
      return;
    }

    loading.value = true;
    try {
      const emptyFromMeta = await loadMeta();

      if (isNew.value) {
        // URL query'deki anahtarları meta'da bulunan alanlara prefill olarak uygula
        // (örn. ?listing=LST-00013 → Listing Variant formunda listing alanı otomatik dolsun)
        const prefill = { ...emptyFromMeta };
        const reservedQuery = new Set(["returnTo"]);
        for (const [key, val] of Object.entries(route.query || {})) {
          if (reservedQuery.has(key)) continue;
          if (val == null || val === "") continue;
          if (Object.prototype.hasOwnProperty.call(prefill, key)) {
            prefill[key] = Array.isArray(val) ? val[0] : val;
          }
        }
        formData.value = prefill;
      } else {
        try {
          const res = await api.getDoc(doctype.value, docName.value);
          docData.value = res.data || {};
          formData.value = { ...emptyFromMeta, ...docData.value };

          // Child table verilerini parent doc response'undan yükle
          for (const field of childTableFields.value) {
            const rows = docData.value[field.fieldname];
            if (Array.isArray(rows) && rows.length > 0) {
              childTableData[field.fieldname] = rows;
            } else {
              // Fallback: try separate API call (for non-child-table scenarios)
              loadChildTableData(field.fieldname, field.options);
            }
            // Load child table meta for column definitions
            loadChildTableMeta(field.options);
          }
        } catch {
          docData.value = { name: docName.value, doctype: doctype.value };
          formData.value = { ...docData.value };
        }
      }
    } finally {
      loading.value = false;
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function saveDoc() {
    // Zorunlu alanları client-side doğrula
    const missingFields = metaFields.value.filter(
      (f) =>
        f.reqd &&
        !f.hidden &&
        !READONLY_FIELDS.includes(f.fieldname) &&
        !["Table", "Table MultiSelect", "Section Break", "Column Break", "Tab Break"].includes(
          f.fieldtype
        ) &&
        (formData.value[f.fieldname] === "" ||
          formData.value[f.fieldname] === null ||
          formData.value[f.fieldname] === undefined)
    );
    if (missingFields.length > 0) {
      toast.error(
        `Zorunlu alanlar eksik: ${missingFields.map((f) => f.label || f.fieldname).join(", ")}`
      );
      return;
    }

    saving.value = true;
    try {
      // Sadece yazılabilir alanları gönder
      const payload = {};
      for (const f of metaFields.value) {
        if (!f.fieldname || SKIP_FIELDTYPES.includes(f.fieldtype)) continue;
        if (READONLY_FIELDS.includes(f.fieldname)) continue;

        // Child table alanları — canEdit ise kaydet
        if (f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect") {
          if (canEdit.value && childTableData[f.fieldname]) {
            // Her satırdan sadece alan değerlerini gönder (name hariç yeni satırlar için)
            payload[f.fieldname] = childTableData[f.fieldname].map((row) => {
              const clean = {};
              for (const [k, v] of Object.entries(row)) {
                if (!READONLY_FIELDS.includes(k) || k === "name") {
                  clean[k] = v;
                }
              }
              return clean;
            });
          }
          continue;
        }

        // Admin olmayan kullanıcılar read_only ve permlevel > 0 alanları göndermesin
        if (f.read_only && !authStore.isAdmin) continue;
        if (f.permlevel && f.permlevel > 0 && !authStore.isAdmin) continue;
        payload[f.fieldname] = formData.value[f.fieldname];
      }

      if (isNew.value) {
        const res = await api.createDoc(doctype.value, payload);
        const newName = res.data?.name;
        toast.success(`${doctypeLabel.value} oluşturuldu`);
        const returnTo = route.query.returnTo;
        if (returnTo) {
          router.push(returnTo);
        } else if (newName) {
          router.replace(
            `/app/${encodeURIComponent(doctype.value)}/${encodeURIComponent(newName)}`
          );
        } else {
          router.push(`/app/${encodeURIComponent(doctype.value)}`);
        }
      } else {
        await api.updateDoc(doctype.value, docName.value, payload);
        toast.success("Kayıt güncellendi");
        await loadDoc();
      }
    } catch (err) {
      toast.error(err.message || "Kayıt sırasında hata oluştu");
    } finally {
      saving.value = false;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  watch(
    () => route.params.name,
    () => {
      activeTab.value = "";
      loadDoc();
    }
  );
  onMounted(() => {
    loadDoc();
    document.addEventListener("keydown", handleEscKey);
  });
  onUnmounted(() => {
    document.removeEventListener("keydown", handleEscKey);
  });
</script>

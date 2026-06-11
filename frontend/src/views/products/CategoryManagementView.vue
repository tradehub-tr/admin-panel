<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("categoryManagement.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("categoryManagement.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" :modes="['table', 'cards']" data-tour="cat-view" />
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          :class="
            showOnlyUntranslated
              ? '!border-amber-400 !text-amber-700 !bg-amber-50 dark:!bg-amber-900/20'
              : ''
          "
          data-tour="cat-filter"
          :title="t('categoryManagement.filterUntranslatedHint')"
          @click="showOnlyUntranslated = !showOnlyUntranslated"
        >
          <AppIcon name="globe" :size="13" />
          {{ t("categoryManagement.filterUntranslated") }}
        </button>
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadRoots">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("categoryManagement.refresh") }}
        </button>
        <button
          v-if="selectedIds.size > 0"
          class="hdr-btn-danger flex items-center gap-1.5"
          @click="openBulkDeleteModal"
        >
          <AppIcon name="trash-2" :size="13" />
          {{ t("categoryManagement.deleteSelected", { count: selectedIds.size }) }}
        </button>
        <button
          v-if="nodes.length > 0"
          class="hdr-btn-outlined flex items-center gap-1.5 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20"
          @click="openDeleteAllModal"
        >
          <AppIcon name="circle-alert" :size="13" />
          {{ t("categoryManagement.deleteAll") }}
        </button>
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="openImportModal">
          <AppIcon name="upload" :size="13" />
          {{ t("categoryManagement.importJson") }}
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" data-tour="cat-add" @click="openAddModal(null)">
          <AppIcon name="plus" :size="13" />
          {{ t("categoryManagement.addRootCategory") }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("categoryManagement.loading") }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="nodes.length === 0" class="card text-center py-12">
      <AppIcon
        name="folder-open"
        :size="32"
        class="text-gray-300 dark:text-gray-600 mx-auto mb-3"
      />
      <p class="text-sm text-gray-400">{{ t("categoryManagement.empty") }}</p>
    </div>

    <!-- Tree Table (hiyerarşik — genişlet/daralt yalnızca bu modda) -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0" data-tour="cat-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="px-4 py-3 w-10">
              <input
                type="checkbox"
                class="form-checkbox"
                :checked="allVisibleSelected"
                :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                :title="t('categoryManagement.toggleSelectVisible')"
                @change="toggleSelectAllVisible"
              />
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryManagement.columnName") }}
            </th>
            <th
              class="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell"
            >
              {{ t("categoryManagement.columnUrlSlug") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryManagement.columnActive") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryManagement.columnSub") }}
            </th>
            <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryManagement.columnAction") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="node in displayNodes"
            :key="node.id"
            :style="{ '--lvc': levelHex(node.depth) }"
            :class="[
              selectedIds.has(node.id) ? 'bg-violet-50/40 dark:bg-violet-900/10' : '',
              selectedIds.has(node.id) || node.expanded ? 'cat-accent' : '',
            ]"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
          >
            <!-- Selection checkbox -->
            <td class="px-4 py-2.5">
              <input
                type="checkbox"
                class="form-checkbox"
                :checked="selectedIds.has(node.id)"
                @change="toggleSelect(node.id)"
              />
            </td>
            <!-- Name with indent -->
            <td class="px-4 py-2.5">
              <div
                class="flex items-center gap-1.5"
                :class="node.depth > 0 ? 'cat-twig' : ''"
                :style="{ paddingLeft: node.depth * 20 + 'px', '--ind': node.depth * 20 + 'px' }"
              >
                <button
                  v-if="node.child_count > 0 || node.expanded"
                  class="w-5 h-5 flex items-center justify-center flex-shrink-0 opacity-80 hover:opacity-100"
                  @click="toggleExpand(node)"
                >
                  <AppIcon
                    v-if="node.loadingChildren"
                    name="loader"
                    :size="11"
                    class="animate-spin text-gray-400"
                  />
                  <AppIcon
                    v-else-if="node.expanded"
                    name="chevron-down"
                    :size="12"
                    :class="levelText(node.depth)"
                  />
                  <AppIcon v-else name="chevron-right" :size="12" :class="levelText(node.depth)" />
                </button>
                <span v-else class="w-5 flex-shrink-0"></span>
                <AppIcon
                  name="folder"
                  :size="13"
                  :class="node.is_active ? levelText(node.depth) : 'text-gray-300'"
                  class="flex-shrink-0"
                />
                <span
                  class="text-xs text-gray-800 dark:text-gray-200"
                  :class="node.depth === 0 ? 'font-semibold' : 'font-medium'"
                  >{{ node.name }}</span
                >
                <span
                  class="ml-1.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                  :class="langBadgeClass(node)"
                  :title="langBadgeTitle(node)"
                  >{{ (node.nameLangs || []).length }}/{{ CONTENT_LANGS.length }}</span
                >
              </div>
            </td>
            <!-- URL Slug -->
            <td class="px-4 py-2.5 hidden md:table-cell">
              <span class="text-xs text-gray-400 font-mono">{{ node.url_slug || "—" }}</span>
            </td>
            <!-- Active toggle -->
            <td class="px-4 py-2.5 text-center">
              <button
                :class="
                  node.is_active
                    ? 'text-emerald-500 hover:text-emerald-600'
                    : 'text-gray-300 hover:text-gray-400'
                "
                class="transition-colors"
                :title="
                  node.is_active
                    ? t('categoryManagement.activeClickToDeactivate')
                    : t('categoryManagement.inactiveClickToActivate')
                "
                @click="toggleActive(node)"
              >
                <AppIcon :name="node.is_active ? 'circle-check' : 'circle'" :size="14" />
              </button>
            </td>
            <!-- Child count -->
            <td class="px-4 py-2.5 text-center">
              <span
                v-if="node.child_count > 0"
                class="cat-count inline-block text-[11px] font-bold px-2 py-0.5 rounded-full leading-none"
                >{{ node.child_count }}</span
              >
              <span v-else class="text-xs text-gray-300 dark:text-gray-600">0</span>
            </td>
            <!-- Actions -->
            <td class="px-4 py-2.5">
              <div class="flex items-center justify-end gap-0.5">
                <button
                  class="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
                  :title="t('categoryManagement.addSubcategory')"
                  @click="openAddModal(node.id)"
                >
                  <AppIcon name="folder-plus" :size="13" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  :title="t('categoryManagement.edit')"
                  @click="openEditModal(node)"
                >
                  <AppIcon name="pencil" :size="13" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  :title="t('categoryManagement.delete')"
                  @click="confirmDelete(node)"
                >
                  <AppIcon name="trash-2" :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drill-down kart navigasyonu — bir kategoriye in, altındakileri renkli kart gör -->
    <div v-else-if="viewMode === 'cards'">
      <!-- breadcrumb + ekle -->
      <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1 text-sm flex-wrap">
          <button
            class="flex items-center gap-1 text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            @click="drillTo(-1)"
          >
            <AppIcon name="house" :size="13" /> {{ t("categoryManagement.drillHome") }}
          </button>
          <template v-for="(crumb, i) in drillPath" :key="crumb.id">
            <AppIcon name="chevron-right" :size="12" class="text-gray-400 flex-shrink-0" />
            <button
              class="px-2 py-0.5 rounded transition-colors"
              :class="
                i === drillPath.length - 1
                  ? 'font-semibold'
                  : 'text-gray-500 hover:text-violet-600 dark:hover:text-violet-400'
              "
              :style="
                i === drillPath.length - 1
                  ? { color: levelHex(i), background: levelSoft(i) }
                  : {}
              "
              @click="drillTo(i)"
            >
              {{ crumb.name }}
            </button>
          </template>
        </div>
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="openAddModal(drillParentId)"
        >
          <AppIcon name="folder-plus" :size="13" />
          {{
            drillParentId
              ? t("categoryManagement.addSubcategory")
              : t("categoryManagement.addRootCategory")
          }}
        </button>
      </div>

      <!-- loading -->
      <div v-if="drillLoading" class="card text-center py-12">
        <AppIcon name="loader" :size="22" class="text-violet-500 animate-spin mx-auto" />
      </div>
      <!-- empty -->
      <div v-else-if="drillNodes.length === 0" class="card text-center py-12">
        <AppIcon
          name="folder-open"
          :size="28"
          class="text-gray-300 dark:text-gray-600 mx-auto mb-2"
        />
        <p class="text-sm text-gray-400">{{ t("categoryManagement.drillEmpty") }}</p>
      </div>
      <!-- cards -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="node in drillNodes"
          :key="node.id"
          class="cat-card group relative rounded-xl p-3.5 cursor-pointer"
          :style="{ '--lvc': levelHex(drillPath.length), '--lvs': levelSoft(drillPath.length) }"
          @click="onCardClick(node)"
        >
          <!-- hover aksiyonları -->
          <div
            class="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              class="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              :title="t('categoryManagement.edit')"
              @click.stop="openEditModal(node)"
            >
              <AppIcon name="pencil" :size="12" />
            </button>
            <button
              class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              :title="t('categoryManagement.delete')"
              @click.stop="confirmDelete(node)"
            >
              <AppIcon name="trash-2" :size="12" />
            </button>
          </div>
          <div class="flex items-center gap-2 mb-2 pr-12">
            <AppIcon
              name="folder"
              :size="16"
              class="flex-shrink-0"
              :class="node.is_active ? 'cat-card-icon' : 'text-gray-300 dark:text-gray-600'"
            />
            <span class="font-semibold text-[13px] text-gray-800 dark:text-gray-200 truncate">{{
              node.name
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-gray-500 flex items-center gap-1">
              <template v-if="node.child_count > 0">
                {{ t("categoryManagement.subCount", { count: node.child_count }) }}
                <AppIcon name="chevron-right" :size="11" class="cat-card-icon" />
              </template>
              <template v-else>{{ t("categoryManagement.leafCategory") }}</template>
            </span>
            <div class="flex items-center gap-1.5">
              <button
                class="transition-colors"
                :class="node.is_active ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'"
                :title="
                  node.is_active
                    ? t('categoryManagement.activeClickToDeactivate')
                    : t('categoryManagement.inactiveClickToActivate')
                "
                @click.stop="toggleActive(node)"
              >
                <AppIcon :name="node.is_active ? 'circle-check' : 'circle'" :size="13" />
              </button>
              <span
                class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                :class="langBadgeClass(node)"
                :title="langBadgeTitle(node)"
                >{{ (node.nameLangs || []).length }}/{{ CONTENT_LANGS.length }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Add/Edit Modal ── -->
    <div v-if="formModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="formModal.show = false"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[440px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{
            formModal.isEdit
              ? t("categoryManagement.editCategory")
              : t("categoryManagement.newCategory")
          }}
        </h3>
        <div
          v-if="formModal.parentName"
          class="text-xs text-gray-400 mb-3 flex items-center gap-1.5"
        >
          <AppIcon name="folder" :size="12" />
          {{ t("categoryManagement.parentCategory") }}
          <strong class="text-gray-700 dark:text-gray-300">{{ formModal.parentName }}</strong>
        </div>
        <div class="space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="form-label mb-0">{{ t("categoryManagement.categoryNameLabel") }}</label>
              <span class="flex items-center gap-1.5 text-xs text-gray-500">
                {{ t("categoryManagement.contentDefaultLang") }}:
                <select
                  v-model="formModal.content_default_lang"
                  class="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                >
                  <option v-for="lng in CONTENT_LANGS" :key="lng" :value="lng">
                    {{ lng.toUpperCase() }}
                  </option>
                </select>
                <span class="font-semibold text-gray-600 dark:text-gray-300"
                  >{{ filledCatLangs }}/{{ CONTENT_LANGS.length }}</span
                >
              </span>
            </div>
            <!-- 4 dil bir arada: kaynak (varsayılan dil) üstte; her dilin dolu/eksik
                 göstergesi (●); boş dilde "kaynaktan kopyala". -->
            <div class="space-y-1.5">
              <div v-for="lng in orderedCatLangs" :key="lng" class="flex items-center gap-2">
                <span
                  class="inline-flex w-9 shrink-0 items-center gap-1 text-xs font-semibold text-gray-500"
                >
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="
                      (formModal.categoryNames[lng] || '').trim() ? 'bg-green-500' : 'bg-gray-300'
                    "
                  ></span>
                  {{ lng.toUpperCase() }}
                </span>
                <input
                  v-model="formModal.categoryNames[lng]"
                  class="form-input flex-1"
                  :class="
                    lng === formModal.content_default_lang ? 'bg-gray-50 dark:bg-gray-800' : ''
                  "
                  :dir="lng === 'ar' ? 'rtl' : 'ltr'"
                  :placeholder="
                    lng === formModal.content_default_lang
                      ? t('categoryManagement.categoryNamePlaceholder')
                      : ''
                  "
                  @keyup.enter="saveCategory"
                />
                <button
                  v-if="
                    lng !== formModal.content_default_lang &&
                    !(formModal.categoryNames[lng] || '').trim() &&
                    (formModal.categoryNames[formModal.content_default_lang] || '').trim()
                  "
                  type="button"
                  class="whitespace-nowrap rounded border border-gray-200 px-2 py-1 text-xs text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  @click="
                    formModal.categoryNames[lng] =
                      formModal.categoryNames[formModal.content_default_lang]
                  "
                >
                  {{ t("categoryManagement.copyFromSource") }}
                </button>
                <span
                  v-if="isLangStale(lng)"
                  class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-amber-600 dark:text-amber-400"
                  :title="t('categoryManagement.sourceChangedReviewHint')"
                >
                  <AppIcon name="triangle-alert" :size="12" />
                  {{ t("categoryManagement.sourceChangedReview") }}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label class="form-label"
              >{{ t("categoryManagement.urlSlugLabel") }}
              <span class="text-gray-400 font-normal">{{
                t("categoryManagement.urlSlugHint")
              }}</span></label
            >
            <input
              v-model="formModal.url_slug"
              class="form-input"
              :placeholder="t('categoryManagement.urlSlugPlaceholder')"
            />
          </div>
          <div>
            <label class="form-label"
              >{{ t("categoryManagement.iconClassLabel") }}
              <span class="text-gray-400 font-normal">{{
                t("categoryManagement.iconClassHint")
              }}</span></label
            >
            <input
              v-model="formModal.icon_class"
              class="form-input"
              :placeholder="t('categoryManagement.iconClassPlaceholder')"
            />
          </div>
          <!-- Image upload -->
          <div>
            <label class="form-label">{{ t("categoryManagement.categoryImage") }}</label>
            <div class="flex items-center gap-3">
              <div
                class="relative w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:border-violet-400 transition-colors"
                :class="
                  formModal.image ? 'border-violet-300' : 'border-gray-200 dark:border-[#2a2a35]'
                "
                @click="catImageInput.click()"
              >
                <img
                  v-if="formModal.image"
                  :src="formModal.image"
                  class="w-full h-full object-cover"
                />
                <AppIcon v-else name="image-plus" :size="20" class="text-gray-300" />

                <!-- tradehub-upload-ui bar overlay -->
                <div
                  v-if="catImageUpload.status.value === 'uploading'"
                  class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                >
                  <div
                    class="h-full bg-white rounded-full transition-all duration-300"
                    :style="{ width: Math.max(4, catImageUpload.progress.value) + '%' }"
                  ></div>
                </div>
                <Transition name="fade">
                  <div
                    v-if="catImageUpload.status.value === 'success'"
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none"
                  >
                    ✓
                  </div>
                </Transition>
              </div>
              <div class="flex-1">
                <button
                  type="button"
                  class="hdr-btn-outlined text-xs flex items-center gap-1.5"
                  @click="catImageInput.click()"
                >
                  <AppIcon
                    v-if="formModal.imageUploading"
                    name="loader"
                    :size="12"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="upload" :size="12" />
                  {{
                    formModal.image
                      ? t("categoryManagement.change")
                      : t("categoryManagement.uploadImage")
                  }}
                </button>
                <button
                  v-if="formModal.image"
                  type="button"
                  class="ml-2 text-xs text-red-400 hover:text-red-600"
                  @click="formModal.image = ''"
                >
                  {{ t("categoryManagement.remove") }}
                </button>
                <p class="text-[11px] text-gray-400 mt-1">
                  {{ t("categoryManagement.imageHint") }}
                </p>
              </div>
            </div>
            <input
              ref="catImageInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleCatImageUpload"
            />
          </div>
          <div>
            <label class="form-label">{{ t("categoryManagement.sortOrder") }}</label>
            <input v-model.number="formModal.sort_order" type="number" class="form-input" />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="modal-active"
              v-model="formModal.is_active"
              type="checkbox"
              class="form-checkbox"
            />
            <label
              for="modal-active"
              class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >{{ t("categoryManagement.active") }}</label
            >
          </div>
        </div>
        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="formModal.show = false">
            {{ t("categoryManagement.cancel") }}
          </button>
          <button
            :disabled="formModal.saving"
            class="hdr-btn-primary flex items-center gap-1.5"
            @click="saveCategory"
          >
            <AppIcon v-if="formModal.saving" name="loader" :size="13" class="animate-spin" />
            {{ formModal.isEdit ? t("categoryManagement.update") : t("categoryManagement.add") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ── -->
    <div v-if="deleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="deleteModal.show = false"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[400px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
          {{ t("categoryManagement.deleteCategoryTitle") }}
        </h3>
        <p class="text-sm text-gray-500 mb-1">
          <strong class="text-gray-800 dark:text-gray-200">{{ deleteModal.node?.name }}</strong>
          {{ t("categoryManagement.deleteCategoryText") }}
        </p>
        <p v-if="deleteModal.node?.child_count > 0" class="text-xs text-red-500 mb-3">
          {{ t("categoryManagement.deleteHasChildren", { count: deleteModal.node.child_count }) }}
        </p>
        <p v-else class="text-xs text-gray-400 mb-3">
          {{ t("categoryManagement.irreversible") }}
        </p>
        <div class="flex gap-3 justify-end">
          <button class="hdr-btn-outlined" @click="deleteModal.show = false">
            {{ t("categoryManagement.cancel") }}
          </button>
          <button
            :disabled="deleteModal.deleting || deleteModal.node?.child_count > 0"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="deleteCategory"
          >
            <AppIcon v-if="deleteModal.deleting" name="loader" :size="13" class="animate-spin" />
            {{ t("categoryManagement.delete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Bulk Delete Modal ── -->
    <div v-if="bulkDeleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        class="absolute inset-0 bg-black/40"
        @click="!bulkDeleteModal.deleting && (bulkDeleteModal.show = false)"
      ></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
          {{ t("categoryManagement.bulkDeleteTitle") }}
        </h3>
        <p class="text-sm text-gray-500 mb-2">
          <strong class="text-gray-800 dark:text-gray-200">{{ selectedIds.size }}</strong>
          {{ t("categoryManagement.bulkDeleteText") }}
        </p>
        <p class="text-xs text-red-500 mb-4">{{ t("categoryManagement.irreversible") }}</p>
        <div class="flex gap-3 justify-end">
          <button
            :disabled="bulkDeleteModal.deleting"
            class="hdr-btn-outlined"
            @click="bulkDeleteModal.show = false"
          >
            {{ t("categoryManagement.cancel") }}
          </button>
          <button
            :disabled="bulkDeleteModal.deleting"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="runBulkDelete"
          >
            <AppIcon
              v-if="bulkDeleteModal.deleting"
              name="loader"
              :size="13"
              class="animate-spin"
            />
            {{ t("categoryManagement.delete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete All Modal ── -->
    <div v-if="deleteAllModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        class="absolute inset-0 bg-black/40"
        @click="!deleteAllModal.deleting && (deleteAllModal.show = false)"
      ></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[440px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
          <AppIcon name="circle-alert" :size="16" />
          {{ t("categoryManagement.deleteAllTitle") }}
        </h3>
        <p class="text-sm text-gray-500 mb-2">
          {{ t("categoryManagement.deleteAllTextBefore") }}
          <strong class="text-gray-800 dark:text-gray-200">{{
            t("categoryManagement.deleteAllAll")
          }}</strong>
          {{ t("categoryManagement.deleteAllTextAfter") }}
        </p>
        <p class="text-xs text-red-500 mb-3">
          {{ t("categoryManagement.deleteAllConfirmPromptBefore") }}
          <strong>SIL</strong> {{ t("categoryManagement.deleteAllConfirmPromptAfter") }}
        </p>
        <input
          v-model="deleteAllModal.confirmText"
          type="text"
          class="form-input"
          placeholder="SIL"
          @keyup.enter="deleteAllModal.confirmText === 'SIL' && runDeleteAll()"
        />
        <div class="flex gap-3 justify-end mt-5">
          <button
            :disabled="deleteAllModal.deleting"
            class="hdr-btn-outlined"
            @click="deleteAllModal.show = false"
          >
            {{ t("categoryManagement.cancel") }}
          </button>
          <button
            :disabled="deleteAllModal.deleting || deleteAllModal.confirmText !== 'SIL'"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="runDeleteAll"
          >
            <AppIcon v-if="deleteAllModal.deleting" name="loader" :size="13" class="animate-spin" />
            {{ t("categoryManagement.deleteAll") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Import Modal ── -->
    <div v-if="importModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        class="absolute inset-0 bg-black/40"
        @click="!importModal.importing && (importModal.show = false)"
      ></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[480px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
          {{ t("categoryManagement.importJson") }}
        </h3>
        <p class="text-xs text-gray-400 mb-4">
          {{ t("categoryManagement.expectedFormat") }}
          <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded"
            >[{"id": "...", "name": "...", "parent_id": "..."}]</code
          >
        </p>

        <!-- Upload area -->
        <div v-if="!importModal.result && !importModal.importing">
          <div
            class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            :class="
              importModal.data
                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/10'
                : 'border-gray-200 dark:border-[#2a2a35] hover:border-violet-400'
            "
            @click="fileInput.click()"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <AppIcon
              :name="importModal.data ? 'circle-check' : 'upload-cloud'"
              :size="28"
              :class="importModal.data ? 'text-violet-500' : 'text-gray-300'"
              class="mx-auto mb-2"
            />
            <p
              class="text-sm"
              :class="
                importModal.data
                  ? 'text-violet-700 dark:text-violet-400 font-medium'
                  : 'text-gray-500'
              "
            >
              {{ importModal.fileName || t("categoryManagement.selectOrDropJson") }}
            </p>
            <p v-if="importModal.data" class="text-xs text-gray-400 mt-1">
              {{ t("categoryManagement.recordsRead", { count: importModal.data.length }) }}
            </p>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleFileSelect"
          />

          <div class="flex gap-3 justify-end mt-4">
            <button class="hdr-btn-outlined" @click="importModal.show = false">
              {{ t("categoryManagement.cancel") }}
            </button>
            <button
              :disabled="!importModal.data"
              class="hdr-btn-primary flex items-center gap-1.5"
              @click="runImport"
            >
              {{ t("categoryManagement.import") }}
            </button>
          </div>
        </div>

        <!-- Progress -->
        <div v-else-if="importModal.importing && !importModal.result" class="py-2">
          <div class="flex items-center gap-2 mb-3">
            <AppIcon name="loader" :size="16" class="text-violet-500 animate-spin" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{
                importModal.progress?.state === "queued"
                  ? t("categoryManagement.queuedStarting")
                  : t("categoryManagement.importing")
              }}
            </span>
          </div>
          <div class="w-full h-2 bg-gray-100 dark:bg-[#2a2a35] rounded-full overflow-hidden mb-2">
            <div
              class="h-full bg-violet-500 transition-all duration-300"
              :style="{ width: importPct + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mb-4">
            <span
              >{{ importModal.progress?.processed || 0 }} /
              {{ importModal.progress?.total || 0 }}</span
            >
            <span>{{ importPct }}%</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
              <p class="font-bold text-emerald-600">{{ importModal.progress?.inserted || 0 }}</p>
              <p class="text-gray-500">{{ t("categoryManagement.new") }}</p>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              <p class="font-bold text-blue-600">{{ importModal.progress?.updated || 0 }}</p>
              <p class="text-gray-500">{{ t("categoryManagement.current") }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p class="font-bold text-gray-500">{{ importModal.progress?.skipped || 0 }}</p>
              <p class="text-gray-500">{{ t("categoryManagement.skipped") }}</p>
            </div>
          </div>
          <p class="text-[11px] text-gray-400 mt-3 text-center">
            {{ t("categoryManagement.backgroundNote") }}
          </p>
        </div>

        <!-- Result -->
        <div v-else class="text-center py-2">
          <AppIcon name="circle-check" :size="36" class="text-emerald-400 mx-auto mb-3" />
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {{ t("categoryManagement.importComplete") }}
          </p>
          <div class="grid grid-cols-3 gap-3 text-center mb-5">
            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <p class="text-xl font-bold text-emerald-600">{{ importModal.result.inserted }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ t("categoryManagement.added") }}</p>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p class="text-xl font-bold text-blue-600">{{ importModal.result.updated }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ t("categoryManagement.updated") }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p class="text-xl font-bold text-gray-500">{{ importModal.result.skipped }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ t("categoryManagement.skipped") }}</p>
            </div>
          </div>
          <button class="hdr-btn-primary" @click="closeImportAndReload">
            {{ t("categoryManagement.ok") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { CONTENT_LANGS } from "@/composables/useLangFields";
  import { usePageTour } from "@/composables/usePageTour";

  const emptyNames = () => ({ tr: "", en: "", ar: "", ru: "" });

  // Çeviri formu: kaynak (varsayılan) dil önce, sonra diğerleri — 4 dil bir arada.
  const orderedCatLangs = computed(() => {
    const dl = formModal.value.content_default_lang || "tr";
    return [dl, ...CONTENT_LANGS.filter((l) => l !== dl)];
  });
  // Kategori adının dolu olduğu dil sayısı (tamamlanmışlık göstergesi).
  const filledCatLangs = computed(
    () => CONTENT_LANGS.filter((l) => (formModal.value.categoryNames?.[l] || "").trim()).length
  );

  // Bayatlama (staleness): form açılışındaki ad snapshot'ı. Kaynak (varsayılan dil)
  // değiştirilirse, dolu olan diğer diller "gözden geçir" diye işaretlenir.
  const formInitialNames = ref({});
  function isLangStale(lng) {
    const dl = formModal.value.content_default_lang || "tr";
    if (lng === dl) return false;
    const hasValue = (formModal.value.categoryNames?.[lng] || "").trim();
    const curSrc = (formModal.value.categoryNames?.[dl] || "").trim();
    const initSrc = (formInitialNames.value?.[dl] || "").trim();
    return !!hasValue && curSrc !== initSrc;
  }

  const { t } = useI18n();

  // Sayfa-içi onboarding: liste → ekle → görünüm → eksik filtre.
  usePageTour("category-management", () => [
    { target: '[data-tour="cat-table"]', title: t("tourSteps.page.catTable_t"), desc: t("tourSteps.page.catTable_d") },
    { target: '[data-tour="cat-add"]', title: t("tourSteps.page.catAdd_t"), desc: t("tourSteps.page.catAdd_d") },
    { target: '[data-tour="cat-view"]', title: t("tourSteps.page.catView_t"), desc: t("tourSteps.page.catView_d") },
    { target: '[data-tour="cat-filter"]', title: t("tourSteps.page.catFilter_t"), desc: t("tourSteps.page.catFilter_d") },
  ]);

  const { viewMode } = useListViewMode("category-management", "table");

  // tradehub-upload-ui pattern — kategori resmi upload bar overlay
  const catImageUpload = useImageUploadProgress();

  const toast = useToast();
  const loading = ref(false);
  const nodes = ref([]);

  // Çeviri tamamlanmışlık filtresi (Faz 2): yalnızca eksik çevirili kategoriler.
  const showOnlyUntranslated = ref(false);
  const displayNodes = computed(() =>
    showOnlyUntranslated.value
      ? nodes.value.filter((n) => (n.nameLangs || []).length < CONTENT_LANGS.length)
      : nodes.value
  );
  // Liste rozeti: dolu dil sayısına göre renk + eksik dil tooltip'i.
  function langBadgeClass(node) {
    const n = (node.nameLangs || []).length;
    if (n >= CONTENT_LANGS.length)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (n <= 1) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }
  function langBadgeTitle(node) {
    const missing = CONTENT_LANGS.filter((l) => !(node.nameLangs || []).includes(l));
    return missing.length
      ? t("categoryManagement.missingLangs", {
          langs: missing.map((l) => l.toUpperCase()).join(", "),
        })
      : t("categoryManagement.allTranslated");
  }

  // Seviye-bazlı renk paleti — hiyerarşi derinliğini görsel olarak ayırır.
  // Panelin token paletinden (violet/blue/emerald/amber/rose/cyan); 6'dan derin
  // ağaçta döngü tekrar eder.
  const LEVEL_HEX = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];
  const LEVEL_TEXT = [
    "text-violet-500",
    "text-blue-500",
    "text-emerald-500",
    "text-amber-500",
    "text-rose-500",
    "text-cyan-500",
  ];
  const levelHex = (d) => LEVEL_HEX[d % LEVEL_HEX.length];
  const levelText = (d) => LEVEL_TEXT[d % LEVEL_TEXT.length];
  const levelSoft = (d) => `${LEVEL_HEX[d % LEVEL_HEX.length]}1f`; // ~%12 alpha

  // ── Drill-down kart görünümü ──────────────────────────
  // table ağaç state'inden (nodes) bağımsız; cards modunda parent bazlı gezinir.
  const drillNodes = ref([]);
  const drillPath = ref([]); // [{ id, name }] — kökten geçerli seviyeye
  const drillParentId = ref(null);
  const drillLoading = ref(false);

  async function loadDrill(parentId) {
    drillLoading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_category_tree", {
        parent: parentId,
      });
      drillNodes.value = (res.message || []).map((c) => toNode(c, 0));
    } catch (err) {
      toast.error(err.message || t("categoryManagement.loadFailed"));
      drillNodes.value = [];
    } finally {
      drillLoading.value = false;
    }
  }

  function drillInto(node) {
    drillPath.value = [...drillPath.value, { id: node.id, name: node.name }];
    drillParentId.value = node.id;
    loadDrill(node.id);
  }

  // index -1 → kök (Ana Sayfa); 0..n → breadcrumb seviyesi
  function drillTo(index) {
    if (index < 0) {
      drillPath.value = [];
      drillParentId.value = null;
    } else {
      drillPath.value = drillPath.value.slice(0, index + 1);
      drillParentId.value = drillPath.value[index].id;
    }
    loadDrill(drillParentId.value);
  }

  function onCardClick(node) {
    if (node.child_count > 0) drillInto(node);
    else openEditModal(node);
  }

  // ── Helpers ───────────────────────────────────────────

  function toNode(c, depth) {
    return {
      id: c.name,
      name: c.category_name,
      url_slug: c.url_slug || "",
      image: c.image || "",
      icon_class: c.icon_class || "",
      is_active: !!c.is_active,
      sort_order: c.sort_order || 0,
      child_count: c.child_count || 0,
      parent_id: c.parent_product_category || null,
      nameLangs: c.name_langs || [],
      depth,
      expanded: false,
      loadingChildren: false,
    };
  }

  // ── Tree loading ──────────────────────────────────────

  async function loadRoots() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_category_tree", {
        parent: null,
      });
      nodes.value = (res.message || []).map((c) => toNode(c, 0));
    } catch (err) {
      toast.error(err.message || t("categoryManagement.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function toggleExpand(node) {
    if (node.expanded) {
      collapseNode(node);
      return;
    }
    node.loadingChildren = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_category_tree", {
        parent: node.id,
      });
      const children = (res.message || []).map((c) => toNode(c, node.depth + 1));
      const idx = nodes.value.findIndex((n) => n.id === node.id);
      nodes.value.splice(idx + 1, 0, ...children);
      node.expanded = true;
    } catch (err) {
      toast.error(err.message || t("categoryManagement.loadChildrenFailed"));
    } finally {
      node.loadingChildren = false;
    }
  }

  function collapseNode(node) {
    const idx = nodes.value.findIndex((n) => n.id === node.id);
    let end = idx + 1;
    while (end < nodes.value.length && nodes.value[end].depth > node.depth) end++;
    nodes.value.splice(idx + 1, end - idx - 1);
    node.expanded = false;
  }

  // ── Add/Edit Modal ────────────────────────────────────

  const catImageInput = ref(null);

  const formModal = ref({
    show: false,
    isEdit: false,
    saving: false,
    id: null,
    parentId: null,
    parentName: null,
    name: "",
    url_slug: "",
    icon_class: "",
    sort_order: 0,
    is_active: true,
    image: "",
    imageUploading: false,
    // i18n: dil-bazlı kategori adları + kaynak/varsayılan dil.
    categoryNames: emptyNames(),
    content_default_lang: "tr",
  });

  function openAddModal(parentId) {
    const parentNode = parentId ? nodes.value.find((n) => n.id === parentId) : null;
    formModal.value = {
      show: true,
      isEdit: false,
      saving: false,
      id: null,
      parentId,
      parentName: parentNode?.name || null,
      name: "",
      url_slug: "",
      icon_class: "",
      sort_order: 0,
      is_active: true,
      image: "",
      imageUploading: false,
      categoryNames: emptyNames(),
      content_default_lang: "tr",
    };
    // Yeni kayıt: snapshot boş → kaynak henüz "değişmedi" sayılır.
    formInitialNames.value = { ...formModal.value.categoryNames };
  }

  async function openEditModal(node) {
    const parentNode = node.parent_id ? nodes.value.find((n) => n.id === node.parent_id) : null;
    formModal.value = {
      show: true,
      isEdit: true,
      saving: false,
      id: node.id,
      parentId: node.parent_id,
      parentName: parentNode?.name || null,
      name: node.name,
      url_slug: node.url_slug,
      icon_class: node.icon_class || "",
      sort_order: node.sort_order,
      is_active: node.is_active,
      image: node.image || "",
      imageUploading: false,
      categoryNames: emptyNames(),
      content_default_lang: "tr",
    };
    // Dil-bazlı adları gerçek kayıttan yükle (sufix kolonlar).
    try {
      const res = await api.getDoc("Product Category", node.id);
      const doc = res?.data || res || {};
      const names = emptyNames();
      for (const lng of CONTENT_LANGS) names[lng] = doc[`category_name_${lng}`] || "";
      const dl = doc.content_default_lang || "tr";
      // Geriye dönük: sufix henüz boşsa base category_name'i varsayılan dile koy.
      if (!names[dl]) names[dl] = doc.category_name || node.name || "";
      formModal.value.categoryNames = names;
      formModal.value.content_default_lang = dl;
      // Bayatlama referansı: yüklenen adlar "kaynakla senkron" başlangıç durumu.
      formInitialNames.value = { ...names };
    } catch {
      formModal.value.categoryNames = { ...emptyNames(), tr: node.name || "" };
      formInitialNames.value = { ...formModal.value.categoryNames };
    }
  }

  async function handleCatImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    formModal.value.imageUploading = true;
    catImageUpload.start();
    try {
      const fileUrl = await api.uploadFile(file, "Home");
      formModal.value.image = fileUrl;
      await catImageUpload.finish();
      toast.success(t("categoryManagement.imageUploaded"));
    } catch (err) {
      catImageUpload.fail();
      toast.error(t("categoryManagement.imageUploadFailed", { error: err.message || "" }));
    } finally {
      formModal.value.imageUploading = false;
      e.target.value = "";
    }
  }

  async function saveCategory() {
    const fm = formModal.value;
    // Varsayılan/kaynak dilde ad zorunlu.
    const defaultName = (fm.categoryNames[fm.content_default_lang] || "").trim();
    if (!defaultName) {
      toast.error(t("categoryManagement.categoryNameRequired"));
      return;
    }
    // Çeviri payload'u: dil-bazlı kolonlar + kaynak dil.
    const translations = { content_default_lang: fm.content_default_lang };
    for (const lng of CONTENT_LANGS) {
      translations[`category_name_${lng}`] = (fm.categoryNames[lng] || "").trim();
    }
    fm.saving = true;
    try {
      if (fm.isEdit) {
        await api.callMethod(
          "tradehub_core.api.category.update_category",
          {
            name: fm.id,
            category_name: defaultName,
            url_slug: fm.url_slug || null,
            icon_class: fm.icon_class || null,
            sort_order: fm.sort_order,
            is_active: fm.is_active ? 1 : 0,
            image: fm.image || null,
            translations: JSON.stringify(translations),
          },
          true
        );
        const node = nodes.value.find((n) => n.id === fm.id);
        if (node) {
          node.name = defaultName;
          node.url_slug = fm.url_slug;
          node.icon_class = fm.icon_class;
          node.sort_order = fm.sort_order;
          node.is_active = fm.is_active;
          node.image = fm.image;
        }
        toast.success(t("categoryManagement.categoryUpdated"));
      } else {
        await api.callMethod(
          "tradehub_core.api.category.create_category",
          {
            category_name: defaultName,
            parent_id: fm.parentId || null,
            url_slug: fm.url_slug || null,
            icon_class: fm.icon_class || null,
            sort_order: fm.sort_order,
            is_active: fm.is_active ? 1 : 0,
            image: fm.image || null,
            translations: JSON.stringify(translations),
          },
          true
        );
        toast.success(t("categoryManagement.categoryAdded"));
        if (fm.parentId) {
          const parent = nodes.value.find((n) => n.id === fm.parentId);
          if (parent) {
            parent.child_count++;
            if (parent.expanded) {
              collapseNode(parent);
              await toggleExpand(parent);
            }
          }
        } else {
          await loadRoots();
        }
      }
      formModal.value.show = false;
    } catch (err) {
      toast.error(err.message || t("categoryManagement.operationFailed"));
    } finally {
      formModal.value.saving = false;
    }
  }

  // ── Selection / Bulk Delete ───────────────────────────

  const selectedIds = ref(new Set());

  const allVisibleSelected = computed(
    () => nodes.value.length > 0 && nodes.value.every((n) => selectedIds.value.has(n.id))
  );
  const someVisibleSelected = computed(() => nodes.value.some((n) => selectedIds.value.has(n.id)));

  function toggleSelect(id) {
    const s = new Set(selectedIds.value);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    selectedIds.value = s;
  }

  function toggleSelectAllVisible() {
    const s = new Set(selectedIds.value);
    if (allVisibleSelected.value) {
      nodes.value.forEach((n) => s.delete(n.id));
    } else {
      nodes.value.forEach((n) => s.add(n.id));
    }
    selectedIds.value = s;
  }

  const bulkDeleteModal = ref({ show: false, deleting: false });

  function openBulkDeleteModal() {
    if (selectedIds.value.size === 0) return;
    bulkDeleteModal.value = { show: true, deleting: false };
  }

  async function runBulkDelete() {
    bulkDeleteModal.value.deleting = true;
    try {
      const ids = Array.from(selectedIds.value);
      const res = await api.callMethod(
        "tradehub_core.api.category.bulk_delete_categories",
        { names: JSON.stringify(ids) },
        true
      );
      const deleted = res.message?.deleted || 0;
      const errors = res.message?.errors || [];
      if (deleted > 0) toast.success(t("categoryManagement.categoriesDeleted", { count: deleted }));
      if (errors.length > 0)
        toast.error(
          t("categoryManagement.recordsNotDeleted", { count: errors.length, error: errors[0] })
        );
      selectedIds.value = new Set();
      bulkDeleteModal.value.show = false;
      await loadRoots();
    } catch (err) {
      toast.error(err.message || t("categoryManagement.bulkDeleteFailed"));
    } finally {
      bulkDeleteModal.value.deleting = false;
    }
  }

  const deleteAllModal = ref({ show: false, deleting: false, confirmText: "" });

  function openDeleteAllModal() {
    deleteAllModal.value = { show: true, deleting: false, confirmText: "" };
  }

  async function runDeleteAll() {
    if (deleteAllModal.value.confirmText !== "SIL") return;
    deleteAllModal.value.deleting = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.category.delete_all_categories",
        {},
        true
      );
      const deleted = res.message?.deleted || 0;
      const errors = res.message?.errors || [];
      if (deleted > 0) toast.success(t("categoryManagement.categoriesDeleted", { count: deleted }));
      if (errors.length > 0)
        toast.error(
          t("categoryManagement.recordsNotDeleted", { count: errors.length, error: errors[0] })
        );
      selectedIds.value = new Set();
      deleteAllModal.value.show = false;
      await loadRoots();
    } catch (err) {
      toast.error(err.message || t("categoryManagement.deleteAllFailed"));
    } finally {
      deleteAllModal.value.deleting = false;
    }
  }

  // ── Delete ────────────────────────────────────────────

  const deleteModal = ref({ show: false, node: null, deleting: false });

  function confirmDelete(node) {
    deleteModal.value = { show: true, node, deleting: false };
  }

  async function deleteCategory() {
    const dm = deleteModal.value;
    dm.deleting = true;
    try {
      await api.callMethod(
        "tradehub_core.api.category.delete_category",
        { name: dm.node.id },
        true
      );
      toast.success(t("categoryManagement.nodeDeleted", { name: dm.node.name }));
      const idx = nodes.value.findIndex((n) => n.id === dm.node.id);
      if (idx !== -1) nodes.value.splice(idx, 1);
      if (selectedIds.value.has(dm.node.id)) {
        const s = new Set(selectedIds.value);
        s.delete(dm.node.id);
        selectedIds.value = s;
      }
      if (dm.node.parent_id) {
        const parent = nodes.value.find((n) => n.id === dm.node.parent_id);
        if (parent) parent.child_count = Math.max(0, parent.child_count - 1);
      }
      deleteModal.value.show = false;
    } catch (err) {
      toast.error(err.message || t("categoryManagement.deleteFailed"));
    } finally {
      dm.deleting = false;
    }
  }

  // ── Active Toggle ─────────────────────────────────────

  async function toggleActive(node) {
    const newVal = !node.is_active;
    try {
      await api.callMethod(
        "tradehub_core.api.category.update_category",
        {
          name: node.id,
          is_active: newVal ? 1 : 0,
        },
        true
      );
      node.is_active = newVal;
      toast.success(
        newVal ? t("categoryManagement.activated") : t("categoryManagement.deactivated")
      );
    } catch (err) {
      toast.error(err.message || t("categoryManagement.updateFailed"));
    }
  }

  // ── Import ────────────────────────────────────────────

  const fileInput = ref(null);
  const importModal = ref({
    show: false,
    importing: false,
    fileName: null,
    data: null,
    result: null,
    jobKey: null,
    progress: null,
  });

  const importPct = computed(() => {
    const p = importModal.value.progress;
    if (!p || !p.total) return 0;
    return Math.min(100, Math.round((p.processed / p.total) * 100));
  });

  function openImportModal() {
    importModal.value = {
      show: true,
      importing: false,
      fileName: null,
      data: null,
      result: null,
      jobKey: null,
      progress: null,
    };
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) readJsonFile(file);
  }

  function handleFileDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file) readJsonFile(file);
  }

  function readJsonFile(file) {
    importModal.value.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importModal.value.data = JSON.parse(ev.target.result);
      } catch {
        toast.error(t("categoryManagement.invalidJsonFile"));
        importModal.value.data = null;
      }
    };
    reader.readAsText(file);
  }

  async function runImport() {
    const im = importModal.value;
    if (!im.data) return;
    im.importing = true;
    im.progress = {
      state: "queued",
      total: im.data.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };

    try {
      const startRes = await api.callMethod(
        "tradehub_core.api.category.start_category_import",
        { json_data: JSON.stringify(im.data) },
        true
      );
      const jobKey = startRes.message?.job_key;
      if (!jobKey) throw new Error(t("categoryManagement.jobStartFailed"));
      im.jobKey = jobKey;

      // Polling — 2 saniye aralıkla
      while (importModal.value.importing) {
        await new Promise((r) => setTimeout(r, 2000));
        let statusRes;
        try {
          statusRes = await api.callMethod(
            "tradehub_core.api.category.get_category_import_status",
            { job_key: jobKey },
            true
          );
        } catch {
          // Geçici ağ hatası — denemeye devam
          continue;
        }
        const st = statusRes.message || {};
        im.progress = st;

        if (st.state === "done") {
          im.result = {
            inserted: st.inserted || 0,
            updated: st.updated || 0,
            skipped: st.skipped || 0,
            warning: st.warning || null,
          };
          if (st.warning) toast.error(st.warning);
          im.importing = false;
          return;
        }
        if (st.state === "error") {
          toast.error(st.error || t("categoryManagement.importError"));
          im.importing = false;
          return;
        }
        if (st.state === "not_found") {
          // Cache'ten düşmüş olabilir; kullanıcı zaten kapatıp açmışsa
          toast.error(t("categoryManagement.jobStatusNotFound"));
          im.importing = false;
          return;
        }
      }
    } catch (err) {
      toast.error(err.message || t("categoryManagement.importFailed"));
      im.importing = false;
    }
  }

  async function closeImportAndReload() {
    importModal.value.show = false;
    await loadRoots();
  }

  onMounted(() => {
    loadRoots();
    if (viewMode.value === "cards") loadDrill(null);
  });

  // cards moduna geçince geçerli seviyeyi (yoksa kökü) yükle
  watch(viewMode, (m) => {
    if (m === "cards") loadDrill(drillParentId.value);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  // Seviye-renk accent: seçili/açık satırda ilk hücreye renkli sol şerit.
  // --lvc satırın inline style'ında (levelHex) set edilir.
  .cat-accent td:first-child {
    box-shadow: inset 3px 0 0 var(--lvc, #{$brand});
  }

  // Renkli alt-sayı pill (tablo "Alt" kolonu)
  .cat-count {
    color: var(--lvc, #{$brand});
    background: color-mix(in srgb, var(--lvc, #{$brand}) 14%, transparent);
  }

  // Tree bağlantı çizgisi — yalnızca derinlik > 0 satırlarda. --ind inline.
  .cat-twig {
    position: relative;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }

    &::before {
      content: "";
      position: absolute;
      left: calc(var(--ind) - 10px);
      top: 0;
      bottom: 50%;
      width: 1px;
      background: currentColor;
      opacity: 0.35;
    }
    &::after {
      content: "";
      position: absolute;
      left: calc(var(--ind) - 10px);
      top: 50%;
      width: 8px;
      height: 1px;
      background: currentColor;
      opacity: 0.35;
    }
  }

  // Drill-down kart — seviye rengiyle soft zemin + hover'da renkli gölge.
  // --lvc / --lvs inline style'da set edilir.
  .cat-card {
    background: var(--lvs);
    border: 1.5px solid color-mix(in srgb, var(--lvc, #{$brand}) 30%, transparent);
    transition:
      box-shadow $t-base,
      border-color $t-base,
      transform $t-base;

    &:hover {
      border-color: color-mix(in srgb, var(--lvc, #{$brand}) 55%, transparent);
      box-shadow: 0 4px 14px color-mix(in srgb, var(--lvc, #{$brand}) 28%, transparent);
      transform: translateY(-1px);
    }
  }
  .cat-card-icon {
    color: var(--lvc, #{$brand});
  }
</style>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("sellerCategories.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("sellerCategories.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" :modes="['table', 'grid', 'list']" />
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="showAddModal = true">
          <AppIcon name="plus" :size="13" />
          {{ t("sellerCategories.addCategory") }}
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-2 mb-4">
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {{ t("sellerCategories.legendPending") }}
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {{ t("sellerCategories.legendApproved") }}
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-red-50 text-red-700 border border-red-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        {{ t("sellerCategories.legendRejected") }}
      </span>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("sellerCategories.loading") }}</p>
    </div>

    <div v-else-if="categories.length === 0" class="card text-center py-12">
      <AppIcon name="folder-open" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400 mb-4">{{ t("sellerCategories.empty") }}</p>
      <button class="hdr-btn-primary" @click="showAddModal = true">
        {{ t("sellerCategories.addFirst") }}
      </button>
    </div>

    <!-- Grid (kart) görünümü -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div v-for="cat in categories" :key="cat.name" class="card p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <img
            v-if="cat.image"
            :src="cat.image"
            class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          <div
            v-else
            class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center flex-shrink-0"
          >
            <AppIcon name="folder" :size="18" class="text-gray-400" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
              {{ cat.category_name }}
            </p>
            <span
              class="inline-flex items-center mt-1 px-2 py-0.5 text-[11px] font-medium rounded-full"
              :class="statusClass(cat.status)"
            >
              {{ statusLabel(cat.status) }}
            </span>
          </div>
        </div>
        <p class="text-xs text-gray-500 line-clamp-2 min-h-[2rem]" :title="cat.description">
          {{ cat.description || "—" }}
        </p>
        <p
          v-if="cat.status === 'Rejected' && cat.reject_reason"
          class="text-[10px] text-red-500 -mt-1 truncate"
          :title="cat.reject_reason"
        >
          {{ cat.reject_reason }}
        </p>
        <div
          class="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-50 dark:border-[#2a2a35]"
        >
          <button
            :title="t('sellerCategories.edit')"
            class="inline-flex items-center justify-center w-7 h-7 text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
            @click="openEditModal(cat)"
          >
            <AppIcon name="pencil" :size="12" />
          </button>
          <button
            v-if="cat.is_enabled"
            :disabled="togglingId === cat.name"
            :title="t('sellerCategories.deactivate')"
            class="inline-flex items-center justify-center w-7 h-7 text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-60"
            @click="toggleCategory(cat, 0)"
          >
            <AppIcon v-if="togglingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="eye-off" :size="12" />
          </button>
          <button
            v-else
            :disabled="togglingId === cat.name"
            :title="t('sellerCategories.activate')"
            class="inline-flex items-center justify-center w-7 h-7 text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-60"
            @click="toggleCategory(cat, 1)"
          >
            <AppIcon v-if="togglingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="eye" :size="12" />
          </button>
          <button
            :disabled="deletingId === cat.name"
            :title="t('sellerCategories.delete')"
            class="inline-flex items-center justify-center w-7 h-7 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60"
            @click="deleteCategory(cat)"
          >
            <AppIcon v-if="deletingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="trash-2" :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kompakt liste görünümü -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="cat in categories"
        :key="cat.name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-[#2a2a35] last:border-b-0"
      >
        <img v-if="cat.image" :src="cat.image" class="w-8 h-8 rounded object-cover flex-shrink-0" />
        <div
          v-else
          class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center flex-shrink-0"
        >
          <AppIcon name="folder" :size="13" class="text-gray-400" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
            {{ cat.category_name }}
          </p>
          <p class="text-[10px] text-gray-400 truncate" :title="cat.description">
            {{ cat.description || "—" }}
          </p>
        </div>
        <span
          class="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0"
          :class="statusClass(cat.status)"
        >
          {{ statusLabel(cat.status) }}
        </span>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button
            :title="t('sellerCategories.edit')"
            class="inline-flex items-center justify-center w-7 h-7 text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
            @click="openEditModal(cat)"
          >
            <AppIcon name="pencil" :size="12" />
          </button>
          <button
            v-if="cat.is_enabled"
            :disabled="togglingId === cat.name"
            :title="t('sellerCategories.deactivate')"
            class="inline-flex items-center justify-center w-7 h-7 text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-60"
            @click="toggleCategory(cat, 0)"
          >
            <AppIcon v-if="togglingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="eye-off" :size="12" />
          </button>
          <button
            v-else
            :disabled="togglingId === cat.name"
            :title="t('sellerCategories.activate')"
            class="inline-flex items-center justify-center w-7 h-7 text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-60"
            @click="toggleCategory(cat, 1)"
          >
            <AppIcon v-if="togglingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="eye" :size="12" />
          </button>
          <button
            :disabled="deletingId === cat.name"
            :title="t('sellerCategories.delete')"
            class="inline-flex items-center justify-center w-7 h-7 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60"
            @click="deleteCategory(cat)"
          >
            <AppIcon v-if="deletingId === cat.name" name="loader" :size="12" class="animate-spin" />
            <AppIcon v-else name="trash-2" :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tablo görünümü -->
    <div v-else class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("sellerCategories.thCategory") }}
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("sellerCategories.thDescription") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("sellerCategories.thStatus") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("sellerCategories.thActions") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="cat in categories"
            :key="cat.name"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <img v-if="cat.image" :src="cat.image" class="w-8 h-8 rounded object-cover" />
                <div
                  v-else
                  class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center"
                >
                  <AppIcon name="folder" :size="14" class="text-gray-400" />
                </div>
                <span class="font-medium text-xs text-gray-800 dark:text-gray-200">{{
                  cat.category_name
                }}</span>
              </div>
            </td>
            <td
              class="px-4 py-3 text-xs text-gray-500 max-w-[220px] truncate"
              :title="cat.description"
            >
              {{ cat.description || "—" }}
            </td>
            <td class="px-4 py-3 text-center">
              <div>
                <span
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="statusClass(cat.status)"
                >
                  {{ statusLabel(cat.status) }}
                </span>
                <p
                  v-if="cat.status === 'Rejected' && cat.reject_reason"
                  class="text-[10px] text-red-500 mt-1 max-w-[180px] mx-auto truncate"
                  :title="cat.reject_reason"
                >
                  {{ cat.reject_reason }}
                </p>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <!-- Düzenle -->
                <button
                  :title="t('sellerCategories.edit')"
                  class="inline-flex items-center justify-center w-7 h-7 text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                  @click="openEditModal(cat)"
                >
                  <AppIcon name="pencil" :size="12" />
                </button>
                <!-- Pasife Al (aktifse göster) -->
                <button
                  v-if="cat.is_enabled"
                  :disabled="togglingId === cat.name"
                  :title="t('sellerCategories.deactivate')"
                  class="inline-flex items-center justify-center w-7 h-7 text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-60"
                  @click="toggleCategory(cat, 0)"
                >
                  <AppIcon
                    v-if="togglingId === cat.name"
                    name="loader"
                    :size="12"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="eye-off" :size="12" />
                </button>
                <!-- Aktife Al (pasifse göster) -->
                <button
                  v-else
                  :disabled="togglingId === cat.name"
                  :title="t('sellerCategories.activate')"
                  class="inline-flex items-center justify-center w-7 h-7 text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-60"
                  @click="toggleCategory(cat, 1)"
                >
                  <AppIcon
                    v-if="togglingId === cat.name"
                    name="loader"
                    :size="12"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="eye" :size="12" />
                </button>
                <!-- Sil -->
                <button
                  :disabled="deletingId === cat.name"
                  :title="t('sellerCategories.delete')"
                  class="inline-flex items-center justify-center w-7 h-7 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60"
                  @click="deleteCategory(cat)"
                >
                  <AppIcon
                    v-if="deletingId === cat.name"
                    name="loader"
                    :size="12"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="trash-2" :size="12" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Category Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeEditModal"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[460px] max-w-[calc(100vw-32px)]"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">
            {{ t("sellerCategories.editModalTitle") }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
            @click="closeEditModal"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              {{ t("sellerCategories.categoryNameLabel") }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.category_name"
              type="text"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.categoryImageLabel")
            }}</label>
            <div
              class="relative border-2 border-dashed border-gray-200 dark:border-[#2a2a35] rounded-lg p-4 text-center cursor-pointer hover:border-violet-300 transition-colors"
              @click="$refs.editImageInput.click()"
              @dragover.prevent
              @drop.prevent="onEditImageDrop"
            >
              <input
                ref="editImageInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onEditImageSelect"
              />
              <div v-if="editImagePreview" class="flex items-center gap-3">
                <div class="relative w-16 h-16 flex-shrink-0">
                  <img :src="editImagePreview" class="w-16 h-16 rounded-lg object-cover" />
                  <!-- tradehub-upload-ui bar overlay (submit anında) -->
                  <div
                    v-if="editImageUpload.status.value === 'uploading'"
                    class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                  >
                    <div
                      class="h-full bg-white rounded-full transition-all duration-300"
                      :style="{ width: Math.max(4, editImageUpload.progress.value) + '%' }"
                    ></div>
                  </div>
                  <Transition name="fade">
                    <div
                      v-if="editImageUpload.status.value === 'success'"
                      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none"
                    >
                      ✓
                    </div>
                  </Transition>
                </div>
                <div class="flex-1 text-left">
                  <p class="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {{ editImageFile ? editImageFile.name : t("sellerCategories.currentImage") }}
                  </p>
                  <button
                    type="button"
                    class="text-[10px] text-red-500 hover:text-red-700 mt-1"
                    @click.stop="clearEditImage"
                  >
                    {{ t("sellerCategories.removeImage") }}
                  </button>
                </div>
              </div>
              <div v-else class="py-2">
                <AppIcon name="upload" :size="20" class="text-gray-300 mx-auto mb-1" />
                <p class="text-xs text-gray-400">{{ t("sellerCategories.imageDropHint") }}</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.descriptionLabel")
            }}</label>
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.sortOrderLabel")
            }}</label>
            <input
              v-model.number="editForm.sort_order"
              type="number"
              min="0"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <p
            class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          >
            {{ t("sellerCategories.editApprovalNote") }}
          </p>
        </div>
        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="closeEditModal">
            {{ t("sellerCategories.cancel") }}
          </button>
          <button
            :disabled="editSubmitting || !editForm.category_name.trim()"
            class="hdr-btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="saveEdit"
          >
            <AppIcon v-if="editSubmitting" name="loader" :size="13" class="animate-spin" />
            {{ t("sellerCategories.save") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Category Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeAddModal"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[460px] max-w-[calc(100vw-32px)]"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">
            {{ t("sellerCategories.addModalTitle") }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
            @click="closeAddModal"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              {{ t("sellerCategories.categoryNameLabel") }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.category_name"
              type="text"
              :placeholder="t('sellerCategories.categoryNamePlaceholder')"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.categoryImageLabel")
            }}</label>
            <div
              class="relative border-2 border-dashed border-gray-200 dark:border-[#2a2a35] rounded-lg p-4 text-center cursor-pointer hover:border-violet-300 transition-colors"
              @click="$refs.addImageInput.click()"
              @dragover.prevent
              @drop.prevent="onAddImageDrop"
            >
              <input
                ref="addImageInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onAddImageSelect"
              />
              <div v-if="addImagePreview" class="flex items-center gap-3">
                <div class="relative w-16 h-16 flex-shrink-0">
                  <img :src="addImagePreview" class="w-16 h-16 rounded-lg object-cover" />
                  <!-- tradehub-upload-ui bar overlay (submit anında) -->
                  <div
                    v-if="addImageUpload.status.value === 'uploading'"
                    class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                  >
                    <div
                      class="h-full bg-white rounded-full transition-all duration-300"
                      :style="{ width: Math.max(4, addImageUpload.progress.value) + '%' }"
                    ></div>
                  </div>
                  <Transition name="fade">
                    <div
                      v-if="addImageUpload.status.value === 'success'"
                      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none"
                    >
                      ✓
                    </div>
                  </Transition>
                </div>
                <div class="flex-1 text-left">
                  <p class="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {{ addImageFile?.name }}
                  </p>
                  <button
                    type="button"
                    class="text-[10px] text-red-500 hover:text-red-700 mt-1"
                    @click.stop="clearAddImage"
                  >
                    {{ t("sellerCategories.removeImage") }}
                  </button>
                </div>
              </div>
              <div v-else class="py-2">
                <AppIcon name="upload" :size="20" class="text-gray-300 mx-auto mb-1" />
                <p class="text-xs text-gray-400">{{ t("sellerCategories.imageDropHint") }}</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.descriptionLabel")
            }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              :placeholder="t('sellerCategories.descriptionPlaceholder')"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{{
              t("sellerCategories.sortOrderLabel")
            }}</label>
            <input
              v-model.number="form.sort_order"
              type="number"
              min="0"
              placeholder="0"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <p
            class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          >
            {{ t("sellerCategories.addApprovalNote") }}
          </p>
        </div>

        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="closeAddModal">
            {{ t("sellerCategories.cancel") }}
          </button>
          <button
            :disabled="submitting || !form.category_name.trim()"
            class="hdr-btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="addCategory"
          >
            <AppIcon v-if="submitting" name="loader" :size="13" class="animate-spin" />
            {{ t("sellerCategories.add") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  // tradehub-upload-ui pattern — add + edit modal'ların kategori görseli upload'ları
  const addImageUpload = useImageUploadProgress();
  const editImageUpload = useImageUploadProgress();

  const { t } = useI18n();
  const toast = useToast();
  const { viewMode } = useListViewMode("seller-categories", "table");
  const categories = ref([]);
  const loading = ref(false);
  const togglingId = ref(null);
  const deletingId = ref(null);
  const showAddModal = ref(false);
  const submitting = ref(false);
  const form = ref({ category_name: "", description: "", sort_order: 0 });

  const addImageFile = ref(null);
  const addImagePreview = ref(null);
  const addImageUploadedUrl = ref(""); // anında upload sonrası file_url

  const showEditModal = ref(false);
  const editSubmitting = ref(false);
  const editForm = ref({ name: "", category_name: "", description: "", sort_order: 0 });
  const editImageFile = ref(null);
  const editImagePreview = ref(null);
  const editImageUploadedUrl = ref("");

  function statusLabel(status) {
    return (
      {
        Pending: t("sellerCategories.legendPending"),
        Active: t("sellerCategories.legendApproved"),
        Rejected: t("sellerCategories.legendRejected"),
      }[status] || status
    );
  }
  function statusClass(status) {
    return (
      {
        Pending: "bg-amber-50 text-amber-700 border border-amber-200",
        Active: "bg-green-50 text-green-700 border border-green-200",
        Rejected: "bg-red-50 text-red-700 border border-red-200",
      }[status] || "bg-gray-100 text-gray-500"
    );
  }

  async function loadCategories() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller.get_my_seller_categories");
      categories.value = res.message?.categories || [];
    } catch (err) {
      toast.error(err.message || t("sellerCategories.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  // Anında upload pattern — dosya seçilir seçilmez bar overlay başlar
  async function handleAddImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    addImagePreview.value = URL.createObjectURL(file); // optimistic preview
    addImageFile.value = file;
    addImageUpload.start();
    try {
      const url = await api.uploadFile(file);
      addImageUploadedUrl.value = url; // submit'te bunu kullanırız
      await addImageUpload.finish();
    } catch {
      addImageUpload.fail();
      toast.error(t("sellerCategories.imageUploadFailed"));
    }
  }
  function onAddImageSelect(e) {
    handleAddImageFile(e.target.files?.[0]);
  }
  function onAddImageDrop(e) {
    handleAddImageFile(e.dataTransfer.files?.[0]);
  }
  function clearAddImage() {
    addImageFile.value = null;
    addImagePreview.value = null;
    addImageUploadedUrl.value = "";
  }

  async function handleEditImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    editImagePreview.value = URL.createObjectURL(file);
    editImageFile.value = file;
    editImageUpload.start();
    try {
      const url = await api.uploadFile(file);
      editImageUploadedUrl.value = url;
      await editImageUpload.finish();
    } catch {
      editImageUpload.fail();
      toast.error(t("sellerCategories.imageUploadFailed"));
    }
  }
  function onEditImageSelect(e) {
    handleEditImageFile(e.target.files?.[0]);
  }
  function onEditImageDrop(e) {
    handleEditImageFile(e.dataTransfer.files?.[0]);
  }
  function clearEditImage() {
    editImageFile.value = null;
    editImagePreview.value = null;
    editImageUploadedUrl.value = "";
  }

  async function addCategory() {
    if (!form.value.category_name.trim()) return;
    submitting.value = true;
    try {
      // Dosya zaten anında yüklendi (handleAddImageFile) — sadece URL'i kullan
      const imageUrl = addImageUploadedUrl.value || "";
      await api.callMethod(
        "tradehub_core.api.seller.add_seller_category",
        {
          category_name: form.value.category_name.trim(),
          description: form.value.description,
          sort_order: form.value.sort_order || 0,
          image: imageUrl,
        },
        true
      );
      toast.success(t("sellerCategories.addedToast"));
      closeAddModal();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("sellerCategories.addFailed"));
    } finally {
      submitting.value = false;
    }
  }

  async function toggleCategory(cat, isEnabled) {
    const msg = isEnabled
      ? t("sellerCategories.confirmActivate", { name: cat.category_name })
      : t("sellerCategories.confirmDeactivate", { name: cat.category_name });
    if (!confirm(msg)) return;
    togglingId.value = cat.name;
    try {
      await api.callMethod(
        "tradehub_core.api.seller.toggle_seller_category",
        {
          category_name: cat.name,
          is_enabled: isEnabled,
        },
        true
      );
      toast.success(
        isEnabled ? t("sellerCategories.activatedToast") : t("sellerCategories.deactivatedToast")
      );
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("sellerCategories.actionFailed"));
    } finally {
      togglingId.value = null;
    }
  }

  async function deleteCategory(cat) {
    if (!confirm(t("sellerCategories.confirmDelete", { name: cat.category_name }))) return;
    deletingId.value = cat.name;
    try {
      await api.callMethod(
        "tradehub_core.api.seller.delete_seller_category",
        { category_name: cat.name },
        true
      );
      toast.success(t("sellerCategories.deletedToast"));
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("sellerCategories.deleteFailed"));
    } finally {
      deletingId.value = null;
    }
  }

  function openEditModal(cat) {
    editForm.value = {
      name: cat.name,
      category_name: cat.category_name,
      description: cat.description || "",
      sort_order: cat.sort_order || 0,
    };
    editImageFile.value = null;
    editImagePreview.value = cat.image || null;
    showEditModal.value = true;
  }

  function closeEditModal() {
    showEditModal.value = false;
    editForm.value = { name: "", category_name: "", description: "", sort_order: 0 };
    editImageFile.value = null;
    editImagePreview.value = null;
  }

  async function saveEdit() {
    if (!editForm.value.category_name.trim()) return;
    editSubmitting.value = true;
    try {
      // Yeni dosya yüklendiyse onun URL'i, yoksa mevcut preview URL'i (eski kayıt)
      const imageUrl = editImageUploadedUrl.value || editImagePreview.value || "";
      await api.callMethod(
        "tradehub_core.api.seller.update_seller_category",
        {
          category_name: editForm.value.name,
          new_name: editForm.value.category_name.trim(),
          description: editForm.value.description,
          sort_order: editForm.value.sort_order || 0,
          image: imageUrl,
        },
        true
      );
      toast.success(t("sellerCategories.updatedToast"));
      closeEditModal();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("sellerCategories.updateFailed"));
    } finally {
      editSubmitting.value = false;
    }
  }

  function closeAddModal() {
    showAddModal.value = false;
    form.value = { category_name: "", description: "", sort_order: 0 };
    clearAddImage();
  }

  onMounted(loadCategories);
</script>

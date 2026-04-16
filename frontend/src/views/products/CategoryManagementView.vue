<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Kategori Yönetimi</h1>
        <p class="text-xs text-gray-400 mt-0.5">Platform kategori ağacını yönetin</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadRoots">
          <AppIcon name="refresh-cw" :size="13" />
          Yenile
        </button>
        <button
          v-if="selectedIds.size > 0"
          class="hdr-btn-danger flex items-center gap-1.5"
          @click="openBulkDeleteModal"
        >
          <AppIcon name="trash-2" :size="13" />
          Seçilileri Sil ({{ selectedIds.size }})
        </button>
        <button
          v-if="nodes.length > 0"
          class="hdr-btn-outlined flex items-center gap-1.5 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20"
          @click="openDeleteAllModal"
        >
          <AppIcon name="circle-alert" :size="13" />
          Hepsini Sil
        </button>
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="openImportModal">
          <AppIcon name="upload" :size="13" />
          JSON İçe Aktar
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="openAddModal(null)">
          <AppIcon name="plus" :size="13" />
          Kök Kategori Ekle
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="nodes.length === 0" class="card text-center py-12">
      <AppIcon name="folder-open" :size="32" class="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
      <p class="text-sm text-gray-400">Henüz kategori yok</p>
    </div>

    <!-- Tree Table -->
    <div v-else class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="px-4 py-3 w-10">
              <input
                type="checkbox"
                class="form-checkbox"
                :checked="allVisibleSelected"
                :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                title="Görünen kategorileri seç/bırak"
                @change="toggleSelectAllVisible"
              />
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Kategori Adı</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">URL Slug</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Aktif</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Alt</th>
            <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
v-for="node in nodes" :key="node.id"
              :class="selectedIds.has(node.id) ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''"
              class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors">
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
              <div class="flex items-center gap-1.5" :style="{ paddingLeft: (node.depth * 18) + 'px' }">
                <button
                  v-if="node.child_count > 0 || node.expanded"
                  class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
                  @click="toggleExpand(node)"
                >
                  <AppIcon v-if="node.loadingChildren" name="loader" :size="11" class="animate-spin" />
                  <AppIcon v-else-if="node.expanded" name="chevron-down" :size="12" />
                  <AppIcon v-else name="chevron-right" :size="12" />
                </button>
                <span v-else class="w-5 flex-shrink-0"></span>
                <AppIcon name="folder" :size="13" :class="node.is_active ? 'text-violet-400' : 'text-gray-300'" class="flex-shrink-0" />
                <span class="font-medium text-xs text-gray-800 dark:text-gray-200">{{ node.name }}</span>
              </div>
            </td>
            <!-- URL Slug -->
            <td class="px-4 py-2.5 hidden md:table-cell">
              <span class="text-xs text-gray-400 font-mono">{{ node.url_slug || '—' }}</span>
            </td>
            <!-- Active toggle -->
            <td class="px-4 py-2.5 text-center">
              <button
                :class="node.is_active ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-300 hover:text-gray-400'"
                class="transition-colors"
                :title="node.is_active ? 'Aktif — tıkla pasife al' : 'Pasif — tıkla aktife al'"
                @click="toggleActive(node)"
              >
                <AppIcon :name="node.is_active ? 'circle-check' : 'circle'" :size="14" />
              </button>
            </td>
            <!-- Child count -->
            <td class="px-4 py-2.5 text-center">
              <span class="text-xs text-gray-500">{{ node.child_count }}</span>
            </td>
            <!-- Actions -->
            <td class="px-4 py-2.5">
              <div class="flex items-center justify-end gap-0.5">
                <button
                  class="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
                  title="Alt kategori ekle"
                  @click="openAddModal(node.id)"
                >
                  <AppIcon name="folder-plus" :size="13" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="Düzenle"
                  @click="openEditModal(node)"
                >
                  <AppIcon name="pencil" :size="13" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Sil"
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

    <!-- ── Add/Edit Modal ── -->
    <div v-if="formModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="formModal.show = false"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[440px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ formModal.isEdit ? 'Kategori Düzenle' : 'Yeni Kategori Ekle' }}
        </h3>
        <div v-if="formModal.parentName" class="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
          <AppIcon name="folder" :size="12" />
          Üst kategori: <strong class="text-gray-700 dark:text-gray-300">{{ formModal.parentName }}</strong>
        </div>
        <div class="space-y-3">
          <div>
            <label class="form-label">Kategori Adı *</label>
            <input v-model="formModal.name" class="form-input" placeholder="ör: Elektronik" @keyup.enter="saveCategory" />
          </div>
          <div>
            <label class="form-label">URL Slug <span class="text-gray-400 font-normal">(boş bırakırsanız otomatik)</span></label>
            <input v-model="formModal.url_slug" class="form-input" placeholder="ör: elektronik" />
          </div>
          <div>
            <label class="form-label">Icon Class <span class="text-gray-400 font-normal">(ör: bi bi-laptop)</span></label>
            <input v-model="formModal.icon_class" class="form-input" placeholder="ör: bi bi-laptop" />
          </div>
          <!-- Image upload -->
          <div>
            <label class="form-label">Kategori Resmi</label>
            <div class="flex items-center gap-3">
              <div
                class="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:border-violet-400 transition-colors"
                :class="formModal.image ? 'border-violet-300' : 'border-gray-200 dark:border-[#2a2a35]'"
                @click="catImageInput.click()"
              >
                <img v-if="formModal.image" :src="formModal.image" class="w-full h-full object-cover" />
                <AppIcon v-else name="image-plus" :size="20" class="text-gray-300" />
              </div>
              <div class="flex-1">
                <button type="button" class="hdr-btn-outlined text-xs flex items-center gap-1.5" @click="catImageInput.click()">
                  <AppIcon v-if="formModal.imageUploading" name="loader" :size="12" class="animate-spin" />
                  <AppIcon v-else name="upload" :size="12" />
                  {{ formModal.image ? 'Değiştir' : 'Resim Yükle' }}
                </button>
                <button v-if="formModal.image" type="button" class="ml-2 text-xs text-red-400 hover:text-red-600" @click="formModal.image = ''">Kaldır</button>
                <p class="text-[11px] text-gray-400 mt-1">PNG, JPG — 1:1 oran önerilir</p>
              </div>
            </div>
            <input ref="catImageInput" type="file" accept="image/*" class="hidden" @change="handleCatImageUpload" />
          </div>
          <div>
            <label class="form-label">Sıra</label>
            <input v-model.number="formModal.sort_order" type="number" class="form-input" />
          </div>
          <div class="flex items-center gap-2">
            <input id="modal-active" v-model="formModal.is_active" type="checkbox" class="form-checkbox" />
            <label for="modal-active" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Aktif</label>
          </div>
        </div>
        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="formModal.show = false">İptal</button>
          <button :disabled="formModal.saving" class="hdr-btn-primary flex items-center gap-1.5" @click="saveCategory">
            <AppIcon v-if="formModal.saving" name="loader" :size="13" class="animate-spin" />
            {{ formModal.isEdit ? 'Güncelle' : 'Ekle' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ── -->
    <div v-if="deleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="deleteModal.show = false"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[400px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Kategoriyi Sil</h3>
        <p class="text-sm text-gray-500 mb-1">
          <strong class="text-gray-800 dark:text-gray-200">{{ deleteModal.node?.name }}</strong>
          kategorisi silinecek.
        </p>
        <p v-if="deleteModal.node?.child_count > 0" class="text-xs text-red-500 mb-3">
          Bu kategorinin {{ deleteModal.node.child_count }} alt kategorisi var. Silmeden önce onları kaldırın.
        </p>
        <p v-else class="text-xs text-gray-400 mb-3">Bu işlem geri alınamaz.</p>
        <div class="flex gap-3 justify-end">
          <button class="hdr-btn-outlined" @click="deleteModal.show = false">İptal</button>
          <button
            :disabled="deleteModal.deleting || deleteModal.node?.child_count > 0"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="deleteCategory"
          >
            <AppIcon v-if="deleteModal.deleting" name="loader" :size="13" class="animate-spin" />
            Sil
          </button>
        </div>
      </div>
    </div>

    <!-- ── Bulk Delete Modal ── -->
    <div v-if="bulkDeleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="!bulkDeleteModal.deleting && (bulkDeleteModal.show = false)"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Seçili Kategorileri Sil</h3>
        <p class="text-sm text-gray-500 mb-2">
          <strong class="text-gray-800 dark:text-gray-200">{{ selectedIds.size }}</strong> kategori ve
          bunların tüm alt kategorileri silinecek.
        </p>
        <p class="text-xs text-red-500 mb-4">Bu işlem geri alınamaz.</p>
        <div class="flex gap-3 justify-end">
          <button
            :disabled="bulkDeleteModal.deleting"
            class="hdr-btn-outlined"
            @click="bulkDeleteModal.show = false"
          >İptal</button>
          <button
            :disabled="bulkDeleteModal.deleting"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="runBulkDelete"
          >
            <AppIcon v-if="bulkDeleteModal.deleting" name="loader" :size="13" class="animate-spin" />
            Sil
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete All Modal ── -->
    <div v-if="deleteAllModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="!deleteAllModal.deleting && (deleteAllModal.show = false)"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[440px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
          <AppIcon name="circle-alert" :size="16" />
          Tüm Kategorileri Sil
        </h3>
        <p class="text-sm text-gray-500 mb-2">
          Platformdaki <strong class="text-gray-800 dark:text-gray-200">tüm</strong> kategoriler (tüm alt ağaçlar dahil) silinecek.
        </p>
        <p class="text-xs text-red-500 mb-3">Bu işlem geri alınamaz. Onaylamak için aşağıya <strong>SIL</strong> yazın.</p>
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
          >İptal</button>
          <button
            :disabled="deleteAllModal.deleting || deleteAllModal.confirmText !== 'SIL'"
            class="hdr-btn-danger flex items-center gap-1.5"
            @click="runDeleteAll"
          >
            <AppIcon v-if="deleteAllModal.deleting" name="loader" :size="13" class="animate-spin" />
            Hepsini Sil
          </button>
        </div>
      </div>
    </div>

    <!-- ── Import Modal ── -->
    <div v-if="importModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="!importModal.importing && (importModal.show = false)"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[480px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">JSON İçe Aktar</h3>
        <p class="text-xs text-gray-400 mb-4">
          Beklenen format: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">[{"id": "...", "name": "...", "parent_id": "..."}]</code>
        </p>

        <!-- Upload area -->
        <div v-if="!importModal.result && !importModal.importing">
          <div
            class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            :class="importModal.data ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/10' : 'border-gray-200 dark:border-[#2a2a35] hover:border-violet-400'"
            @click="fileInput.click()"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <AppIcon
:name="importModal.data ? 'circle-check' : 'upload-cloud'" :size="28"
              :class="importModal.data ? 'text-violet-500' : 'text-gray-300'"
              class="mx-auto mb-2" />
            <p class="text-sm" :class="importModal.data ? 'text-violet-700 dark:text-violet-400 font-medium' : 'text-gray-500'">
              {{ importModal.fileName || 'JSON dosyası seçin veya sürükleyin' }}
            </p>
            <p v-if="importModal.data" class="text-xs text-gray-400 mt-1">{{ importModal.data.length }} kayıt okundu</p>
          </div>
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileSelect" />

          <div class="flex gap-3 justify-end mt-4">
            <button class="hdr-btn-outlined" @click="importModal.show = false">İptal</button>
            <button
              :disabled="!importModal.data"
              class="hdr-btn-primary flex items-center gap-1.5"
              @click="runImport"
            >
              İçe Aktar
            </button>
          </div>
        </div>

        <!-- Progress -->
        <div v-else-if="importModal.importing && !importModal.result" class="py-2">
          <div class="flex items-center gap-2 mb-3">
            <AppIcon name="loader" :size="16" class="text-violet-500 animate-spin" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ importModal.progress?.state === 'queued' ? 'Kuyruğa alındı, başlatılıyor...' : 'İçe aktarılıyor...' }}
            </span>
          </div>
          <div class="w-full h-2 bg-gray-100 dark:bg-[#2a2a35] rounded-full overflow-hidden mb-2">
            <div
              class="h-full bg-violet-500 transition-all duration-300"
              :style="{ width: importPct + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mb-4">
            <span>{{ importModal.progress?.processed || 0 }} / {{ importModal.progress?.total || 0 }}</span>
            <span>{{ importPct }}%</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
              <p class="font-bold text-emerald-600">{{ importModal.progress?.inserted || 0 }}</p>
              <p class="text-gray-500">Yeni</p>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              <p class="font-bold text-blue-600">{{ importModal.progress?.updated || 0 }}</p>
              <p class="text-gray-500">Güncel</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p class="font-bold text-gray-500">{{ importModal.progress?.skipped || 0 }}</p>
              <p class="text-gray-500">Atlandı</p>
            </div>
          </div>
          <p class="text-[11px] text-gray-400 mt-3 text-center">Bu pencereyi kapatabilirsin, işlem arka planda devam eder.</p>
        </div>

        <!-- Result -->
        <div v-else class="text-center py-2">
          <AppIcon name="circle-check" :size="36" class="text-emerald-400 mx-auto mb-3" />
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">İçe aktarma tamamlandı</p>
          <div class="grid grid-cols-3 gap-3 text-center mb-5">
            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <p class="text-xl font-bold text-emerald-600">{{ importModal.result.inserted }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Eklendi</p>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p class="text-xl font-bold text-blue-600">{{ importModal.result.updated }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Güncellendi</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p class="text-xl font-bold text-gray-500">{{ importModal.result.skipped }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Atlandı</p>
            </div>
          </div>
          <button class="hdr-btn-primary" @click="closeImportAndReload">Tamam</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'
import AppIcon from '@/components/common/AppIcon.vue'

const toast = useToast()
const loading = ref(false)
const nodes = ref([])

// ── Helpers ───────────────────────────────────────────

function toNode(c, depth) {
  return {
    id: c.name,
    name: c.category_name,
    url_slug: c.url_slug || '',
    image: c.image || '',
    icon_class: c.icon_class || '',
    is_active: !!c.is_active,
    sort_order: c.sort_order || 0,
    child_count: c.child_count || 0,
    parent_id: c.parent_product_category || null,
    depth,
    expanded: false,
    loadingChildren: false,
  }
}

// ── Tree loading ──────────────────────────────────────

async function loadRoots() {
  loading.value = true
  try {
    const res = await api.callMethod('tradehub_core.api.category.get_category_tree', { parent: null })
    nodes.value = (res.message || []).map(c => toNode(c, 0))
  } catch (err) {
    toast.error(err.message || 'Kategoriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function toggleExpand(node) {
  if (node.expanded) {
    collapseNode(node)
    return
  }
  node.loadingChildren = true
  try {
    const res = await api.callMethod('tradehub_core.api.category.get_category_tree', { parent: node.id })
    const children = (res.message || []).map(c => toNode(c, node.depth + 1))
    const idx = nodes.value.findIndex(n => n.id === node.id)
    nodes.value.splice(idx + 1, 0, ...children)
    node.expanded = true
  } catch (err) {
    toast.error(err.message || 'Alt kategoriler yüklenemedi')
  } finally {
    node.loadingChildren = false
  }
}

function collapseNode(node) {
  const idx = nodes.value.findIndex(n => n.id === node.id)
  let end = idx + 1
  while (end < nodes.value.length && nodes.value[end].depth > node.depth) end++
  nodes.value.splice(idx + 1, end - idx - 1)
  node.expanded = false
}

// ── Add/Edit Modal ────────────────────────────────────

const catImageInput = ref(null)

const formModal = ref({
  show: false, isEdit: false, saving: false,
  id: null, parentId: null, parentName: null,
  name: '', url_slug: '', icon_class: '', sort_order: 0, is_active: true,
  image: '', imageUploading: false,
})

function openAddModal(parentId) {
  const parentNode = parentId ? nodes.value.find(n => n.id === parentId) : null
  formModal.value = {
    show: true, isEdit: false, saving: false,
    id: null, parentId,
    parentName: parentNode?.name || null,
    name: '', url_slug: '', icon_class: '', sort_order: 0, is_active: true,
    image: '', imageUploading: false,
  }
}

function openEditModal(node) {
  const parentNode = node.parent_id ? nodes.value.find(n => n.id === node.parent_id) : null
  formModal.value = {
    show: true, isEdit: true, saving: false,
    id: node.id, parentId: node.parent_id,
    parentName: parentNode?.name || null,
    name: node.name, url_slug: node.url_slug, icon_class: node.icon_class || '',
    sort_order: node.sort_order, is_active: node.is_active,
    image: node.image || '', imageUploading: false,
  }
}

async function handleCatImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  formModal.value.imageUploading = true
  try {
    const fileUrl = await api.uploadFile(file, 'Home')
    formModal.value.image = fileUrl
    toast.success('Resim yüklendi')
  } catch (err) {
    toast.error('Resim yüklenemedi: ' + (err.message || ''))
  } finally {
    formModal.value.imageUploading = false
    e.target.value = ''
  }
}

async function saveCategory() {
  const fm = formModal.value
  if (!fm.name.trim()) { toast.error('Kategori adı zorunlu'); return }
  fm.saving = true
  try {
    if (fm.isEdit) {
      await api.callMethod('tradehub_core.api.category.update_category', {
        name: fm.id,
        category_name: fm.name,
        url_slug: fm.url_slug || null,
        icon_class: fm.icon_class || null,
        sort_order: fm.sort_order,
        is_active: fm.is_active ? 1 : 0,
        image: fm.image || null,
      }, true)
      const node = nodes.value.find(n => n.id === fm.id)
      if (node) {
        node.name = fm.name
        node.url_slug = fm.url_slug
        node.icon_class = fm.icon_class
        node.sort_order = fm.sort_order
        node.is_active = fm.is_active
        node.image = fm.image
      }
      toast.success('Kategori güncellendi')
    } else {
      await api.callMethod('tradehub_core.api.category.create_category', {
        category_name: fm.name,
        parent_id: fm.parentId || null,
        url_slug: fm.url_slug || null,
        icon_class: fm.icon_class || null,
        sort_order: fm.sort_order,
        is_active: fm.is_active ? 1 : 0,
        image: fm.image || null,
      }, true)
      toast.success('Kategori eklendi')
      if (fm.parentId) {
        const parent = nodes.value.find(n => n.id === fm.parentId)
        if (parent) {
          parent.child_count++
          if (parent.expanded) {
            collapseNode(parent)
            await toggleExpand(parent)
          }
        }
      } else {
        await loadRoots()
      }
    }
    formModal.value.show = false
  } catch (err) {
    toast.error(err.message || 'İşlem başarısız')
  } finally {
    formModal.value.saving = false
  }
}

// ── Selection / Bulk Delete ───────────────────────────

const selectedIds = ref(new Set())

const allVisibleSelected = computed(() =>
  nodes.value.length > 0 && nodes.value.every(n => selectedIds.value.has(n.id))
)
const someVisibleSelected = computed(() =>
  nodes.value.some(n => selectedIds.value.has(n.id))
)

function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}

function toggleSelectAllVisible() {
  const s = new Set(selectedIds.value)
  if (allVisibleSelected.value) {
    nodes.value.forEach(n => s.delete(n.id))
  } else {
    nodes.value.forEach(n => s.add(n.id))
  }
  selectedIds.value = s
}

const bulkDeleteModal = ref({ show: false, deleting: false })

function openBulkDeleteModal() {
  if (selectedIds.value.size === 0) return
  bulkDeleteModal.value = { show: true, deleting: false }
}

async function runBulkDelete() {
  bulkDeleteModal.value.deleting = true
  try {
    const ids = Array.from(selectedIds.value)
    const res = await api.callMethod(
      'tradehub_core.api.category.bulk_delete_categories',
      { names: JSON.stringify(ids) },
      true
    )
    const deleted = res.message?.deleted || 0
    const errors = res.message?.errors || []
    if (deleted > 0) toast.success(`${deleted} kategori silindi`)
    if (errors.length > 0) toast.error(`${errors.length} kayıt silinemedi: ${errors[0]}`)
    selectedIds.value = new Set()
    bulkDeleteModal.value.show = false
    await loadRoots()
  } catch (err) {
    toast.error(err.message || 'Toplu silme başarısız')
  } finally {
    bulkDeleteModal.value.deleting = false
  }
}

const deleteAllModal = ref({ show: false, deleting: false, confirmText: '' })

function openDeleteAllModal() {
  deleteAllModal.value = { show: true, deleting: false, confirmText: '' }
}

async function runDeleteAll() {
  if (deleteAllModal.value.confirmText !== 'SIL') return
  deleteAllModal.value.deleting = true
  try {
    const res = await api.callMethod('tradehub_core.api.category.delete_all_categories', {}, true)
    const deleted = res.message?.deleted || 0
    const errors = res.message?.errors || []
    if (deleted > 0) toast.success(`${deleted} kategori silindi`)
    if (errors.length > 0) toast.error(`${errors.length} kayıt silinemedi: ${errors[0]}`)
    selectedIds.value = new Set()
    deleteAllModal.value.show = false
    await loadRoots()
  } catch (err) {
    toast.error(err.message || 'Hepsini silme başarısız')
  } finally {
    deleteAllModal.value.deleting = false
  }
}

// ── Delete ────────────────────────────────────────────

const deleteModal = ref({ show: false, node: null, deleting: false })

function confirmDelete(node) {
  deleteModal.value = { show: true, node, deleting: false }
}

async function deleteCategory() {
  const dm = deleteModal.value
  dm.deleting = true
  try {
    await api.callMethod('tradehub_core.api.category.delete_category', { name: dm.node.id }, true)
    toast.success(`"${dm.node.name}" silindi`)
    const idx = nodes.value.findIndex(n => n.id === dm.node.id)
    if (idx !== -1) nodes.value.splice(idx, 1)
    if (selectedIds.value.has(dm.node.id)) {
      const s = new Set(selectedIds.value)
      s.delete(dm.node.id)
      selectedIds.value = s
    }
    if (dm.node.parent_id) {
      const parent = nodes.value.find(n => n.id === dm.node.parent_id)
      if (parent) parent.child_count = Math.max(0, parent.child_count - 1)
    }
    deleteModal.value.show = false
  } catch (err) {
    toast.error(err.message || 'Silinemedi')
  } finally {
    dm.deleting = false
  }
}

// ── Active Toggle ─────────────────────────────────────

async function toggleActive(node) {
  const newVal = !node.is_active
  try {
    await api.callMethod('tradehub_core.api.category.update_category', {
      name: node.id,
      is_active: newVal ? 1 : 0,
    }, true)
    node.is_active = newVal
    toast.success(newVal ? 'Aktif edildi' : 'Pasif yapıldı')
  } catch (err) {
    toast.error(err.message || 'Güncelleme başarısız')
  }
}

// ── Import ────────────────────────────────────────────

const fileInput = ref(null)
const importModal = ref({
  show: false, importing: false,
  fileName: null, data: null, result: null,
  jobKey: null, progress: null,
})

const importPct = computed(() => {
  const p = importModal.value.progress
  if (!p || !p.total) return 0
  return Math.min(100, Math.round((p.processed / p.total) * 100))
})

function openImportModal() {
  importModal.value = {
    show: true, importing: false,
    fileName: null, data: null, result: null,
    jobKey: null, progress: null,
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) readJsonFile(file)
}

function handleFileDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file) readJsonFile(file)
}

function readJsonFile(file) {
  importModal.value.fileName = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      importModal.value.data = JSON.parse(ev.target.result)
    } catch {
      toast.error('Geçersiz JSON dosyası')
      importModal.value.data = null
    }
  }
  reader.readAsText(file)
}

async function runImport() {
  const im = importModal.value
  if (!im.data) return
  im.importing = true
  im.progress = { state: 'queued', total: im.data.length, processed: 0, inserted: 0, updated: 0, skipped: 0 }

  try {
    const startRes = await api.callMethod(
      'tradehub_core.api.category.start_category_import',
      { json_data: JSON.stringify(im.data) },
      true
    )
    const jobKey = startRes.message?.job_key
    if (!jobKey) throw new Error('Background job başlatılamadı')
    im.jobKey = jobKey

    // Polling — 2 saniye aralıkla
    while (importModal.value.importing) {
      await new Promise(r => setTimeout(r, 2000))
      let statusRes
      try {
        statusRes = await api.callMethod(
          'tradehub_core.api.category.get_category_import_status',
          { job_key: jobKey },
          true
        )
      } catch (e) {
        // Geçici ağ hatası — denemeye devam
        continue
      }
      const st = statusRes.message || {}
      im.progress = st

      if (st.state === 'done') {
        im.result = {
          inserted: st.inserted || 0,
          updated: st.updated || 0,
          skipped: st.skipped || 0,
          warning: st.warning || null,
        }
        if (st.warning) toast.error(st.warning)
        im.importing = false
        return
      }
      if (st.state === 'error') {
        toast.error(st.error || 'İçe aktarma hatası')
        im.importing = false
        return
      }
      if (st.state === 'not_found') {
        // Cache'ten düşmüş olabilir; kullanıcı zaten kapatıp açmışsa
        toast.error('Job durumu bulunamadı')
        im.importing = false
        return
      }
    }
  } catch (err) {
    toast.error(err.message || 'İçe aktarma başarısız')
    im.importing = false
  }
}

async function closeImportAndReload() {
  importModal.value.show = false
  await loadRoots()
}

onMounted(loadRoots)
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Kategorilerim</h1>
        <p class="text-xs text-gray-400 mt-0.5">Mağaza kategorilerinizi ekleyin ve yönetin</p>
      </div>
      <button class="hdr-btn-primary flex items-center gap-1.5" @click="showAddModal = true">
        <AppIcon name="plus" :size="13" />
        Kategori Ekle
      </button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-2 mb-4">
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Onay Bekliyor
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Onaylandı
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-red-50 text-red-700 border border-red-200"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Reddedildi
      </span>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <div v-else-if="categories.length === 0" class="card text-center py-12">
      <AppIcon name="folder-open" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400 mb-4">Henüz kategori eklenmemiş.</p>
      <button class="hdr-btn-primary" @click="showAddModal = true">İlk Kategorini Ekle</button>
    </div>

    <div v-else class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Kategori</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Açıklama</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Durum</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">İşlem</th>
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
                  title="Düzenle"
                  class="inline-flex items-center justify-center w-7 h-7 text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                  @click="openEditModal(cat)"
                >
                  <AppIcon name="pencil" :size="12" />
                </button>
                <!-- Pasife Al (aktifse göster) -->
                <button
                  v-if="cat.is_enabled"
                  :disabled="togglingId === cat.name"
                  title="Pasife Al"
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
                  title="Aktife Al"
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
                  title="Sil"
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
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Kategoriyi Düzenle</h3>
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
              Kategori Adı <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.category_name"
              type="text"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Kategori Görseli</label
            >
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
                    {{ editImageFile ? editImageFile.name : "Mevcut görsel" }}
                  </p>
                  <button
                    type="button"
                    class="text-[10px] text-red-500 hover:text-red-700 mt-1"
                    @click.stop="clearEditImage"
                  >
                    Görseli Kaldır
                  </button>
                </div>
              </div>
              <div v-else class="py-2">
                <AppIcon name="upload" :size="20" class="text-gray-300 mx-auto mb-1" />
                <p class="text-xs text-gray-400">Görsel yüklemek için tıklayın veya sürükleyin</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Açıklama</label
            >
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Sıralama</label
            >
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
            Düzenleme sonrası kategori tekrar admin onayına düşecektir.
          </p>
        </div>
        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="closeEditModal">İptal</button>
          <button
            :disabled="editSubmitting || !editForm.category_name.trim()"
            class="hdr-btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="saveEdit"
          >
            <AppIcon v-if="editSubmitting" name="loader" :size="13" class="animate-spin" />
            Kaydet
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
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Yeni Kategori Ekle</h3>
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
              Kategori Adı <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.category_name"
              type="text"
              placeholder="ör. Elektronik, Giyim..."
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Kategori Görseli</label
            >
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
                    Görseli Kaldır
                  </button>
                </div>
              </div>
              <div v-else class="py-2">
                <AppIcon name="upload" :size="20" class="text-gray-300 mx-auto mb-1" />
                <p class="text-xs text-gray-400">Görsel yüklemek için tıklayın veya sürükleyin</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Açıklama</label
            >
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Kategori hakkında kısa bir açıklama..."
              class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5"
              >Sıralama</label
            >
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
            Kategori eklendikten sonra admin onayı bekleyecektir. Onaylanınca mağazanızda görünür
            hale gelecek.
          </p>
        </div>

        <div class="flex gap-3 justify-end mt-5">
          <button class="hdr-btn-outlined" @click="closeAddModal">İptal</button>
          <button
            :disabled="submitting || !form.category_name.trim()"
            class="hdr-btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="addCategory"
          >
            <AppIcon v-if="submitting" name="loader" :size="13" class="animate-spin" />
            Ekle
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  // tradehub-upload-ui pattern — add + edit modal'ların kategori görseli upload'ları
  const addImageUpload = useImageUploadProgress();
  const editImageUpload = useImageUploadProgress();

  const toast = useToast();
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
      { Pending: "Onay Bekliyor", Active: "Onaylandı", Rejected: "Reddedildi" }[status] || status
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
      toast.error(err.message || "Kategoriler yüklenemedi");
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
      toast.error("Resim yüklenemedi");
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
      toast.error("Resim yüklenemedi");
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
      toast.success("Kategori eklendi, admin onayı bekleniyor.");
      closeAddModal();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || "Kategori eklenemedi");
    } finally {
      submitting.value = false;
    }
  }

  async function toggleCategory(cat, isEnabled) {
    const msg = isEnabled
      ? `"${cat.category_name}" aktife alınacak. Emin misiniz?`
      : `"${cat.category_name}" pasife alınacak. Emin misiniz?`;
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
      toast.success(isEnabled ? "Kategori aktife alındı." : "Kategori pasife alındı.");
      await loadCategories();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    } finally {
      togglingId.value = null;
    }
  }

  async function deleteCategory(cat) {
    if (!confirm(`"${cat.category_name}" kategorisi kalıcı olarak silinecek. Emin misiniz?`))
      return;
    deletingId.value = cat.name;
    try {
      await api.callMethod(
        "tradehub_core.api.seller.delete_seller_category",
        { category_name: cat.name },
        true
      );
      toast.success("Kategori silindi.");
      await loadCategories();
    } catch (err) {
      toast.error(err.message || "Kategori silinemedi");
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
      toast.success("Kategori güncellendi, admin onayı bekleniyor.");
      closeEditModal();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || "Güncellenemedi");
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

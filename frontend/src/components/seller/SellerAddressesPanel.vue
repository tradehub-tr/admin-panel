<template>
  <div class="space-y-5">
    <!-- Info card -->
    <div
      class="card bg-brand-50/60 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800/30"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0"
        >
          <AppIcon name="map-pin" :size="16" class="text-brand-800 dark:text-brand-500" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
            {{ t("sellerAddresses.title") }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {{ t("sellerAddresses.infoLead") }}
            <strong>{{ t("sellerAddresses.infoLeadBold") }}</strong>
            {{ t("sellerAddresses.infoRest") }}
          </p>
        </div>
        <button
          v-if="!showForm"
          :disabled="isNew || addresses.length >= MAX_ADDRESSES"
          class="hdr-btn-primary flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          :title="
            isNew
              ? t('sellerAddresses.saveProfileFirstTitle')
              : addresses.length >= MAX_ADDRESSES
                ? t('sellerAddresses.maxAddressesTitle', { max: MAX_ADDRESSES })
                : ''
          "
          @click="openNew"
        >
          <AppIcon name="plus" :size="13" />
          <span>{{ t("sellerAddresses.newAddress") }}</span>
          <span v-if="!isNew && addresses.length > 0" class="text-[10px] opacity-70"
            >({{ addresses.length }}/{{ MAX_ADDRESSES }})</span
          >
        </button>
      </div>
    </div>

    <!-- isNew bilgi mesajı: Profil kaydedilmeden adres eklenemez -->
    <div
      v-if="isNew"
      class="card bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0"
        >
          <AppIcon name="info" :size="16" class="text-amber-600 dark:text-amber-400" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
            {{ t("sellerAddresses.saveProfileFirst") }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {{ t("sellerAddresses.saveProfileFirstDesc") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="22" class="text-brand-700 animate-spin mx-auto" />
      <p class="text-xs text-gray-400 mt-3">{{ t("sellerAddresses.loading") }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="addresses.length === 0 && !showForm" class="card text-center py-12">
      <AppIcon name="map-pin" :size="32" class="text-gray-300 dark:text-white/10 mx-auto" />
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">{{ t("sellerAddresses.empty") }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ t("sellerAddresses.emptyHint") }}</p>
    </div>

    <!-- Address list -->
    <div v-else-if="!showForm" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        v-for="addr in addresses"
        :key="addr.id"
        class="card relative group transition-all hover:shadow-md"
        :class="
          addr.is_default
            ? 'border-brand-300 dark:border-brand-700/50 ring-1 ring-brand-200 dark:ring-brand-800/30'
            : ''
        "
      >
        <!-- Default badge -->
        <div v-if="addr.is_default" class="absolute top-3 right-3">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300 text-[10px] font-semibold uppercase tracking-wide"
          >
            <AppIcon name="check" :size="10" />
            {{ t("sellerAddresses.default") }}
          </span>
        </div>

        <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 pr-20 truncate">
          {{ addr.title || t("sellerAddresses.addressFallback") }}
        </h4>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">
          <strong>{{ addr.contact_name }}</strong>
          <span v-if="addr.company" class="text-gray-400"> · {{ addr.company }}</span>
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-1">
          {{ addr.street }}<span v-if="addr.apartment">, {{ addr.apartment }}</span>
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span v-if="addr.city">{{ addr.city }} / </span>{{ addr.state
          }}<span v-if="addr.postal_code"> · {{ addr.postal_code }}</span>
        </p>
        <p class="text-xs text-gray-400 mb-3">{{ addr.phone_prefix }} {{ addr.phone }}</p>

        <div
          class="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5"
        >
          <button
            v-if="!addr.is_default"
            :disabled="busy"
            class="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            @click="setDefault(addr.id)"
          >
            <AppIcon
              v-if="settingDefaultId === addr.id"
              name="loader"
              :size="11"
              class="animate-spin"
            />
            {{ t("sellerAddresses.makeDefault") }}
          </button>
          <button
            :disabled="busy"
            class="text-[11px] px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            @click="openEdit(addr)"
          >
            <AppIcon name="pencil" :size="11" class="inline mr-1" />
            {{ t("sellerAddresses.edit") }}
          </button>
          <button
            :disabled="busy"
            class="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            @click="confirmDelete(addr)"
          >
            <AppIcon v-if="deletingId === addr.id" name="loader" :size="11" class="animate-spin" />
            <AppIcon v-else name="trash-2" :size="11" />
            {{ t("sellerAddresses.delete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Form (inline) -->
    <div v-if="showForm" class="card">
      <div
        class="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AppIcon name="map-pin" :size="14" class="text-brand-700" />
          {{
            formData.id ? t("sellerAddresses.editAddress") : t("sellerAddresses.newPickupAddress")
          }}
        </h3>
        <button
          class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          @click="closeForm"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label class="form-label"
            >{{ t("sellerAddresses.addressTitle") }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.title"
            type="text"
            class="form-input"
            :placeholder="t('sellerAddresses.addressTitlePlaceholder')"
          />
        </div>
        <div>
          <label class="form-label"
            >{{ t("sellerAddresses.contactPerson") }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.contact_name"
            type="text"
            class="form-input"
            :placeholder="t('sellerAddresses.contactPersonPlaceholder')"
          />
        </div>
        <div>
          <label class="form-label"
            >{{ t("sellerAddresses.companyStoreName") }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.company"
            type="text"
            class="form-input"
            :placeholder="t('sellerAddresses.companyPlaceholder')"
          />
        </div>
        <div>
          <label class="form-label"
            >{{ t("sellerAddresses.phone") }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.phone"
            type="tel"
            class="form-input"
            placeholder="0212 555 00 00"
            maxlength="20"
            @input="phoneError = ''"
          />
          <p v-if="phoneError" class="text-xs text-red-500 mt-1">{{ phoneError }}</p>
        </div>
        <div>
          <label class="form-label">{{ t("sellerAddresses.country") }}</label>
          <select v-model="formData.country" class="form-input">
            <option value="TR">{{ t("sellerAddresses.turkey") }}</option>
          </select>
        </div>
        <div>
          <label class="form-label"
            >{{ t("sellerAddresses.province") }} <span class="text-red-500">*</span></label
          >
          <select v-model="formData.state" class="form-input">
            <option value="">{{ t("sellerAddresses.selectProvince") }}</option>
            <option v-for="p in turkishProvinces" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">{{ t("sellerAddresses.district") }}</label>
          <select
            v-model="formData.city"
            class="form-input"
            :disabled="!formData.state || districtOptions.length === 0"
          >
            <option value="">
              {{
                formData.state
                  ? t("sellerAddresses.selectDistrict")
                  : t("sellerAddresses.selectProvinceFirst")
              }}
            </option>
            <option v-for="d in districtOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">{{ t("sellerAddresses.postalCode") }}</label>
          <input
            v-model="formData.postal_code"
            type="text"
            class="form-input"
            placeholder="34000"
          />
        </div>
        <div class="lg:col-span-2">
          <label class="form-label"
            >{{ t("sellerAddresses.addressLine") }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.street"
            type="text"
            class="form-input"
            :placeholder="t('sellerAddresses.addressLinePlaceholder')"
          />
        </div>
        <div class="lg:col-span-2">
          <label class="form-label">{{ t("sellerAddresses.apartmentNo") }}</label>
          <input
            v-model="formData.apartment"
            type="text"
            class="form-input"
            :placeholder="t('sellerAddresses.apartmentPlaceholder')"
          />
        </div>
        <div class="lg:col-span-2">
          <label class="form-label">{{ t("sellerAddresses.note") }}</label>
          <textarea
            v-model="formData.note"
            rows="2"
            class="form-input resize-none"
            :placeholder="t('sellerAddresses.notePlaceholder')"
          ></textarea>
        </div>
        <div class="lg:col-span-2 flex items-center gap-2 pt-1">
          <input
            id="addr-is-default"
            type="checkbox"
            :checked="!!formData.is_default"
            class="form-checkbox rounded text-brand-800 w-4 h-4"
            @change="formData.is_default = $event.target.checked"
          />
          <label
            for="addr-is-default"
            class="text-xs text-gray-600 dark:text-gray-400 select-none cursor-pointer"
          >
            {{ t("sellerAddresses.markAsDefault") }}
          </label>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
        <button :disabled="saving" class="hdr-btn-primary" @click="save">
          <AppIcon v-if="saving" name="loader" :size="13" class="animate-spin" />
          <AppIcon v-else name="save" :size="13" />
          <span>{{ formData.id ? t("sellerAddresses.update") : t("sellerAddresses.save") }}</span>
        </button>
        <button :disabled="saving" class="hdr-btn-outlined" @click="closeForm">
          {{ t("sellerAddresses.cancel") }}
        </button>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <div
        v-if="deleteConfirmAddr"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        @click.self="cancelDelete"
        @keydown.esc="cancelDelete"
      >
        <div
          class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10"
        >
          <div class="flex items-start gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"
            >
              <AppIcon name="trash-2" :size="18" class="text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1">
              <h3
                id="delete-confirm-title"
                class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1"
              >
                {{ t("sellerAddresses.deleteTitle") }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                <strong class="text-gray-700 dark:text-gray-300"
                  >"{{ deleteConfirmAddr.title || t("sellerAddresses.addressFallback") }}"</strong
                >
                {{ t("sellerAddresses.deleteConfirmText") }}
              </p>
            </div>
          </div>
          <div
            class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/5"
          >
            <button
              :disabled="busy"
              class="hdr-btn-outlined disabled:opacity-50 disabled:cursor-not-allowed"
              @click="cancelDelete"
            >
              {{ t("sellerAddresses.cancel") }}
            </button>
            <button
              :disabled="busy"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="performDelete"
            >
              <AppIcon v-if="busy" name="loader" :size="13" class="animate-spin" />
              <AppIcon v-else name="trash-2" :size="13" />
              {{ t("sellerAddresses.delete") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { turkishProvinces, districtsByProvince } from "@/data/turkishGeo";

  const { t } = useI18n();

  const props = defineProps({
    docName: { type: String, default: "" },
    isNew: { type: Boolean, default: false },
  });

  const toast = useToast();

  const MAX_ADDRESSES = 10;

  // TR telefon regex — backend (seller_addresses.py) ile senkron
  const PHONE_RE = /^(\+90|0)?[2-5]\d{9}$/;
  const PHONE_CLEAN_RE = /[\s\-()]/g;

  function normalizePhone(raw) {
    return (raw || "").replace(PHONE_CLEAN_RE, "");
  }

  function isValidPhone(raw) {
    return PHONE_RE.test(normalizePhone(raw));
  }

  const addresses = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const busy = ref(false);
  const showForm = ref(false);
  const phoneError = ref("");
  const formData = reactive(emptyForm());

  // Hangi satır üstünde işlem yapılıyor → o satırın butonunda spinner için.
  // busy = global guard (re-entry koruması), bu iki ref ise hangi adresin
  // hangi işleme tabi olduğunu söyler — UI feedback için.
  const deletingId = ref("");
  const settingDefaultId = ref("");

  // Custom delete confirm modal state — window.confirm yerine.
  const deleteConfirmAddr = ref(null);

  // İl değiştiğinde ilçeyi sıfırla — eski ilçe yeni ilin listesinde olmayabilir.
  // openEdit sonrası yanlış tetiklenmesin diye yalnızca kullanıcı il'i değiştirdiğinde çalışır.
  const districtOptions = computed(() => districtsByProvince[formData.state] || []);
  watch(
    () => formData.state,
    (newVal, oldVal) => {
      if (oldVal !== undefined && newVal !== oldVal) {
        if (formData.city && !(districtsByProvince[newVal] || []).includes(formData.city)) {
          formData.city = "";
        }
      }
    }
  );

  function emptyForm() {
    return {
      id: "",
      title: "",
      contact_name: "",
      company: "",
      phone_prefix: "+90",
      phone: "",
      country: "TR",
      state: "",
      city: "",
      street: "",
      apartment: "",
      postal_code: "",
      note: "",
      is_default: false,
    };
  }

  function resetForm() {
    Object.assign(formData, emptyForm());
  }

  async function loadAddresses() {
    if (props.isNew) {
      addresses.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.seller_addresses.get_addresses");
      addresses.value = res.message || [];
    } catch (err) {
      toast.error(err?.message || t("sellerAddresses.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function openNew() {
    if (props.isNew) {
      toast.error(t("sellerAddresses.saveProfileFirstTitle"));
      return;
    }
    if (addresses.value.length >= MAX_ADDRESSES) {
      toast.error(t("sellerAddresses.maxAddressesTitle", { max: MAX_ADDRESSES }));
      return;
    }
    resetForm();
    phoneError.value = "";
    showForm.value = true;
  }

  function openEdit(addr) {
    // Önce stale alanları sıfırla; backend yeni alan eklerse veya addr eksik gelirse
    // önceki düzenlemeden kalan değerin sızmasını önler.
    resetForm();
    Object.assign(formData, addr);
    phoneError.value = "";
    showForm.value = true;
  }

  function closeForm() {
    showForm.value = false;
    phoneError.value = "";
    resetForm();
  }

  async function save() {
    phoneError.value = "";
    // Frontend zorunlu alan kontrolü
    const required = ["title", "contact_name", "company", "phone", "state", "street"];
    for (const f of required) {
      if (!(formData[f] || "").toString().trim()) {
        toast.error(t("sellerAddresses.fillRequired"));
        return;
      }
    }
    // Telefon format validasyonu (backend regex ile senkron)
    if (!isValidPhone(formData.phone)) {
      phoneError.value = t("sellerAddresses.invalidPhone");
      return;
    }
    // Phone prefix UI'dan kaldırıldı — TR sabit +90, normalize edip gönder
    formData.phone_prefix = "+90";
    formData.phone = normalizePhone(formData.phone);

    const wasEdit = !!formData.id;
    saving.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller_addresses.save_address", {
        address_json: JSON.stringify(formData),
      });
      // Backend response: { address: {...}, default_id: "..." }
      // Optimistic update — full reload yerine local listeyi güncelle.
      const payload = res.message || {};
      const saved = payload.address;
      const defaultId = payload.default_id || "";
      if (saved) {
        if (wasEdit) {
          const idx = addresses.value.findIndex((a) => a.id === saved.id);
          if (idx !== -1) addresses.value[idx] = saved;
          else addresses.value.push(saved);
        } else {
          addresses.value.push(saved);
        }
        // Backend'in _ensure_one_default sonucuna göre is_default flag'larını senkronize et.
        addresses.value = addresses.value.map((a) => ({ ...a, is_default: a.id === defaultId }));
      }
      toast.success(
        wasEdit ? t("sellerAddresses.addressUpdated") : t("sellerAddresses.addressAdded")
      );
      closeForm();
    } catch (err) {
      toast.error(err?.message || t("sellerAddresses.saveFailed"));
      // Hata durumunda local state'in API ile senkron olduğundan emin olmak için reload.
      await loadAddresses();
    } finally {
      saving.value = false;
    }
  }

  // Sil butonu → modal aç. Asıl silme performDelete'te.
  function confirmDelete(addr) {
    deleteConfirmAddr.value = addr;
  }

  function cancelDelete() {
    if (busy.value) return;
    deleteConfirmAddr.value = null;
  }

  async function performDelete() {
    const addr = deleteConfirmAddr.value;
    if (!addr) return;
    busy.value = true;
    deletingId.value = addr.id;
    try {
      await api.callMethod("tradehub_core.api.seller_addresses.delete_address", {
        address_id: addr.id,
      });
      // Optimistic: silineni local listeden çıkar. Modal'ı hemen kapat ki
      // kullanıcı "tepki yok" hissi yaşamasın.
      const wasDefault = addr.is_default;
      addresses.value = addresses.value.filter((a) => a.id !== addr.id);
      deleteConfirmAddr.value = null;
      toast.success(t("sellerAddresses.addressDeleted"));
      // Backend _ensure_one_default ile başka bir adresi default yapmış olabilir.
      // Bunu doğru yansıtmak için hafif bir reload yap.
      if (wasDefault && addresses.value.length > 0) {
        await loadAddresses();
      }
    } catch (err) {
      toast.error(err?.message || t("sellerAddresses.deleteFailed"));
    } finally {
      busy.value = false;
      deletingId.value = "";
    }
  }

  async function setDefault(addressId) {
    busy.value = true;
    settingDefaultId.value = addressId;
    try {
      await api.callMethod("tradehub_core.api.seller_addresses.set_default_address", {
        address_id: addressId,
      });
      // Optimistic: tek API çağrısı ile default güncelleniyor → local state'i de güncelle.
      addresses.value = addresses.value.map((a) => ({ ...a, is_default: a.id === addressId }));
      toast.success(t("sellerAddresses.defaultUpdated"));
    } catch (err) {
      toast.error(err?.message || t("sellerAddresses.actionFailed"));
      await loadAddresses();
    } finally {
      busy.value = false;
      settingDefaultId.value = "";
    }
  }

  onMounted(loadAddresses);

  // Parent profili kaydedince isNew false'a düşer; o noktada adresleri yükle.
  watch(
    () => props.isNew,
    (newVal, oldVal) => {
      if (oldVal && !newVal) {
        loadAddresses();
      }
    }
  );
</script>

<template>
  <form @submit.prevent="submit">
    <!-- Başlık — DocTypeFormView ile birebir: geri oku + kayıt kimliği + kapsam -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
          :title="t('docTypeForm.back')"
          @click="$emit('cancel')"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
            {{ headline }}
          </h1>
          <p class="text-xs text-gray-400">{{ title }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
          {{ t("docTypeForm.back") }}
        </button>
        <!-- Yetki yoksa buton HİÇ render edilmez; disabled bırakmak
             "yapabilirim ama şu an olmaz" der, oysa yetki yok. -->
        <button v-if="canEdit" type="submit" class="hdr-btn-primary" :disabled="saving">
          <AppIcon v-if="saving" name="loader" :size="13" class="animate-spin" />
          <AppIcon v-else name="save" :size="13" />
          <span>{{ isNew ? t("docTypeForm.create") : t("docTypeForm.save") }}</span>
        </button>
        <span v-else class="text-xs text-gray-400 italic">{{ t("docTypeForm.readOnlyView") }}</span>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="card p-5">
      <Skeleton variant="title" />
      <Skeleton variant="text" :count="5" />
    </div>

    <div v-else class="space-y-5">
      <!-- Alanlar sözleşmeden; ekran hangi alanların olduğunu BİLMİYOR -->
      <div v-for="section in sections" :key="section.id" class="card">
        <h3
          class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/5"
        >
          <span class="flex items-center gap-2">
            <AppIcon name="layout-list" :size="14" class="text-brand-700" />
            {{ section.label }}
          </span>
          <span class="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {{ t("docTypeForm.fieldCount", { n: section.fields.length }) }}
          </span>
        </h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div v-for="field in section.fields" :key="field.name" class="min-w-0">
            <label class="form-label">
              {{ field.label }}
              <span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>

            <!-- Check alanı 0/1 TAMSAYI — boolean değil (Frappe) -->
            <BaseSwitch
              v-if="field.type === 'Check'"
              v-model="draft[field.name]"
              :on-value="1"
              :off-value="0"
              :disabled="!canEdit"
            />

            <AppSelect
              v-else-if="field.choiceOptions"
              v-model="draft[field.name]"
              :options="field.choiceOptions"
              :disabled="!canEdit"
            />

            <LinkInput
              v-else-if="field.type === 'Link'"
              v-model="draft[field.name]"
              :doctype="field.link"
              :disabled="!canEdit"
            />

            <textarea
              v-else-if="field.type === 'Small Text'"
              v-model="draft[field.name]"
              rows="3"
              class="form-input resize-y"
              :disabled="!canEdit"
            />

            <input
              v-else
              v-model="draft[field.name]"
              :type="field.inputType"
              class="form-input"
              :disabled="!canEdit"
            />
          </div>
        </div>
      </div>

      <!-- Child tablolar — Provider Operating Channel, Carrier Service Item -->
      <div v-for="child in childSections" :key="child.table" class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AppIcon name="table-2" :size="14" class="text-brand-700" />
            {{ child.label }}
          </h3>
          <span class="text-xs text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {{ t("docTypeForm.rowCount", { n: (draft[child.table] || []).length }) }}
          </span>
        </div>
        <ChildTable
          v-model="draft[child.table]"
          :columns="child.columns"
          :add-label="addRowLabel"
        />
      </div>
    </div>
  </form>
</template>

<script setup>
  import { computed, ref, toRaw, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import ChildTable from "@/components/common/ChildTable.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import {
    catalogChildTableColumns,
    catalogFieldsToFormSections,
    childTableLabel,
    getCatalogMeta,
    pickWritableValues,
  } from "./catalogMeta";

  /**
   * **M2 · Jenerik katalog formu.**
   *
   * Alan listesi ve tipleri sözleşmeden (`_catalog-meta.json`) geliyor; ekran
   * hangi kataloğu düzenlediğini bilmiyor. Kontrol tipi alan TİPİNDEN
   * seçiliyor — Check ise anahtar, Select ise açılır liste, Link ise seçici.
   *
   * `Check` alanları 0/1 TAMSAYI olarak taşınır (Frappe böyle döndürür);
   * anahtar `on-value="1"` ile bunu koruyor.
   *
   * YETKİ: yeni kayıt `can.create`, mevcut kayıt `can.write` ister — tek
   * kapı `canEdit`; hem gönder düğmesi hem alanların `disabled`'ı ona bakar.
   *
   * Alan etiketleri, seçenek listeleri ve alt tablo sütunları
   * `catalogMeta.js`'te ÖN-HESAPLANIYOR; burada yalnız render var.
   *
   * GÖRSEL DİL: `views/doctype/DocTypeFormView.vue` referans alındı — başlık
   * bloğu, `hdr-btn-*` düğmeleri, `card` bölüm kartları ve `form-label` /
   * `form-input` alan sarmalı oradan birebir taşındı.
   */
  const props = defineProps({
    catalogKey: { type: String, required: true },
    title: { type: String, required: true },
    /** Düzenlenecek kayıt; boş ise yeni kayıt formu. */
    modelValue: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  const emit = defineEmits(["save", "cancel", "retry"]);

  const { t, te } = useI18n();

  /**
   * Bölümler ve alt tablo sütunları TEK computed'da ön-hesaplanıyor.
   *
   * Etiket/sütun çözümlemesi `catalogMeta.js`'te; burada yalnız reaktif sarma
   * var. Template'ten `fieldLabel(...)` / `childColumns(...)` çağırmak her
   * render'da yeniden çalışırdı ve `ChildTable`'a her seferinde YENİ bir
   * `columns` dizisi giderdi (vue-reactivity §2).
   */
  const sections = computed(() => catalogFieldsToFormSections(props.catalogKey, t, te));

  const childSections = computed(() =>
    Object.keys(getCatalogMeta(props.catalogKey).child_tables ?? {}).map((table) => ({
      table,
      label: childTableLabel(props.catalogKey, table, t, te),
      columns: catalogChildTableColumns(props.catalogKey, table, t, te),
    }))
  );

  const addRowLabel = computed(() => t("logistics.form.addRow"));

  const isNew = computed(() => !props.modelValue?.name);

  /**
   * Yazma kontrollerinin tek kapısı.
   *
   * Yeni kayıt `create`, mevcut kayıt `write` ister — `can.write`'a bakmak,
   * yalnız `create` yetkisi olan bir kullanıcıya "Oluştur" düğmesini
   * gizliyor (ve tersine, yalnız `write` yetkilisine olmayan bir yetkiyi
   * vaat ediyordu). Backend ikisini ayrı veriyor (`doctype_permissions`).
   */
  const canEdit = computed(() => Boolean(isNew.value ? props.can?.create : props.can?.write));

  /** Yeni kayıtta tekil varlık adı ("Yeni lojistik sağlayıcısı"), yoksa kayıt kodu. */
  const headline = computed(() => {
    if (!isNew.value) return props.modelValue.name;
    const key = `logistics.catalogEntity.${props.catalogKey}`;
    return t("docTypeForm.newRecord", { label: te(key) ? t(key) : props.title });
  });

  /**
   * Props'u doğrudan mutasyona uğratma (vue/no-mutating-props) — kopya üzerinde çalış.
   *
   * `toRaw` ŞART: parent reaktif bir nesne veriyorsa `structuredClone` Proxy'yi
   * kopyalayamaz ve `DataCloneError` fırlatır — ekran tamamen boş kalır.
   * Storybook story arg'ları da reaktif sarıldığı için bu yol her zaman sıcak.
   */
  const cloneDoc = (value) => structuredClone(toRaw(value) ?? {});

  const draft = ref(cloneDoc(props.modelValue));
  watch(
    () => props.modelValue,
    (next) => {
      draft.value = cloneDoc(next);
    },
    { deep: true }
  );

  /**
   * Gönderilen yük DRAFT'IN KENDİSİ DEĞİL, sözleşmeye göre süzülmüş kopyası.
   *
   * Draft `get_catalog_item` yanıtından doğuyor ve o yanıt kaydın `name`'ini
   * de içeriyor; ham draft gönderildiğinde backend "yazılamayan alan(lar):
   * name" deyip TÜM kaydı reddediyordu (`catalogWritableFields.js`).
   *
   * Süzme BURADA, container'da değil: yükün formdan çıktığı tek nokta burası
   * — yeni kayıt ve güncelleme aynı kapıdan geçiyor, Storybook'taki `save`
   * dinleyicisi de gerçek yükü görüyor.
   */
  function submit() {
    emit("save", pickWritableValues(props.catalogKey, toRaw(draft.value)));
  }
</script>

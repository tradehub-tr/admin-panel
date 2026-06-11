import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const PRODUCT_TYPE = "Product Type";
const PRODUCT_ATTRIBUTE = "Product Attribute";

const PRODUCT_TYPE_FIELDS = [
  "name",
  "type_code",
  "type_name",
  "type_name_en",
  "is_group",
  "parent_product_type",
  "has_variants_default",
  "is_active",
];

const PRODUCT_ATTRIBUTE_FIELDS = [
  "name",
  "attribute_code",
  "attribute_label",
  "attribute_label_en",
  "data_type",
  "unit_of_measure",
  "is_variant_axis",
  "is_filterable",
  "is_active",
];

/**
 * Taksonomi (Ürün Tipi + Özellik) servis katmanı.
 * — Tekil CRUD: generic doctype API (api.getList/getDoc/createDoc/updateDoc/deleteDoc).
 * — Toplu içe/dışa aktarma: tradehub_core.bulk_import.taxonomy_api endpoint'leri.
 *
 * Her instance kendi state'ini tutar (modul-level değil) — farklı view'lar
 * aynı anda açılırsa state karışmasın.
 */
export function useTaxonomy() {
  const toast = useToast();

  const productTypes = ref([]);
  const attributes = ref([]);
  const loading = ref(false);
  const importing = ref(false);
  const exporting = ref(false);

  async function listProductTypes(filters = {}) {
    loading.value = true;
    try {
      const res = await api.getList(PRODUCT_TYPE, {
        filters,
        fields: PRODUCT_TYPE_FIELDS,
        order_by: "type_code asc",
        limit_page_length: 500,
      });
      productTypes.value = res.data || [];
      return productTypes.value;
    } catch (e) {
      toast.error(e.message || "Ürün tipleri yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function getProductType(name) {
    try {
      const res = await api.getDoc(PRODUCT_TYPE, name);
      return res.data;
    } catch (e) {
      toast.error(e.message || "Ürün tipi detayı alınamadı");
      return null;
    }
  }

  async function saveProductType(payload, name = null) {
    try {
      if (name) {
        await api.updateDoc(PRODUCT_TYPE, name, payload);
        toast.success("Ürün tipi güncellendi");
        return name;
      }
      const res = await api.createDoc(PRODUCT_TYPE, payload);
      toast.success("Ürün tipi oluşturuldu");
      return res.data?.name;
    } catch (e) {
      toast.error(e.message || "Ürün tipi kaydedilemedi");
      throw e;
    }
  }

  async function deleteProductType(name) {
    try {
      await api.deleteDoc(PRODUCT_TYPE, name);
      toast.success("Ürün tipi silindi");
      productTypes.value = productTypes.value.filter((p) => p.name !== name);
    } catch (e) {
      toast.error(e.message || "Ürün tipi silinemedi");
      throw e;
    }
  }

  async function listAttributes(filters = {}) {
    loading.value = true;
    try {
      const res = await api.getList(PRODUCT_ATTRIBUTE, {
        filters,
        fields: PRODUCT_ATTRIBUTE_FIELDS,
        order_by: "attribute_code asc",
        limit_page_length: 500,
      });
      attributes.value = res.data || [];
      return attributes.value;
    } catch (e) {
      toast.error(e.message || "Özellikler yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function getAttribute(name) {
    try {
      const res = await api.getDoc(PRODUCT_ATTRIBUTE, name);
      return res.data;
    } catch (e) {
      toast.error(e.message || "Özellik detayı alınamadı");
      return null;
    }
  }

  async function saveAttribute(payload, name = null) {
    try {
      if (name) {
        await api.updateDoc(PRODUCT_ATTRIBUTE, name, payload);
        toast.success("Özellik güncellendi");
        return name;
      }
      const res = await api.createDoc(PRODUCT_ATTRIBUTE, payload);
      toast.success("Özellik oluşturuldu");
      return res.data?.name;
    } catch (e) {
      toast.error(e.message || "Özellik kaydedilemedi");
      throw e;
    }
  }

  async function deleteAttribute(name) {
    try {
      await api.deleteDoc(PRODUCT_ATTRIBUTE, name);
      toast.success("Özellik silindi");
      attributes.value = attributes.value.filter((a) => a.name !== name);
    } catch (e) {
      toast.error(e.message || "Özellik silinemedi");
      throw e;
    }
  }

  /**
   * Taksonomi JSON dosyasını içe aktar.
   *
   * Backend `upload_taxonomy` dosya içeriğini `form_dict.file` / `.data`
   * alanından **ham JSON metni** olarak okuyup `json.loads` eder — base64
   * değil. Bu yüzden FileReader.readAsText ile düz metin gönderilir.
   * `dry_run` aktifken backend hiçbir yazma yapmaz, sadece rapor döner.
   */
  async function importTaxonomy(file, dryRun = false) {
    if (!file) return null;
    importing.value = true;
    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
        reader.readAsText(file);
      });
      const res = await api.callMethod("tradehub_core.bulk_import.taxonomy_api.upload_taxonomy", {
        data: content,
        dry_run: dryRun ? 1 : 0,
      });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Taksonomi içe aktarılamadı");
      throw e;
    } finally {
      importing.value = false;
    }
  }

  /** Mevcut DB taksonomisini seed şemasına uygun JSON olarak döndür. */
  async function exportTaxonomy() {
    exporting.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.taxonomy_api.export_taxonomy");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Taksonomi dışa aktarılamadı");
      throw e;
    } finally {
      exporting.value = false;
    }
  }

  return {
    productTypes,
    attributes,
    loading,
    importing,
    exporting,
    listProductTypes,
    getProductType,
    saveProductType,
    deleteProductType,
    listAttributes,
    getAttribute,
    saveAttribute,
    deleteAttribute,
    importTaxonomy,
    exportTaxonomy,
  };
}

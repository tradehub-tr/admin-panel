import job from "@/mocks/logistics/import_job.json";

import CsvImportScreen from "./CsvImportScreen.vue";

/**
 * **C3 · CSV toplu içe aktarma** (TUR-107).
 *
 * Dört adımın hepsi ayrı story: sihirbazın her aşaması ayrı bir tasarım
 * kararı taşıyor ve incelemede hepsinin görülmesi gerekiyor.
 */
export default {
  title: "Lojistik/KT2 · Manuel/CSV içe aktarma",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-csv-import",
  component: CsvImportScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const JOB = job.default.data.items[0];

/** Eşlenebilir hedef alanlar — sevkiyat sözleşmesinden. */
const TARGET_FIELDS = [
  { value: "order", label: "Sipariş", required: true },
  { value: "carrier", label: "Taşıyıcı", required: true },
  { value: "carrier_service", label: "Hizmet", required: false },
  { value: "tracking_number", label: "Takip no", required: false },
  { value: "ship_date", label: "Sevk tarihi", required: false },
  { value: "carrier_cost", label: "Taşıyıcı maliyeti", required: false },
  { value: "cost_paid_by", label: "Ödeyen taraf", required: true },
];

export const Upload = {
  name: "1 · Yükle",
  args: { job: {}, targetFields: TARGET_FIELDS },
};

export const Mapping = {
  name: "2 · Eşle",
  args: { job: { ...JOB, status: "mapping" }, targetFields: TARGET_FIELDS },
};

/**
 * Zorunlu alan eşlenmemiş: `cost_paid_by` eşlemeden düşürüldü, uyarı
 * beliriyor. Eksik eşleme ancak uygulama sırasında patlarsa 128 satır
 * yarım yazılırdı.
 */
export const MappingIncomplete = {
  name: "2 · Eşle — zorunlu alan eksik",
  args: {
    job: {
      ...JOB,
      status: "mapping",
      column_mapping: { ...JOB.column_mapping, Tutar: "carrier_cost" },
    },
    targetFields: TARGET_FIELDS,
  },
};

export const Preview = {
  name: "3 · Önizle (4 hatalı satır)",
  args: { job: JOB, targetFields: TARGET_FIELDS },
};

/** Hatasız dosya — hata listesi hiç render edilmiyor. */
export const PreviewClean = {
  name: "3 · Önizle — hatasız",
  args: {
    job: { ...JOB, valid_rows: 128, error_rows: 0, errors: [] },
    targetFields: TARGET_FIELDS,
  },
};

export const Applying = {
  name: "4 · Uygulanıyor",
  args: {
    job: { ...JOB, status: "applying", applied_rows: 62 },
    targetFields: TARGET_FIELDS,
  },
};

/** Kısmi başarı: 124 yazıldı, 4 satır atlandı — özet ikisini de söylüyor. */
export const Completed = {
  name: "4 · Tamamlandı (kısmi)",
  args: {
    job: { ...JOB, status: "completed", applied_rows: 124 },
    targetFields: TARGET_FIELDS,
  },
};

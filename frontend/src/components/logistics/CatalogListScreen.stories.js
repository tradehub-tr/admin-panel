import providers from "@/mocks/logistics/logistics_provider.json";
import branches from "@/mocks/logistics/carrier_branch.json";
import exceptions from "@/mocks/logistics/shipment_exception_code.json";

import CatalogListScreen from "./CatalogListScreen.vue";

/**
 * **M1 · Katalog liste ekranı** — on kataloğu tek bileşen sürer.
 *
 * Sütunlar `_catalog-meta.json`'dan türetiliyor (sözleşmeden üretilmiş);
 * satırlar da sözleşmeden üretilmiş mock fixture'lardan geliyor. Elle
 * yazılmış veri yok — Faz E'de gerçek uca bağlanınca sürpriz çıkmaması için.
 *
 * Aynı bileşenin farklı kataloglarla nasıl göründüğü aşağıdaki story'lerde.
 */
export default {
  title: "Lojistik/KT1 · Katalog/Liste ekranı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-catalog-list",
  component: CatalogListScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const FULL_ACCESS = { read: true, write: true, create: true, delete: true };
const READ_ONLY = { read: true, write: false, create: false, delete: false };

export const Default = {
  name: "Sağlayıcılar (dolu)",
  args: {
    catalogKey: "logistics_provider",
    title: "Lojistik Sağlayıcılar",
    rows: providers.default.data.items,
    total: providers.default.data.total,
    can: FULL_ACCESS,
  },
};

/** Aynı bileşen, farklı katalog — sütunlar sözleşmeden geldiği için değişiyor. */
export const CarrierBranches = {
  name: "Taşıyıcı şubeleri (aynı bileşen)",
  args: {
    catalogKey: "carrier_branch",
    title: "Taşıyıcı Şubeleri",
    rows: branches.default.data.items,
    total: branches.default.data.total,
    can: FULL_ACCESS,
  },
};

export const ExceptionCodes = {
  name: "İstisna kodları (aynı bileşen)",
  args: {
    catalogKey: "shipment_exception_code",
    title: "İstisna Kodları",
    rows: exceptions.default.data.items,
    total: exceptions.default.data.total,
    can: FULL_ACCESS,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, rows: [], total: 0, loading: true },
};

/** Hiç kayıt yok — kullanıcı kayıt oluşturmak ister. */
export const Empty = {
  name: "Boş",
  args: { ...Default.args, rows: [], total: 0 },
};

/**
 * Yetki hatası. "Yeniden dene" butonu YOK — yetki yeniden denemekle düzelmez.
 */
export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    ...Default.args,
    rows: [],
    total: 0,
    error: { code: "PERMISSION_DENIED", message: "Bu kataloğu görüntüleme yetkiniz yok." },
  },
};

/** Özellik kapalı — kırmızı değil mavi, çünkü bu bir hata değil bir durum. */
export const FeatureDisabled = {
  name: "Hata · özellik kapalı",
  args: {
    ...Default.args,
    rows: [],
    total: 0,
    error: {
      code: "FEATURE_DISABLED",
      message: "Bu lojistik özelliği henüz aktif değil: logistics_enabled",
    },
  },
};

/** Sunucu hatası — bunda yeniden deneme anlamlı. */
export const ServerError = {
  name: "Hata · sunucu",
  args: {
    ...Default.args,
    rows: [],
    total: 0,
    error: { code: "INTERNAL_ERROR", message: "Beklenmeyen bir hata oluştu. Kayıt altına alındı." },
  },
};

/**
 * Yalnız okuma yetkisi (Logistics Operator). "Yeni kayıt" butonu HİÇ
 * render edilmiyor — disabled bırakmak "yapabilirim ama şu an olmaz" der,
 * oysa yetki yok.
 */
export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: READ_ONLY },
};

/** Toplu seçim aktif — alt çubuk beliriyor. */
export const WithSelection = {
  name: "Toplu seçim",
  args: { ...Default.args, selection: ["YK", "AK", "MNG"] },
};

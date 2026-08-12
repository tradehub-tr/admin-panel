import providers from "@/mocks/logistics/logistics_provider.json";

import CatalogFormScreen from "./CatalogFormScreen.vue";

/**
 * **M2 · Katalog form ekranı** — liste ekranıyla aynı mantık: alanlar ve
 * tipleri sözleşmeden geliyor, ekran hangi kataloğu düzenlediğini bilmiyor.
 *
 * Kontrol tipi alan TİPİNDEN seçiliyor: `Check` → anahtar, `choices` → açılır
 * liste, `Link` → seçici, `Small Text` → çok satırlı. Yeni bir alan
 * sözleşmeye eklendiğinde bu ekranda kod değişikliği gerekmiyor.
 */
export default {
  title: "Lojistik/KT1 · Katalog/Form ekranı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-catalog-form",
  component: CatalogFormScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const FULL_ACCESS = { read: true, write: true, create: true, delete: true };
const READ_ONLY = { read: true, write: false, create: false, delete: false };

const EXISTING_PROVIDER = providers.default.data.items[0];

export const Default = {
  name: "Mevcut kaydı düzenle",
  args: {
    catalogKey: "logistics_provider",
    title: "Lojistik Sağlayıcı",
    modelValue: EXISTING_PROVIDER,
    can: FULL_ACCESS,
  },
};

/** Yeni kayıt: "Yeni kayıt" rozeti görünür, alanlar boş. */
export const NewRecord = {
  name: "Yeni kayıt",
  args: {
    catalogKey: "logistics_provider",
    title: "Lojistik Sağlayıcı",
    modelValue: {},
    can: FULL_ACCESS,
  },
};

/** Kaydetme sürüyor — buton devre dışı ve metni değişiyor. */
export const Saving = {
  name: "Kaydediliyor",
  args: { ...Default.args, saving: true },
};

/**
 * Yazma yetkisi yok: Kaydet butonu HİÇ render edilmiyor, alanlar devre dışı.
 * Formu tamamen gizlemek yerine okunur bırakmak bilinçli — operatör kaydı
 * görmeli, sadece değiştirememeli.
 */
export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: READ_ONLY },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, loading: true },
};

export const SaveError = {
  name: "Hata · kaydetme başarısız",
  args: {
    ...Default.args,
    error: {
      code: "VALIDATION_ERROR",
      message: "Sağlayıcı kodu zaten kullanılıyor: YK",
    },
  },
};

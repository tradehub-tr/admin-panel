import { fn } from "storybook/test";

import methods from "@/mocks/logistics/shipping_method.json";
import providers from "@/mocks/logistics/logistics_provider.json";

import CatalogFormScreen from "./CatalogFormScreen.vue";

/**
 * **M2 · Katalog form ekranı** — liste ekranıyla aynı mantık: alanlar ve
 * tipleri sözleşmeden geliyor, ekran hangi kataloğu düzenlediğini bilmiyor.
 *
 * Kontrol tipi alan TİPİNDEN seçiliyor: `Check` → anahtar, `choices` → açılır
 * liste, `Link` → seçici, `Small Text` → çok satırlı. Yeni bir alan
 * sözleşmeye eklendiğinde bu ekranda kod değişikliği gerekmiyor.
 *
 * Görsel dil `views/doctype/DocTypeFormView.vue` ile hizalı: geri oku +
 * başlık bloğu, `hdr-btn-*` düğmeleri, `card` bölüm kartları, `form-label` /
 * `form-input` alanlar.
 */
export default {
  title: "Lojistik/KT1 · Katalog/Form ekranı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-catalog-form",
  component: CatalogFormScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    can: {
      description: "`store.catalogCan(catalogKey)` çıktısı: {read, write, create, delete}",
    },
  },
  // Vue 3'te `emit("save")` bileşene `onSave` prop'u olarak ulaşır; story
  // yakalayıcısı da o adla ARG verilmeli. `argTypes: { save: { action } }`
  // hiçbir şeye bağlanmıyordu ve Actions paneli boş kalıyordu.
  args: {
    onSave: fn(),
    onCancel: fn(),
    onRetry: fn(),
  },
};

const FULL_ACCESS = { read: true, write: true, create: true, delete: true };
const READ_ONLY = { read: true, write: false, create: false, delete: false };

const EXISTING_PROVIDER = providers.default.data.items[0];

export const Default = {
  name: "Mevcut kaydı düzenle",
  args: {
    catalogKey: "logistics_provider",
    title: "Lojistik Sağlayıcılar",
    modelValue: EXISTING_PROVIDER,
    can: FULL_ACCESS,
  },
};

/** Yeni kayıt: başlık "Yeni lojistik sağlayıcısı" olur, alanlar boş. */
export const NewRecord = {
  name: "Yeni kayıt",
  args: {
    catalogKey: "logistics_provider",
    title: "Lojistik Sağlayıcılar",
    modelValue: {},
    can: FULL_ACCESS,
  },
};

/**
 * Alt tablosu olan katalog — `carrier_services` kendi kartında çizilir.
 *
 * `get_catalog_item` tam dokümanı döndürüyor (alt tablolar dahil); liste
 * fixture'ı yalnız liste alanlarını taşıdığı için alt tablo satırları burada
 * sözleşmedeki alan adlarıyla ekleniyor.
 */
export const WithChildTable = {
  name: "Alt tablolu katalog",
  args: {
    catalogKey: "shipping_method",
    title: "Sevkiyat Yöntemleri",
    modelValue: {
      ...methods.default.data.items[0],
      carrier_services: [
        {
          carrier_service: "YK-STD",
          service_name: "Yurtiçi Standart",
          priority: 1,
          is_preferred: 1,
        },
        { carrier_service: "AK-STD", service_name: "Aras Standart", priority: 2, is_preferred: 0 },
      ],
    },
    can: FULL_ACCESS,
  },
};

/** Kaydetme sürüyor — buton devre dışı ve ikonu dönüyor. */
export const Saving = {
  name: "Kaydediliyor",
  args: { ...Default.args, saving: true },
};

/**
 * Yazma yetkisi yok: Kaydet butonu yerine "salt okunur görünüm" metni çıkar,
 * alanlar devre dışı. Formu tamamen gizlemek yerine okunur bırakmak bilinçli —
 * operatör kaydı görmeli, sadece değiştirememeli.
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

import accounts from "@/mocks/logistics/carrier_account.json";

import CarrierAccountScreen from "./CarrierAccountScreen.vue";

/**
 * **F1 · Taşıyıcı hesapları** (TUR-110, TUR-111).
 *
 * Mock veri gizli DEĞER taşımıyor — yalnız `has_api_key` gibi bayraklar.
 * Bu bilinçli: fixture'a örnek bir `api_secret` koymak ekranın onu
 * göstermesini normalleştirir, sözleşmedeki sınır aşınırdı.
 */
export default {
  title: "Lojistik/KT2 · Taşıyıcı/Hesaplar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-carrier-accounts",
  component: CarrierAccountScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = accounts.default.data.items;
const NOW = "2026-08-12 12:00:00";

const MANAGER = { read: true, manage: true, viewSecret: true };
const OPERATOR = { read: true, manage: false, viewSecret: false };

export const Default = {
  name: "Yönetici (göster yetkisi var)",
  args: { rows: ROWS, now: NOW, can: MANAGER },
};

/**
 * `view.carrier_secret` yetkisi yok: "Göster" bağlantısı HİÇ render
 * edilmiyor. "•••••" yine görünüyor — hangi kimlik bilgisinin tanımlı
 * olduğunu bilmek yetki gerektirmiyor, değerini okumak gerektiriyor.
 */
export const NoSecretPermission = {
  name: "Yetki · gizli alan görüntülenemez",
  args: { rows: ROWS, now: NOW, can: { read: true, manage: true, viewSecret: false } },
};

export const OperatorRole = {
  name: "Rol · operatör",
  args: { rows: ROWS, now: NOW, can: OPERATOR },
};

/** Süresi geçmiş token kırmızı — sessiz kalırsa entegrasyon sessizce ölür. */
export const ExpiredToken = {
  name: "Token süresi geçmiş",
  args: {
    rows: [{ ...ROWS[0], token_expiry: "2026-08-01 00:00:00" }],
    now: NOW,
    can: MANAGER,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], can: MANAGER },
};

/** Kimlik bilgisi yönetme yetkisi yok — liste hiç gelmiyor. */
export const CapabilityError = {
  name: "Hata · yetenek gerekli",
  args: { rows: [], error: accounts.error.error },
};

import accounts from "@/mocks/logistics/carrier_account.json";

import CarrierAccountScreen from "./CarrierAccountScreen.vue";

/**
 * **F1 · Taşıyıcı hesapları** (TUR-110, TUR-111).
 *
 * Mock veri gizli DEĞER taşımıyor — yalnız `has_api_key` gibi bayraklar.
 * Bu bilinçli: fixture'a örnek bir `api_secret` koymak ekranın onu
 * göstermesini normalleştirir, sözleşmedeki sınır aşınırdı.
 *
 * Ekran panel diline hizalandı (AD-14): başlık `text-[15px] font-bold`,
 * butonlar `hdr-btn-*`, satırlar `card`. Alan adları (`api_secret`) artık
 * `logistics.secretField.*` üzerinden okunur ad olarak basılıyor; ham ad
 * yalnız `title` attribute'unda kalıyor.
 *
 * EYLEM BUTONLARI VARSAYILAN KAPALI (`canCreate`/`canEdit`/`canTest`):
 * uygulamada container üçünü de `false` geçiyor çünkü emit'leri dinleyen
 * kod yok — hesap formu ekranı yazılmadı, F2 bağlantı testi `ready: false`.
 * Tasarımın tam hâli `WithActions` story'sinde duruyor.
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
  args: { rows: ROWS, now: NOW, can: MANAGER, page: 1, pageSize: 50, total: ROWS.length },
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

/**
 * Uçlar geldiğinde görünecek hâl: "Yeni hesap", "Düzenle" ve "Bağlantıyı
 * test et" açık. Uygulamada bugün çizilmiyorlar (bkz. dosya başlığı); bu
 * story tasarımın kaybolmaması için duruyor.
 */
export const WithActions = {
  name: "Eylemler açık (uçlar geldiğinde)",
  args: {
    rows: ROWS,
    now: NOW,
    can: MANAGER,
    canCreate: true,
    canEdit: true,
    canTest: true,
  },
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

/**
 * Sayfalayıcı: `list_carrier_accounts` sayfa başına 50 kayıt döndürüyor.
 * Sayfalayıcı olmadan 51. hesap sessizce kaybolurdu — bu story sınırın
 * görünür olduğunu doğruluyor (toplam sayfa boyutundan büyük).
 */
export const Paginated = {
  name: "Sayfalı liste",
  args: { rows: ROWS, now: NOW, can: MANAGER, page: 2, pageSize: 2, total: 6 },
};

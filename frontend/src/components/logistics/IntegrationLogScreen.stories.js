import logs from "@/mocks/logistics/integration_log.json";

import IntegrationLogScreen from "./IntegrationLogScreen.vue";

/**
 * **F3 · Entegrasyon logu** (TUR-110).
 *
 * Fixture'daki `request_body` alanları `***MASKELİ***` içeriyor — bu, mock
 * verinin sözleşmedeki maskeleme sınırını taklit etmesi. Gerçek maskeleme
 * backend'de yapılıyor; ekran maskeleme YAPMIYOR, yapamaz da.
 */
export default {
  title: "Lojistik/KT2 · Taşıyıcı/Entegrasyon logu",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-integration-log",
  component: IntegrationLogScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = logs.default.data.items;

export const Default = {
  name: "Karışık kayıtlar",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/**
 * Yeniden denenemez bir hata: taşıyıcı isteği kalıcı olarak reddetti.
 * "Yeniden çalıştır" butonu YOK — tekrar denemek taşıyıcıya gereksiz yük.
 */
export const NotRetriable = {
  name: "Yeniden denenemez hata",
  args: {
    rows: [{ ...ROWS[1], is_retriable: 0, error_code: "INVALID_ADDRESS" }],
    can: { read: true, write: true },
  },
};

/** Hepsi başarılı — hata rengi ve yeniden çalıştır butonu yok. */
export const AllSucceeded = {
  name: "Hatasız",
  args: {
    rows: ROWS.map((row) => ({
      ...row,
      succeeded: 1,
      http_status: 200,
      error_code: null,
      error_message: null,
    })),
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: logs.error.error },
};

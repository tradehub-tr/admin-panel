import ConfirmDialog from "./ConfirmDialog.vue";

/**
 * Onay diyaloğu. Başlık ve buton etiketleri verilmezse i18n'den gelir
 * (`confirmDialog.*`), bu yüzden dil değiştiricinin çalıştığını da gösterir.
 *
 * `tone` görsel şiddeti belirler: `primary` bilgi, `warning` uyarı,
 * `danger` geri alınamaz işlem.
 */
export default {
  title: "Ortak/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "select", options: ["primary", "warning", "danger"] },
    open: { control: "boolean" },
  },
  args: { open: true },
};

export const Default = {
  name: "Varsayılan (i18n)",
  args: {
    // Başlık ve butonlar bilinçli olarak BOŞ — çeviriden gelmeli.
    // Araç çubuğundan dil değiştirince metinlerin değişmesi beklenir.
    message: "Bu kaydı pasifleştirmek istediğinize emin misiniz?",
  },
};

export const Danger = {
  name: "Tehlikeli işlem",
  args: {
    tone: "danger",
    title: "Taşıyıcı hesabını sil",
    message:
      "Bu hesaba bağlı kimlik bilgileri kalıcı olarak silinecek. Bu işlem geri alınamaz.",
    confirmLabel: "Kalıcı olarak sil",
  },
};

export const Warning = {
  name: "Uyarı",
  args: {
    tone: "warning",
    title: "Kanal kopyası yöntem",
    message:
      "Bu kargo yöntemi bir işletim kanalıyla aynı adı taşıyor. Devam etmek istiyor musunuz?",
  },
};

/** Uzun metnin diyalog kutusunu taşırmadığını doğrular. */
export const LongMessage = {
  name: "Uzun metin",
  args: {
    tone: "warning",
    title: "Servis kapsama alanı çakışması",
    message:
      "Seçtiğiniz il/ilçe için aynı taşıyıcı ve servis kombinasyonunda zaten bir kapsama alanı tanımlı. " +
      "Kaydetmeye devam ederseniz mevcut tanım korunur ve yeni kayıt oluşturulmaz. " +
      "Farklı bir posta kodu aralığı tanımlamak istiyorsanız önce mevcut kaydı düzenleyin.",
  },
};

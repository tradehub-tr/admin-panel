// `alphaToJpeg` uyarısının yolunu canlı tutan test yardımcısı.
//
// 18 Eyl 2026'da (tradehub_core 8b099d6) tüm slotlar yalnız AVIF üretmeye geçti; AVIF saydamlığı
// taşıdığı için bugünkü katalogda uyarı HİÇBİR slotta üretilmiyor — bu doğru davranış. Uyarının
// kodu ise JPEG'e dönen ilk profil için duruyor; testler onu bu yardımcıyla, katalogda bir profili
// geçici olarak JPEG'e çevirerek sınar (MOGEM-685 bulgu 16).
import { SLOTS } from "../slotProfiles.js";

export function jpegProfilliyken(slotKey, profilAdi, fn) {
  const profil = SLOTS.find((s) => s.slotKey === slotKey)?.profiles.find(
    (p) => p.name === profilAdi
  );
  if (!profil) throw new Error(`katalogda yok: ${slotKey} · ${profilAdi}`);
  const eski = profil.formats;
  profil.formats = ["jpeg"];
  try {
    return fn();
  } finally {
    profil.formats = eski;
  }
}

import { ref } from "vue";

import { toScreenError } from "@/api/logisticsEnvelope";
import { createManualShipment } from "@/api/shipmentCreate";
import { newIdempotencyKey } from "@/lib/media/upload/session";

/**
 * C1 kaydetme akışı — yeniden-giriş kilidi + idempotency anahtarı yaşam
 * döngüsü.
 *
 * ANAHTAR SÖZLEŞMESİ (06-BE, api/shipmentCreate.js): anahtar İLK save
 * denemesinde üretilir, hata sonrası tekrarda AYNI kalır (backend aynı
 * anahtarla yeni kayıt açmaz), başarıda sıfırlanır (yeni form = yeni kayıt).
 * `manual-` öneki korunur; sözleşme biçim kısıtı koymuyor, anahtar opaktır.
 *
 * UUID, timestamp DEĞİL (denetim 2026-09-04): `Date.now()` iki farklı
 * kullanıcı/sekmede aynı milisaniyede çakışabilir ve sunucu ikinci taslağı
 * "aynı istek" sanıp yutar. Üretim `newIdempotencyKey`'e devredildi
 * (REFACTOR-BEFORE-WRITE, doğrulama turu 2026-09-04): çıplak
 * `crypto.randomUUID()` güvensiz origin'de (http + LAN IP) YOKTUR ve senkron
 * TypeError `saving`'i açık bırakıp formu kalıcı kilitliyordu — yardımcı
 * `getRandomValues` ve zaman+rastgele yedekleriyle hiç fırlatmıyor; üretim
 * yine de try İÇİNDE ki beklenmedik bir hata da kilidi `finally`'de çözsün.
 *
 * NEDEN SFC DIŞINDA: `node --test` SFC'yi yalnız SSR derlemesiyle
 * yükleyebiliyor ve `permsReady` kapısı SSR'de hiç açılmıyor — akış SFC
 * içinde kalsaydı davranışı test edilemezdi. Davranış testi:
 * `__tests__/manualShipmentSave.test.js`.
 */
export function useManualShipmentSave({ onCreated } = {}) {
  const saving = ref(false);
  const saveError = ref(null);

  let idempotencyKey = null;

  /**
   * Taslağı kaydeder.
   *
   * @param {object} payload Formdan gelen, sözleşmeye süzülmüş alanlar.
   * @returns {Promise<boolean>} Kayıt (ve `onCreated`) başarılıysa `true`.
   */
  async function save(payload) {
    // Yeniden-giriş kilidi (E2E denetimi 2026-09-03): `saving` disabled'ı
    // DOM'a inmeden aynı karede gelen ikinci tıklama ikinci isteği
    // başlatabiliyordu — iki taslak, iki toast. Idempotency anahtarı
    // sözleşmenin sunucu tarafı sigortası; bu kilit istemcideki ilk kapı.
    if (saving.value) return false;
    saving.value = true;
    saveError.value = null;
    try {
      idempotencyKey ??= `manual-${newIdempotencyKey()}`;
      const created = await createManualShipment({ ...payload, idempotency_key: idempotencyKey });
      idempotencyKey = null;
      // Başarı işleri (toast, yönlendirme) try İÇİNDE: hata verirlerse
      // kullanıcı sessiz bir hiçlik değil saveError ekranı görür.
      await onCreated?.(created);
      return true;
    } catch (e) {
      saveError.value = toScreenError(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { saving, saveError, save };
}

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
        @click.self="$emit('cancel')"
        @keydown.esc="$emit('cancel')"
        @keydown.tab="trapTab"
      >
        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 :id="titleId" class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ t("logistics.exception.resolveTitle") }}
          </h3>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {{ exception?.exception_label || exception?.exception_code }} ·
            <span class="font-mono">{{ exception?.shipment }}</span>
          </p>

          <label class="mt-4 block">
            <span class="form-label">{{ t("logistics.exception.resolveNoteLabel") }} *</span>
            <!-- Odak açılış watch'ında veriliyor (autofocus attribute'u yerine):
                 dialog Transition ile sonradan mount oluyor ve odak yönetimi
                 kapanışta iade ile birlikte tek yerde durmalı. -->
            <textarea
              ref="noteRef"
              v-model="note"
              rows="3"
              class="form-input resize-y"
              aria-required="true"
              :aria-invalid="showRequired ? 'true' : undefined"
              :aria-describedby="showRequired ? errorId : undefined"
              :placeholder="t('logistics.exception.resolveNotePlaceholder')"
            ></textarea>
          </label>
          <!-- TUR-113: çözüm notu zorunlu; asıl doğrulama backend'de
               (VALIDATION_FAILED), buradaki ön katman. Hata metni id'li:
               textarea `aria-invalid` + `aria-describedby` ile buna
               bağlanıyor (WCAG 3.3.1) ve alan `aria-required` ile
               zorunluluğunu daha DOLDURULMADAN ilan ediyor. -->
          <p
            v-if="showRequired"
            :id="errorId"
            class="mt-1 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            {{ t("logistics.exception.resolveNoteRequired") }}
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
              {{ t("logistics.form.cancel") }}
            </button>
            <!-- Buton notsuzken de AKTİF (WCAG denetimi 2026-08-24).
                 Eskiden `!note.trim()` de pasifleştiriyordu; sonuç, yukarıdaki
                 hata metninin ASLA görünememesiydi — submit'e hiç gelinemiyor,
                 kullanıcıya butonun neden çalışmadığı da söylenmiyordu (WCAG
                 3.3.1: hata görünür ve metinle açıklanmalı). Artık tıklanır,
                 doğrulama submit'te çalışır ve odak eksik alana gider. -->
            <button type="button" class="hdr-btn-primary" :disabled="saving" @click="submit">
              {{ saving ? t("logistics.form.saving") : t("logistics.exception.resolve") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { computed, nextTick, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import { restoreFocus, trapTabKey } from "@/components/common/focusTrap";

  /**
   * **A3 · Çözüm notu diyalogu** — istisna kapatma TUR-113 gereği not ister.
   *
   * Ekran-yerel bileşen (`exceptions/components/`): başka ekranın not
   * toplama ihtiyacı doğarsa ortak `components/common`'a terfi ettirilir,
   * önceden genelleştirilmez.
   *
   * Dialog erişilebilirliği (WCAG 2.1.2 / 2.4.3 / 4.1.2) ConfirmDialog ile
   * aynı desen: role="dialog" + aria-modal + aria-labelledby, açılışta odak
   * not alanına girer, Tab panel içinde döner, Esc iptal eder, kapanışta
   * odak diyaloğu açan tetikleyiciye — o DOM'dan kalktıysa ana içeriğe —
   * geri verilir. Tuzak ve iade ortak `components/common/focusTrap`ten;
   * bu dosyada YEREL kopya YOK.
   */
  const props = defineProps({
    open: { type: Boolean, default: false },
    exception: { type: Object, default: null },
    saving: { type: Boolean, default: false },
  });

  const emit = defineEmits(["confirm", "cancel"]);

  const { t } = useI18n();

  const note = ref("");

  /**
   * Doğrulama SUBMIT'ten sonra konuşur, yazarken susar.
   *
   * Hata metni ve `aria-invalid` bu türetilmiş değere bağlı: kullanıcı notu
   * yazmaya başlayınca kendiliğinden temizlenir. Ham bir `ref` olsaydı alan
   * dolduktan sonra da "zorunlu" kalır, ekran okuyucu geçerli bir alanı
   * hatalı okurdu.
   */
  const submitAttempted = ref(false);
  const showRequired = computed(() => submitAttempted.value && !note.value.trim());

  const titleId = useId();
  const errorId = useId();
  const panelRef = ref(null);
  const noteRef = ref(null);
  let lastActive = null;

  /**
   * Odak tuzağı ORTAK yardımcıdan (`components/common/focusTrap`).
   *
   * Yerel kopyalar 2026-08-25'te birleştirildi. Ayrışma teorik değildi,
   * ÖLÇÜLDÜ: buradaki seçici dizesi ortak `FOCUSABLE_SELECTOR`daki
   * `[contenteditable]:not([contenteditable="false"])` dalını İÇERMİYORDU
   * (zengin metin alanı eklenen ilk gün tuzak sızdıracaktı) ve yerel
   * `restoreFocus` ortak sürümdeki `typeof target.focus === "function"`
   * kontrolünü taşımıyordu. Ortak sürüm ayrıca kopmuş tetikleyicide ana
   * içeriğe (`AppLayout` `<main tabindex="-1">`) düşme kuralını da taşıyor —
   * o senaryo burada KESİN yaşanıyor: "Çözümle" butonu
   * `ExceptionQueueScreen`de `v-if="can.write && !row.resolved_at"` ile
   * çiziliyor, yani başarılı çözümden sonra unmount oluyor.
   */
  const trapTab = (e) => trapTabKey(e, panelRef.value);

  // Her açılışta temiz not — önceki istisnanın notu yeni kayda sızmasın.
  // Aynı watch odak yönetimini de taşıyor: tek açılış/kapanış kapısı.
  watch(
    () => props.open,
    async (isOpen) => {
      if (isOpen) {
        note.value = "";
        submitAttempted.value = false;
        lastActive = document.activeElement;
        await nextTick();
        noteRef.value?.focus();
        return;
      }
      restoreFocus(lastActive);
      lastActive = null;
    }
  );

  async function submit() {
    if (!note.value.trim()) {
      submitAttempted.value = true;
      // Hata metni DOM'a girdikten sonra odağı alana taşı: ekran okuyucu
      // `aria-describedby` üzerinden gerekçeyi okusun (WCAG 3.3.1).
      await nextTick();
      noteRef.value?.focus();
      return;
    }
    emit("confirm", note.value.trim());
  }
</script>

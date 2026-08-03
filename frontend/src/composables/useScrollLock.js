import { onScopeDispose, toValue, watch } from "vue";

/**
 * Tam ekran katman (drawer / sheet / modal) açıkken arka planın kaymasını
 * engeller.
 *
 * `document.body.style.overflow` bu uygulamada işe YARAMIYOR: kabuk
 * (`AppLayout`) `h-full overflow-hidden`, gerçek kaydırma kabı
 * `.app-content-col` kolonu. Kilit oraya uygulanır; element `scrollTop`'unu
 * koruduğu için katman kapanınca kullanıcı aynı yerde kalır.
 *
 * Aynı anda birden fazla katman açık olabilir (filtre drawer'ı + seçici modal);
 * bu yüzden sayaçla yönetilir — biri kapanınca kilit erkenden kalkmaz.
 */
let locks = 0;

function apply() {
  const el = document.querySelector(".app-content-col");
  if (el) el.style.overflow = locks > 0 ? "hidden" : "";
}

/**
 * @param {import("vue").Ref<boolean>|(() => boolean)|boolean} source
 *   Katman açık mı — ref, getter veya sabit.
 */
export function useScrollLock(source) {
  let held = false;

  function set(on) {
    if (on === held) return;
    held = on;
    locks += on ? 1 : -1;
    apply();
  }

  watch(() => Boolean(toValue(source)), set, { immediate: true });
  onScopeDispose(() => set(false));

  return { set };
}

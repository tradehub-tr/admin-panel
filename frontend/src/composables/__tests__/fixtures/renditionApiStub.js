/**
 * `@/utils/api` sahtesi — `mediaRenditions.test.js` Vite alias'ıyla takar.
 *
 * `getList` BİLE BİLE patlar: türev verisi artık toplu uçtan
 * (`media_manifest.manifest_batch`) geliyor; composable herhangi bir yoldan
 * eski 2 adımlı REST'e (`Media Asset` → `Media Rendition`) geri düşerse bu
 * stub testi anında kırar. "Tek tek istek atılmıyor" iddiası böyle ölçülür,
 * yorumla değil.
 */

/** Atılan HER istek — tür, ad ve argümanlarıyla. Testler sayar ve ayıklar. */
export const calls = [];

let handler = async () => ({ message: { manifests: {} } });

/** Testler arası sıfırlama. */
export function reset() {
  calls.length = 0;
  handler = async () => ({ message: { manifests: {} } });
}

/** Bir sonraki `callMethod` yanıtını (ya da fırlatacağı hatayı) kurar. */
export function respondWith(fn) {
  handler = fn;
}

export default {
  async callMethod(method, args) {
    calls.push({ kind: "callMethod", method, args });
    return handler(method, args);
  },
  async callMethodGET(method, args) {
    calls.push({ kind: "callMethodGET", method, args });
    throw new Error("callMethodGET beklenmiyordu — toplu uç POST ile çağrılır");
  },
  async getList(doctype, params) {
    calls.push({ kind: "getList", doctype, params });
    throw new Error(
      "getList çağrılmamalıydı — türev verisi toplu uçtan gelir; bu çağrı N+1'i geri getirir"
    );
  },
};

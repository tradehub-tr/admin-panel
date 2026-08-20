/**
 * `@/utils/api` sahtesi — kuyruk testinde ağ yok.
 *
 * Gerçek `api.js` `fetch` ve `localStorage`'a dokunuyor; Node koşucusunda
 * ikisi de yükleme kuyruğunun sınadığı şeyle ilgisiz. Yanıt ŞEKLİ gerçeğiyle
 * aynı tutuluyor (`{message: …}`), yoksa test yalan söylerdi: kuyruk yeşil
 * yanar, gerçek sunucuya bağlanınca zarf açılamadığı için boş döner.
 */

const cagrilar = [];
let davranis = {};

export function __reset(yeni = {}) {
  cagrilar.length = 0;
  davranis = yeni;
}

export function __calls() {
  return cagrilar.slice();
}

function cek(method, args) {
  const kisa = method.split(".").pop();
  cagrilar.push({ method: kisa, args });
  const f = davranis[kisa];
  if (!f) throw new Error(`apiStub: ${kisa} tanımsız`);
  return Promise.resolve(f(args)).then((m) => ({ message: m }));
}

export default {
  callMethod: (m, a) => cek(m, a),
  callMethodGET: (m, a) => cek(m, a),
};

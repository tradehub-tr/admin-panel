/**
 * Politika motorunun paneldeki TEK giriş kapısı (T-033 TS ikizi).
 *
 * SÖZ: bu motor KARAR VERMEZ, karar HIZLANDIRIR — son söz sunucunun
 * (`upload_policy.check` + Python PolicyEngine). Buradaki değerlendirme,
 * kullanıcıyı 80 MB'lık bir yüklemenin sonunda reddedilmekten kurtaran ön
 * izlenimdir ve sunucunun kararıyla asla çelişmemesi her `npm test`'te
 * 393 parite vektörüyle ölçülür (`__tests__/policyEngineParity.test.js`).
 *
 * Motorun kendisi `engine.ts`te yazılıdır; koşan kopya tipleri silinmiş
 * `vendor/engine.js`tir (crop zincirindeki gerekçe: Node 20'de tip soyma yok).
 * Politikalar `vendor/slot_policies.js`ten gelir — Python'ın okuduğu 9 slot
 * JSON'unun HAM kopyası. `upload/vendor/slotPolicy.js` (ön kontrolün damıtılmış
 * alt kümesi) AYRI bir vendor'dır ve bu modül ona dokunmaz.
 *
 * Kullanım:
 *   import { evaluate } from "@/lib/media/policy";
 *   const karar = evaluate("product.image", { extension: ".jpg", width, height, ... }, "seller");
 *   if (!karar.allow) karar.violations.forEach((v) => console.warn(v.code, v.message.tr));
 */
import {
  PolicyEngine,
  PolicyNotFoundError,
  pyRound,
  pyFixed,
  parseRatio,
} from "./vendor/engine.js";
import SLOT_POLICIES, { FLOAT_REPRS } from "./vendor/slot_policies.js";

let _engine = null;

/** Vendor'lanmış 9 slot politikasıyla kurulmuş varsayılan motor (tek örnek). */
export function defaultPolicyEngine() {
  if (!_engine) _engine = new PolicyEngine(SLOT_POLICIES, { floatReprs: FLOAT_REPRS });
  return _engine;
}

/** Kısayol — `defaultPolicyEngine().evaluate(...)`. */
export function evaluate(slot, probe, role = "") {
  return defaultPolicyEngine().evaluate(slot, probe, role);
}

export {
  PolicyEngine,
  PolicyNotFoundError,
  pyRound,
  pyFixed,
  parseRatio,
  SLOT_POLICIES,
  FLOAT_REPRS,
};

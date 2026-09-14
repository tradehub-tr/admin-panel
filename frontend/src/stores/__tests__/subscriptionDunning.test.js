import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * AD-1 — dunning hoşgörü penceresi store sözleşmesi (BE-4 additive alanlar).
 *
 *   ÖLÇÜLÜR  — past_due artık OK-şekilli yanıttır: isLocked=false,
 *              hasSubscription=true (İSTENEN davranış — panel paywall'a
 *              düşmez) ve additive alanların (in_dunning / dunning_grace_end /
 *              suspended_at / dunning_expire_at / expired_cause) getter'lara
 *              doğru aktığı; alanlar yokken getter'ların geriye uyumlu
 *              varsayılanları (false/null).
 *   ÖLÇÜLMEZ — gerçek backend (BE-4 sözleşmesinden kopyalanmış sahte
 *              yanıtlar), banner/gate render'ı (kendi Node render testleri).
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const STUB = "/src/stores/__tests__/fixtures/subscriptionApiStub.js";

// Zaman-bombası denetimi gereği gelecek tarih SABİT yazılamaz; koşuma göre
// ileri tarihler hesaplanır (assertion'lar tarih metnine bağlı değil).
const gunSonra = (n) => `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

let server;
let subscriptionModule;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        { find: /^@\/utils\/api$/, replacement: `${frontendRoot}/src${STUB.slice(4)}` },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  subscriptionModule = await server.ssrLoadModule("/src/stores/subscription.js");
});

after(async () => {
  await server?.close();
  delete globalThis.__subApiCallMock;
  delete globalThis.__subApiGetMock;
});

function freshStore(accessState) {
  setActivePinia(createPinia());
  globalThis.__subApiGetMock = () => ({ message: accessState ?? null });
  return subscriptionModule.useSubscriptionStore();
}

beforeEach(() => {
  delete globalThis.__subApiCallMock;
  delete globalThis.__subApiGetMock;
});

test("past_due OK-şekilli döner: kilitlemez, in_dunning + dunning_grace_end getter'lara akar", async () => {
  const graceEnd = gunSonra(10);
  const store = freshStore({
    access: "ok",
    status: "past_due",
    plan: "PRO",
    current_period_end: "2026-09-01 00:00:00",
    billing_cycle: "yearly",
    cancel_at_period_end: 0,
    is_trial: false,
    in_dunning: 1,
    dunning_grace_end: graceEnd,
  });
  await store.fetchAccessState();

  assert.equal(store.isLocked, false, "past_due paneli KİLİTLEMEZ (yeni sözleşme)");
  assert.equal(store.hasSubscription, true, "hoşgörü penceresinde abonelik kullanılabilir sayılır");
  assert.equal(store.subStatus, "past_due");
  assert.equal(store.inDunning, true);
  assert.equal(store.dunningGraceEnd, graceEnd);
  assert.equal(store.isTrial, false);
  // Suspended/expired alanları bu yanıtta yok — geriye uyumlu varsayılanlar:
  assert.equal(store.suspendedAt, null);
  assert.equal(store.dunningExpireAt, null);
  assert.equal(store.expiredCause, null);
});

test("locked+suspended yanıtından suspended_at + dunning_expire_at akar", async () => {
  const expireAt = gunSonra(16);
  const store = freshStore({
    access: "locked",
    reason: "suspended",
    suspended_at: "2026-09-10 03:00:00",
    dunning_expire_at: expireAt,
  });
  await store.fetchAccessState();

  assert.equal(store.isLocked, true, "suspended bugünkü gibi kilitler (davranış değişmedi)");
  assert.equal(store.lockReason, "suspended");
  assert.equal(store.suspendedAt, "2026-09-10 03:00:00");
  assert.equal(store.dunningExpireAt, expireAt);
  assert.equal(store.inDunning, false, "suspended artık hoşgörü penceresi değil");
});

test("locked+trial_expired yanıtından expired_cause akar (dunning feshi ayrımı)", async () => {
  const store = freshStore({
    access: "locked",
    reason: "trial_expired",
    expired_cause: "dunning",
  });
  await store.fetchAccessState();

  assert.equal(store.isLocked, true);
  assert.equal(store.lockReason, "trial_expired", "reason geriye uyumlu KALIR");
  assert.equal(store.expiredCause, "dunning");
});

test("eski yanıt şekli (additive alanlar yok) getter'ları bozmaz — regresyon", async () => {
  const store = freshStore({
    access: "ok",
    status: "active",
    plan: "PRO",
    current_period_end: gunSonra(90),
  });
  await store.fetchAccessState();

  assert.equal(store.inDunning, false);
  assert.equal(store.dunningGraceEnd, null);
  assert.equal(store.suspendedAt, null);
  assert.equal(store.dunningExpireAt, null);
  assert.equal(store.expiredCause, null);
  assert.equal(store.hasSubscription, true);
});

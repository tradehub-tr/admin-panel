import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * AD-2 — abonelik store'unun iptal aksiyonları (BE-2 sözleşmesi).
 *
 *   ÖLÇÜLÜR  — requestCancellation/revokeCancellation'ın DOĞRU uca doğru
 *              argümanlarla gittiği, başarıda access state'in tek doğru
 *              kaynaktan tazelendiği, hatada YENİDEN çekmediği ve hatayı
 *              çağırana fırlattığı (toast kararı component'in), additive
 *              alanların (cancel_at_period_end / billing_cycle / canceled_at)
 *              getter'lara doğru aktığı, cancelActing'in her yolda kapandığı.
 *   ÖLÇÜLMEZ — gerçek backend (uçlar BE-2'de; sahte yanıtlar sözleşmenin
 *              response_schema'sından kopyalandı), 403/417 zarf çözümlemesi
 *              (api.request'in işi, kendi testleri var).
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const STUB = "/src/stores/__tests__/fixtures/subscriptionApiStub.js";

const REQUEST_METHOD = "tradehub_core.api.v1.subscription_cancellation.request_cancellation";
const REVOKE_METHOD = "tradehub_core.api.v1.subscription_cancellation.revoke_cancellation";
const ACCESS_METHOD = "tradehub_core.api.v1.subscription.get_seller_access_state";

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

/** Uca giden çağrılar — hangi uç, hangi argümanla. */
let calls;

function freshStore({ accessState } = {}) {
  setActivePinia(createPinia());
  calls = [];
  globalThis.__subApiGetMock = (method, args) => {
    calls.push({ via: "GET", method, args });
    return { message: accessState ?? null };
  };
  return subscriptionModule.useSubscriptionStore();
}

beforeEach(() => {
  delete globalThis.__subApiCallMock;
  delete globalThis.__subApiGetMock;
});

test("requestCancellation doğru uca reason+note gönderir, başarıda access state tazelenir", async () => {
  const contractMessage = {
    ok: true,
    subscription: "STSUB-2026-00001",
    status: "active",
    cancel_at_period_end: 1,
    effective_end: "2026-10-01 00:00:00",
    plan: "PRO",
    already_scheduled: false,
  };
  const store = freshStore({
    accessState: {
      access: "ok",
      status: "active",
      plan: "PRO",
      current_period_end: "2026-10-01 00:00:00",
      cancel_at_period_end: 1,
      billing_cycle: "yearly",
    },
  });
  globalThis.__subApiCallMock = (method, args) => {
    calls.push({ via: "POST", method, args });
    return { message: contractMessage };
  };

  const msg = await store.requestCancellation("fiyat", "çok pahalı");

  assert.deepEqual(msg, contractMessage, "sözleşme mesajı çağırana aynen döner");
  const post = calls.find((c) => c.via === "POST");
  assert.equal(post.method, REQUEST_METHOD);
  assert.deepEqual(post.args, { reason: "fiyat", note: "çok pahalı" });
  const get = calls.find((c) => c.via === "GET");
  assert.equal(get.method, ACCESS_METHOD, "başarı sonrası tek doğru kaynak yeniden çekilir");
  assert.equal(store.cancelAtPeriodEnd, true, "additive bayrak getter'a aktı");
  assert.equal(store.billingCycle, "yearly");
  assert.equal(store.cancelActing, false, "spinner kapandı");
});

test("revokeCancellation argümansız doğru uca gider ve bayrağı düşürür", async () => {
  const store = freshStore({
    accessState: {
      access: "ok",
      status: "active",
      plan: "PRO",
      current_period_end: "2026-10-01 00:00:00",
      cancel_at_period_end: 0,
    },
  });
  globalThis.__subApiCallMock = (method, args) => {
    calls.push({ via: "POST", method, args });
    return {
      message: {
        ok: true,
        subscription: "STSUB-2026-00001",
        status: "active",
        cancel_at_period_end: 0,
        current_period_end: "2026-10-01 00:00:00",
        plan: "PRO",
      },
    };
  };

  const msg = await store.revokeCancellation();

  assert.equal(msg.cancel_at_period_end, 0);
  const post = calls.find((c) => c.via === "POST");
  assert.equal(post.method, REVOKE_METHOD);
  assert.deepEqual(post.args ?? {}, {}, "revoke gövdesiz çağrılır (sözleşme: request_schema {})");
  assert.equal(store.cancelAtPeriodEnd, false);
  assert.equal(store.cancelActing, false);
});

test("hata çağırana fırlar, access state YENİDEN çekilmez, cancelActing kapanır", async () => {
  const store = freshStore();
  globalThis.__subApiCallMock = () => {
    throw new Error("Sadece mağaza sahibi aboneliği iptal edebilir.");
  };

  await assert.rejects(
    () => store.requestCancellation("diger"),
    /mağaza sahibi/,
    "403/417 mesajı aynen çağırana taşınmalı — toast kararı component'in"
  );
  assert.equal(
    calls.some((c) => c.via === "GET"),
    false,
    "başarısız iptal sonrası gereksiz refresh yok"
  );
  assert.equal(store.cancelActing, false, "hata yolunda da spinner kapanır (finally)");
});

test("locked+canceled access state'inden canceled_at getter'a akar", async () => {
  const store = freshStore({
    accessState: {
      access: "locked",
      reason: "canceled",
      canceled_at: "2026-09-01 12:00:00",
    },
  });
  await store.fetchAccessState();
  assert.equal(store.canceledAt, "2026-09-01 12:00:00");
  assert.equal(store.cancelAtPeriodEnd, false);
  assert.equal(store.billingCycle, null);
});

/**
 * T-123 — gönderim katmanının "ASLA FIRLATMAZ" sözleşmesi.
 *
 * Bu dosya görevin bitirme koşulu #2'nin kanıtıdır: **uç yokken sayfa
 * kırılmıyor.** Üç arıza ayrı ayrı kurulur — 404, 500 ve ağın hiç olmaması —
 * ve üçünde de `send()` ne fırlatır ne de reddedilen bir söz döndürür.
 *
 *   ÖLÇÜLÜR  — `send()`'in her arıza kipinde sessizce döndüğü; 404'te devrenin
 *              açılıp ağın bir daha rahatsız edilmediği; `sendBeacon` yokken/
 *              patlarken/`false` dönerken `fetch` yedeğine düşüldüğü.
 *   ÖLÇÜLMEZ — Gerçek bir tarayıcının sayfa kapanırken beacon'ı gerçekten
 *              yolladığı. `sendBeacon` burada sahtedir; tarayıcıda
 *              DOĞRULANMADI.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SEND_BEACON,
  SEND_DISABLED,
  SEND_EMPTY,
  SEND_FAILED,
  SEND_OK,
  createTransport,
} from "../transport.js";

const GOVDE = JSON.stringify({ samples: [{ metric: "LCP", value: 1200 }] });

/** Gövdeyi kabul eden sahte `navigator`. */
function beaconNav(sonuc = true) {
  const cagrilar = [];
  return {
    cagrilar,
    navigator: {
      sendBeacon(url, body) {
        cagrilar.push({ url, body });
        if (typeof sonuc === "function") return sonuc();
        return sonuc;
      },
    },
  };
}

function yanit(status) {
  return { status, ok: status >= 200 && status < 300 };
}

// Blob global'i Node'da var (18+); yoksa beacon yolu sessizce yedeğe düşer.
// Testler bu ayrımı `navigator` sahtesiyle kontrol ettiği için etkilenmez.

// ── ÜÇ ARIZA: 404, 500, ağ yok ─────────────────────────────────────

test("ARIZA 1/3 — uç 404: fırlatmaz, devreyi açar, bir daha denemez", async () => {
  const cagri = [];
  const t = createTransport({
    endpoint: "/api/method/yok",
    navigator: { sendBeacon: () => false },
    fetch: async (u) => {
      cagri.push(u);
      return yanit(404);
    },
  });

  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_DISABLED);
  assert.equal(t.isDisabled(), true, "404 sonrası devre açılmadı");
  assert.equal(cagri.length, 1);

  // Devre açıkken ağa HİÇ gidilmemeli — yoksa her sayfa yüklemesi
  // olmayan bir uca istek yağdırırdı.
  assert.equal(await t.send(GOVDE), SEND_DISABLED);
  assert.equal(await t.send(GOVDE), SEND_DISABLED);
  assert.equal(cagri.length, 1, "devre açıkken yine ağa gidildi");
});

test("ARIZA 2/3 — sunucu 500: fırlatmaz, devreyi AÇMAZ (geçici hata)", async () => {
  let sayac = 0;
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator: { sendBeacon: () => false },
    fetch: async () => {
      sayac += 1;
      return yanit(500);
    },
  });

  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_FAILED);
  assert.equal(t.isDisabled(), false, "geçici hata devreyi kalıcı açmamalı");
  await t.send(GOVDE);
  assert.equal(sayac, 2, "500 sonrası yeniden denenmedi");
});

test("ARIZA 3/3 — ağ hiç yok: fetch reject ediyor, yine fırlatmaz", async () => {
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator: { sendBeacon: () => false },
    fetch: async () => {
      throw new TypeError("Failed to fetch");
    },
  });

  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_FAILED);
});

test("ağ yokken ARDIŞIK gönderimler de sessiz (unhandled rejection yok)", async () => {
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator: null,
    fetch: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const hepsi = await Promise.all([t.send(GOVDE), t.send(GOVDE), t.send(GOVDE)]);
  assert.deepEqual(hepsi, [SEND_FAILED, SEND_FAILED, SEND_FAILED]);
});

// ── sendBeacon yolu ────────────────────────────────────────────────

test("sendBeacon varsa o kullanılır, fetch'e HİÇ gidilmez", async () => {
  const { navigator, cagrilar } = beaconNav(true);
  let fetchCagrildi = false;
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator,
    fetch: async () => {
      fetchCagrildi = true;
      return yanit(200);
    },
  });
  assert.equal(await t.send(GOVDE), SEND_BEACON);
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0].url, "/api/method/rum");
  assert.equal(fetchCagrildi, false, "beacon başarılıyken fetch de çağrıldı");
});

test("sendBeacon false dönerse (kuyruk dolu) fetch yedeğine düşülür", async () => {
  const { navigator } = beaconNav(false);
  let fetchCagrildi = false;
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator,
    fetch: async () => {
      fetchCagrildi = true;
      return yanit(200);
    },
  });
  assert.equal(await t.send(GOVDE), SEND_OK);
  assert.equal(fetchCagrildi, true, "yedek yola düşülmedi");
});

test("sendBeacon FIRLATIRSA yutulur ve fetch yedeğine düşülür", async () => {
  const navigator = {
    sendBeacon() {
      throw new Error("gövde çok büyük");
    },
  };
  let fetchCagrildi = false;
  const t = createTransport({
    endpoint: "/api/method/rum",
    navigator,
    fetch: async () => {
      fetchCagrildi = true;
      return yanit(200);
    },
  });
  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_OK);
  assert.equal(fetchCagrildi, true);
});

test("ne sendBeacon ne fetch var — yine fırlatmaz", async () => {
  const t = createTransport({ endpoint: "/api/method/rum", navigator: null, fetch: null });
  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_FAILED);
});

// ── Kenar durumlar ─────────────────────────────────────────────────

test("uç adresi boşsa hiç denemez", async () => {
  let dokunuldu = false;
  const t = createTransport({
    endpoint: "",
    navigator: {
      sendBeacon() {
        dokunuldu = true;
        return true;
      },
    },
  });
  assert.equal(await t.send(GOVDE), SEND_DISABLED);
  assert.equal(dokunuldu, false);
});

test("boş gövde gönderilmez", async () => {
  const { navigator, cagrilar } = beaconNav(true);
  const t = createTransport({ endpoint: "/x", navigator });
  assert.equal(await t.send(""), SEND_EMPTY);
  assert.equal(cagrilar.length, 0);
});

test("tanılama geri çağrısı FIRLATSA bile send fırlatmaz", async () => {
  const t = createTransport({
    endpoint: "/x",
    navigator: beaconNav(true).navigator,
    onDiagnostic() {
      throw new Error("tanılama patladı");
    },
  });
  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_BEACON);
});

test("fetch beklenmedik bir şey dönerse (undefined) yine fırlatmaz", async () => {
  const t = createTransport({
    endpoint: "/x",
    navigator: null,
    fetch: async () => undefined,
  });
  let sonuc;
  await assert.doesNotReject(async () => {
    sonuc = await t.send(GOVDE);
  });
  assert.equal(sonuc, SEND_OK, "durumu okunamayan yanıt başarısız sayılmamalı");
});

test("reset devreyi kapatır (elle yeniden deneme)", async () => {
  const t = createTransport({
    endpoint: "/x",
    navigator: null,
    fetch: async () => yanit(404),
  });
  await t.send(GOVDE);
  assert.equal(t.isDisabled(), true);
  t.reset();
  assert.equal(t.isDisabled(), false);
});

test("405/410/501 de kalıcı hata sayılır", async () => {
  for (const durum of [405, 410, 501]) {
    const t = createTransport({ endpoint: "/x", navigator: null, fetch: async () => yanit(durum) });
    assert.equal(await t.send(GOVDE), SEND_DISABLED, `${durum} devreyi açmadı`);
  }
});

test("403 kalıcı sayılmaz — yetki düzeltilebilir", async () => {
  const t = createTransport({ endpoint: "/x", navigator: null, fetch: async () => yanit(403) });
  assert.equal(await t.send(GOVDE), SEND_FAILED);
  assert.equal(t.isDisabled(), false);
});

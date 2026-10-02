import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/**
 * `useMediaSquare` (Task 6, Fix round 2 — MOGEM SDD 2026-09-29): gerçek
 * `tradehub_core.api.media_admin.get_square_status` yükü ilk brief'te
 * uydurulmuştu. Yerel site'ten alınan GERÇEK yük:
 *
 *   {"dry_run":true,"errors":0,"expires_at":"2026-12-29 09:44:10","message":"",
 *    "mode":"kare","processed":3541,"refs_skipped":0,"refs_updated":0,
 *    "renamed":2418,"skip_reasons":{"already_square":1002,"archived":6,
 *    "disk_missing":114,"not_product":1},"skipped":1123,"state":"completed",
 *    "total":3541}
 *
 * İki fark composable'ı kırıyordu:
 *   1. Alan adı `skip_reasons`, `reasons` değil (composable ilkinde
 *      `d.reasons`e bakıyordu → kart her zaman 0/0 gösteriyordu).
 *   2. Dönüştürme işinin modu `"kare"`, `"square"` değil (composable ilkinde
 *      `job.mode === "square"` kontrolüyle son işi hiç `lastJob`'a yazmıyordu
 *      → "Geri al" hiç görünmüyordu).
 *
 * Bu dosya `mediaRetroRename.test.js`in desenini izler: gerçek composable
 * Vite `ssrLoadModule` ile (alias çözümü için) yüklenir, sahte `fetchers`
 * ile sürülür, `localStorage` basit bir bellek-içi taklitle değiştirilir.
 */

/**
 * `expires_at` gerçek yükte sabit bir gelecek tarihti — burada hiçbir
 * assertion buna bakmıyor ama sabit yazmak `zamanBombasi.test.js`i ihlal
 * eder (bugünden ileri tarih sabiti yasak). Aynı desen: `mediaRetroRename
 * Card.test.js`teki `gelecekGun()`.
 */
function gelecekGun(gunSayisi) {
  const d = new Date(Date.now() + gunSayisi * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 09:44:10`;
}

async function bekle(kosul, { sinirMs = 3000, aralikMs = 2 } = {}) {
  const bitis = Date.now() + sinirMs;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await new Promise((res) => setTimeout(res, aralikMs));
  }
  return kosul();
}

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
let server;
let useMediaSquare;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaSquare } = await server.ssrLoadModule("/src/composables/useMediaSquare.js"));
});

after(async () => {
  await server?.close();
});

function bellekDepo() {
  const depo = {};
  return {
    depo,
    getItem: (k) => (k in depo ? depo[k] : null),
    setItem: (k, v) => {
      depo[k] = String(v);
    },
    removeItem: (k) => {
      delete depo[k];
    },
  };
}

function sahte({ statuses = [] } = {}) {
  const calls = [];
  let i = 0;
  return {
    calls,
    fetchers: {
      count: async () => (calls.push("count"), { total: 0 }),
      start: async (args) => (
        calls.push(["start", args]),
        { job_key: "J-REAL", total: 3541, dry_run: args.dry_run }
      ),
      status: async () => (calls.push("status"), statuses[Math.min(i++, statuses.length - 1)]),
      stop: async () => (calls.push("stop"), { ok: true }),
      rollback: async (args) => (calls.push(["rollback", args]), { job_key: "RB1" }),
    },
  };
}

// Gerçek `get_square_status` yükü — 2026-09-30 yerel site'ten alınan
// tamamlanmış, DRY-RUN OLMAYAN bir "kare" işi (aynen görev talimatındaki gibi,
// yalnız `dry_run` gerçek koşuyu temsil etsin diye false).
const GERCEK_YUK = {
  dry_run: false,
  errors: 0,
  expires_at: gelecekGun(90),
  message: "",
  mode: "kare",
  processed: 3541,
  refs_skipped: 0,
  refs_updated: 0,
  renamed: 2418,
  skip_reasons: { already_square: 1002, archived: 6, disk_missing: 114, not_product: 1 },
  skipped: 1123,
  state: "completed",
  total: 3541,
};

test("gerçek yük: skip_reasons okunur (2418/1002/121), mode 'kare' + dry_run=false lastJob'a yazılır", async () => {
  const onceki = globalThis.localStorage;
  globalThis.localStorage = bellekDepo();
  try {
    const s = sahte({ statuses: [GERCEK_YUK] });
    const r = useMediaSquare(s.fetchers, { pollMs: 2 });
    await r.start({ dryRun: false });
    await bekle(() => r.job.state === "completed");

    assert.equal(r.job.state, "completed");
    assert.equal(r.job.renamed, 2418);
    // skip_reasons doğrudan job.reasons'a geçmeli (eski `reasons` alanı yok).
    assert.equal(r.job.reasons.already_square, 1002);
    assert.equal(r.job.reasons.archived, 6);
    assert.equal(r.job.reasons.disk_missing, 114);
    assert.equal(r.job.reasons.not_product, 1);
    const willSkip =
      (r.job.reasons.archived || 0) +
      (r.job.reasons.disk_missing || 0) +
      (r.job.reasons.not_product || 0);
    assert.equal(willSkip, 121);

    // Gerçek (dry_run=false) "kare" işi tamamlandığı için geri alınabilir son
    // iş olarak saklanmalı.
    assert.equal(r.lastJob.value?.jobKey, "J-REAL");
    assert.equal(r.lastJob.value?.renamed, 2418);
    assert.equal(r.canRollback.value, true);
    assert.equal(
      JSON.parse(globalThis.localStorage.getItem("th:media:square:lastJob")).jobKey,
      "J-REAL"
    );
  } finally {
    globalThis.localStorage = onceki;
  }
});

test("dry_run=true 'kare' işi tamamlansa da lastJob'a yazılmaz (prova geri alınamaz)", async () => {
  const onceki = globalThis.localStorage;
  globalThis.localStorage = bellekDepo();
  try {
    const s = sahte({ statuses: [{ ...GERCEK_YUK, dry_run: true }] });
    const r = useMediaSquare(s.fetchers, { pollMs: 2 });
    await r.start({ dryRun: true });
    await bekle(() => r.job.state === "completed");
    assert.equal(r.lastJob.value, null);
    assert.equal(r.canRollback.value, false);
  } finally {
    globalThis.localStorage = onceki;
  }
});

test("rollback işi ('mode: rollback') tamamlanınca lastJob tüketilir", async () => {
  const onceki = globalThis.localStorage;
  const depo = bellekDepo();
  depo.setItem("th:media:square:lastJob", JSON.stringify({ jobKey: "J-REAL", renamed: 2418 }));
  globalThis.localStorage = depo;
  try {
    const s = sahte({
      statuses: [
        {
          state: "completed",
          total: 2418,
          processed: 2418,
          renamed: 0,
          skipped: 0,
          errors: 0,
          skip_reasons: {},
          dry_run: false,
          mode: "rollback",
        },
      ],
    });
    const r = useMediaSquare(s.fetchers, { pollMs: 2 });
    assert.equal(r.canRollback.value, true, "başlangıçta lastJob var, geri alınabilir");
    await r.rollback();
    await bekle(() => r.job.state === "completed");
    assert.equal(r.lastJob.value, null, "rollback bitince kaynak kayıt tüketilir");
    assert.equal(depo.getItem("th:media:square:lastJob"), null);
  } finally {
    globalThis.localStorage = onceki;
  }
});

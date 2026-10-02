import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ORPHAN_REASONS,
  canConfirmDelete,
  deletePayload,
  pageCount,
  reasonChips,
  reasonKey,
} from "../orphanAvif.js";

const kok = fileURLToPath(new URL("../../../", import.meta.url));

test("sebep çipleri sabit sırada, kayıtsız dosya silinebilir sayılmaz", () => {
  const chips = reasonChips({ unregistered: 1, archived_asset: 2, old_version: 0 });
  assert.deepEqual(
    chips.map((c) => [c.reason, c.count, c.deletable]),
    [
      ["archived_asset", 2, true],
      ["unregistered", 1, false],
    ]
  );
  assert.equal(reasonKey("yok"), "mediaOrphanAvif.reason.unknown");
});

test("silme varsayılan kuru koşu; gerçek istek yalnız kuru koşu jetonuyla", () => {
  assert.deepEqual(deletePayload(["a1"], null), { assets: '["a1"]', dry_run: 1 });
  assert.throws(() => deletePayload(["a1"], null, { confirm: true }));
  const kuru = { dry_run: true, confirm_token: "2:100", would_delete_files: 2 };
  assert.equal(canConfirmDelete(kuru), true);
  assert.deepEqual(deletePayload(["a1"], kuru, { confirm: true }), {
    assets: '["a1"]',
    dry_run: 0,
    confirm_token: "2:100",
  });
  assert.equal(canConfirmDelete({ ...kuru, would_delete_files: 0 }), false);
  assert.equal(canConfirmDelete({ ...kuru, dry_run: false }), false);
});

test("sayfa sayısı boş listede 1", () => {
  assert.equal(pageCount(0, 20), 1);
  assert.equal(pageCount(41, 20), 3);
});

test("dört dilde tüm anahtarlar ve menü etiketi var", async () => {
  const gerekli = [
    "title",
    "subtitle",
    "empty",
    "dialog.dryRunNote",
    "dialog.confirmWord",
    ...ORPHAN_REASONS.map((r) => `reason.${r}`),
  ];
  for (const dil of ["tr", "en", "ru", "ar"]) {
    const mod = await import(`../../../i18n/locales/${dil}.js`);
    const blok = mod.default.mediaOrphanAvif;
    assert.ok(blok, `${dil}: mediaOrphanAvif yok`);
    for (const k of gerekli) {
      const v = k.split(".").reduce((o, p) => o?.[p], blok);
      assert.ok(typeof v === "string" && v.length, `${dil}: ${k}`);
    }
    assert.ok(mod.default.nav.item.mediaOrphanAvif, `${dil}: nav.item.mediaOrphanAvif`);
  }
});

test("rota yalnız süper yöneticiye açık ve Sistem → Medya menüsünde", () => {
  const router = readFileSync(`${kok}router/index.js`, "utf8");
  const blok = router.slice(
    router.indexOf('path: "media-orphan-avif"'),
    router.indexOf('path: "media-quarantine"')
  );
  assert.match(blok, /requiresSuperAdmin: true/);
  assert.match(blok, /section: "system"/);
  const nav = readFileSync(`${kok}data/navigation.js`, "utf8");
  assert.match(nav, /route: "\/media-orphan-avif"/);
});

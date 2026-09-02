import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MANIFEST_BATCH_METHOD,
  applyLibraryManifest,
  loadLibraryManifests,
} from "../libraryManifests.js";

test("48 görünür kart için tam bir manifest_batch isteği atılır; N+1 yok", async () => {
  const rows = Array.from({ length: 48 }, (_, i) => ({
    id: `/files/${i}.jpg`,
    docName: `FILE-${i}`,
    lqip: "",
  }));
  const calls = [];
  const result = await loadLibraryManifests(rows, {
    call: async (method, args) => {
      calls.push({ method, args });
      return {
        message: {
          returned: 48,
          manifests: Object.fromEntries(
            rows.map((row, i) => [
              row.docName,
              {
                assets: [`MA-${i}`],
                version: { lqip_data_uri: `data:image/webp;base64,${i}` },
                renditions: [
                  {
                    profile: "w384",
                    width: 384,
                    height: 256,
                    format: "webp",
                    file_url: `/files/${i}__w384.webp`,
                    bytes: 1234,
                  },
                ],
              },
            ])
          ),
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, MANIFEST_BATCH_METHOD);
  assert.equal(calls[0].args.file_urls.length, 48);
  assert.deepEqual(result, { requested: 48, returned: 48, calls: 1 });
  assert.equal(rows[17].renditions[0].fileUrl, "/files/17__w384.webp");
  assert.match(rows[17].lqip, /^data:image\/webp/);
  assert.deepEqual(rows[17].assetNames, ["MA-17"]);
});

test("önceden yüklenen kart tekrar istenmez; force canlı yenilemeyi zorlar", async () => {
  const row = { docName: "FILE-1", _manifestLoaded: true, renditions: [] };
  let calls = 0;
  const call = async () => {
    calls += 1;
    return { message: { returned: 0, manifests: { "FILE-1": null } } };
  };
  assert.equal((await loadLibraryManifests([row], { call })).calls, 0);
  assert.equal((await loadLibraryManifests([row], { call, force: true })).calls, 1);
  assert.equal(calls, 1);
  assert.equal(row.deliveryState, "missing");
});

test("bozuk/eksik türev srcset'e girmez; mevcut LQIP korunur", () => {
  const item = { lqip: "#abcdef" };
  applyLibraryManifest(item, {
    renditions: [
      { width: 0, file_url: "/files/bad.webp" },
      { width: 384, file_url: "" },
    ],
  });
  assert.deepEqual(item.renditions, []);
  assert.equal(item.lqip, "#abcdef");
  assert.equal(item.deliveryState, "source-only");
});

test("100 üstü görünür girdi sessizce kırpılmaz", async () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ docName: `F-${i}` }));
  await assert.rejects(loadLibraryManifests(rows, { call: async () => ({}) }), /en fazla 100/);
});

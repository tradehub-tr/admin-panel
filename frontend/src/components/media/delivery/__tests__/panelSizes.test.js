import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";

/**
 * T-121 — `sizes` GERÇEK DÜZENDEN türetiliyor mu.
 *
 *   ÖLÇÜLDÜ  — üretilen `sizes` dizgesinin panelin ölçülmüş CSS
 *              sabitleriyle (ray, yan panel, iç boşluk, sütun sayısı,
 *              ızgara boşluğu) tutarlılığı; dizgenin arayüz durumuna
 *              (yoğunluk, detay paneli) gerçekten TEPKİ verdiği; ve
 *              kullanılan çözümlemenin simülatörünkiyle BİREBİR aynı
 *              sonucu verdiği.
 *   ÖLÇÜLMEDİ — "seçilen rendition ile gerçek kutu farkı ≤ %25". Bu ölçüt
 *              `currentSrc` genişliği ile `getBoundingClientRect().width ×
 *              DPR` karşılaştırması ister; canlı tarayıcı gerekir ve bu
 *              görevde tarayıcı doğrulaması YAPILMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const SIZES = "/src/components/media/delivery/sizes.js";

let server;
let mod;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  mod = await server.ssrLoadModule(SIZES);
});

after(async () => {
  await server?.close();
});

test("ızgara `sizes`'ı ölçülmüş kabuk ve iç boşluklardan çıkıyor", () => {
  const value = mod.panelSizes("libraryGrid", { density: 3 });

  // <768px: ray/panel yok → yalnız main (32) + .mpage (32) düşülür.
  const dar = 32 + 32;
  // 768–1023px: ray 60 + panel 220 eklenir, main hâlâ p-4.
  const orta = 60 + 220 + 32 + 32;
  // ≥1024px: main p-6'ya çıkar.
  const genis = 60 + 220 + 48 + 32;
  assert.notEqual(dar, orta);

  assert.ok(value.includes(`(min-width: 768px) calc((100vw - ${orta}px`), value);
  assert.ok(value.includes(`(min-width: 1024px) calc((100vw - ${genis}px`), value);
  assert.ok(value.endsWith(`calc((100vw - ${dar}px - 24px) / 3)`), value);

  // 3 sütun → 2 boşluk × 12px = 24px. Sütun sayısı değişince bu da değişmeli.
  assert.ok(value.includes("- 24px) / 3"), value);
});

test("bantlar AZALAN sırada — ilk eşleşen kazanır", () => {
  // `sizes` sözdiziminde tarayıcı İLK eşleşen koşulu alır. Artan sırada
  // yazılsaydı 1440px'lik bir ekranda 768px bandı kazanır ve tüm ölçüm
  // sessizce yanlışa dönerdi.
  const value = mod.panelSizes("libraryGrid", { density: 4, detailOpen: true });
  const edges = [...value.matchAll(/\(min-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
  assert.ok(edges.length >= 3, value);
  assert.deepEqual(
    edges,
    [...edges].sort((a, b) => b - a),
    value
  );

  // Son parça koşulsuz olmalı: hiçbir bandın eşleşmediği dar ekranda da bir
  // değer kalmalı. (`libraryGrid` ifadelerinde virgül yok, güvenle bölünür.)
  const parts = value.split(", ");
  assert.doesNotMatch(parts[parts.length - 1], /min-width/, value);
  assert.equal(parts.length, edges.length + 1, value);
});

test("yoğunluk seçicisi `sizes`'ı GERÇEKTEN değiştiriyor", () => {
  const iki = mod.panelSizes("libraryGrid", { density: 2 });
  const alti = mod.panelSizes("libraryGrid", { density: 6 });
  assert.notEqual(iki, alti);
  assert.ok(iki.includes("/ 2)"), iki);
  // ≥1280px'te tavan kalkar: `detailDocked ? density : min(density, 4)`.
  assert.ok(alti.includes("/ 6)"), alti);
  assert.ok(alti.includes("/ 4)"), "1280px altında 4 sütun tavanı uygulanmalı");
});

test("detay paneli açıkken ızgara sütunu daralıyor", () => {
  const kapali = mod.panelSizes("libraryGrid", { density: 3, detailOpen: false });
  const acik = mod.panelSizes("libraryGrid", { density: 3, detailOpen: true });
  assert.notEqual(kapali, acik);
  // 19rem + 16px gap = 320px (≥1280), 21rem + 16px = 352px (≥1536).
  assert.ok(acik.includes("(min-width: 1280px)") && acik.includes("- 680px"), acik);
  assert.ok(acik.includes("(min-width: 1536px)") && acik.includes("- 712px"), acik);
  assert.ok(!kapali.includes("(min-width: 1536px)"), kapali);
});

test("sabit ölçülü küçük resimler px `sizes` alıyor — 100vw varsayımı kesiliyor", () => {
  // `w` tanımlayıcılı bir `srcset`'te `sizes` yoksa tarayıcı 100vw sayar ve
  // 40px'lik satır önizlemesi için en büyük basamağı indirir.
  assert.equal(mod.panelSizes("rowThumb"), "40px");
  assert.equal(mod.panelSizes("cellThumb"), "36px");
  assert.equal(mod.panelSizes("kanbanThumb"), "36px");
});

test("detay önizlemesi sheet genişliğine kelepçeli", () => {
  assert.equal(mod.panelSizes("detailPreview"), "min(100vw, 416px)");
});

test("bilinmeyen bölge boş dize döner — uydurma `sizes` üretilmez", () => {
  assert.equal(mod.panelSizes("yokBoyleBirSey"), "");
});

test("kapsayıcı çözümlemesi simülatörünkiyle BİREBİR aynı", async () => {
  // Bu modül `sizesAttribute`'u çağırıyor ama `flatten`'ı kendi kapsayıcı
  // haritası üzerinde yürütmek zorunda (simülatörün `flattenContainer`'ı
  // modül düzeyindeki kendi kapsayıcılarına bağlı ve `lib/media/simulator/`
  // bu görevde SALT OKUNUR). İkinci bir çözümleme yazmanın tek kabul
  // edilebilir şartı, ilkiyle aynı sonucu verdiğinin ÖLÇÜLMESİ.
  const layout = await server.ssrLoadModule("/src/lib/media/simulator/layout.js");
  const flatten = mod.makeFlatten(layout.CONTAINERS);

  let checked = 0;
  for (const name of Object.keys(layout.CONTAINERS)) {
    for (let vw = 240; vw <= 2560; vw += 8) {
      assert.deepEqual(flatten(name, vw), layout.flattenContainer(name, vw), `${name} @ ${vw}px`);
      checked += 1;
    }
  }
  assert.ok(checked > 1000, `yalnız ${checked} kombinasyon denendi`);
});

test("modülde ELLE YAZILMIŞ `sizes` dizgesi yok", () => {
  // T-121'in bütün meselesi bu: bir `sizes` dizgesi kaynakta sabit olarak
  // durursa, kırılım noktası değiştiği gün sessizce yalan söyler.
  const source = readFileSync(new URL("../sizes.js", import.meta.url), "utf8");
  const code = source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(code, /["'`][^"'`]*\(min-width:/, "kaynakta sabit `sizes` bandı var");
  assert.doesNotMatch(code, /["'`][^"'`]*\bvw\b[^"'`]*["'`]/, "kaynakta sabit vw ifadesi var");
});

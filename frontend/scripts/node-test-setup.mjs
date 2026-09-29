// `node --test` ön yüklemesi (`npm test`).
//
// `__LOJISTIK_MOCK__` ve `__LOJISTIK_MOCK_BEKLEYEN__` Vite `define` sabitleri
// (MOGEM-685 F-03); Node'da yoklar. Birim testleri lojistik mock zinciriyle
// koşuyor — önizleme derlemesi gibi AÇIK. Bekleyen modül listesi derlemedekiyle
// aynı kaynaktan okunuyor.
// Tek dosya koşarken de gerekli: `node --import ./scripts/node-test-setup.mjs --test <dosya>`.
import { fileURLToPath } from "node:url";

import { bekleyenModuller } from "./lojistik-mock-haritasi.mjs";

globalThis.__LOJISTIK_MOCK__ = true;
globalThis.__LOJISTIK_MOCK_BEKLEYEN__ = bekleyenModuller(
  fileURLToPath(new URL("../src/api", import.meta.url))
);

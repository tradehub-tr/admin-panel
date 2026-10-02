import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers";
import { JSDOM } from "jsdom";
import { compileScript, parse } from "@vue/compiler-sfc";

/**
 * Gerçek SFC'yi jsdom'da istemci tarafında çalıştırır (mediaExplorerLoad.test.js deseni).
 * İçe aktarımlar `stubs[yol]` ile değiştirilir: varsayılan içe aktarımda değer
 * doğrudan bağlanan şeydir (bileşen/nesne), adlı içe aktarımda modül nesnesidir.
 * `import "x.css"` gibi yan etki içe aktarımları atlanır.
 */
export function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  for (const key of [
    "window",
    "document",
    "Node",
    "Element",
    "HTMLElement",
    "SVGElement",
    "Event",
    "KeyboardEvent",
  ])
    globalThis[key] = dom.window[key];
  // <Transition> çıkışta requestAnimationFrame ister; jsdom bunu yalnız kendi window'unda verir.
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  return dom;
}

export function loadSfc(fileUrl, stubs, Vue) {
  const { descriptor } = parse(readFileSync(fileUrl, "utf8"));
  const compiled = compileScript(descriptor, { id: "sfc-test", inlineTemplate: true });
  const program = compiled.content
    .replace(/^import\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g, (_, bindings, path) => {
      const target = path === "vue" ? "Vue" : `stubs[${JSON.stringify(path)}]`;
      if (bindings.trim().startsWith("{"))
        return `const ${bindings.replace(/\s+as\s+/g, ":")} = ${target};`;
      return `const ${bindings.trim()} = ${target};`;
    })
    .replace("export default", "return");
  const blank = Vue.defineComponent({ render: () => Vue.h("span") });
  const proxy = new Proxy(stubs, { get: (t, k) => (k in t ? t[k] : blank) });
  return new Function("Vue", "stubs", program)(Vue, proxy);
}

export async function settle(Vue, rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    await Vue.nextTick();
  }
}

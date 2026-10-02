// Vue'nun runtime-dom'u `document`i yükleme anında yakalar: bu dosya, Vue'yu
// çeken her şeyden ÖNCE import edilmelidir (ES import sırası).
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><div id="app"></div>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  SVGElement: dom.window.SVGElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
});

export function teardownDom() {
  for (const k of ["window", "document", "SVGElement", "Element", "Node"]) delete globalThis[k];
}

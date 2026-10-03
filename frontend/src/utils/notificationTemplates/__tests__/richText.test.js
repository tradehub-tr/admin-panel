// Zengin metin ↔ kod dönüşümü: `{{…}}` sözdizimi korunur (jsdom + gerçek DOMPurify).
import assert from "node:assert/strict";
import { before, test } from "node:test";

import { JSDOM } from "jsdom";

import { fromRichElement, roundTrip, toRichHtml } from "../richText.js";

const VARS = [
  { name: "buyer_name", label: "Alıcı adı", type: "text" },
  { name: "order_no", label: "Sipariş numarası", type: "text" },
  { name: "order_url", label: "Sipariş bağlantısı", type: "url" },
  { name: "groups", label: "Bildirim grupları", type: "loop" },
  { name: "group.title", label: "Grup adı", type: "text", scope: "groups" },
];

let env;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  // DOMPurify içe aktarılırken `window` arar; uygulamadaki temizleyicinin AYNISI kullanılsın.
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const { sanitizeHtml } = await import("../../sanitize.js");
  env = { doc: dom.window.document, sanitize: sanitizeHtml };
});

test("değişkenler chip olur, kod görünümüne dönüşte sözdizimi aynen gelir", () => {
  const source =
    '<h1>Siparişiniz onaylandı</h1>\n<p>Merhaba {{buyer_name}},</p>\n<table>\n  <tr><td>Sipariş no</td><td>{{order_no}}</td></tr>\n</table>\n<p><a class="cta" href="{{order_url}}">Siparişi görüntüle</a></p>';
  const rich = toRichHtml(source, VARS, env);
  assert.match(rich, /class="nt-chip"[^>]*data-token="\{\{buyer_name\}\}"[^>]*>Alıcı adı<\/span>/);
  assert.match(rich, /data-token="\{\{order_no\}\}"/);
  // Görünen metinde ham sözdizimi kalmaz; öznitelikteki belirteç (href) dokunulmadan durur.
  assert.doesNotMatch(rich.replace(/<[^>]+>/g, ""), /\{\{/);
  assert.match(rich, /href="\{\{order_url\}\}"/);

  const back = roundTrip(source, VARS, env);
  for (const token of ["{{buyer_name}}", "{{order_no}}", 'href="{{order_url}}"'])
    assert.ok(back.includes(token), token);
  assert.doesNotMatch(back, /nt-chip|contenteditable|data-token/);
  assert.equal(back.match(/\{\{/g).length, source.match(/\{\{/g).length);
});

test("döngü ve tanımsız değişken de korunur", () => {
  const source = "<ul>{{#each groups}}<li>{{group.title}} {{ordr_no}}</li>{{/each}}</ul>";
  const rich = toRichHtml(source, VARS, env);
  assert.match(rich, /nt-chip--loop[^>]*data-token="\{\{#each groups\}\}"/);
  assert.match(rich, /nt-chip--bad[^>]*data-token="\{\{ordr_no\}\}"/);
  assert.match(rich, /data-token="\{\{\/each\}\}"/);
  const back = roundTrip(source, VARS, env);
  for (const token of ["{{#each groups}}", "{{group.title}}", "{{ordr_no}}", "{{/each}}"])
    assert.ok(back.includes(token), token);
});

test("zengin metinde yapılan düzenleme kaynağa yansır; düzenleyici öznitelikleri atılır", () => {
  const host = env.doc.createElement("div");
  host.innerHTML = toRichHtml("<p>Merhaba {{buyer_name}}</p>", VARS, env);
  const p = host.querySelector("p");
  p.setAttribute("style", "color:red");
  p.appendChild(env.doc.createTextNode(", hoş geldiniz​"));
  assert.equal(fromRichElement(host, env), "<p>Merhaba {{buyer_name}}, hoş geldiniz</p>");
});

test("betik ve olay öznitelikleri temizlenir", () => {
  const rich = toRichHtml(
    '<p onclick="x()">A {{order_no}}</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    VARS,
    env
  );
  assert.doesNotMatch(rich, /script|onclick|onerror/);
  assert.match(rich, /data-token="\{\{order_no\}\}"/);
});

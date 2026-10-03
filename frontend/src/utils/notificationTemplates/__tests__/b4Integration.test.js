// B4 — şablon dili (#if), sunucu sözleşmesi yardımcıları ve içerik rolü menüsü (node:test).
import assert from "node:assert/strict";
import test from "node:test";

import { conflictOf, serverFilters, validationOf } from "../contract.js";
import { navFor } from "../../../data/navigation.js";
import {
  NOTIFICATION_TEMPLATES_HOME,
  capabilitiesOf,
  isNotificationTemplatesPath,
  resolveTemplateRole,
} from "../permissions.js";
import { buildPreview } from "../preview.js";
import {
  expand,
  insertionTokens,
  render,
  structureIssue,
  tokens,
  variableCode,
} from "../template.js";
import { describeIssue, normalizeServerIssue, validateAll, validateScope } from "../validation.js";

const VARS = [
  { name: "buyer_name", label: "Alıcı adı", type: "text", sample: "Deniz" },
  { name: "has_note", label: "Not var", type: "boolean", sample: true },
  { name: "no_note", label: "Not yok", type: "boolean", sample: false },
  {
    name: "order_url",
    label: "Sipariş bağlantısı",
    type: "url",
    sample: "https://istoc.example/s",
  },
];
const known = new Set(VARS.map((v) => v.name));

test("tokens: #if ve /if belirteçleri", () => {
  assert.deepEqual(
    tokens("{{#if has_note}}x{{/if}}").map((t) => [t.type, t.name]),
    [
      ["if", "has_note"],
      ["endif", ""],
    ]
  );
});

test("expand: koşul örnek veriyle değerlendirilir, tanımsız koşul işaretlenir", () => {
  assert.equal(expand("a{{#if has_note}}B{{/if}}c", { has_note: true }, known), "aBc");
  assert.equal(expand("a{{#if no_note}}B{{/if}}c", { no_note: false }, known), "ac");
  assert.match(expand("{{#if yok}}x{{/if}}", {}, known), /nt-bad/);
  // Eşi olmayan blok önizlemede metni yutmaz.
  assert.match(expand("{{#if has_note}}kalan", { has_note: false }, known), /nt-bad.*kalan/);
});

test("render: tek tırnak &#x27; ve derinlik sınırı 4", () => {
  assert.equal(render("{{v}}", { v: "'" }, "html"), "&#x27;");
  assert.equal(structureIssue("{{#if a}}".repeat(4) + "{{/if}}".repeat(4)), null);
  assert.equal(structureIssue("{{#if a}}".repeat(5) + "{{/if}}".repeat(5)), "too_deep");
});

test("validateScope: unclosed_condition, çapraz kapanış, derinlik", () => {
  const ctx = { channel: "push", lang: "tr", variables: VARS, required: [] };
  const kinds = (body) => validateScope({ title: "T", body }, ctx).map((i) => i.kind);
  assert.ok(kinds("{{#if has_note}}x").includes("unclosed_condition"));
  assert.ok(kinds("{{#each a}}{{#if has_note}}{{/each}}{{/if}}").includes("unclosed_condition"));
  const deep = validateScope(
    { title: "T", body: "{{#if has_note}}".repeat(5) + "{{/if}}".repeat(5) },
    ctx
  ).find((i) => i.kind === "unclosed_loop");
  assert.ok(deep?.deep);
});

test("validateAll: açık kanalın TR içeriği yoksa engelleyici (sunucuyla aynı)", () => {
  const event = { channels: { inapp: "kapali", email: "kapali", push: "zorunlu", sms: "kapali" } };
  const issues = validateAll(event, { push: { tr: null } }, { variables: VARS });
  assert.ok(
    issues.some((i) => i.kind === "empty_required_field" && i.channel === "push" && i.lang === "tr")
  );
});

test("insertionTokens: koşul değişkeni {{#if}}…{{/if}} olarak eklenir", () => {
  assert.deepEqual(
    insertionTokens(VARS[1]).map((t) => t.raw),
    ["{{#if has_note}}", "{{/if}}"]
  );
  assert.equal(variableCode(VARS[0]), "{{buyer_name}}");
});

test("önizleme: boolean örnek koşulu açar/kapatır", () => {
  const preview = buildPreview({
    event: { channels: { push: "zorunlu" } },
    tree: {
      push: { tr: { title: "T", body: "a{{#if has_note}}N{{/if}}{{#if no_note}}X{{/if}}" } },
    },
    channel: "push",
    lang: "tr",
    variables: VARS,
    sanitize: (h) => h,
  });
  assert.equal(preview.parts.bodyHtml, "aN");
});

test("serverFilters: sunucunun bilmediği değer gönderilmez", () => {
  assert.deepEqual(serverFilters({ translation: "tam", module: "rfq", q: "" }), { module: "rfq" });
  assert.deepEqual(serverFilters({ translation: "eksik" }), { translation: "eksik" });
});

test("conflictOf / validationOf: message.error_code gövdesi", () => {
  const err = (status, message) => ({ status, body: { message } });
  assert.equal(
    conflictOf(err(409, { error_code: "REVISION_CONFLICT", revision: 3, theirs: {} })).revision,
    3
  );
  assert.equal(conflictOf(err(409, { error_code: "OTHER" })), null);
  assert.equal(
    validationOf(err(422, { error_code: "VALIDATION_FAILED", blocking: [{}] })).blocking.length,
    1
  );
  // Yalnız alan hatası taşıyan 422 içerik reddi sayılmaz.
  assert.equal(
    validationOf(err(422, { error_code: "VALIDATION_FAILED", field_errors: { target: "x" } })),
    null
  );
});

test("içerik rolleri: yetenekler sunucu tablosuyla aynı, menüde yalnız bildirim şablonları", () => {
  assert.deepEqual(capabilitiesOf("icerik-yoneticisi"), ["goruntule", "duzenle", "test"]);
  assert.deepEqual(capabilitiesOf("salt-okunur"), ["goruntule"]);
  assert.equal(
    resolveTemplateRole({ isAdmin: false, roles: ["Notification Viewer", "All"] }),
    "salt-okunur"
  );
  const { sections, rail } = navFor("notifications");
  const routes = Object.values(sections)
    .flat()
    .flatMap((g) => g.items.map((i) => i.route));
  assert.deepEqual(routes, [NOTIFICATION_TEMPLATES_HOME]);
  assert.equal(rail.length, 1);
  assert.ok(isNotificationTemplatesPath("/bildirim-sablonlari/rfq.quoted/gecmis"));
  assert.ok(!isNotificationTemplatesPath("/bildirim-sablonlarix"));
  assert.ok(!isNotificationTemplatesPath("/dashboard"));
});

test("sunucu sorunu: too_long ve missing_translation okunur metin üretir", () => {
  const long = describeIssue(
    normalizeServerIssue(
      { kind: "too_long", channel: "email", lang: "tr", field: "subject" },
      "warning"
    )
  );
  assert.ok(!long.text.includes("undefined") && long.text.includes("78"));
  const tr = normalizeServerIssue(
    { kind: "missing_translation", channel: "email", lang: "en", field: "" },
    "warning"
  );
  assert.equal(tr.channel, null);
  assert.ok(!describeIssue(tr).text.includes("içeriği yok"));
});

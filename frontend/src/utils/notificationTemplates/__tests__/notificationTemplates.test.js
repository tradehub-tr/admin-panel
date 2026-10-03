// Bildirim şablonları — saf yardımcıların birim testleri (node:test).
import assert from "node:assert/strict";
import test from "node:test";

import { NOTIFICATION_TEMPLATE_POLICY } from "../../../constants/notificationTemplatePolicy.js";
import { SEED_EVENTS } from "./fixtures/eventsSeed.js";
import {
  activeFilterChips,
  channelPayload,
  filterEvents,
  fold,
  hasOpenChannel,
  listCountLabel,
  ruleSentence,
  stats,
  translationSummary,
} from "../catalog.js";
import { changedFieldList, diffSegments, fieldDiffs, hasDraftDiff } from "../diff.js";
import {
  accessTags,
  canRestore,
  denyReason,
  publishMode,
  resolveTemplateRole,
  roleCan,
} from "../permissions.js";
import { buildPreview, resolvePreviewContent } from "../preview.js";
import { simplifyTurkish, smsInfo } from "../sms.js";
import { expand, htmlToText, knownNames, plainFill, sampleScope, tokens } from "../template.js";
import {
  describeIssue,
  issueSentence,
  severityOf,
  splitIssues,
  validUrl,
  validateAll,
  validateScope,
} from "../validation.js";

const VARS = [
  { name: "buyer_name", label: "Alıcı adı", type: "text", sample: "Deniz Yıldız" },
  { name: "order_no", label: "Sipariş numarası", type: "text", sample: "TH-24081" },
  {
    name: "order_url",
    label: "Sipariş bağlantısı",
    type: "url",
    sample: "https://istoc.example/s/1",
  },
];

// ── Türkçe arama katlama ────────────────────────────────────────────────
test("fold: SİPARİŞ, sipariş ve siparis aynı anahtara iner", () => {
  assert.equal(fold("SİPARİŞ"), "siparis");
  assert.equal(fold("sipariş"), "siparis");
  assert.equal(fold("Siparis"), "siparis");
  assert.equal(fold("IŞIK ÇÖĞÜ"), "isik cogu");
  assert.equal(fold(null), "");
});

test("filterEvents: Türkçe duyarlı arama ad, anahtar ve modülde arar", () => {
  const byUpper = filterEvents(SEED_EVENTS, { q: "SİPARİŞ" }).map((e) => e.key);
  const byAscii = filterEvents(SEED_EVENTS, { q: "siparis" }).map((e) => e.key);
  assert.deepEqual(byUpper, byAscii);
  assert.ok(byUpper.includes("order.confirmed"));
  assert.ok(byUpper.length >= 3);
  assert.deepEqual(
    filterEvents(SEED_EVENTS, { q: "identity.otp" }).map((e) => e.key),
    ["identity.otp"]
  );
});

test("filterEvents: kanal, yayın, çeviri ve gönderim filtreleri", () => {
  assert.equal(filterEvents(SEED_EVENTS, { channel: "sms" }).length, 3);
  assert.equal(filterEvents(SEED_EVENTS, { publish: "taslak" }).length, 3);
  assert.equal(filterEvents(SEED_EVENTS, { publish: "yayinda" }).length, 23);
  assert.equal(filterEvents(SEED_EVENTS, { publish: "yayinda-taslak" }).length, 1);
  assert.equal(filterEvents(SEED_EVENTS, { translation: "var" }).length, 19);
  assert.equal(filterEvents(SEED_EVENTS, { translation: "tam" }).length, 7);
  assert.ok(
    filterEvents(SEED_EVENTS, { delivery: "ozetlenebilir" }).every(
      (e) => e.delivery === "ozetlenebilir"
    )
  );
  assert.equal(filterEvents(SEED_EVENTS, { module: "rfq" }).length, 3);
});

// ── Sayaç türetme ──────────────────────────────────────────────────────
test("stats: sayaçlar olay listesinden türer (26 olaylık sözleşme)", () => {
  assert.deepEqual(stats(SEED_EVENTS), {
    total: 26,
    email: 22,
    push: 14,
    sms: 3,
    published: 23,
    draft: 3,
    pendingDraft: 1,
    missingLang: 19,
  });
  assert.equal(stats([]).total, 0);
  // Liste değişince sayaç da değişir — ayrı bir sayaç tutulmuyor.
  const withoutSms = SEED_EVENTS.map((e) => ({ ...e, channels: { ...e.channels, sms: "kapali" } }));
  assert.equal(stats(withoutSms).sms, 0);
});

test("activeFilterChips ve listCountLabel", () => {
  assert.deepEqual(activeFilterChips({ q: " kargo ", channel: "push" }), [
    { key: "q", text: "Arama: kargo" },
    { key: "channel", text: "Kanal: Push" },
  ]);
  assert.equal(
    listCountLabel({ total: 26, matched: 26, shown: 10, filtered: false }),
    "26 olaydan 1–10 gösteriliyor"
  );
  assert.equal(
    listCountLabel({ total: 26, matched: 3, shown: 3, filtered: true }),
    "3 sonuç (26 olaydan) · 1–3 gösteriliyor"
  );
  assert.equal(
    listCountLabel({ total: 26, matched: 0, shown: 0, filtered: true }),
    "0 sonuç · 26 olaydan"
  );
});

// ── Kanal durumu → özet cümle ─────────────────────────────────────────
test("ruleSentence: kanal durumlarından türeyen cümle", () => {
  assert.equal(
    ruleSentence({ inapp: "zorunlu", email: "zorunlu", push: "secmeli", sms: "kapali" }),
    "Kullanıcı kapatabilir: Push; zorunlu: Uygulama içi, E-posta; gönderilmiyor: SMS."
  );
  assert.equal(
    ruleSentence({ inapp: "zorunlu", email: "zorunlu", push: "kapali", sms: "kapali" }),
    "Zorunlu bildirim: kullanıcı hiçbir kanalı kapatamaz; zorunlu: Uygulama içi, E-posta; gönderilmiyor: Push, SMS."
  );
  assert.equal(ruleSentence({}), "Gönderilmiyor: Uygulama içi, E-posta, Push, SMS.");
});

test("hasOpenChannel ve channelPayload: defaults yalnız seçmeli kanalları taşır", () => {
  assert.equal(hasOpenChannel({ inapp: "kapali", email: "kapali" }), false);
  assert.equal(hasOpenChannel({ sms: "zorunlu" }), true);
  assert.deepEqual(
    channelPayload({
      channels: { inapp: "zorunlu", email: "secmeli", push: "secmeli", sms: "kapali" },
      defaults: { email: false, sms: true },
      delivery: "aninda",
    }),
    {
      channels: { inapp: "zorunlu", email: "secmeli", push: "secmeli", sms: "kapali" },
      defaults: { email: false, push: true },
      delivery: "aninda",
    }
  );
});

test("translationSummary: 3/4 dil + eksik dil", () => {
  const s = translationSummary({ langs: { tr: "hazir", en: "hazir", ar: "eksik", ru: "hazir" } });
  assert.equal(s.count, "3/4 dil");
  assert.equal(s.rest, "AR eksik");
  assert.equal(s.tone, "err");
  assert.equal(
    translationSummary({ langs: { tr: "hazir", en: "hazir", ar: "hazir", ru: "hazir" } }).rest,
    "tümü hazır"
  );
});

// ── Şablon motoru ──────────────────────────────────────────────────────
test("tokens / expand: değerler kaçışlanır, tanımsız değişken işaretlenir", () => {
  assert.deepEqual(
    tokens("{{a}} {{#each list}}{{item.x}}{{/each}}").map((t) => t.type),
    ["var", "open", "var", "close"]
  );
  const known = new Set(["name"]);
  assert.equal(
    expand("Merhaba {{name}}", { name: "<b>Ali</b>" }, known),
    "Merhaba &lt;b&gt;Ali&lt;/b&gt;"
  );
  assert.match(expand("{{nope}}", {}, known), /nt-bad/);
  assert.equal(expand("<p>{{name}}</p>", { name: "A&B" }, known, true), "<p>A&amp;B</p>");
  assert.equal(expand("<i>x</i>", {}, known, false), "&lt;i&gt;x&lt;/i&gt;");
});

test("expand: döngü ve iç içe döngü", () => {
  const known = new Set(["groups", "group.title", "group.items", "item.title"]);
  const scope = {
    groups: [
      { title: "A", items: [{ title: "1" }, { title: "2" }] },
      { title: "B", items: [] },
    ],
  };
  assert.equal(
    expand(
      "{{#each groups}}[{{group.title}}:{{#each group.items}}{{item.title}}{{/each}}]{{/each}}",
      scope,
      known
    ),
    "[A:12][B:]"
  );
});

test("plainFill, sampleScope ve htmlToText", () => {
  assert.equal(
    plainFill("No {{order_no}} {{x}}", sampleScope(VARS), knownNames(VARS)),
    "No TH-24081 {{x}}"
  );
  assert.equal(
    htmlToText(
      '<h1>Başlık</h1>\n<p>Merhaba {{buyer_name}}</p><p><a class="cta" href="{{order_url}}">Aç</a></p>'
    ),
    "Başlık\n\nMerhaba {{buyer_name}}\nAç: {{order_url}}"
  );
});

// ── SMS segment sayacı ────────────────────────────────────────────────
test("smsInfo: GSM-7 160/153, Unicode 70/67", () => {
  assert.equal(smsInfo("").segments, 0);
  assert.deepEqual(
    (({ len, unicode, segments, single }) => ({ len, unicode, segments, single }))(
      smsInfo("a".repeat(160))
    ),
    { len: 160, unicode: false, segments: 1, single: 160 }
  );
  assert.equal(smsInfo("a".repeat(161)).segments, 2);
  assert.equal(smsInfo("a".repeat(307)).segments, 3);
  // GSM uzatma tablosu iki karakter sayılır.
  assert.equal(smsInfo("€[]").len, 6);
  const tr = smsInfo("ş".repeat(70));
  assert.equal(tr.unicode, true);
  assert.equal(tr.turkish, true);
  assert.equal(tr.segments, 1);
  assert.equal(smsInfo("ş".repeat(71)).segments, 2);
  // ö, ü, Ç GSM-7'de var.
  assert.equal(smsInfo("öüÇÖÜ").unicode, false);
});

test("smsInfo: ₺ kararı tek yerden ayarlanır (onaylanmamış varsayılan: Unicode sayılır)", () => {
  assert.equal(NOTIFICATION_TEMPLATE_POLICY.smsCurrency.sendAsText, false);
  assert.equal(smsInfo("Tutar ₺10").unicode, true);
  const asText = smsInfo("Tutar ₺10", { symbol: "₺", text: "TL", sendAsText: true });
  assert.equal(asText.unicode, false);
  assert.equal(asText.len, "Tutar TL10".length);
  assert.equal(simplifyTurkish("şŞğĞıİç öüÇ"), "sSgGiIc öüÇ");
});

// ── Doğrulama sözlüğü: engelleyici / uyarı ayrımı ─────────────────────
test("severityOf: engelleyici ve uyarı türleri", () => {
  for (const kind of [
    "unknown_variable",
    "missing_required_variable",
    "empty_required_field",
    "invalid_url",
    "missing_action_label",
    "missing_action_url",
    "unclosed_loop",
  ])
    assert.equal(severityOf(kind), "blocking", kind);
  for (const kind of ["too_long", "missing_translation", "sms_unicode", "sms_segments"])
    assert.equal(severityOf(kind), "warning", kind);
  assert.equal(severityOf("missing_event_data"), "info");
  // Karar değişirse tek yerden: politika.
  assert.equal(
    severityOf("missing_translation", { missingTranslationBlocksPublish: true }),
    "blocking"
  );
});

test("validateScope: tanımsız değişken, eksik zorunlu değişken, boş alan", () => {
  const issues = validateScope(
    { subject: "", preheader: "", html: "<p>Merhaba {{buyer_name}} {{ordr_no}}</p>", text: "" },
    { channel: "email", lang: "tr", variables: VARS, required: ["buyer_name", "order_no"] }
  );
  const kinds = issues.map((i) => i.kind).sort();
  assert.deepEqual(kinds, [
    "empty_required_field",
    "missing_required_variable",
    "unknown_variable",
  ]);
  const unknown = issues.find((i) => i.kind === "unknown_variable");
  assert.equal(unknown.suggestion, "order_no");
  assert.equal(unknown.field, "html");
  assert.ok(issues.every((i) => i.severity === "blocking"));
});

test("validateScope: bağlantı, düğme, döngü, uzunluk, SMS", () => {
  const ctx = { lang: "tr", variables: VARS, required: [] };
  const inapp = validateScope(
    { title: "x".repeat(81), message: "m", action_label: "", action_url: "http://x.example" },
    { ...ctx, channel: "inapp" }
  );
  assert.deepEqual(inapp.map((i) => `${i.kind}:${i.severity}`).sort(), [
    "invalid_url:blocking",
    "missing_action_label:blocking",
    "too_long:warning",
  ]);
  const label = validateScope(
    { title: "t", message: "m", action_label: "Aç", action_url: "" },
    { ...ctx, channel: "inapp" }
  );
  assert.deepEqual(
    label.map((i) => i.kind),
    ["missing_action_url"]
  );
  const loop = validateScope(
    { title: "t", body: "{{#each groups}} x" },
    { ...ctx, channel: "push", variables: [...VARS, { name: "groups", type: "loop" }] }
  );
  assert.deepEqual(
    loop.map((i) => i.kind),
    ["unclosed_loop"]
  );
  const html = validateScope(
    { subject: "s", html: '<p><a href="javascript:alert(1)">Aç</a><a href="/yol"></a></p>' },
    { ...ctx, channel: "email" }
  );
  assert.deepEqual(html.map((i) => i.kind).sort(), ["invalid_url", "missing_action_label"]);
  const sms = validateScope({ text: `Odeme ${"a".repeat(200)}` }, { ...ctx, channel: "sms" });
  assert.deepEqual(
    sms.map((i) => `${i.kind}:${i.severity}`),
    ["sms_segments:warning"]
  );
  const smsTr = validateScope({ text: "Şifre" }, { ...ctx, channel: "sms" });
  assert.deepEqual(
    smsTr.map((i) => i.kind),
    ["sms_unicode"]
  );
  assert.deepEqual(validateScope(null, { ...ctx, channel: "sms" }), []);
});

test("validUrl: https, kök-göreli yol ve bağlantı değişkeni", () => {
  assert.equal(validUrl("https://istoc.example/a", VARS), true);
  assert.equal(validUrl("/siparis/1", VARS), true);
  assert.equal(validUrl("{{order_url}}", VARS), true);
  assert.equal(validUrl("{{buyer_name}}", VARS), false);
  assert.equal(validUrl("http://istoc.example", VARS), false);
  assert.equal(validUrl("//evil.example", VARS), false);
  assert.equal(validUrl("javascript:alert(1)", VARS), false);
});

test("validateAll + splitIssues: hazır olmayan çeviri uyarıdır, yayını engellemez", () => {
  const event = {
    channels: { inapp: "zorunlu", email: "kapali", push: "kapali", sms: "kapali" },
    langs: { tr: "hazir", en: "bekliyor", ar: "eksik", ru: "hazir" },
  };
  const draft = {
    inapp: {
      tr: { title: "T", message: "{{order_no}}", action_label: "", action_url: "" },
      en: null,
      ar: null,
      ru: null,
    },
  };
  const { blocking, warnings } = splitIssues(
    validateAll(event, draft, { variables: VARS, requiredByChannel: { inapp: ["order_no"] } })
  );
  assert.equal(blocking.length, 0);
  assert.deepEqual(
    warnings.map((w) => `${w.kind}:${w.lang}:${w.state}`),
    ["missing_translation:en:bekliyor", "missing_translation:ar:eksik"]
  );
});

test("describeIssue: tek sözlük — tür, açıklama, kapsam, çözüm", () => {
  const issue = {
    kind: "unknown_variable",
    severity: "blocking",
    channel: "email",
    lang: "tr",
    field: "text",
    variable: "ordr_no",
    suggestion: "order_no",
  };
  assert.deepEqual(describeIssue(issue), {
    title: "Tanımsız değişken",
    text: "{{ordr_no}} bu olayın değişkenleri arasında yok; gönderimde boş kalır.",
    fix: "{{order_no}} ile değiştirin.",
    scope: "E-posta · TR",
  });
  assert.equal(
    issueSentence({ kind: "missing_translation", channel: null, lang: "ar", state: "eksik" }),
    "Çeviri eksik: AR içeriği yok; bu dildeki kullanıcıya TR içerik gider. Tüm kanallar · AR Çözüm: Kaynak dilden kopyalayıp çeviri isteyin."
  );
  // Sözlükte olmayan (sunucudan gelen) türde sunucunun mesajı gösterilir.
  assert.equal(
    describeIssue({ kind: "new_kind", message: "Sunucu mesajı", channel: "sms", lang: "en" }).text,
    "Sunucu mesajı"
  );
});

// ── Fark ─────────────────────────────────────────────────────────────
test("diffSegments / fieldDiffs / changedFieldList", () => {
  const d = diffSegments("Siparişiniz onaylandı", "Siparişiniz onaylandı: {{order_no}}");
  assert.deepEqual(
    d.old.filter((s) => s.op === "-").map((s) => s.text),
    ["onaylandı"]
  );
  assert.ok(d.neu.some((s) => s.op === "+" && s.text.includes("{{order_no}}")));
  const rows = fieldDiffs("push", { title: "A", body: "x" }, { title: "A", body: "y" });
  assert.equal(rows.changed, 1);
  assert.deepEqual(
    rows.rows.map((r) => r.state),
    ["aynı", "değişti"]
  );
  assert.equal(fieldDiffs("push", null, null).empty, true);
  const event = { channels: { inapp: "kapali", email: "kapali", push: "zorunlu", sms: "kapali" } };
  const a = { push: { tr: { title: "A", body: "x" }, en: null, ar: null, ru: null } };
  const b = {
    push: { tr: { title: "A", body: "y" }, en: { title: "E", body: "e" }, ar: null, ru: null },
  };
  assert.deepEqual(
    changedFieldList(event, a, b).map((c) => c.text),
    ["Gövde (Push · TR)", "Push · EN eklendi"]
  );
  assert.equal(hasDraftDiff(a, a), false);
  assert.equal(hasDraftDiff(a, b), true);
  assert.equal(hasDraftDiff(null, a), true);
});

// ── Önizleme ─────────────────────────────────────────────────────────
test("önizleme: dil düşmesi ve eksik olay verisi", () => {
  const tree = { push: { tr: { title: "Sipariş {{order_no}}", body: "b" }, ar: null } };
  assert.deepEqual(resolvePreviewContent(tree, "push", "ar"), {
    data: tree.push.tr,
    lang: "tr",
    fell: true,
  });
  const base = {
    event: { channels: { push: "zorunlu" } },
    tree,
    channel: "push",
    variables: VARS,
    required: ["order_no"],
    sanitize: (h) => h,
  };
  const ok = buildPreview({ ...base, lang: "ar" });
  assert.equal(ok.status, "ok");
  assert.equal(ok.fell, true);
  assert.equal(ok.parts.titleHtml, "Sipariş TH-24081");
  assert.deepEqual(buildPreview({ ...base, lang: "tr", sample: "missing" }), {
    status: "missing-data",
    lang: "tr",
    fell: false,
    missingVariable: "order_no",
  });
  assert.equal(buildPreview({ ...base, channel: "sms", lang: "tr" }).status, "empty");
});

// ── Yetki ────────────────────────────────────────────────────────────
test("resolveTemplateRole: oturumdan şablon rolü", () => {
  assert.equal(resolveTemplateRole({ isAdmin: true, roles: [] }), "super-admin");
  assert.equal(
    resolveTemplateRole({ isAdmin: false, roles: ["Notification Content Manager"] }),
    "icerik-yoneticisi"
  );
  assert.equal(
    resolveTemplateRole({ isAdmin: false, roles: ["Notification Viewer"] }),
    "salt-okunur"
  );
  assert.equal(
    resolveTemplateRole({
      isAdmin: false,
      roles: ["Notification Viewer", "Notification Content Manager"],
    }),
    "icerik-yoneticisi"
  );
  assert.equal(resolveTemplateRole({ isAdmin: false, roles: ["Seller Owner"] }), null);
  assert.equal(resolveTemplateRole(null), null);
});

test("roleCan / publishMode / canRestore / denyReason", () => {
  assert.deepEqual(
    ["goruntule", "duzenle", "yayinla", "kanal"].map((a) => roleCan("super-admin", a)),
    [true, true, true, true]
  );
  assert.deepEqual(
    ["goruntule", "duzenle", "yayinla", "kanal"].map((a) => roleCan("icerik-yoneticisi", a)),
    [true, true, false, false]
  );
  assert.deepEqual(
    ["goruntule", "duzenle", "yayinla", "kanal"].map((a) => roleCan("salt-okunur", a)),
    [true, false, false, false]
  );
  assert.equal(roleCan(null, "goruntule"), false);
  assert.equal(roleCan("super-admin", ""), false);
  assert.equal(roleCan("uydurma", "duzenle"), false);
  assert.equal(publishMode("super-admin"), "publish");
  assert.equal(publishMode("icerik-yoneticisi"), "request");
  assert.equal(publishMode("salt-okunur"), "none");
  // Onay akışı kararı tek yerden kapatılabilir.
  assert.equal(
    publishMode("icerik-yoneticisi", { ...NOTIFICATION_TEMPLATE_POLICY, approvalFlow: false }),
    "none"
  );
  assert.equal(canRestore("super-admin"), true);
  assert.equal(canRestore("icerik-yoneticisi"), false);
  assert.equal(
    canRestore("icerik-yoneticisi", {
      ...NOTIFICATION_TEMPLATE_POLICY,
      restoreRequires: "duzenle",
    }),
    true
  );
  assert.equal(denyReason("super-admin", "kanal"), "");
  assert.equal(
    denyReason("icerik-yoneticisi", "kanal"),
    "Kanal kararını yalnız Süper admin değiştirir."
  );
  assert.deepEqual(accessTags(), ["admin", "Notification Content Manager", "Notification Viewer"]);
});

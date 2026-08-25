import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { FOCUSABLE_SELECTOR, focusablesIn, restoreFocus, trapTabKey } from "../focusTrap.js";
import { PAGE_MAIN_ID } from "../../../constants/layout.js";

/**
 * Odak tuzağı ortak yardımcıları — NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ:
 *
 *   ÖLÇÜLDÜ  — `focusablesIn`in eleme kuralı (disabled / aria-hidden),
 *              `trapTabKey`in SINIR davranışı (ilk öge + Shift, son öge + Tab,
 *              aradaki ögeler, tek ögeli ve BOŞ kap) ve `restoreFocus`un
 *              bağlantısı kopmuş hedefte ana içeriğe düşmesi.
 *   ÖLÇÜLMEDİ — tarayıcının GERÇEK odak sırası ve `:focus-visible` halkasının
 *              görünürlüğü. Bunlar düzen/etkileşim gerektirir; burada sahte
 *              DOM var. Bu dosya "hangi ögeler aday" ve "sınırda ne oluyor"
 *              sorularını sınıyor.
 *
 * ## Bu dosyanın var oluş sebebi
 *
 * `focusTrap.js`in baş yorumu bir tur boyunca "node --test ile doğrudan test
 * edilebilir" diyerek AYRI DOSYA olmayı gerekçelendirdi — ama test yoktu.
 * Elemenin ve sınır davranışının hiçbiri ekranda görünmez: `aria-hidden`
 * filtresi düşse Tab gizli ögeye takılır, sınır karşılaştırması yanlış olsa
 * odak modalden kaçar; ikisi de "çalışıyor gibi" görünür. Gerekçe artık
 * gerçek.
 */

/** Odaklanabilir sahte öge — `focus()` çağrıldığında adını kaydeder. */
function el(name, { disabled = false, ariaHidden = null, isConnected = true } = {}) {
  return {
    name,
    disabled,
    isConnected,
    focused: 0,
    getAttribute: (attr) => (attr === "aria-hidden" ? ariaHidden : null),
    focus() {
      this.focused += 1;
      focusLog.push(this.name);
    },
  };
}

/** Yalnız `querySelectorAll` sunan sahte kap — Vue/DOM gerekmiyor. */
function container(children) {
  return {
    lastSelector: null,
    querySelectorAll(selector) {
      this.lastSelector = selector;
      return children;
    },
  };
}

let focusLog = [];

/** `document` sahtesi: `activeElement` ve `getElementById` yeter. */
function stubDocument({ activeElement = null, main = null } = {}) {
  globalThis.document = {
    activeElement,
    getElementById: (id) => (id === PAGE_MAIN_ID ? main : null),
  };
}

afterEach(() => {
  focusLog = [];
  delete globalThis.document;
});

/** Tab olayı sahtesi — `preventDefault` sayılıyor. */
function tabEvent(shiftKey = false) {
  return {
    shiftKey,
    prevented: 0,
    preventDefault() {
      this.prevented += 1;
    },
  };
}

// ── focusablesIn ─────────────────────────────────────────────

test("kap yoksa liste BOŞ — çağıran null kontrolü yazmak zorunda değil", () => {
  assert.deepEqual(focusablesIn(null), []);
  assert.deepEqual(focusablesIn(undefined), []);
  assert.deepEqual(focusablesIn({ querySelectorAll: () => null }), []);
});

test("disabled ve aria-hidden ögeler ELENİR, sıra korunur", () => {
  const kept1 = el("ilk");
  const kept2 = el("son");
  const list = focusablesIn(
    container([
      kept1,
      el("kilitli", { disabled: true }),
      el("gizli", { ariaHidden: "true" }),
      // `aria-hidden="false"` gizlemez — dize karşılaştırması bunu ayırt etmeli.
      el("görünür", { ariaHidden: "false" }),
      kept2,
    ])
  );

  assert.deepEqual(
    list.map((e) => e.name),
    ["ilk", "görünür", "son"]
  );
});

test("seçici tabindex=-1'i DIŞARIDA bırakır, contenteditable=false'ı saymaz", () => {
  const kap = container([]);
  focusablesIn(kap);

  // Kap'a gerçekten ortak seçici gidiyor mu (kopya seçici sızmasın).
  assert.equal(kap.lastSelector, FOCUSABLE_SELECTOR);
  assert.match(FOCUSABLE_SELECTOR, /\[tabindex\]:not\(\[tabindex="-1"\]\)/);
  assert.match(FOCUSABLE_SELECTOR, /\[contenteditable\]:not\(\[contenteditable="false"\]\)/);
  for (const token of ["button", "[href]", "input", "select", "textarea"]) {
    assert.ok(FOCUSABLE_SELECTOR.includes(token), `seçicide eksik: ${token}`);
  }
});

// ── trapTabKey — sınır davranışı ─────────────────────────────

test("BOŞ kapta olaya dokunulmaz — tarayıcı davranışı sürer", () => {
  stubDocument();
  const e = tabEvent();
  trapTabKey(e, container([]));
  assert.equal(e.prevented, 0);
  assert.deepEqual(focusLog, []);
});

test("son ögede Tab → ilk ögeye sarar", () => {
  const first = el("ilk");
  const last = el("son");
  stubDocument({ activeElement: last });

  const e = tabEvent();
  trapTabKey(e, container([first, el("orta"), last]));

  assert.equal(e.prevented, 1);
  assert.deepEqual(focusLog, ["ilk"]);
});

test("ilk ögede Shift+Tab → son ögeye sarar", () => {
  const first = el("ilk");
  const last = el("son");
  stubDocument({ activeElement: first });

  const e = tabEvent(true);
  trapTabKey(e, container([first, el("orta"), last]));

  assert.equal(e.prevented, 1);
  assert.deepEqual(focusLog, ["son"]);
});

test("aradaki ögede Tab da Shift+Tab da SERBEST — tuzak sınırda çalışır", () => {
  const first = el("ilk");
  const middle = el("orta");
  const last = el("son");
  stubDocument({ activeElement: middle });

  for (const shift of [false, true]) {
    const e = tabEvent(shift);
    trapTabKey(e, container([first, middle, last]));
    assert.equal(e.prevented, 0, `shift=${shift}`);
  }
  assert.deepEqual(focusLog, []);
});

test("tek ögeli kapta odak kendine döner — iki yön de kapalı", () => {
  const only = el("tek");
  stubDocument({ activeElement: only });

  for (const shift of [false, true]) {
    const e = tabEvent(shift);
    trapTabKey(e, container([only]));
    assert.equal(e.prevented, 1, `shift=${shift}`);
  }
  assert.deepEqual(focusLog, ["tek", "tek"]);
});

test("odak kapta DEĞİLKEN (ilk/son değil) olay serbest bırakılır", () => {
  stubDocument({ activeElement: el("dışarıda") });
  const e = tabEvent();
  trapTabKey(e, container([el("ilk"), el("son")]));
  assert.equal(e.prevented, 0);
});

// ── restoreFocus ─────────────────────────────────────────────

test("bağlı tetikleyici varsa odak ONA döner, ana içerik rahatsız edilmez", () => {
  const main = el("main");
  const trigger = el("tetikleyici");
  stubDocument({ main });

  restoreFocus(trigger);

  assert.deepEqual(focusLog, ["tetikleyici"]);
  assert.equal(main.focused, 0);
});

test("tetikleyici DOM'dan kalkmışsa odak ana içeriğe düşer — body'ye değil", () => {
  const main = el("main");
  stubDocument({ main });

  restoreFocus(el("kalkmış", { isConnected: false }));
  restoreFocus(null);

  assert.deepEqual(focusLog, ["main", "main"]);
});

test("ana içerik de yoksa sessizce geçilir — kapanış akışı patlamaz", () => {
  stubDocument({ main: null });
  assert.doesNotThrow(() => restoreFocus(null));
});

/**
 * Frappe `depends_on` expression için güvenli evaluator.
 *
 * Eski kod `new Function("doc", "return (...)" )(formData)` ile DocType
 * meta'sından gelen ham string'i çalıştırıyordu — backend kompromize olursa
 * (veya Customize Form üzerinden script enjekte edilirse) admin tarayıcıda
 * tam arbitrary code execution oluyordu.
 *
 * Bu evaluator yalnız Frappe convention'unun ihtiyaç duyduğu dar grameri
 * destekler:
 *   - Atom:    `doc.<fieldname>` | string | number | true | false | null | array-literal
 *   - Array:   `[atom, atom, ...]`   (sadece literal değerler — string/number/bool/null)
 *   - Method:  `<array>.includes(<atom>)`   (yalnızca `includes` izinli)
 *   - Unary:   `!atom`
 *   - Compare: atom OP atom   (OP ∈ == != === !== < > <= >=)
 *   - Logic:   expr (&& | ||) expr
 *   - Group:   ( expr )
 *
 * Function call (`.includes` hariç), member access zinciri (`doc.foo.bar`),
 * computed access (`doc['x']`), arithmetic, template literal — hepsi reddedilir.
 *
 * Frappe'nin yaygın pattern'ları:
 *   - `eval:doc.status=="Approved"`
 *   - `eval:!doc.parent`
 *   - `eval:['a','b','c'].includes(doc.widget_type)`
 *   - `eval:!['quick_links'].includes(doc.widget_type)`
 *   - `eval:[1,2,3].includes(doc.priority) && doc.urgent`
 *
 * Geçersiz ifade → "true" döner (fail-open, alanı gizlemekten iyidir).
 */

const ALLOWED_LITERALS = new Set(["true", "false", "null", "undefined"]);
const COMPARE_OPS = new Set(["==", "!=", "===", "!==", "<", ">", "<=", ">="]);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    // whitespace
    if (/\s/.test(ch)) { i++; continue; }
    // string
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) {
          value += src[j + 1];
          j += 2;
        } else {
          value += src[j];
          j++;
        }
      }
      if (j >= src.length) return null; // unterminated
      tokens.push({ type: "string", value });
      i = j + 1;
      continue;
    }
    // number (negative literal sadece "(", "[", ",", op başında atomtır;
    // başka bağlamlarda `-` reddedilir. Tokenizer'da prev-token bakarak ayır.)
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = parseFloat(src.slice(i, j));
      if (!isFinite(num)) return null;
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }
    if (ch === "-" && /[0-9]/.test(src[i + 1] || "")) {
      // Unary minus literal — yalnız atom başlangıç pozisyonlarında izinli
      const last = tokens[tokens.length - 1];
      const isAtomStart =
        !last ||
        last.type === "op" ||
        last.type === "lparen" ||
        last.type === "lbracket" ||
        last.type === "comma";
      if (!isAtomStart) return null;
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = parseFloat(src.slice(i, j));
      if (!isFinite(num)) return null;
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }
    // identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const ident = src.slice(i, j);
      // doc.fieldname? next must be `.` followed by identifier
      if (ident === "doc" && src[j] === ".") {
        j++; // skip dot
        const fieldStart = j;
        while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
        if (j === fieldStart) return null; // dot but no fieldname
        // Reject chained access: next char must NOT be another `.` followed by ident
        if (src[j] === ".") return null;
        const field = src.slice(fieldStart, j);
        // Reject prototype-pollution-style names
        if (field === "constructor" || field === "__proto__" || field === "prototype") {
          return null;
        }
        tokens.push({ type: "doc-field", name: field });
        i = j;
        continue;
      }
      if (ALLOWED_LITERALS.has(ident)) {
        tokens.push({
          type: "literal",
          value: ident === "true" ? true : ident === "false" ? false : null,
        });
        i = j;
        continue;
      }
      // `includes` method adı — sadece method-call bağlamında geçerli
      if (ident === "includes") {
        tokens.push({ type: "method-name", name: "includes" });
        i = j;
        continue;
      }
      // Any other identifier rejected
      return null;
    }
    // 2-3 char operators
    const two = src.slice(i, i + 2);
    const three = src.slice(i, i + 3);
    if (three === "===" || three === "!==") {
      tokens.push({ type: "op", value: three });
      i += 3;
      continue;
    }
    if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "&&" || two === "||") {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if (ch === "<" || ch === ">") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "op", value: "!" });
      i++;
      continue;
    }
    if (ch === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (ch === "[") { tokens.push({ type: "lbracket" }); i++; continue; }
    if (ch === "]") { tokens.push({ type: "rbracket" }); i++; continue; }
    if (ch === ",") { tokens.push({ type: "comma" }); i++; continue; }
    if (ch === ".") { tokens.push({ type: "dot" }); i++; continue; }
    // Any other character rejected
    return null;
  }
  return tokens;
}

// Recursive descent parser → returns evaluation function
function makeParser(tokens) {
  let pos = 0;
  function peek(offset = 0) { return tokens[pos + offset]; }
  function next() { return tokens[pos++]; }

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().type === "op" && peek().value === "||") {
      next();
      const right = parseAnd();
      const l = left, r = right;
      left = (doc) => l(doc) || r(doc);
    }
    return left;
  }
  function parseAnd() {
    let left = parseEquality();
    while (peek() && peek().type === "op" && peek().value === "&&") {
      next();
      const right = parseEquality();
      const l = left, r = right;
      left = (doc) => l(doc) && r(doc);
    }
    return left;
  }
  function parseEquality() {
    let left = parseUnary();
    while (peek() && peek().type === "op" && COMPARE_OPS.has(peek().value)) {
      const op = next().value;
      const right = parseUnary();
      const l = left, r = right;
      left = (doc) => {
        const a = l(doc);
        const b = r(doc);
        switch (op) {
          case "==": return a == b; // eslint-disable-line eqeqeq
          case "!=": return a != b; // eslint-disable-line eqeqeq
          case "===": return a === b;
          case "!==": return a !== b;
          case "<": return a < b;
          case ">": return a > b;
          case "<=": return a <= b;
          case ">=": return a >= b;
          default: return false;
        }
      };
    }
    return left;
  }
  function parseUnary() {
    if (peek() && peek().type === "op" && peek().value === "!") {
      next();
      const inner = parseUnary();
      return (doc) => !inner(doc);
    }
    return parseAtomWithMethod();
  }

  /** Atom + opsiyonel `.includes(arg)` method call. */
  function parseAtomWithMethod() {
    let base = parseAtom();
    // .includes(arg) — yalnız izinli method
    while (peek() && peek().type === "dot") {
      next();
      const m = next();
      if (!m || m.type !== "method-name" || m.name !== "includes") {
        throw new Error("unsupported method call");
      }
      const lp = next();
      if (!lp || lp.type !== "lparen") throw new Error("missing ( after .includes");
      const arg = parseOr();
      const rp = next();
      if (!rp || rp.type !== "rparen") throw new Error("missing ) after .includes arg");
      const arrFn = base;
      base = (doc) => {
        const arr = arrFn(doc);
        if (!Array.isArray(arr)) return false;
        return arr.includes(arg(doc));
      };
    }
    return base;
  }

  function parseAtom() {
    const tok = next();
    if (!tok) throw new Error("unexpected end");
    if (tok.type === "lparen") {
      const inner = parseOr();
      const close = next();
      if (!close || close.type !== "rparen") throw new Error("missing )");
      return inner;
    }
    if (tok.type === "lbracket") {
      // Array literal — elements: atom (with no method chain to keep it simple)
      const elements = [];
      if (peek() && peek().type === "rbracket") {
        next(); // empty array
      } else {
        while (true) {
          elements.push(parseUnary());
          const sep = next();
          if (!sep) throw new Error("unterminated array");
          if (sep.type === "rbracket") break;
          if (sep.type !== "comma") throw new Error("expected , or ] in array");
        }
      }
      return (doc) => elements.map((fn) => fn(doc));
    }
    if (tok.type === "string") {
      const v = tok.value;
      return () => v;
    }
    if (tok.type === "number") {
      const v = tok.value;
      return () => v;
    }
    if (tok.type === "literal") {
      const v = tok.value;
      return () => v;
    }
    if (tok.type === "doc-field") {
      const name = tok.name;
      return (doc) => (doc ? doc[name] : undefined);
    }
    throw new Error("unexpected token");
  }

  const evalFn = parseOr();
  if (pos !== tokens.length) throw new Error("trailing tokens");
  return evalFn;
}

/**
 * @param {string} expr — `eval:` prefix'i ile veya o olmadan Frappe depends_on ifadesi
 * @param {object} doc — formData snapshot
 * @returns {boolean}
 */
export function safeEvaluateDependsOn(expr, doc) {
  if (!expr || typeof expr !== "string") return true;
  const code = expr.startsWith("eval:") ? expr.slice(5) : expr;
  const tokens = tokenize(code);
  if (!tokens || tokens.length === 0) return true; // fail-open
  let evalFn;
  try {
    evalFn = makeParser(tokens);
  } catch {
    return true;
  }
  try {
    return !!evalFn(doc || {});
  } catch {
    return true;
  }
}

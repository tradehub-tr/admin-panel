/**
 * Bağımlılıksız Chrome DevTools Protocol istemcisi — T-115 drift ölçümü için.
 *
 * NEDEN PLAYWRIGHT DEĞİL: `admin-panel/frontend`'in `package.json`'ı üç ajan
 * tarafından paylaşılıyor; oraya `playwright` eklemek üçünün de `node_modules`'ını
 * değiştirirdi. Node 24'ün **yerleşik** `WebSocket`'i ve makinede zaten kurulu
 * olan Chrome/Chromium ikilisi yettiği için yeni bağımlılık EKLENMEDİ.
 * Sonuç aynı: gerçek yerleşim motoru, gerçek `getBoundingClientRect()`.
 *
 * Kapsam bilinçli olarak dar: cihaz metriklerini kur, git, seçiciyi ölç.
 * Genel amaçlı bir tarayıcı sarmalayıcısı DEĞİLDİR.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

/** Aday tarayıcı ikilileri — ilk bulunan kullanılır. `CHROME_BIN` hepsini ezer. */
export function findChrome() {
  const explicit = process.env.CHROME_BIN;
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`CHROME_BIN bulunamadı: ${explicit}`);
    return explicit;
  }
  const home = homedir();
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  // Playwright'ın indirdiği ikili — varsa onu da kabul et (paket bağımlılığı DEĞİL,
  // sadece diskteki bir dosya).
  for (const dir of [join(home, "Library/Caches/ms-playwright"), join(home, ".cache/ms-playwright")]) {
    if (!existsSync(dir)) continue;
    for (const sub of ["chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
      for (const rev of readdirSync(dir)) {
        const p = join(dir, rev, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("Chrome/Chromium ikilisi bulunamadı — CHROME_BIN ile yol ver.");
}

export class Cdp {
  #ws;
  #next = 1;
  #pending = new Map();
  #listeners = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data));
      if (msg.id !== undefined) {
        const p = this.#pending.get(msg.id);
        if (!p) return;
        this.#pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else p.resolve(msg.result);
        return;
      }
      const set = this.#listeners.get(msg.method);
      if (set) for (const fn of [...set]) fn(msg.params, msg.sessionId);
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error(`WebSocket açılamadı: ${wsUrl}`)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}, sessionId) {
    const id = this.#next++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.#ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
  }

  on(method, fn) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, new Set());
    this.#listeners.get(method).add(fn);
    return () => this.#listeners.get(method).delete(fn);
  }

  once(method, predicate = () => true) {
    return new Promise((resolve) => {
      const off = this.on(method, (params, sessionId) => {
        if (!predicate(params, sessionId)) return;
        off();
        resolve(params);
      });
    });
  }

  close() {
    try { this.#ws.close(); } catch { /* zaten kapalı */ }
  }
}

/** Headless tarayıcıyı başlatır; `{ cdp, kill }` döner. */
export async function launchBrowser({ headless = true, timeoutMs = 30000 } = {}) {
  const bin = findChrome();
  const userDataDir = mkdtempSync(join(tmpdir(), "drift-chrome-"));
  const args = [
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars=false",
    "--force-device-scale-factor=1",
    "--allow-insecure-localhost",
  ];
  if (headless) args.push("--headless=new", "--disable-gpu");
  const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("DevTools uç noktası zaman aşımı")), timeoutMs);
    proc.stderr.on("data", (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Tarayıcı ${code} ile çıktı`)); });
  });

  const cdp = await Cdp.connect(wsUrl);
  const kill = () => {
    cdp.close();
    try { proc.kill("SIGKILL"); } catch { /* zaten öldü */ }
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* geçici dizin */ }
  };
  return { cdp, kill, binary: bin };
}

/** Yeni sekme açar ve ona bağlanır → `sessionId`. */
export async function newPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  return { sessionId, targetId };
}

export async function closePage(cdp, targetId) {
  try { await cdp.send("Target.closeTarget", { targetId }); } catch { /* kapalı */ }
}

/** Cihaz metriklerini uygular (CSS viewport + DPR + mobil bayrağı). */
export async function emulate(cdp, sessionId, { width, height, dpr, mobile }) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: dpr, mobile: !!mobile, screenWidth: width, screenHeight: height,
  }, sessionId);
}

/** Git ve `load` olayını bekle (zaman aşımında sessizce devam eder). */
export async function goto(cdp, sessionId, url, { timeoutMs = 30000 } = {}) {
  const loaded = cdp.once("Page.loadEventFired", (_p, sid) => sid === sessionId);
  const res = await cdp.send("Page.navigate", { url }, sessionId);
  if (res.errorText) throw new Error(`Gidilemedi ${url}: ${res.errorText}`);
  await Promise.race([loaded, new Promise((r) => setTimeout(r, timeoutMs))]);
  return res;
}

/** Sayfa bağlamında ifade değerlendirir; değeri döner. */
export async function evaluate(cdp, sessionId, expression, { timeoutMs = 30000 } = {}) {
  const res = await cdp.send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true, timeout: timeoutMs,
  }, sessionId);
  if (res.exceptionDetails) {
    const d = res.exceptionDetails;
    throw new Error(`Sayfa içi hata: ${d.exception?.description || d.text}`);
  }
  return res.result?.value;
}

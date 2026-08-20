import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import type { APIRequestContext } from "@playwright/test";

/**
 * T-141 taşıması — canlı backend'e karşı yardımcılar.
 *
 * Bütün API çağrıları Playwright'ın `request` context'inden gider: storageState
 * `sid` cookie'sini otomatik taşır, buradaki tek ek iş POST'lar için CSRF
 * başlığını almak. Kötücül baytlar (bomb / polyglot / SVG-XSS) KOD İÇİNDE
 * üretilir — depoya fixture olarak KONMAZ (T-141 kararı).
 */

const API = "/api/method";

/** Oturumun CSRF jetonu — panelin `api.js` ile aynı uç. Bir kez alınır. */
let csrfCache: string | null = null;

export async function csrfToken(request: APIRequestContext): Promise<string> {
  if (csrfCache) return csrfCache;
  const res = await request.get(
    `${API}/tradehub_core.api.v1.auth.get_session_user`
  );
  const body = await res.json();
  const token = body?.message?.csrf_token;
  if (!token) {
    throw new Error(
      `CSRF jetonu alınamadı — oturum düşmüş olabilir. Yanıt: ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  csrfCache = token;
  return token;
}

export interface CallResult {
  status: number;
  /** Frappe gövdesi `message` altında sarar; açılmış hali. */
  message: unknown;
  /** Politika reddinde sunucunun döndürdüğü kod (`upload_error`). */
  uploadError?: string;
  /** Ret metni / exc_type (417 gövdesinden). */
  raw: unknown;
}

/** Frappe whitelisted method POST — panelin `api.callMethod` karşılığı. */
export async function call(
  request: APIRequestContext,
  method: string,
  payload: Record<string, unknown>
): Promise<CallResult> {
  const token = await csrfToken(request);
  const res = await request.post(`${API}/${method}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": token,
    },
    data: payload,
    failOnStatusCode: false,
  });
  const status = res.status();
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = { _text: await res.text() };
  }
  return {
    status,
    message: (body as { message?: unknown }).message,
    uploadError: (body as { upload_error?: string }).upload_error,
    raw: body,
  };
}

/** GET whitelisted method — `api.callMethodGET` karşılığı. */
export async function callGet(
  request: APIRequestContext,
  method: string,
  params: Record<string, string> = {}
): Promise<CallResult> {
  const qs = new URLSearchParams(params).toString();
  const res = await request.get(`${API}/${method}${qs ? `?${qs}` : ""}`, {
    failOnStatusCode: false,
  });
  const status = res.status();
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = { _text: await res.text() };
  }
  return { status, message: (body as { message?: unknown }).message, raw: body };
}

// ── Bayt üreticileri (fixture DEĞİL — çalışma anında) ────────────────────

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "latin1");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Geçerli, küçük (≤~1KB) bir PNG üretir — düz renk. */
export function makePng(width: number, height: number, rgb: [number, number, number] = [40, 90, 200]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = rgb[0];
      row[1 + x * 3 + 1] = rgb[1];
      row[1 + x * 3 + 2] = rgb[2];
    }
    rows.push(row);
  }
  const idat = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Dekompresyon bombası: 12000×12000 (144 MP) İDDİA eden ama içeriği bir avuç
 * bayt olan geçerli PNG başlığı. Pillow başlığı açar (boyutu okur) ama içeriği
 * decode ETMEZ; sunucu `content_gate` 80 MP tavanında reddeder (ölçüldü:
 * `upload_image_bomb`). 30000² denendi ve Pillow'un kendi 89 MP tavanı başlığı
 * bile açmadan düşürdüğü için gate tetiklenmiyordu — 12000² bilinçli seçim.
 */
export function makeBombPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(12000, 0);
  ihdr.writeUInt32BE(12000, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = deflateSync(Buffer.alloc(10), { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** JPEG başlıklı ama gövdesi HTML olan polyglot — içerik kapısı reddetmeli. */
export function makePolyglotJpeg(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from("<html><script>alert(1)</script>", "latin1"),
  ]);
}

/** SVG-XSS: adı `.png` olsa da içi çalıştırılabilir SVG — reddedilmeli. */
export function makeSvgXss(): Buffer {
  return Buffer.from(
    "<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'></svg>",
    "latin1"
  );
}

/** Baytların base64'ü — `upload_media` `content` alanı base64 bekliyor. */
export function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

/** İçeriğin SHA-256'sı (hex) — istemci dedup kontrolünün hesapladığı değer. */
export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Küçük, sıkıştırılMAMIŞ gerçek WebP (34 bayt) — sunucu bunu WebP'ye yeniden
 * ÇEVİRMEZ ("zaten WebP dokunulmaz"), böylece diskteki içerik-adresli ad
 * istemcinin hash'iyle BİREBİR eşleşir ve `find_in_my_library` dedup'ı
 * gerçek çalışır. PNG kullanılamaz: sunucu PNG→WebP çevirir, adres istemci
 * hash'inden sapar (ölçüldü 2026-08-20).
 */
export const TINY_WEBP_B64 =
  "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiAgAAA==";
export function tinyWebp(): Buffer {
  return Buffer.from(TINY_WEBP_B64, "base64");
}

/** `e2e-` önekli, koşum başına benzersiz dosya adı. */
export function e2eName(base: string, ext: string): string {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return `e2e-${base}-${stamp}.${ext}`;
}

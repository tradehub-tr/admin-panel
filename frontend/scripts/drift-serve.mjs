/**
 * T-115 yardımcısı — `tradehubfront/dist`'i nginx gibi servis eden geçici sunucu.
 *
 * NEDEN GEREKLİ: `http://istoc.localhost`'ta koşan storefront imajı **eski bir
 * derlemedir** (bind-mount değil, imajın içinde). Katalog (`placements.json`)
 * ise storefront'un GÜNCEL kaynağından türetildi. İkisi karşılaştırıldığında
 * çıkan fark "katalog yanlış" mı, "yayındaki derleme eski" mi ayırt edilemez.
 * Bu sunucu ikinci ölçüm hedefini verir: güncel kaynaktan üretilmiş `dist/`.
 *
 * `tradehubfront`'a HİÇBİR ŞEY YAZMAZ — yalnız `dist/` klasörünü okur.
 * Veri katmanı (`/api`, `/files`, ...) gerçek backend'e proxy'lenir, böylece
 * iki ölçüm AYNI veriyi görür ve fark yalnız CSS/işaretlemeden gelir.
 *
 * Yönlendirme kuralları `tradehubfront/nginx.conf.template` ve
 * `src/utils/staticPageUrl.ts::STATIC_PAGE_HTML_MAP`'ten birebir alındı.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

/** `staticPageUrl.ts::STATIC_PAGE_HTML_MAP` — ölçümde kullanılan 5 giriş. */
const STATIC_MAP = {
  "/": "/index.html",
  "/urunler": "/pages/products.html",
  "/sepet": "/pages/cart.html",
  "/odeme": "/pages/checkout.html",
};

/** `nginx.conf.template:408-489` — sıra önemli, /dukkan genel /magaza'dan önce. */
const PRETTY = [
  { re: /^\/(?:en\/)?urun\/[^/]+/, html: "/pages/product-detail.html" },
  { re: /^\/(?:en\/)?kategori\/.+/, html: "/pages/categories.html" },
  { re: /^\/(?:en\/)?marka\/.+/, html: "/pages/brand.html" },
  { re: /^\/(?:en\/)?magaza\/[^/]+\/dukkan$/, html: "/pages/seller/seller-shop.html" },
  { re: /^\/(?:en\/)?magaza\/.+/, html: "/pages/seller/seller-storefront.html" },
];

/** Backend'e giden yollar — `vite.config.ts` proxy listesiyle aynı. */
const PROXY_PREFIXES = ["/api/", "/files/", "/private/", "/socket.io/"];

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".map": "application/json", ".webmanifest": "application/manifest+json",
};

function resolveHtml(pathname) {
  if (STATIC_MAP[pathname]) return STATIC_MAP[pathname];
  const m = PRETTY.find((p) => p.re.test(pathname));
  return m ? m.html : null;
}

/**
 * @param {string} distDir  servis edilecek dist klasörü
 * @param {string} backend  proxy hedefi (ör. http://istoc.localhost)
 */
export function startDistServer({ distDir, backend, port = 0 }) {
  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error(`dist/index.html yok: ${distDir} — storefront derlenmemiş.`);
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (PROXY_PREFIXES.some((p) => pathname.startsWith(p))) {
      try {
        const upstream = await fetch(backend + req.url, {
          method: req.method,
          headers: { ...req.headers, host: new URL(backend).host },
          body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
          duplex: "half",
          redirect: "manual",
        });
        res.writeHead(upstream.status, {
          "content-type": upstream.headers.get("content-type") || "application/octet-stream",
        });
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (err) {
        res.writeHead(502).end(`proxy hatası: ${err.message}`);
      }
      return;
    }

    // Önce gerçek dosya, sonra pretty-URL yeniden yazımı.
    let filePath = join(distDir, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      const html = resolveHtml(pathname);
      filePath = html ? join(distDir, html) : join(distDir, "404.html");
    }
    if (!existsSync(filePath)) { res.writeHead(404).end("bulunamadı"); return; }
    res.writeHead(200, {
      "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const { port: actual } = server.address();
      resolve({
        base: `http://127.0.0.1:${actual}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

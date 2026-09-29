import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { pathToFileURL } from 'url'

import { bekleyenModuller } from './scripts/lojistik-mock-haritasi.mjs'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frappeBackend = env.VITE_FRAPPE_BACKEND || 'https://rcistoc.cronbi.com'
  const frappeSocketio = env.VITE_FRAPPE_SOCKETIO || 'https://rcistoc.cronbi.com'
  const isLocalBackend = frappeBackend.includes('localhost')
  const localSiteName = env.FRAPPE_SITE_NAME || 'dev.localhost'
  const lojistikMock = env.VITE_LOGISTICS_MOCK === '1'
  const mockBekleyen = bekleyenModuller(path.resolve(__dirname, 'src/api'))

  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/' : (command === 'build' ? '/panel/' : '/'),
    plugins: [tailwindcss(), vue(), lojistikMockRaporu(command, lojistikMock, mockBekleyen)],
    // Lojistik mock derleme anahtarı (MOGEM-685 F-03). Ürün kararı: Alpha/Beta/RC'de
    // sahte veri olabilir, PROD'da HİÇ olmamalı. `import.meta.env` DEĞİL `define`:
    // sabit Rollup'tan önce yazılıyor, `if (false && …)` dalı ve onun içe aktardığı
    // mock modülleri derleme çıktısından gerçekten atılıyor (storefront'ta ölçüldü).
    // Açanlar: `.env.development`, `npm run build:onizleme`, repo Dockerfile'ı (Alpha/Beta/RC, varsayılan 1).
    // Ayrıntı: `src/api/logisticsMockGate.js`.
    // `__LOJISTIK_MOCK_BEKLEYEN__`: en az bir ucu hâlâ mock'ta olan api modülleri — mock
    // çalışmayan derlemede bu modüllere bağlı ekranlar menüden/route'tan düşer. Kaynaktan
    // okunuyor ki manifest api modüllerini açılış paketine çekmesin.
    define: {
      __LOJISTIK_MOCK__: JSON.stringify(lojistikMock),
      __LOJISTIK_MOCK_BEKLEYEN__: JSON.stringify(mockBekleyen),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // Ön uçtaki tek işçi (`preflight.worker.js`) `{ type: "module" }` ile
    // kuruluyor ve statik `import` içeriyor. Vite'ın üretim varsayılanı
    // `iife`; modül işçisini iife olarak paketlemek `import` cümlesini
    // çalıştırılamaz kılıyor. Biçimi kaynaktaki bildirimle eşitliyoruz.
    worker: {
      format: 'es',
    },
    server: {
      port: 8082,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: frappeBackend,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          ...(isLocalBackend ? { headers: { Host: localSiteName } } : {}),
        },
        '/assets': {
          target: frappeBackend,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          ...(isLocalBackend ? { headers: { Host: localSiteName } } : {}),
        },
        '/files': {
          target: frappeBackend,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          ...(isLocalBackend ? { headers: { Host: localSiteName } } : {}),
        },
        '/private': {
          target: frappeBackend,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          ...(isLocalBackend ? { headers: { Host: localSiteName } } : {}),
        },
        '/socket.io': {
          target: frappeSocketio,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Dart Sass 2.0'da kaldırılacak legacy JS API yerine modern derleyici.
          // sass-embedded kuruluysa o, değilse `sass` paketi kullanılır.
          api: 'modern-compiler',
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // echarts chunk'ı ~760 kB: zaten tree-shake edilmiş (echarts/core + yalnızca
      // kullanılan seri/komponentler) ve useChart.js içinde dinamik import ile
      // sadece dashboard sayfalarında yükleniyor. Eşiği gerçekçi seviyeye çekiyoruz.
      chunkSizeWarningLimit: 800,
    },
  }
})

/**
 * Derleme başında lojistik mock durumunu yazar (MOGEM-685 F-03).
 *
 * Mock kapalı derlemede (PROD) hangi api modüllerinin hâlâ mock beklediği —
 * yani hangi ekranların GİZLENECEĞİ — derleme günlüğünde görünsün; ekranın neden
 * görünmediği panelde sorulmadan cevaplansın. Ekran listesi bu modüllere bağlı
 * manifest kayıtlarıdır (`mockApi`).
 */
function lojistikMockRaporu(command, acik, bekleyen) {
  return {
    name: 'lojistik-mock-raporu',
    async buildStart() {
      if (command !== 'build') return
      const durum = acik
        ? 'AÇIK (önizleme derlemesi — yalnız yerel/Alpha/Beta/RC sunucularında çalışır)'
        : 'KAPALI (PROD derlemesi — sahte veri yok)'
      this.info(`Lojistik mock: ${durum}`)
      if (acik || !bekleyen.length) return
      // Manifest saf veri (göreli `.js` içe aktarımlar, bileşenler tembel) — Node'dan
      // okunabiliyor. Kapının okuduğu iki sabit derlemedekiyle aynı değerlerle kuruluyor.
      Object.assign(globalThis, { __LOJISTIK_MOCK__: false, __LOJISTIK_MOCK_BEKLEYEN__: bekleyen })
      try {
        const manifest = pathToFileURL(path.resolve(__dirname, 'src/router/logisticsScreens.js'))
        const { mockHiddenScreens } = await import(manifest.href)
        const ekranlar = mockHiddenScreens().map((s) => `${s.key} ${s.name}`)
        this.info(
          `Gizli lojistik ekranları (${ekranlar.length}) — mock bekleyen modüller: ` +
            `${bekleyen.join(', ')}:\n  ${ekranlar.join('\n  ')}\n` +
            'Uç yazılıp MOCK satırı false olunca ekran kendiliğinden görünür.'
        )
      } finally {
        delete globalThis.__LOJISTIK_MOCK__
        delete globalThis.__LOJISTIK_MOCK_BEKLEYEN__
      }
    },
  }
}

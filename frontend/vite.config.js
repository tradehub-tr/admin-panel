import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frappeBackend = env.VITE_FRAPPE_BACKEND || 'https://rcistoc.cronbi.com'
  const frappeSocketio = env.VITE_FRAPPE_SOCKETIO || 'https://rcistoc.cronbi.com'
  const isLocalBackend = frappeBackend.includes('localhost')
  const localSiteName = env.FRAPPE_SITE_NAME || 'dev.localhost'

  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/' : (command === 'build' ? '/panel/' : '/'),
    plugins: [tailwindcss(), vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
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

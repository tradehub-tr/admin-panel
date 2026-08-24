import path from "path";
import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

/**
 * Storybook yapılandırması.
 *
 * KAPSAM (24 Ağu 2026 itibarıyla — 367 story):
 *   · `common/`, `common/datatable/`, `form-fields/` — paylaşılan bileşenler
 *   · `components/logistics/` — ekranların SUNUM katmanı (View + Screen deseni,
 *     bkz. CLAUDE.md §1.1). 19'u bir View tarafından kullanılıyor, 13'ü ucu
 *     bekleyen ekranın hazır yarısı — hiçbiri "silinecek prototip" değil.
 *   · `views/logistics/` — teslim edilmiş EKRANLARIN kendisi (store'lu, 65
 *     story). Bunlar gerçek store + gerçek mock zinciriyle koşuyor; koşum
 *     takımı `.storybook/story/harness.js`.
 *
 * Repo'daki 100+ diğer component (CRM, media, SEO) bilinçli olarak DIŞARIDA:
 * çoğu store ve router'a sıkı bağlı, her biri ayrı mock ister ve lojistik
 * hedefine katkısı düşük.
 *
 * @type { import('@storybook/vue3-vite').StorybookConfig }
 */
const config = {
  stories: [
    "../src/components/common/**/*.stories.@(js|mjs)",
    "../src/components/form-fields/**/*.stories.@(js|mjs)",
    "../src/components/logistics/**/*.stories.@(js|mjs)",
    "../src/views/logistics/**/*.stories.@(js|mjs)",
  ],

  addons: ["@storybook/addon-docs", "@storybook/addon-themes"],

  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },

  /**
   * Uygulamanın Vite ayarlarını Storybook'a taşır.
   *
   * Storybook kendi Vite örneğini kurduğu için `vite.config.js` OKUNMAZ —
   * stil zinciri ve alias burada tekrar kurulmazsa component'ler stilsiz
   * render edilir ve `@/...` importları çözülemez.
   */
  viteFinal: async (viteConfig) => {
    // Tailwind v4 eklentisi: uygulamada `@tailwindcss/vite` ile derleniyor,
    // CDN DEĞİL. Buraya eklenmezse utility sınıfları hiç üretilmez.
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];

    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        // SIRA ÖNEMLİ: api mock'u `@` alias'ından ÖNCE gelmeli, yoksa
        // `@/utils/api` genel `@` kuralına takılıp gerçek modüle çözülür.
        //
        // Storybook'ta backend yok; 7 component istek atıyor ve mock olmadan
        // sonsuz "yükleniyor" durumunda kalıyorlar. Tüm istekler tek bir
        // default export'tan geçtiği için (admin-panel CLAUDE.md kuralı) tek
        // alias yeterli — msw gibi bir ağ katmanı taklidine gerek yok.
        {
          find: /^@\/utils\/api$/,
          replacement: path.resolve(__dirname, "mocks/api.js"),
        },
        // Ekran story'lerinin ortak koşum takımı. `src/` ALTINDA DEĞİL:
        // yalnız Storybook'ta çözülen bir alias, story yardımcılarının
        // üretim build'ine sızmasını yapısal olarak imkânsız kılıyor.
        { find: /^@story\//, replacement: `${path.resolve(__dirname, "story")}/` },
        { find: /^@\//, replacement: `${SRC}/` },
        ...(Array.isArray(viteConfig.resolve?.alias) ? viteConfig.resolve.alias : []),
      ],
    };

    viteConfig.css = {
      ...viteConfig.css,
      preprocessorOptions: {
        ...(viteConfig.css?.preprocessorOptions ?? {}),
        scss: {
          // vite.config.js ile aynı: Dart Sass 2.0'da kaldırılacak legacy JS
          // API yerine modern derleyici.
          api: "modern-compiler",
        },
      },
    };

    return viteConfig;
  },
};

export default config;

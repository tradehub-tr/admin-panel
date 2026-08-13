import path from "path";
import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

/**
 * Storybook yapılandırması.
 *
 * KAPSAM: Şimdilik yalnız paylaşılan component'ler story'leniyor
 * (`common/`, `common/datatable/`, `form-fields/` — 27 dosya). Lojistik
 * ekranları Faz D'de `src/components/logistics/` ve `src/views/logistics/`
 * altına eklenecek; glob o zaman genişletilir.
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

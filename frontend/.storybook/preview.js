import { withThemeByClassName } from "@storybook/addon-themes";
import { setup } from "@storybook/vue3-vite";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";

import { applyDocumentDirection } from "../src/i18n";
import ar from "../src/i18n/locales/ar.js";
import en from "../src/i18n/locales/en.js";
import ru from "../src/i18n/locales/ru.js";
import tr from "../src/i18n/locales/tr.js";
import nativeSelectPicker from "../src/plugins/nativeSelectPicker";
import txResize from "../src/plugins/txResize";

// Stil zinciri — src/main.js ile AYNI SIRA.
// Sıra önemli: Tailwind katmanları önce, sonra FontAwesome, en son proje SCSS'i
// (main.scss Tailwind utility'lerini override eden kurallar içeriyor).
import "../src/assets/tailwind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../src/assets/main.scss";

/**
 * i18n — uygulamadakinden farklı olarak SENKRON kuruluyor.
 *
 * Uygulamada `initializeI18n()` dilleri dinamik import ile yükler ve promise
 * döndürür. Storybook preview'ı esbuild ile paketlendiği için top-level await
 * KULLANILAMIYOR; decorator içinde beklemek de geç kalır (component ilk
 * render'da `$t` çağırır, çeviri yerine anahtar görünür).
 *
 * Çözüm: dört dil statik import edilip örnek doğrudan kuruluyor.
 * Yapılandırma `src/i18n/index.js` ile BİREBİR aynı olmalı — `legacy: false`
 * ve `globalInjection: true` component davranışını değiştirir.
 *
 * Güvenli, çünkü hiçbir component `i18n` örneğini doğrudan import etmiyor;
 * 16'sı da `useI18n()` üzerinden uygulamanın sağladığı örneği okuyor.
 */
const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: "tr",
  fallbackLocale: "en",
  messages: { tr, en, ar, ru },
});

/**
 * Storybook için sade router.
 *
 * Uygulamanın gerçek router'ı (1121 satır) kimlik doğrulama guard'ları ve
 * yönlendirmeler içeriyor — Storybook'a alınırsa component'ler login'e
 * yönlenmeye çalışır. Burada yalnız `RouterLink` ve `useRoute` çalışsın diye
 * bellek tabanlı boş bir router kuruluyor.
 *
 * Paylaşılan 27 component'ten yalnız ikisi (GlobalSearch, SourceBadge) router
 * kullanıyor ve ikisi de gezinme yapmıyor, sadece bağlantı üretiyor.
 */
const storybookRouter = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
});

setup((app) => {
  app.use(createPinia());
  app.use(storybookRouter);
  app.use(i18n);
  // DOM seviyesinde çalışan eklentiler; MutationObserver kullandıkları için
  // Storybook'un her story'de yeniden mount ettiği ağaçları da yakalarlar.
  app.use(txResize);
  app.use(nativeSelectPicker);
});

/** Araç çubuğundaki dil seçimini uygular (yön dahil). */
const withLanguage = (story, context) => {
  const lang = context.globals.locale;
  if (i18n.global.availableLocales.includes(lang)) {
    i18n.global.locale.value = lang;
    applyDocumentDirection(lang);
  }
  return story();
};

export default {
  decorators: [
    withLanguage,
    // Tema: uygulamanın index.html bootstrap'i ile AYNI mekanizma —
    // <html> üzerine `dark` sınıfı. Ayrı bir tema sistemi kurulmuyor.
    withThemeByClassName({
      themes: { Açık: "", Koyu: "dark" },
      defaultTheme: "Açık",
      parentSelector: "html",
    }),
  ],

  globalTypes: {
    locale: {
      description: "Arayüz dili",
      defaultValue: "tr",
      toolbar: {
        icon: "globe",
        // Dördü de destekleniyor. `ar` sağdan sola — tasarım incelemesinde
        // RTL kırılmalarını yakalamak için bilinçli olarak listede.
        items: [
          { value: "tr", title: "Türkçe" },
          { value: "en", title: "English" },
          { value: "ar", title: "العربية (RTL)" },
          { value: "ru", title: "Русский" },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    options: {
      storySort: { order: ["Ortak", "Form Alanları", "Lojistik"] },
    },
  },
};

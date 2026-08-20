import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  // `storybook-static` derlenmiş Storybook çıktısı (13 MB) — kaynak değil,
  // build artefaktı. Denetim dışına alınmadan önce tek başına 1522 hata
  // üretiyordu ve gerçek kaynak hatalarını görünmez kılıyordu:
  // tüm repo 4169 problem, bu dizin hariç 3.
  { ignores: ["dist", "node_modules", "storybook-static"] },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/html-self-closing": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // ── Node ortamı: build/araç dosyaları ────────────────────────────────
  // `vite.config.js` tarayıcıda değil Node'da koşuyor; `process` ve
  // `__dirname` orada yasal.
  {
    files: ["*.config.{js,mjs,cjs}", "scripts/**", "*.cjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        module: "writable",
        require: "readonly",
        Buffer: "readonly",
      },
    },
  },
];

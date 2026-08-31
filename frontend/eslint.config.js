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
      // 2022 → "latest" (15-FE, 31 Ağu): `api/returnsMock.js` fixture'ı
      // `import … with { type: "json" }` ile okuyor. Nitelik ZORUNLU —
      // Node 24 niteliksiz JSON importunu ERR_IMPORT_ATTRIBUTE_MISSING ile
      // reddediyor — ama espree onu ES2022'de tanımıyor ve dosyayı
      // "Parsing error" ile düşürüyordu. Alias yerine göreli yol + nitelik
      // seçilmesinin gerekçesi o dosyanın başlığında: alias kullanan modül
      // `node --test`'ten görünmüyor (bkz. `catalogMeta.js` uyarısı).
      // Yükseltme repo genelinde ölçüldü: 0 yeni hata.
      ecmaVersion: "latest",
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
  {
    // `src/` altındaki `.mjs` dosyaları TARAYICIYA GİTMEZ — bunlar `node` ile
    // elle koşturulan senkron/üretim betikleri (`sync.mjs` gibi). Node
    // globallerini yalnız bu kalıba açmak, tarayıcı kodunda `process`
    // kullanımını hâlâ hata olarak bırakır.
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-console": "off",
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

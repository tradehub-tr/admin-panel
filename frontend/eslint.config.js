import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist", "node_modules"] },
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // TODO: Refactor LayoutSectionCard to emit('update:section', ...) pattern.
    // Şu an `section` prop'u reactive olarak kullanılıyor, parent uyumu gerek.
    files: ["src/components/seller/LayoutSectionCard.vue"],
    rules: {
      "vue/no-mutating-props": "warn",
      "vue/no-side-effects-in-computed-properties": "warn",
    },
  },
];

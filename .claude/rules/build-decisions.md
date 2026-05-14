---
paths:
  - "package.json"
  - "vite.config.js"
  - "eslint.config.js"
  - ".prettierrc.json"
  - "tsconfig.json"
---

# Build + ESLint/Prettier + dosya ekleme karar ağacı

## 1. NPM komutları

```bash
cd admin-panel/frontend
npm run dev           # vite dev server, port 8082
npm run build         # /panel/ base ile production build → dist/
npm run preview       # build'i lokalde serve et
npm run lint          # eslint sadece check
npm run lint:fix      # eslint --fix + prettier --write
npm run format        # prettier --write
npm run format:check  # CI için
```

## 2. ESLint kuralları

- **Yeni kod commit'lemeden önce `npm run lint:fix`** çalıştır.
- `eslint.config.js` **flat config** — global'e değişken eklemen gerekirse `globals` objesini güncelle.
- **`no-console`:** `warn` / `error` izinli, `log` değil.
- **`no-unused-vars`:** `_` ile başlayan arg'lar yok sayılır.
- **`vue/multi-word-component-names`** kapalı.
- **`vue/no-mutating-props`** sadece `LayoutSectionCard.vue` istisnası dışında **error**.

## 3. Prettier

- Print width 100, semi true, **double quotes** (`singleQuote: false`), trailing comma `es5`, tab width 2.
- `.prettierrc.json`'ı değiştirme.

## 4. Dosya eklerken karar ağacı

```
Yeni özellik geliyor:
├── Yeni route mu?
│   └── src/router/index.js (lazy import + meta)
│       └── View dosyası: src/views/<section>/<X>View.vue
├── Birden fazla view'dan kullanılan ortak UI?
│   └── src/components/<section>/<X>.vue
├── Reusable stateful logic (DOM, timer, fetch wrapper)?
│   └── src/composables/[<domain>/]use<X>.js
├── Server state, cross-component shared?
│   └── src/stores/<domain>.js (setup store)
├── Pure helper / formatter / type guard?
│   └── src/utils/<x>.js (named export, Vue import gerektirmesin)
├── Sabit liste / enum?
│   └── src/constants/<x>.js
├── Static seed/mock data?
│   └── src/data/<x>.js (sadece dev)
└── Yeni stil partial?
    └── src/assets/scss/<x>.scss + main.scss'e @use ekle
```

## 5. Yeni dependency eklerken

- **Bundle boyutu + güvenlik audit** gerektirir.
- `package.json`'a yazmadan önce **sor**.
- 50KB üstü ise `vite.config.js` `manualChunks` ile `vendor-*` yap.
- Vue ecosystem dışı bir lib alternatif olarak değerlendirilmeli (Pinia / Vue Router / Vueuse öncelik).

## 6. Build / deploy

- **`/panel/` base path** production'da, `/` dev'de.
- Source map **prod'da kapalı** — açma (token sızıntısı).
- Production build artifact'i `dist/` — gitignored.
- nginx config: `nginx.conf.template` (envsubst ile backend domain inject).

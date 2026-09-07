// `useResponsiveViewMode` — MASAÜSTÜ tercihi kalıcı, ZORLANAN mod değil.
//
// NEDEN BU TEST VAR:
//   Composable'ın kendi belgesi tam bu tuzağı anlatıyordu: kalıcılık
//   `useListViewMode` ile körlemesine birleştirilirse, ekran daraldığında
//   ZORLANAN `list` diske yazılır ve telefonda bir kez açan kullanıcı
//   masaüstüne döndüğünde tablosunu kaybeder. Kalıcılık 2026-08-19'da
//   eklendi; bu dosya o tuzağı kilitliyor.
//
//   Hata geri konursa (yazma koşulundaki `isLg` kontrolü silinirse) alttaki
//   ikinci test kırılır — mutasyonla doğrulandı.

import assert from "node:assert/strict";
import test from "node:test";

import { nextTick } from "vue";

import { useResponsiveViewMode } from "../useResponsiveViewMode.js";

/** Tarayıcı yüzeyini kur: `matches` ekranın geniş olup olmadığını söyler. */
function ortam({ genisEkran, depo = {}, oturum = {} }) {
  const oncekiWindow = globalThis.window;
  const oncekiStorage = globalThis.localStorage;
  const oncekiSession = globalThis.sessionStorage;
  const oncekiWarn = console.warn;

  globalThis.window = {
    matchMedia: () => ({
      matches: genisEkran,
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  globalThis.localStorage = {
    getItem: (k) => (k in depo ? depo[k] : null),
    setItem: (k, v) => {
      depo[k] = String(v);
    },
  };
  // Dar ekrandaki AÇIK seçim oturumluk depoda tutuluyor (masaüstü tercihini
  // ezmesin diye); testin onu da görmesi gerekiyor.
  globalThis.sessionStorage = {
    getItem: (k) => (k in oturum ? oturum[k] : null),
    setItem: (k, v) => {
      oturum[k] = String(v);
    },
  };
  // `onMounted` bileşen dışında çağrılınca Vue uyarı basıyor; davranış
  // etkilenmiyor, çıktıyı kirletmesin.
  console.warn = () => {};

  return {
    depo,
    oturum,
    geriAl() {
      globalThis.window = oncekiWindow;
      globalThis.localStorage = oncekiStorage;
      globalThis.sessionStorage = oncekiSession;
      console.warn = oncekiWarn;
    },
  };
}

test("masaüstünde seçilen mod diske yazılıyor", async () => {
  const o = ortam({ genisEkran: true });
  try {
    const { viewMode } = useResponsiveViewMode("table", "list", "test-ekran");
    assert.equal(viewMode.value, "table");

    viewMode.value = "kanban";
    // `watch` varsayılan olarak pre-flush: değer değişimi bir tick sonra
    // dinleyiciye ulaşıyor. Testin senkron beklemesi gerçek davranışı
    // yanlış temsil ederdi.
    await nextTick();
    assert.equal(
      o.depo["lv-mode:test-ekran"],
      "kanban",
      "masaüstü seçimi `lv-mode:<anahtar>` altına yazılmalı"
    );
  } finally {
    o.geriAl();
  }
});

test("mobilde ZORLANAN kompakt mod diske YAZILMIYOR", async () => {
  // Asıl regresyon: kullanıcının masaüstü tercihi telefonda ezilmemeli.
  const o = ortam({ genisEkran: false, depo: { "lv-mode:test-ekran": "kanban" } });
  try {
    const { viewMode } = useResponsiveViewMode("table", "list", "test-ekran");

    assert.equal(viewMode.value, "list", "dar ekranda kompakt liste zorunlu");
    await nextTick();
    assert.equal(
      o.depo["lv-mode:test-ekran"],
      "kanban",
      "zorlanan `list` kaydedilmiş — masaüstü tercihi ezildi"
    );
  } finally {
    o.geriAl();
  }
});

test("kayıtlı mod açılışta geri geliyor", () => {
  const o = ortam({ genisEkran: true, depo: { "lv-mode:test-ekran": "grid" } });
  try {
    const { viewMode } = useResponsiveViewMode("table", "list", "test-ekran");
    assert.equal(viewMode.value, "grid");
  } finally {
    o.geriAl();
  }
});

test("geçersiz kayıt yok sayılıyor, varsayılana düşülüyor", () => {
  // Elle kurcalanmış ya da eski sürümden kalmış değer ekranı boş bırakmamalı.
  const o = ortam({ genisEkran: true, depo: { "lv-mode:test-ekran": "uzay-gemisi" } });
  try {
    const { viewMode } = useResponsiveViewMode("table", "list", "test-ekran");
    assert.equal(viewMode.value, "table");
  } finally {
    o.geriAl();
  }
});

test("anahtar verilmezse hiçbir şey yazılmıyor (geriye uyumluluk)", async () => {
  // `CatalogListScreen` composable'ı anahtarsız çağırıyor; davranışı
  // değişmemeli, yoksa onun modu sessizce kalıcı olurdu.
  const o = ortam({ genisEkran: true });
  try {
    const { viewMode } = useResponsiveViewMode("table", "list");
    viewMode.value = "grid";
    await nextTick();
    assert.deepEqual(Object.keys(o.depo), [], "anahtarsız çağrı depoya yazmamalı");
  } finally {
    o.geriAl();
  }
});

test("dar ekrandaki AÇIK seçim yeniden kurulumda kaybolmuyor", async () => {
  // ASIL REGRESYON (KALAN-ISLER M3, ölçüldü 7 Eyl 2026): dört görünüm düğmesi
  // mobilde de çiziliyordu, tıklama anlık çalışıyordu, ama bileşen yeniden
  // kurulduğunda (ör. kova süzgecine basınca) `immediate: true` izleyicisi
  // modu `list`e geri zorluyordu. Kullanıcı seçtiği görünümü kaybediyordu.
  const o = ortam({ genisEkran: false, depo: { "lv-mode:test-ekran": "kanban" } });
  try {
    const ilk = useResponsiveViewMode("table", "list", "test-ekran");
    assert.equal(ilk.viewMode.value, "list", "dar ekranda ilk açılış kompakt liste");

    ilk.viewMode.value = "grid"; // kullanıcı AÇIKÇA kart görünümünü seçti
    await nextTick();
    assert.equal(
      o.oturum["lv-mode-dar:test-ekran"],
      "grid",
      "dar ekrandaki seçim oturumluk depoya yazılmalı"
    );
    assert.equal(
      o.depo["lv-mode:test-ekran"],
      "kanban",
      "masaüstü tercihi EL DEĞMEDEN kalmalı — mobil seçim onu ezmemeli"
    );

    // Yeniden kurulum (bileşen remount): seçim korunmalı, `list`e düşmemeli.
    const ikinci = useResponsiveViewMode("table", "list", "test-ekran");
    assert.equal(
      ikinci.viewMode.value,
      "grid",
      "yeniden kurulumda kullanıcının dar ekran seçimi korunmalı"
    );
  } finally {
    o.geriAl();
  }
});

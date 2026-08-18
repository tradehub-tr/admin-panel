import assert from "node:assert/strict";
import test from "node:test";

// Zarf açma sözleşmesi.
//
// Bu test eskiden `unwrap`'i BİREBİR KOPYALIYORDU: kaynak `src/api/logistics.js`
// içindeydi ve o dosya `@/utils/api` üzerinden `localStorage`/`fetch` çektiği
// için node:test ortamında import edilemiyordu. Kopya, kaynak değiştiğinde
// sessizce eskiyecek bir sözleşmeydi.
//
// 16-FE-0'da zarf saf bir modüle taşındı (`src/api/logisticsEnvelope.js`,
// hiçbir tarayıcı bağımlılığı yok) — test artık GERÇEK kodu çağırıyor.
import {
  FALLBACK_ERROR_MESSAGE,
  LogisticsApiError,
  rescueLogisticsError,
  toDisplayMessage,
  unwrap,
} from "../logisticsEnvelope.js";

test("Frappe sarmalı açılır", () => {
  assert.deepEqual(unwrap({ message: { ok: true, data: { x: 1 } } }), { x: 1 });
});

test("sarmasız yanıt da açılır", () => {
  assert.deepEqual(unwrap({ ok: true, data: [1, 2] }), [1, 2]);
});

test("hata zarfı kod taşıyan hata fırlatır", () => {
  assert.throws(
    () =>
      unwrap({ message: { ok: false, error: { code: "FEATURE_DISABLED", message: "kapalı" } } }),
    (e) => e instanceof LogisticsApiError && e.code === "FEATURE_DISABLED" && e.message === "kapalı"
  );
});

test("details korunur", () => {
  assert.throws(
    () =>
      unwrap({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "x", details: { field: "city" } },
      }),
    (e) => e.details.field === "city"
  );
});

test("sözleşme dışı yanıt sessizce geçmez", () => {
  assert.throws(
    () => unwrap({ some: "thing" }),
    (e) => e.code === "INTERNAL_ERROR"
  );
});

test("boş/null yanıt da sözleşme dışı sayılır", () => {
  for (const bad of [null, undefined, 0, "", []]) {
    assert.throws(
      () => unwrap(bad),
      (e) => e.code === "INTERNAL_ERROR",
      `${JSON.stringify(bad)} sessizce geçti`
    );
  }
});

test("data null olabilir — ok:true ise hata DEĞİLDİR", () => {
  // Yük olmayan başarılı yanıt (ör. set_feature_flag) `data: null` döndürür.
  // `!envelope.data` ile kontrol edilseydi bu, hata sanılırdı.
  assert.equal(unwrap({ ok: true, data: null }), null);
  assert.equal(unwrap({ message: { ok: true, data: null } }), null);
});

test("hata sınıfı tür sorularını doğru yanıtlıyor", () => {
  // Ekranlar mesaj metnine değil BU bayraklara bakarak dallanıyor.
  const permission = new LogisticsApiError({ code: "PERMISSION_DENIED" });
  assert.equal(permission.isPermissionDenied, true);
  assert.equal(permission.isFeatureDisabled, false);

  const capability = new LogisticsApiError({ code: "CAPABILITY_REQUIRED" });
  assert.equal(capability.isPermissionDenied, true, "capability de yetki hatasıdır");

  assert.equal(new LogisticsApiError({ code: "FEATURE_DISABLED" }).isFeatureDisabled, true);
  assert.equal(new LogisticsApiError({ code: "NOT_FOUND" }).isNotFound, true);
});

test("mesajsız hata kodu mesaj yerine geçer", () => {
  // Sunucu mesaj göndermediğinde kullanıcı boş bir kutu görmesin.
  assert.equal(new LogisticsApiError({ code: "INTERNAL_ERROR" }).message, "INTERNAL_ERROR");
});

// ---------------------------------------------------------------------------
// HTTP hata gövdesindeki zarfın kurtarılması — REGRESYON
// ---------------------------------------------------------------------------
//
// NEDEN VAR (curl ile ölçülmüş hata):
//   Backend validasyon reddini `417 + {ok:false, error:{code:
//   "VALIDATION_ERROR", message:"… yazılamayan alan(lar): name"}}` olarak
//   döndürüyor. HTTP başarısız olduğu için `utils/api.js` kendi `Error`'ını
//   fırlatıyordu ve `unwrap` zarfa HİÇ ulaşmıyordu. Üstelik o katmanın genel
//   çözümleyicisi `result.message`'ı (bir NESNE) `String()`'e sokup
//   "[object Object]" üretiyordu. Ekranda görünen: kod `INTERNAL_ERROR`,
//   mesaj "[object Object]" — sunucunun düzgün Türkçe mesajı kayıp.

test("417 gövdesindeki zarf kurtarılır — gerçek yanıt", () => {
  // `utils/api.js buildError` artık ham gövdeyi `err.body`'ye iliştiriyor.
  const httpError = Object.assign(new Error("[object Object]"), {
    status: 417,
    body: {
      message: {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Logistics Provider kataloğunda yazılamayan alan(lar): name",
        },
      },
    },
  });

  const rescued = rescueLogisticsError(httpError);

  assert.ok(rescued instanceof LogisticsApiError);
  assert.equal(rescued.code, "VALIDATION_ERROR");
  assert.equal(rescued.message, "Logistics Provider kataloğunda yazılamayan alan(lar): name");
  assert.equal(rescued.status, 417);
});

test("Frappe sarmalı olmayan gövde de kurtarılır", () => {
  const rescued = rescueLogisticsError(
    Object.assign(new Error("x"), {
      status: 403,
      body: { ok: false, error: { code: "PERMISSION_DENIED", message: "Yetkiniz yok." } },
    })
  );

  assert.equal(rescued.code, "PERMISSION_DENIED");
  assert.equal(rescued.isPermissionDenied, true);
});

test("zarf yoksa hata AYNEN geri verilir — uydurma kod üretilmez", () => {
  // Ağ hatası ve oturum sonu yönlendirmesi bu yoldan geçiyor; sahte bir
  // `code` üretmek çağıranın koda göre dallanmasını yalanlardı.
  const plain = new Error("Sunucuya bağlanılamadı.");
  assert.equal(rescueLogisticsError(plain), plain);

  const frappeStyle = Object.assign(new Error("Traceback…"), {
    body: { exc_type: "ValidationError", _server_messages: "[]" },
  });
  assert.equal(rescueLogisticsError(frappeStyle), frappeStyle);
});

test("zaten tipli olan hata sarmalanmaz", () => {
  const typed = new LogisticsApiError({ code: "NOT_FOUND", message: "yok" });
  assert.equal(rescueLogisticsError(typed), typed);
});

// ---------------------------------------------------------------------------
// "[object Object]" sınıfı — kökten kapatma
// ---------------------------------------------------------------------------
//
// Store `capture()` hata mesajını doğrudan `ErrorState`'e ve toast'a basıyor.
// Mesaj alanına bir NESNE düşerse kullanıcı "[object Object]" görür. Aşağısı
// o sınıfın her varyantını kapatıyor: mesaj HER ZAMAN okunabilir string.

test("mesaj alanı NESNE gelen zarf → ekrana string düşer", () => {
  const error = new LogisticsApiError({
    code: "VALIDATION_ERROR",
    message: { field: "name", detail: "yazılamaz" },
  });

  assert.equal(typeof error.message, "string");
  assert.notEqual(error.message, "[object Object]");
  assert.equal(error.message, "VALIDATION_ERROR");
});

test("mesaj da kod da nesne ise okunabilir fallback", () => {
  const error = new LogisticsApiError({ code: { a: 1 }, message: { b: 2 } });

  assert.equal(error.message, FALLBACK_ERROR_MESSAGE);
  assert.notEqual(error.message, "[object Object]");
});

test("toDisplayMessage — string olmayan hiçbir şey ekrana nesne olarak düşmez", () => {
  assert.equal(toDisplayMessage("Kaydedilemedi."), "Kaydedilemedi.");
  assert.equal(toDisplayMessage("  boşluklu  "), "boşluklu");
  assert.equal(toDisplayMessage(""), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage("   "), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage(null), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage(undefined), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage({ a: 1 }), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage([1, 2]), FALLBACK_ERROR_MESSAGE);
  assert.equal(
    toDisplayMessage(() => {}),
    FALLBACK_ERROR_MESSAGE
  );
  // Sayı/boolean anlamlı bir metne çevrilebilir (ör. HTTP kodu).
  assert.equal(toDisplayMessage(417), "417");
  assert.equal(toDisplayMessage(false), "false");
});

test("bir yerde String(nesne)'ye dönüşmüş mesaj da elenir", () => {
  // Zincirin yukarısında (utils/api.js) nesne zaten metne dönüşmüş olabilir;
  // kullanıcıya o metni göstermek de kabul edilemez.
  assert.equal(toDisplayMessage("[object Object]"), FALLBACK_ERROR_MESSAGE);
  assert.equal(toDisplayMessage("[object Object]", "Kayıt başarısız."), "Kayıt başarısız.");
});

test("store `capture()` yolu: 417 → VALIDATION_ERROR + Türkçe mesaj", () => {
  // `stores/logistics.js capture()` `e instanceof LogisticsApiError` dalına
  // düşmeli; else dalı `INTERNAL_ERROR` yazıyor ve canlıda görülen buydu.
  const rescued = rescueLogisticsError(
    Object.assign(new Error("[object Object]"), {
      status: 417,
      body: {
        message: {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Zorunlu alan eksik: Sağlayıcı adı" },
        },
      },
    })
  );

  const captured =
    rescued instanceof LogisticsApiError
      ? { code: rescued.code, message: toDisplayMessage(rescued.message) }
      : { code: "INTERNAL_ERROR", message: toDisplayMessage(rescued?.message) };

  assert.deepEqual(captured, {
    code: "VALIDATION_ERROR",
    message: "Zorunlu alan eksik: Sağlayıcı adı",
  });
});

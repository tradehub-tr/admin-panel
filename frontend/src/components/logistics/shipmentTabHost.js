// Sevkiyat detayı sekmelerinin BARINDIRMA katmanı — yükleme/hata yer
// tutucuları ve async sarmalayıcı önbelleği.
//
// NEDEN AYRI DOSYA:
//   Bunlar `ShipmentDetailScreen.vue`'nun `<script setup>` gövdesindeydi.
//   `<script setup>` her INSTANCE için yeniden çalışıyor, yani her mount
//   yeni bir bileşen TİPİ ve yeni bir önbellek üretiyordu — Vue'nun tip
//   bazlı optimizasyonları ve sarmalayıcı paylaşımı boşa gidiyordu.
//   Modül seviyesine alınınca tipler bir kez tanımlanıyor ve önbellek tüm
//   instance'lar arasında paylaşılıyor.
//
// KURAL 7 HAKKINDA DÜRÜST NOT:
//   `asyncTabComponent` hâlâ bir computed'in içinden çağrılıyor ve ilk
//   çağrıda WeakMap'e YAZIYOR. Yani "computed artık yalnız okuyor" demek
//   yanlış olur. Ama bu, `workflow.md` kural 7'nin hedeflediği sınıf değil:
//   yazma idempotent bir memoizasyon, gözlemlenebilir hiçbir reaktif state
//   değişmiyor (WeakMap reaktif değil, kimse onu izlemiyor) ve fonksiyon
//   aynı girdi için hep aynı referansı döndürüyor. Kuralın yasakladığı şey
//   fetch/`ref.value = …`/`Date.now()` gibi, yeniden değerlendirmeyi
//   gözlemlenebilir kılan yan etkiler.

import { defineAsyncComponent, h } from "vue";
import { useI18n } from "vue-i18n";

import Skeleton from "@/components/common/Skeleton.vue";

import ErrorState from "./ErrorState.vue";

/**
 * Sekme gövdesi hata panelini kuran ortak fabrika.
 *
 * `inheritAttrs: false` ŞART: kabuk `v-bind="activeProps"` ile sekmenin
 * prop'larını geçiyor ve bu yer tutucular onları tanımıyor — devralınsalardı
 * `can="[object Object]"` gibi öznitelikler DOM'a sızardı.
 *
 * Yeniden yükleme her iki hata için de doğru çare: chunk hatasında tarayıcı
 * eski manifesti tazeler, render hatasında bileşen temiz bir state'le kurulur.
 */
function tabErrorComponent(name, code, resolveMessage) {
  return {
    name,
    inheritAttrs: false,
    props: { error: { type: [Object, Error], default: null } },
    setup(props) {
      const { t } = useI18n();
      // Log render/lifecycle'da, computed'de DEĞİL — hata sessizce
      // yutulmasın ama saf hesaplama kirlenmesin.
      console.error(`[${name}]`, props.error);
      return () =>
        h(ErrorState, {
          error: { code, message: resolveMessage(props.error) || t("logistics.error.generic") },
          onRetry: () => window.location.reload(),
        });
    },
  };
}

/** Chunk indirilemedi (çoğu zaman: oturum açıkken yeni sürüm deploy edildi). */
export const TabLoadError = tabErrorComponent(
  "ShipmentTabLoadError",
  "CHUNK_LOAD_ERROR",
  (error) => error?.message
);

/**
 * Sekmenin `props(ctx)` fonksiyonu YA DA gövdesinin render'ı/setup'ı patladı.
 *
 * İkinci durum kabuktaki `onErrorCaptured` sayesinde buraya ulaşıyor; o
 * olmadan yalnız `props()` hatası yakalanıyordu ve bileşenin kendi render
 * hatası tüm kabuğu söküyordu.
 */
export const TabRenderError = tabErrorComponent(
  "ShipmentTabRenderError",
  "TAB_RENDER_ERROR",
  (error) => error?.message
);

/** 200 ms'yi aşan chunk yüklemelerinde görünen yer tutucu. */
export const TabLoading = {
  name: "ShipmentTabLoading",
  inheritAttrs: false,
  render: () => h(Skeleton, { variant: "rect", height: "240px" }),
};

/**
 * Lazy import fonksiyonunu `<component :is>`'in beklediği bileşen tanımına
 * çevirir.
 *
 * Sarmalayıcı olmadan Vue, `() => import(...)` fonksiyonunu FUNCTIONAL
 * COMPONENT sanıp Promise render etmeye çalışırdı.
 *
 * WeakMap ile loader başına bir kez üretiliyor: her çağrıda yenisini kurmak
 * sekmeyi her render'da yeniden mount ederdi. Anahtar loader fonksiyonunun
 * kendisi — kayıt defteri dondurulmuş olduğu için referans kararlı, ve
 * defter atıldığında girdi kendiliğinden toplanıyor.
 *
 * @param {() => Promise<any>} loader
 */
const asyncCache = new WeakMap();

export function asyncTabComponent(loader) {
  if (!asyncCache.has(loader)) {
    asyncCache.set(
      loader,
      defineAsyncComponent({
        loader,
        loadingComponent: TabLoading,
        errorComponent: TabLoadError,
        delay: 200,
        timeout: 20000,
      })
    );
  }
  return asyncCache.get(loader);
}

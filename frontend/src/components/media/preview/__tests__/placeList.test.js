import assert from "node:assert/strict";
import { test } from "node:test";

import { installDom, loadSfc, settle } from "./mountSfc.js";

installDom();
const Vue = await import("vue");
const geometry = await import("../../../../lib/media/crop/geometry.js");
const places = await import("../../../../lib/media/preview/places.js");
const { default: messages } = await import("../../../../lib/media/preview/messages.js");

const PlaceList = loadSfc(
  new URL("../PlaceList.vue", import.meta.url),
  {
    "vue-i18n": {
      useI18n: () => ({ t: (k, p) => (p ? `${k}${JSON.stringify(p)}` : k), locale: Vue.ref("tr") }),
    },
    "@/lib/media/crop/geometry.js": geometry,
    "@/lib/media/preview/places.js": places,
    "@/lib/media/preview/messages.js": messages,
  },
  Vue
);

const ITEMS = places.placesFor("company.cover_image", "mobile").map((place) => ({
  id: `${place.device}:${place.key}`,
  place,
  label: place.label,
  visibility: places.placeVisibility(place, 2000 / 408),
}));

test("seçili yer aria-current, rozet yazı + simge taşır, seçim olayı", async () => {
  const picked = [];
  const host = document.createElement("div");
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(PlaceList, {
        items: ITEMS,
        currentIndex: 0,
        src: "/files/ozgen.webp",
        focal: { x: 0.78, y: 0.45 },
        onSelect: (i) => picked.push(i),
      }),
  });
  app.mount(host);
  await settle(Vue);
  try {
    const rows = host.querySelectorAll(".pl__row");
    assert.equal(rows[0].getAttribute("aria-current"), "true");
    assert.equal(rows[1].hasAttribute("aria-current"), false);
    const chip = rows[0].querySelector(".pl__chip");
    assert.match(chip.textContent, /imagePlacement\.chip\.partial\{"pct":"%44"\}/);
    assert.equal(chip.querySelector("svg").getAttribute("aria-hidden"), "true");
    // Arapça yüzdeler yön işareti taşır: değer metni <bdi> ile yalıtılır.
    assert.match(chip.querySelector("bdi").textContent, /imagePlacement\.chip\.partial/);
    assert.match(
      rows[0].querySelector(".pl__img").getAttribute("style"),
      /object-position: 78% 45%/
    );
    rows[2].click();
    assert.deepEqual(picked, [2]);
  } finally {
    app.unmount();
    host.remove();
  }
});

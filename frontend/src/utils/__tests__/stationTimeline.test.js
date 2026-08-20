// İstasyon indirgemesinin KARARLARINI kilitler.
//
// Bu hesap bileşene gömülü olsaydı test edilemezdi; ölçtüğü şey de "dizi
// dönüyor mu" değil, operasyonun ekrandan çıkarabildiği anlam:
// "üç kez Ostim" yerine "Ostim'de 19 saat", ve hâlâ orada duran gönderi.

import assert from "node:assert/strict";
import test from "node:test";

import { DWELL_WARN_HOURS, hasLocationData, hasStuckStation, toStations } from "../stationTimeline.js";

const NOW = "2026-08-19 11:40";
const ev = (event_time, location, ek = {}) => ({ event_time, location, source: "api", ...ek });

test("ardışık AYNI konum tek istasyona iniyor", () => {
  const st = toStations(
    [
      ev("2026-08-13 08:20", "İstanbul Aktarma"),
      ev("2026-08-13 11:05", "İstanbul Aktarma"),
      ev("2026-08-13 16:40", "İstanbul Aktarma"),
      ev("2026-08-14 04:10", "Ostim Aktarma"),
    ],
    NOW
  );
  assert.equal(st.length, 2, "üç ayrı satır tek istasyona inmedi");
  assert.equal(st[0].event_count, 3);
  assert.equal(st[0].location, "İstanbul Aktarma");
});

test("ardışık OLMAYAN tekrar AYRI istasyon sayılıyor", () => {
  // Gönderi gerçekten geri dönmüş olabilir; tek satıra katlamak yolculuğu gizler.
  const st = toStations(
    [ev("2026-08-13 08:00", "Ostim"), ev("2026-08-14 08:00", "İzmir"), ev("2026-08-15 08:00", "Ostim")],
    NOW
  );
  assert.equal(st.length, 3);
});

test("ara istasyonun süresi BİR SONRAKİ olaya göre", () => {
  const st = toStations([ev("2026-08-13 08:00", "A"), ev("2026-08-13 20:00", "B")], NOW);
  assert.equal(st[0].dwell_hours, 12);
  assert.equal(st[0].departed_at, "2026-08-13 20:00");
  assert.equal(st[0].is_current, false);
});

test("son istasyonun süresi ŞU ANA göre — takılan gönderi ancak böyle görünür", () => {
  const st = toStations([ev("2026-08-18 04:10", "Ostim Aktarma")], NOW);
  const son = st[st.length - 1];
  assert.equal(son.is_current, true);
  assert.equal(son.departed_at, null);
  assert.ok(son.dwell_hours > 24, `beklenen >24, gelen ${son.dwell_hours}`);
  assert.equal(son.is_stuck, true);
  assert.equal(hasStuckStation(st), true);
});

test("eşiğin ALTINDAKİ son istasyon takılmış sayılmıyor", () => {
  const st = toStations([ev("2026-08-19 06:00", "Ostim")], NOW);
  assert.ok(st[0].dwell_hours < DWELL_WARN_HOURS);
  assert.equal(st[0].is_stuck, false);
  assert.equal(hasStuckStation(st), false);
});

test("tek istasyon da anlamlı — boş görünmüyor", () => {
  const st = toStations([ev("2026-08-19 09:00", "İstanbul Aktarma")], NOW);
  assert.equal(st.length, 1);
  assert.ok(st[0].dwell_hours !== null);
});

test("olaylar sırasız gelse de çizelge sıralı", () => {
  const st = toStations([ev("2026-08-14 04:10", "Ostim"), ev("2026-08-13 08:20", "İstanbul")], NOW);
  assert.equal(st[0].location, "İstanbul");
  assert.equal(st[1].location, "Ostim");
});

test("konum HİÇ taşınmıyorsa ayırt ediliyor", () => {
  const olaylar = [ev("2026-08-13 08:20", null), ev("2026-08-14 04:10", null)];
  assert.equal(hasLocationData(olaylar), false, "konumsuz olaylar 'veri var' sayıldı");
  assert.equal(hasLocationData([ev("2026-08-13 08:20", "Ostim")]), true);
});

test("kaynak rozetleri korunuyor — API konumu ile elle girilen aynı değil", () => {
  const st = toStations(
    [ev("2026-08-13 08:20", "Ostim", { source: "api" }), ev("2026-08-13 12:00", "Ostim", { source: "manual" })],
    NOW
  );
  assert.deepEqual(st[0].sources.sort(), ["api", "manual"]);
});

test("boş liste çökmüyor", () => {
  assert.deepEqual(toStations([], NOW), []);
  assert.deepEqual(toStations(null, NOW), []);
  assert.equal(hasStuckStation(null), false);
});

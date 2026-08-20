// Sevkiyat olaylarını İSTASYON çizelgesine indirger.
//
// NEDEN AYRI MODÜL: bu saf bir hesap ve iki soruyu ayırıyor. Takip sekmesi
// "ne oldu" der (olay listesi, Bora'nın B6'sı); istasyon sekmesi "nerede ne
// kadar kalındı" der. Aynı veriden iki farklı okuma; hesap bileşene gömülürse
// test edilemez.
//
// Sözleşme: docs/lojistik/14-FE-VERI-SOZLESMESI.md §4.1, §4.2

/** Bekleme bu saati aşarsa istasyon vurgulanır ve sekmede uyarı noktası çıkar. */
export const DWELL_WARN_HOURS = 24;

function toDate(v) {
  return v ? new Date(String(v).replace(" ", "T")) : null;
}

function saatFarki(bas, son) {
  const a = toDate(bas);
  const b = toDate(son);
  if (!a || !b) return null;
  return Math.max(0, (b - a) / 36e5);
}

/**
 * Ardışık AYNI konumdaki olayları tek istasyona indirir.
 *
 * "Üç kez Ostim" listesi operasyona hiçbir şey söylemiyor; asıl soru orada ne
 * kadar kalındığı. Ardışık olmayan tekrar (Ostim → İzmir → Ostim) AYRI
 * istasyon sayılır — gönderi gerçekten geri dönmüş olabilir ve bunu tek satıra
 * katlamak yolculuğu gizler.
 *
 * @param {Array<{event_time:string, location:?string, location_branch:?string,
 *   status:?string, source:?string, carrier_status_code:?string, description:?string}>} events
 * @param {string} now Sunucudan gelen "şu an" — istemci saati güvenilmez.
 */
export function toStations(events, now) {
  const sirali = [...(events ?? [])].sort((a, b) =>
    String(a.event_time ?? "").localeCompare(String(b.event_time ?? ""))
  );

  const istasyonlar = [];
  for (const ev of sirali) {
    const son = istasyonlar[istasyonlar.length - 1];
    if (son && son.location === (ev.location ?? null)) {
      son.events.push(ev);
      son.last_event_at = ev.event_time;
      continue;
    }
    istasyonlar.push({
      location: ev.location ?? null,
      location_branch: ev.location_branch ?? null,
      first_event_at: ev.event_time,
      last_event_at: ev.event_time,
      events: [ev],
    });
  }

  return istasyonlar.map((st, i) => {
    const sonuncu = i === istasyonlar.length - 1;
    const cikis = sonuncu ? null : istasyonlar[i + 1].first_event_at;

    // SON İSTASYONDA SÜRE "ŞU AN"A GÖRE: bir sonraki olay henüz yok. Yalnız
    // olaylar arası fark hesaplansaydı 31 saattir orada duran gönderi
    // "0 saat" görünürdü — takılan gönderi ancak böyle fark edilir.
    const dwell = saatFarki(st.first_event_at, cikis ?? now);

    return {
      ...st,
      departed_at: cikis,
      is_current: sonuncu,
      dwell_hours: dwell === null ? null : Math.round(dwell * 10) / 10,
      is_stuck: sonuncu && dwell !== null && dwell > DWELL_WARN_HOURS,
      event_count: st.events.length,
      // Taşıyıcı API'sinden gelen konumla operatörün elle girdiği aynı
      // güvenilirlikte değil — kaynak istasyon rozetinde gösterilir.
      sources: [...new Set(st.events.map((e) => e.source).filter(Boolean))],
    };
  });
}

/**
 * Konum HİÇ taşınmıyor mu?
 *
 * `Shipment Event.location` alanı bugün DocType'ta yok (sözleşme §1.2, 11-BE).
 * Alanı taşımayan yanıtta çizelge çizmek yerine "bu bilgi henüz taşınmıyor"
 * demek gerekiyor: tek satırlık boş çizelge operasyona "hiç hareket yok" der
 * ve bu yalan olur.
 */
export function hasLocationData(events) {
  return (events ?? []).some((e) => e && e.location);
}

/** Sekme başlığındaki uyarı noktası — takılan gönderi var mı. */
export function hasStuckStation(stations) {
  return (stations ?? []).some((s) => s.is_stuck);
}

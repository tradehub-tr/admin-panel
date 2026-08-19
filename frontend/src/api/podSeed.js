/* Tohum verisi — onaylı mockup'tan MAKİNEYLE çıkarıldı, elle yazılmadı.
   Kaynak: docs/mockups/14-FE-pod-teslimat-mockup.html (K-J ile onaylandı)
   Alan adları sözleşme §1 ile birebir; sapma ekranı bozar. */

/** Mock evreninde "şimdi" — bekleme süreleri buna göre hesaplanır. */
export const MOCK_NOW = "2026-08-19 11:40";

/** Kimin gözünden bakıyoruz: satıcı rolünde oturum açan satıcı. */
export const SELLER_ME = "Kaya Hırdavat";

export const EXCEPTION_CODES = [
    {
      "code": "DAMAGED",
      "label": "Paket hasarlı",
      "severity": "Critical"
    },
    {
      "code": "SHORT_DELIVERY",
      "label": "Eksik teslim",
      "severity": "Warning"
    },
    {
      "code": "REFUSED",
      "label": "Teslim alınmadı / reddedildi",
      "severity": "Warning"
    },
    {
      "code": "WRONG_ITEM",
      "label": "Yanlış ürün",
      "severity": "Warning"
    },
    {
      "code": "RECIPIENT_ABSENT",
      "label": "Alıcı adreste değil",
      "severity": "Warning"
    }
  ];

export const BUCKET_DEFS = [
    {
      "key": "awaiting",
      "label": "Kanıt bekliyor",
      "hint": "Teslim edildi, kanıt kaydı yok"
    },
    {
      "key": "discrepancy",
      "label": "Tutarsızlık var",
      "hint": "Eksik/hasarlı — çözülmesi gerekiyor",
      "alarm": true
    },
    {
      "key": "seller_claim",
      "label": "Satıcı beyanı",
      "hint": "Satıcı kaydetti, operasyon doğrulaması bekliyor"
    },
    {
      "key": "done",
      "label": "Tamamlandı",
      "hint": "Kanıt tam, tutarsızlık yok"
    }
  ];

export const CARRIER_BRANCHES = {
    "AK-06010": {
      "name": "Aras Kargo Ostim Aktarma Merkezi",
      "branch_type": "Transfer Center",
      "city": "Ankara",
      "district": "Yenimahalle",
      "address": "Ostim OSB, 1234. Sk. No:7",
      "phone": "0312 385 xx xx",
      "operating_hours": "Hafta içi 08:30–18:00 · Cmt 09:00–13:00",
      "is_open": true
    },
    "YK-34001": {
      "name": "Yurtiçi Kargo İkitelli Şubesi",
      "branch_type": "Distribution Point",
      "city": "İstanbul",
      "district": "Başakşehir",
      "address": "İkitelli OSB, Metal İş San. Sit. B Blok",
      "phone": "0212 549 xx xx",
      "operating_hours": "Hafta içi 09:00–19:00",
      "is_open": true
    },
    "MNG-35004": {
      "name": "MNG Kargo Çiğli Hub",
      "branch_type": "Hub",
      "city": "İzmir",
      "district": "Çiğli",
      "address": "Ataşehir Mah. 8001 Sk. No:12",
      "phone": "0232 376 xx xx",
      "operating_hours": "Hafta içi 08:00–20:00",
      "is_open": false
    },
    "DEPO-IST": {
      "name": "Kaya Hırdavat Merkez Depo",
      "branch_type": "Seller Address",
      "city": "İstanbul",
      "district": "Bağcılar",
      "address": "Güneşli Mah. Evren Cad. No:44",
      "phone": "0212 630 xx xx",
      "operating_hours": "Hafta içi 08:00–17:30",
      "is_open": true
    }
  };

export const SEED_SHIPMENTS = [
    {
      "shipment": "SHP-2026-00041",
      "order": "ORD-2026-01187",
      "buyer_name": "Demir Yapı Market A.Ş.",
      "seller_name": "Kaya Hırdavat",
      "carrier": "Aras Kargo",
      "status": "Delivered",
      "actual_delivery": "2026-08-18 14:32",
      "bucket": "awaiting",
      "package_count": 12,
      "pallet_count": 2,
      "waybill_number": "ARS-4471902",
      "delivery_point": "AK-06010",
      "hours_since": 19
    },
    {
      "shipment": "SHP-2026-00038",
      "order": "ORD-2026-01180",
      "buyer_name": "Anadolu İnşaat Ltd.",
      "seller_name": "Kaya Hırdavat",
      "carrier": "Yurtiçi Kargo",
      "status": "Delivered",
      "actual_delivery": "2026-08-17 11:05",
      "bucket": "discrepancy",
      "package_count": 40,
      "pallet_count": 4,
      "waybill_number": "YK-8830211",
      "delivery_point": "YK-34001",
      "hours_since": 47,
      "exception_code": "SHORT_DELIVERY",
      "delivered_package_count": 38
    },
    {
      "shipment": "SHP-2026-00044",
      "order": "ORD-2026-01191",
      "buyer_name": "Ege Tesisat San. Tic.",
      "seller_name": "Kaya Hırdavat",
      "carrier": null,
      "status": "Delivered",
      "actual_delivery": "2026-08-18 16:50",
      "bucket": "seller_claim",
      "package_count": 6,
      "pallet_count": 0,
      "waybill_number": null,
      "delivery_point": "DEPO-IST",
      "hours_since": 17,
      "source": "seller"
    },
    {
      "shipment": "SHP-2026-00033",
      "order": "ORD-2026-01172",
      "buyer_name": "Marmara Yapı Malzemeleri",
      "seller_name": "Kaya Hırdavat",
      "carrier": "MNG Kargo",
      "status": "Delivered",
      "actual_delivery": "2026-08-15 09:14",
      "bucket": "done",
      "package_count": 8,
      "pallet_count": 1,
      "waybill_number": "MNG-2210554",
      "delivery_point": "MNG-35004",
      "hours_since": 121,
      "source": "carrier"
    },
    {
      "shipment": "SHP-2026-00029",
      "order": "ORD-2026-01165",
      "buyer_name": "Trakya Hırdavat",
      "seller_name": "Kaya Hırdavat",
      "carrier": "Aras Kargo",
      "status": "Delivered",
      "actual_delivery": "2026-08-14 15:40",
      "bucket": "done",
      "package_count": 3,
      "pallet_count": 0,
      "waybill_number": "ARS-4468133",
      "delivery_point": "AK-06010",
      "hours_since": 168,
      "source": "operator"
    },
    {
      "shipment": "SHP-2026-00045",
      "order": "ORD-2026-01193",
      "buyer_name": "Karadeniz Yapı A.Ş.",
      "seller_name": "Kaya Hırdavat",
      "carrier": "Yurtiçi Kargo",
      "status": "Delivered",
      "actual_delivery": "2026-08-19 08:20",
      "bucket": "awaiting",
      "package_count": 22,
      "pallet_count": 3,
      "waybill_number": "YK-8831044",
      "delivery_point": "YK-34001",
      "hours_since": 2
    }
  ];

export const SEED_PODS = {
    "SHP-2026-00033": {
      "shipment": "SHP-2026-00033",
      "delivered_at": "2026-08-15 09:14",
      "received_by": "Mehmet Yıldız",
      "received_by_title": "Depo sorumlusu",
      "delivery_code_used": 1,
      "signature_url": "sig",
      "photo_url": "photo",
      "document_url": "doc",
      "location_source": "carrier_api",
      "location_recorded_at": "2026-08-15 09:14",
      "delivered_package_count": 8,
      "total_package_count": 8,
      "delivered_pallet_count": 1,
      "returned_pallet_count": 1,
      "has_discrepancy": 0,
      "exception_code": null,
      "discrepancy_note": null,
      "waybill_number": "MNG-2210554",
      "source": "carrier",
      "recorded_by": "MNG Kargo (webhook)",
      "recorded_at": "2026-08-15 09:16",
      "delivery_point": "MNG-35004"
    },
    "SHP-2026-00038": {
      "shipment": "SHP-2026-00038",
      "delivered_at": "2026-08-17 11:05",
      "received_by": "Serkan Aydın",
      "received_by_title": "Satın alma sorumlusu",
      "delivery_code_used": 1,
      "signature_url": "sig",
      "photo_url": "photo",
      "document_url": "doc",
      "location_source": "manual",
      "location_recorded_at": "2026-08-17 11:22",
      "delivered_package_count": 38,
      "total_package_count": 40,
      "delivered_pallet_count": 4,
      "returned_pallet_count": 2,
      "has_discrepancy": 1,
      "exception_code": "SHORT_DELIVERY",
      "discrepancy_note": "2 koli teslim edilmedi — 39 ve 40 numaralı koliler aktarma merkezinde kaldı. Şube tutanağı ekte.",
      "waybill_number": "YK-8830211",
      "source": "operator",
      "recorded_by": "Ayşe Kurt (Operasyon)",
      "recorded_at": "2026-08-17 11:40",
      "delivery_point": "YK-34001"
    },
    "SHP-2026-00044": {
      "shipment": "SHP-2026-00044",
      "delivered_at": "2026-08-18 16:50",
      "received_by": "İlker Şen",
      "received_by_title": "Şoför",
      "delivery_code_used": 0,
      "signature_url": "sig",
      "photo_url": null,
      "document_url": null,
      "location_source": "manual",
      "location_recorded_at": "2026-08-18 17:05",
      "delivered_package_count": 6,
      "total_package_count": 6,
      "delivered_pallet_count": 0,
      "returned_pallet_count": 0,
      "has_discrepancy": 0,
      "exception_code": null,
      "discrepancy_note": null,
      "waybill_number": null,
      "source": "seller",
      "recorded_by": "Kaya Hırdavat (satıcı)",
      "recorded_at": "2026-08-18 17:06",
      "delivery_point": "DEPO-IST"
    }
  };

export const SEED_EVENTS = {
    "normal": [
      {
        "event_time": "2026-08-15 08:10",
        "status": "Picked Up",
        "source": "webhook",
        "location": "Kaya Hırdavat Merkez Depo",
        "location_branch": "DEPO-IST",
        "carrier_status_code": "PU01",
        "description": "Gönderi teslim alındı"
      },
      {
        "event_time": "2026-08-15 13:44",
        "status": "In Transit",
        "source": "api",
        "location": "MNG Kargo Çiğli Hub",
        "location_branch": "MNG-35004",
        "carrier_status_code": "TR10",
        "description": "Transfer merkezine ulaştı"
      },
      {
        "event_time": "2026-08-15 19:02",
        "status": "At Warehouse",
        "source": "polling",
        "location": "MNG Kargo Çiğli Hub",
        "location_branch": "MNG-35004",
        "carrier_status_code": "WH22",
        "description": "Ayrım yapıldı"
      },
      {
        "event_time": "2026-08-16 07:30",
        "status": "Out for Delivery",
        "source": "webhook",
        "location": "Yurtiçi Kargo İkitelli Şubesi",
        "location_branch": "YK-34001",
        "carrier_status_code": "OFD1",
        "description": "Dağıtıma çıktı"
      },
      {
        "event_time": "2026-08-16 14:32",
        "status": "Delivered",
        "source": "webhook",
        "location": "Alıcı adresi — Başakşehir",
        "location_branch": null,
        "carrier_status_code": "DLV",
        "description": "Teslim edildi"
      }
    ],
    "stuck": [
      {
        "event_time": "2026-08-14 09:05",
        "status": "Picked Up",
        "source": "webhook",
        "location": "Kaya Hırdavat Merkez Depo",
        "location_branch": "DEPO-IST",
        "carrier_status_code": "PU01",
        "description": "Gönderi teslim alındı"
      },
      {
        "event_time": "2026-08-14 16:20",
        "status": "In Transit",
        "source": "api",
        "location": "Aras Kargo Ostim Aktarma Merkezi",
        "location_branch": "AK-06010",
        "carrier_status_code": "TR10",
        "description": "Aktarma merkezine ulaştı"
      },
      {
        "event_time": "2026-08-15 03:10",
        "status": "At Warehouse",
        "source": "polling",
        "location": "Aras Kargo Ostim Aktarma Merkezi",
        "location_branch": "AK-06010",
        "carrier_status_code": "WH19",
        "description": "Araç bekleniyor"
      },
      {
        "event_time": "2026-08-16 11:00",
        "status": "At Warehouse",
        "source": "manual",
        "location": "Aras Kargo Ostim Aktarma Merkezi",
        "location_branch": "AK-06010",
        "carrier_status_code": null,
        "description": "Şube aradı: kapasite sorunu, yarın çıkacak"
      }
    ],
    "single": [
      {
        "event_time": "2026-08-19 08:15",
        "status": "Picked Up",
        "source": "manual",
        "location": "Kaya Hırdavat Merkez Depo",
        "location_branch": "DEPO-IST",
        "carrier_status_code": null,
        "description": "Satıcı aracına yüklendi"
      }
    ],
    "nolocation": [
      {
        "event_time": "2026-08-19 08:15",
        "status": "Pending",
        "source": "manual",
        "location": null,
        "carrier_status_code": null,
        "description": "Sevkiyat oluşturuldu"
      },
      {
        "event_time": "2026-08-19 09:40",
        "status": "Picked Up",
        "source": "manual",
        "location": null,
        "carrier_status_code": null,
        "description": "Durum elle güncellendi"
      }
    ]
  };

export const SEED_FLOWS = {
    "seller": [
      {
        "shipment": "SHP-2026-00046",
        "order": "ORD-2026-01195",
        "buyer_name": "Demir Yapı Market A.Ş.",
        "seller_name": "Kaya Hırdavat",
        "status": "Out for Delivery",
        "shipment_type": "Seller Delivery",
        "appointment_at": "2026-08-19 14:00",
        "appointment_window": "14:00-16:00",
        "driver_name": "İlker Şen",
        "driver_phone": "0532 xxx xx 41",
        "vehicle_plate": "34 KYA 118",
        "delivery_code_required": 1,
        "delivery_code_status": "pending",
        "delivery_code_attempts": 0,
        "payment_required_before_delivery": 0,
        "payment_status": "paid",
        "package_count": 6
      },
      {
        "shipment": "SHP-2026-00043",
        "order": "ORD-2026-01189",
        "buyer_name": "Anadolu İnşaat Ltd.",
        "seller_name": "Kaya Hırdavat",
        "status": "Out for Delivery",
        "shipment_type": "Seller Delivery",
        "appointment_at": "2026-08-18 10:00",
        "appointment_window": "10:00-12:00",
        "driver_name": "Murat Ateş",
        "driver_phone": "0533 xxx xx 07",
        "vehicle_plate": "34 KYA 205",
        "delivery_code_required": 1,
        "delivery_code_status": "failed",
        "delivery_code_attempts": 3,
        "payment_required_before_delivery": 0,
        "payment_status": "paid",
        "package_count": 14,
        "overdue": true
      },
      {
        "shipment": "SHP-2026-00047",
        "order": "ORD-2026-01196",
        "buyer_name": "Ege Tesisat San. Tic.",
        "seller_name": "Yıldız Nalbur",
        "status": "Ready for Pickup",
        "shipment_type": "Seller Delivery",
        "appointment_at": null,
        "appointment_window": null,
        "driver_name": null,
        "driver_phone": null,
        "vehicle_plate": null,
        "delivery_code_required": 0,
        "delivery_code_status": "not_required",
        "delivery_code_attempts": 0,
        "payment_required_before_delivery": 0,
        "payment_status": "paid",
        "package_count": 9
      }
    ],
    "buyer": [
      {
        "shipment": "SHP-2026-00048",
        "order": "ORD-2026-01198",
        "buyer_name": "Marmara Yapı Malzemeleri",
        "seller_name": "Kaya Hırdavat",
        "status": "Ready for Pickup",
        "shipment_type": "Buyer Pickup",
        "appointment_at": "2026-08-19 15:30",
        "appointment_window": "15:30-17:00",
        "pickup_location": "DEPO-IST",
        "pickup_person": "Serkan Aydın",
        "delivery_code_required": 1,
        "delivery_code_status": "verified",
        "delivery_code_attempts": 0,
        "payment_required_before_delivery": 1,
        "payment_status": "paid",
        "package_count": 11
      },
      {
        "shipment": "SHP-2026-00049",
        "order": "ORD-2026-01199",
        "buyer_name": "Trakya Hırdavat",
        "seller_name": "Yıldız Nalbur",
        "status": "Ready for Pickup",
        "shipment_type": "Buyer Pickup",
        "appointment_at": "2026-08-19 16:00",
        "appointment_window": "16:00-18:00",
        "pickup_location": "DEPO-IST",
        "pickup_person": "Hakan Er",
        "delivery_code_required": 1,
        "delivery_code_status": "verified",
        "delivery_code_attempts": 0,
        "payment_required_before_delivery": 1,
        "payment_status": "unpaid",
        "package_count": 4
      },
      {
        "shipment": "SHP-2026-00050",
        "order": "ORD-2026-01201",
        "buyer_name": "Karadeniz Yapı A.Ş.",
        "seller_name": "Kaya Hırdavat",
        "status": "Ready for Pickup",
        "shipment_type": "Buyer Pickup",
        "appointment_at": "2026-08-20 09:00",
        "appointment_window": "09:00-11:00",
        "pickup_location": "DEPO-IST",
        "pickup_person": "Nuray Taş",
        "delivery_code_required": 1,
        "delivery_code_status": "pending",
        "delivery_code_attempts": 1,
        "payment_required_before_delivery": 0,
        "payment_status": "paid",
        "package_count": 7
      },
      {
        "shipment": "SHP-2026-00044",
        "order": "ORD-2026-01191",
        "buyer_name": "Ege Tesisat San. Tic.",
        "status": "Delivered",
        "shipment_type": "Buyer Pickup",
        "appointment_at": "2026-08-18 16:30",
        "appointment_window": "16:30-18:00",
        "pickup_location": "DEPO-IST",
        "pickup_person": "İlker Şen",
        "delivery_code_required": 0,
        "delivery_code_status": "not_required",
        "delivery_code_attempts": 0,
        "payment_required_before_delivery": 0,
        "payment_status": "paid",
        "package_count": 6
      }
    ]
  };

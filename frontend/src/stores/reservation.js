/**
 * Reservation store — seller'ın slot/rezervasyon yönetimi.
 *
 * Slots: kendi açtığı müsaitlik dilimleri (Open/Closed)
 * Reservations: kendine gelen aktif/iptal/expired rezervasyonlar
 *
 * Tüm endpoint'ler tradehub_core.api.reservation altında.
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/utils/api";

function fmtSlot(start, end) {
	try {
		const s = new Date(String(start).replace(" ", "T"));
		const e = new Date(String(end).replace(" ", "T"));
		const day = s.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
		const sh = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
		const eh = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
		return `${day} · ${sh} – ${eh}`;
	} catch {
		return `${start} – ${end}`;
	}
}

export const useReservationStore = defineStore("reservation", () => {
	const slots = ref([]);
	const reservations = ref([]);
	const loadingSlots = ref(false);
	const loadingReservations = ref(false);
	const saving = ref(false);
	const error = ref(null);

	const activeReservationsCount = computed(
		() => reservations.value.filter((r) => r.status === "Active").length
	);

	async function fetchSlots(includePast = false) {
		loadingSlots.value = true;
		error.value = null;
		try {
			const res = await api.callMethodGET("tradehub_core.api.reservation.list_my_slots", {
				include_past: includePast ? 1 : 0,
			});
			slots.value = Array.isArray(res?.message) ? res.message : [];
		} catch (e) {
			error.value = e?.message || "Slotlar yüklenemedi";
		} finally {
			loadingSlots.value = false;
		}
	}

	async function createSlot({ start_at, end_at, notes }) {
		saving.value = true;
		error.value = null;
		try {
			await api.callMethod("tradehub_core.api.reservation.create_slot", {
				start_at,
				end_at,
				notes: notes || "",
			});
			await fetchSlots();
		} catch (e) {
			error.value = e?.message || "Slot oluşturulamadı";
			throw e;
		} finally {
			saving.value = false;
		}
	}

	async function deleteSlot(slotId) {
		error.value = null;
		try {
			await api.callMethod("tradehub_core.api.reservation.delete_slot", { slot_id: slotId });
			slots.value = slots.value.filter((s) => s.id !== slotId);
		} catch (e) {
			error.value = e?.message || "Slot silinemedi";
			throw e;
		}
	}

	async function fetchReservations(includePast = false) {
		loadingReservations.value = true;
		error.value = null;
		try {
			const res = await api.callMethodGET(
				"tradehub_core.api.reservation.list_my_reservations",
				{ include_past: includePast ? 1 : 0 }
			);
			reservations.value = Array.isArray(res?.message) ? res.message : [];
		} catch (e) {
			error.value = e?.message || "Rezervasyonlar yüklenemedi";
		} finally {
			loadingReservations.value = false;
		}
	}

	async function cancelReservation(reservationId) {
		error.value = null;
		try {
			await api.callMethod("tradehub_core.api.reservation.cancel_reservation", {
				reservation_id: reservationId,
			});
			const r = reservations.value.find((x) => x.id === reservationId);
			if (r) r.status = "Cancelled";
		} catch (e) {
			error.value = e?.message || "İptal başarısız";
			throw e;
		}
	}

	return {
		slots,
		reservations,
		loadingSlots,
		loadingReservations,
		saving,
		error,
		activeReservationsCount,
		fetchSlots,
		createSlot,
		deleteSlot,
		fetchReservations,
		cancelReservation,
		fmtSlot,
	};
});

<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useReservationStore } from "@/stores/reservation";

const store = useReservationStore();
const {
	slots,
	reservations,
	loadingSlots,
	loadingReservations,
	saving,
	error,
	activeReservationsCount,
} = storeToRefs(store);

const activeTab = ref("slots"); // 'slots' | 'reservations'

// Yeni slot form state
const formStart = ref("");
const formEnd = ref("");
const formNotes = ref("");
const showForm = ref(false);
const includePast = ref(false);

const activeReservations = computed(() =>
	reservations.value.filter((r) => r.status === "Active")
);
const cancelledReservations = computed(() =>
	reservations.value.filter((r) => r.status !== "Active")
);

function defaultSlotStart() {
	const d = new Date();
	d.setMinutes(0, 0, 0);
	d.setHours(d.getHours() + 1);
	return d.toISOString().slice(0, 16); // datetime-local format
}

function defaultSlotEnd() {
	const d = new Date();
	d.setMinutes(0, 0, 0);
	d.setHours(d.getHours() + 2);
	return d.toISOString().slice(0, 16);
}

function openForm() {
	formStart.value = defaultSlotStart();
	formEnd.value = defaultSlotEnd();
	formNotes.value = "";
	showForm.value = true;
}

async function submitForm() {
	if (!formStart.value || !formEnd.value) return;
	try {
		await store.createSlot({
			start_at: formStart.value,
			end_at: formEnd.value,
			notes: formNotes.value,
		});
		showForm.value = false;
	} catch {
		// error store'da
	}
}

async function handleDelete(slotId) {
	if (!confirm("Bu slot'u silmek istediğinden emin misin?")) return;
	try {
		await store.deleteSlot(slotId);
	} catch {
		// error
	}
}

async function handleCancel(resId) {
	if (!confirm("Rezervasyonu iptal etmek istediğinden emin misin? Alıcı bilgilendirilmiş olur.")) return;
	try {
		await store.cancelReservation(resId);
	} catch {
		// error
	}
}

async function refresh() {
	await Promise.all([store.fetchSlots(includePast.value), store.fetchReservations(includePast.value)]);
}

onMounted(refresh);
</script>

<template>
	<div class="p-6 max-w-5xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-lg font-bold text-gray-800">Müsaitlik & Rezervasyonlar</h1>
				<p class="text-xs text-gray-500 mt-0.5">
					Plus tier'da alıcılar bu slotlardan rezervasyon yapar.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-1.5 text-xs text-gray-600">
					<input v-model="includePast" type="checkbox" class="rounded" @change="refresh" />
					Geçmişi göster
				</label>
				<button
					class="text-xs text-violet-600 hover:text-violet-700 font-medium"
					:disabled="loadingSlots || loadingReservations"
					@click="refresh"
				>
					Yenile
				</button>
			</div>
		</div>

		<!-- Hata -->
		<div
			v-if="error"
			class="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
		>
			{{ error }}
		</div>

		<!-- Tabs -->
		<div class="flex items-center gap-1 border-b border-gray-200 mb-4">
			<button
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
				:class="activeTab === 'slots'
					? 'border-violet-500 text-violet-600'
					: 'border-transparent text-gray-500 hover:text-gray-700'"
				@click="activeTab = 'slots'"
			>
				Müsait Saatler ({{ slots.length }})
			</button>
			<button
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
				:class="activeTab === 'reservations'
					? 'border-violet-500 text-violet-600'
					: 'border-transparent text-gray-500 hover:text-gray-700'"
				@click="activeTab = 'reservations'"
			>
				Rezervasyonlar ({{ activeReservationsCount }} aktif / {{ reservations.length }} toplam)
			</button>
		</div>

		<!-- SLOTS TAB -->
		<div v-if="activeTab === 'slots'">
			<div class="flex justify-end mb-3">
				<button
					class="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white"
					@click="openForm"
				>
					+ Yeni Slot
				</button>
			</div>

			<!-- Form -->
			<div
				v-if="showForm"
				class="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-lg"
			>
				<h3 class="text-sm font-semibold text-gray-800 mb-3">Yeni müsaitlik slotu</h3>
				<div class="grid grid-cols-2 gap-3 mb-3">
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Başlangıç</label>
						<input
							v-model="formStart"
							type="datetime-local"
							class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
						/>
					</div>
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Bitiş</label>
						<input
							v-model="formEnd"
							type="datetime-local"
							class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
						/>
					</div>
				</div>
				<div class="mb-3">
					<label class="block text-xs font-medium text-gray-600 mb-1">Not (opsiyonel)</label>
					<input
						v-model="formNotes"
						type="text"
						placeholder="Örn. 'Sadece teknik sorular için'"
						class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
					/>
				</div>
				<div class="flex gap-2 justify-end">
					<button
						class="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
						@click="showForm = false"
					>
						Vazgeç
					</button>
					<button
						:disabled="saving"
						class="text-sm font-medium px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white"
						@click="submitForm"
					>
						{{ saving ? "Kaydediliyor…" : "Oluştur" }}
					</button>
				</div>
			</div>

			<!-- Slot list -->
			<div
				v-if="loadingSlots && slots.length === 0"
				class="py-12 text-center text-sm text-gray-500"
			>
				Yükleniyor…
			</div>
			<div
				v-else-if="slots.length === 0"
				class="py-12 text-center"
			>
				<div class="text-3xl mb-2">📅</div>
				<p class="text-sm text-gray-600">Henüz açık slot yok.</p>
				<p class="text-xs text-gray-400 mt-1">"Yeni Slot" ile alıcıların rezerve edebileceği saatler aç.</p>
			</div>
			<div v-else class="space-y-2">
				<div
					v-for="s in slots"
					:key="s.id"
					class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
				>
					<div class="w-10 h-10 flex items-center justify-center rounded-full bg-violet-100 text-violet-600 flex-shrink-0">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="text-sm font-medium text-gray-800">{{ store.fmtSlot(s.start_at, s.end_at) }}</div>
						<div v-if="s.notes" class="text-xs text-gray-500 mt-0.5">{{ s.notes }}</div>
						<div v-if="s.reservation" class="text-xs text-green-700 mt-1">
							🔒 Rezerve: <strong>{{ s.reservation.buyer_name }}</strong>
						</div>
					</div>
					<span
						class="text-[10px] uppercase font-medium px-2 py-1 rounded-full"
						:class="s.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
					>
						{{ s.status }}
					</span>
					<button
						class="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
						:disabled="!!s.reservation"
						:title="s.reservation ? 'Aktif rezervasyonu olan slot silinemez' : 'Slot\'u sil'"
						@click="handleDelete(s.id)"
					>
						Sil
					</button>
				</div>
			</div>
		</div>

		<!-- RESERVATIONS TAB -->
		<div v-else-if="activeTab === 'reservations'">
			<div
				v-if="loadingReservations && reservations.length === 0"
				class="py-12 text-center text-sm text-gray-500"
			>
				Yükleniyor…
			</div>
			<div
				v-else-if="reservations.length === 0"
				class="py-12 text-center"
			>
				<div class="text-3xl mb-2">📬</div>
				<p class="text-sm text-gray-600">Henüz rezervasyon yok.</p>
				<p class="text-xs text-gray-400 mt-1">Alıcılar slot rezerve ettiğinde burada görünür.</p>
			</div>
			<template v-else>
				<h2 class="text-xs uppercase font-semibold text-gray-500 mb-2">Aktif</h2>
				<div v-if="activeReservations.length === 0" class="text-sm text-gray-400 mb-4">
					Aktif rezervasyon yok.
				</div>
				<div class="space-y-2 mb-6">
					<div
						v-for="r in activeReservations"
						:key="r.id"
						class="flex items-center gap-3 p-3 bg-white border border-violet-200 rounded-lg"
					>
						<div class="w-10 h-10 flex items-center justify-center rounded-full bg-violet-100 text-violet-600 flex-shrink-0 font-semibold">
							{{ (r.counterpart_name || "A").charAt(0).toUpperCase() }}
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-gray-800">{{ r.counterpart_name }}</div>
							<div class="text-xs text-gray-500">{{ store.fmtSlot(r.start_at, r.end_at) }}</div>
						</div>
						<span class="text-[10px] uppercase font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
							{{ r.status }}
						</span>
						<button
							class="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
							@click="handleCancel(r.id)"
						>
							İptal Et
						</button>
					</div>
				</div>

				<h2 v-if="cancelledReservations.length > 0" class="text-xs uppercase font-semibold text-gray-500 mb-2">
					Geçmiş / İptal
				</h2>
				<div class="space-y-2">
					<div
						v-for="r in cancelledReservations"
						:key="r.id"
						class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-75"
					>
						<div class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 flex-shrink-0 font-semibold">
							{{ (r.counterpart_name || "A").charAt(0).toUpperCase() }}
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-gray-700">{{ r.counterpart_name }}</div>
							<div class="text-xs text-gray-500">{{ store.fmtSlot(r.start_at, r.end_at) }}</div>
						</div>
						<span
							class="text-[10px] uppercase font-medium px-2 py-1 rounded-full"
							:class="r.status === 'Cancelled'
								? 'bg-red-100 text-red-700'
								: 'bg-gray-100 text-gray-600'"
						>
							{{ r.status }}
						</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

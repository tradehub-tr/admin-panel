import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * `store.assetNameOf` — Kırpma Stüdyosuna akan `Media Asset` adının DAVRANIŞ
 * testi (rapor 75 · Bulgu 3'ün store yarısı).
 *
 * NE ÖLÇÜLDÜ:
 *   • Adın `manifest_batch` yanıtındaki `assets[]` alanından, satırın
 *     `docName`i (File docname) anahtar yapılarak alındığı.
 *   • Varlığı OLMAYAN dosyada (manifest `null` ya da `assets` boş) "" döndüğü
 *     — Kırpma Stüdyosu bu durumda dürüst "kaydedilemez" hâlinde kalmalı,
 *     uydurma bir ad başka varlığın üstüne kayıt yazdırırdı.
 *   • `docName` yoksa `fileUrl` ile sorulduğu (uç ikisini de çözer).
 *
 * HİÇBİR UÇ ÇAĞRILMAZ: `@/utils/api` alias ile sahteye bağlanır
 * (`mediaRenditions.test.js` deseni).
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let media;
/** Uca giden çağrılar — hangi uç, hangi argümanla. */
let calls;

before(async () => {
	server = await createServer({
		configFile: false,
		root: frontendRoot,
		logLevel: "silent",
		plugins: [vue()],
		resolve: {
			alias: [
				// Gerçek `api.js` yerine sahte — sıra ÖNEMLİ, tam eşleşme önce.
				{
					find: /^@\/utils\/api$/,
					replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/apiMock.js`,
				},
				{ find: "@", replacement: `${frontendRoot}/src` },
			],
		},
		server: { middlewareMode: true },
		appType: "custom",
	});
	media = await server.ssrLoadModule("/src/stores/media.js");
});

after(async () => {
	await server?.close();
	delete globalThis.__mediaApiCallMock;
});

beforeEach(() => {
	calls = [];
});

const BATCH_METHOD = "tradehub_core.api.media_manifest.manifest_batch";

/** @param {(method: string, args: object) => unknown} impl */
function mockApi(impl) {
	globalThis.__mediaApiCallMock = async (method, args) => {
		calls.push({ method, args });
		return impl(method, args);
	};
}

function magazaKur(items = []) {
	setActivePinia(createPinia());
	const store = media.useMediaStore();
	store.items = items;
	return store;
}

const KAYIT = {
	id: "/files/aa/urun.webp",
	fileUrl: "/files/aa/urun.webp",
	docName: "FILE-0001",
	fileName: "urun.webp",
	kind: "image",
	width: 1600,
	height: 1200,
	tags: [],
	alt: "",
	bytes: 1000,
	owner: "self",
	archived: false,
};

test("assetNameOf docname'i manifest_batch'e gönderir ve ilk asset adını döndürür", async () => {
	mockApi(() => ({
		message: {
			manifests: { "FILE-0001": { file: "FILE-0001", assets: ["7pa8r42g7d"], renditions: [] } },
		},
	}));
	const store = magazaKur([{ ...KAYIT }]);

	const ad = await store.assetNameOf(KAYIT.id);

	assert.equal(ad, "7pa8r42g7d");
	assert.equal(calls.length, 1);
	assert.equal(calls[0].method, BATCH_METHOD);
	// Anahtar docname — `Media Asset.source_file` Link'i docname tutar.
	assert.deepEqual(calls[0].args, { file_urls: ["FILE-0001"] });
});

test("varlığı olmayan dosyada boş döner — manifest null (yok/bakılamaz ayırt edilmez)", async () => {
	mockApi(() => ({ message: { manifests: { "FILE-0001": null } } }));
	const store = magazaKur([{ ...KAYIT }]);

	assert.equal(await store.assetNameOf(KAYIT.id), "");
});

test("manifest var ama assets boşsa da boş döner — uydurma ad üretilmez", async () => {
	mockApi(() => ({
		message: { manifests: { "FILE-0001": { file: "FILE-0001", assets: [], renditions: [] } } },
	}));
	const store = magazaKur([{ ...KAYIT }]);

	assert.equal(await store.assetNameOf(KAYIT.id), "");
});

test("docName yoksa fileUrl ile sorar — uç adresi de çözer", async () => {
	mockApi(() => ({
		message: {
			manifests: { "/files/aa/urun.webp": { assets: ["baskaAsset"], renditions: [] } },
		},
	}));
	const store = magazaKur([{ ...KAYIT, docName: "" }]);

	assert.equal(await store.assetNameOf(KAYIT.id), "baskaAsset");
	assert.deepEqual(calls[0].args, { file_urls: ["/files/aa/urun.webp"] });
});

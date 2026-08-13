// Client-side medya sıkıştırma (görsel→WebP, video→WebM) — WP1 dolduracak.
// Faz 0 stub: dosyayı dokunmadan geçirir, akışı bozmaz.
export async function prepareMedia(file) {
	return { blob: file, name: file.name, converted: 'none' }
}

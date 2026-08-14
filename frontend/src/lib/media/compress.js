// Client-side medya sıkıştırma orkestrasyonu (görsel→WebP, video→WebM).
// Türe göre prepareImage/prepareVideo'ya yönlendirir; desteklenmeyen türde
// (pdf, doc, vb.) dosyayı dokunmadan geçirir.
//
// prepareImage (browser-image-compression) ve prepareVideo (mediabunny, ~540KB
// minified) DİNAMİK import ediliyor: yalnız görsel yükleyen bir akış mediabunny
// chunk'ını, yalnız video yükleyen bir akış da browser-image-compression
// worker'ını hiç indirmesin.
export async function prepareMedia(file) {
  if (file.type.startsWith("image/")) {
    const { prepareImage } = await import("./compress.image.js");
    return prepareImage(file);
  }
  if (file.type.startsWith("video/")) {
    const { prepareVideo } = await import("./compress.video.js");
    return prepareVideo(file);
  }
  return { blob: file, name: file.name, converted: "none" };
}

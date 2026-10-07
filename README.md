# Pixelote

Conversor de imágenes por lotes: cambia el formato, comprime, redimensiona y recorta. Todo se procesa en tu navegador y las imágenes nunca se suben a ningún sitio.

## Cómo usarlo

Abre `index.html` con doble clic en Chrome, Edge, Firefox o Safari. No necesita instalación ni servidor.

Funciona sin internet, salvo la primera vez que abres un HEIC o un TIFF, o que generas AVIF en un navegador que no lo crea por sí mismo. En esos casos se descarga el decodificador o codificador correspondiente desde jsDelivr.

**Formatos de entrada:** JPG, PNG, WebP, AVIF, GIF, BMP, SVG, ICO, HEIC/HEIF, TIFF, PSD y RAW de cámara (vista previa incrustada).
**Formatos de salida:** WebP, JPG, PNG, AVIF, GIF, PDF, BMP, TIFF e ICO.

1. Arrastra tus imágenes, haz clic para elegirlas o pégalas con Ctrl+V.
2. Elige el formato de salida, o pulsa uno de los atajos rápidos.
3. Si quieres, ajusta la calidad, el tamaño o el recorte (pulsa ✂ en una imagen para recortarla a mano).
4. Pulsa **Convertir** y luego **Descargar todo (.zip)**.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página |
| `styles.css` | Estilos, con modo claro/oscuro y versión móvil |
| `app.js` | Lógica: carga de imágenes, ajustes, procesado y editor de recorte |
| `encoders.js` | Codificadores BMP, TIFF, ICO, GIF y PDF, generador de ZIP y AVIF por WebAssembly |
| `decoders.js` | Lectura de HEIC, TIFF, PSD y RAW |
| `ROADMAP.md` | Hoja de ruta |

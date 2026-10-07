# Pixelote

Conversor de imágenes por lotes: cambia el formato, comprime, redimensiona y recorta. Todo se procesa en tu navegador y las imágenes nunca se suben a ningún sitio.

## Cómo usarlo

Abre `index.html` con doble clic en Chrome, Edge, Firefox o Safari. No necesita instalación ni servidor.

Funciona sin internet, salvo la primera vez que abres un HEIC o un TIFF, que generas AVIF en un navegador que no lo crea por sí mismo o que usas MozJPEG. En esos casos se descarga el decodificador o codificador correspondiente desde jsDelivr.

**Formatos de entrada:** JPG, PNG, WebP, AVIF, GIF, BMP, SVG, ICO, HEIC/HEIF, TIFF y RAW de cámara (vista previa incrustada).
**Formatos de salida:** WebP, JPG, PNG, AVIF, GIF, PDF, BMP, TIFF e ICO, o "Auto" (elige según sea foto, transparencia o gráfico).

**Extras:** PNG optimizado con paleta, JPG con MozJPEG, comparador antes/después, girar y voltear, conservar o quitar los datos EXIF/GPS, procesado en paralelo en segundo plano, varios tamaños a la vez, marca de agua opcional, atajos propios que se pueden compartir, ajustes por imagen, carpetas, modo claro/oscuro y tres idiomas (español, inglés y portugués).

## Instalarla como app y usarla sin conexión

Con doble clic en `index.html` funciona todo menos la instalación, porque el navegador solo permite instalar páginas servidas por `https` (o desde `localhost`). Para instalarla:

- **Publicarla:** sube la carpeta tal cual a GitHub Pages, Netlify o cualquier hosting estático. Aparecerá el botón **⬇ Instalar app** en la cabecera.
- **En tu equipo:** ejecuta `python -m http.server 8000` en esta carpeta y abre `http://localhost:8000`.

Una vez servida, en "Opciones avanzadas" el botón **Descargar códecs** deja HEIC, TIFF, AVIF y MozJPEG listos para usarse sin internet.

1. Arrastra tus imágenes, haz clic para elegirlas o pégalas con Ctrl+V.
2. Elige el formato de salida, o pulsa uno de los atajos rápidos.
3. Si quieres, ajusta la calidad, el tamaño o el recorte (pulsa ✂ en una imagen para recortarla, girarla o voltearla).
4. Pulsa **Convertir**. Con **⇆ Comparar** puedes ver el antes y el después, y luego **Descargar todo (.zip)**.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página |
| `i18n.js` | Traducciones (español, inglés, portugués) |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y uso sin conexión |
| `styles.css` | Estilos, con modo claro/oscuro y versión móvil |
| `app.js` | Interfaz: carga de imágenes, ajustes, editor, comparador y reparto del trabajo entre Workers |
| `pipeline.js` | Procesado de una imagen (recorte, tamaño, codificación, EXIF); se ejecuta igual en un Worker o en la página |
| `encoders.js` | Codificadores BMP, TIFF, ICO, GIF, PDF y PNG con paleta, ZIP, EXIF, y AVIF/MozJPEG por WebAssembly |
| `decoders.js` | Lectura de HEIC, TIFF y RAW |
| `ROADMAP.md` | Hoja de ruta |

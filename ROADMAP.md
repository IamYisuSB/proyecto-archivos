# Hoja de ruta de Pixelote

Pixelote es un conversor de imágenes por lotes que funciona entero en el navegador: las imágenes nunca se suben a ningún servidor.

**Prioridad del producto:** convertir entre formatos de forma fácil. Comprimir, redimensionar y recortar son funciones de apoyo.

Leyenda: ✅ hecho · 🔜 siguiente · 🧭 más adelante · 💡 idea a valorar

---

## Fase 1: MVP ✅ (versión actual)

**Objetivo:** que cualquiera pueda soltar varias imágenes, elegir un formato y descargarlas en menos de 30 segundos.

| Área | Funcionalidad | Estado |
|---|---|---|
| Conversión | Salida a WebP, JPG, PNG, BMP, TIFF, ICO y "mantener formato" | ✅ |
| Conversión | AVIF (se activa solo si el navegador puede generarlo) | ✅ |
| Conversión | ICO con varios tamaños (16–256 px) para favicons | ✅ |
| Entrada | Arrastrar y soltar, selector de archivos, pegar con Ctrl+V | ✅ |
| Entrada | Lectura de JPG, PNG, WebP, AVIF, GIF, BMP, SVG e ICO | ✅ |
| Compresión | Control de calidad y modo "no superar X KB" | ✅ |
| Tamaño | Original, porcentaje, máximo (sin agrandar) y exacto (con recorte para no deformar) | ✅ |
| Recorte | Proporción común para todo el lote (1:1, 4:5, 4:3, 3:2, 16:9, 9:16) | ✅ |
| Recorte | Editor manual por imagen con asas y proporción fija o libre | ✅ |
| Usabilidad | Atajos: Web, Instagram, Email, Miniaturas, Sin pérdida, Favicon | ✅ |
| Usabilidad | Vista previa de las dimensiones finales antes de convertir | ✅ |
| Usabilidad | Resumen de ahorro (antes/después) y descarga individual o en ZIP | ✅ |
| Usabilidad | Patrón de nombres (`{nombre}`, `{n}`, `{ancho}`, `{alto}`) | ✅ |
| Usabilidad | Modo claro y oscuro, diseño adaptable a móvil, ajustes recordados | ✅ |
| Privacidad | Todo se procesa en el dispositivo, sin servidor | ✅ |

---

## Fase 2: más formatos ✅ (casi completa)

**Objetivo:** leer y generar los formatos que antes fallaban. Es lo más pedido en un conversor.

- ✅ **Leer HEIC/HEIF** (fotos de iPhone) con heic2any (libheif en WebAssembly).
- ✅ **Generar AVIF en todos los navegadores.** Si el navegador no sabe, se usa el codificador de Squoosh (`@jsquash/avif`) en un Web Worker, para que la página no se congele.
- ✅ **Leer TIFF** en todos los navegadores con UTIF.js (sin compresión, LZW, Deflate, PackBits…). Solo se lee la primera página.
- ✅ **Exportar a GIF** estático, con paleta de 256 colores por corte de mediana y transparencia.
- ✅ **Exportar a PDF:** una imagen por página o todas en un solo PDF, con página del tamaño de la imagen o A4.
- ✅ **Leer RAW** de cámara (CR2, CR3, NEF, ARW, DNG, ORF, RW2, RAF…) a partir de la vista previa JPEG más grande que trae el archivo, girada según la orientación de la cámara.
- 🧭 **GIF animado → WebP animado / MP4** (pendiente).

**Notas técnicas**
- HEIC, TIFF y AVIF (en navegadores sin AVIF propio) descargan su librería del CDN jsDelivr **solo la primera vez que se usan**. El resto de la app funciona sin conexión.
- RAW: la calidad depende de la vista previa que guarde la cámara (normalmente a resolución completa o casi). No se revela el RAW.
- Mejoras pendientes de esta fase: TIFF multipágina (todas las páginas) y revelado RAW real.

## Fase 3: mejor compresión y edición ✅

**Objetivo:** archivos más pequeños con el mismo aspecto, y retoques básicos sin salir de la app.

- ✅ **Comparador antes/después** con deslizador, vista ajustada o al 100 % y desplazamiento arrastrando.
- ✅ **PNG optimizado** (paleta de 2–256 colores con tramado, como TinyPNG): en las pruebas, entre un 45 % y un 75 % menos que el PNG normal.
- ✅ **JPG con MozJPEG**: se codifica también con el JPEG del navegador y se guarda el más pequeño, así que nunca pesa más.
- ✅ **Girar y voltear** cada imagen (botón ⟳ en la tarjeta o editor ✂) o todas a la vez. La orientación EXIF de las fotos se corrige automáticamente.
- ✅ **Datos de la foto (EXIF):** quitar todos (por defecto), conservar sin ubicación GPS o conservar todo. Las fotos con GPS llevan la etiqueta 📍.
- ✅ **Procesado en paralelo en segundo plano** (hasta 3 Web Workers con OffscreenCanvas). La página no se congela; si el navegador no lo permite, se procesa en la página como antes.
- ✅ **Formato "Auto"** con reglas por tipo de imagen: fotos, con transparencia, y gráficos o capturas, cada uno con su formato.

**Notas técnicas**
- MozJPEG se descarga de jsDelivr la primera vez. Sin conexión se usa el JPEG del navegador y se avisa.
- Los metadatos solo se conservan al pasar de JPG a JPG, PNG o WebP. HEIC, RAW y el resto pierden el EXIF al leerse.
- La clasificación de "Auto" es heurística: transparencia real → "con transparencia"; si 16 colores ocupan más de la mitad de la imagen → "gráfico"; si no → "foto".

## Fase 4: flujo de trabajo 🧭

**Objetivo:** que la herramienta encaje en el trabajo diario.

- **App instalable (PWA)** y funcionamiento sin conexión.
- **Atajos personalizados**: guardar y compartir combinaciones de ajustes.
- Generar **varios tamaños a la vez** (por ejemplo 400, 800 y 1600 px) para imágenes web adaptables.
- **Marca de agua opcional** de texto o logo (cada persona decide si la añade; por defecto, ninguna).
- Reordenar el lote y aplicar ajustes distintos a cada imagen.
- Abrir y guardar carpetas directamente (File System Access API).
- Traducción a inglés y portugués.

## Ideas a valorar 💡

- Quitar el fondo (modelo de IA ejecutado en el navegador).
- Ampliar imágenes con IA (upscaling).
- Extensión de navegador: "convertir esta imagen a…" desde el menú contextual.
- Versión de escritorio con Tauri para lotes de miles de archivos.

---

## Cómo priorizamos

1. **Formatos primero.** Si alguien no puede abrir o generar el formato que necesita, nada más importa.
2. **Cero fricción.** Cada función nueva debe funcionar con los valores por defecto, sin tocar ajustes.
3. **Privacidad.** Nada de servidores: si una función necesita subir imágenes, no entra.
4. **Rendimiento.** Un lote de 100 fotos de móvil debe procesarse sin bloquear la página.

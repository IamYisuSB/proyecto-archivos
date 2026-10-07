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

## Fase 2: más formatos 🔜

**Objetivo:** leer y generar los formatos que hoy fallan. Es lo más pedido en un conversor.

- 🔜 **Leer HEIC/HEIF** (fotos de iPhone), con un decodificador WebAssembly cargado solo cuando haga falta.
- 🔜 **Generar AVIF en todos los navegadores** con un codificador WASM (hoy depende del navegador).
- 🔜 **Leer TIFF** en Chrome, Edge y Firefox (hoy solo lo lee Safari).
- 🔜 **Exportar a GIF** (estático) y **a PDF** (una imagen por página o todas en un solo PDF).
- 🧭 **Leer RAW** de cámara (CR2, NEF, ARW, DNG) usando la vista previa incrustada.
- 🧭 **Leer PSD** (capa combinada).
- 🧭 **GIF animado → WebP animado / MP4**.

## Fase 3: mejor compresión y edición 🧭

**Objetivo:** archivos más pequeños con el mismo aspecto, y retoques básicos sin salir de la app.

- Comparador **antes/después** con deslizador y zoom al 100 %.
- Compresión PNG avanzada (cuantización de paleta, tipo TinyPNG) y JPEG con MozJPEG.
- **Girar y voltear**, con corrección automática de la orientación EXIF.
- Opción para **conservar o eliminar metadatos** (EXIF, GPS). Hoy siempre se eliminan.
- Procesar en **Web Workers / OffscreenCanvas** para que la interfaz no se congele con lotes grandes.
- Reglas por formato de origen, por ejemplo "PNG con transparencia → WebP, fotos → JPG".

## Fase 4: flujo de trabajo 🧭

**Objetivo:** que la herramienta encaje en el trabajo diario.

- **App instalable (PWA)** y funcionamiento sin conexión.
- **Atajos personalizados**: guardar y compartir combinaciones de ajustes.
- Generar **varios tamaños a la vez** (por ejemplo 400, 800 y 1600 px) para imágenes web adaptables.
- **Marca de agua** de texto o logo.
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

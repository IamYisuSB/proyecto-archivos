# Pixelote

Conversor de imágenes por lotes: cambia el formato, comprime, redimensiona y recorta. Todo se procesa en tu navegador y las imágenes nunca se suben a ningún sitio.

## Cómo usarlo

Abre `index.html` con doble clic en Chrome, Edge, Firefox o Safari. No necesita instalación ni servidor.

Funciona sin internet, salvo la primera vez que abres un HEIC o un TIFF, que generas AVIF en un navegador que no lo crea por sí mismo o que usas MozJPEG. En esos casos se descarga el decodificador o codificador correspondiente desde jsDelivr.

**Formatos de entrada:** JPG, PNG, WebP, AVIF, GIF, BMP, SVG, ICO, HEIC/HEIF, TIFF y RAW de cámara (vista previa incrustada).
**Formatos de salida:** WebP, JPG, PNG, AVIF, GIF, PDF, BMP, TIFF e ICO, o "Auto" (elige según sea foto, transparencia o gráfico).

**Extras:** PNG optimizado con paleta, JPG con MozJPEG, comparador antes/después, girar y voltear, conservar o quitar los datos EXIF/GPS, procesado en paralelo en segundo plano, varios tamaños a la vez, marca de agua opcional, atajos propios que se pueden compartir, ajustes por imagen, carpetas, modo claro/oscuro, cuatro idiomas con selector de banderas (español, inglés, portugués de Brasil y alemán) e informe de problemas.

## Diseños

Hay dos diseños con el mismo HTML:

- **Moderno** (`styles-moderno.css`): el que se usa por defecto.
- **Clásico** (`styles.css`): el anterior. Para verlo, abre la página con `?diseno=clasico` al final de la dirección (se recuerda). Con `?diseno=moderno` vuelves al nuevo.

Para quedarte con uno de forma permanente, cambia el `href` de `<link id="designCss">` en `index.html`.

## Informe de problemas

- El botón **🐞 Reportar un problema** del pie de página envía un informe con la descripción y datos técnicos: navegador, ajustes y errores recientes.
- **Cuando la app detecta un error** (una conversión que falla, un archivo ilegible, un fallo inesperado) muestra un aviso para enviarlo con un clic. Se puede marcar **«Enviar siempre sin preguntar»**, y desactivarlo después en *Opciones avanzadas*.
- Los informes llegan a tu correo mediante **Web3Forms** (clave en `web3formsKey`, dentro de `config.js`). Esa clave es pública por diseño: solo permite enviarte mensajes.
- Alternativas en `config.js`: un Worker propio (`reportEndpoint`, ver [`server/`](server/README.md)), un repositorio de GitHub (`reportGithub`) o un email (`reportEmail`).

## Seguridad

**Informes:**
- Nunca incluyen imágenes, nombres de archivo ni carpetas. Antes de enviar se sustituyen por `[archivo]`, igual que las rutas del equipo (que delatan el usuario de Windows), los emails y los enlaces internos. Todo esto también en el asunto.
- Límites por navegador, aunque se recargue la página: 5 informes por hora, 15 al día y 3 automáticos por sesión; el mismo error no se repite en 24 horas.
- Una casilla oculta hace de trampa para bots (`botcheck`), los informes tienen un tamaño máximo y cada envío tiene un tiempo máximo de espera.
- Web3Forms, además, filtra el spam en su servidor.

**Página:**
- **Política de seguridad de contenido (CSP):** la página solo puede ejecutar su propio código y el del CDN de los códecs, y solo puede enviar datos a Web3Forms.
- **Librerías externas verificadas:** HEIC, TIFF y pako se comprueban con su huella SHA-384 (SRI) antes de usarse; si el CDN sirviera otra cosa, se rechaza.
- **Decodificador HEIC aislado:** necesita una función (`new Function`) que la página prohíbe, así que se ejecuta en un iframe *sandbox* sin acceso a la página, al almacenamiento ni a internet. Por eso HEIC necesita conexión aunque la app esté instalada.

**Para reforzarlo aún más (opcional, de pago):** en el panel de Web3Forms, la opción Pro *Restrict to domain* hace que solo se acepten informes desde tu dominio.

**Si cambias código protegido por la CSP:** si editas el pequeño script de `<head>` en `index.html` o el de `heic-sandbox.html`, recalcula su huella `sha256` en la CSP del mismo archivo, o el navegador lo bloqueará.

## Instalarla como app y usarla sin conexión

Con doble clic en `index.html` funciona todo menos la instalación, porque el navegador solo permite instalar páginas servidas por `https` (o desde `localhost`). Para instalarla:

- **Publicarla:** sube la carpeta tal cual a GitHub Pages, Netlify o cualquier hosting estático. Aparecerá el botón **⬇ Instalar app** en la cabecera.
- **En tu equipo:** ejecuta `python -m http.server 8000` en esta carpeta y abre `http://localhost:8000`.

Una vez servida, en "Opciones avanzadas" el botón **Descargar códecs** deja TIFF, AVIF y MozJPEG listos para usarse sin internet. HEIC siempre necesita conexión (ver *Seguridad*).

1. Arrastra tus imágenes, haz clic para elegirlas o pégalas con Ctrl+V.
2. Elige el formato de salida, o pulsa uno de los atajos rápidos.
3. Si quieres, ajusta la calidad, el tamaño o el recorte (pulsa ✂ en una imagen para recortarla, girarla o voltearla).
4. Pulsa **Convertir**. Con **⇆ Comparar** puedes ver el antes y el después, y luego **Descargar todo (.zip)**.

## Archivos

| Archivo | Contenido |
|---|---|
| `config.js` | Configuración (clave de Web3Forms para los informes) |
| `index.html` | Estructura de la página |
| `styles-moderno.css` | Diseño moderno (el activo) |
| `i18n.js` | Traducciones (español, inglés, portugués, alemán) |
| `sw.js`, `manifest.webmanifest` | App instalable y uso sin conexión |
| `icons/` | Logo (`logo.svg`) e iconos de la app |
| `server/` | Alternativa: Worker de Cloudflare que envía los informes con Resend |
| `styles.css` | Diseño clásico, con modo claro/oscuro y versión móvil |
| `app.js` | Interfaz: carga de imágenes, ajustes, editor, comparador y reparto del trabajo entre Workers |
| `pipeline.js` | Procesado de una imagen (recorte, tamaño, codificación, EXIF); se ejecuta igual en un Worker o en la página |
| `encoders.js` | Codificadores BMP, TIFF, ICO, GIF, PDF y PNG con paleta, ZIP, EXIF, y AVIF/MozJPEG por WebAssembly |
| `decoders.js` | Lectura de HEIC, TIFF y RAW (con verificación de las librerías) |
| `heic-sandbox.html` | Compartimento aislado donde corre el decodificador HEIC |
| `ROADMAP.md` | Hoja de ruta |

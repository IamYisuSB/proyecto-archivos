# Pixelote de escritorio (Windows, Tauri)

Es la misma app web, dentro de una ventana de Windows. Tauri usa WebView2, el motor de Edge que ya trae Windows, en vez de incluir un navegador entero: por eso el `.exe` ocupa unos pocos MB.

La app web (la carpeta principal) sigue siendo la única fuente. Al compilar, `scripts/copy-web.mjs` la copia a `desktop/dist/` y Tauri la mete dentro del ejecutable. Cualquier cambio en la web entra en la siguiente compilación.

## Requisitos (una sola vez)

- Node.js
- Rust (`winget install Rustlang.Rustup`)
- Visual Studio Build Tools 2022 con «Desarrollo de escritorio con C++»
- WebView2 (ya viene con Windows 10/11)

## Comandos (desde esta carpeta, `desktop/`)

```
npm install            # la primera vez
npm run dev            # abre la app en modo desarrollo
npm run build          # crea src-tauri/target/release/pixelote.exe
npm run build:instalador   # además, un instalador .exe (NSIS) en src-tauri/target/release/bundle/
```

La primera compilación tarda varios minutos porque compila todas las librerías de Tauri. Las siguientes tardan segundos.

`pixelote.exe` funciona solo, sin instalar: puedes copiarlo donde quieras y hacer un acceso directo. No está firmado, así que la primera vez Windows puede mostrar «Windows protegió su PC»: pulsa *Más información → Ejecutar de todas formas*.

## Diferencias con la versión web

- No muestra el botón «Instalar app» ni usa el *service worker*: ya es una app.
- Arrastrar y soltar archivos y carpetas funciona igual. Tauri tiene su propio sistema de arrastre, que está desactivado para que funcione el de la app.
- HEIC, TIFF, AVIF y MozJPEG descargan sus códecs la primera vez que se usan, igual que en la web (después quedan en la caché de WebView2).

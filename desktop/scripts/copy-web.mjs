// Copia la app web (la carpeta principal del proyecto) a desktop/dist, que es
// lo que Tauri mete dentro del .exe. Así la app web sigue siendo la única
// fuente: cualquier cambio en ella entra en la próxima compilación.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../..');
const dist = resolve(here, '../dist');

// Solo lo que necesita la app; nada de server/, desktop/, documentación…
// La página de descarga no tiene sentido dentro de la propia app de escritorio
const files = readdirSync(web).filter((f) => /\.(html|js|css|webmanifest)$/.test(f) && !f.startsWith('descargar.'));
const folders = ['icons'];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const f of files) cpSync(join(web, f), join(dist, f));
for (const d of folders) cpSync(join(web, d), join(dist, d), { recursive: true });
console.log(`App web copiada a desktop/dist: ${files.length} archivos + ${folders.join(', ')}`);

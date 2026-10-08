// Publica la app de escritorio:
//  1. Copia el instalador y el .exe portable a descargas/ (junto a la app web).
//  2. Escribe descargas/version.js, que la página descargar/ usa para
//     mostrar versión, tamaño, huellas SHA-256 y los enlaces de descarga.
//  3. Con --github, crea (o actualiza) la Release vX.Y.Z en GitHub con los dos
//     .exe. Necesita la herramienta `gh` con la sesión iniciada (gh auth login).
// Se ejecuta con `npm run publicar` o `npm run publicar:github`, tras compilar.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const tauriDir = resolve(here, '../src-tauri');
const out = join(root, 'descargas');
const toGithub = process.argv.includes('--github');
const { version } = JSON.parse(readFileSync(join(tauriDir, 'tauri.conf.json'), 'utf8'));
const tag = `v${version}`;

/* "usuario/repositorio" a partir del remoto origin de git, si es de GitHub. */
function githubRepo() {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
    const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    return m ? `${m[1]}/${m[2]}` : null;
  } catch (_) {
    return null;
  }
}

const portableSrc = join(tauriDir, 'target/release/pixelote.exe');
const nsisDir = join(tauriDir, 'target/release/bundle/nsis');
const installerName = existsSync(nsisDir) && readdirSync(nsisDir).find((f) => f.includes(version) && f.endsWith('-setup.exe'));

if (!existsSync(portableSrc) || !installerName) {
  console.error('Faltan archivos compilados. Ejecuta antes: npm run build:instalador');
  process.exit(1);
}

const repo = githubRepo();
mkdirSync(out, { recursive: true });
// Se borran los .exe de versiones anteriores
for (const f of readdirSync(out)) if (f.endsWith('.exe')) unlinkSync(join(out, f));

const files = [
  { type: 'installer', src: join(nsisDir, installerName), file: `Pixelote-${version}-instalador.exe` },
  { type: 'portable', src: portableSrc, file: `Pixelote-${version}-portable.exe` },
].map(({ type, src, file }) => {
  copyFileSync(src, join(out, file));
  const data = readFileSync(join(out, file));
  return {
    type, file, size: statSync(join(out, file)).size,
    sha256: createHash('sha256').update(data).digest('hex'),
    // Enlace a la Release de GitHub (si el repositorio está en GitHub)
    ...(repo ? { url: `https://github.com/${repo}/releases/download/${tag}/${file}` } : {}),
  };
});

const info = { version, date: new Date().toISOString(), ...(repo ? { repo, tag } : {}), files };
writeFileSync(join(out, 'version.js'),
  '// Generado por desktop/scripts/publish.mjs. No editar a mano.\n' +
  `window.PIXELOTE_DOWNLOADS = ${JSON.stringify(info, null, 2)};\n`);

for (const f of files) console.log(`${f.file}  ${(f.size / 1048576).toFixed(2)} MB  sha256 ${f.sha256}`);
console.log(`Copiado a descargas/ (versión ${version})`);

if (!toGithub) process.exit(0);

// ---------- Release en GitHub ----------
if (!repo) {
  console.error('El remoto "origin" no es un repositorio de GitHub; no se puede crear la Release.');
  process.exit(1);
}
const assets = files.map((f) => join(out, f.file));
const notes = [
  `Pixelote ${version} para Windows 10 y 11.`,
  '',
  `- **${files[0].file}**: instalador (recomendado). Añade Pixelote al menú Inicio; no pide permisos de administrador.`,
  `- **${files[1].file}**: versión portable, un solo .exe sin instalar.`,
  '',
  'La app no está firmada: la primera vez Windows puede mostrar «Windows protegió su PC». Pulsa *Más información → Ejecutar de todas formas*.',
  '',
  '### Huellas SHA-256',
  '',
  ...files.map((f) => `- \`${f.file}\`: \`${f.sha256.toUpperCase()}\``),
  '',
  'Compruébalas en PowerShell con `Get-FileHash .\\Pixelote*.exe`.',
].join('\n');
const notesFile = join(tmpdir(), `pixelote-notas-${version}.md`);
writeFileSync(notesFile, notes);

let exists = false;
try { execFileSync('gh', ['release', 'view', tag, '--repo', repo], { stdio: 'ignore' }); exists = true; } catch (_) { /* no existe */ }
if (exists) {
  execFileSync('gh', ['release', 'upload', tag, ...assets, '--clobber', '--repo', repo], { stdio: 'inherit' });
  execFileSync('gh', ['release', 'edit', tag, '--notes-file', notesFile, '--repo', repo], { stdio: 'inherit' });
  console.log(`Release ${tag} actualizada: https://github.com/${repo}/releases/tag/${tag}`);
} else {
  execFileSync('gh', ['release', 'create', tag, ...assets, '--repo', repo, '--title', `Pixelote ${version}`, '--notes-file', notesFile, '--latest'], { stdio: 'inherit' });
  console.log(`Release ${tag} creada: https://github.com/${repo}/releases/tag/${tag}`);
}

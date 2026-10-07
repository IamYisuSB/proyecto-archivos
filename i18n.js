/* Traducción de la interfaz (español, inglés y portugués).
 *
 * El texto en español es la clave: t('Vaciar') devuelve 'Clear' en inglés. Los
 * textos fijos del HTML se traducen solos: al arrancar se recorren los nodos de
 * texto y los atributos title / aria-label / placeholder / alt, se guarda su
 * original y se sustituye por la traducción cada vez que cambia el idioma. */
(function (global) {
  'use strict';

  const LANGS = ['es', 'en', 'pt'];
  const DICT = { en: {}, pt: {} };
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const textOrig = new Map();
  const attrOrig = new Map();
  const listeners = [];

  let lang = '';
  try { lang = localStorage.getItem('pixelote.lang') || ''; } catch (_) { /* sin almacenamiento */ }
  if (!LANGS.includes(lang)) {
    const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    lang = LANGS.includes(nav) ? nav : 'en';
  }

  function t(s, params) {
    let out = (lang !== 'es' && DICT[lang][s]) || s;
    if (params) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
    return out;
  }

  // Textos que no hay que traducir: números, símbolos, nombres de formato…
  const SKIP = /^[\s\d·×%→←⇤⇥⟳⟲⇋⇵⇆✂✕+\-.,:;()|/—–…]*$/;

  function capture(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const s = n.nodeValue.trim();
      const parent = n.parentElement;
      if (!s || SKIP.test(s) || !parent || parent.closest('script, style, code')) continue;
      textOrig.set(n, n.nodeValue);
    }
    root.querySelectorAll('*').forEach((el) => {
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const o = attrOrig.get(el) || {};
        o[a] = el.getAttribute(a);
        attrOrig.set(el, o);
      }
    });
  }

  function applyStatic() {
    for (const [node, orig] of textOrig) {
      const s = orig.trim();
      const tr = t(s);
      node.nodeValue = orig.replace(s, () => tr);
    }
    for (const [el, o] of attrOrig) for (const a in o) el.setAttribute(a, t(o[a]));
    document.documentElement.lang = lang;
  }

  /* ---------- Diccionarios ---------- */

  // [español, inglés, portugués]
  const ROWS = [
    ['Pixelote · Conversor de imágenes', 'Pixelote · Image converter', 'Pixelote · Conversor de imagens'],
    ['Convierte, comprime, redimensiona y recorta imágenes por lotes', 'Convert, compress, resize and crop images in batches', 'Converta, comprima, redimensione e recorte imagens em lote'],
    ['Tus imágenes no salen de tu equipo', 'Your images never leave your device', 'Suas imagens não saem do seu dispositivo'],
    ['El procesamiento ocurre en tu dispositivo', 'Processing happens on your device', 'O processamento acontece no seu dispositivo'],
    ['⬇ Instalar app', '⬇ Install app', '⬇ Instalar app'],
    ['Idioma', 'Language', 'Idioma'],
    ['Cambiar a modo claro', 'Switch to light mode', 'Mudar para o modo claro'],
    ['Cambiar a modo oscuro', 'Switch to dark mode', 'Mudar para o modo escuro'],
    ['Imágenes', 'Images', 'Imagens'],
    ['Ajustes', 'Settings', 'Configurações'],

    // Zona de soltar y barra
    ['Arrastra tus imágenes o carpetas aquí', 'Drag your images or folders here', 'Arraste suas imagens ou pastas aqui'],
    ['o', 'or', 'ou'],
    ['haz clic para elegirlas', 'click to choose them', 'clique para escolhê-las'],
    ['· también puedes pegar con Ctrl+V', '· you can also paste with Ctrl+V', '· também pode colar com Ctrl+V'],
    ['⟳ Girar todas', '⟳ Rotate all', '⟳ Girar todas'],
    ['📁 Añadir carpeta', '📁 Add folder', '📁 Adicionar pasta'],
    ['+ Añadir más', '+ Add more', '+ Adicionar mais'],
    ['Vaciar', 'Clear', 'Limpar'],
    ['Arrastra las imágenes para cambiar el orden (se usa en la numeración y en el PDF).', 'Drag the images to change their order (used for numbering and in the PDF).', 'Arraste as imagens para mudar a ordem (usada na numeração e no PDF).'],
    ['imagen', 'image', 'imagem'],
    ['imágenes', 'images', 'imagens'],
    ['No he encontrado imágenes en lo que has soltado', 'No images found in what you dropped', 'Não encontrei imagens no que você soltou'],

    // Atajos
    ['Atajos rápidos', 'Quick presets', 'Atalhos rápidos'],
    ['Web optimizada', 'Web optimized', 'Web otimizada'],
    ['Instagram', 'Instagram', 'Instagram'],
    ['Para email', 'For email', 'Para e-mail'],
    ['Miniaturas', 'Thumbnails', 'Miniaturas'],
    ['Sin pérdida', 'Lossless', 'Sem perda'],
    ['Favicon', 'Favicon', 'Favicon'],
    ['＋ Guardar ajustes actuales', '＋ Save current settings', '＋ Salvar configurações atuais'],
    ['Importar', 'Import', 'Importar'],
    ['Nombre del atajo', 'Preset name', 'Nome do atalho'],
    ['Guardar', 'Save', 'Salvar'],
    ['Cancelar', 'Cancel', 'Cancelar'],
    ['Compartir', 'Share', 'Compartilhar'],
    ['Borrar', 'Delete', 'Apagar'],
    ['Atajo aplicado: {name}', 'Preset applied: {name}', 'Atalho aplicado: {name}'],
    ['Atajo «{name}» guardado', 'Preset “{name}” saved', 'Atalho “{name}” salvo'],
    ['Ese archivo no es un atajo de Pixelote', "That file isn't a Pixelote preset", 'Esse arquivo não é um atalho do Pixelote'],
    ['El enlace del atajo no es válido', 'The preset link is not valid', 'O link do atalho não é válido'],
    ['Te han compartido el atajo «{name}».', 'Someone shared the preset “{name}” with you.', 'Compartilharam com você o atalho “{name}”.'],
    ['Añadir a mis atajos', 'Add to my presets', 'Adicionar aos meus atalhos'],
    ['Ignorar', 'Ignore', 'Ignorar'],
    ['Compartir atajo', 'Share preset', 'Compartilhar atalho'],
    ['Enlace', 'Link', 'Link'],
    ['Quien abra el enlace podrá añadir el atajo a los suyos. También puedes enviar el archivo.', 'Whoever opens the link can add the preset to theirs. You can also send the file.', 'Quem abrir o link poderá adicionar o atalho aos seus. Você também pode enviar o arquivo.'],
    ['Descargar archivo', 'Download file', 'Baixar arquivo'],
    ['Copiar enlace', 'Copy link', 'Copiar link'],
    ['Enlace copiado', 'Link copied', 'Link copiado'],
    ['Cerrar', 'Close', 'Fechar'],

    // Formato
    ['Formato de salida', 'Output format', 'Formato de saída'],
    ['Auto', 'Auto', 'Auto'],
    ['Original', 'Original', 'Original'],
    ['según imagen', 'per image', 'por imagem'],
    ['mismo formato', 'same format', 'mesmo formato'],
    ['con pérdida', 'lossy', 'com perda'],
    ['sin pérdida', 'lossless', 'sem perda'],
    ['Tu navegador no puede generar este formato', "Your browser can't create this format", 'Seu navegador não consegue gerar este formato'],
    ['Tu navegador no puede generar {f}', "Your browser can't create {f}", 'Seu navegador não consegue gerar {f}'],
    ['Elige el formato según cada imagen: fotos, imágenes con transparencia o gráficos y capturas.', 'Picks the format for each image: photos, images with transparency, or graphics and screenshots.', 'Escolhe o formato para cada imagem: fotos, imagens com transparência ou gráficos e capturas.'],
    ['Mantiene el formato de cada imagen y solo la comprime o ajusta.', 'Keeps each image’s format and only compresses or adjusts it.', 'Mantém o formato de cada imagem e apenas a comprime ou ajusta.'],
    ['Muy ligero y con transparencia. Ideal para webs.', 'Very light, with transparency. Ideal for websites.', 'Muito leve e com transparência. Ideal para sites.'],
    ['El más compatible. Perfecto para fotos.', 'The most compatible. Perfect for photos.', 'O mais compatível. Perfeito para fotos.'],
    ['Sin pérdida y con transparencia. Logos, capturas, gráficos.', 'Lossless, with transparency. Logos, screenshots, graphics.', 'Sem perda e com transparência. Logos, capturas, gráficos.'],
    ['La máxima compresión moderna.', 'The best modern compression.', 'A máxima compressão moderna.'],
    ['Este navegador no lo genera, así que se descargará un codificador la primera vez (y es más lento).', "This browser can't create it, so an encoder will be downloaded the first time (and it's slower).", 'Este navegador não o gera, então um codificador será baixado na primeira vez (e é mais lento).'],
    ['Compatible con todo, pero limitado a 256 colores. Bien para gráficos sencillos, no para fotos.', 'Works everywhere, but limited to 256 colors. Good for simple graphics, not for photos.', 'Compatível com tudo, mas limitado a 256 cores. Bom para gráficos simples, não para fotos.'],
    ['Documento PDF con una imagen por página, o todas juntas en un solo PDF.', 'PDF document with one image per page, or all of them in a single PDF.', 'Documento PDF com uma imagem por página, ou todas juntas em um só PDF.'],
    ['Mapa de bits sin comprimir. Para programas antiguos.', 'Uncompressed bitmap. For old programs.', 'Bitmap sem compressão. Para programas antigos.'],
    ['Sin pérdida. Para impresión y archivo.', 'Lossless. For printing and archiving.', 'Sem perda. Para impressão e arquivo.'],
    ['Icono de Windows / favicon con varios tamaños (16–256 px).', 'Windows icon / favicon with several sizes (16–256 px).', 'Ícone do Windows / favicon com vários tamanhos (16–256 px).'],
    ['Unir todas en un solo PDF', 'Merge all into a single PDF', 'Juntar todas em um só PDF'],
    ['Tamaño de página', 'Page size', 'Tamanho da página'],
    ['Como la imagen', 'Same as image', 'Igual à imagem'],
    ['📷 Fotos', '📷 Photos', '📷 Fotos'],
    ['🫥 Con transparencia', '🫥 With transparency', '🫥 Com transparência'],
    ['📐 Gráficos y capturas', '📐 Graphics and screenshots', '📐 Gráficos e capturas'],
    ['foto', 'photo', 'foto'],
    ['transparencia', 'transparency', 'transparência'],
    ['gráfico', 'graphic', 'gráfico'],

    // Compresión
    ['Compresión', 'Compression', 'Compressão'],
    ['Calidad', 'Quality', 'Qualidade'],
    ['Más ligero', 'Smaller', 'Mais leve'],
    ['Mejor calidad', 'Better quality', 'Melhor qualidade'],
    ['Intentar no superar', 'Try not to exceed', 'Tentar não passar de'],
    ['Tamaño máximo en KB', 'Maximum size in KB', 'Tamanho máximo em KB'],
    ['Compresión PNG', 'PNG compression', 'Compressão PNG'],
    ['Optimizada', 'Optimized', 'Otimizada'],
    ['Colores', 'Colors', 'Cores'],
    ['Reduce la paleta como TinyPNG: suele pesar un 50–70 % menos y apenas se nota.', 'Reduces the palette like TinyPNG: usually 50–70% smaller and barely noticeable.', 'Reduz a paleta como o TinyPNG: costuma pesar 50–70% menos e quase não se nota.'],
    ['JPG más ligeros con MozJPEG', 'Smaller JPGs with MozJPEG', 'JPGs mais leves com MozJPEG'],
    ['(nunca más grande que sin él)', '(never bigger than without it)', '(nunca maior do que sem ele)'],
    ['Este formato no tiene pérdida: la calidad no se ajusta. Reduce el tamaño (paso 3) para que pese menos.', 'This format is lossless: quality can’t be adjusted. Reduce the size (step 3) to make it lighter.', 'Este formato não tem perda: a qualidade não se ajusta. Reduza o tamanho (passo 3) para que fique mais leve.'],

    // Tamaño
    ['Tamaño', 'Size', 'Tamanho'],
    ['Modo de redimensionado', 'Resize mode', 'Modo de redimensionamento'],
    ['Máximo', 'Max', 'Máximo'],
    ['Exacto', 'Exact', 'Exato'],
    ['Varios', 'Several', 'Vários'],
    ['Escala', 'Scale', 'Escala'],
    ['Ancho máx.', 'Max width', 'Largura máx.'],
    ['Alto máx.', 'Max height', 'Altura máx.'],
    ['Ancho', 'Width', 'Largura'],
    ['Alto', 'Height', 'Altura'],
    ['Mantiene la proporción y nunca agranda la imagen.', 'Keeps the proportions and never enlarges the image.', 'Mantém a proporção e nunca aumenta a imagem.'],
    ['Recortar para no deformar', 'Crop to avoid distortion', 'Recortar para não deformar'],
    ['Anchos (px), separados por comas', 'Widths (px), separated by commas', 'Larguras (px), separadas por vírgulas'],
    ['Crea una copia de cada imagen en cada ancho, para webs adaptables (srcset). Nunca agranda.', 'Creates a copy of each image at each width, for responsive websites (srcset). Never enlarges.', 'Cria uma cópia de cada imagem em cada largura, para sites responsivos (srcset). Nunca aumenta.'],
    ['Se mantienen las dimensiones originales.', 'The original dimensions are kept.', 'As dimensões originais são mantidas.'],

    // Recorte
    ['Recorte', 'Crop', 'Recorte'],
    ['Proporción de recorte', 'Crop ratio', 'Proporção de recorte'],
    ['Sin recorte', 'No crop', 'Sem recorte'],
    ['Recorta todas al centro. Para elegir la zona exacta, girar o voltear, pulsa', 'Crops all of them at the center. To choose the exact area, rotate or flip, press', 'Recorta todas no centro. Para escolher a área exata, girar ou espelhar, toque em'],
    ['en cada imagen (o', 'on each image (or', 'em cada imagem (ou'],
    ['para girarla).', 'to rotate it).', 'para girá-la).'],

    // Marca de agua
    ['Marca de agua', 'Watermark', 'Marca d’água'],
    ['(opcional)', '(optional)', '(opcional)'],
    ['Añadir marca de agua', 'Add watermark', 'Adicionar marca d’água'],
    ['Tipo de marca de agua', 'Watermark type', 'Tipo de marca d’água'],
    ['Texto', 'Text', 'Texto'],
    ['Logo', 'Logo', 'Logo'],
    ['Texto de la marca de agua', 'Watermark text', 'Texto da marca d’água'],
    ['Color del texto', 'Text color', 'Cor do texto'],
    ['Elegir logo…', 'Choose logo…', 'Escolher logo…'],
    ['Cambiar logo…', 'Change logo…', 'Trocar logo…'],
    ['Quitar', 'Remove', 'Remover'],
    ['Posición', 'Position', 'Posição'],
    ['Arriba a la izquierda', 'Top left', 'Em cima à esquerda'],
    ['Arriba al centro', 'Top center', 'Em cima ao centro'],
    ['Arriba a la derecha', 'Top right', 'Em cima à direita'],
    ['Centro a la izquierda', 'Middle left', 'Centro à esquerda'],
    ['Centro', 'Center', 'Centro'],
    ['Centro a la derecha', 'Middle right', 'Centro à direita'],
    ['Abajo a la izquierda', 'Bottom left', 'Embaixo à esquerda'],
    ['Abajo al centro', 'Bottom center', 'Embaixo ao centro'],
    ['Abajo a la derecha', 'Bottom right', 'Embaixo à direita'],
    ['Mosaico', 'Tiled', 'Mosaico'],
    ['Opacidad', 'Opacity', 'Opacidade'],
    ['No se pudo leer el logo', "Couldn't read the logo", 'Não foi possível ler o logo'],
    ['El logo se usará ahora, pero no se recordará la próxima vez (es muy grande).', "The logo will be used now, but it won't be remembered next time (it's too big).", 'O logo será usado agora, mas não será lembrado da próxima vez (é muito grande).'],

    // Avanzadas
    ['Opciones avanzadas', 'Advanced options', 'Opções avançadas'],
    ['Nombre de los archivos', 'File names', 'Nome dos arquivos'],
    ['Usa', 'Use', 'Use'],
    ['Fondo para transparencias', 'Background for transparency', 'Fundo para transparências'],
    ['(JPG y BMP no admiten transparencia)', "(JPG and BMP don't support transparency)", '(JPG e BMP não suportam transparência)'],
    ['Datos de la foto (EXIF)', 'Photo data (EXIF)', 'Dados da foto (EXIF)'],
    ['Datos de la foto', 'Photo data', 'Dados da foto'],
    ['Quitar todos', 'Remove all', 'Remover todos'],
    ['Sin ubicación', 'No location', 'Sem localização'],
    ['Conservar', 'Keep', 'Manter'],
    ['Se eliminan la cámara, la fecha, la ubicación y el resto de datos.', 'Camera, date, location and all other data are removed.', 'Câmera, data, localização e os demais dados são removidos.'],
    ['Se conservan al guardar en JPG, PNG o WebP a partir de fotos JPG.', 'Kept when saving to JPG, PNG or WebP from JPG photos.', 'São mantidos ao salvar em JPG, PNG ou WebP a partir de fotos JPG.'],
    ['La ubicación GPS se borra.', 'The GPS location is deleted.', 'A localização GPS é apagada.'],
    ['Uso sin conexión', 'Offline use', 'Uso offline'],
    ['Descargar códecs (HEIC, TIFF, AVIF, MozJPEG)', 'Download codecs (HEIC, TIFF, AVIF, MozJPEG)', 'Baixar codecs (HEIC, TIFF, AVIF, MozJPEG)'],
    ['Así podrás leer y crear todos los formatos aunque no tengas internet.', "So you can read and create every format even without internet.", 'Assim você poderá ler e criar todos os formatos mesmo sem internet.'],
    ['Descargando… {i}/{n}', 'Downloading… {i}/{n}', 'Baixando… {i}/{n}'],
    ['Listo: ya puedes usar todos los formatos sin conexión', 'Done: you can now use every format offline', 'Pronto: agora você pode usar todos os formatos offline'],
    ['No se pudieron descargar todos los códecs. ¿Hay conexión?', "Couldn't download all the codecs. Are you online?", 'Não foi possível baixar todos os codecs. Há conexão?'],
    ['Restablecer ajustes', 'Reset settings', 'Restaurar configurações'],
    ['Ajustes restablecidos', 'Settings reset', 'Configurações restauradas'],
    ['¡Pixelote instalado!', 'Pixelote installed!', 'Pixelote instalado!'],

    // Acciones y resultados
    ['Convertir imágenes', 'Convert images', 'Converter imagens'],
    ['Convertir {n} imagen', 'Convert {n} image', 'Converter {n} imagem'],
    ['Convertir {n} imágenes', 'Convert {n} images', 'Converter {n} imagens'],
    ['Volver a convertir {n} imagen', 'Convert {n} image again', 'Converter {n} imagem de novo'],
    ['Volver a convertir {n} imágenes', 'Convert {n} images again', 'Converter {n} imagens de novo'],
    ['Preparando…', 'Preparing…', 'Preparando…'],
    ['Procesando {i} de {n}…', 'Processing {i} of {n}…', 'Processando {i} de {n}…'],
    ['Procesando…', 'Processing…', 'Processando…'],
    ['Cargando…', 'Loading…', 'Carregando…'],
    ['Decodificando {f}…', 'Decoding {f}…', 'Decodificando {f}…'],
    ['¡Listo! {n} imagen convertida', 'Done! {n} image converted', 'Pronto! {n} imagem convertida'],
    ['¡Listo! {n} imágenes convertidas', 'Done! {n} images converted', 'Pronto! {n} imagens convertidas'],
    ['Listo, pero {n} no se pudieron convertir', "Done, but {n} couldn't be converted", 'Pronto, mas {n} não puderam ser convertidas'],
    ['(sin MozJPEG: hace falta internet la primera vez)', '(no MozJPEG: internet is needed the first time)', '(sem MozJPEG: é preciso internet na primeira vez)'],
    ['Descargar todo', 'Download all', 'Baixar tudo'],
    ['Descargar', 'Download', 'Baixar'],
    ['Descargar todo (.zip)', 'Download all (.zip)', 'Baixar tudo (.zip)'],
    ['Descargar PDF único ({n} páginas)', 'Download single PDF ({n} pages)', 'Baixar PDF único ({n} páginas)'],
    ['Creando ZIP…', 'Creating ZIP…', 'Criando ZIP…'],
    ['Guardar en carpeta', 'Save to folder', 'Salvar na pasta'],
    ['{n} archivo guardado en «{dir}»', '{n} file saved to “{dir}”', '{n} arquivo salvo em “{dir}”'],
    ['{n} archivos guardados en «{dir}»', '{n} files saved to “{dir}”', '{n} arquivos salvos em “{dir}”'],
    ['No se pudo guardar en la carpeta ({n} guardados)', "Couldn't save to the folder ({n} saved)", 'Não foi possível salvar na pasta ({n} salvos)'],
    ['Antes', 'Before', 'Antes'],
    ['Después', 'After', 'Depois'],
    ['Archivos', 'Files', 'Arquivos'],
    ['Ahorro', 'Saved', 'Economia'],
    ['Aumento', 'Increase', 'Aumento'],
    ['No se pudo convertir', "Couldn't convert", 'Não foi possível converter'],
    ['No se alcanzó el tamaño objetivo', 'Target size not reached', 'O tamanho desejado não foi alcançado'],
    ['Ajustes cambiados: vuelve a convertir', 'Settings changed: convert again', 'Configurações alteradas: converta de novo'],
    ['Comparar', 'Compare', 'Comparar'],
    ['Comparar antes y después', 'Compare before and after', 'Comparar antes e depois'],

    // Tarjetas
    ['Tu navegador no puede leer este archivo', "Your browser can't read this file", 'Seu navegador não consegue ler este arquivo'],
    ['Para leer {f} hace falta internet la primera vez', 'Reading {f} needs internet the first time', 'Para ler {f} é preciso internet na primeira vez'],
    ['No se pudo leer este {f}', "Couldn't read this {f}", 'Não foi possível ler este {f}'],
    ['Este RAW no trae una vista previa legible', "This RAW file doesn't include a readable preview", 'Este RAW não traz uma pré-visualização legível'],
    ['Contiene ubicación GPS y se conservará', 'Contains a GPS location and it will be kept', 'Contém localização GPS e ela será mantida'],
    ['Contiene ubicación GPS (se eliminará)', 'Contains a GPS location (it will be removed)', 'Contém localização GPS (será removida)'],
    ['propios', 'custom', 'próprios'],
    ['recorte', 'crop', 'recorte'],
    ['girada', 'rotated', 'girada'],
    ['Ajustes de esta imagen', 'Settings for this image', 'Configurações desta imagem'],
    ['Girar 90°', 'Rotate 90°', 'Girar 90°'],
    ['Recortar y girar', 'Crop and rotate', 'Recortar e girar'],

    // Diálogo de ajustes por imagen
    ['Formato', 'Format', 'Formato'],
    ['Igual que el resto', 'Same as the rest', 'Igual ao resto'],
    ['Calidad propia', 'Custom quality', 'Qualidade própria'],
    ['Ancho máximo (px)', 'Max width (px)', 'Largura máxima (px)'],
    ['Orden', 'Order', 'Ordem'],
    ['⇤ Primera', '⇤ First', '⇤ Primeira'],
    ['← Antes', '← Earlier', '← Antes'],
    ['Después →', 'Later →', 'Depois →'],
    ['Última ⇥', 'Last ⇥', 'Última ⇥'],
    ['Usar ajustes generales', 'Use general settings', 'Usar configurações gerais'],
    ['Aplicar', 'Apply', 'Aplicar'],

    // Editor y comparador
    ['Girar a la izquierda', 'Rotate left', 'Girar para a esquerda'],
    ['Girar a la derecha', 'Rotate right', 'Girar para a direita'],
    ['Voltear horizontal', 'Flip horizontally', 'Espelhar na horizontal'],
    ['Voltear vertical', 'Flip vertically', 'Espelhar na vertical'],
    ['Libre', 'Free', 'Livre'],
    ['Restablecer', 'Reset', 'Restaurar'],
    ['Antes y después', 'Before and after', 'Antes e depois'],
    ['Ajustar', 'Fit', 'Ajustar'],
    ['Zoom', 'Zoom', 'Zoom'],
    ['Resultado', 'Result', 'Resultado'],
    ['Posición del comparador', 'Comparison slider position', 'Posição do comparador'],
  ];
  for (const [es, en, pt] of ROWS) { DICT.en[es] = en; DICT.pt[es] = pt; }

  global.I18N = {
    t,
    LANGS,
    DICT,
    get lang() { return lang; },
    /* Captura los textos fijos de la página y los traduce. Llamar una vez al arrancar. */
    init() {
      capture(document.documentElement);
      applyStatic();
    },
    setLang(l) {
      if (!LANGS.includes(l) || l === lang) return;
      lang = l;
      try { localStorage.setItem('pixelote.lang', l); } catch (_) { /* nada */ }
      applyStatic();
      listeners.forEach((fn) => fn(l));
    },
    onChange(fn) { listeners.push(fn); },
    /* Claves que se han capturado del HTML (para comprobar que todo está traducido). */
    staticKeys() {
      const keys = new Set();
      for (const orig of textOrig.values()) keys.add(orig.trim());
      for (const o of attrOrig.values()) for (const a in o) keys.add(o[a]);
      return Array.from(keys);
    },
  };
})(window);

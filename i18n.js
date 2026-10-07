/* Traducción de la interfaz (español, inglés, portugués y alemán).
 *
 * El texto en español es la clave: t('Vaciar') devuelve 'Clear' en inglés. Los
 * textos fijos del HTML se traducen solos: al arrancar se recorren los nodos de
 * texto y los atributos title / aria-label / placeholder / alt, se guarda su
 * original y se sustituye por la traducción cada vez que cambia el idioma. */
(function (global) {
  'use strict';

  const LANGS = ['es', 'en', 'pt', 'de'];
  const DICT = { en: {}, pt: {}, de: {} };
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

  // [español, inglés, portugués, alemán]
  const ROWS = [
    ['Pixelote · Conversor de imágenes', 'Pixelote · Image converter', 'Pixelote · Conversor de imagens', 'Pixelote · Bildkonverter'],
    ['Convierte, comprime, redimensiona y recorta imágenes por lotes', 'Convert, compress, resize and crop images in batches', 'Converta, comprima, redimensione e recorte imagens em lote', 'Bilder stapelweise konvertieren, komprimieren, skalieren und zuschneiden'],
    ['Tus imágenes no salen de tu equipo', 'Your images never leave your device', 'Suas imagens não saem do seu dispositivo', 'Deine Bilder verlassen nie dein Gerät'],
    ['El procesamiento ocurre en tu dispositivo', 'Processing happens on your device', 'O processamento acontece no seu dispositivo', 'Die Verarbeitung findet auf deinem Gerät statt'],
    ['⬇ Instalar app', '⬇ Install app', '⬇ Instalar app', '⬇ App installieren'],
    ['Idioma', 'Language', 'Idioma', 'Sprache'],
    ['Cambiar a modo claro', 'Switch to light mode', 'Mudar para o modo claro', 'Zum hellen Modus wechseln'],
    ['Cambiar a modo oscuro', 'Switch to dark mode', 'Mudar para o modo escuro', 'Zum dunklen Modus wechseln'],
    ['Imágenes', 'Images', 'Imagens', 'Bilder'],
    ['Ajustes', 'Settings', 'Configurações', 'Einstellungen'],

    // Zona de soltar y barra
    ['Arrastra tus imágenes o carpetas aquí', 'Drag your images or folders here', 'Arraste suas imagens ou pastas aqui', 'Ziehe deine Bilder oder Ordner hierher'],
    ['o', 'or', 'ou', 'oder'],
    ['haz clic para elegirlas', 'click to choose them', 'clique para escolhê-las', 'klicke, um sie auszuwählen'],
    ['· también puedes pegar con Ctrl+V', '· you can also paste with Ctrl+V', '· também pode colar com Ctrl+V', '· du kannst auch mit Strg+V einfügen'],
    ['Suelta para añadir', 'Drop to add', 'Solte para adicionar', 'Zum Hinzufügen loslassen'],
    ['⟳ Girar todas', '⟳ Rotate all', '⟳ Girar todas', '⟳ Alle drehen'],
    ['📁 Añadir carpeta', '📁 Add folder', '📁 Adicionar pasta', '📁 Ordner hinzufügen'],
    ['+ Añadir más', '+ Add more', '+ Adicionar mais', '+ Mehr hinzufügen'],
    ['Vaciar', 'Clear', 'Limpar', 'Leeren'],
    ['Arrastra las imágenes para cambiar el orden (se usa en la numeración y en el PDF).', 'Drag the images to change their order (used for numbering and in the PDF).', 'Arraste as imagens para mudar a ordem (usada na numeração e no PDF).', 'Ziehe die Bilder, um die Reihenfolge zu ändern (wird für die Nummerierung und im PDF verwendet).'],
    ['imagen', 'image', 'imagem', 'Bild'],
    ['imágenes', 'images', 'imagens', 'Bilder'],
    ['No he encontrado imágenes en lo que has soltado', 'No images found in what you dropped', 'Não encontrei imagens no que você soltou', 'In dem, was du abgelegt hast, wurden keine Bilder gefunden'],

    // Atajos
    ['Atajos rápidos', 'Quick presets', 'Atalhos rápidos', 'Schnellvorlagen'],
    ['Web optimizada', 'Web optimized', 'Web otimizada', 'Fürs Web optimiert'],
    ['Instagram', 'Instagram', 'Instagram', 'Instagram'],
    ['Para email', 'For email', 'Para e-mail', 'Für E-Mail'],
    ['Miniaturas', 'Thumbnails', 'Miniaturas', 'Vorschaubilder'],
    ['Sin pérdida', 'Lossless', 'Sem perda', 'Verlustfrei'],
    ['Favicon', 'Favicon', 'Favicon', 'Favicon'],
    ['＋ Guardar ajustes actuales', '＋ Save current settings', '＋ Salvar configurações atuais', '＋ Aktuelle Einstellungen speichern'],
    ['Importar', 'Import', 'Importar', 'Importieren'],
    ['Nombre del atajo', 'Preset name', 'Nome do atalho', 'Name der Vorlage'],
    ['Guardar', 'Save', 'Salvar', 'Speichern'],
    ['Cancelar', 'Cancel', 'Cancelar', 'Abbrechen'],
    ['Compartir', 'Share', 'Compartilhar', 'Teilen'],
    ['Borrar', 'Delete', 'Apagar', 'Löschen'],
    ['Atajo aplicado: {name}', 'Preset applied: {name}', 'Atalho aplicado: {name}', 'Vorlage angewendet: {name}'],
    ['Atajo «{name}» guardado', 'Preset “{name}” saved', 'Atalho “{name}” salvo', 'Vorlage „{name}“ gespeichert'],
    ['Ese archivo no es un atajo de Pixelote', "That file isn't a Pixelote preset", 'Esse arquivo não é um atalho do Pixelote', 'Diese Datei ist keine Pixelote-Vorlage'],
    ['El enlace del atajo no es válido', 'The preset link is not valid', 'O link do atalho não é válido', 'Der Link zur Vorlage ist ungültig'],
    ['Te han compartido el atajo «{name}».', 'Someone shared the preset “{name}” with you.', 'Compartilharam com você o atalho “{name}”.', 'Jemand hat die Vorlage „{name}“ mit dir geteilt.'],
    ['Añadir a mis atajos', 'Add to my presets', 'Adicionar aos meus atalhos', 'Zu meinen Vorlagen hinzufügen'],
    ['Ignorar', 'Ignore', 'Ignorar', 'Ignorieren'],
    ['Compartir atajo', 'Share preset', 'Compartilhar atalho', 'Vorlage teilen'],
    ['Enlace', 'Link', 'Link', 'Link'],
    ['Quien abra el enlace podrá añadir el atajo a los suyos. También puedes enviar el archivo.', 'Whoever opens the link can add the preset to theirs. You can also send the file.', 'Quem abrir o link poderá adicionar o atalho aos seus. Você também pode enviar o arquivo.', 'Wer den Link öffnet, kann die Vorlage zu den eigenen hinzufügen. Du kannst auch die Datei senden.'],
    ['Descargar archivo', 'Download file', 'Baixar arquivo', 'Datei herunterladen'],
    ['Copiar enlace', 'Copy link', 'Copiar link', 'Link kopieren'],
    ['Enlace copiado', 'Link copied', 'Link copiado', 'Link kopiert'],
    ['Cerrar', 'Close', 'Fechar', 'Schließen'],

    // Formato
    ['Formato de salida', 'Output format', 'Formato de saída', 'Ausgabeformat'],
    ['Auto', 'Auto', 'Auto', 'Auto'],
    ['Original', 'Original', 'Original', 'Original'],
    ['según imagen', 'per image', 'por imagem', 'je nach Bild'],
    ['mismo formato', 'same format', 'mesmo formato', 'gleiches Format'],
    ['con pérdida', 'lossy', 'com perda', 'verlustbehaftet'],
    ['sin pérdida', 'lossless', 'sem perda', 'verlustfrei'],
    ['Tu navegador no puede generar este formato', "Your browser can't create this format", 'Seu navegador não consegue gerar este formato', 'Dein Browser kann dieses Format nicht erzeugen'],
    ['Tu navegador no puede generar {f}', "Your browser can't create {f}", 'Seu navegador não consegue gerar {f}', 'Dein Browser kann kein {f} erzeugen'],
    ['Elige el formato según cada imagen: fotos, imágenes con transparencia o gráficos y capturas.', 'Picks the format for each image: photos, images with transparency, or graphics and screenshots.', 'Escolhe o formato para cada imagem: fotos, imagens com transparência ou gráficos e capturas.', 'Wählt das Format je nach Bild: Fotos, Bilder mit Transparenz oder Grafiken und Screenshots.'],
    ['Mantiene el formato de cada imagen y solo la comprime o ajusta.', 'Keeps each image’s format and only compresses or adjusts it.', 'Mantém o formato de cada imagem e apenas a comprime ou ajusta.', 'Behält das Format jedes Bildes bei und komprimiert oder bearbeitet es nur.'],
    ['Muy ligero y con transparencia. Ideal para webs.', 'Very light, with transparency. Ideal for websites.', 'Muito leve e com transparência. Ideal para sites.', 'Sehr klein und mit Transparenz. Ideal für Websites.'],
    ['El más compatible. Perfecto para fotos.', 'The most compatible. Perfect for photos.', 'O mais compatível. Perfeito para fotos.', 'Am kompatibelsten. Perfekt für Fotos.'],
    ['Sin pérdida y con transparencia. Logos, capturas, gráficos.', 'Lossless, with transparency. Logos, screenshots, graphics.', 'Sem perda e com transparência. Logos, capturas, gráficos.', 'Verlustfrei und mit Transparenz. Logos, Screenshots, Grafiken.'],
    ['La máxima compresión moderna.', 'The best modern compression.', 'A máxima compressão moderna.', 'Die stärkste moderne Komprimierung.'],
    ['Este navegador no lo genera, así que se descargará un codificador la primera vez (y es más lento).', "This browser can't create it, so an encoder will be downloaded the first time (and it's slower).", 'Este navegador não o gera, então um codificador será baixado na primeira vez (e é mais lento).', 'Dieser Browser kann es nicht erzeugen, daher wird beim ersten Mal ein Encoder heruntergeladen (und es ist langsamer).'],
    ['Compatible con todo, pero limitado a 256 colores. Bien para gráficos sencillos, no para fotos.', 'Works everywhere, but limited to 256 colors. Good for simple graphics, not for photos.', 'Compatível com tudo, mas limitado a 256 cores. Bom para gráficos simples, não para fotos.', 'Funktioniert überall, aber nur mit 256 Farben. Gut für einfache Grafiken, nicht für Fotos.'],
    ['Documento PDF con una imagen por página, o todas juntas en un solo PDF.', 'PDF document with one image per page, or all of them in a single PDF.', 'Documento PDF com uma imagem por página, ou todas juntas em um só PDF.', 'PDF-Dokument mit einem Bild pro Seite oder alle zusammen in einem PDF.'],
    ['Mapa de bits sin comprimir. Para programas antiguos.', 'Uncompressed bitmap. For old programs.', 'Bitmap sem compressão. Para programas antigos.', 'Unkomprimierte Bitmap. Für ältere Programme.'],
    ['Sin pérdida. Para impresión y archivo.', 'Lossless. For printing and archiving.', 'Sem perda. Para impressão e arquivo.', 'Verlustfrei. Für Druck und Archivierung.'],
    ['Icono de Windows / favicon con varios tamaños (16–256 px).', 'Windows icon / favicon with several sizes (16–256 px).', 'Ícone do Windows / favicon com vários tamanhos (16–256 px).', 'Windows-Symbol / Favicon in mehreren Größen (16–256 px).'],
    ['Unir todas en un solo PDF', 'Merge all into a single PDF', 'Juntar todas em um só PDF', 'Alle in einem PDF zusammenfassen'],
    ['Tamaño de página', 'Page size', 'Tamanho da página', 'Seitengröße'],
    ['Como la imagen', 'Same as image', 'Igual à imagem', 'Wie das Bild'],
    ['📷 Fotos', '📷 Photos', '📷 Fotos', '📷 Fotos'],
    ['🫥 Con transparencia', '🫥 With transparency', '🫥 Com transparência', '🫥 Mit Transparenz'],
    ['📐 Gráficos y capturas', '📐 Graphics and screenshots', '📐 Gráficos e capturas', '📐 Grafiken und Screenshots'],
    ['foto', 'photo', 'foto', 'Foto'],
    ['transparencia', 'transparency', 'transparência', 'Transparenz'],
    ['gráfico', 'graphic', 'gráfico', 'Grafik'],

    // Compresión
    ['Compresión', 'Compression', 'Compressão', 'Komprimierung'],
    ['Calidad', 'Quality', 'Qualidade', 'Qualität'],
    ['Más ligero', 'Smaller', 'Mais leve', 'Kleiner'],
    ['Mejor calidad', 'Better quality', 'Melhor qualidade', 'Bessere Qualität'],
    ['Intentar no superar', 'Try not to exceed', 'Tentar não passar de', 'Möglichst nicht größer als'],
    ['Tamaño máximo en KB', 'Maximum size in KB', 'Tamanho máximo em KB', 'Maximale Größe in KB'],
    ['Compresión PNG', 'PNG compression', 'Compressão PNG', 'PNG-Komprimierung'],
    ['Optimizada', 'Optimized', 'Otimizada', 'Optimiert'],
    ['Colores', 'Colors', 'Cores', 'Farben'],
    ['Reduce la paleta como TinyPNG: suele pesar un 50–70 % menos y apenas se nota.', 'Reduces the palette like TinyPNG: usually 50–70% smaller and barely noticeable.', 'Reduz a paleta como o TinyPNG: costuma pesar 50–70% menos e quase não se nota.', 'Reduziert die Farbpalette wie TinyPNG: meist 50–70 % kleiner und kaum sichtbar.'],
    ['JPG más ligeros con MozJPEG', 'Smaller JPGs with MozJPEG', 'JPGs mais leves com MozJPEG', 'Kleinere JPGs mit MozJPEG'],
    ['(nunca más grande que sin él)', '(never bigger than without it)', '(nunca maior do que sem ele)', '(nie größer als ohne)'],
    ['Este formato no tiene pérdida: la calidad no se ajusta. Reduce el tamaño (paso 3) para que pese menos.', 'This format is lossless: quality can’t be adjusted. Reduce the size (step 3) to make it lighter.', 'Este formato não tem perda: a qualidade não se ajusta. Reduza o tamanho (passo 3) para que fique mais leve.', 'Dieses Format ist verlustfrei: Die Qualität lässt sich nicht einstellen. Verkleinere das Bild (Schritt 3), damit die Datei kleiner wird.'],

    // Tamaño
    ['Tamaño', 'Size', 'Tamanho', 'Größe'],
    ['Modo de redimensionado', 'Resize mode', 'Modo de redimensionamento', 'Skalierungsmodus'],
    ['Máximo', 'Max', 'Máximo', 'Maximal'],
    ['Exacto', 'Exact', 'Exato', 'Exakt'],
    ['Varios', 'Several', 'Vários', 'Mehrere'],
    ['Escala', 'Scale', 'Escala', 'Skalierung'],
    ['Ancho máx.', 'Max width', 'Largura máx.', 'Max. Breite'],
    ['Alto máx.', 'Max height', 'Altura máx.', 'Max. Höhe'],
    ['Ancho', 'Width', 'Largura', 'Breite'],
    ['Alto', 'Height', 'Altura', 'Höhe'],
    ['Mantiene la proporción y nunca agranda la imagen.', 'Keeps the proportions and never enlarges the image.', 'Mantém a proporção e nunca aumenta a imagem.', 'Behält das Seitenverhältnis bei und vergrößert das Bild nie.'],
    ['Recortar para no deformar', 'Crop to avoid distortion', 'Recortar para não deformar', 'Zuschneiden statt verzerren'],
    ['Anchos (px), separados por comas', 'Widths (px), separated by commas', 'Larguras (px), separadas por vírgulas', 'Breiten (px), durch Kommas getrennt'],
    ['Crea una copia de cada imagen en cada ancho, para webs adaptables (srcset). Nunca agranda.', 'Creates a copy of each image at each width, for responsive websites (srcset). Never enlarges.', 'Cria uma cópia de cada imagem em cada largura, para sites responsivos (srcset). Nunca aumenta.', 'Erstellt eine Kopie jedes Bildes in jeder Breite, für responsive Websites (srcset). Vergrößert nie.'],
    ['Se mantienen las dimensiones originales.', 'The original dimensions are kept.', 'As dimensões originais são mantidas.', 'Die Originalmaße bleiben erhalten.'],

    // Recorte
    ['Recorte', 'Crop', 'Recorte', 'Zuschnitt'],
    ['Proporción de recorte', 'Crop ratio', 'Proporção de recorte', 'Seitenverhältnis'],
    ['Sin recorte', 'No crop', 'Sem recorte', 'Kein Zuschnitt'],
    ['Recorta todas al centro. Para elegir la zona exacta, girar o voltear, pulsa', 'Crops all of them at the center. To choose the exact area, rotate or flip, press', 'Recorta todas no centro. Para escolher a área exata, girar ou espelhar, toque em', 'Schneidet alle mittig zu. Um den genauen Ausschnitt zu wählen, zu drehen oder zu spiegeln, tippe auf'],
    ['en cada imagen (o', 'on each image (or', 'em cada imagem (ou', 'bei jedem Bild (oder'],
    ['para girarla).', 'to rotate it).', 'para girá-la).', 'zum Drehen).'],

    // Marca de agua
    ['Marca de agua', 'Watermark', 'Marca d’água', 'Wasserzeichen'],
    ['(opcional)', '(optional)', '(opcional)', '(optional)'],
    ['Añadir marca de agua', 'Add watermark', 'Adicionar marca d’água', 'Wasserzeichen hinzufügen'],
    ['Tipo de marca de agua', 'Watermark type', 'Tipo de marca d’água', 'Art des Wasserzeichens'],
    ['Texto', 'Text', 'Texto', 'Text'],
    ['Logo', 'Logo', 'Logo', 'Logo'],
    ['Texto de la marca de agua', 'Watermark text', 'Texto da marca d’água', 'Text des Wasserzeichens'],
    ['Color del texto', 'Text color', 'Cor do texto', 'Textfarbe'],
    ['Elegir logo…', 'Choose logo…', 'Escolher logo…', 'Logo wählen…'],
    ['Cambiar logo…', 'Change logo…', 'Trocar logo…', 'Logo ändern…'],
    ['Quitar', 'Remove', 'Remover', 'Entfernen'],
    ['Posición', 'Position', 'Posição', 'Position'],
    ['Arriba a la izquierda', 'Top left', 'Em cima à esquerda', 'Oben links'],
    ['Arriba al centro', 'Top center', 'Em cima ao centro', 'Oben mittig'],
    ['Arriba a la derecha', 'Top right', 'Em cima à direita', 'Oben rechts'],
    ['Centro a la izquierda', 'Middle left', 'Centro à esquerda', 'Mitte links'],
    ['Centro', 'Center', 'Centro', 'Mitte'],
    ['Centro a la derecha', 'Middle right', 'Centro à direita', 'Mitte rechts'],
    ['Abajo a la izquierda', 'Bottom left', 'Embaixo à esquerda', 'Unten links'],
    ['Abajo al centro', 'Bottom center', 'Embaixo ao centro', 'Unten mittig'],
    ['Abajo a la derecha', 'Bottom right', 'Embaixo à direita', 'Unten rechts'],
    ['Mosaico', 'Tiled', 'Mosaico', 'Gekachelt'],
    ['Opacidad', 'Opacity', 'Opacidade', 'Deckkraft'],
    ['No se pudo leer el logo', "Couldn't read the logo", 'Não foi possível ler o logo', 'Das Logo konnte nicht gelesen werden'],
    ['El logo se usará ahora, pero no se recordará la próxima vez (es muy grande).', "The logo will be used now, but it won't be remembered next time (it's too big).", 'O logo será usado agora, mas não será lembrado da próxima vez (é muito grande).', 'Das Logo wird jetzt verwendet, aber beim nächsten Mal nicht gespeichert sein (es ist zu groß).'],

    // Avanzadas
    ['Opciones avanzadas', 'Advanced options', 'Opções avançadas', 'Erweiterte Optionen'],
    ['Nombre de los archivos', 'File names', 'Nome dos arquivos', 'Dateinamen'],
    ['Usa', 'Use', 'Use', 'Verwende'],
    ['Fondo para transparencias', 'Background for transparency', 'Fundo para transparências', 'Hintergrund für Transparenz'],
    ['(JPG y BMP no admiten transparencia)', "(JPG and BMP don't support transparency)", '(JPG e BMP não suportam transparência)', '(JPG und BMP unterstützen keine Transparenz)'],
    ['Datos de la foto (EXIF)', 'Photo data (EXIF)', 'Dados da foto (EXIF)', 'Fotodaten (EXIF)'],
    ['Datos de la foto', 'Photo data', 'Dados da foto', 'Fotodaten'],
    ['Quitar todos', 'Remove all', 'Remover todos', 'Alle entfernen'],
    ['Sin ubicación', 'No location', 'Sem localização', 'Ohne Standort'],
    ['Conservar', 'Keep', 'Manter', 'Behalten'],
    ['Se eliminan la cámara, la fecha, la ubicación y el resto de datos.', 'Camera, date, location and all other data are removed.', 'Câmera, data, localização e os demais dados são removidos.', 'Kamera, Datum, Standort und alle übrigen Daten werden entfernt.'],
    ['Se conservan al guardar en JPG, PNG o WebP a partir de fotos JPG.', 'Kept when saving to JPG, PNG or WebP from JPG photos.', 'São mantidos ao salvar em JPG, PNG ou WebP a partir de fotos JPG.', 'Bleiben erhalten, wenn JPG-Fotos als JPG, PNG oder WebP gespeichert werden.'],
    ['La ubicación GPS se borra.', 'The GPS location is deleted.', 'A localização GPS é apagada.', 'Der GPS-Standort wird gelöscht.'],
    ['Uso sin conexión', 'Offline use', 'Uso offline', 'Offline-Nutzung'],
    ['Descargar códecs (TIFF, AVIF, MozJPEG)', 'Download codecs (TIFF, AVIF, MozJPEG)', 'Baixar codecs (TIFF, AVIF, MozJPEG)', 'Codecs herunterladen (TIFF, AVIF, MozJPEG)'],
    ['Así podrás usar TIFF, AVIF y MozJPEG aunque no tengas internet. HEIC siempre necesita conexión: por seguridad, su decodificador va aislado.', 'So you can use TIFF, AVIF and MozJPEG even without internet. HEIC always needs a connection: for security, its decoder runs isolated.', 'Assim você poderá usar TIFF, AVIF e MozJPEG mesmo sem internet. HEIC sempre precisa de conexão: por segurança, seu decodificador roda isolado.', 'So kannst du TIFF, AVIF und MozJPEG auch ohne Internet nutzen. HEIC braucht immer eine Verbindung: Aus Sicherheitsgründen läuft sein Decoder isoliert.'],
    ['Para leer HEIC hace falta conexión a internet', 'Reading HEIC needs an internet connection', 'Para ler HEIC é preciso conexão com a internet', 'Zum Lesen von HEIC wird eine Internetverbindung benötigt'],
    ['Descargando… {i}/{n}', 'Downloading… {i}/{n}', 'Baixando… {i}/{n}', 'Wird heruntergeladen… {i}/{n}'],
    ['Listo: ya puedes usar TIFF, AVIF y MozJPEG sin conexión', 'Done: you can now use TIFF, AVIF and MozJPEG offline', 'Pronto: agora você pode usar TIFF, AVIF e MozJPEG offline', 'Fertig: Du kannst TIFF, AVIF und MozJPEG jetzt offline nutzen'],
    ['No se pudieron descargar todos los códecs. ¿Hay conexión?', "Couldn't download all the codecs. Are you online?", 'Não foi possível baixar todos os codecs. Há conexão?', 'Nicht alle Codecs konnten heruntergeladen werden. Bist du online?'],
    ['Restablecer ajustes', 'Reset settings', 'Restaurar configurações', 'Einstellungen zurücksetzen'],
    ['Ajustes restablecidos', 'Settings reset', 'Configurações restauradas', 'Einstellungen zurückgesetzt'],
    ['¡Pixelote instalado!', 'Pixelote installed!', 'Pixelote instalado!', 'Pixelote installiert!'],

    // Acciones y resultados
    ['Convertir imágenes', 'Convert images', 'Converter imagens', 'Bilder konvertieren'],
    ['Convertir {n} imagen', 'Convert {n} image', 'Converter {n} imagem', '{n} Bild konvertieren'],
    ['Convertir {n} imágenes', 'Convert {n} images', 'Converter {n} imagens', '{n} Bilder konvertieren'],
    ['Volver a convertir {n} imagen', 'Convert {n} image again', 'Converter {n} imagem de novo', '{n} Bild erneut konvertieren'],
    ['Volver a convertir {n} imágenes', 'Convert {n} images again', 'Converter {n} imagens de novo', '{n} Bilder erneut konvertieren'],
    ['Preparando…', 'Preparing…', 'Preparando…', 'Wird vorbereitet…'],
    ['Procesando {i} de {n}…', 'Processing {i} of {n}…', 'Processando {i} de {n}…', 'Verarbeite {i} von {n}…'],
    ['Procesando…', 'Processing…', 'Processando…', 'Wird verarbeitet…'],
    ['Cargando…', 'Loading…', 'Carregando…', 'Wird geladen…'],
    ['Decodificando {f}…', 'Decoding {f}…', 'Decodificando {f}…', '{f} wird dekodiert…'],
    ['¡Listo! {n} imagen convertida', 'Done! {n} image converted', 'Pronto! {n} imagem convertida', 'Fertig! {n} Bild konvertiert'],
    ['¡Listo! {n} imágenes convertidas', 'Done! {n} images converted', 'Pronto! {n} imagens convertidas', 'Fertig! {n} Bilder konvertiert'],
    ['Listo, pero {n} no se pudieron convertir', "Done, but {n} couldn't be converted", 'Pronto, mas {n} não puderam ser convertidas', 'Fertig, aber {n} konnten nicht konvertiert werden'],
    ['(sin MozJPEG: hace falta internet la primera vez)', '(no MozJPEG: internet is needed the first time)', '(sem MozJPEG: é preciso internet na primeira vez)', '(ohne MozJPEG: beim ersten Mal wird Internet benötigt)'],
    ['Descargar todo', 'Download all', 'Baixar tudo', 'Alle herunterladen'],
    ['Descargar', 'Download', 'Baixar', 'Herunterladen'],
    ['Descargar todo (.zip)', 'Download all (.zip)', 'Baixar tudo (.zip)', 'Alle herunterladen (.zip)'],
    ['Descargar PDF único ({n} páginas)', 'Download single PDF ({n} pages)', 'Baixar PDF único ({n} páginas)', 'Ein PDF herunterladen ({n} Seiten)'],
    ['Creando ZIP…', 'Creating ZIP…', 'Criando ZIP…', 'ZIP wird erstellt…'],
    ['Guardar en carpeta', 'Save to folder', 'Salvar na pasta', 'In Ordner speichern'],
    ['{n} archivo guardado en «{dir}»', '{n} file saved to “{dir}”', '{n} arquivo salvo em “{dir}”', '{n} Datei in „{dir}“ gespeichert'],
    ['{n} archivos guardados en «{dir}»', '{n} files saved to “{dir}”', '{n} arquivos salvos em “{dir}”', '{n} Dateien in „{dir}“ gespeichert'],
    ['No se pudo guardar en la carpeta ({n} guardados)', "Couldn't save to the folder ({n} saved)", 'Não foi possível salvar na pasta ({n} salvos)', 'Speichern im Ordner fehlgeschlagen ({n} gespeichert)'],
    ['Antes', 'Before', 'Antes', 'Vorher'],
    ['Después', 'After', 'Depois', 'Nachher'],
    ['Archivos', 'Files', 'Arquivos', 'Dateien'],
    ['Ahorro', 'Saved', 'Economia', 'Ersparnis'],
    ['Aumento', 'Increase', 'Aumento', 'Zunahme'],
    ['No se pudo convertir', "Couldn't convert", 'Não foi possível converter', 'Konvertierung fehlgeschlagen'],
    ['No se alcanzó el tamaño objetivo', 'Target size not reached', 'O tamanho desejado não foi alcançado', 'Zielgröße nicht erreicht'],
    ['Ajustes cambiados: vuelve a convertir', 'Settings changed: convert again', 'Configurações alteradas: converta de novo', 'Einstellungen geändert: erneut konvertieren'],
    ['Comparar', 'Compare', 'Comparar', 'Vergleichen'],
    ['Comparar antes y después', 'Compare before and after', 'Comparar antes e depois', 'Vorher und nachher vergleichen'],

    // Tarjetas
    ['Tu navegador no puede leer este archivo', "Your browser can't read this file", 'Seu navegador não consegue ler este arquivo', 'Dein Browser kann diese Datei nicht lesen'],
    ['Para leer {f} hace falta internet la primera vez', 'Reading {f} needs internet the first time', 'Para ler {f} é preciso internet na primeira vez', 'Zum Lesen von {f} wird beim ersten Mal Internet benötigt'],
    ['No se pudo leer este {f}', "Couldn't read this {f}", 'Não foi possível ler este {f}', 'Diese {f}-Datei konnte nicht gelesen werden'],
    ['Este RAW no trae una vista previa legible', "This RAW file doesn't include a readable preview", 'Este RAW não traz uma pré-visualização legível', 'Diese RAW-Datei enthält keine lesbare Vorschau'],
    ['Contiene ubicación GPS y se conservará', 'Contains a GPS location and it will be kept', 'Contém localização GPS e ela será mantida', 'Enthält einen GPS-Standort, der erhalten bleibt'],
    ['Contiene ubicación GPS (se eliminará)', 'Contains a GPS location (it will be removed)', 'Contém localização GPS (será removida)', 'Enthält einen GPS-Standort (wird entfernt)'],
    ['propios', 'custom', 'próprios', 'eigene'],
    ['recorte', 'crop', 'recorte', 'Zuschnitt'],
    ['girada', 'rotated', 'girada', 'gedreht'],
    ['Ajustes de esta imagen', 'Settings for this image', 'Configurações desta imagem', 'Einstellungen für dieses Bild'],
    ['Girar 90°', 'Rotate 90°', 'Girar 90°', 'Um 90° drehen'],
    ['Recortar y girar', 'Crop and rotate', 'Recortar e girar', 'Zuschneiden und drehen'],

    // Diálogo de ajustes por imagen
    ['Formato', 'Format', 'Formato', 'Format'],
    ['Igual que el resto', 'Same as the rest', 'Igual ao resto', 'Wie die übrigen'],
    ['Calidad propia', 'Custom quality', 'Qualidade própria', 'Eigene Qualität'],
    ['Ancho máximo (px)', 'Max width (px)', 'Largura máxima (px)', 'Maximale Breite (px)'],
    ['Orden', 'Order', 'Ordem', 'Reihenfolge'],
    ['⇤ Primera', '⇤ First', '⇤ Primeira', '⇤ Erstes'],
    ['← Antes', '← Earlier', '← Antes', '← Früher'],
    ['Después →', 'Later →', 'Depois →', 'Später →'],
    ['Última ⇥', 'Last ⇥', 'Última ⇥', 'Letztes ⇥'],
    ['Usar ajustes generales', 'Use general settings', 'Usar configurações gerais', 'Allgemeine Einstellungen verwenden'],
    ['Aplicar', 'Apply', 'Aplicar', 'Anwenden'],

    // Editor y comparador
    ['Girar a la izquierda', 'Rotate left', 'Girar para a esquerda', 'Nach links drehen'],
    ['Girar a la derecha', 'Rotate right', 'Girar para a direita', 'Nach rechts drehen'],
    ['Voltear horizontal', 'Flip horizontally', 'Espelhar na horizontal', 'Horizontal spiegeln'],
    ['Voltear vertical', 'Flip vertically', 'Espelhar na vertical', 'Vertikal spiegeln'],
    ['Libre', 'Free', 'Livre', 'Frei'],
    ['Restablecer', 'Reset', 'Restaurar', 'Zurücksetzen'],
    ['Antes y después', 'Before and after', 'Antes e depois', 'Vorher und nachher'],
    ['Ajustar', 'Fit', 'Ajustar', 'Einpassen'],
    ['Zoom', 'Zoom', 'Zoom', 'Zoom'],
    ['Resultado', 'Result', 'Resultado', 'Ergebnis'],
    ['Posición del comparador', 'Comparison slider position', 'Posição do comparador', 'Position des Vergleichsreglers'],

    // Pie de página
    ['Convierte tus imágenes sin subirlas a ningún sitio: todo ocurre en tu navegador, así que tus fotos siguen siendo solo tuyas.', 'Convert your images without uploading them anywhere: everything happens in your browser, so your photos stay yours alone.', 'Converta suas imagens sem enviá-las a lugar nenhum: tudo acontece no seu navegador, então suas fotos continuam sendo só suas.', 'Konvertiere deine Bilder, ohne sie irgendwo hochzuladen: Alles passiert in deinem Browser, deine Fotos bleiben also nur deine.'],
    ['Sin registros ni anuncios, y tus imágenes nunca se suben.', 'No sign-up, no ads, and your images are never uploaded.', 'Sem cadastro nem anúncios, e suas imagens nunca são enviadas.', 'Keine Anmeldung, keine Werbung, und deine Bilder werden nie hochgeladen.'],
    ['🐞 Reportar un problema', '🐞 Report a problem', '🐞 Relatar um problema', '🐞 Problem melden'],
    ['Versión', 'Version', 'Versão', 'Version'],

    // Informe de problemas
    ['Reportar un problema', 'Report a problem', 'Relatar um problema', 'Problem melden'],
    ['Cuéntanos qué ha fallado. Prepararemos un informe que puedes copiar, descargar o enviar.', "Tell us what went wrong. We'll prepare a report you can copy, download or send.", 'Conte o que deu errado. Vamos preparar um relatório que você pode copiar, baixar ou enviar.', 'Erzähl uns, was schiefgelaufen ist. Wir erstellen einen Bericht, den du kopieren, herunterladen oder senden kannst.'],
    ['¿Qué ha pasado?', 'What happened?', 'O que aconteceu?', 'Was ist passiert?'],
    ['Por ejemplo: al convertir un HEIC a JPG, la imagen sale girada.', 'For example: when converting a HEIC to JPG, the image comes out rotated.', 'Por exemplo: ao converter um HEIC para JPG, a imagem sai girada.', 'Zum Beispiel: Beim Konvertieren von HEIC zu JPG ist das Bild gedreht.'],
    ['Pasos para repetirlo (opcional)', 'Steps to reproduce (optional)', 'Passos para reproduzir (opcional)', 'Schritte zum Nachstellen (optional)'],
    ['1. Elegí el atajo Instagram… 2. …', '1. I chose the Instagram preset… 2. …', '1. Escolhi o atalho Instagram… 2. …', '1. Ich habe die Vorlage Instagram gewählt… 2. …'],
    ['Incluir datos técnicos (navegador, ajustes y errores; nunca tus imágenes ni sus nombres)', 'Include technical data (browser, settings and errors; never your images or their names)', 'Incluir dados técnicos (navegador, configurações e erros; nunca suas imagens nem seus nomes)', 'Technische Daten anhängen (Browser, Einstellungen und Fehler; niemals deine Bilder oder deren Namen)'],
    ['Ver el informe', 'View the report', 'Ver o relatório', 'Bericht ansehen'],
    ['Copiar', 'Copy', 'Copiar', 'Kopieren'],
    ['Enviar', 'Send', 'Enviar', 'Senden'],
    ['Informe copiado', 'Report copied', 'Relatório copiado', 'Bericht kopiert'],
    ['Escribe primero qué ha pasado', 'First describe what happened', 'Primeiro descreva o que aconteceu', 'Beschreibe zuerst, was passiert ist'],
    ['Copia o descarga el informe y envíaselo a quien mantiene Pixelote.', 'Copy or download the report and send it to whoever maintains Pixelote.', 'Copie ou baixe o relatório e envie para quem mantém o Pixelote.', 'Kopiere oder lade den Bericht herunter und sende ihn an die Person, die Pixelote betreut.'],

    // Envío de informes y avisos de error
    ['Tu email (opcional, para poder responderte)', 'Your email (optional, so we can reply)', 'Seu e-mail (opcional, para podermos responder)', 'Deine E-Mail (optional, damit wir antworten können)'],
    ['nombre@ejemplo.com', 'name@example.com', 'nome@exemplo.com', 'name@beispiel.de'],
    ['Enviando…', 'Sending…', 'Enviando…', 'Wird gesendet…'],
    ['Informe enviado. ¡Gracias!', 'Report sent. Thank you!', 'Relatório enviado. Obrigado!', 'Bericht gesendet. Danke!'],
    ['No se pudo enviar el informe. Puedes copiarlo o descargarlo.', "Couldn't send the report. You can copy or download it.", 'Não foi possível enviar o relatório. Você pode copiá-lo ou baixá-lo.', 'Der Bericht konnte nicht gesendet werden. Du kannst ihn kopieren oder herunterladen.'],
    ['Se envió un informe del error automáticamente. ¡Gracias!', 'An error report was sent automatically. Thank you!', 'Um relatório do erro foi enviado automaticamente. Obrigado!', 'Ein Fehlerbericht wurde automatisch gesendet. Danke!'],
    ['Algo ha fallado', 'Something went wrong', 'Algo deu errado', 'Etwas ist schiefgelaufen'],
    ['Cerrar aviso', 'Close notice', 'Fechar aviso', 'Hinweis schließen'],
    ['¿Nos envías un informe para arreglarlo? Solo lleva el error y datos técnicos; nunca tus imágenes ni sus nombres.', 'Send us a report so we can fix it? It only contains the error and technical data; never your images or their names.', 'Pode nos enviar um relatório para corrigirmos? Ele só contém o erro e dados técnicos; nunca suas imagens nem seus nomes.', 'Schickst du uns einen Bericht, damit wir das beheben können? Er enthält nur den Fehler und technische Daten, niemals deine Bilder oder deren Namen.'],
    ['Enviar siempre sin preguntar', 'Always send without asking', 'Sempre enviar sem perguntar', 'Immer senden, ohne zu fragen'],
    ['Añadir detalles', 'Add details', 'Adicionar detalhes', 'Details hinzufügen'],
    ['Enviar informe', 'Send report', 'Enviar relatório', 'Bericht senden'],
    ['Preparar informe', 'Prepare report', 'Preparar relatório', 'Bericht vorbereiten'],
    ['Se produjo un error inesperado.', 'An unexpected error occurred.', 'Ocorreu um erro inesperado.', 'Ein unerwarteter Fehler ist aufgetreten.'],
    ['No se pudo convertir {n} imagen.', "{n} image couldn't be converted.", 'Não foi possível converter {n} imagem.', '{n} Bild konnte nicht konvertiert werden.'],
    ['No se pudieron convertir {n} imágenes.', "{n} images couldn't be converted.", 'Não foi possível converter {n} imagens.', '{n} Bilder konnten nicht konvertiert werden.'],
    ['No se pudo leer un archivo {f}.', "A {f} file couldn't be read.", 'Não foi possível ler um arquivo {f}.', 'Eine {f}-Datei konnte nicht gelesen werden.'],
    ['Informes de error', 'Error reports', 'Relatórios de erro', 'Fehlerberichte'],
    ['Enviar automáticamente los informes de error', 'Send error reports automatically', 'Enviar relatórios de erro automaticamente', 'Fehlerberichte automatisch senden'],
    ['Nunca incluyen tus imágenes ni sus nombres.', 'They never include your images or their names.', 'Nunca incluem suas imagens nem seus nomes.', 'Sie enthalten nie deine Bilder oder deren Namen.'],
    ['Espera unos segundos antes de enviar otro informe.', 'Wait a few seconds before sending another report.', 'Espere alguns segundos antes de enviar outro relatório.', 'Warte ein paar Sekunden, bevor du einen weiteren Bericht sendest.'],
    ['Este error ya se envió hace poco. ¡Gracias!', 'This error was already reported recently. Thank you!', 'Este erro já foi enviado há pouco. Obrigado!', 'Dieser Fehler wurde vor Kurzem schon gemeldet. Danke!'],
    ['Has enviado varios informes en poco tiempo. Inténtalo más tarde.', "You've sent several reports in a short time. Please try again later.", 'Você enviou vários relatórios em pouco tempo. Tente mais tarde.', 'Du hast in kurzer Zeit mehrere Berichte gesendet. Versuche es später erneut.'],
    ['No hay conexión a internet. Puedes copiar o descargar el informe.', 'No internet connection. You can copy or download the report.', 'Sem conexão com a internet. Você pode copiar ou baixar o relatório.', 'Keine Internetverbindung. Du kannst den Bericht kopieren oder herunterladen.'],
    ['Este navegador no puede generar: {f}. Prueba con Chrome, Edge o Firefox actualizados.', "This browser can't create: {f}. Try an up-to-date Chrome, Edge or Firefox.", 'Este navegador não consegue gerar: {f}. Experimente o Chrome, Edge ou Firefox atualizados.', 'Dieser Browser kann Folgendes nicht erzeugen: {f}. Probiere einen aktuellen Chrome, Edge oder Firefox.'],
    // App de escritorio y página de descarga
    ['Convierte tus imágenes sin subirlas a ningún sitio: todo ocurre en tu equipo, así que tus fotos siguen siendo solo tuyas.', 'Convert your images without uploading them anywhere: everything happens on your computer, so your photos stay yours alone.', 'Converta suas imagens sem enviá-las a lugar nenhum: tudo acontece no seu computador, então suas fotos continuam sendo só suas.', 'Konvertiere deine Bilder, ohne sie irgendwo hochzuladen: Alles passiert auf deinem Computer, deine Fotos bleiben also nur deine.'],
    ['App para Windows', 'Windows app', 'App para Windows', 'Windows-App'],
    ['Descargar para Windows', 'Download for Windows', 'Baixar para Windows', 'Für Windows herunterladen'],
    ['Descargar Pixelote para Windows', 'Download Pixelote for Windows', 'Baixar o Pixelote para Windows', 'Pixelote für Windows herunterladen'],
    ['← Volver a la app', '← Back to the app', '← Voltar ao app', '← Zurück zur App'],
    ['Pixelote para Windows', 'Pixelote for Windows', 'Pixelote para Windows', 'Pixelote für Windows'],
    ['La misma app, en su propia ventana: sin pestañas del navegador y a un clic desde el escritorio. Ocupa unos pocos megas y tus imágenes siguen sin salir de tu equipo.', 'The same app, in its own window: no browser tabs, one click from your desktop. It takes just a few megabytes and your images still never leave your computer.', 'O mesmo app, em sua própria janela: sem abas do navegador e a um clique da área de trabalho. Ocupa poucos megas e suas imagens continuam sem sair do seu computador.', 'Dieselbe App in einem eigenen Fenster: ohne Browser-Tabs, mit einem Klick vom Desktop aus. Sie braucht nur wenige Megabyte, und deine Bilder verlassen weiterhin nie deinen Computer.'],
    ['Descargar instalador', 'Download installer', 'Baixar instalador', 'Installer herunterladen'],
    ['Versión portable (sin instalar)', 'Portable version (no install)', 'Versão portátil (sem instalar)', 'Portable Version (ohne Installation)'],
    ['No disponible', 'Not available', 'Não disponível', 'Nicht verfügbar'],
    ['Versión {v}', 'Version {v}', 'Versão {v}', 'Version {v}'],
    ['Copiado', 'Copied', 'Copiado', 'Kopiert'],
    ['Todavía no hay ninguna versión publicada. Se genera con', 'No version has been published yet. It is generated with', 'Ainda não há nenhuma versão publicada. Ela é gerada com', 'Es wurde noch keine Version veröffentlicht. Sie wird erzeugt mit'],
    ['en la carpeta', 'in the folder', 'na pasta', 'im Ordner'],
    ['Qué necesitas', 'What you need', 'O que você precisa', 'Was du brauchst'],
    ['Windows 10 u 11 de 64 bits.', 'Windows 10 or 11, 64-bit.', 'Windows 10 ou 11 de 64 bits.', 'Windows 10 oder 11 (64 Bit).'],
    ['WebView2, el motor de Edge: ya viene con Windows 11 y con Windows 10 actualizado. Si faltara, el instalador lo añade solo.', 'WebView2, the Edge engine: it comes with Windows 11 and up-to-date Windows 10. If it were missing, the installer adds it automatically.', 'WebView2, o motor do Edge: já vem com o Windows 11 e com o Windows 10 atualizado. Se faltar, o instalador o adiciona sozinho.', 'WebView2, die Edge-Engine: Sie ist bei Windows 11 und aktuellem Windows 10 dabei. Falls sie fehlt, fügt der Installer sie automatisch hinzu.'],
    ['Nada más: no hace falta instalar ningún otro programa.', "That's it: you don't need to install any other program.", 'Mais nada: não é preciso instalar nenhum outro programa.', 'Mehr nicht: Du musst kein weiteres Programm installieren.'],
    ['La primera vez que la abras', 'The first time you open it', 'Na primeira vez que abrir', 'Beim ersten Öffnen'],
    ['La app no está firmada digitalmente, así que Windows puede mostrar «Windows protegió su PC». Pulsa:', 'The app is not digitally signed, so Windows may show “Windows protected your PC”. Click:', 'O app não tem assinatura digital, então o Windows pode mostrar “O Windows protegeu o computador”. Clique em:', 'Die App ist nicht digital signiert, daher zeigt Windows eventuell „Der Computer wurde durch Windows geschützt“. Klicke auf:'],
    ['Más información', 'More info', 'Mais informações', 'Weitere Informationen'],
    ['Ejecutar de todas formas', 'Run anyway', 'Executar assim mesmo', 'Trotzdem ausführen'],
    ['Solo pasa la primera vez.', 'This only happens the first time.', 'Isso só acontece na primeira vez.', 'Das passiert nur beim ersten Mal.'],
    ['¿Instalador o portable?', 'Installer or portable?', 'Instalador ou portátil?', 'Installer oder Portable?'],
    ['Instalador:', 'Installer:', 'Instalador:', 'Installer:'],
    ['añade Pixelote al menú Inicio y se desinstala desde Configuración, como cualquier programa.', 'adds Pixelote to the Start menu and uninstalls from Settings, like any program.', 'adiciona o Pixelote ao menu Iniciar e é desinstalado pelas Configurações, como qualquer programa.', 'fügt Pixelote zum Startmenü hinzu und lässt sich wie jedes Programm über die Einstellungen deinstallieren.'],
    ['Portable:', 'Portable:', 'Portátil:', 'Portable:'],
    ['un único archivo .exe que no instala nada. Puedes llevarlo en una memoria USB.', "a single .exe file that installs nothing. You can carry it on a USB stick.", 'um único arquivo .exe que não instala nada. Você pode levá-lo num pen drive.', 'eine einzelne .exe-Datei, die nichts installiert. Du kannst sie auf einem USB-Stick mitnehmen.'],
    ['Comprueba que es auténtico', 'Check that it is genuine', 'Confira se é autêntico', 'Prüfe, ob sie echt ist'],
    ['Compara la huella SHA-256 del archivo descargado con la de aquí. En PowerShell:', 'Compare the SHA-256 fingerprint of the downloaded file with the one shown here. In PowerShell:', 'Compare a impressão SHA-256 do arquivo baixado com a mostrada aqui. No PowerShell:', 'Vergleiche den SHA-256-Fingerabdruck der heruntergeladenen Datei mit dem hier angezeigten. In PowerShell:'],
    ['Web o Windows', 'Web or Windows', 'Web ou Windows', 'Web oder Windows'],
    ['Web', 'Web', 'Web', 'Web'],
    ['Dónde funciona', 'Where it works', 'Onde funciona', 'Wo sie läuft'],
    ['Cualquier navegador moderno', 'Any modern browser', 'Qualquer navegador moderno', 'Jeder moderne Browser'],
    ['Windows 10 y 11', 'Windows 10 and 11', 'Windows 10 e 11', 'Windows 10 und 11'],
    ['Cómo se abre', 'How it opens', 'Como abre', 'Wie sie startet'],
    ['En una pestaña', 'In a tab', 'Numa aba', 'In einem Tab'],
    ['Con su propio icono y ventana', 'With its own icon and window', 'Com ícone e janela próprios', 'Mit eigenem Symbol und Fenster'],
    ['Instalación', 'Installation', 'Instalação', 'Installation'],
    ['Ninguna', 'None', 'Nenhuma', 'Keine'],
    ['Instalador o .exe portable', 'Installer or portable .exe', 'Instalador ou .exe portátil', 'Installer oder portable .exe'],
    ['Funciones', 'Features', 'Recursos', 'Funktionen'],
    ['Todas', 'All', 'Todos', 'Alle'],
    ['Privacidad', 'Privacy', 'Privacidade', 'Datenschutz'],
    ['Todo en tu equipo', 'Everything on your computer', 'Tudo no seu computador', 'Alles auf deinem Computer'],
    ['Ese email no parece válido', "That email doesn't look valid", 'Esse e-mail não parece válido', 'Diese E-Mail-Adresse scheint ungültig zu sein'],
  ];
  for (const [es, en, pt, de] of ROWS) { DICT.en[es] = en; DICT.pt[es] = pt; DICT.de[es] = de; }

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

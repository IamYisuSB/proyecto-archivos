/* Configuración de Pixelote. Es el único archivo que normalmente hay que tocar.
 *
 * Informes de problemas (rellena una opción; si hay varias, se usa la primera):
 *   reportEndpoint: URL del Worker que envía los informes a tu correo con Resend.
 *                   Así llegan sin que la persona tenga que copiar nada.
 *                   Cómo crearlo: server/README.md
 *   reportGithub:   'usuario/repositorio' → abre un issue de GitHub ya rellenado.
 *   reportEmail:    'tu@correo.com' → abre el programa de correo con el informe.
 *
 * Si las tres están vacías, el informe solo se puede copiar o descargar. */
window.PIXELOTE_CONFIG = Object.assign({
  reportEndpoint: '',
  reportGithub: '',
  reportEmail: '',
}, window.PIXELOTE_CONFIG);

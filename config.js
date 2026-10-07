/* Configuración de Pixelote. Es el único archivo que normalmente hay que tocar.
 *
 * Informes de problemas (se usa la primera opción rellenada):
 *   web3formsKey:   clave de Web3Forms. Los informes llegan a tu correo sin
 *                   servidor propio. Es pública por diseño: solo permite
 *                   enviarte mensajes, no leer nada (https://web3forms.com).
 *   reportEndpoint: URL de un Worker propio (alternativa, ver server/README.md).
 *   reportGithub:   'usuario/repositorio' → abre un issue de GitHub ya rellenado.
 *   reportEmail:    'tu@correo.com' → abre el programa de correo con el informe.
 *
 * Si todas están vacías, el informe solo se puede copiar o descargar. */
window.PIXELOTE_CONFIG = Object.assign({
  web3formsKey: '9cd34f3c-9822-44eb-83f2-01a76b6ad680',
  reportEndpoint: '',
  reportGithub: '',
  reportEmail: '',
}, window.PIXELOTE_CONFIG);

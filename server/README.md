# Alternativa: informes por email con tu propio Worker (Cloudflare + Resend)

> Ahora mismo Pixelote usa **Web3Forms** (`web3formsKey` en `config.js`), que no necesita nada de esto. Este Worker es una alternativa por si en el futuro prefieres tu propio servidor con Resend: para usarlo, vacía `web3formsKey`, rellena `reportEndpoint` y añade la dirección del Worker a `connect-src` en la CSP de `index.html`.

Con esto, cuando alguien pulsa **Enviar informe** en Pixelote (o cuando la app detecta un error y la persona acepta enviarlo), el informe te llega directamente al correo.

```
Pixelote (navegador)  →  Worker de Cloudflare  →  Resend  →  tu correo
                          (guarda la clave y tu email)
```

**¿Por qué hace falta el Worker?** La clave de Resend no puede ir en la página: cualquiera podría leerla en el código y mandar correos en tu nombre. Además, Resend no acepta llamadas directas desde el navegador. El Worker guarda la clave como secreto, comprueba el informe y lo reenvía.

El plan gratuito de Cloudflare permite 100.000 peticiones al día, de sobra para esto.

## Puesta en marcha (unos 10 minutos)

Necesitas Node.js instalado, tu cuenta de Resend y una cuenta gratuita de Cloudflare.

1. **Clave de Resend:** en resend.com → *API Keys* → *Create API Key*, con permiso *Sending access*. Copia la clave (empieza por `re_`).

2. **Entra en Cloudflare** desde esta carpeta (`server/`):
   ```
   npx wrangler login
   ```

3. **Guarda los secretos.** Cada comando te pedirá el valor:
   ```
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put REPORT_TO
   ```
   En `REPORT_TO` escribe el email donde quieres recibir los informes.

4. **Revisa `wrangler.toml`:**
   - `ALLOWED_ORIGINS`: añade la dirección donde publiques la app, por ejemplo `https://tuusuario.github.io`. Déjalo como está mientras pruebas en tu equipo.
   - `REPORT_FROM`: si no tienes un dominio verificado en Resend, deja `onboarding@resend.dev`. Con ese remitente Resend solo envía al email de tu cuenta de Resend, así que pon ese mismo en `REPORT_TO`. Si verificas un dominio, puedes usar algo como `Pixelote <informes@tudominio.com>`.

5. **Publica el Worker:**
   ```
   npx wrangler deploy
   ```
   Al terminar te dará una dirección como `https://pixelote-informes.tuusuario.workers.dev`.

6. **Conéctalo a la app.** Pon esa dirección en `config.js` (en la carpeta principal):
   ```js
   reportEndpoint: 'https://pixelote-informes.tuusuario.workers.dev',
   ```

Ya está. Para probarlo, abre Pixelote, pulsa **🐞 Reportar un problema** en el pie de página, escribe algo y pulsa **Enviar**.

## Qué protege el Worker

- Solo acepta `POST` con JSON, de los orígenes de `ALLOWED_ORIGINS`.
- Informes de 20 KB como mucho.
- Un campo trampa invisible para bots.
- 5 envíos por minuto por IP como mucho (límite de Cloudflare más uno propio de respaldo).
- Tu email y la clave nunca salen de Cloudflare. El remitente del informe solo aparece como "responder a" si la persona escribió su email.

## Qué contiene cada informe

- La descripción y los pasos (si los escribió la persona), o el error detectado.
- Versión de la app, navegador, idioma, pantalla, formatos disponibles, ajustes y los últimos errores.
- **Nunca** contiene las imágenes, sus nombres, las carpetas ni el texto de la marca de agua. La app los sustituye por `[archivo]` antes de enviar.

## Ver qué pasa en el Worker

```
npx wrangler tail
```

Muestra en directo las peticiones y los errores de Resend, si los hay.

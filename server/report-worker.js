/* Pixelote · receptor de informes de problemas (Cloudflare Worker).
 *
 * Recibe el informe que envía la app y lo reenvía por email con Resend. La
 * clave de Resend y tu email viven aquí, como secretos de Cloudflare, nunca en
 * la página (cualquiera podría leerlos y usarlos).
 *
 * Secretos  (npx wrangler secret put NOMBRE):
 *   RESEND_API_KEY   clave de la API de Resend (re_…)
 *   REPORT_TO        email donde quieres recibir los informes (o varios, separados por comas)
 * Variables (wrangler.toml):
 *   REPORT_FROM      remitente; sin dominio propio en Resend: "Pixelote <onboarding@resend.dev>"
 *   ALLOWED_ORIGINS  orígenes que pueden enviar, separados por comas ("*" = cualquiera)
 *
 * Protección contra abusos: solo POST con JSON, tamaño máximo, campo trampa
 * para bots y límite de envíos por IP (el de Cloudflare si está configurado). */

const MAX_REPORT = 20000;
const MAX_PER_MINUTE = 5;
const recent = new Map(); // IP → marcas de tiempo (por instancia; respaldo del límite de Cloudflare)

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes('*') || allowed.includes(origin);
  const h = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (ok) h['Access-Control-Allow-Origin'] = allowed.includes('*') ? '*' : origin;
  return h;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function underLimit(ip, env) {
  if (env.REPORT_LIMITER) {
    const { success } = await env.REPORT_LIMITER.limit({ key: ip });
    if (!success) return false;
  }
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 60000);
  if (list.length >= MAX_PER_MINUTE) return false;
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return true;
}

const clean = (s, max) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>,;]{1,64}@[^\s@<>,;]{1,190}\.[^\s@<>,;]{2,24}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403, cors);
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'type' }, 415, cors);
    if (Number(request.headers.get('Content-Length') || 0) > MAX_REPORT * 3) return json({ error: 'size' }, 413, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (!(await underLimit(ip, env))) return json({ error: 'rate' }, 429, cors);

    let body;
    try { body = await request.json(); } catch (_) { return json({ error: 'json' }, 400, cors); }
    if (!body || typeof body !== 'object') return json({ error: 'json' }, 400, cors);
    if (body.hp) return json({ ok: true }, 200, cors); // campo trampa relleno: es un bot, se ignora

    const report = String(body.report || '').slice(0, MAX_REPORT);
    if (report.trim().length < 20) return json({ error: 'empty' }, 400, cors);
    if (!env.RESEND_API_KEY || !env.REPORT_TO) return json({ error: 'config' }, 500, cors);

    const auto = body.auto === true;
    const subject = `[Pixelote${auto ? ' · auto' : ''}] ${clean(body.subject, 100) || 'Informe de problema'}`;
    const email = clean(body.email, 254);
    const footer = `\n\n---\nEnviado ${auto ? 'automáticamente' : 'por la persona'} · versión ${clean(body.version, 20) || '?'} · origen ${origin || '—'}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.REPORT_FROM || 'Pixelote <onboarding@resend.dev>',
        to: String(env.REPORT_TO).split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        text: report + footer,
        ...(EMAIL_RE.test(email) ? { reply_to: email } : {}),
      }),
    });
    if (!res.ok) {
      console.log('Resend respondió', res.status, await res.text());
      return json({ error: 'send' }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

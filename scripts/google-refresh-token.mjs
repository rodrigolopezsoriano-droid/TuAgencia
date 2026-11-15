// Obtiene el "refresh token" de tu cuenta de Google para que la web pueda crear
// llamadas en TU Google Calendar con enlace de Google Meet.
// Se ejecuta UNA vez en tu PC (no se sube a ninguna parte). Guía completa: docs/AGENDA.md
//
//   PowerShell:  $env:GOOGLE_CLIENT_ID="..."; $env:GOOGLE_CLIENT_SECRET="..."; node scripts/google-refresh-token.mjs
//   Bash:        GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-refresh-token.mjs
import http from 'node:http';
import crypto from 'node:crypto';

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
if (!id || !secret) {
  console.error('Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Mira docs/AGENDA.md (paso 2).');
  process.exit(1);
}

const PUERTO = 53682;
const redirect = `http://127.0.0.1:${PUERTO}`;
const scopes = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.freebusy'];
const state = crypto.randomBytes(16).toString('hex');
const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id, redirect_uri: redirect, response_type: 'code', scope: scopes.join(' '),
  access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
});

const servidor = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  if (u.pathname !== '/') { res.writeHead(404).end(); return; }
  const fin = (texto, codigo = 0) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(`<p style="font:18px system-ui;padding:40px">${texto}</p>`);
    setTimeout(() => process.exit(codigo), 300);
  };
  if (u.searchParams.get('error')) return fin('Google ha cancelado la autorización: ' + u.searchParams.get('error'), 1);
  if (u.searchParams.get('state') !== state) return fin('Respuesta no válida (state distinto). Vuelve a ejecutar el script.', 1);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: u.searchParams.get('code') ?? '', client_id: id, client_secret: secret,
      redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier,
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.refresh_token) {
    console.error('\nNo se obtuvo el refresh token:', j.error_description ?? j.error ?? r.status);
    return fin('No se ha podido obtener el token. Mira la terminal.', 1);
  }
  console.log('\n✔ Listo. Copia este valor en Cloudflare como GOOGLE_REFRESH_TOKEN (no lo compartas ni lo subas a GitHub):\n');
  console.log(j.refresh_token + '\n');
  fin('Todo correcto. Ya puedes cerrar esta pestaña y volver a la terminal.');
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log('Abre este enlace en el navegador con la cuenta de Google cuyo calendario quieres usar:\n');
  console.log(url + '\n');
  console.log('Esperando la autorización… (Ctrl+C para cancelar)');
});

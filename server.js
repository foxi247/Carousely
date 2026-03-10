/**
 * Carousely — Proxy Server
 * Скрывает API ключи от фронтенда, проксирует запросы к Mistral и Leonardo.
 *
 * Запуск:
 *   npm install express node-fetch dotenv
 *   node server.js
 *
 * Требует файл .env рядом:
 *   MISTRAL_API_KEY=...
 *   LEONARDO_API_KEY=...
 *   PORT=3001
 */

require('dotenv').config();
const express  = require('express');
const fetch    = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

const MISTRAL_KEY  = process.env.MISTRAL_API_KEY;
const LEONARDO_KEY = process.env.LEONARDO_API_KEY;

if (!MISTRAL_KEY)  console.warn('⚠ MISTRAL_API_KEY не задан в .env');
if (!LEONARDO_KEY) console.warn('⚠ LEONARDO_API_KEY не задан в .env');

// ── Middleware ───────────────────────────────────────────────────────────────

// CORS — разрешаем только localhost
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '20mb' })); // для base64 персонажей

// ── Статические файлы — HTML страницы проекта ────────────────────────────────
// Все .html файлы из той же папки доступны по http://localhost:3001/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'carousely-v26.html'));
});

app.get('/:page.html', (req, res) => {
  const file = path.join(__dirname, req.params.page + '.html');
  res.sendFile(file, err => {
    if (err) res.status(404).send('File not found');
  });
});

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Carousely Proxy', port: PORT });
});

// ── Mistral: генерация текста ─────────────────────────────────────────────────
// POST /api/mistral  →  api.mistral.ai/v1/chat/completions

app.post('/api/mistral', async (req, res) => {
  if (!MISTRAL_KEY) return res.status(500).json({ error: 'MISTRAL_API_KEY не настроен на сервере' });

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('Mistral proxy error:', e.message);
    res.status(502).json({ error: 'Ошибка связи с Mistral', detail: e.message });
  }
});

// Старый маршрут — оставим для обратной совместимости (carousely-v26 использует его)
app.post('/v1/chat/completions', async (req, res) => {
  if (!MISTRAL_KEY) return res.status(500).json({ error: 'MISTRAL_API_KEY не настроен на сервере' });

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('Mistral proxy error:', e.message);
    res.status(502).json({ error: 'Ошибка связи с Mistral', detail: e.message });
  }
});

// ── Leonardo: инициализация загрузки изображения ──────────────────────────────
// POST /api/leonardo/init-image  →  cloud.leonardo.ai/api/rest/v1/init-image

app.post('/api/leonardo/init-image', async (req, res) => {
  if (!LEONARDO_KEY) return res.status(500).json({ error: 'LEONARDO_API_KEY не настроен на сервере' });

  try {
    const upstream = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${LEONARDO_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('Leonardo init-image error:', e.message);
    res.status(502).json({ error: 'Ошибка связи с Leonardo (init-image)', detail: e.message });
  }
});

// ── Leonardo: запуск генерации ────────────────────────────────────────────────
// POST /api/leonardo/generations  →  cloud.leonardo.ai/api/rest/v1/generations

app.post('/api/leonardo/generations', async (req, res) => {
  if (!LEONARDO_KEY) return res.status(500).json({ error: 'LEONARDO_API_KEY не настроен на сервере' });

  try {
    const upstream = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${LEONARDO_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('Leonardo generations error:', e.message);
    res.status(502).json({ error: 'Ошибка связи с Leonardo (generations)', detail: e.message });
  }
});

// ── Leonardo: поллинг статуса ─────────────────────────────────────────────────
// GET /api/leonardo/generations/:id  →  cloud.leonardo.ai/api/rest/v1/generations/:id

app.get('/api/leonardo/generations/:id', async (req, res) => {
  if (!LEONARDO_KEY) return res.status(500).json({ error: 'LEONARDO_API_KEY не настроен на сервере' });

  try {
    const upstream = await fetch(
      `https://cloud.leonardo.ai/api/rest/v1/generations/${req.params.id}`,
      {
        headers: { 'Authorization': `Bearer ${LEONARDO_KEY}` },
      }
    );

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('Leonardo poll error:', e.message);
    res.status(502).json({ error: 'Ошибка связи с Leonardo (poll)', detail: e.message });
  }
});

// ── Proxy image (CORS обход для Canvas) ──────────────────────────────────────
// GET /proxy-image?url=https://...  — для отрисовки картинок Leonardo на Canvas

app.get('/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url param');

  // Разрешаем только домены Leonardo и CDN
  const allowed = ['cdn.leonardo.ai', 'storage.googleapis.com', 'cloud.leonardo.ai'];
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return res.status(400).send('Invalid URL'); }
  if (!allowed.some(d => hostname.endsWith(d))) {
    return res.status(403).send('Domain not allowed');
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).send('Upstream error');

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upstream.body.pipe(res);
  } catch (e) {
    console.error('Proxy image error:', e.message);
    res.status(502).send('Proxy error');
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎠 Carousely запущен!`);
  console.log(`   Открой в браузере → http://localhost:${PORT}`);
  console.log(`   Mistral key:   ${MISTRAL_KEY  ? '✅ задан' : '❌ НЕ ЗАДАН'}`);
  console.log(`   Leonardo key:  ${LEONARDO_KEY ? '✅ задан' : '❌ НЕ ЗАДАН'}\n`);
});

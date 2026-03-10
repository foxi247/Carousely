export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url param');

  const allowed = ['cdn.leonardo.ai', 'storage.googleapis.com', 'cloud.leonardo.ai'];
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return res.status(400).send('Invalid URL'); }
  if (!allowed.some(d => hostname.endsWith(d))) {
    return res.status(403).send('Domain not allowed');
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).send('Upstream error');

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    return res.status(502).send('Proxy error');
  }
}

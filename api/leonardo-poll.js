export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const LEONARDO_KEY = process.env.LEONARDO_API_KEY;
  if (!LEONARDO_KEY) return res.status(500).json({ error: 'LEONARDO_API_KEY не настроен' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id param' });

  try {
    const upstream = await fetch(
      `https://cloud.leonardo.ai/api/rest/v1/generations/${id}`,
      {
        headers: { 'Authorization': `Bearer ${LEONARDO_KEY}` },
      }
    );

    const data = await upstream.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Ошибка связи с Leonardo (poll)', detail: e.message });
  }
}

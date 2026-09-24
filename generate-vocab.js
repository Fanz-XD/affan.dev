// Vercel serverless function.
// Menyimpan API key di server (env var), tidak pernah dikirim ke browser.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY belum diatur di environment variables Vercel." });
    return;
  }

  const { topic, existing } = req.body || {};
  const safeTopic = (topic || "kehidupan sehari-hari").toString().slice(0, 100);
  const safeExisting = (existing || "").toString().slice(0, 4000);

  const prompt =
    'Buatkan 6 kosakata bahasa Inggris level menengah untuk pelajar Indonesia dengan topik: "' + safeTopic + '". ' +
    "Jangan mengulang kata-kata berikut: " + safeExisting + ". " +
    "Balas HANYA berupa array JSON valid (tanpa markdown, tanpa penjelasan), setiap elemen berbentuk: " +
    '{"w":"kata bahasa Inggris","ipa":"/transkripsi ipa/","pos":"kata benda atau kata kerja atau kata sifat atau kata keterangan","m":"arti singkat dalam bahasa Indonesia","ex":"satu kalimat contoh berbahasa Inggris yang memuat kata tersebut"}';

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      res.status(502).json({ error: (data.error && data.error.message) || "Gagal memanggil Anthropic API." });
      return;
    }

    const text = (data.content || [])
      .map((c) => c.text || "")
      .join("")
      .trim();
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      res.status(502).json({ error: "Respons AI tidak berupa JSON yang valid." });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
}

// POST /api/analyze  (Google Gemini sürümü)
// Gövde: { mode: "karne"|"rakip"|"cekim", images: ["data:image/jpeg;base64,..."], niche?, roast?, idea? }
// Görseller sunucuda SAKLANMAZ: sadece Gemini'ye gönderilir ve unutulur.

import { buildPrompt, parseJSON } from "../lib/prompts.js";
import { checkLimit } from "../lib/limit.js";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const NEED_IMAGES = { karne: 1, rakip: 2, cekim: 0 };
const MAX_IMG_BYTES = 1_500_000;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

function toImagePart(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m || !OK_TYPES.includes(m[1])) throw { status: 400, msg: "Görsel biçimi desteklenmiyor. JPG veya PNG yükle." };
  if (m[2].length * 0.75 > MAX_IMG_BYTES) throw { status: 413, msg: "Görsel çok büyük." };
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : xf || "").split(",")[0].trim() || req.socket?.remoteAddress || "anon";
}

async function askGemini(parts) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048, temperature: 0.7 },
    }),
  });
  if (r.status === 429) throw { status: 503, msg: "Şu an çok yoğunuz, bir dakika sonra tekrar dene." };
  if (!r.ok) { console.error("gemini", r.status, (await r.text()).slice(0, 300)); throw { status: 502, msg: "Analiz şu an yapılamadı, tekrar dene." }; }
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Sadece POST." });

  try {
    if (!KEY) throw { status: 500, msg: "Sunucu ayarı eksik (GEMINI_API_KEY)." };
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { mode } = body;
    if (!(mode in NEED_IMAGES)) throw { status: 400, msg: "Geçersiz mod." };

    const raw = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
    if (raw.length < NEED_IMAGES[mode]) throw { status: 400, msg: mode === "rakip" ? "İki profil SS'i gerekli." : "Profil SS'i gerekli." };
    if (mode === "cekim" && !String(body.idea || "").trim()) throw { status: 400, msg: "Ne çekeceğini yaz." };
    const images = raw.map(toImagePart);

    // Hak kontrolü: her özellik için ayrı (hatalı istekler hak yemesin)
    const lim = await checkLimit(mode + ":" + clientIp(req));
    res.setHeader("X-Remaining", String(lim.remaining));
    if (!lim.ok) throw { status: 429, msg: `Bugünkü ${lim.limit} ücretsiz hakkın bitti. Diğer özellikleri deneyebilir ya da yarın tekrar gelebilirsin!` };

    const prompt = buildPrompt(mode, {
      niche: body.niche, roast: !!body.roast, idea: body.idea, hasFrame: images.length > 0,
    });

    const text = await askGemini([...images, { text: prompt }]);
    let data;
    try { data = parseJSON(text); }
    catch { throw { status: 502, msg: "Cevap düzgün gelmedi, tekrar dene." }; }

    return res.status(200).json({ data, remaining: lim.remaining });
  } catch (e) {
    if (e?.status && e?.msg) return res.status(e.status).json({ error: e.msg });
    console.error("analyze error:", e?.message);
    return res.status(500).json({ error: "Bir şey ters gitti, tekrar dene." });
  }
}

export const config = { maxDuration: 60 };

// POST /api/analyze  (Google Gemini sürümü)
// Gövde: { mode: "karne"|"rakip"|"cekim", images: ["data:image/jpeg;base64,..."], niche?, roast?, idea? }
// Görseller sunucuda SAKLANMAZ: sadece Gemini'ye gönderilir ve unutulur.


// ---------- Günlük hak sınırı (her özellik için, IP başına) ----------
const DAILY = Number(process.env.FREE_DAILY_LIMIT || 1);
const mem = new Map();
async function checkLimit(key) {
  const day = new Date().toISOString().slice(0, 10);
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  let used;
  if (url && tok) {
    const k = encodeURIComponent("bk:" + day + ":" + key);
    const r = await fetch(`${url}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${tok}` },
      body: JSON.stringify([["INCR", decodeURIComponent(k)], ["EXPIRE", decodeURIComponent(k), "90000"]]) });
    used = Number((await r.json())[0].result);
  } else {
    const k = day + ":" + key; used = (mem.get(k) || 0) + 1; mem.set(k, used);
    if (mem.size > 50000) mem.clear();
  }
  return { ok: used <= DAILY, remaining: Math.max(0, DAILY - used), limit: DAILY };
}

// ---------- Talimatlar ----------

const clean = (s, max = 300) => String(s ?? "").replace(/[\r\n]+/g, " ").slice(0, max).trim();

function buildPrompt(mode, { niche, roast, idea, hasFrame }) {
  if (mode === "karne") {
    return `Sen Türkçe konuşan bir Instagram büyüme koçusun. Görsel, kullanıcının Instagram profil sayfasının ekran görüntüsü. Niş: ${clean(niche, 80) || "belirtilmedi"}.
Görsel bir Instagram profili değilse score 0 ver ve verdict alanında bunu söyle.
Profili incele: bio, profil fotoğrafı, grid düzeni ve görsel tutarlılık, öne çıkanlar, içerik çeşitliliği, görünen sayılar.
${roast ? "Ayrıca 'roast' alanına 2-3 cümlelik esprili, sert ama kırıcı olmayan bir eleştiri yaz. Kişinin görünüşüyle ilgili yorum yapma." : "roast alanını boş string bırak."}
Sadece şu JSON'u döndür, başka metin yazma:
{"score":0-100 tam sayı,"verdict":"tek cümle genel yorum","roast":"...","areas":[{"name":"Bio","score":0-10,"note":"kısa, somut öneri"}, ... toplam 5 alan],"potential":önerileri uygularsa tahmini puan 0-100,"bio":[{"text":"yeni bio önerisi","score":0-100}, 2 adet],"ideas":[{"hook":"Reels'in ilk cümlesi","idea":"tek cümle nasıl çekilir","viral":0-100 tahmini viral potansiyeli}, 5 adet]}`;
  }
  if (mode === "rakip") {
    return `Sen Türkçe konuşan bir Instagram büyüme koçusun. 1. görsel kullanıcının profili, 2. görsel rakibinin profili.
İkisini karşılaştır. Rakibi taklit etmeyi değil, daha iyisini yapmayı öner.
Sadece şu JSON'u döndür, başka metin yazma:
{"meTotal":kullanıcının genel puanı 0-100,"rivalTotal":rakibin genel puanı 0-100,"rows":[{"name":"Bio","me":0-10,"rival":0-10}, ... Bio, Profil fotoğrafı, Grid, Öne çıkanlar, İçerik çeşitliliği, Etkileşim görüntüsü],"summary":"tek cümle sonuç","why":["rakibin işe yarayan 3 şeyi"],"beat":[{"title":"kısa başlık","how":"tek cümle nasıl","impact":uygularsa kazanacağı puan 1-30}, 3 adet]}`;
  }
  if (mode === "cekim") {
    return `Sen Türkçe konuşan bir Reels çekim koçusun. Kullanıcı telefonla çekecek. Fikir: "${clean(idea, 400)}".
${hasFrame ? "Ekteki görsel videodan bir kare: 'frame' alanına ışık, kadraj ve arka plan hakkında 2-3 cümle somut geri bildirim yaz." : "frame alanını boş string bırak."}
Sadece şu JSON'u döndür, başka metin yazma:
{"score":fikrin viral potansiyeli 0-100,"boost":"puanı yükseltecek tek cümlelik değişiklik","frameScore":karenin kalitesi 0-100 (kare yoksa null),"title":"videonun kısa adı","hook":"ilk 3 saniyede söylenecek cümle","angle":"kamera açısı ve kadraj","light":"ışık önerisi","sound":"ses/müzik önerisi","length":"önerilen süre","timeline":[{"t":"0-3 sn","do":"ne gösterilir"}, 4-6 adım],"frame":"...","tips":["telefonla çekim ipucu", 4 adet]}`;
  }
  throw new Error("bilinmeyen mod");
}

// Cevaptan JSON'u güvenle çıkarır.
function parseJSON(text) {
  const t = String(text).trim();
  try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("JSON bulunamadı");
}

// ---------- Gemini ----------
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

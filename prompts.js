// Her mod için Claude'a giden talimat. Cevap her zaman sadece JSON.

const clean = (s, max = 300) => String(s ?? "").replace(/[\r\n]+/g, " ").slice(0, max).trim();

export function buildPrompt(mode, { niche, roast, idea, hasFrame }) {
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

// Claude'un cevabından JSON'u güvenle çıkarır.
export function parseJSON(text) {
  const t = String(text).trim();
  try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("JSON bulunamadı");
}

# Büyüme Koçu

Ücretsiz Instagram büyüme koçu: hesap karnesi, rakip analizi ve çekim kartı.

```
public/index.html   → kullanıcının gördüğü sayfa (frontend)
public/app.js       → sayfanın çalışan kodu
public/gizlilik.html→ KVKK / gizlilik metni (e-postanı yaz!)
api/analyze.js      → arka plan (backend): SS'i Claude'a gönderir
lib/limit.js        → günlük ücretsiz hak sınırı
lib/prompts.js      → Claude'a giden talimatlar (buradan ince ayar yaparsın)
```

## Yayına alma (yaklaşık 20 dakika)

**1. Claude API anahtarı al**
- console.anthropic.com adresinde hesap aç.
- Billing kısmına kart ekle ve **aylık harcama limiti koy** (ör. 20 $). Fatura sürprizini engeller.
- API Keys → Create Key. Anahtarı kimseyle paylaşma.

**2. Kodu GitHub'a yükle**
- github.com'da yeni bir repo aç (private olabilir), bu klasörü içine yükle.

**3. Vercel'e bağla**
- vercel.com'a GitHub ile giriş yap → Add New → Project → repoyu seç.
- Environment Variables kısmına ekle:
  - `ANTHROPIC_API_KEY` = anahtarın
  - `FREE_DAILY_LIMIT` = 5
- Deploy'a bas. Birkaç dakikada `xxx.vercel.app` adresinde yayında olur.

**4. Günlük limiti kalıcı yap (önerilir)**
- Vercel → Storage → Upstash Redis ekle (ücretsiz plan). `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` otomatik eklenir.
- Bunu yapmazsan limit çalışır ama sunucu yeniden başlayınca sıfırlanır.

**5. Alan adını bağla**
- Alan adını al (ör. `buyumekocu.com`).
- Vercel → Project → Settings → Domains → alan adını yaz, gösterdiği DNS kayıtlarını alan adı panelinde gir.

## Maliyet
- Her analiz Claude API'den ücretlendirilir. Görselli analiz (karne, rakip) daha güçlü modelle, düz çekim kartı hızlı ve ucuz modelle çalışır.
- Kontrol: `FREE_DAILY_LIMIT`, Anthropic Console'daki harcama limiti ve Console → Usage ekranı.
- Güncel fiyatlar: anthropic.com/pricing

## Yayından önce
- `gizlilik.html` içine iletişim e-postanı yaz.
- Kendi profilinle 3 modu da dene.
- Kendi bilgisayarında denemek için: `npm install`, sonra `npx vercel dev` (`.env.example` dosyasını `.env` olarak kopyalayıp anahtarını yaz).
- Test: `npm test` (sahte Claude ile çalışır, ücret yazmaz).

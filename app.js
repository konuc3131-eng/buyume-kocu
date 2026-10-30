
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const colorFor = v => v >= 75 ? "var(--good)" : v >= 50 ? "var(--warn)" : "var(--bad)";

/* ---------- Streak / XP (bu tarayıcıda) ---------- */
const LEVELS = [[0,"Çaylak"],[150,"İçerik Üreticisi"],[500,"Yükselen"],[1200,"Influencer"],[3000,"Efsane"]];
function load(){ try{ return JSON.parse(localStorage.getItem("bk") || "{}"); }catch{ return {}; } }
function save(s){ try{ localStorage.setItem("bk", JSON.stringify(s)); }catch{} }
function day(d=new Date()){ return d.toISOString().slice(0,10); }
function renderStats(){
  const s = load(); const xp = s.xp || 0;
  let streak = s.streak || 0;
  if (s.last){ const gap = (new Date(day()) - new Date(s.last)) / 864e5; if (gap > 1) streak = 0; }
  $("#streak").textContent = "🔥 " + streak + " gün";
  $("#xp").textContent = xp + " XP";
  $("#lvl").textContent = LEVELS.filter(l => xp >= l[0]).pop()[1];
}
function reward(points){
  const s = load(); const today = day();
  if (s.last !== today){
    const gap = s.last ? (new Date(today) - new Date(s.last)) / 864e5 : 99;
    s.streak = gap === 1 ? (s.streak || 0) + 1 : 1;
    s.last = today;
  }
  s.xp = (s.xp || 0) + points; save(s); renderStats();
  toast("+" + points + " XP · seri " + s.streak + " gün");
}
function showRemaining(n){ if (n == null) return; $("#left").textContent = n + " hak kaldı"; $("#left").hidden = false; }
function toast(t){ const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2200); }

/* ---------- Tabs ---------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.setAttribute("aria-selected", x === b));
  ["karne","rakip","cekim"].forEach(t => $("#p-" + t).hidden = t !== b.dataset.tab);
});
$("#tone").onclick = e => { const b = e.target.closest("button"); if (!b) return;
  $("#tone").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); };
const tone = () => $("#tone [aria-pressed=true]").dataset.v;

/* ---------- File previews ---------- */
document.querySelectorAll("label.drop input").forEach(inp => inp.onchange = () => {
  const lab = inp.closest("label"); lab.querySelector("img")?.remove();
  const f = inp.files[0]; if (!f) return;
  const img = document.createElement("img"); img.alt = "Seçilen görsel"; img.src = URL.createObjectURL(f); lab.append(img);
});

/* ---------- Copy ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest(".copy"); if (!b) return;
  try{ await navigator.clipboard.writeText(b.dataset.t); toast("Kopyalandı"); }
  catch{ const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Seçildi, kopyala"); }
});

/* ---------- Renderers ---------- */
const clamp = (v, hi) => Math.max(0, Math.min(hi, Math.round(Number(v) || 0)));
function ring(v, size=108){
  const c = 2*Math.PI*46, off = c*(1 - v/100);
  return `<svg class="ring" style="width:${size}px;height:${size}px" viewBox="0 0 108 108" role="img" aria-label="Puan ${v}/100">
    <circle cx="54" cy="54" r="46" fill="none" stroke="var(--chip)" stroke-width="10"/>
    <circle class="arc" cx="54" cy="54" r="46" fill="none" stroke="${colorFor(v)}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 54 54)"/>
    <text x="54" y="64" text-anchor="middle">${v}</text></svg>`;
}
const badge = v => `<span class="badge" style="--c:${colorFor(v)}">${v}</span>`;
/* "Yaptım" düğmesi: bir kez XP verir, durum bu tarayıcıda saklanır */
function hash(t){ let h=0; for (const ch of String(t)) h = (h*31 + ch.charCodeAt(0)) | 0; return "d" + (h>>>0).toString(36); }
function isDone(k){ return !!(load().done||{})[k]; }
function doneBtn(text, xp, label="Yaptım"){ const k = hash(text); const on = isDone(k);
  return `<button class="done" data-k="${k}" data-xp="${xp}" aria-pressed="${on}">${on ? "✓ " + label : label + " +" + xp}</button>`; }
document.addEventListener("click", e => {
  const b = e.target.closest(".done"); if (!b) return;
  const s = load(); s.done = s.done || {}; const k = b.dataset.k, label = b.textContent.replace(/^✓ |\s\+\d+$/g, "");
  if (s.done[k]) { delete s.done[k]; save(s); b.setAttribute("aria-pressed","false"); b.textContent = label + " +" + b.dataset.xp; return; }
  s.done[k] = 1; save(s); b.setAttribute("aria-pressed","true"); b.textContent = "✓ " + label; reward(Number(b.dataset.xp));
  const list = b.closest("[data-all]"); if (list && [...list.querySelectorAll(".done")].every(x => x.getAttribute("aria-pressed") === "true")) {
    setTimeout(() => { reward(Number(list.dataset.all)); toast("🏅 " + list.dataset.badge); }, 900); }
});
/* Alan çubuğuna dokununca öneri açılır */
document.addEventListener("click", e => { const a = e.target.closest(".area"); if (a) a.classList.toggle("open"); });

function renderKarne(d, isSample){
  const score = clamp(d.score, 100);
  const areas = (d.areas||[]).map(a => { const v = clamp(a.score, 10);
    return `<div class="area" tabindex="0"><span class="n">${esc(a.name)}</span><span class="v" style="color:${colorFor(v*10)}">${v}/10</span>
    <div class="bar"><i style="width:${v*10}%;background:${colorFor(v*10)}"></i></div><p>${esc(a.note)}</p></div>`; }).join("");
  const bios = (d.bio||[]).map(b => `<li><div><b>${esc(b.text ?? b)}</b>${b.score!=null ? `<span>Bio puanı ${badge(clamp(b.score,100))}</span>` : ""}</div><div class="acts"><button class="copy" data-t="${esc(b.text ?? b)}">Kopyala</button>${doneBtn("bio:"+(b.text ?? b), 20, "Uyguladım")}</div></li>`).join("");
  const ideas = [...(d.ideas||[])].sort((x,y) => (y.viral||0)-(x.viral||0)).map(i => `<li><div><b>${esc(i.hook)}</b><span>${esc(i.idea)}</span><span class="meter"><i style="width:${clamp(i.viral,100)}%"></i></span><span class="mini">Viral potansiyeli ${clamp(i.viral,100)}/100</span></div><div class="acts"><button class="copy" data-t="${esc(i.hook)}">Kopyala</button>${doneBtn("idea:"+i.hook, 30, "Çektim")}</div></li>`).join("");
  $("#r-karne").innerHTML = `
    <div class="card">${isSample ? '<span class="sample-flag">ÖRNEK SONUÇ · kendi SS’ini yükle</span>' : ''}
      <div class="score">${ring(score)}<div><div class="lbl">Hesap karnesi</div><p class="verdict">${esc(d.verdict)}</p>${d.potential ? `<span class="mini">Önerileri uygularsan: <b style="color:var(--good)">${clamp(d.potential,100)}</b></span>` : ""}</div></div>
      ${d.roast ? `<p class="roast">${esc(d.roast)}</p>` : ""}
      ${isSample ? "" : `<button class="share" id="share">Karnemi paylaş</button>`}
    </div>
    ${score < 75 ? `<div class="cta"><div><b>Bu karneyi ${clamp(d.potential||score+20,100)}'e biz çıkaralım</b><span>Bio, grid ve öne çıkanlar 7 günde hazır · Ender.psd</span></div><code>enderpsd.com.tr</code></div>` : ""}
    <div class="card"><div class="lbl">Alan alan · dokun, öneriyi gör</div><div class="areas">${areas}</div></div>
    <div class="card"><div class="lbl">Yeni bio önerileri</div><ul class="list">${bios}</ul></div>
    <div class="card"><div class="lbl">İçerik fikirleri · en yüksek puan üstte</div><ul class="list" data-all="100" data-badge="5 fikrin hepsini çektin!">${ideas}</ul></div>`;
  if (!isSample) $("#share").onclick = () => shareCard(score, d.verdict);
}
function renderRakip(d){
  const me = clamp(d.meTotal,100), rv = clamp(d.rivalTotal,100);
  const rows = (d.rows||[]).map(r => { const a = clamp(r.me,10), b = clamp(r.rival,10);
    return `<span>${esc(r.name)}</span><span class="num ${a>=b?'win':'lose'}">${a}</span><span class="num">${b}</span>
      <span class="tug"><i style="width:${(a/(a+b||1))*100}%"></i></span>`; }).join("");
  const why = (d.why||[]).map(x => `<li><div><b>${esc(x)}</b></div></li>`).join("");
  const beat = (d.beat||[]).map(x => `<li><div><b>${esc(x.title)}</b><span>${esc(x.how)}</span>${x.impact!=null?`<span class="mini">Etkisi +${clamp(x.impact,30)} puan</span>`:""}</div><div class="acts">${doneBtn("beat:"+x.title, 25, "Yaptım")}</div></li>`).join("");
  const gap = me - rv;
  $("#r-rakip").innerHTML = `
    <div class="card"><div class="duo"><div>${ring(me,96)}<div class="lbl">Sen</div></div><div class="vsx">VS</div><div>${ring(rv,96)}<div class="lbl">Rakip</div></div></div>
      <p class="verdict" style="text-align:center">${gap >= 0 ? "Öndesin, +" + gap : "Arayı kapat: " + Math.abs(gap) + " puan"}</p>
      <p class="note" style="text-align:center;margin:0">${esc(d.summary)}</p></div>
    <div class="card"><div class="lbl">Puan puan</div>
      <div class="vs"><span class="h">Alan</span><span class="h">Sen</span><span class="h">Rakip</span>${rows}</div></div>
    <div class="card"><div class="lbl">Rakip neden tutuyor?</div><ul class="list">${why}</ul></div>
    <div class="card"><div class="lbl">Ondan al, onu geç</div><ul class="list" data-all="80" data-badge="Rakibi geçme planı tamam!">${beat}</ul></div>`;
}
function renderCekim(d){
  const v = clamp(d.score,100);
  const tl = (d.timeline||[]).map(t => `<li><div><code>${esc(t.t)}</code> ${esc(t.do)}</div><div class="acts">${doneBtn("shot:"+d.title+t.t, 5, "Çekildi")}</div></li>`).join("");
  const tips = (d.tips||[]).map(x => `<li><div><b>${esc(x)}</b></div></li>`).join("");
  const fs = d.frameScore != null && d.frame ? clamp(d.frameScore,100) : null;
  $("#r-cekim").innerHTML = `
    <div class="card"><div class="score">${ring(v)}<div><div class="lbl">Fikrin viral puanı</div><p class="verdict">${esc(d.title)}</p></div></div>
      ${d.boost ? `<p class="roast">Puanı yükseltmek için: ${esc(d.boost)}</p>` : ""}</div>
    <div class="card"><div class="lbl">Çekim kartı</div>
      <dl class="shot"><dt>Hook</dt><dd>${esc(d.hook)}</dd><dt>Açı</dt><dd>${esc(d.angle)}</dd>
      <dt>Işık</dt><dd>${esc(d.light)}</dd><dt>Ses</dt><dd>${esc(d.sound)}</dd><dt>Süre</dt><dd>${esc(d.length)}</dd></dl></div>
    <div class="card"><div class="lbl">Çekim listesi · çektikçe işaretle</div><ul class="list" data-all="40" data-badge="Video çekildi! Şimdi paylaş.">${tl}</ul></div>
    ${d.frame ? `<div class="card"><div class="lbl">Karene bakınca</div>${fs!=null?`<div class="area"><span class="n">Kare puanı</span><span class="v" style="color:${colorFor(fs)}">${fs}/100</span><div class="bar"><i style="width:${fs}%;background:${colorFor(fs)}"></i></div></div>`:""}<p style="margin:0">${esc(d.frame)}</p></div>` : ""}
    <div class="card"><div class="lbl">Telefonla çekim ipuçları</div><ul class="list">${tips}</ul></div>`;
}

/* ---------- Örnek (açılışta görünür) ---------- */
renderKarne({score:62,verdict:"Görsellerin güçlü ama kim olduğun ilk bakışta anlaşılmıyor.",potential:81,
  areas:[{name:"Bio",score:5,note:"Ne sunduğun ve kime hitap ettiğin yazmıyor. Bir de net çağrı ekle."},
         {name:"Profil fotoğrafı",score:8,note:"Logo net, küçük boyutta da okunuyor."},
         {name:"Grid düzeni",score:7,note:"Renkler tutarlı, ama kapak yazıları farklı fontlarda."},
         {name:"Öne çıkanlar",score:4,note:"Kapak yok, 'Fiyatlar' ve 'Yorumlar' kategorisi eksik."},
         {name:"İçerik çeşitliliği",score:6,note:"Hep tekli görsel. Reels oranını artır."}],
  bio:[{text:"Kapalıçarşı'dan 22 ayar · Gram, çeyrek, bilezik · DM'den fiyat al 👇",score:84},{text:"30 yıllık kuyumcu · Altın almadan önce izle · Günlük fiyat hikâyede",score:77}],
  ideas:[{hook:"Bu bilezik sahte mi? 3 saniyede anla",viral:88,idea:"Damga, ağırlık ve ses testini yakın planda göster."},
         {hook:"10 bin TL'yle bugün ne alınır?",viral:82,idea:"Gram, çeyrek ve yarımı yan yana koy, fiyat etiketiyle."},
         {hook:"Kuyumcunun sana söylemediği 1 şey",viral:74,idea:"İşçilik farkını sade bir dille anlat."},
         {hook:"Çarşıda sabah 9'da neler oluyor?",viral:61,idea:"Dükkan açılışından hızlı kesimli bir vlog."},
         {hook:"Müşteri sordu: Bozdurursam kaybeder miyim?",viral:70,idea:"Gerçek soruya kısa ve net cevap ver."}]}, true);

/* ---------- Görseli küçült (maliyeti ve yüklemeyi azaltır) ---------- */
async function shrink(file, maxSide = 1280){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/* ---------- Paylaşılabilir karne kartı (9:16, hikâye için) ---------- */
async function shareCard(score, verdict){
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0,1920,1080,0); gr.addColorStop(0,"#1A0B2E"); gr.addColorStop(.5,"#3B1478"); gr.addColorStop(1,"#6A2CE0"); g.fillStyle = gr; g.fillRect(0,0,1080,1920);
  g.fillStyle = "#D98BFF"; g.font = "800 72px 'Bricolage Grotesque', sans-serif"; g.fillText("Büyüme.Koçu", 90, 200);
  g.fillStyle = "#9C98B3"; g.font = "500 44px Manrope, sans-serif"; g.fillText("Hesap karnem", 90, 560);
  g.fillStyle = "#FFFFFF"; g.font = "800 420px 'Bricolage Grotesque', sans-serif"; g.fillText(String(score), 70, 940);
  g.fillStyle = "#9C98B3"; g.font = "700 60px 'JetBrains Mono', monospace"; g.fillText("/100", 90, 1040);
  g.fillStyle = "#F2F0FA"; g.font = "500 52px Manrope, sans-serif";
  const words = String(verdict||"").split(" "); let line = "", y = 1200;
  for (const w of words){ if (g.measureText(line + w).width > 900){ g.fillText(line, 90, y); line = ""; y += 70; } line += w + " "; }
  g.fillText(line, 90, y);
  g.fillStyle = "#D98BFF"; g.font = "700 48px Manrope, sans-serif"; g.fillText("Seninki kaç? buyumekocu.com", 90, 1780);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const file = new File([blob], "karnem.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch {} }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "karnem.png"; a.click();
}

/* ---------- API ---------- */
async function api(payload){
  const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  showRemaining(r.headers.get("X-Remaining") ?? j.remaining);
  if (!r.ok) throw { userMsg: j.error || "Bir şey ters gitti, tekrar dene." };
  return j.data;
}
async function run(btn, errEl, label, fn){
  errEl.hidden = true; btn.disabled = true; const old = btn.textContent; btn.textContent = label;
  try{ await fn(); }
  catch(e){ errEl.textContent = e?.userMsg || "Bağlantı sorunu, tekrar dene."; errEl.hidden = false; }
  finally{ btn.disabled = false; btn.textContent = old; }
}
const need = (f, msg) => { if (!f) throw { userMsg: msg }; return f; };

$("#go-karne").onclick = () => run($("#go-karne"), $("#e-karne"), "Profil okunuyor…", async () => {
  const f = need($("#f-karne").files[0], "Önce profil SS'ini yükle.");
  const d = await api({ mode: "karne", images: [await shrink(f)], niche: $("#niche-karne").value, roast: tone() === "roast" });
  renderKarne(d, false); reward(50);
});
$("#go-rakip").onclick = () => run($("#go-rakip"), $("#e-rakip"), "Karşılaştırılıyor…", async () => {
  const a = need($("#f-me").files[0], "Kendi profil SS'ini yükle.");
  const b = need($("#f-rival").files[0], "Rakibin profil SS'ini yükle.");
  const d = await api({ mode: "rakip", images: [await shrink(a), await shrink(b)] });
  renderRakip(d); reward(40);
});
$("#go-cekim").onclick = () => run($("#go-cekim"), $("#e-cekim"), "Kart hazırlanıyor…", async () => {
  const idea = $("#idea").value.trim(); if (!idea) throw { userMsg: "Ne çekeceğini yaz." };
  const f = $("#f-frame").files[0];
  const d = await api({ mode: "cekim", idea, images: f ? [await shrink(f)] : [] });
  renderCekim(d); reward(30);
});


renderStats();

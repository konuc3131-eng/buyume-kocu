// Sahte Claude ile uçtan uca test: node test/smoke.js
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { parseJSON, buildPrompt } from "../lib/prompts.js";

process.env.ANTHROPIC_API_KEY ||= "test";
process.env.FREE_DAILY_LIMIT = "2";

// Claude çağrısını taklit et
let lastReq = null;
Anthropic.Messages.prototype.create = async function (req) {
  lastReq = req;
  return { content: [{ type: "text", text: '```json\n{"score":71,"verdict":"İyi","areas":[],"bio":[],"ideas":[]}\n```' }] };
};
const { default: handler } = await import("../api/analyze.js");

function call(body, ip = "1.1.1.1") {
  return new Promise(resolve => {
    const res = { headers: {}, code: 0,
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(j) { resolve({ code: this.code, body: j, headers: this.headers }); } };
    handler({ method: "POST", body, headers: { "x-forwarded-for": ip } }, res);
  });
}
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

assert.equal(parseJSON('önce {"a":1} sonra').a, 1);
assert.match(buildPrompt("cekim", { idea: "x\ny", hasFrame: false }), /Fikir: "x y"/);

let r = await call({ mode: "karne", images: [png], niche: "kuyumcu" });
assert.equal(r.code, 200); assert.equal(r.body.data.score, 71); assert.equal(r.body.remaining, 1);
assert.equal(lastReq.messages[0].content[0].type, "image");

r = await call({ mode: "rakip", images: [png] });
assert.equal(r.code, 400, "tek görselle rakip reddedilmeli");

r = await call({ mode: "cekim", idea: "bilezik testi" });
assert.equal(r.code, 200); assert.match(lastReq.model, /haiku/);

r = await call({ mode: "karne", images: [png] });
assert.equal(r.code, 429, "günlük limit aşılmalı");

r = await call({ mode: "karne", images: ["data:text/html;base64,PGI+"] }, "2.2.2.2");
assert.equal(r.code, 400, "görsel olmayan dosya reddedilmeli");

console.log("Tüm testler geçti ✔");

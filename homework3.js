"use strict";

const P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const G = {
  x: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
  y: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};
const INF = null;
let state = { publicKey: null, c1: null, cipher: null, decrypted: "" };

const $ = id => document.getElementById(id);
const mod = (a, m = P) => ((a % m) + m) % m;
function inverse(a, m = P) {
  let [oldR, r] = [mod(a, m), m], [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error("Inverse does not exist");
  return mod(oldS, m);
}
function pointEqual(a, b) { return a === b || (!!a && !!b && a.x === b.x && a.y === b.y); }
function pointAdd(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.x === b.x && mod(a.y + b.y) === 0n) return INF;
  let slope;
  if (pointEqual(a, b)) {
    if (a.y === 0n) return INF;
    slope = mod((3n * a.x * a.x) * inverse(2n * a.y));
  } else slope = mod((b.y - a.y) * inverse(b.x - a.x));
  const x = mod(slope * slope - a.x - b.x);
  return { x, y: mod(slope * (a.x - x) - a.y) };
}
function scalarMultiply(k, point = G) {
  k = mod(BigInt(k), N);
  let result = INF, addend = point;
  while (k > 0n) {
    if (k & 1n) result = pointAdd(result, addend);
    addend = pointAdd(addend, addend);
    k >>= 1n;
  }
  return result;
}
const hex = n => n.toString(16).padStart(64, "0");
const shortPoint = p => p ? `(${hex(p.x).slice(0,18)}…, ${hex(p.y).slice(0,18)}…)` : "point at infinity";
function hexBytes(bytes) { return [...bytes].map(b => b.toString(16).padStart(2,"0")).join(""); }
function readScalar(id) {
  const value = BigInt($(id).value);
  if (value <= 0n || value >= N) throw new Error("Scalar must be between 1 and n - 1.");
  return value;
}
async function keystream(point, length) {
  if (!point) throw new Error("Invalid shared point.");
  const base = hex(point.x) + hex(point.y);
  const encoder = new TextEncoder(), output = new Uint8Array(length);
  let offset = 0, counter = 0;
  while (offset < length) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(base + ":" + counter++)));
    const take = Math.min(digest.length, length - offset);
    output.set(digest.slice(0, take), offset); offset += take;
  }
  return output;
}
async function xorWithPoint(data, point) {
  const stream = await keystream(point, data.length);
  return data.map((value, i) => value ^ stream[i]);
}

$("eccGenerate").addEventListener("click", () => {
  try {
    const d = readScalar("eccPrivate");
    state.publicKey = scalarMultiply(d);
    $("eccOutput").innerHTML = `<strong>Private key d:</strong> ${d}<br><strong>Public key Q = dG:</strong> ${shortPoint(state.publicKey)}`;
  } catch (e) { $("eccOutput").textContent = e.message; }
});
$("eccEncrypt").addEventListener("click", async () => {
  try {
    const d = readScalar("eccPrivate"), k = readScalar("eccEphemeral");
    state.publicKey = scalarMultiply(d);
    state.c1 = scalarMultiply(k);
    const shared = scalarMultiply(k, state.publicKey);
    const plain = new TextEncoder().encode($("eccMessage").value);
    state.cipher = await xorWithPoint(plain, shared);
    $("eccOutput").innerHTML = `<strong>Q = dG:</strong> ${shortPoint(state.publicKey)}<br><strong>C1 = kG:</strong> ${shortPoint(state.c1)}<br><strong>Shared point S = kQ:</strong> ${shortPoint(shared)}<br><strong>Ciphertext (hex):</strong> ${hexBytes(state.cipher)}`;
  } catch (e) { $("eccOutput").textContent = e.message; }
});
$("eccDecrypt").addEventListener("click", async () => {
  try {
    if (!state.c1 || !state.cipher) throw new Error("Encrypt a message first.");
    const d = readScalar("eccPrivate"), shared = scalarMultiply(d, state.c1);
    const plain = await xorWithPoint(state.cipher, shared);
    state.decrypted = new TextDecoder().decode(plain);
    $("eccOutput").innerHTML += `<br><strong>Decryption uses dC1:</strong> ${shortPoint(shared)}<br><strong>Recovered message:</strong> ${escapeHtml(state.decrypted)}`;
  } catch (e) { $("eccOutput").textContent = e.message; }
});

function caesar(text, shift) {
  shift = ((shift % 26) + 26) % 26;
  return text.replace(/[A-Za-z]/g, ch => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(base + (ch.charCodeAt(0) - base + shift) % 26);
  });
}
let caesarCipher = "";
$("caesarEncrypt").addEventListener("click", () => {
  caesarCipher = caesar($("caesarMessage").value, Number($("caesarKey").value));
  $("caesarOutput").innerHTML = `<strong>Ciphertext:</strong> ${escapeHtml(caesarCipher)}`;
  $("attackCipher").value = caesarCipher;
});
$("caesarDecrypt").addEventListener("click", () => {
  if (!caesarCipher) caesarCipher = $("caesarMessage").value;
  const plain = caesar(caesarCipher, -Number($("caesarKey").value));
  $("caesarOutput").innerHTML += `<br><strong>Decrypted text:</strong> ${escapeHtml(plain)}`;
});

const ENGLISH = [8.167,1.492,2.782,4.253,12.702,2.228,2.015,6.094,6.966,0.153,0.772,4.025,2.406,6.749,7.507,1.929,0.095,5.987,6.327,9.056,2.758,0.978,2.360,0.150,1.974,0.074];
function chiSquared(text) {
  const counts = Array(26).fill(0); let total = 0;
  for (const ch of text.toUpperCase()) if (ch >= "A" && ch <= "Z") { counts[ch.charCodeAt(0)-65]++; total++; }
  if (!total) return Infinity;
  return counts.reduce((sum, observed, i) => {
    const expected = total * ENGLISH[i] / 100;
    return sum + ((observed - expected) ** 2) / expected;
  }, 0);
}
function rankCaesar(cipher) {
  return Array.from({length:26}, (_, key) => {
    const text = caesar(cipher, -key);
    return { key, text, score: chiSquared(text) };
  }).sort((a,b) => a.score-b.score);
}
$("frequencyAttack").addEventListener("click", () => {
  const ranked = rankCaesar($("attackCipher").value);
  $("attackOutput").innerHTML = `<strong>Best recovered key:</strong> ${ranked[0].key}<br><strong>Best plaintext:</strong> ${escapeHtml(ranked[0].text)}<br><br><strong>Five best candidates:</strong><br>` + ranked.slice(0,5).map(r => `key ${r.key}, score ${r.score.toFixed(2)}: ${escapeHtml(r.text.slice(0,100))}`).join("<br>");
});
$("lengthTest").addEventListener("click", () => {
  const corpus = (`THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG. STATISTICAL CRYPTANALYSIS USES REGULARITIES IN NATURAL LANGUAGE. LETTER FREQUENCIES BECOME MORE STABLE AS THE SAMPLE GROWS. A CAESAR CIPHER PRESERVES THESE FREQUENCIES BUT MOVES THEM TO DIFFERENT LETTERS. `).repeat(20);
  const realKey = Number($("caesarKey").value), lengths = [20,50,100,250,500,1000];
  const rows = lengths.map(length => {
    let success = 0, trials = 100;
    for (let t=0;t<trials;t++) {
      const maxStart = Math.max(1, corpus.length-length);
      const start = (t*73) % maxStart;
      const sample = corpus.slice(start,start+length);
      if (rankCaesar(caesar(sample,realKey))[0].key === realKey) success++;
    }
    return `<tr><td>${length}</td><td>${success}/${trials}</td><td>${success}%</td></tr>`;
  }).join("");
  $("lengthOutput").innerHTML = `<table><thead><tr><th>Characters</th><th>Correct recoveries</th><th>Success rate</th></tr></thead><tbody>${rows}</tbody></table><p>The test uses 100 deterministic excerpts per length. Results depend on the corpus and the number of letters present.</p>`;
});

$("eccAttack").addEventListener("click", async () => {
  try {
    if (!state.publicKey || !state.c1 || !state.cipher) throw new Error("Generate and encrypt an ECC message first.");
    const maximum = Number($("attackMax").value);
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 100000) throw new Error("Choose a maximum from 1 to 100,000.");
    $("eccAttackOutput").textContent = "Searching...";
    const start = performance.now(); let current = INF, found = 0;
    for (let candidate=1; candidate<=maximum; candidate++) {
      current = pointAdd(current, G);
      if (pointEqual(current, state.publicKey)) { found = candidate; break; }
      if (candidate % 2000 === 0) await new Promise(requestAnimationFrame);
    }
    if (!found) throw new Error(`Private key not found in 1…${maximum}. Increase the maximum.`);
    const shared = scalarMultiply(BigInt(found), state.c1);
    const recovered = new TextDecoder().decode(await xorWithPoint(state.cipher, shared));
    const elapsed = performance.now() - start;
    $("eccAttackOutput").innerHTML = `<strong>Recovered private key:</strong> ${found}<br><strong>Recovered message:</strong> ${escapeHtml(recovered)}<br><strong>Candidates tested:</strong> ${found}<br><strong>Elapsed time:</strong> ${elapsed.toFixed(2)} ms`;
  } catch (e) { $("eccAttackOutput").textContent = e.message; }
});
function escapeHtml(value) { const d=document.createElement("div"); d.textContent=value; return d.innerHTML; }

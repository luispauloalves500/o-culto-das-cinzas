// Binários do jogo guardados como texto (base64 em partes) em assets-src/, porque o fluxo de publicação
// só envia arquivos de texto. Este script remonta public/models/*.glb e confere sha256/tamanho.
//   node scripts/assets.mjs          → remonta (pula se já está igual)   [prebuild/predev/pretest]
//   node scripts/assets.mjs --pack   → gera as partes a partir de public/models/*.glb
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-src');
const MANIFEST = join(SRC, 'manifest.json');
const PART = 2_600_000; // caracteres base64 por parte
const sha = (b) => createHash('sha256').update(b).digest('hex');

export function unpack({ quiet = false } = {}) {
  const man = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const a of man.assets) {
    const out = join(ROOT, a.out);
    if (existsSync(out)) {
      const cur = readFileSync(out);
      if (cur.length === a.size && sha(cur) === a.sha256) { if (!quiet) console.log('[assets] ok', a.out); continue; }
    }
    const b64 = a.parts.map((p) => readFileSync(join(SRC, p), 'utf8').replace(/\s+/g, '')).join('');
    const buf = Buffer.from(b64, 'base64');
    if (buf.length !== a.size || sha(buf) !== a.sha256) throw new Error(`[assets] ${a.out}: partes corrompidas (tamanho ${buf.length}/${a.size})`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log('[assets] remontado', a.out, (a.size / 1e6).toFixed(2) + ' MB', a.sha256.slice(0, 12));
  }
}

function pack() {
  const assets = [];
  for (const f of readdirSync(join(ROOT, 'public/models')).filter((n) => n.endsWith('.glb')).sort()) {
    const buf = readFileSync(join(ROOT, 'public/models', f));
    const b64 = buf.toString('base64');
    for (const old of readdirSync(SRC).filter((n) => n.startsWith(f + '.b64.part'))) rmSync(join(SRC, old));
    const parts = [];
    for (let i = 0; i * PART < b64.length; i++) {
      const name = `${f}.b64.part${String(i + 1).padStart(2, '0')}`;
      writeFileSync(join(SRC, name), b64.slice(i * PART, (i + 1) * PART).replace(/.{1,76}/g, '$&\n'));
      parts.push(name);
    }
    assets.push({ out: 'public/models/' + f, size: buf.length, sha256: sha(buf), parts });
  }
  writeFileSync(MANIFEST, JSON.stringify({ note: 'gerado por scripts/assets.mjs --pack', assets }, null, 2) + '\n');
  console.log('[assets] empacotado', assets.map((a) => `${a.out} (${a.parts.length} partes)`).join(', '));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { if (process.argv.includes('--pack')) pack(); else unpack(); } catch (e) { console.error(e.message); process.exit(1); }
}

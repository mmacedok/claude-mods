// Run with Node 24+: node plugins/funmeter/docs/checar-loops.cjs [--json report.json]
// Pure drawings only, following f4-previa.cjs; no claude-code runtime or dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const assert = require('node:assert/strict');
const SOURCE = path.resolve(__dirname, '../hooks/register.tsx');
const numbers = s => (s.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number);
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const values = a => a.values.split(';').map(v => v.trim());
const times = a => a.keyTimes ? numbers(a.keyTimes) : values(a).map((_, i, v) => i / (v.length - 1));
const duration = a => Number(a.dur.slice(0, -1));
const equivalent = (a, x, y) => x === y || (a.type === 'rotate' && numbers(x).length === 1 && numbers(y).length === 1 && (Number(x) - Number(y)) % 360 === 0);

function loadDrawings(source) {
  // Source line markers are added only to the checker's copy, never the delivered SVG.
  const marked = source.replace(/<animate(?:Transform)?(?=\s+attributeName)/g, (tag, offset) => tag + ' data-check-line="' + (source.slice(0, offset).split('\n').length) + '"');
  const lines = marked.replace(/\r\n/g, '\n').split('\n');
  const index = p => { const i = lines.findIndex(l => l.startsWith(p)); assert(i >= 0, 'Missing drawing anchor: ' + p); return i; };
  const slice = (a, b) => lines.slice(index(a), index(b)).join('\n');
  const code = ['type BarraAgente = any; type Fatias = any;',
    slice('const LARANJA', '// A pasta do usuário'), slice('const TIPOS', 'const MAX_SKILLS'),
    slice('const TUBO_H', '// O painel Stats:'),
    'globalThis.drawings = { mascote, tubo, tuboVertical, bateria, tuboAgente, comFase, emFase };'].join('\n');
  const context = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(code), context, { filename: SOURCE });
  return context.drawings;
}
function parseSvg(svg) {
  const root = { tag: '#document', a: {}, children: [], parent: null };
  const stack = [root];
  for (const m of svg.matchAll(/<(\/?)([\w:-]+)\b([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attributes, selfClosing] = m;
    if (closing) { assert.equal(stack.pop().tag, tag, 'Mismatched SVG tag'); continue; }
    const node = { tag, a: attrs(attributes), children: [], parent: stack.at(-1) };
    node.parent.children.push(node);
    assert.equal([...attributes.matchAll(/\bbegin=/g)].length, node.a.begin === undefined ? 0 : 1, 'Duplicate begin');
    if (!selfClosing) stack.push(node);
  }
  assert.equal(stack.length, 1, 'Unclosed SVG tag');
  return root;
}
const flatten = n => [n, ...n.children.flatMap(flatten)];
const animations = n => n.children.filter(c => /^animate/.test(c.tag));
function scalar(a, t) {
  const v = values(a).map(Number), k = times(a);
  // Only used to prove an opacity/scale is zero at a reset, including duplicate times.
  let i = k.findLastIndex(x => x <= t + 1e-10);
  if (i === k.length - 1 || Math.abs(t - k[i]) < 1e-9) return v[i];
  const u = (t - k[i]) / (k[i + 1] - k[i]);
  return v[i] + (v[i + 1] - v[i]) * u;
}
function hidden(node, a, t) {
  for (let n = node; n && n.parent; n = n.parent) {
    const gate = animations(n).find(c => c.a.attributeName === 'opacity');
    if (gate && duration(gate.a) === duration(a) && scalar(gate.a, t) === 0) return 'opacity=0 (same duration)';
    if (!gate && n.a.opacity === '0') return 'static opacity=0';
  }
  // A translating group may contain the drop's scale gate. All its drawn children must vanish.
  const descendantsVanish = n => {
    const gate = animations(n).find(c => c.a.type === 'scale' && duration(c.a) === duration(a));
    if (gate) {
      const k = times(gate.a), v = values(gate.a), i = k.findLastIndex(x => x <= t + 1e-10);
      if (Math.abs(k[i] - t) < 1e-9 && numbers(v[i]).every(x => x === 0)) return true;
    }
    const kids = n.children.filter(c => !/^animate/.test(c.tag));
    return kids.length > 0 && kids.every(descendantsVanish);
  };
  return descendantsVanish(node) ? 'scale=0 (same duration)' : null;
}
function bounds(data, curve = false) {
  // The clip paths use absolute M/L/H/V/Q/T/Z. Blob bounds conservatively include all cubic controls.
  const tokens = data.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [];
  const pts = []; let x = 0, y = 0, qx = 0, qy = 0;
  for (let i = 0; i < tokens.length;) {
    const cmd = tokens[i++]; const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2, C: 6, Z: 0 }[cmd];
    assert.notEqual(arity, undefined, 'Unexpected bounds command ' + cmd);
    const v = tokens.slice(i, i += arity).map(Number);
    if (cmd === 'Z') continue;
    if (cmd === 'H') x = v[0]; else if (cmd === 'V') y = v[0];
    else if (cmd === 'Q' || cmd === 'T') {
      const cx = cmd === 'Q' ? v[0] : 2 * x - qx, cy = cmd === 'Q' ? v[1] : 2 * y - qy;
      const ex = v.at(-2), ey = v.at(-1);
      if (curve) {
        const ts = [0, 1];
        for (const [p0, p1, p2] of [[x, cx, ex], [y, cy, ey]]) {
          const u = (p0 - p1) / (p0 - 2 * p1 + p2); if (u > 0 && u < 1) ts.push(u);
        }
        for (const u of ts) pts.push([(1-u)**2*x+2*(1-u)*u*cx+u*u*ex, (1-u)**2*y+2*(1-u)*u*cy+u*u*ey]);
      } else pts.push([cx, cy]);
      qx = cx; qy = cy; x = ex; y = ey;
    } else {
      if (cmd === 'C') pts.push([v[0], v[1]], [v[2], v[3]]);
      x = v.at(-2); y = v.at(-1);
    }
    pts.push([x, y]);
  }
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}
function localBounds(node) {
  let boxes = [];
  if (node.tag === 'rect') { const a = node.a, x = Number(a.x || 0), y = Number(a.y || 0); boxes.push([x, y, x + Number(a.width), y + Number(a.height)]); }
  if (node.tag === 'path') {
    const morph = animations(node).find(c => c.a.attributeName === 'd');
    boxes.push(...(morph ? values(morph.a) : [node.a.d]).map(v => bounds(v)));
  }
  boxes.push(...node.children.filter(c => !/^animate/.test(c.tag)).map(localBounds).filter(Boolean));
  if (!boxes.length) return null;
  let box = [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))];
  if (node.a.transform) {
    assert(node.a.transform.startsWith('scale('), 'Unexpected static transform in wrap proof');
    const [sx, sy = sx] = numbers(node.a.transform); box = box.map((x, i) => x * (i % 2 ? sy : sx));
  }
  return box;
}
function clipped(node, value, nodes) {
  const box = localBounds(node); if (!box) return false;
  const [dx, dy = 0] = numbers(value);
  for (let p = node.parent; p; p = p.parent) {
    if (!p.a['clip-path']) continue;
    const id = p.a['clip-path'].match(/url\(#(.+)\)/)[1];
    const clip = nodes.find(n => n.a.id === id)?.children[0];
    const b = clip?.tag === 'rect' ? localBounds(clip) : clip?.tag === 'path' ? bounds(clip.a.d, true) : null;
    if (b && (box[2]+dx <= b[0] || box[0]+dx >= b[2] || box[3]+dy <= b[1] || box[1]+dy >= b[3])) return true;
  }
  return false;
}
function casesFor(d) {
  const cases = [];
  const add = (name, draw) => cases.push([name, draw()]);
  for (const mode of ['idle', 'working', 'happy']) add('mascote/' + mode, () => d.mascote(mode));
  for (const width of [220, 760, 1400]) for (const [name, f] of Object.entries({
    empty: { lido: 0, escrito: 0, input: 0, output: 0 },
    layers: { lido: 100000, escrito: 30000, input: 20000, output: 20000 },
    drops: { lido: 100000, escrito: 10000, input: 11000, output: 9000 },
    fullDrops: { lido: 180000, escrito: 19000, input: 20000, output: 21000 },
    mixed: { lido: 100000, escrito: 30000, input: 11000, output: 10000 },
    small: { lido: 1000, escrito: 10, input: 100, output: 500 },
  })) add('contexto/' + name + '/' + width, () => d.tubo(f, 200000, width));
  for (const pct of [0, 1, 21, 41, 79, 80, 99, 100]) add('frasco/' + pct, () => d.tuboVertical('5h', pct));
  for (const pct of [-130, 0, 1, 13, 15, 16, 64, 100, 130]) add('bateria/' + pct, () => d.bateria('24h', pct));
  for (const provider of ['Claude', 'Gemini', 'Codex']) for (const state of ['rodando', 'concluido', 'erro', 'parado', 'limite']) for (const [base, spent] of [[null, 0], [0, 0], [.27, .03], [.3, .25], [.97, .03]])
    add('agente/' + provider + '/' + state + '/' + base + '/' + spent, () => d.tuboAgente(provider, state, base, spent));
  return cases;
}
function runCheck(source = fs.readFileSync(SOURCE, 'utf8')) {
  const d = loadDrawings(source), cases = casesFor(d), failures = [], accepted = {}, internalResets = {}, coverage = new Set();
  let total = 0, maxSize = 0, maxPhasedSize = 0;
  for (const [name, svg] of cases) {
    maxSize = Math.max(maxSize, svg.replace(/ data-check-line="\d+"/g, '').length);
    const nodes = flatten(parseSvg(svg));
    const fail = (n, reason) => failures.push({ case: name, line: Number(n.a['data-check-line'] || 0), animation: n.a.attributeName + (n.a.type ? '/' + n.a.type : ''), reason });
    if (svg.replace(/ data-check-line="\d+"/g, '').length >= 131072) fail(nodes[0], 'SVG reaches size limit');
    for (const n of nodes.filter(n => n.a.repeatCount === 'indefinite')) {
      const a = n.a, v = values(a), k = times(a); total++; coverage.add(Number(a['data-check-line']));
      try {
        assert(!('begin' in a), 'Raw drawing contains begin');
        assert(v.length >= 2 && k.length === v.length, 'keyTimes/values count');
        assert(k[0] === 0 && k.at(-1) === 1 && k.every((t, i) => Number.isFinite(t) && t >= 0 && t <= 1 && (!i || t >= k[i-1])), 'Invalid keyTimes');
        assert(Number.isFinite(duration(a)) && duration(a) > 0, 'Invalid duration');
        if (a.calcMode === 'spline' || a.keySplines !== undefined) {
          const s = a.keySplines?.split(';'); assert(s?.length === v.length - 1, 'keySplines/interval count');
          assert(s.every(s => numbers(s).length === 4 && numbers(s).every(n => n >= 0 && n <= 1)), 'Invalid spline');
        }
        if (a.attributeName === 'd') {
          const signature = s => s.match(/[a-zA-Z]/g).join('') + ':' + numbers(s).length;
          assert(v.every(s => signature(s) === signature(v[0])), 'Path command structure changes');
        }
        const reset = (i, j, t0, t1) => {
          if (equivalent(a, v[i], v[j])) return 'closed/wrap';
          const h0 = hidden(n.parent, a, t0), h1 = hidden(n.parent, a, t1);
          if (h0 && h1) return h0;
          if (a.type === 'translate' && clipped(n.parent, v[i], nodes) && clipped(n.parent, v[j], nodes)) return 'outside clip';
          throw Error('Visible reset at ' + t0 + ': ' + v[i] + ' -> ' + v[j]);
        };
        const reason = reset(v.length - 1, 0, 1, 0); accepted[reason] = (accepted[reason] || 0) + 1;
        if (/^(frasco|bateria|agente)\//.test(name) && (a.type === 'translate' || ['cx', 'cy', 'rx'].includes(a.attributeName)) && v[0] === v.at(-1) && !equivalent(a, v.at(-2), v.at(-1))) {
          assert(hidden(n.parent, a, k.at(-2)) && hidden(n.parent, a, 1), 'Return interval must stay invisible with a matching duration');
        }
        for (let i = 1; i < k.length; i++) {
          if (k[i] === k[i-1]) { const proof = reset(i-1, i, k[i], k[i]); internalResets[proof] = (internalResets[proof] || 0) + 1; }
          else if (a.type === 'rotate' && v[i] !== v[i-1] && equivalent(a, v[i-1], v[i]))
            assert((k[i]-k[i-1])*duration(a) >= 1/60, 'Full turn unwinds in less than one frame; use an instantaneous 360/0 wrap');
        }
      } catch (error) { fail(n, error.message); }
    }
    // Simulate an unchanged redraw (must reuse bytes), then a real source replacement.
    for (const t of [0, 399, 1599, 2599, 59999, 1794528000123]) {
      const first = d.comFase(name, svg, t);
      assert.equal(d.comFase(name, svg, t + 73), first, 'Unchanged source reloads');
      const changed = d.comFase(name, svg + ' ', t + 73);
      const phasedSize = changed.replace(/ data-check-line="\d+"/g, '').trimEnd().length;
      maxPhasedSize = Math.max(maxPhasedSize, phasedSize);
      assert(phasedSize < 131072, 'Phased SVG reaches size limit');
      for (const [cssName, period] of Object.entries({gl: 8, br: 10, bo: 18})) {
        const phase = changed.match(new RegExp('--' + cssName + ':(-[\\d.]+s)'));
        if (phase) assert(Math.abs(-parseFloat(phase[1]) - ((t+73)/1000)%period) < .0011, 'CSS phase mismatch');
      }
      const a1 = flatten(parseSvg(first)).filter(n => n.a.repeatCount === 'indefinite');
      const a2 = flatten(parseSvg(changed)).filter(n => n.a.repeatCount === 'indefinite');
      a2.forEach((n, i) => {
        const period = duration(n.a), p0 = -Number.parseFloat(a1[i].a.begin), p1 = -Number.parseFloat(n.a.begin);
        const delta = ((p1-p0-.073) % period + period) % period;
        assert(Math.min(delta, period-delta) < .0011, name + ': redraw phase resets');
        assert(Math.abs(p1 - ((t+73)/1000) % period) < .0011, 'Phase must use each own duration');
      });
      const expected = d.emFase(svg, t + 73);
      assert.equal(changed.trimEnd(), expected.trimEnd(), 'Cache mixes raw sources');
    }
  }
  const expectedLines = [...source.matchAll(/<animate(?:Transform)?(?=\s+attributeName)/g)].map(m => source.slice(0, m.index).split('\n').length);
  assert(expectedLines.every(n => coverage.has(n)), 'Unexercised SMIL template: ' + expectedLines.filter(n => !coverage.has(n)));
  return { cases: cases.length, animations: total, templates: coverage.size, maxSvgSize: maxSize, maxPhasedSize, redrawPairs: cases.length * 6, phaseComparisons: total * 6, accepted, internalResets, failures };
}
module.exports = { runCheck, loadDrawings, casesFor, parseSvg };
if (require.main === module) {
  const report = runCheck(); const json = process.argv.indexOf('--json');
  if (json >= 0) fs.writeFileSync(process.argv[json+1], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2)); process.exitCode = report.failures.length ? 1 : 0;
}

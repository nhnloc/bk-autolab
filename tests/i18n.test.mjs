// Kiểm thử bản dịch tiếng Anh (src/i18n): mọi chuỗi tiếng Việt hiển thị cho người học phải có bản dịch.
//   node tests/i18n.test.mjs          chạy kiểm thử
//   node tests/i18n.test.mjs --dump   in mọi chuỗi tiếng Việt quét được và bản dịch
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trText, trMachine, trLab, trLecture, trCourseInfo } from '../src/i18n/loc.js';
import { MACHINES, MACHINE_IDS } from '../src/sim/index.js';
import { LABS, starterProject } from '../src/labs/index.js';
import { LECTURES, COURSE_INFO } from '../src/labs/lectures.js';
import { gradeLab } from '../src/labs/grader.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DUMP = process.argv.includes('--dump');
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const SAMPLE = '7';
const problems = [];
const stat = {};
const count = (k, ok) => { stat[k] ??= { ok: 0, total: 0 }; stat[k].total++; if (ok) stat[k].ok++; };

/** Bản dịch đạt: khác bản gốc và không còn dấu tiếng Việt. */
const isEnglish = (vi, en) => typeof en === 'string' && !VI.test(en) && (en !== vi || !VI.test(vi));

/* ------------------------------------------------------------------ */
/* 1. Quét chuỗi tiếng Việt trong mã nguồn                             */
/* ------------------------------------------------------------------ */

const unescape = (s) => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, c) => {
  if (c[0] === 'u') return String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16));
  if (c[0] === 'x' && c.length === 3) return String.fromCharCode(parseInt(c.slice(1), 16));
  return { n: '\n', t: '\t', r: '\r', 0: '\0', '\n': '' }[c] ?? c;
});

/**
 * Quét mã JS (đủ dùng cho mã nguồn dự án): bỏ chú thích, regex; trả về danh sách chuỗi
 * { line, samples:[...] }. Chuỗi nối bằng "+" được thêm giá trị mẫu; template literal được
 * khai triển: mỗi ${biểu thức} thay bằng các chuỗi hằng có chữ trong biểu thức (vd. nhánh
 * điều kiện 'đạt' / 'không đạt'), nếu không có thì bằng giá trị mẫu.
 */
function scan(src, lineBase = 1) {
  const out = [];
  let i = 0, line = lineBase, last = '';
  const prevSig = (k) => { let j = k - 1; while (j >= 0 && /\s/.test(src[j])) j--; return j >= 0 ? src[j] : ''; };
  const nextSig = (k) => { let j = k; while (j < src.length && /\s/.test(src[j])) j++; return src.slice(j, j + 2); };
  const plusAround = (start, end) => {
    const before = prevSig(start) === '+' && src[start - 2] !== '+';
    const n = nextSig(end);
    const after = n[0] === '+' && n[1] !== '+' && n[1] !== '=';
    return (s) => (before ? SAMPLE : '') + s + (after ? SAMPLE : '');
  };
  const readString = (q) => {
    const start = i; i++;
    let s = '';
    while (i < src.length && src[i] !== q) { if (src[i] === '\\') { s += src[i] + src[i + 1]; i += 2; } else { if (src[i] === '\n') line++; s += src[i++]; } }
    i++;
    return { start, end: i, value: unescape(s) };
  };
  const readTemplate = () => {
    const start = i; i++;
    const parts = [''];       // text, expr, text, expr, …
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { parts[parts.length - 1] += unescape(src[i] + src[i + 1]); i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2; const e0 = i; let depth = 1;
        while (i < src.length && depth) {
          const c = src[i];
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (!depth) break; }
          else if (c === "'" || c === '"') { readString(c); continue; }
          else if (c === '`') { readTemplate(); continue; }
          i++;
        }
        parts.push(src.slice(e0, i), '');
        i++;
        continue;
      }
      if (src[i] === '\n') line++;
      parts[parts.length - 1] += src[i++];
    }
    i++;
    return { start, end: i, parts };
  };
  const expand = (parts) => {
    let acc = [''];
    parts.forEach((p, k) => {
      if (k % 2 === 0) { acc = acc.map((a) => a + p); return; }
      const lits = scan(p).flatMap((x) => x.samples).filter((s) => /[A-Za-zÀ-ỹ]/.test(s));
      const alts = lits.length ? [...new Set(lits)] : [SAMPLE];
      acc = acc.flatMap((a) => alts.map((b) => a + b));
    });
    return acc;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); line += (src.slice(i, j).match(/\n/g) || []).length; i = j + 2; continue; }
    if (c === '/') {
      const p = prevSig(i);
      const kw = /(?:return|typeof|case)\s*$/.test(src.slice(Math.max(0, i - 8), i));
      if (!p || '(,=:[!&|?{};+-*%<>~^'.includes(p) || kw) {
        i++; let cls = false;
        while (i < src.length && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
        i++; continue;
      }
    }
    if (c === "'" || c === '"') {
      const l0 = line; const s = readString(c);
      out.push({ line: l0, samples: [plusAround(s.start, s.end)(s.value)] });
      continue;
    }
    if (c === '`') {
      const l0 = line; const t = readTemplate();
      const wrap = plusAround(t.start, t.end);
      out.push({ line: l0, samples: expand(t.parts).map(wrap) });
      continue;
    }
    last = c; i++;
  }
  return out;
}

const SOURCES = [
  'src/sim/kit.js', 'src/sim/index.js',
  ...readdirSync(ROOT + 'src/sim/machines').map((f) => 'src/sim/machines/' + f),
  'src/labs/grader.js', 'src/labs/index.js',
  ...readdirSync(ROOT + 'src/plc').map((f) => 'src/plc/' + f),
];

// Chuỗi đã dịch qua các hàm có cấu trúc (máy, bài lab).
const structured = new Map();
const addPair = (vi, en) => { if (typeof vi === 'string' && VI.test(vi)) structured.set(vi, en); };
for (const id of MACHINE_IDS) {
  const vi = MACHINES[id], en = trMachine(vi, 'en');
  addPair(vi.title, en.title); addPair(vi.summary, en.summary);
  for (const k of ['inputs', 'outputs']) vi.ioMap[k].forEach((io, j) => addPair(io.desc, en.ioMap[k][j].desc));
  vi.buttons.forEach((b, j) => addPair(b.label, en.buttons[j].label));
  vi.faults.forEach((f, j) => addPair(f.label, en.faults[j].label));
}
for (const lab of LABS) {
  const en = trLab(lab, 'en');
  addPair(lab.title, en.title);
  for (const k of ['objectives', 'tasks', 'hints']) lab[k].forEach((s, j) => addPair(s, en[k][j]));
}

for (const file of SOURCES) {
  const src = readFileSync(ROOT + file, 'utf8');
  for (const { line, samples } of scan(src)) {
    for (const s of samples) {
      if (!VI.test(s)) continue;
      const viaStruct = structured.get(s);
      const en = viaStruct ?? trText(s, 'en');
      const ok = isEnglish(s, en);
      count('source strings', ok);
      if (DUMP) console.log(`${ok ? ' ' : '✗'} ${file}:${line}\n    vi: ${JSON.stringify(s)}\n    en: ${JSON.stringify(en)}`);
      if (!ok) problems.push(`${file}:${line} chưa dịch: ${JSON.stringify(s)} → ${JSON.stringify(en)}`);
    }
  }
}

// Thông báo ghép lúc chạy mà quét tĩnh không thấy nguyên dạng.
const RUNTIME_SAMPLES = [
  'Main NW2: Tiếp điểm cần toán hạng Bool: "Speed"',
  'Main dòng 12: Thiếu \';\'',
  'FB_Cyl dòng 3: Thiếu END_IF (gặp \'hết file\')',
  'PLC tags: Tag trùng tên: "S1"',
  'PLC STOP: Chia cho 0',
  'VA CHẠM: Đẩy thùng khi tay mở 2A chưa về',
  'Giảng viên bật lỗi: Xi lanh 1A bị kẹt',
  'Giảng viên bật lỗi: Hết băng keo',
  'Lỗi: 3\nSai làn: 2\nThùng mã 2 vào làn 1 — sai làn\nThùng mã ? vào làn 3 — sai làn',
  'Đạt: 0 · Sản phẩm đã đặt vào khay: 12',
  'Sai 4/40 lần lấy mẫu. Ví dụ: bảng LED = 3, thùng có 5 lon',
  'Metal=1 Block=0 → H4 phải BẬT\nMetal=0 Block=1 → H4 phải TẮT',
  'Thiếu \':=\' sau Run',
  'Thiếu THEN (gặp \'ELSE\')',
];
for (const s of RUNTIME_SAMPLES) {
  const en = trText(s, 'en');
  const ok = isEnglish(s, en);
  count('runtime samples', ok);
  if (DUMP) console.log(`${ok ? ' ' : '✗'} runtime\n    vi: ${JSON.stringify(s)}\n    en: ${JSON.stringify(en)}`);
  if (!ok) problems.push(`thông báo lúc chạy chưa dịch: ${JSON.stringify(s)} → ${JSON.stringify(en)}`);
}

/* ------------------------------------------------------------------ */
/* 2. Chấm bài với project khởi đầu: mọi nhãn/chi tiết phải dịch được  */
/* ------------------------------------------------------------------ */
const checkMsg = (where, s) => {
  if (!s || !VI.test(s)) return;
  const en = trText(s, 'en');
  const ok = isEnglish(s, en);
  count('grading output', ok);
  if (DUMP) console.log(`${ok ? ' ' : '✗'} ${where}\n    vi: ${JSON.stringify(s)}\n    en: ${JSON.stringify(en)}`);
  if (!ok) problems.push(`${where} chưa dịch: ${JSON.stringify(s)} → ${JSON.stringify(en)}`);
};
let solutions = null;
try { solutions = await import('../src/labs/index.js').then(async (m) => (await m.loadSolutions()) ? m.solutionProject : null); } catch { solutions = null; }
for (const lab of LABS) {
  const projects = [['starter', starterProject(lab)]];
  if (solutions) projects.push(['reference', solutions(lab)]);
  // Project lỗi biên dịch: kiểm tra chi tiết lỗi biên dịch.
  const broken = starterProject(lab);
  broken.blocks[0].networks[0].rung.items[0].op = '"KhongCo"';
  projects.push(['broken', broken]);
  for (const [kind, project] of projects) {
    const r = await gradeLab(lab, project);
    for (const c of r.checks) { checkMsg(`${lab.id}/${kind} check ${c.id} label`, c.label); for (const l of c.detail.split('\n')) checkMsg(`${lab.id}/${kind} check ${c.id} detail`, l); checkMsg(`${lab.id}/${kind} check ${c.id} detail`, c.detail); }
    for (const e of r.log) checkMsg(`${lab.id}/${kind} log`, e.message);
  }
}
// Mọi lỗi giảng viên có thể cài + nhật ký "bật/tắt lỗi".
for (const id of MACHINE_IDS) {
  const vi = MACHINES[id];
  for (const f of vi.faults) checkMsg(`${id} fault log`, `Giảng viên bật lỗi: ${f.label}`);
}

/* ------------------------------------------------------------------ */
/* 3. Nội dung có cấu trúc: máy, bài lab, bài giảng                    */
/* ------------------------------------------------------------------ */
const field = (where, vi, en) => {
  if (typeof vi !== 'string' || !VI.test(vi)) return;
  const ok = isEnglish(vi, en);
  count(where.split(' ')[0], ok);
  if (!ok) problems.push(`${where} chưa dịch: ${JSON.stringify(vi)} → ${JSON.stringify(en)}`);
};
for (const id of MACHINE_IDS) {
  const vi = MACHINES[id], en = trMachine(vi, 'en');
  if (trMachine(vi, 'vi') !== vi) problems.push(`trMachine(${id}, 'vi') phải trả nguyên đối tượng`);
  field(`machines ${id}.title`, vi.title, en.title);
  field(`machines ${id}.summary`, vi.summary, en.summary);
  for (const k of ['inputs', 'outputs']) vi.ioMap[k].forEach((io, j) => {
    field(`machines ${id}.${io.tag}.desc`, io.desc, en.ioMap[k][j].desc);
    if (en.ioMap[k][j].tag !== io.tag || en.ioMap[k][j].addr !== io.addr) problems.push(`${id}.${io.tag}: tag/địa chỉ bị đổi`);
  });
  vi.buttons.forEach((b, j) => field(`machines ${id}.button.${b.id}`, b.label, en.buttons[j].label));
  vi.faults.forEach((f, j) => field(`machines ${id}.fault.${f.id}`, f.label, en.faults[j].label));
  if (vi.ioMap.inputs[0].desc === en.ioMap.inputs[0].desc) problems.push(`trMachine(${id}) sửa vào bản gốc?`);
}
// trMachine không được sửa bản gốc
if (!VI.test(MACHINES.trainer.title)) problems.push('trMachine đã sửa def gốc');

for (const lab of LABS) {
  const en = trLab(lab, 'en');
  field(`labs ${lab.id}.title`, lab.title, en.title);
  for (const k of ['objectives', 'tasks', 'hints']) {
    if (en[k].length !== lab[k].length) problems.push(`labs ${lab.id}.${k}: số phần tử khác bản gốc`);
    lab[k].forEach((s, j) => field(`labs ${lab.id}.${k}[${j}]`, s, en[k][j]));
  }
  if (lab.grading.sampleLabel) field(`labs ${lab.id}.sampleLabel`, lab.grading.sampleLabel, trText(lab.grading.sampleLabel, 'en'));
  if (trLab(lab, 'vi') !== lab) problems.push(`trLab(${lab.id}, 'vi') phải trả nguyên đối tượng`);
}

const spans = (s) => (s.match(/`[^`]*`/g) || []).sort().join('\u0001');
const tableShape = (s) => s.split('\n').filter((l) => l.trim().startsWith('|')).map((l) => (l.match(/\|/g) || []).length).join(',');
for (const id of Object.keys(LECTURES)) {
  const vi = LECTURES[id], en = trLecture(id, 'en');
  if (!en) { problems.push(`lectures ${id}: không có bản tiếng Anh`); continue; }
  if (en.durationMin !== vi.durationMin) problems.push(`lectures ${id}.durationMin khác`);
  vi.outcomes.forEach((o, j) => { field(`lectures ${id}.outcomes[${j}]`, o.text, en.outcomes[j]?.text); if (en.outcomes[j]?.code !== o.code) problems.push(`lectures ${id}.outcomes[${j}].code khác`); });
  vi.sections.forEach((s, j) => {
    const e = en.sections[j] || {};
    field(`lectures ${id}.sections[${j}].title`, s.title, e.title);
    field(`lectures ${id}.sections[${j}].body`, s.body, e.body);
    if (typeof e.body === 'string') {
      if (spans(s.body) !== spans(e.body)) problems.push(`lectures ${id}.sections[${j}].body: đoạn mã \`…\` khác bản gốc`);
      if (tableShape(s.body) !== tableShape(e.body)) problems.push(`lectures ${id}.sections[${j}].body: bảng Markdown khác số cột/dòng`);
    }
  });
  (vi.quiz || []).forEach((q, j) => {
    const e = (en.quiz || [])[j] || {};
    field(`lectures ${id}.quiz[${j}].q`, q.q, e.q);
    field(`lectures ${id}.quiz[${j}].explain`, q.explain, e.explain);
    if (e.answer !== q.answer) problems.push(`lectures ${id}.quiz[${j}].answer khác`);
    if ((e.options || []).length !== q.options.length) problems.push(`lectures ${id}.quiz[${j}].options: số phương án khác`);
    q.options.forEach((o, k) => field(`lectures ${id}.quiz[${j}].options[${k}]`, o, e.options?.[k]));
  });
  if (trLecture(id, 'vi') !== vi) problems.push(`trLecture(${id}, 'vi') phải trả bản gốc`);
}
const ci = trCourseInfo('en');
field('course title', COURSE_INFO.title, ci.title);
field('course subtitle', COURSE_INFO.subtitle, ci.subtitle);

// API cơ bản
if (trText('Thiếu toán hạng', 'vi') !== 'Thiếu toán hạng') problems.push("trText(…, 'vi') phải trả nguyên chuỗi");
if (trText('xyz không khớp mẫu nào ạ', 'en') !== 'xyz không khớp mẫu nào ạ') problems.push('trText phải trả nguyên chuỗi khi không khớp');

/* ------------------------------------------------------------------ */
for (const [k, v] of Object.entries(stat)) console.log(`${k.padEnd(16)} ${v.ok}/${v.total} (${((v.ok / v.total) * 100).toFixed(1)} %)`);
if (problems.length) {
  console.log(`\n${problems.length} vấn đề:`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log('i18n: OK');

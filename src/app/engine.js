// Cầu nối Engine: dùng engine thật (src/plc, src/sim, src/labs) nếu nạp được, nếu không thì dùng shim giả lập.
// CÔNG TẮC DUY NHẤT: ENGINE_MODE = 'auto' | 'real' | 'fake'. Có thể ghi đè bằng URL: index.html?engine=fake
import { COURSE, MACHINE_TITLES } from './course.js';

export const ENGINE_MODE = 'auto';

let cached = null;

function mode() {
  try {
    const q = new URLSearchParams(location.search).get('engine');
    if (q === 'fake' || q === 'real' || q === 'auto') return q;
  } catch { /* bỏ qua */ }
  return ENGINE_MODE;
}

async function tryImport(path) {
  try { return await import(path); } catch (e) { console.info('[engine] không nạp được', path, '→ dùng shim.', e?.message || e); return null; }
}

import { PUBLIC_MODE } from './config.js';

/** Nạp engine một lần. Trả về { PlcRuntime, createMachine, MACHINES, LABS, starterProject, solutionProject, grade, isFake }. */
export function loadEngine() {
  if (cached) return cached;
  cached = (async () => {
    const md = mode();
    let plcMod = null, simMod = null, labsMod = null, gradeMod = null;
    if (md !== 'fake') {
      [plcMod, simMod, labsMod, gradeMod] = await Promise.all([
        tryImport('../plc/runtime.js'), tryImport('../sim/index.js'), tryImport('../labs/index.js'), tryImport('../labs/grader.js'),
      ]);
    }
    const realCore = !!(plcMod?.PlcRuntime && simMod?.createMachine);
    const realLabs = realCore && !!labsMod?.LABS;
    const fake = realCore && realLabs ? null : await import('./dev/fakeEngine.js');
    const eng = {
      PlcRuntime: realCore ? plcMod.PlcRuntime : fake.PlcRuntime,
      createMachine: realCore ? simMod.createMachine : fake.createMachine,
      MACHINES: realCore ? (simMod.MACHINES || {}) : fake.MACHINES,
      LABS: realLabs ? labsMod.LABS : fake.LABS,
      isFake: !realCore,
    };
    if (realLabs && labsMod.loadSolutions && !PUBLIC_MODE) await labsMod.loadSolutions();
    eng.starterProject = realLabs && labsMod.starterProject ? (lab) => labsMod.starterProject(lab.raw || lab) : null;
    /** Lời giải tham khảo — CHỈ dùng ở trang giảng viên. */
    eng.solutionProject = realLabs && labsMod.solutionProject ? (lab) => labsMod.solutionProject(lab.raw || lab) : null;
    /** Chấm bài → { score, max, passed, criteria:[{id,title,ok,points,max,message}], stats } */
    eng.grade = async (lab, project, onProgress) => {
      if (realLabs && gradeMod?.gradeLab) {
        const r = await gradeMod.gradeLab(lab.raw || lab, project, { onProgress });
        const criteria = (r.checks || []).map((c) => ({ id: c.id, title: c.label, ok: !!c.pass, points: c.points, max: c.max, message: c.detail || '' }));
        return { score: r.score, max: r.max, passed: r.score >= r.max * 0.5, criteria, stats: r.stats, log: r.log, at: Date.now() };
      }
      if (typeof lab.grade === 'function') return lab.grade(project, eng);
      return null;
    };
    return eng;
  })();
  return cached;
}

/* ---------------- Chuẩn hóa dữ liệu engine cho UI ---------------- */

/** Một dòng I/O → { addr, tag, desc, dir:'I'|'Q', type } */
export function normIo(e, dirHint) {
  if (!e) return null;
  if (Array.isArray(e)) e = { addr: e[0], tag: e[1], desc: e[2] };
  const addr = String(e.addr ?? e.address ?? e.io ?? e.op ?? '').trim();
  const tag = String(e.tag ?? e.name ?? e.symbol ?? '').trim();
  const desc = e.desc ?? e.description ?? e.comment ?? e.label ?? '';
  const dir = /^%?Q/i.test(addr) ? 'Q' : /^%?I/i.test(addr) ? 'I' : dirHint || 'I';
  const isWord = /^%[IQM]W/i.test(addr);
  const type = e.type || (isWord ? 'Int' : 'Bool');
  return { addr: addr.startsWith('%') || !addr ? addr : '%' + addr, tag, desc, dir, type, nc: !!e.nc };
}

export const COMMON_INPUTS = [
  { addr: '%I0.0', tag: 'Start', desc: 'Nút Start (NO)', dir: 'I', type: 'Bool' },
  { addr: '%I0.1', tag: 'Stop', desc: 'Nút Stop (NC)', dir: 'I', type: 'Bool', nc: true },
  { addr: '%I0.2', tag: 'Reset', desc: 'Nút Reset', dir: 'I', type: 'Bool' },
  { addr: '%I0.3', tag: 'EStop', desc: 'Dừng khẩn (NC)', dir: 'I', type: 'Bool', nc: true },
  { addr: '%I0.4', tag: 'AutoMan', desc: 'Chọn chế độ (1 = Auto)', dir: 'I', type: 'Bool' },
];
export const COMMON_OUTPUTS = [
  { addr: '%Q0.0', tag: 'H_Run', desc: 'Đèn chạy', dir: 'Q', type: 'Bool' },
  { addr: '%Q0.1', tag: 'H_Fault', desc: 'Đèn lỗi', dir: 'Q', type: 'Bool' },
];

/** ioMap của máy (đã chuẩn hóa, có cả bảng nút chung). */
export function machineIo(def) {
  const io = def?.ioMap || {};
  const ins = (io.inputs || []).map((e) => normIo(e, 'I')).filter(Boolean);
  const outs = (io.outputs || []).map((e) => normIo(e, 'Q')).filter(Boolean);
  const has = (list, a) => list.some((x) => x.addr.toUpperCase() === a);
  const inputs = [...COMMON_INPUTS.filter((c) => !has(ins, c.addr)), ...ins];
  const outputs = [...COMMON_OUTPUTS.filter((c) => !has(outs, c.addr)), ...outs];
  const order = (a) => { const m = /%[IQ]W?(\d+)(?:\.(\d))?/i.exec(a.addr); return m ? (+m[1]) * 10 + (+m[2] || 0) + (/W/i.test(a.addr) ? 1000 : 0) : 9999; };
  inputs.sort((a, b) => order(a) - order(b)); outputs.sort((a, b) => order(a) - order(b));
  return { inputs, outputs };
}

/** Lab của engine → dạng UI. */
export function normLab(raw) {
  if (!raw) return null;
  const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  return {
    id: raw.id,
    title: raw.title || raw.name || raw.id,
    part: raw.part,
    machineId: raw.machineId || raw.machine,
    summary: raw.summary || raw.description || raw.intro || '',
    objectives: arr(raw.objectives || raw.goals),
    steps: arr(raw.tasks || raw.steps).map((s) => (typeof s === 'string' ? { title: '', text: s } : { title: s.title || '', text: s.text || s.desc || s.description || '' })),
    hints: arr(raw.hints),
    allowOverride: raw.allowOverride ?? raw.allowInputOverride ?? raw.allowForce ?? true,
    starter: raw.starterProject || raw.project || raw.initialProject || raw.starter || null,
    grade: typeof raw.grade === 'function' ? raw.grade : typeof raw.check === 'function' ? raw.check : null,
    raw,
  };
}

/** Ghép khung khóa học (UI) với LABS của engine. Trả về danh sách lab chuẩn hóa. */
export function mergeCourse(LABS) {
  const list = Array.isArray(LABS) ? LABS : Object.values(LABS || {});
  const eng = list.map(normLab).filter(Boolean);
  const used = new Set();
  const out = COURSE.map((c) => {
    let e = eng.find((x) => x.id === c.id);
    if (!e && c.machineId) e = eng.find((x) => !used.has(x.id) && x.machineId === c.machineId);
    if (e) used.add(e.id);
    return { ...c, ...(e || {}), id: c.id, engineId: e?.id || null, title: c.title, part: c.part, machineId: c.machineId || e?.machineId || null, hasContent: !!e };
  });
  for (const e of eng) {
    if (used.has(e.id)) continue;
    out.push({ week: null, level: 2, ...e, part: e.part || 2, engineId: e.id, hasContent: true });
  }
  return out;
}

export function machineTitle(id, def) { return def?.title || MACHINE_TITLES[id] || id; }

/** Tạo project mặc định từ ioMap của máy. */
export function defaultProject(machineId, def, name) {
  const { inputs, outputs } = machineIo(def);
  const tags = [];
  const seen = new Set();
  for (const io of [...inputs, ...outputs]) {
    if (!io.addr || !/\w/.test(io.tag || '')) continue;
    let nm = io.tag.replace(/[^\w]/g, '_');
    if (seen.has(nm)) nm += '_' + io.addr.replace(/[%.]/g, '');
    seen.add(nm);
    tags.push({ name: nm, address: io.addr, type: io.type || 'Bool', comment: io.desc || '' });
  }
  return {
    schema: 'bk-autolab/project@1',
    name: name || ('Project_' + machineId),
    machineId, cpu: '1214C',
    tags,
    blocks: [
      { name: 'Main', type: 'OB', number: 1, lang: 'LAD', networks: [
        { title: '', comment: '', rung: { t: 'series', items: [] } },
      ] },
    ],
    watch: [{ op: '"Start"' }, { op: '"Stop"' }, { op: '%Q0.0' }],
  };
}

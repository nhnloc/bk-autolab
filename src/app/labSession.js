// Phiên mô phỏng: 1 máy + 1 PLC nối bus I/O. Dùng ở trang Lab, trang xem bài và trang cài lỗi.
import { loadEngine, mergeCourse, defaultProject, normLab } from './engine.js';
import { clone } from './dom.js';
import { COURSE } from './course.js';
import { trLab } from './loc.js';

let labsCache = null;
const courseIds = new Set(COURSE.map((c) => c.id));
/** Lab đã dịch theo ngôn ngữ hiện tại (chỉ các trường hiển thị; lab.raw giữ nguyên bản gốc cho engine/chấm). */
function localize(l) {
  const c = courseIds.has(l.id) ? COURSE.find((x) => x.id === l.id) : null;
  if (!l.raw) return c ? { ...l, title: c.title } : l;
  const tr = trLab(l.raw);
  const n = tr && tr !== l.raw ? normLab(tr) : null;
  return {
    ...l,
    title: c ? c.title : n?.title || l.title,
    ...(n ? { summary: n.summary, objectives: n.objectives, steps: n.steps, hints: n.hints } : {}),
  };
}
/** Danh sách lab (khung khóa học + engine), dịch lúc gọi — mỗi trang gọi lại khi vẽ. */
export async function getLabs() {
  const eng = await loadEngine();
  if (!labsCache) labsCache = mergeCourse(eng.LABS, eng.MACHINES);
  return labsCache.map(localize);
}
export async function getLab(id) { return (await getLabs()).find((l) => l.id === id) || null; }

/** Project khởi đầu cho lab: starterProject của engine → starter trong lab → sinh từ ioMap. */
export function starterFor(eng, lab, def) {
  try { if (eng.starterProject && lab.raw) return eng.starterProject(lab); } catch (e) { console.warn(e); }
  if (lab.starter) return clone(lab.starter);
  return defaultProject(lab.machineId, def, `${lab.id} — ${lab.title}`);
}

export function createSession(eng, machineId, { faults = [] } = {}) {
  const m = eng.createMachine(machineId);
  for (const f of faults) { try { m.setFault(f, true); } catch { /* bỏ qua */ } }
  const plc = new eng.PlcRuntime(null, { cpu: m.def?.cpu || '1214C' });
  plc.attach(m);
  let loadedJson = null;
  return {
    m, plc,
    load(project) {
      if (plc.state === 'RUN') plc.stop();
      const res = plc.load(project) || { ok: false, errors: [{ message: 'load() returned no result' }] };
      if (res.ok) loadedJson = JSON.stringify(project);
      return res;
    },
    isLoaded(project) { return loadedJson !== null && loadedJson === JSON.stringify(project); },
    get hasLoaded() { return loadedJson !== null; },
    dispose() { try { plc.stop(); } catch { /* bỏ qua */ } try { plc.dispose?.(); } catch { /* bỏ qua */ } },
  };
}


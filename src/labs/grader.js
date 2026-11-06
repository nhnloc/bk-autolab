// Chấm bài tự động: chạy project của sinh viên trên máy mô phỏng (không giao diện) với kịch bản cố định.
import { PlcRuntime } from '../plc/runtime.js';
import { createMachine } from '../sim/index.js';

/**
 * @returns {Promise<{score, max, checks:[{id,label,points,max,pass,detail}], log:[…], stats}>}
 */
export async function gradeLab(lab, project, { onProgress } = {}) {
  const checks = [];
  const add = (id, label, max, pass, detail = '') => checks.push({ id, label, max, points: pass ? max : 0, pass: !!pass, detail });
  const g = lab.grading;

  const plc = new PlcRuntime(null, { manualClock: true });
  const comp = plc.load(project);
  add('compile', 'Chương trình biên dịch không lỗi', 10, comp.ok, comp.ok ? '' : comp.errors.slice(0, 3).map((e) => `${e.block}${e.network !== undefined ? ' NW' + (e.network + 1) : ''}${e.line ? ' dòng ' + e.line : ''}: ${e.message}`).join('\n'));
  if (!comp.ok) return finish();

  const m = createMachine(lab.machineId);
  plc.attach(m);
  let runtimeError = null;
  plc.on('error', (e) => { runtimeError = e; });
  plc.start();
  const run = async (ms) => {
    const chunk = 1000;
    for (let t = 0; t < ms; t += chunk) {
      plc.runFor(Math.min(chunk, ms - t));
      if (onProgress) onProgress(Math.min(1, (m.time) / (g.runMs + 6000)));
      if (typeof window !== 'undefined') await new Promise((r) => setTimeout(r, 0));
    }
  };
  const press = async (id, ms = 200) => { m.press(id, true); await run(ms); m.press(id, false); };
  const outputsOff = () => m.def.ioMap.outputs.filter((o) => o.tag !== 'H_Fault' && o.tag !== 'H_Low').every((o) => !m.outputs[o.tag]);

  // 1. Không tự chạy khi chưa nhấn Start
  await run(1500);
  const idleOk = !m.outputs.H_Run;
  // 2. Start → chạy
  await press('Start');
  await run(g.runMs);
  const s = { ...m.stats };
  const good = s.produced;
  add('runs', 'Máy tự chạy sau khi nhấn Start', 10, idleOk && good > 0, idleOk ? '' : 'H_Run sáng trước khi nhấn Start');
  const minGood = g.minGood ?? 1;
  add('throughput', `Sản xuất đủ sản lượng (≥ ${minGood} sản phẩm đạt trong ${Math.round(g.runMs / 1000)} s)`, 30, good >= minGood, `Đạt: ${good}`);
  if (g.minPlaced !== undefined) {
    const placed = m.trays ? m.trays.reduce((n, t) => n + t.cells.filter(Boolean).length, 0) + s.produced * 6 : 0;
    checks[checks.length - 1].pass ||= placed >= g.minPlaced;
    checks[checks.length - 1].points = checks[checks.length - 1].pass ? 30 : 0;
    checks[checks.length - 1].detail += ` · Sản phẩm đã đặt vào khay: ${placed}`;
  }
  const ran = good > 0 || (g.minPlaced !== undefined && checks[checks.length - 1].pass);
  add('nocrash', 'Không có va chạm cơ khí', 15, ran && s.crashes === 0 && !runtimeError, s.crashes ? m.events.filter((e) => e.level === 'error').map((e) => e.message).slice(0, 2).join('\n') : runtimeError ? 'PLC STOP: ' + runtimeError.message : '');
  add('quality', 'Không có sản phẩm lỗi', 15, ran && s.defects === 0 && (g.maxWrongLane === undefined || (s.wrongLane || 0) <= g.maxWrongLane),
    [s.defects ? `Lỗi: ${s.defects}` : '', s.wrongLane ? `Sai làn: ${s.wrongLane}` : '', ...m.events.filter((e) => e.level === 'warn').slice(-2).map((e) => e.message)].filter(Boolean).join('\n'));

  // 3. Dừng khẩn
  m.press('EStop', true);
  await run(60);
  const estopOff = outputsOff() && !m.outputs.H_Run;
  await run(500);
  m.press('EStop', true);   // nhả (nút có chốt)
  await run(1500);
  const noAutoRestart = !m.outputs.H_Run;
  add('estop', 'Dừng khẩn tắt mọi đầu ra, nhả không tự chạy lại', 10, ran && estopOff && noAutoRestart, !estopOff ? 'Còn đầu ra bật sau khi nhấn Dừng khẩn' : !noAutoRestart ? 'Máy tự chạy lại khi nhả Dừng khẩn' : '');
  // 4. Stop
  await press('Start');
  await run(1000);
  await press('Stop', 100);
  await run(100);
  add('stop', 'Nút Stop dừng máy', 10, ran && !m.outputs.H_Run, m.outputs.H_Run ? 'H_Run vẫn sáng sau khi nhấn Stop' : '');
  plc.stop();
  return finish(m);

  function finish(machine) {
    const score = checks.reduce((a, c) => a + c.points, 0);
    const max = 100;
    return { score, max, checks, stats: machine ? machine.stats : null, log: machine ? machine.events.slice(-30) : [] };
  }
}

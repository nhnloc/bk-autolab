// Ghi "băng chạy thử mẫu" cho từng lab: chạy lời giải mẫu (private/solutions.js) trên máy mô phỏng theo một
// kịch bản thao tác, ghi lại đầu ra PLC + thao tác nút → assets/demos/<labId>.json (không chứa code lời giải).
// Sau khi ghi, phát lại bằng DemoPlayer và so khớp để chắc chắn máy chạy y hệt.
//   node tools/record-demos.mjs            # mọi lab
//   node tools/record-demos.mjs L07 L09    # một vài lab
import { writeFileSync, mkdirSync } from 'node:fs';
import { PlcRuntime } from '../src/plc/runtime.js';
import { createMachine } from '../src/sim/index.js';
import { LABS, solutionProject, loadSolutions } from '../src/labs/index.js';
import { seededRandom, DemoPlayer } from '../src/sim/demo.js';

if (!(await loadSolutions())) { console.error('Không tìm thấy private/solutions.js — chỉ chạy được trên máy giảng viên.'); process.exit(1); }
const OUT = new URL('../assets/demos/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const N = (vi, en) => ({ vi, en });

/* ---------- Kịch bản thao tác cho từng lab ---------- */
// s: { run(ms), press(id, ms), hold(id, on), note(vi, en) }
const generic = (runMs) => async (s) => {
  s.note('Máy ở trạng thái chờ: công tắc ở Auto, chưa nhấn Start — mọi cơ cấu đứng yên.', 'Machine idle: selector on Auto, Start not pressed yet — nothing moves.');
  await s.run(1500);
  s.note('Nhấn Start: máy bắt đầu chạy tự động (đèn H_Run sáng).', 'Press Start: the machine starts automatic operation (H_Run on).');
  await s.press('Start');
  await s.run(runMs);
  s.note('Nhấn Stop: máy dừng, mọi van và động cơ tắt.', 'Press Stop: the machine stops, all valves and motors off.');
  await s.press('Stop', 150);
  await s.run(3000);
};

const SCRIPTS = {
  L01: async (s) => {
    await s.run(800);
    s.note('Nhấn giữ S1 → đèn H1 (đỏ) sáng.', 'Hold S1 → lamp H1 (red) on.');
    await s.press('S1', 2000); await s.run(1000);
    s.note('Nhấn đồng thời S1 và S2 → H2 (vàng) sáng; S2 cũng làm H3 (xanh lá) sáng.', 'Hold S1 and S2 together → H2 (yellow) on; S2 also turns on H3 (green).');
    s.hold('S1', true); s.hold('S2', true); await s.run(2500); s.hold('S1', false); s.hold('S2', false); await s.run(1000);
    s.note('Gạt công tắc SW1 sang phải → H3 sáng (logic OR).', 'Turn selector SW1 right → H3 on (OR logic).');
    await s.press('SW1', 100); await s.run(2500);
    s.note('Gạt SW1 về trái → H3 tắt.', 'Turn SW1 back left → H3 off.');
    await s.press('SW1', 100); await s.run(1500);
    s.note('Nhấn S3 (nút thường đóng NC): ngõ vào về 0 → còi BUZ kêu.', 'Press S3 (normally-closed NC button): its input drops to 0 → buzzer BUZ sounds.');
    await s.press('S3', 2000); await s.run(1500);
    s.note('Đưa kim loại vào cảm biến tiệm cận PRX, tia quang PE không bị chắn → H4 (xanh dương) sáng.', 'Bring metal to the proximity sensor PRX, light beam PE clear → H4 (blue) on.');
    await s.press('Metal', 100); await s.run(2500);
    s.note('Che tia cảm biến quang PE → H4 tắt.', 'Block the photo-eye PE → H4 off.');
    await s.press('Block', 100); await s.run(2500);
    s.note('Bỏ che tia quang và lấy kim loại ra → H4 tắt.', 'Clear the beam and remove the metal → H4 off.');
    await s.press('Block', 100); await s.run(1500); await s.press('Metal', 100); await s.run(1500);
  },
  L02: async (s) => {
    await s.run(800);
    s.note('Nhấn Lên rồi nhả tay: KM1 tự giữ, cửa đi lên (H_Up sáng) tới công tắc hành trình trên LS_Up thì dừng.', 'Press Up and release: KM1 seals in, the door rises (H_Up on) and stops at the upper limit switch LS_Up.');
    await s.press('Up'); await s.run(11000);
    s.note('Nhấn Xuống: KM2 tự giữ, cửa đi xuống (H_Down sáng) tới LS_Down thì dừng.', 'Press Down: KM2 seals in, the door lowers (H_Down on) and stops at LS_Down.');
    await s.press('Down'); await s.run(10500);
    s.note('Nhấn Lên, giữa hành trình nhấn Stop: cửa dừng tại chỗ.', 'Press Up, then Stop mid-travel: the door stops where it is.');
    await s.press('Up'); await s.run(3500); await s.press('Stop', 150); await s.run(2500);
    s.note('Nhấn Xuống trong khi có vật cản ở chân cửa (PE = 1): cửa dừng ngay để tránh kẹp vật.', 'Press Down with an obstacle under the door (PE = 1): the door stops at once.');
    await s.press('Obstacle', 100); await s.press('Down'); await s.run(5000);
    s.note('Bỏ vật cản, nhấn Xuống lại: cửa đóng hết.', 'Remove the obstacle, press Down again: the door closes fully.');
    await s.press('Obstacle', 100); await s.run(500); await s.press('Down'); await s.run(5000);
  },
  L03: async (s) => {
    s.note('Máy nén khí chờ. Nhấn Start: khi áp thấp (PS = 1), đóng KM1 + KM2 — động cơ chạy SAO.', 'Compressor idle. Press Start: with low pressure (PS = 1) KM1 + KM2 close — motor runs in STAR.');
    await s.run(1000); await s.press('Start'); await s.run(4200);
    s.note('Sau 4 s: nhả KM2, chờ 80 ms rồi đóng KM3 — chuyển sang TAM GIÁC. Xem dòng điện trên đồ thị.', 'After 4 s: KM2 opens, 80 ms dead time, then KM3 closes — DELTA. Watch the current trend.');
    await s.run(20000);
    s.note('Đủ áp (PS = 0) thì động cơ dừng; áp tụt (PS = 1) lại tự khởi động sao–tam giác. Bật "Tăng tiêu thụ khí" để áp tụt nhanh hơn.', 'At full pressure (PS = 0) the motor stops; when it drops (PS = 1) it restarts star–delta. "Increase air demand" makes pressure drop faster.');
    await s.press('Demand', 100); await s.run(40000);
    s.note('Nhấn Stop: dừng máy nén.', 'Press Stop: compressor stops.');
    await s.press('Stop', 150); await s.run(3000);
  },
  L04: generic(90000),
  L18P: generic(150000),
};

/* ---------- Ghi ---------- */
async function record(lab) {
  const seed = (Math.random() * 2 ** 31) | 0;
  const orig = Math.random;
  Math.random = seededRandom(seed);
  try {
    const m = createMachine(lab.machineId);
    const plc = new PlcRuntime(null, { manualClock: true });
    const res = plc.load(solutionProject(lab));
    if (!res.ok) throw new Error('Lời giải không biên dịch được: ' + JSON.stringify(res.errors));
    plc.attach(m);
    plc.start();
    const events = [];
    let k = 0;
    const tags = m.def.ioMap.outputs.map((o) => o.tag);
    let last = Object.fromEntries(tags.map((t) => [t, m.outputs[t]]));
    const step = m.step.bind(m);
    m.step = (dt, t) => {
      const d = {};
      for (const tg of tags) if (m.outputs[tg] !== last[tg]) { d[tg] = m.outputs[tg]; last[tg] = m.outputs[tg]; }
      if (Object.keys(d).length) events.push([k, 'o', d]);
      step(dt, t); k++;
    };
    const press = m.press.bind(m);
    m.press = (id, down) => { events.push([k, 'p', id, !!down]); press(id, down); };
    const s = {
      run: async (ms) => plc.runFor(ms),
      press: async (id, ms = 200) => { m.press(id, true); plc.runFor(ms); m.press(id, false); },
      hold: (id, on) => m.press(id, on),
      note: (vi, en) => events.push([k, 'n', N(vi, en)]),
    };
    const g = lab.grading;
    await (SCRIPTS[lab.id] || generic(Math.min(g.runMs || 45000, 60000)))(s);
    plc.stop();
    plc.runFor(1); // ghi lại việc tắt đầu ra khi STOP
    const trace = { v: 1, lab: lab.id, machineId: lab.machineId, seed, stepMs: plc.opts.physicsStepMs, durMs: k * plc.opts.physicsStepMs, events };
    return { trace, m };
  } finally { Math.random = orig; }
}

/* ---------- Kiểm tra phát lại ---------- */
function verify(trace, ref) {
  const p = new DemoPlayer(trace);
  while (!p.done) p.advance(1000);
  const a = JSON.stringify({ s: p.m.stats, i: p.m.inputs, n: p.m.items.length, t: p.m.time });
  const b = JSON.stringify({ s: ref.stats, i: ref.inputs, n: ref.items.length, t: ref.time });
  return a === b ? null : `phát lại lệch:\n  ghi : ${b}\n  phát: ${a}`;
}

const only = process.argv.slice(2);
let bad = 0;
const index = {};
for (const lab of LABS) {
  if (only.length && !only.includes(lab.id)) continue;
  if (!solutionProject(lab)) { console.log('bỏ qua', lab.id, '(chưa có lời giải)'); continue; }
  const { trace, m } = await record(lab);
  const err = verify(trace, m);
  if (err) { bad++; console.log('FAIL', lab.id, err); continue; }
  writeFileSync(new URL(`${lab.id}.json`, OUT), JSON.stringify(trace));
  index[lab.id] = { durMs: trace.durMs };
  console.log('ok  ', lab.id.padEnd(5), `${(trace.durMs / 1000).toFixed(0)} s`, `${trace.events.length} sự kiện`, `sản phẩm: ${m.stats.produced}`, m.stats.crashes ? `VA CHẠM: ${m.stats.crashes}` : '');
}
if (!only.length) writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1) + '\n');
process.exit(bad ? 1 : 0);

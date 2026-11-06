// A2 — Hệ phân phối thùng 3 làn (Lab L09, L13)
import { Machine, Cylinder, Drive, advanceLine, beam, newId } from '../kit.js';

const L = 300, W = 200, H = 200, Z = 800, BELT_LEN = 3000;
const LANES = [900, 1700, 2500];           // tâm X các bàn gạt / làn
const READER = 300, PUSH = 420, PLATE = 350;
const LANE_LEN = 1200, LANE_CAP = 4;
const COLORS = { 1: '#D9534F', 2: '#2E86DE', 3: '#27AE60', 0: '#8A8F98' };

export class Diverter extends Machine {
  constructor() {
    super({
      id: 'diverter',
      title: 'Hệ phân phối thùng 3 làn',
      summary: 'Băng tải chính chạy biến tần; đầu đọc mã xác định làn đích; ba xi lanh gạt đẩy thùng vào 3 làn trượt. Thùng không gạt đi ra làn loại ở cuối băng.',
      labs: ['L09', 'L13'],
      cpu: '1215C',
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'B0', desc: 'Thùng vào băng tải (quang)' },
          { addr: '%I0.6', tag: 'B1', desc: 'Thùng ở trước bàn gạt 1' },
          { addr: '%I0.7', tag: 'B2', desc: 'Thùng ở trước bàn gạt 2' },
          { addr: '%I1.0', tag: 'B3', desc: 'Thùng ở trước bàn gạt 3' },
          { addr: '%I1.1', tag: 'L1F', desc: 'Làn 1 đầy' },
          { addr: '%I1.2', tag: 'L2F', desc: 'Làn 2 đầy' },
          { addr: '%I1.3', tag: 'L3F', desc: 'Làn 3 đầy' },
          { addr: '%I1.4', tag: 'CodeValid', desc: 'Đầu đọc đang thấy mã hợp lệ' },
          { addr: '%I2.0', tag: '1B1', desc: 'Gạt 1 lùi' },
          { addr: '%I2.1', tag: '1B2', desc: 'Gạt 1 ra' },
          { addr: '%I2.2', tag: '2B1', desc: 'Gạt 2 lùi' },
          { addr: '%I2.3', tag: '2B2', desc: 'Gạt 2 ra' },
          { addr: '%I2.4', tag: '3B1', desc: 'Gạt 3 lùi' },
          { addr: '%I2.5', tag: '3B2', desc: 'Gạt 3 ra' },
          { addr: '%IW68', tag: 'Code', type: 'Int', desc: 'Mã sản phẩm đọc được: 1, 2, 3 (0 = không đọc được)' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: '1Y1', desc: 'Van gạt 1 (đơn cuộn)' },
          { addr: '%Q0.3', tag: '2Y1', desc: 'Van gạt 2' },
          { addr: '%Q0.4', tag: '3Y1', desc: 'Van gạt 3' },
          { addr: '%Q0.5', tag: 'M1_Run', desc: 'Lệnh chạy biến tần băng tải chính' },
          { addr: '%QW80', tag: 'M1_Speed', type: 'Int', desc: 'Tốc độ đặt biến tần 0..27648 (= 0..100 %, 100 % = 0,5 m/s)' },
        ],
      },
      buttons: [
        { id: 'Feed', label: 'Bật/tắt cấp thùng', kind: 'latching', color: 'grey' },
        { id: 'Clear', label: 'Dọn các làn', kind: 'momentary', color: 'grey', action: 'clear' },
      ],
      faults: [
        ...Machine.cylFaults(['1A', '2A', '3A']),
        { id: 'badRead', label: 'Nhãn mờ: 20 % thùng không đọc được mã' },
        { id: 'laneBlocked', label: 'Làn 2 bị chặn (không ai lấy thùng)' },
        { id: 'vfdTrip', label: 'Biến tần báo lỗi quá dòng (F07801)' },
      ],
    });
    this.cyl = {};
    for (const n of ['1A', '2A', '3A']) this.cyl[n] = new Cylinder(n, { stroke: PUSH, tOut: 550, tIn: 450 });
    this.drives = { main: new Drive({ speed: 500, rampMs: 800 }) };
    this.panel.Feed = true;
    this.init();
  }

  init() {
    this.spawnT = 0; this.lanes = [[], [], []]; this.laneT = [0, 0, 0];
    this.stats.lane = [0, 0, 0]; this.stats.wrongLane = 0;
    this.drives.main.fault.trip = !!this.faults.vfdTrip;
  }
  applyFault(id, on) { super.applyFault(id, on); if (id === 'vfdTrip') this.drives.main.fault.trip = on; }
  action(a) { if (a === 'clear') { this.lanes = [[], [], []]; this.log('Đã dọn các làn', 'info'); } }

  physics(dt) {
    const keys = ['1A', '2A', '3A'];
    // Cấp thùng
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.onBelt && it.x - L / 2 < 850)) {   // khoảng cách tối thiểu giữa các thùng
      const code = 1 + Math.floor(Math.random() * 3);
      const unreadable = this.faults.badRead && Math.random() < 0.2;
      this.items.push({ id: newId('box'), kind: 'box', x: -L / 2 + 5, y: 0, z: Z, len: L, size: [L, W, H], code, unreadable, onBelt: true, color: COLORS[code], label: String(code) });
      this.spawnT = 1800 + Math.random() * 1400;
    }
    // Băng tải chính (biến tần)
    const ratio = Math.max(0, Math.min(27648, this.outputs.M1_Speed || 0)) / 27648;
    const dx = this.drives.main.step(dt, this.act('M1_Run'), ratio);
    const belt = this.items.filter((it) => it.onBelt);
    // thùng đang bị gạt (y > 0) không chạy theo băng
    advanceLine(belt.filter((it) => it.y < 40), dx, () => Infinity);

    // Bàn gạt
    keys.forEach((k, i) => {
      const lx = LANES[i];
      const c = this.stepCyl(k, this.act(`${i + 1}Y1`), false, (np, op) => {
        // làn đầy: thùng ở đầu làn chặn đường gạt
        if (np > op && this.lanes[i].length >= LANE_CAP + 1) {
          const target = this.items.find((it) => it.onBelt && Math.abs(it.x - lx) < (PLATE + L) / 2 && it.y > 0);
          if (target && np * PUSH > 250) return Math.min(np, 250 / PUSH);
        }
        return np;
      });
      const face = -215 + c.pos * PUSH;   // mặt bàn gạt theo Y: -215 → 205
      for (const it of belt) {
        if (Math.abs(it.x - lx) < (PLATE + L) / 2 - 20 && it.y - W / 2 < face) {
          const overlap = Math.abs(it.x - lx);
          if (!it.pushed) {
            it.pushed = i + 1;
            if (overlap > 90) { it.crooked = true; it.rotZ = (it.x > lx ? 1 : -1) * 15; this.stats.defects++; this.log(`Gạt ${i + 1} đẩy lệch tâm thùng (${Math.round(overlap)} mm)`, 'warn'); }
          }
          it.y = face + W / 2;
        }
      }
      if (c.moving && c.vel < 0) { /* lùi */ }
    });
    // Thùng rời băng vào làn
    for (const it of belt) {
      if (it.y >= 290) {
        it.onBelt = false;
        const i = it.pushed - 1;
        it.lane = i;
        this.lanes[i].push(it);
        this.stats.lane[i]++;
        const correct = !it.unreadable && it.code === i + 1;
        if (!correct) { this.stats.wrongLane++; this.log(`Thùng mã ${it.unreadable ? '?' : it.code} vào làn ${i + 1} — sai làn`, 'warn'); }
        else this.produced(true);
      }
      if (it.x - L / 2 > BELT_LEN) {
        // ra làn loại cuối băng
        this.items = this.items.filter((x) => x !== it);
        this.stats.rejected++;
        if (!it.unreadable) this.log(`Thùng mã ${it.code} không được gạt, đi ra làn loại`, 'warn');
      }
    }
    // Thùng trong làn: trượt theo +Y và tích lũy, người vận hành lấy bớt
    this.lanes.forEach((lane, i) => {
      let backY = 1445 - W / 2;
      lane.sort((a, b) => b.y - a.y);
      for (const it of lane) {
        it.x += (LANES[i] - it.x) * Math.min(1, dt / 200);
        it.y = Math.min(it.y + (0.4 * dt), backY);
        backY = it.y - W - 5;
      }
      const blocked = this.faults.laneBlocked && i === 1;
      if (lane.length && !blocked) {
        this.laneT[i] += dt;
        if (this.laneT[i] > 5000) { const it = lane.shift(); this.items = this.items.filter((x) => x !== it); this.laneT[i] = 0; }
      } else this.laneT[i] = 0;
    });

    // Cảm biến
    this.inputs.B0 = beam(belt, 150);
    LANES.forEach((lx, i) => { this.inputs['B' + (i + 1)] = belt.some((it) => it.y < 40 && Math.abs(it.x - lx) < 30); });
    this.lanes.forEach((lane, i) => { this.inputs[`L${i + 1}F`] = lane.length >= LANE_CAP; });
    const atReader = belt.find((it) => Math.abs(it.x - READER) < 60);
    this.inputs.CodeValid = !!atReader && !atReader.unreadable;
    this.inputs.Code = atReader ? (atReader.unreadable ? 0 : atReader.code) : 0;
  }

  getVisual() {
    const v = super.getVisual();
    v.belts = { belt_main: this.drives.main.offset };
    v.drive = { speedPct: (this.drives.main.v / this.drives.main.nominal) * 100, fault: this.drives.main.fault.trip ? 'F07801' : null };
    return v;
  }
}

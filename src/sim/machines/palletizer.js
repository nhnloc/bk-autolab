// B4 — Máy xếp pallet khí nén đơn giản (đồ án)
import { Machine, Cylinder, Drive, advanceLine, beam, newId, clamp } from '../kit.js';

const B = [400, 300, 200], Z = 800, STOP_X = 1400;
const PUSH_REST = -150, PUSH = 650, WALL_Y = 1100, PLATE_Y0 = 500;
const LIFT_TRAVEL = 630, PALLET_TOP0 = 150, LIFT_SPEED = 0.15;   // mm/ms
const LAYERS = 3, PALLET_OUT = 1500;

export class Palletizer extends Machine {
  constructor() {
    super({
      id: 'palletizer',
      title: 'Máy xếp pallet khí nén',
      summary: 'Gom 2 thùng thành hàng, đẩy 2 hàng lên tấm đỡ thành lớp 2×2, mở tấm đỡ thả lớp xuống pallet trên bàn nâng. Đủ 3 lớp thì hạ bàn và đưa pallet ra.',
      labs: ['L18'],
      cpu: '1215C',
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'BIn', desc: 'Thùng vào băng tải' },
          { addr: '%I0.6', tag: 'RowFull', desc: 'Đủ 2 thùng tại chặn (hàng sẵn sàng)' },
          { addr: '%I0.7', tag: '1B1', desc: 'Chặn 1A hạ' },
          { addr: '%I1.0', tag: '1B2', desc: 'Chặn 1A nâng' },
          { addr: '%I1.1', tag: '2B1', desc: 'Tấm đẩy hàng 2A lùi' },
          { addr: '%I1.2', tag: '2B2', desc: 'Tấm đẩy hàng 2A ra' },
          { addr: '%I1.3', tag: '3B1', desc: 'Tấm đỡ lớp 3A đóng' },
          { addr: '%I1.4', tag: '3B2', desc: 'Tấm đỡ lớp 3A mở' },
          { addr: '%I1.5', tag: 'LiftTop', desc: 'Bàn nâng chạm giới hạn trên' },
          { addr: '%I2.0', tag: 'LiftBottom', desc: 'Bàn nâng chạm giới hạn dưới' },
          { addr: '%I2.1', tag: 'LayerLvl', desc: 'Đỉnh chồng hàng ngay dưới tấm đỡ (sẵn sàng nhận lớp)' },
          { addr: '%I2.2', tag: 'PalletIn', desc: 'Có pallet trên bàn nâng' },
          { addr: '%I2.3', tag: 'PalletOut', desc: 'Pallet đã ra tới cuối băng ra' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'M1', desc: 'Băng tải thùng vào' },
          { addr: '%Q0.3', tag: '1Y1', desc: 'Nâng chặn 1A' },
          { addr: '%Q0.4', tag: '2Y1', desc: 'Đẩy hàng 2A' },
          { addr: '%Q0.5', tag: '3Y1', desc: 'Mở tấm đỡ lớp 3A' },
          { addr: '%Q0.6', tag: 'M2_Up', desc: 'Bàn nâng đi lên' },
          { addr: '%Q0.7', tag: 'M2_Down', desc: 'Bàn nâng đi xuống' },
          { addr: '%Q1.0', tag: 'M3', desc: 'Con lăn pallet đưa pallet ra (chỉ khi bàn ở dưới)' },
        ],
      },
      buttons: [{ id: 'Feed', label: 'Bật/tắt cấp thùng', kind: 'latching', color: 'grey' }],
      faults: [...Machine.cylFaults(['1A', '2A', '3A']), { id: 'liftSensor', label: 'Cảm biến LayerLvl bị bẩn (luôn = 0)' }],
    });
    this.cyl = {
      '1A': new Cylinder('1A', { stroke: 40, tOut: 200, tIn: 200 }),
      '2A': new Cylinder('2A', { stroke: PUSH, tOut: 1400, tIn: 1000 }),
      '3A': new Cylinder('3A', { stroke: 450, tOut: 700, tIn: 700 }),
    };
    this.drives = { in: new Drive({ speed: 300 }), pallet: new Drive({ speed: 300 }) };
    this.panel.Feed = true;
    this.init();
  }

  init() {
    this.spawnT = 0; this.lift = 0; this.pallet = { x: 0, present: true, layers: [] };
    this.rows = []; this.newPalletT = 0;
  }

  get palletTop() { return PALLET_TOP0 + this.lift * LIFT_TRAVEL; }
  get stackTop() { return this.palletTop + this.pallet.layers.length * B[2]; }

  physics(dt) {
    const c1 = this.stepCyl('1A', this.act('1Y1'), false, (np, op) => {
      if (np > op && np > 0.15 && this.items.some((it) => it.onBelt && Math.abs(it.x - STOP_X) < B[0] / 2 - 5)) return Math.min(np, 0.15);
      return np;
    });
    const c3 = this.stepCyl('3A', this.act('3Y1'), false, (np, op) => {
      if (np < op && np < 0.5 && this.pallet.present && this.pallet.x < 5 && this.stackTop > Z + 5) { this.crash('Đóng tấm đỡ lớp đè lên chồng hàng (chưa hạ bàn nâng)'); return op; }
      return np;
    });
    const c2 = this.stepCyl('2A', this.act('2Y1'), false, (np, op) => {
      if (np > op && c3.pos > 0.05 && np > 0.4) { this.crash('Đẩy hàng lên khi tấm đỡ lớp đang mở'); return op; }
      // hàng phía trước chạm tường
      const face = PUSH_REST + np * PUSH;
      const backRows = this.rows.length;
      const maxFace = WALL_Y - backRows * B[1];
      if (np > op && face > maxFace + 2 && backRows >= 2) { this.crash('Đẩy hàng khi tấm đỡ đã đủ 2 hàng'); return op; }
      return np;
    });

    // Cấp thùng
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.onBelt && it.x - B[0] / 2 < 30)) {
      this.items.push({ id: newId('box'), kind: 'box', x: -B[0] / 2 + 5, y: 0, z: Z, len: B[0], size: B.slice(), color: '#B98A55', onBelt: true });
      this.spawnT = 2200 + Math.random() * 1200;
    }
    const dIn = this.drives.in.step(dt, this.act('M1'));
    const belt = this.items.filter((it) => it.onBelt && it.y < 10);
    advanceLine(belt, dIn, (it) => (c1.pos > 0.5 ? STOP_X : Infinity));
    for (const it of belt) if (it.x - B[0] / 2 > 1500) { this.items = this.items.filter((x) => x !== it); this.stats.rejected++; this.log('Thùng chạy quá đầu băng tải (chặn chưa nâng)', 'warn'); }

    // Đẩy hàng
    const face = PUSH_REST + c2.pos * PUSH;
    const pushables = this.items.filter((it) => (it.onBelt && it.x > STOP_X - 2 * B[0] - 5) || it.onPlate);
    for (const it of pushables) if (it.y - B[1] / 2 < face) it.y = face + B[1] / 2;
    for (const it of this.items) if (it.onBelt && it.y > 300) { it.onBelt = false; it.onPlate = true; }
    // Gom các hàng trên tấm đỡ, hàng trước bị đẩy về phía tường
    const plateBoxes = this.items.filter((it) => it.onPlate);
    const rowsY = [...new Set(plateBoxes.map((b) => Math.round(b.y / 20) * 20))].sort((a, b) => b - a);
    this.rows = rowsY;
    plateBoxes.sort((a, b) => b.y - a.y);
    for (let i = 0; i < plateBoxes.length; i++) {
      const it = plateBoxes[i];
      const ahead = plateBoxes.filter((o) => o.y > it.y + 1 && Math.abs(o.x - it.x) < B[0] / 2);
      const limitY = ahead.length ? Math.min(...ahead.map((o) => o.y)) - B[1] : WALL_Y - B[1] / 2;
      if (it.y > limitY) { for (const o of ahead) o.y = Math.min(WALL_Y - B[1] / 2, o.y + (it.y - limitY)); }
      it.y = Math.min(it.y, WALL_Y - B[1] / 2);
    }

    // Mở tấm đỡ: lớp rơi xuống pallet
    if (c3.pos > 0.9 && plateBoxes.length) {
      const drop = Z - this.stackTop;
      const layer = plateBoxes.map((b) => ({ ...b }));
      this.items = this.items.filter((it) => !it.onPlate);
      if (!this.pallet.present) { this.stats.defects += layer.length; this.log('Thả lớp khi không có pallet — hàng rơi xuống sàn', 'error'); }
      else {
        if (drop > 150) { this.stats.defects++; this.log(`Thả lớp từ độ cao ${Math.round(drop)} mm — hàng bị va đập (bàn nâng chưa lên đúng mức)`, 'warn'); }
        if (plateBoxes.length !== 4) this.log(`Lớp chỉ có ${plateBoxes.length}/4 thùng`, 'warn');
        this.pallet.layers.push(layer.map((b) => ({ ...b, onPlate: false, layerDx: b.x - 1000, layerDy: b.y - 800 })));
      }
    }

    // Bàn nâng
    const up = this.act('M2_Up'), down = this.act('M2_Down');
    if (up && down) this.crash('Lệnh lên và xuống bàn nâng cùng lúc');
    else if (up) {
      const nl = Math.min(1, this.lift + (LIFT_SPEED * dt) / LIFT_TRAVEL);
      const top = PALLET_TOP0 + nl * LIFT_TRAVEL + this.pallet.layers.length * B[2];
      if (this.pallet.present && top > Z - 5 && c3.pos < 0.5) { this.crash('Bàn nâng ép chồng hàng vào tấm đỡ lớp'); }
      else this.lift = nl;
    } else if (down) this.lift = Math.max(0, this.lift - (LIFT_SPEED * dt) / LIFT_TRAVEL);

    // Pallet ra
    const dP = this.drives.pallet.step(dt, this.act('M3'));
    if (dP > 0 && this.pallet.present) {
      if (this.lift > 0.01) { this.crash('Chạy con lăn pallet khi bàn nâng chưa xuống đáy'); }
      else this.pallet.x += dP;
    }
    if (this.pallet.present && this.pallet.x >= PALLET_OUT) {
      this.newPalletT += dt;
      if (this.newPalletT > 2000) {
        const full = this.pallet.layers.length >= LAYERS;
        if (full) this.produced(true); else { this.stats.rejected++; this.log(`Pallet ra khi mới có ${this.pallet.layers.length}/${LAYERS} lớp`, 'warn'); }
        this.pallet = { x: 0, present: false, layers: [] }; this.newPalletT = 0; this._palletArrive = 3000;
      }
    }
    if (!this.pallet.present && this._palletArrive > 0) { this._palletArrive -= dt; if (this._palletArrive <= 0 && this.lift < 0.01) this.pallet = { x: 0, present: true, layers: [] }; }

    const st = this.stackTop;
    this.inputs.BIn = beam(belt, 150);
    this.inputs.RowFull = belt.filter((it) => it.x > STOP_X - 2 * B[0] - 10).length >= 2 && belt.some((it) => Math.abs(it.x + B[0] / 2 - STOP_X) < 5);
    this.inputs.LiftTop = this.lift >= 0.995;
    this.inputs.LiftBottom = this.lift <= 0.005;
    this.inputs.LayerLvl = !this.faults.liftSensor && this.pallet.present && this.pallet.x < 5 && st >= 760 && st <= Z;
    this.inputs.PalletIn = this.pallet.present && this.pallet.x < 5;
    this.inputs.PalletOut = this.pallet.present && this.pallet.x >= PALLET_OUT;
  }

  visualParts() {
    const p = this.visualBase();
    p.plate_3A_L = this.cyl['3A'].pos;
    p.plate_3A_R = this.cyl['3A'].pos;
    p.lift = this.lift;
    p.pallet = this.pallet.present ? clamp(this.pallet.x / PALLET_OUT) : 1;
    p.pallet_visible = this.pallet.present ? 1 : 0;
    return p;
  }

  getVisual() {
    const v = super.getVisual();
    const pt = this.palletTop;
    this.pallet.layers.forEach((layer, li) => layer.forEach((b) => v.items.push({ ...b, x: 1000 + this.pallet.x + b.layerDx, y: 800 + b.layerDy, z: pt + li * B[2] })));
    v.belts = { belt_in: this.drives.in.offset };
    return v;
  }
}

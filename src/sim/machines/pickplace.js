// A5 — Trạm gắp–đặt 2 trục khí nén (Lab L11)
import { Machine, Cylinder, Drive, advanceLine, beam, newId } from '../kit.js';

const PROD = [70, 70, 60], Z = 800, TRAY_Z = 760;
const PICK_X = 800, PLACE_X = 1300, X_TRAVEL = 500, Z_TRAVEL = 150;
const CELLS = 6, CELL_PITCH = 80, TRAY = [120, CELLS * CELL_PITCH + 40, 80];   // khay chạy theo trục Y

export class PickPlace extends Machine {
  constructor() {
    super({
      id: 'pickplace',
      title: 'Trạm gắp–đặt 2 trục khí nén',
      summary: 'Trục X là xi lanh không cần (van 5/3 tâm kín), trục Z là xi lanh dẫn hướng có giác hút. Gắp sản phẩm ở cuối băng tải vào và đặt vào khay 6 ô trên băng tải ra.',
      labs: ['L11'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: '1B1', desc: 'Trục X tại vị trí gắp' },
          { addr: '%I0.6', tag: '1B2', desc: 'Trục X tại vị trí đặt' },
          { addr: '%I0.7', tag: '2B1', desc: 'Trục Z ở trên' },
          { addr: '%I1.0', tag: '2B2', desc: 'Trục Z ở dưới' },
          { addr: '%I1.1', tag: 'VacOK', desc: 'Đã hút được sản phẩm' },
          { addr: '%I1.2', tag: 'PartAtPick', desc: 'Có sản phẩm ở vị trí gắp' },
          { addr: '%I1.3', tag: 'BoxAtPlace', desc: 'Có khay dưới vị trí đặt' },
          { addr: '%I1.4', tag: 'BoxStep', desc: 'Một ô trống của khay thẳng hàng vị trí đặt' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: '1Y1', desc: 'Van 5/3: trục X sang vị trí đặt' },
          { addr: '%Q0.3', tag: '1Y2', desc: 'Van 5/3: trục X về vị trí gắp (cả hai = 0: dừng giữa)' },
          { addr: '%Q0.4', tag: '2Y1', desc: 'Trục Z xuống (đơn cuộn)' },
          { addr: '%Q0.5', tag: 'VAC', desc: 'Hút chân không' },
          { addr: '%Q0.6', tag: 'Blow', desc: 'Thổi nhả sản phẩm' },
          { addr: '%Q0.7', tag: 'M1', desc: 'Băng tải sản phẩm vào' },
          { addr: '%Q1.0', tag: 'M2', desc: 'Băng tải khay ra' },
        ],
      },
      buttons: [{ id: 'Feed', label: 'Bật/tắt cấp sản phẩm', kind: 'latching', color: 'grey' }],
      faults: [...Machine.cylFaults(['1A', '2A']), { id: 'vacWeak', label: 'Chân không yếu: sản phẩm rơi khi di chuyển nhanh' }],
    });
    this.cyl = {
      '1A': Object.assign(new Cylinder('1A', { stroke: X_TRAVEL, tOut: 800, tIn: 800, valve: '53c' }), { node: 'slide_1A' }),
      '2A': new Cylinder('2A', { stroke: Z_TRAVEL, tOut: 350, tIn: 300 }),
    };
    this.drives = { in: new Drive({ speed: 200 }), out: new Drive({ speed: 120, rampMs: 80 }) };
    this.panel.Feed = true;
    this.init();
  }

  init() { this.spawnT = 0; this.held = null; this.vacT = 0; this.trays = [this.newTray(-250)]; }
  newTray(y) { return { id: newId('tray'), kind: 'tray', x: PLACE_X, y, z: TRAY_Z, len: TRAY[1], size: TRAY.slice(), color: '#3B4A5A', cells: Array(CELLS).fill(null) }; }
  cellY(t, i) { return t.y - TRAY[1] / 2 + 20 + CELL_PITCH / 2 + i * CELL_PITCH; }

  physics(dt) {
    const prevX = this.cyl['1A'].pos;
    const cz = this.stepCyl('2A', this.act('2Y1'), false, (np) => {
      // Z hạ xuống chạm sản phẩm / khay
      if (this.cyl['1A'].pos > 0.02 && this.cyl['1A'].pos < 0.98 && np > 0.3) { this.crash('Hạ trục Z khi trục X đang ở giữa hành trình'); return Math.min(np, 0.3); }
      return np;
    });
    const cx = this.stepCyl('1A', this.act('1Y1'), this.act('1Y2'), (np, op) => {
      if (np !== op && cz.pos > 0.25) { this.crash('Di chuyển trục X khi trục Z chưa lên hết — giác hút va vào băng tải/khay'); return op; }
      return np;
    });

    // Sản phẩm vào
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.kind === 'product' && it.x - PROD[0] / 2 < 30 && !it.held)) {
      this.items.push({ id: newId('p'), kind: 'product', x: -PROD[0] / 2 + 5, y: 0, z: Z, len: PROD[0], size: PROD.slice(), color: '#F2C200' });
      this.spawnT = 2500;
    }
    const dIn = this.drives.in.step(dt, this.act('M1'));
    const onIn = this.items.filter((it) => it.kind === 'product' && !it.held && !it.placed);
    advanceLine(onIn, dIn, () => PICK_X + PROD[0] / 2);
    const atPick = onIn.find((it) => Math.abs(it.x - PICK_X) < 5);

    // Chân không
    const vac = this.act('VAC') && this.air;
    const blow = this.act('Blow') && this.air;
    if (!this.held && vac && cz.pos > 0.97 && cx.pos < 0.02 && atPick) {
      this.vacT += dt;
      if (this.vacT > 120) { this.held = atPick; atPick.held = true; }
    } else if (!this.held) this.vacT = 0;
    if (this.held && this.faults.vacWeak && Math.abs(cx.vel) > 0 && Math.random() < dt / 600) { this.drop('Chân không yếu — sản phẩm rơi khi di chuyển'); }
    if (this.held && (!vac || blow)) this.release(cz, cx);
    if (this.held) {
      this.held.x = PICK_X + cx.pos * X_TRAVEL;
      this.held.z = Z + (1 - cz.pos) * Z_TRAVEL + (cx.pos > 0.98 ? 0 : 0);
    }

    // Khay trên băng tải ra (chạy theo +Y)
    const dOut = this.drives.out.step(dt, this.act('M2'));
    for (const t of this.trays) t.y += dOut;
    const tray = this.trays.find((t) => Math.abs(t.y) < TRAY[1] / 2);
    for (const t of this.trays) for (const p of t.cells) if (p) { p.y = this.cellY(t, t.cells.indexOf(p)); }
    // Khay đi hết → khay mới
    for (const t of [...this.trays]) {
      if (t.y - TRAY[1] / 2 > 600) {
        this.trays = this.trays.filter((x) => x !== t);
        const n = t.cells.filter(Boolean).length;
        this.items = this.items.filter((it) => !t.cells.includes(it));
        if (n === CELLS) this.produced(t.cells.every((p) => p.ok !== false)); else if (n > 0) { this.stats.rejected++; this.log(`Khay ra khi mới có ${n}/${CELLS} sản phẩm`, 'warn'); }
      }
    }
    const minY = Math.min(...this.trays.map((t) => t.y), 0);
    if (!this.trays.some((t) => t.y < -TRAY[1])) this.trays.push(this.newTray(minY - TRAY[1] - 120));

    const alignedCell = tray ? tray.cells.findIndex((p, i) => !p && Math.abs(this.cellY(tray, i)) < 10) : -1;
    this.inputs.VacOK = !!this.held;
    this.inputs.PartAtPick = !!atPick;
    this.inputs.BoxAtPlace = !!tray;
    this.inputs.BoxStep = alignedCell >= 0;
  }

  drop(msg) {
    const p = this.held; this.held = null; p.held = false; p.dropped = true; p.ok = false;
    this.items = this.items.filter((x) => x !== p); this.stats.defects++; this.log(msg, 'warn');
  }

  release(cz, cx) {
    const p = this.held;
    this.held = null; p.held = false;
    if (cx.pos > 0.98) {
      const tray = this.trays.find((t) => Math.abs(t.y) < TRAY[1] / 2);
      const idx = tray ? tray.cells.findIndex((q, i) => Math.abs(this.cellY(tray, i)) < 20) : -1;
      if (tray && idx >= 0 && !tray.cells[idx]) {
        tray.cells[idx] = p; p.placed = true; p.x = PLACE_X; p.z = TRAY_Z + 10; p.y = this.cellY(tray, idx);
        if (cz.pos < 0.9) { p.ok = false; this.stats.defects++; this.log('Nhả sản phẩm khi trục Z chưa hạ hết — sản phẩm rơi vào khay', 'warn'); }
        return;
      }
      p.ok = false; this.items = this.items.filter((x) => x !== p); this.stats.defects++;
      this.log(tray ? (idx >= 0 ? 'Đặt sản phẩm vào ô đã có hàng' : 'Đặt sản phẩm lệch ô khay') : 'Nhả sản phẩm khi không có khay', 'warn');
      return;
    }
    if (cx.pos < 0.02 && cz.pos > 0.97) { p.x = PICK_X; p.z = Z; return; }   // nhả lại tại chỗ gắp
    this.items = this.items.filter((x) => x !== p); this.stats.defects++; this.log('Nhả sản phẩm giữa hành trình — sản phẩm rơi', 'warn');
  }

  getVisual() {
    const v = super.getVisual();
    v.items.push(...this.trays.map((t) => ({ ...t, cells: undefined, filled: t.cells.filter(Boolean).length })));
    v.belts = { belt_in: this.drives.in.offset, belt_out: this.drives.out.offset };
    return v;
  }
}

// L04 — Băng tải đếm sản phẩm vào thùng (12 lon/thùng)
import { Machine, Drive, advanceLine, beam, newId } from '../kit.js';

const CAN = [66, 66, 120], Z = 800, END = 1500, BOX = [300, 200, 200], BOX_Z = 450, BOX_X = 1600, PITCH = 500, PER_BOX = 12;

export class Counter extends Machine {
  constructor() {
    super({
      id: 'counter',
      title: 'Băng tải đếm sản phẩm vào thùng',
      summary: 'Lon nước chạy trên băng tải và rơi qua máng vào thùng carton đặt trên băng tải thùng. Đếm đủ 12 lon thì đổi thùng; bảng LED hiển thị số đếm.',
      labs: ['L04'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'B1', desc: 'Cảm biến quang trong máng: xung khi một lon rơi vào thùng' },
          { addr: '%I0.6', tag: 'B2', desc: 'Có thùng đúng vị trí dưới máng' },
          { addr: '%I0.7', tag: 'B3', desc: 'Sản phẩm vào đầu băng tải' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'M1', desc: 'Băng tải sản phẩm' },
          { addr: '%Q0.3', tag: 'M2', desc: 'Băng tải thùng' },
          { addr: '%Q0.4', tag: 'H_Full', desc: 'Đèn báo thùng đầy' },
          { addr: '%QW80', tag: 'Display', type: 'Int', desc: 'Số hiển thị trên bảng LED' },
        ],
      },
      buttons: [{ id: 'Feed', label: 'Bật/tắt cấp sản phẩm', kind: 'latching', color: 'grey' }],
      faults: [
        { id: 'b1Flicker', label: 'Cảm biến B1 rung (đếm 2 lần một sản phẩm)' },
        { id: 'noBox', label: 'Hết thùng rỗng' },
      ],
      panelDefaults: { Feed: true },
    });
    this.drives = { belt: new Drive({ speed: 220, rampMs: 150 }), box: new Drive({ speed: 160, rampMs: 120 }) };
    this.init();
  }

  init() {
    this.spawnT = 0; this.boxes = [];
    for (let i = 0; i < 3; i++) this.boxes.push(this.newBox(-i * PITCH));
    this.stats.boxes = 0; this.stats.cans = 0; this.flick = 0;
  }
  newBox(y) { return { id: newId('box'), kind: 'carton', x: BOX_X, y, z: BOX_Z, len: BOX[1], size: BOX.slice(), color: '#C49A6C', count: 0, ok: true,
    fold: { open: 1, minorFront: 1, minorRear: 1, major: 1, taped: true, topMinor: 0, topMajor: 0 } }; }

  physics(dt) {
    // Cấp lon
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.x - CAN[0] / 2 < 120)) {
      this.items.push({ id: newId('can'), kind: 'product', shape: 'can', x: -CAN[0] / 2 + 2, y: 0, z: Z, len: CAN[0], size: CAN.slice(), color: ['#d32f2f', '#1e88e5', '#43a047'][Math.floor(Math.random() * 3)] });
      this.spawnT = 700 + Math.random() * 700;
    }
    const dx = this.drives.belt.step(dt, this.act('M1'));
    advanceLine(this.items, dx, () => Infinity);
    // Lon rơi qua máng
    for (const it of [...this.items]) {
      if (it.x - CAN[0] / 2 > END) {
        this.items = this.items.filter((x) => x !== it);
        this.dropPulse = 80;   // lon rơi qua tia cảm biến B1 đặt trong máng
        const box = this.boxes.find((b) => Math.abs(b.y) < 80);
        if (box) { box.count++; this.stats.cans++; if (box.count > PER_BOX && box.ok) { box.ok = false; this.log(`Thùng bị bỏ quá ${PER_BOX} lon`, 'warn'); } }
        else { this.stats.defects++; this.log('Lon rơi xuống sàn — không có thùng dưới máng', 'warn'); }
      }
    }
    // Băng tải thùng (chạy theo +Y)
    const dy = this.faults.noBox && !this.boxes.some((b) => b.y > -300) ? 0 : this.drives.box.step(dt, this.act('M2'));
    for (const b of this.boxes) b.y += dy;
    for (const b of [...this.boxes]) {
      if (b.y > 450) {
        this.boxes = this.boxes.filter((x) => x !== b);
        this.stats.boxes++;
        if (b.count === PER_BOX && b.ok) this.produced(true);
        else if (b.count > 0) { this.stats.rejected++; if (b.count < PER_BOX) this.log(`Thùng ra khi mới có ${b.count}/${PER_BOX} lon`, 'warn'); }
      }
    }
    const minY = Math.min(...this.boxes.map((b) => b.y), 0);
    if (!this.faults.noBox && this.boxes.length < 3) this.boxes.push(this.newBox(minY - PITCH));
    // Cảm biến
    this.dropPulse = Math.max(0, (this.dropPulse || 0) - dt);
    const b1 = this.dropPulse > 0;
    if (this.faults.b1Flicker && b1) { this.flick = (this.flick + dt) % 80; this.inputs.B1 = this.flick < 40; } else this.inputs.B1 = b1;
    this.inputs.B2 = this.boxes.some((b) => Math.abs(b.y) < 12);
    this.inputs.B3 = beam(this.items, 100);
  }

  getVisual() {
    const v = super.getVisual();
    for (const b of this.boxes) {
      v.items.push({ ...b, filled: b.count });
      const n = Math.min(b.count, PER_BOX);
      for (let i = 0; i < n; i++) v.items.push({ id: `${b.id}c${i}`, kind: 'product', shape: 'can', x: BOX_X - 100 + (i % 4) * 66, y: b.y - 66 + Math.floor(i / 4) * 66, z: BOX_Z + 10, size: CAN, color: '#9e9e9e' });
    }
    v.belts = { belt_1: this.drives.belt.offset, belt_2: this.drives.box.offset };
    v.displays = [{ id: 'Display', label: 'Bảng LED', value: this.outputs.Display || 0, unit: '', digits: 4 }];
    return v;
  }
}

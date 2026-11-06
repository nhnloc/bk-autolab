// A6 — Bộ cấp phôi từ ổ chứa (Lab L07)
import { Machine, Cylinder, Drive, advanceLine, beam, newId } from '../kit.js';

const MAG_X = 150, PUSH = 120, BELT_END = 780, PUCK_D = 50, PUCK_H = 25, BELT_Z = 800;
const CAPACITY = 10;

export class Feeder extends Machine {
  constructor() {
    super({
      id: 'feeder',
      title: 'Bộ cấp phôi từ ổ chứa',
      summary: 'Xi lanh 1A đẩy phôi đáy từ ống chứa ra băng tải; xi lanh 2A kẹp giữ chồng phôi phía trên trong lúc đẩy.',
      labs: ['L07'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: '1B1', desc: 'Xi lanh đẩy 1A ở vị trí lùi' },
          { addr: '%I0.6', tag: '1B2', desc: 'Xi lanh đẩy 1A ở vị trí ra' },
          { addr: '%I0.7', tag: '2B1', desc: 'Xi lanh kẹp 2A lùi (không giữ)' },
          { addr: '%I1.0', tag: '2B2', desc: 'Xi lanh kẹp 2A ra (đang giữ chồng phôi)' },
          { addr: '%I1.1', tag: 'B3', desc: 'Ổ chứa còn nhiều phôi (1 = còn > 3 phôi; 0 = sắp hết)' },
          { addr: '%I1.2', tag: 'B4', desc: 'Có phôi ở đáy ổ chứa (0 = ổ rỗng)' },
          { addr: '%I1.3', tag: 'B5', desc: 'Phôi tới cuối băng tải' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: '1Y1', desc: 'Van 5/2 đơn cuộn xi lanh đẩy 1A (1 = ra)' },
          { addr: '%Q0.3', tag: '2Y1', desc: 'Van 5/2 đơn cuộn xi lanh kẹp 2A (1 = giữ)' },
          { addr: '%Q0.4', tag: 'M1', desc: 'Động cơ băng tải' },
        ],
      },
      buttons: [{ id: 'Refill', label: 'Nạp đầy ổ chứa', kind: 'momentary', color: 'grey', action: 'refill' }],
      faults: [
        ...Machine.cylFaults(['1A', '2A']),
        { id: 'jamPuck', label: 'Phôi bị lệch, kẹt trong ổ' },
        { id: 'noTakeaway', label: 'Trạm sau không lấy phôi (cuối băng đầy)' },
      ],
    });
    this.cyl = {
      '1A': new Cylinder('1A', { stroke: PUSH, tOut: 450, tIn: 400 }),
      '2A': new Cylinder('2A', { stroke: 30, tOut: 150, tIn: 150 }),
    };
    this.drives = { belt: new Drive({ speed: 200, rampMs: 150 }) };
    this.init();
  }

  init() {
    this.stack = CAPACITY;      // số phôi trong ống chứa (kể cả phôi ở ô đáy)
    this.seated = true;         // ô đáy có phôi sẵn sàng để đẩy
    this.bottom = null;         // phôi đang bị đẩy ra
    this.dropT = 0;             // ms còn lại của lần rơi chồng phôi
    this.takeT = 0;
  }

  action(a) {
    if (a === 'refill') { this.stack = CAPACITY; if (this.cyl['1A'].pos < 0.05 && !this.cyl['2A'].b2) this.seated = true; this.log('Đã nạp đầy ổ chứa', 'info'); }
  }

  physics(dt) {
    const c1 = this.cyl['1A'], c2 = this.cyl['2A'];
    const prev1 = c1.pos;
    this.stepCyl('2A', this.act('2Y1'));
    this.stepCyl('1A', this.act('1Y1'), false, (np) => (this.faults.jamPuck && this.seated && np > 0.4 ? 0.4 : np));

    // 1A bắt đầu đẩy phôi ở ô đáy
    if (this.seated && c1.pos > 0.05 && prev1 <= 0.05) {
      this.bottom = { id: newId('puck'), kind: 'puck', x: MAG_X, y: 0, z: BELT_Z, len: PUCK_D, size: [PUCK_D, PUCK_D, PUCK_H], color: '#C9772B' };
      this.stack--; this.seated = false;
      if (!c2.b2 && this.stack > 0) this.crash('Đẩy phôi khi xi lanh kẹp 2A chưa giữ chồng phôi: phôi thứ hai bị kéo theo và kẹt');
    }
    if (this.bottom) {
      const blocker = this.items.find((it) => it.x - this.bottom.x < PUCK_D - 1 && it.x >= this.bottom.x);
      if (blocker && c1.vel > 0) this.crash('Đẩy phôi mới vào phôi trước còn nằm ở đầu băng tải');
      this.bottom.x = Math.max(this.bottom.x, MAG_X + c1.pos * PUSH);
      if (this.bottom.x >= MAG_X + PUSH - 1) { this.items.push(this.bottom); this.bottom = null; }
    }
    // Chồng phôi rơi vào ô đáy khi 1A đã lùi và 2A nhả
    if (!this.seated && this.stack > 0 && c1.pos < 0.05 && !c2.b2 && this.dropT <= 0 && !c2.moving) this.dropT = 120;
    if (this.dropT > 0) {
      if (c2.b2 || c1.pos >= 0.05) this.dropT = 0;       // bị giữ lại
      else { this.dropT -= dt; if (this.dropT <= 0) { this.dropT = 0; this.seated = this.stack > 0; } }
    }

    // Băng tải
    const dx = this.drives.belt.step(dt, this.act('M1'));
    advanceLine(this.items, dx, () => BELT_END);
    const atEnd = beam(this.items, BELT_END - PUCK_D / 2);
    if (atEnd && !this.faults.noTakeaway) {
      this.takeT += dt;
      if (this.takeT > 1500) {
        const it = this.items.reduce((a, b) => (a.x > b.x ? a : b));
        this.items = this.items.filter((x) => x !== it);
        this.takeT = 0;
        this.produced(true);
      }
    } else this.takeT = 0;

    this.inputs.B3 = this.stack > 3;
    this.inputs.B4 = this.seated;
    this.inputs.B5 = atEnd;
  }

  getVisual() {
    const v = super.getVisual();
    const lift = this.seated ? 0 : this.dropT > 0 ? this.dropT / 120 : 1;
    for (let i = 0; i < this.stack; i++) {
      v.items.push({ id: 'mag' + i, kind: 'puck', x: MAG_X, y: 0, z: BELT_Z + PUCK_H * (i + lift), size: [PUCK_D, PUCK_D, PUCK_H], color: '#C9772B' });
    }
    if (this.bottom) v.items.push({ ...this.bottom });
    v.belts = { belt_1: this.drives.belt.offset };
    return v;
  }

  visualParts() {
    const p = this.visualBase();
    return p;
  }
}

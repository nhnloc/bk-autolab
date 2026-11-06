// B1 — Bàn xoay chia 4 vị trí (thay Lab L06)
import { Machine, Cylinder, newId } from '../kit.js';

const CX = 600, CY = 0, R = 360, Z = 803, PART = [70, 70, 40];
const DEG_PER_MS = 90 / 1200;
// Trạm cố định theo góc thế giới (độ, ngược chiều kim đồng hồ từ +X)
const ST = { load: 180, press: 90, inspect: 0, eject: 270 };

export class Indexer extends Machine {
  constructor() {
    super({
      id: 'indexer',
      title: 'Bàn xoay chia 4 vị trí',
      summary: 'Bàn xoay 4 ổ gá quay từng nấc 90° nhờ động cơ + cam báo vị trí, chốt định vị khóa bàn. Trạm 0 nạp phôi, trạm 1 ép, trạm 2 kiểm tra chiều cao, trạm 3 gạt phôi đạt / không đạt.',
      labs: ['L06'],
      cpu: '1215C',
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'IdxPos', desc: 'Cam báo bàn đúng vị trí chia' },
          { addr: '%I0.6', tag: '1B1', desc: 'Chốt định vị 1A đã rút' },
          { addr: '%I0.7', tag: '1B2', desc: 'Chốt định vị 1A đã vào' },
          { addr: '%I1.0', tag: '2B1', desc: 'Đầu ép 2A ở trên' },
          { addr: '%I1.1', tag: '2B2', desc: 'Đầu ép 2A ép xong' },
          { addr: '%I1.2', tag: '3B1', desc: 'Gạt OK 3A lùi' },
          { addr: '%I1.3', tag: '3B2', desc: 'Gạt OK 3A ra' },
          { addr: '%I1.4', tag: '4B1', desc: 'Xi lanh nạp 4A lùi' },
          { addr: '%I1.5', tag: '4B2', desc: 'Xi lanh nạp 4A ra' },
          { addr: '%I2.0', tag: '5B1', desc: 'Gạt NG 5A lùi' },
          { addr: '%I2.1', tag: '5B2', desc: 'Gạt NG 5A ra' },
          { addr: '%I2.2', tag: 'FeedAvail', desc: 'Máng nạp có phôi' },
          { addr: '%I2.3', tag: 'P0', desc: 'Có phôi tại trạm 0 (nạp)' },
          { addr: '%I2.4', tag: 'P2', desc: 'Có phôi tại trạm 2 (kiểm tra)' },
          { addr: '%I2.5', tag: 'HeightOK', desc: 'Phôi đạt chiều cao (chỉ có nghĩa khi P2 = 1)' },
          { addr: '%I2.6', tag: 'P3', desc: 'Có phôi tại trạm 3 (gạt ra)' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'M1', desc: 'Động cơ quay bàn' },
          { addr: '%Q0.3', tag: '1Y1', desc: 'Đẩy chốt định vị vào' },
          { addr: '%Q0.4', tag: '2Y1', desc: 'Ép xuống' },
          { addr: '%Q0.5', tag: '3Y1', desc: 'Gạt phôi OK' },
          { addr: '%Q0.6', tag: '4Y1', desc: 'Nạp phôi' },
          { addr: '%Q0.7', tag: '5Y1', desc: 'Gạt phôi NG' },
        ],
      },
      buttons: [{ id: 'Refill', label: 'Nạp máng phôi', kind: 'momentary', color: 'grey', action: 'refill' }],
      faults: [
        ...Machine.cylFaults(['1A', '2A', '3A', '4A', '5A']),
        { id: 'camFail', label: 'Cảm biến cam vị trí hỏng' },
        { id: 'manyBad', label: 'Lô phôi xấu: 40 % phôi không đạt' },
      ],
    });
    this.cyl = {
      '1A': new Cylinder('1A', { stroke: 30, tOut: 150, tIn: 150 }),
      '2A': new Cylinder('2A', { stroke: 80, tOut: 400, tIn: 300 }),
      '3A': new Cylinder('3A', { stroke: 200, tOut: 350, tIn: 300 }),
      '4A': new Cylinder('4A', { stroke: 200, tOut: 350, tIn: 300 }),
      '5A': new Cylinder('5A', { stroke: 200, tOut: 350, tIn: 300 }),
    };
    this.init();
  }

  init() {
    this.angle = 0;               // góc bàn (độ, âm = theo chiều kim đồng hồ)
    this.fixtures = [null, null, null, null];   // phôi trên 4 ổ gá
    this.feed = 12;
    this.pressT = 0;
    this.stats.okCount = 0; this.stats.ngCount = 0; this.stats.wrongSort = 0;
  }
  action(a) { if (a === 'refill') { this.feed = 12; this.log('Đã nạp đầy máng phôi', 'info'); } }

  /** Ổ gá đang nằm tại góc thế giới a (nếu bàn đúng vị trí chia). */
  fixtureAt(a) {
    for (let k = 0; k < 4; k++) {
      const w = (((k * 90 + this.angle) % 360) + 360) % 360;
      const d = Math.abs(((w - a + 540) % 360) - 180);
      if (d < 3) return k;
    }
    return -1;
  }

  physics(dt) {
    const rotating = this.act('M1');
    const c = this.cyl;
    const anyOut = () => c['2A'].pos > 0.1 || c['3A'].pos > 0.1 || c['4A'].pos > 0.1 || c['5A'].pos > 0.1;
    this.stepCyl('1A', this.act('1Y1'), false, (np, op) => {
      if (np > op && np > 0.3 && Math.abs(((this.angle % 90) + 90) % 90) > 2 && Math.abs(((this.angle % 90) + 90) % 90) < 88) { this.crash('Đẩy chốt định vị khi bàn chưa đúng vị trí chia'); return op; }
      return np;
    });
    if (rotating && !this.crashed) {
      if (c['1A'].pos > 0.1) this.crash('Quay bàn khi chốt định vị chưa rút');
      else if (anyOut()) this.crash('Quay bàn khi có xi lanh chưa lùi về — va vào phôi/ổ gá');
      else this.angle -= DEG_PER_MS * dt;
    }
    const stationK = (a) => (Math.abs(((this.angle % 90) + 90) % 90) < 1.5 || Math.abs(((this.angle % 90) + 90) % 90) > 88.5 ? this.fixtureAt(a) : -1);

    // Trạm 0: nạp
    const k0 = stationK(ST.load);
    const prev4 = c['4A'].pos;
    this.stepCyl('4A', this.act('4Y1'), false, (np, op) => {
      if (np > op && op < 0.5 && np >= 0.5 && k0 >= 0 && this.fixtures[k0]) { this.crash('Nạp phôi vào ổ gá đã có phôi'); return op; }
      return np;
    });
    if (prev4 <= 0.05 && c['4A'].pos > 0.05 && !this._loading && this.feed > 0) { this._loading = { id: newId('part'), kind: 'part', size: PART.slice(), color: '#9AA6B2', bad: Math.random() < (this.faults.manyBad ? 0.4 : 0.12) }; this.feed--; }
    if (this._loading && c['4A'].b2) {
      if (k0 >= 0 && !this.fixtures[k0]) { this.fixtures[k0] = this._loading; this._loading = null; }
      else { this.log('Phôi rơi do nạp khi bàn chưa đúng vị trí', 'warn'); this.stats.defects++; this._loading = null; }
    }

    // Trạm 1: ép
    const k1 = stationK(ST.press);
    this.stepCyl('2A', this.act('2Y1'));
    if (c['2A'].pos > 0.95 && k1 >= 0 && this.fixtures[k1]) {
      this.pressT += dt;
      if (this.pressT > 200) this.fixtures[k1].pressed = true;
    } else this.pressT = 0;
    if (c['2A'].pos > 0.95 && k1 < 0 && !this.crashed) this.crash('Ép khi bàn chưa khóa đúng vị trí');

    // Trạm 3: gạt
    const k3 = stationK(ST.eject);
    for (const [key, ok] of [['3A', true], ['5A', false]]) {
      const cc = this.stepCyl(key, this.act(key === '3A' ? '3Y1' : '5Y1'));
      if (cc.b2 && k3 >= 0 && this.fixtures[k3]) {
        const p = this.fixtures[k3]; this.fixtures[k3] = null;
        const good = p.pressed && !p.bad;
        if (ok) this.stats.okCount++; else this.stats.ngCount++;
        if (good !== ok) { this.stats.wrongSort++; this.log(`Phôi ${good ? 'đạt' : 'không đạt'} bị gạt vào máng ${ok ? 'OK' : 'NG'}`, 'warn'); this.stats.defects++; }
        else this.produced(true);
      }
    }

    // Cảm biến
    const k2 = stationK(ST.inspect);
    const camAligned = Math.abs(((this.angle % 90) + 90) % 90) < 1.5 || Math.abs(((this.angle % 90) + 90) % 90) > 88.5;
    this.inputs.IdxPos = !this.faults.camFail && camAligned;
    this.inputs.FeedAvail = this.feed > 0;
    this.inputs.P0 = k0 >= 0 && !!this.fixtures[k0];
    this.inputs.P2 = k2 >= 0 && !!this.fixtures[k2];
    this.inputs.HeightOK = this.inputs.P2 && !!this.fixtures[k2].pressed && !this.fixtures[k2].bad;
    this.inputs.P3 = k3 >= 0 && !!this.fixtures[k3];
  }

  visualParts() {
    const p = this.visualBase();
    p.table = (((-this.angle) % 360) + 360) % 360 / 360;   // trục quay [0,0,-1]: dương = chiều kim đồng hồ
    return p;
  }

  getVisual() {
    const v = super.getVisual();
    const items = [];
    this.fixtures.forEach((p, k) => {
      if (!p) return;
      const a = ((k * 90 + this.angle) * Math.PI) / 180;
      items.push({ ...p, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), z: Z, size: p.pressed ? [PART[0], PART[1], PART[2] - 10] : PART, rotZ: k * 90 + this.angle, color: p.bad ? '#8B5E5E' : p.pressed ? '#5C8FB8' : '#9AA6B2' });
    });
    if (this._loading) items.push({ ...this._loading, x: CX - R - 200 + this.cyl['4A'].pos * 200, y: 0, z: Z });
    v.items = items;
    v.feed = this.feed;
    return v;
  }
}

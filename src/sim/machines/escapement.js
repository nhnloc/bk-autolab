// A3 — Bộ tách thùng trên băng tải tích lũy (Lab L08)
import { Machine, Cylinder, Drive, advanceLine, beam, newId } from '../kit.js';

const L = 300, W = 200, H = 200, Z = 800;
const S1 = 1088, S2 = 1400, END = 2000, OUT_SENSOR = 1900;

export class Escapement extends Machine {
  constructor() {
    super({
      id: 'escapement',
      title: 'Bộ tách thùng trên băng tải tích lũy',
      summary: 'Chặn 2 (pop-up) giữ thùng đầu hàng; chặn-kẹp 1 nâng lên ép giữ thùng thứ hai. Tách từng thùng một, chỉ nhả khi máy phía sau có chỗ.',
      labs: ['L08'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: '1B1', desc: 'Chặn-kẹp 1 (1A) đang hạ' },
          { addr: '%I0.6', tag: '1B2', desc: 'Chặn 1 (1A) đang nâng' },
          { addr: '%I0.7', tag: '2B1', desc: 'Chặn 2 (2A) đang hạ' },
          { addr: '%I1.0', tag: '2B2', desc: 'Chặn 2 (2A) đang nâng' },
          { addr: '%I1.1', tag: 'B3', desc: 'Có thùng tựa vào chặn 2' },
          { addr: '%I1.2', tag: 'B4', desc: 'Hàng tích lũy đầy (thùng tại X=500)' },
          { addr: '%I1.3', tag: 'B5', desc: 'Thùng ở đầu ra (máy sau chưa lấy)' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: '1Y1', desc: 'Nâng chặn 1 (van đơn cuộn, lò xo hạ)' },
          { addr: '%Q0.3', tag: '2Y1', desc: 'Nâng chặn 2' },
          { addr: '%Q0.4', tag: 'M1', desc: 'Động cơ băng tải con lăn tích lũy' },
          { addr: '%Q0.5', tag: 'M2', desc: 'Động cơ băng tải ra' },
        ],
      },
      buttons: [{ id: 'Feed', label: 'Bật/tắt cấp thùng', kind: 'latching', color: 'grey' }],
      faults: [
        ...Machine.cylFaults(['1A', '2A']),
        { id: 'slowDownstream', label: 'Máy phía sau chậm (lấy thùng mỗi 6 s)' },
      ],
    });
    this.cyl = {
      '1A': new Cylinder('1A', { stroke: 40, tOut: 200, tIn: 200 }),
      '2A': new Cylinder('2A', { stroke: 40, tOut: 200, tIn: 200 }),
    };
    this.drives = { in: new Drive({ speed: 300, rampMs: 200 }), out: new Drive({ speed: 400, rampMs: 200 }) };
    this.panel.Feed = true;
    this.init();
  }

  init() { this.spawnT = 0; this.takeT = 0; this.lastRelease = null; }

  physics(dt) {
    // Chặn nâng lên trúng thùng đang nằm trên nó → không lên được, báo va chạm
    const blockLimit = (sx) => (np, op) => {
      if (np > op && np > 0.15) {
        const hit = this.items.find((it) => Math.abs(it.x - sx) < L / 2 - 5);
        if (hit) { if (!hit.lifted) { hit.lifted = true; this.stats.defects++; this.log(`Chặn tại X=${sx} nâng trúng đáy thùng`, 'error'); } return Math.min(np, 0.15); }
      }
      return np;
    };
    const c1 = this.stepCyl('1A', this.act('1Y1'));   // 1A: chặn-kẹp, nâng lên giữa khe hoặc ép đáy thùng giữ lại
    const c2 = this.stepCyl('2A', this.act('2Y1'), false, blockLimit(S2));
    for (const it of this.items) {
      if (!it.lifted) continue;
      const on1 = Math.abs(it.x - S1) < L / 2 - 5 && c1.pos > 0.1, on2 = Math.abs(it.x - S2) < L / 2 - 5 && c2.pos > 0.1;
      if (!on1 && !on2) it.lifted = false;
    }

    // Cấp thùng ở đầu băng
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.x - L / 2 < 20)) {
      this.items.push({ id: newId('box'), kind: 'box', x: L / 2, y: 0, z: Z, len: L, size: [L, W, H], color: '#B98A55' });
      this.spawnT = 1800 + Math.random() * 1500;
    }

    const dIn = this.drives.in.step(dt, this.act('M1'));
    const dOut = this.drives.out.step(dt, this.act('M2'));
    const stops = (it) => {
      let lim = END + L;
      if (it.lifted) return it.x + it.len / 2;
      const front = it.x + it.len / 2;
      if (c1.pos > 0.5) {
        const rear = it.x - it.len / 2;
        if (rear < S1 && front > S1) return front;          // thùng nằm trên chặn-kẹp: bị giữ
        if (front <= S1 + 1) lim = Math.min(lim, S1);
      }
      if (c2.pos > 0.5 && front <= S2 + 1) lim = Math.min(lim, S2);
      return lim;
    };
    // vùng con lăn tích lũy (x < S2) chạy theo M1; sau S2 theo M2
    const inZone = this.items.filter((it) => it.x < S2);
    const outZone = this.items.filter((it) => it.x >= S2);
    advanceLine(outZone, dOut, () => END + L);
    // thùng ở vùng vào chỉ bị chặn bởi thùng vùng ra nếu chạm
    const firstOutRear = outZone.length ? Math.min(...outZone.map((o) => o.x - o.len / 2)) : Infinity;
    advanceLine(inZone, dIn, (it) => Math.min(stops(it), firstOutRear));
    for (const it of this.items) if (it.x >= S2 && !it.released) { it.released = true; it.releasedAt = this.time; }

    // Máy sau lấy thùng ở cuối
    const atOut = beam(this.items, OUT_SENSOR);
    const endBox = this.items.find((it) => it.x + it.len / 2 >= END - 2);
    const takeEvery = this.faults.slowDownstream ? 6000 : 1500;
    if (endBox) {
      this.takeT += dt;
      if (this.takeT >= takeEvery) { this.items = this.items.filter((x) => x !== endBox); this.takeT = 0; this.produced(true); }
    } else this.takeT = 0;
    // Hai thùng cùng lọt qua chặn 2 sát nhau (khoảng hở < 50 mm) → tách không đạt
    const rel = outZone.sort((a, b) => a.x - b.x);
    for (let i = 1; i < rel.length; i++) {
      const gap = rel[i].x - rel[i].len / 2 - (rel[i - 1].x + rel[i - 1].len / 2);
      if (gap < 50 && !rel[i - 1].pairFlag) { rel[i - 1].pairFlag = true; this.stats.rejected++; this.log('Hai thùng qua chặn 2 sát nhau — tách thùng không đạt', 'warn'); }
    }

    this.inputs.B3 = this.items.some((it) => Math.abs(it.x + it.len / 2 - S2) < 15);
    this.inputs.B4 = beam(this.items, 500);
    this.inputs.B5 = atOut;
  }

  getVisual() {
    const v = super.getVisual();
    v.belts = { rollers: this.drives.in.offset, belt_out: this.drives.out.offset };
    return v;
  }
}

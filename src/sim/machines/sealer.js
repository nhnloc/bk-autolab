// A4 — Máy dán thùng (đóng nắp) (Lab L11)
import { Machine, Cylinder, Drive, advanceLine, beam, newId, clamp } from '../kit.js';

const BOX = [300, 200, 200], Z = 800;
const STOP_X = 600, PLOUGH_A = 700, PLOUGH_B = 820, TAPE_A = 850, TAPE_B = 1150, OUT_SENSOR = 1400, END = 1800;
const SIDE_BELT_FROM = 470;

export class Sealer extends Machine {
  constructor() {
    super({
      id: 'sealer',
      title: 'Máy dán thùng (đóng nắp)',
      summary: 'Thùng đã có hàng vào máy, bị chặn đúng vị trí; hai tay gấp vạt nhỏ nắp trên, tấm ép giữ nắp, đai kéo hai bên đưa thùng qua thanh gấp vạt lớn và đầu dán băng keo.',
      labs: ['L11'],
      cpu: '1215C',
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'BIn', desc: 'Thùng vào máy (quang tại X=100)' },
          { addr: '%I0.6', tag: 'BPos', desc: 'Thùng tựa vào chặn (đúng vị trí gấp)' },
          { addr: '%I0.7', tag: 'BOut', desc: 'Thùng ra khỏi máy (X=1300)' },
          { addr: '%I1.0', tag: '1B1', desc: 'Chặn 1A hạ' },
          { addr: '%I1.1', tag: '1B2', desc: 'Chặn 1A nâng' },
          { addr: '%I1.2', tag: '2B1', desc: 'Tay gấp vạt trước 2A về' },
          { addr: '%I1.3', tag: '2B2', desc: 'Tay gấp vạt trước 2A gấp xong' },
          { addr: '%I1.4', tag: '3B1', desc: 'Tay gấp vạt sau 3A về' },
          { addr: '%I1.5', tag: '3B2', desc: 'Tay gấp vạt sau 3A gấp xong' },
          { addr: '%I2.0', tag: '4B1', desc: 'Tấm ép 4A ở trên' },
          { addr: '%I2.1', tag: '4B2', desc: 'Tấm ép 4A đã hạ' },
          { addr: '%I2.2', tag: 'TapeOK', desc: 'Còn băng keo' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'M1', desc: 'Băng tải vào' },
          { addr: '%Q0.3', tag: '1Y1', desc: 'Nâng chặn 1A' },
          { addr: '%Q0.4', tag: '2Y1', desc: 'Tay gấp vạt trước 2A' },
          { addr: '%Q0.5', tag: '3Y1', desc: 'Tay gấp vạt sau 3A' },
          { addr: '%Q0.6', tag: '4Y1', desc: 'Hạ tấm ép 4A' },
          { addr: '%Q0.7', tag: 'M2', desc: 'Đai kéo hai bên' },
        ],
      },
      buttons: [{ id: 'Feed', label: 'Bật/tắt cấp thùng', kind: 'latching', color: 'grey' }],
      faults: [...Machine.cylFaults(['1A', '2A', '3A', '4A']), { id: 'noTape', label: 'Hết băng keo' }],
    });
    this.cyl = {
      '1A': new Cylinder('1A', { stroke: 40, tOut: 200, tIn: 200 }),
      '2A': Object.assign(new Cylinder('2A', { stroke: 90, tOut: 300, tIn: 250 }), { node: 'flap_2A' }),
      '3A': Object.assign(new Cylinder('3A', { stroke: 120, tOut: 350, tIn: 300 }), { node: 'flap_3A' }),
      '4A': new Cylinder('4A', { stroke: 80, tOut: 300, tIn: 300 }),
    };
    this.drives = { in: new Drive({ speed: 300 }), side: new Drive({ speed: 350 }) };
    this.panel.Feed = true;
    this.init();
  }

  init() { this.spawnT = 500; this.takeT = 0; }

  defect(c, msg) { if (c.ok) { c.ok = false; this.log(msg, 'warn'); } }

  physics(dt) {
    const at = () => this.items.find((it) => Math.abs(it.x + BOX[0] / 2 - STOP_X) < 30);
    const c1 = this.stepCyl('1A', this.act('1Y1'), false, (np, op) => {
      if (np > op && np > 0.15 && this.items.some((it) => Math.abs(it.x - STOP_X) < BOX[0] / 2 - 5)) { this.log('Chặn nâng trúng đáy thùng', 'error'); return Math.min(np, 0.15); }
      return np;
    });
    const box = at();
    const c2 = this.stepCyl('2A', this.act('2Y1'));
    const c3 = this.stepCyl('3A', this.act('3Y1'));
    const c4 = this.stepCyl('4A', this.act('4Y1'), false, (np) => {
      // tấm ép hạ xuống khi vạt nhỏ chưa gấp: đè lên vạt
      if (box && np > 0.6 && (box.fold.topMinorFront < 0.9 || box.fold.topMinorRear < 0.9) && !box.pressBad) { box.pressBad = true; this.defect(box, 'Hạ tấm ép khi vạt nhỏ chưa gấp — nắp bị đè méo'); }
      return np;
    });

    // Cấp thùng (đáy đã dán, nắp mở, có hàng)
    this.spawnT -= dt;
    if (this.panel.Feed && this.spawnT <= 0 && !this.items.some((it) => it.x - BOX[0] / 2 < 30)) {
      this.items.push({ id: newId('box'), kind: 'carton', x: -BOX[0] / 2 + 5, y: 0, z: Z, len: BOX[0], size: BOX.slice(), color: '#C49A6C', ok: true, filled: true,
        fold: { open: 1, minorFront: 1, minorRear: 1, major: 1, taped: true, topMinor: 0, topMinorFront: 0, topMinorRear: 0, topMajor: 0, tapedTop: false } });
      this.spawnT = 4000 + Math.random() * 2000;
    }

    // Tay gấp vạt: chỉ tác dụng khi thùng ở vị trí
    if (box) {
      const lockedByPress = c4.pos > 0.95;
      if (!lockedByPress || box.fold.topMinorFront < 0.95) box.fold.topMinorFront = Math.max(c2.pos, lockedByPress ? box.fold.topMinorFront : 0);
      if (!lockedByPress || box.fold.topMinorRear < 0.95) box.fold.topMinorRear = Math.max(c3.pos, lockedByPress ? box.fold.topMinorRear : 0);
      box.fold.topMinor = Math.min(box.fold.topMinorFront, box.fold.topMinorRear);
    }

    // Di chuyển
    const dIn = this.drives.in.step(dt, this.act('M1'));
    const dSide = this.drives.side.step(dt, this.act('M2'));
    const armsOut = c2.pos > 0.1 || c3.pos > 0.1;
    for (const it of [...this.items].sort((a, b) => b.x - a.x)) {
      const front = it.x + BOX[0] / 2;
      // băng vào kéo khi đuôi thùng còn trên băng vào (tới X=615); đai kéo hai bên tác dụng khi đầu thùng đã vào đai (X>520)
      const rear = it.x - BOX[0] / 2;
      let d = Math.max(rear < 615 ? dIn : 0, front > SIDE_BELT_FROM + 50 ? dSide : 0);
      let maxFront = Infinity;
      if (c1.pos > 0.5 && front <= STOP_X + 1) maxFront = STOP_X;
      if (armsOut && Math.abs(front - STOP_X) < 40 && d > 0) {
        maxFront = Math.min(maxFront, front);
        if (it.x >= SIDE_BELT_FROM - 5 || front >= STOP_X - 1) if (dSide > 0 && !it.armJam) { it.armJam = true; this.crash('Đai kéo chạy khi tay gấp vạt chưa rút — thùng bị kẹt'); }
      }
      const ahead = this.items.filter((o) => o !== it && o.x > it.x);
      for (const o of ahead) maxFront = Math.min(maxFront, o.x - BOX[0] / 2);
      const nf = Math.min(front + d, Math.max(front, maxFront));
      it.x = nf - BOX[0] / 2;
      // Thanh gấp vạt lớn & đầu dán
      if (it.x > PLOUGH_A - BOX[0] / 2 + 100 && !it.ploughChecked) {
        it.ploughChecked = true;
        if (it.fold.topMinor < 0.95) this.defect(it, 'Vạt nhỏ chưa gấp khi tới thanh gấp vạt lớn');
        if (c4.pos < 0.9) this.defect(it, 'Tấm ép chưa hạ — vạt nhỏ bật lên khi qua thanh gấp');
      }
      it.fold.topMajor = Math.max(it.fold.topMajor, clamp((it.x - (PLOUGH_A - BOX[0] / 2 + 100)) / (PLOUGH_B - PLOUGH_A)));
      if (it.x > TAPE_B - BOX[0] / 2 && !it.tapeChecked) {
        it.tapeChecked = true;
        it.fold.tapedTop = !this.faults.noTape && it.fold.topMajor > 0.95;
        if (!it.fold.tapedTop) this.defect(it, this.faults.noTape ? 'Hết băng keo — nắp không được dán' : 'Nắp chưa gấp — không dán được');
      }
    }
    // Thùng ra
    const endBox = this.items.find((it) => it.x + BOX[0] / 2 >= END - 2);
    if (endBox) { this.takeT += dt; if (this.takeT > 1000) { this.items = this.items.filter((x) => x !== endBox); this.takeT = 0; this.produced(endBox.ok); } }
    else this.takeT = 0;
    for (const it of this.items) if (it.x + BOX[0] / 2 > END) it.x = END - BOX[0] / 2;

    this.inputs.BIn = beam(this.items, 100);
    this.inputs.BPos = !!box && c1.pos > 0.5;
    this.inputs.BOut = beam(this.items, OUT_SENSOR);
    this.inputs.TapeOK = !this.faults.noTape;
  }

  getVisual() {
    const v = super.getVisual();
    v.belts = { belt_in: this.drives.in.offset, belt_side_L: this.drives.side.offset, belt_side_R: this.drives.side.offset };
    return v;
  }
}

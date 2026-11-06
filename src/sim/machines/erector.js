// A1 — Máy dựng thùng carton (Lab L10, L15, L16)
import { Machine, Cylinder, Drive, advanceLine, beam, newId, clamp } from '../kit.js';

const BOX = [300, 200, 200], Z = 800;
const FORM_X = 350, PICK_Y = 350, PUSH = 500, OUT_END = 1850, OUT_SENSOR = 1200;
const PLOUGH = 430, TAPE_A = 500, TAPE_B = 700;
const MAG_CAP = 30;

export class Erector extends Machine {
  constructor() {
    super({
      id: 'erector',
      title: 'Máy dựng thùng carton',
      summary: 'Tay hút lấy tấm carton phẳng từ ổ chứa, tay mở bẻ thành hộp, hai tay gấp vạt nhỏ đáy, xi lanh đẩy thùng qua thanh gấp vạt lớn và đầu dán băng keo đáy.',
      labs: ['L10', 'L15', 'L16'],
      cpu: '1217C',
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: '1B1', desc: 'Tay hút 1A lùi (tại trạm tạo hình)' },
          { addr: '%I0.6', tag: '1B2', desc: 'Tay hút 1A tiến (áp vào ổ chứa)' },
          { addr: '%I0.7', tag: 'VacOK', desc: 'Công tắc chân không: đã hút được tấm carton' },
          { addr: '%I1.0', tag: '2B1', desc: 'Tay mở 2A về' },
          { addr: '%I1.1', tag: '2B2', desc: 'Tay mở 2A mở xong (90°)' },
          { addr: '%I1.2', tag: '3B1', desc: 'Tay gấp vạt nhỏ trước 3A về' },
          { addr: '%I1.3', tag: '3B2', desc: 'Tay gấp vạt nhỏ trước 3A gấp xong' },
          { addr: '%I1.4', tag: '4B1', desc: 'Tay gấp vạt nhỏ sau 4A về' },
          { addr: '%I1.5', tag: '4B2', desc: 'Tay gấp vạt nhỏ sau 4A gấp xong' },
          { addr: '%I2.0', tag: '5B1', desc: 'Xi lanh đẩy thùng 5A lùi' },
          { addr: '%I2.1', tag: '5B2', desc: 'Xi lanh đẩy thùng 5A ra' },
          { addr: '%I2.2', tag: 'MagLow', desc: 'Ổ chứa sắp hết (≤ 10 tấm)' },
          { addr: '%I2.3', tag: 'MagEmpty', desc: 'Ổ chứa hết tấm carton' },
          { addr: '%I2.4', tag: 'BoxOut', desc: 'Thùng trên băng tải ra (quang tại X=900)' },
          { addr: '%I2.5', tag: 'TapeOK', desc: 'Còn băng keo' },
          { addr: '%I2.6', tag: 'AirOK', desc: 'Đủ áp khí nén' },
          { addr: '%I2.7', tag: 'DoorOK', desc: 'Cửa an toàn đóng' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: '1Y1', desc: 'Van kép cuộn tay hút: tiến' },
          { addr: '%Q0.3', tag: '1Y2', desc: 'Van kép cuộn tay hút: lùi' },
          { addr: '%Q0.4', tag: 'VAC', desc: 'Van tạo chân không (ejector)' },
          { addr: '%Q0.5', tag: '2Y1', desc: 'Tay mở 2A (đơn cuộn)' },
          { addr: '%Q0.6', tag: '3Y1', desc: 'Gấp vạt nhỏ trước 3A' },
          { addr: '%Q0.7', tag: '4Y1', desc: 'Gấp vạt nhỏ sau 4A' },
          { addr: '%Q1.0', tag: '5Y1', desc: 'Van kép cuộn đẩy thùng: ra' },
          { addr: '%Q1.1', tag: '5Y2', desc: 'Van kép cuộn đẩy thùng: lùi' },
          { addr: '%Q2.0', tag: 'M1', desc: 'Băng tải ra' },
          { addr: '%Q2.1', tag: 'H_Low', desc: 'Đèn vàng: sắp hết carton' },
        ],
      },
      buttons: [
        { id: 'Refill', label: 'Nạp carton', kind: 'momentary', color: 'grey', action: 'refill' },
        { id: 'Door', label: 'Mở/đóng cửa', kind: 'latching', color: 'grey' },
      ],
      faults: [
        ...Machine.cylFaults(['1A', '2A', '5A']),
        { id: 'missPick', label: 'Hút hụt: 1/3 lần hút không dính tấm carton' },
        { id: 'noTape', label: 'Hết băng keo' },
        { id: 'vacLeak', label: 'Giác hút rách (chân không chập chờn)' },
      ],
    });
    this.cyl = {
      '1A': Object.assign(new Cylinder('1A', { stroke: 350, tOut: 600, tIn: 600, valve: 'bi' }), { node: 'cyl_1A_rod' }),
      '2A': Object.assign(new Cylinder('2A', { stroke: 90, tOut: 500, tIn: 400 }), { node: 'arm_2A' }),
      '3A': Object.assign(new Cylinder('3A', { stroke: 90, tOut: 250, tIn: 250 }), { node: 'flap_3A' }),
      '4A': Object.assign(new Cylinder('4A', { stroke: 90, tOut: 250, tIn: 250 }), { node: 'flap_4A' }),
      '5A': Object.assign(new Cylinder('5A', { stroke: PUSH, tOut: 900, tIn: 600, valve: 'bi' }), { node: 'cyl_5A_rod' }),
    };
    this.drives = { out: new Drive({ speed: 350, rampMs: 200 }) };
    this.init();
  }

  init() {
    this.mag = MAG_CAP; this.cur = null; this.vacT = 0; this.vacOk = false; this.picks = 0; this.takeT = 0;
    this.panel.Door = false;
  }
  get doorOk() { return !this.panel.Door; }
  action(a) { if (a === 'refill') { this.mag = MAG_CAP; this.log('Đã nạp đầy carton', 'info'); } }

  newCarton() {
    return { id: newId('ctn'), kind: 'carton', x: FORM_X, y: PICK_Y, z: Z, len: BOX[0], size: BOX.slice(), color: '#C49A6C',
      fold: { open: 0, minorFront: 0, minorRear: 0, major: 0, topMinor: 0, topMajor: 0, taped: false }, ok: true, stage: 'held' };
  }
  defect(c, msg) { if (c.ok) { c.ok = false; this.log(msg, 'warn'); } }

  physics(dt) {
    const c1 = this.stepCyl('1A', this.act('1Y1'), this.act('1Y2'));
    const prevOpen = this.cyl['2A'].pos;
    const c2 = this.stepCyl('2A', this.act('2Y1'), false, (np, op) => {
      if (np > op && np > 0.05 && c1.pos > 0.05) { this.crash('Tay mở 2A quay khi tay hút 1A chưa về — va chạm tay hút'); return op; }
      return np;
    });
    const c3 = this.stepCyl('3A', this.act('3Y1'));
    const c4 = this.stepCyl('4A', this.act('4Y1'));
    const c5 = this.stepCyl('5A', this.act('5Y1'), this.act('5Y2'), (np, op) => {
      if (np > op && np > 0.02) {
        if (c2.pos > 0.1) { this.crash('Đẩy thùng khi tay mở 2A chưa về'); return op; }
        const cur = this.cur;
        if (cur && cur.stage === 'formed') {
          const ahead = this.items.find((it) => it.stage === 'out' && it.x - it.len / 2 < FORM_X + np * PUSH + BOX[0] / 2 - 2);
          if (ahead) { this.crash('Đẩy thùng mới khi thùng trước chưa rời khỏi máy (băng tải ra chưa chạy?)'); return op; }
        }
      }
      return np;
    });

    // Chân không
    const vac = this.act('VAC') && this.air;
    const c = this.cur;
    const atMag = c1.pos > 0.97;
    if (vac && (atMag || (c && c.stage === 'held'))) {
      this.vacT += dt;
      if (!c && atMag && this.vacT > 150 && this.mag > 0) {
        this.picks++;
        const miss = this.faults.missPick && this.picks % 3 === 0;
        if (!miss) { this.cur = this.newCarton(); this.mag--; this.items.push(this.cur); }
        else this.vacT = -1e9; // hụt: không dính cho tới khi nhả VAC
      }
    } else this.vacT = 0;
    const leak = this.faults.vacLeak && Math.sin(this.time / 170) > 0.6;
    this.vacOk = !!(this.cur && this.cur.stage === 'held' && vac && !leak);

    if (c && c.stage === 'held') {
      if (!vac || leak) {
        // nhả chân không
        if (c.fold.open >= 0.98) { c.stage = 'formed'; }
        else if (c1.pos > 0.03) { this.defect(c, 'Rơi tấm carton khi tay hút đang di chuyển (nhả chân không quá sớm)'); this.items = this.items.filter((x) => x !== c); this.cur = null; this.stats.defects++; }
        else if (c.fold.open > 0.05) { this.defect(c, 'Nhả chân không khi thùng chưa mở hết — tấm carton bật lại'); c.fold.open = 0; c.stage = 'flat'; }
        else c.stage = 'flat';
      } else {
        c.y = PICK_Y * c1.pos;
        if (c1.pos < 0.03) c.fold.open = Math.max(c.fold.open, c2.pos);
        if (c5.pos > 0.03) { this.crash('Đẩy thùng khi chân không chưa nhả — thùng bị giật rách'); this.defect(c, 'Thùng rách do đẩy khi còn hút'); }
      }
    } else if (c && c.stage === 'flat') {
      // tấm carton nằm ở trạm nhưng không được giữ: hút lại được
      if (vac && c1.pos < 0.03) c.stage = 'held';
      if (c2.pos > 0.2 && c2.pos > prevOpen) this.defect(c, 'Tay mở 2A quay khi không giữ chân không — tấm carton không mở được');
    }

    if (c && (c.stage === 'formed' || c.stage === 'held') && c.fold.open >= 0.98) {
      // gấp vạt nhỏ: tay giữ vạt, khi rút tay ra vạt bật lại trừ khi đã bị thanh gấp vạt lớn khóa
      const locked = c.x >= PLOUGH;
      c.fold.minorFront = locked ? c.fold.minorFront : c3.pos;
      c.fold.minorRear = locked ? c.fold.minorRear : c4.pos;
    } else if (c && (c3.moving || c4.moving) && (c3.vel > 0 || c4.vel > 0) && c.fold.open < 0.98) {
      this.defect(c, 'Gấp vạt nhỏ khi thùng chưa mở xong');
    }

    if (c && c.stage === 'formed') {
      c.x = Math.max(c.x, FORM_X + c5.pos * PUSH);
      if (c.x >= PLOUGH && !c.ploughChecked) {
        c.ploughChecked = true;
        if (c.fold.minorFront < 0.95 || c.fold.minorRear < 0.95) this.defect(c, 'Vạt nhỏ chưa gấp khi tới thanh gấp vạt lớn — đáy thùng hở');
      }
      if (c3.pos > 0.2 && c.x > 700) { this.crash('Tay gấp vạt trước 3A chưa rút, cản đường thùng'); }
      c.fold.major = clamp((c.x - PLOUGH) / 70);
      if (c.x > TAPE_A && c.x < TAPE_B) c.tapeRun = (c.tapeRun || 0) + 1;
      if (c.x >= TAPE_B && !c.tapeChecked) {
        c.tapeChecked = true;
        c.fold.taped = !this.faults.noTape && c.fold.major > 0.95;
        if (!c.fold.taped) this.defect(c, this.faults.noTape ? 'Hết băng keo — đáy thùng không dán' : 'Vạt lớn chưa gấp — không dán được');
      }
      if (c.x >= FORM_X + PUSH * 0.97) { c.x = FORM_X + PUSH; c.stage = 'out'; this.cur = null; this._handedAt = this.time; }
    }

    // Băng tải ra
    const dx = this.drives.out.step(dt, this.act('M1'));
    const outs = this.items.filter((it) => it.stage === 'out');
    advanceLine(outs, dx, () => OUT_END);
    const endBox = outs.find((it) => it.x + it.len / 2 >= OUT_END - 2);
    if (endBox) {
      this.takeT += dt;
      if (this.takeT > 1200) { this.items = this.items.filter((x) => x !== endBox); this.takeT = 0; this.produced(endBox.ok); }
    } else this.takeT = 0;

    this.inputs.VacOK = this.vacOk;
    this.inputs.MagLow = this.mag <= 10;
    this.inputs.MagEmpty = this.mag === 0;
    this.inputs.BoxOut = beam(outs, OUT_SENSOR);
    this.inputs.TapeOK = !this.faults.noTape;
    this.inputs.AirOK = this.air;
    this.inputs.DoorOK = this.doorOk;
  }

  visualParts() {
    const p = this.visualBase();
    p.magazine_pusher = 1 - this.mag / MAG_CAP;
    return p;
  }
  getVisual() {
    const v = super.getVisual();
    v.belts = { belt_out: this.drives.out.offset };
    v.magazine = { count: this.mag, capacity: MAG_CAP };
    return v;
  }
}

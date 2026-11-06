// L03 — Máy nén khí khởi động sao–tam giác: 3 contactor, rơ-le nhiệt, công tắc áp suất, đo dòng & áp suất
import { Machine } from '../kit.js';
import { Trend } from '../trend.js';

const IN = 40;           // dòng định mức (A), động cơ 22 kW / 380 V
const PS_OFF = 8, PS_ON = 6;

export class StarDelta extends Machine {
  constructor() {
    super({
      id: 'stardelta',
      title: 'Máy nén khí — khởi động sao–tam giác',
      summary: 'Động cơ 22 kW kéo đầu nén khí, khởi động sao–tam giác bằng 3 contactor KM1 (nguồn), KM2 (sao), KM3 (tam giác). Công tắc áp suất tự đóng/ngắt máy nén theo áp suất bình chứa. Có đồ thị dòng điện, tốc độ, áp suất.',
      labs: ['L03'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'F1', desc: 'Rơ-le nhiệt F1 (NC — 1 = bình thường)' },
          { addr: '%I0.6', tag: 'PS', desc: 'Công tắc áp suất (1 = áp thấp, cần nén; ngắt ở 8 bar, đóng lại ở 6 bar)' },
          { addr: '%IW64', tag: 'P_Raw', type: 'Int', desc: 'Cảm biến áp suất 0..27648 = 0..10 bar' },
          { addr: '%IW66', tag: 'I_Raw', type: 'Int', desc: 'Biến dòng 0..27648 = 0..200 A' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'KM1', desc: 'Contactor nguồn KM1' },
          { addr: '%Q0.3', tag: 'KM2', desc: 'Contactor sao KM2' },
          { addr: '%Q0.4', tag: 'KM3', desc: 'Contactor tam giác KM3' },
        ],
      },
      buttons: [{ id: 'Demand', label: 'Tăng tiêu thụ khí', kind: 'latching', color: 'grey' }],
      faults: [
        { id: 'leak', label: 'Rò khí lớn trên đường ống' },
        { id: 'psStuck', label: 'Công tắc áp suất bị dính (luôn = 1)' },
        { id: 'bearing', label: 'Ổ bi động cơ hỏng (dòng tăng, rơ-le nhiệt dễ tác động)' },
      ],
      panelDefaults: { Demand: false },
    });
    this.trend = new Trend([
      { id: 'I', label: 'Dòng điện', unit: 'A', max: 200, color: '#e5534b' },
      { id: 'n', label: 'Tốc độ', unit: '%', max: 100, color: '#2e86de' },
      { id: 'p', label: 'Áp suất', unit: 'bar', max: 10, color: '#27ae60' },
    ], { dtMs: 50, points: 600 });
    this.init();
  }

  init() {
    this.n = 0; this.p = 5; this.I = 0; this.mode = 'off'; this.prevMode = 'off';
    this.f1 = true; this.heat = 0; this.starT = 0; this.k2OffAt = -1e9; this.prevK2 = false;
    this.ps = true; this.angle = 0; this.startClean = true; this.peak = 0;
    this.trend.clear();
  }

  physics(dt) {
    const k1 = this.act('KM1') && this.f1, k2 = this.act('KM2') && this.f1, k3 = this.act('KM3') && this.f1;
    if (this.act('KM2') && this.act('KM3')) this.crash('KM2 (sao) và KM3 (tam giác) đóng cùng lúc — ngắn mạch 3 pha');
    if (this.prevK2 && !k2) this.k2OffAt = this.time;
    this.prevK2 = k2;
    const mode = this.crashed ? 'off' : k1 && k2 ? 'star' : k1 && k3 ? 'delta' : 'off';

    if (mode !== this.prevMode) {
      if (mode === 'star' && this.n < 0.1) { this.startClean = true; this.peak = 0; }
      if (mode === 'delta') {
        const gap = this.time - this.k2OffAt;
        if (this.prevMode === 'off' && this.n < 0.3) { this.startClean = false; this.stats.defects++; this.log('Đóng thẳng tam giác khi động cơ đứng yên = khởi động trực tiếp: dòng khởi động ~6,5 lần định mức', 'warn'); }
        else if (this.n < 0.8) { this.startClean = false; this.stats.defects++; this.log(`Chuyển sang tam giác quá sớm (tốc độ mới ${Math.round(this.n * 100)} %) — dòng tăng vọt`, 'warn'); }
        if (gap < 30) { this.startClean = false; this.stats.defects++; this.log(`Thời gian chết giữa KM2 nhả và KM3 đóng chỉ ${Math.max(0, Math.round(gap))} ms — nguy cơ hồ quang ngắn mạch (nên ≥ 50 ms)`, 'warn'); }
      }
      this.prevMode = mode;
    }

    // Động học đơn giản
    const loadTorque = 0.15 + 0.25 * this.n * (this.p / 10);
    if (mode === 'star') this.n = Math.min(0.92, this.n + (dt / 1000) * Math.max(0, 0.32 - loadTorque * 0.5));
    else if (mode === 'delta') this.n = Math.min(1, this.n + (dt / 1000) * Math.max(0, 1.1 - loadTorque));
    else this.n = Math.max(0, this.n - (dt / 1000) * 0.35);
    // Dòng điện
    const bear = this.faults.bearing ? 1.25 : 1;
    if (mode === 'star') this.I = IN * (0.55 + 1.65 * (1 - this.n)) * bear;
    else if (mode === 'delta') this.I = IN * (0.85 * (0.6 + this.p / 20) + 5.6 * Math.pow(1 - this.n, 1.4)) * bear;
    else this.I = 0;
    this.peak = Math.max(this.peak, this.I);
    // Rơ-le nhiệt
    const over = this.I > IN * 1.15 ? (this.I / IN) ** 2 : 0;
    this.heat = Math.max(0, this.heat + (over ? over * dt : -dt * 2));
    if (mode === 'star') this.starT += dt; else this.starT = 0;
    if ((this.heat > 60000 || this.starT > 15000) && this.f1) { this.f1 = false; this.stats.defects++; this.log(this.starT > 15000 ? 'Chạy sao quá 15 s — rơ-le nhiệt F1 tác động' : 'Quá dòng kéo dài — rơ-le nhiệt F1 tác động', 'error'); }
    if (!this.f1 && this.panel.Reset && this.heat < 20000) { this.f1 = true; this.heat = 0; this.log('Đã reset rơ-le nhiệt F1', 'info'); }

    // Khí nén
    const use = (this.panel.Demand ? 0.35 : 0.12) + (this.faults.leak ? 0.4 : 0);
    const make = mode === 'delta' && this.n > 0.9 ? 0.55 : 0;
    this.p = Math.max(0, this.p + (dt / 1000) * (make - use));
    if (this.p > 10) { this.p = 9.6; this.log('Van an toàn xả khí ở 10 bar', 'warn'); }
    const wasPs = this.ps;
    if (this.p >= PS_OFF) this.ps = false; else if (this.p <= PS_ON) this.ps = true;
    if (wasPs && !this.ps && mode === 'delta') this.produced(this.startClean);

    this.angle += this.n * dt * 0.02;
    this.inputs.F1 = this.f1;
    this.inputs.PS = this.faults.psStuck ? true : this.ps;
    this.inputs.P_Raw = Math.round(Math.min(10, this.p) / 10 * 27648);
    this.inputs.I_Raw = Math.round(Math.min(200, this.I) / 200 * 27648);
    this.trend.step(dt, { I: Math.min(200, this.I), n: this.n * 100, p: this.p });
  }

  visualParts() {
    const p = this.visualBase();
    p.pulley = ((this.angle % 1) + 1) % 1;
    p.needle_P = Math.min(10, this.p) / 10;
    p.needle_A = Math.min(200, this.I) / 200;
    return p;
  }

  getVisual() {
    const v = super.getVisual();
    v.displays = [
      { id: 'I', label: 'Dòng điện', value: Math.round(this.I), unit: 'A', digits: 3 },
      { id: 'p', label: 'Áp suất', value: +this.p.toFixed(1), unit: 'bar', digits: 3 },
      { id: 'n', label: 'Tốc độ', value: Math.round(this.n * 1480), unit: 'v/ph', digits: 4 },
    ];
    v.trend = this.trend.view();
    v.leds.F1 = this.f1;
    return v;
  }
}

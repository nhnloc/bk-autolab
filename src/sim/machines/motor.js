// L02 — Cửa cuốn: động cơ 3 pha đảo chiều bằng 2 contactor, công tắc hành trình, rơ-le nhiệt, cảm biến an toàn
import { Machine } from '../kit.js';

const T_UP = 10000, T_DOWN = 9000, OBST_H = 0.12;

export class Motor extends Machine {
  constructor() {
    super({
      id: 'motor',
      title: 'Cửa cuốn — động cơ 3 pha đảo chiều',
      summary: 'Động cơ 3 pha kéo lô cuốn qua 2 contactor KM1 (lên) và KM2 (xuống). Công tắc hành trình trên/dưới, rơ-le nhiệt F1 và cảm biến quang an toàn ở chân cửa.',
      labs: ['L02'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'S_Up', desc: 'Nút Lên (NO)' },
          { addr: '%I0.6', tag: 'S_Down', desc: 'Nút Xuống (NO)' },
          { addr: '%I0.7', tag: 'F1', desc: 'Rơ-le nhiệt F1 (NC — 1 = bình thường, 0 = quá tải)' },
          { addr: '%I1.0', tag: 'LS_Up', desc: 'Công tắc hành trình trên (1 = cửa mở hết)' },
          { addr: '%I1.1', tag: 'LS_Down', desc: 'Công tắc hành trình dưới (1 = cửa đóng hết)' },
          { addr: '%I1.2', tag: 'PE', desc: 'Cảm biến an toàn chân cửa (1 = có vật cản)' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'KM1', desc: 'Contactor KM1 — động cơ quay thuận (cửa lên)' },
          { addr: '%Q0.3', tag: 'KM2', desc: 'Contactor KM2 — động cơ quay nghịch (cửa xuống)' },
          { addr: '%Q0.4', tag: 'H_Up', desc: 'Đèn báo cửa đang lên' },
          { addr: '%Q0.5', tag: 'H_Down', desc: 'Đèn báo cửa đang xuống' },
        ],
      },
      buttons: [
        { id: 'Up', label: 'Lên ▲', kind: 'momentary', color: 'green' },
        { id: 'Down', label: 'Xuống ▼', kind: 'momentary', color: 'green' },
        { id: 'Obstacle', label: 'Đặt vật cản dưới cửa', kind: 'latching', color: 'grey' },
      ],
      faults: [
        { id: 'jam', label: 'Ray cửa bị kẹt (động cơ quá tải)' },
        { id: 'lsUp', label: 'Công tắc hành trình trên hỏng' },
        { id: 'peDirty', label: 'Cảm biến chân cửa bị bẩn (luôn báo có vật)' },
      ],
      panelDefaults: { Up: false, Down: false, Obstacle: false },
    });
    this.init();
  }

  init() {
    this.pos = 0; this.dir = 0; this.speed = 0; this.drum = 0;
    this.f1 = true; this.heat = 0; this.offAt = -1e9; this.lastDir = 0;
  }

  physics(dt) {
    const k1 = this.act('KM1'), k2 = this.act('KM2');
    if (k1 && k2 && !this.crashed) {
      this.effect('spark', 'out_KM1', 2200); this.effect('spark', 'out_KM2', 2200);
      this.effect('smoke', 'out_KM1', 7000, 0.8); this.effect('breaker', null, 4000);
      this.crash('KM1 và KM2 đóng cùng lúc — ngắn mạch 2 pha, CB nhảy');
    }
    let dir = this.crashed || !this.f1 ? 0 : k1 ? 1 : k2 ? -1 : 0;
    // đảo chiều đột ngột khi động cơ còn quay
    if (dir !== 0 && dir === -this.lastDir && Math.abs(this.speed) > 0.3) { this.stats.defects++; this.log('Đảo chiều khi động cơ còn quay — dòng điện và lực cơ khí rất lớn. Hãy dừng ít nhất 0,5 s trước khi đảo chiều', 'warn'); }
    if (dir !== 0) this.lastDir = dir;
    // động cơ: tăng/giảm tốc
    const target = dir;
    this.speed += Math.sign(target - this.speed) * Math.min(Math.abs(target - this.speed), dt / 300);
    if (dir === 0 && Math.abs(this.speed) < 0.02) this.speed = 0;
    let load = 0;
    const prev = this.pos;
    if (this.speed > 0) this.pos += (this.speed * dt) / T_UP;
    else if (this.speed < 0) this.pos += (this.speed * dt) / T_DOWN;
    if (this.faults.jam && dir !== 0) { this.pos = prev; load = 1; }
    // giới hạn cơ khí
    if (this.pos >= 1) { this.pos = 1; if (dir > 0) load = 1; }
    if (this.pos <= 0) { this.pos = 0; if (dir < 0) load = 1; }
    // vật cản dưới cửa
    if (this.panel.Obstacle && this.pos < OBST_H && dir < 0) { this.pos = Math.max(this.pos, OBST_H - 0.002); if (!this.crashed) this.crash('Cửa đè lên vật cản dưới chân cửa'); }
    // rơ-le nhiệt: tích nhiệt khi kẹt/quá tải, tác động sau ~2,5 s
    this.heat = Math.max(0, this.heat + (load ? dt : -dt * 0.3));
    if (this.heat > 2500 && this.f1) { this.effect('smoke', 'drum', 4000, 0.4); this.f1 = false; this.stats.defects++; this.log('Rơ-le nhiệt F1 tác động: động cơ quá tải (chạy vào giới hạn cơ khí hoặc bị kẹt)', 'error'); }
    if (!this.f1 && this.panel.Reset && this.heat < 1500) { this.f1 = true; this.log('Đã reset rơ-le nhiệt F1', 'info'); }
    // hoàn thành hành trình
    if (prev < 1 && this.pos >= 1) this.produced(true);
    if (prev > 0 && this.pos <= 0) this.produced(true);
    this.drum += this.speed * dt * 0.0003;

    this.inputs.S_Up = this.panel.Up;
    this.inputs.S_Down = this.panel.Down;
    this.inputs.F1 = this.f1;
    this.inputs.LS_Up = !this.faults.lsUp && this.pos >= 0.995;
    this.inputs.LS_Down = this.pos <= 0.005;
    this.inputs.PE = this.faults.peDirty || (this.panel.Obstacle && this.pos > 0.14);
  }

  fxState() { return this.heat > 300 ? [{ id: 'heat', type: 'heat', at: 'drum', intensity: Math.min(1, this.heat / 2500), age: 0 }] : []; }

  visualParts() {
    const p = this.visualBase();
    p.door = this.pos;
    p.drum = ((this.drum % 1) + 1) % 1;
    p.obstacle = this.panel.Obstacle ? 0 : 0;
    p.obstacle_visible = this.panel.Obstacle ? 1 : 0;
    return p;
  }

  getVisual() {
    const v = super.getVisual();
    v.displays = [{ id: 'pos', label: 'Độ mở cửa', value: Math.round(this.pos * 100), unit: '%', digits: 3 }];
    return v;
  }
}

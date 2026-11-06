// Bộ linh kiện mô phỏng dùng chung: xi lanh, van, băng tải, bảng nút, lớp máy cơ sở.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
let uid = 1;
export const newId = (p = 'it') => `${p}${uid++}`;

/**
 * Xi lanh khí nén + van.
 * valve: 'mono' (5/2 đơn cuộn, lò xo hồi), 'bi' (5/2 kép cuộn, nhớ trạng thái), '53c' (5/3 tâm kín: không cuộn nào = dừng)
 */
export class Cylinder {
  constructor(name, { stroke = 100, tOut = 500, tIn = 450, valve = 'mono', label = '' } = {}) {
    Object.assign(this, { name, stroke, tOut, tIn, valve, label });
    this.pos = 0; this.vel = 0; this.mem = 0; this.blockedAt = null;
    this.fault = { stuck: false, slow: false, b1: false, b2: false, leak: false };
  }
  /** y1, y2: cuộn van. air: có khí. limit: (posMới) → posĐượcPhép (vật cản). */
  step(dt, y1, y2, air = true, limit = null) {
    let dir;
    if (this.valve === 'mono') dir = y1 ? 1 : -1;
    else if (this.valve === 'bi') { if (y1 && !y2) this.mem = 1; else if (y2 && !y1) this.mem = -1; dir = this.mem || -1; }
    else dir = y1 && !y2 ? 1 : y2 && !y1 ? -1 : 0;
    if (!air || this.fault.stuck) dir = 0;
    if (this.fault.leak && dir === 1 && this.pos > 0.6) dir = 0;
    const slow = this.fault.slow ? 3 : 1;
    const t = (dir > 0 ? this.tOut : this.tIn) * slow;
    let np = this.pos + (dir * dt) / t;
    np = clamp(np);
    if (limit) np = limit(np, this.pos);
    this.vel = (np - this.pos) / dt;
    this.pos = np;
  }
  get b1() { return this.fault.b1 ? false : this.pos <= 0.02; }   // lùi
  get b2() { return this.fault.b2 ? false : this.pos >= 0.98; }   // ra
  get moving() { return Math.abs(this.vel) > 1e-6; }
  reset() { this.pos = 0; this.vel = 0; this.mem = 0; }
}

/** Động cơ băng tải/biến tần với ramp. speed mm/s danh định. */
export class Drive {
  constructor({ speed = 250, rampMs = 300 } = {}) { this.nominal = speed; this.rampMs = rampMs; this.v = 0; this.offset = 0; this.fault = { trip: false }; }
  step(dt, run, ratio = 1) {
    const target = run && !this.fault.trip ? this.nominal * clamp(ratio, 0, 1.2) : 0;
    const dv = (this.nominal / this.rampMs) * dt;
    this.v = this.v < target ? Math.min(target, this.v + dv) : Math.max(target, this.v - dv);
    this.offset += (this.v * dt) / 1000;
    return (this.v * dt) / 1000; // mm đi được
  }
  reset() { this.v = 0; this.offset = 0; }
}

/** Di chuyển các vật trên một đường 1D (băng tải) với va chạm/tích lũy. items: {x (tâm), len}. stops(item) → x mặt trước tối đa. */
export function advanceLine(items, dx, stops) {
  const sorted = [...items].sort((a, b) => b.x - a.x);
  let aheadRear = Infinity;
  for (const it of sorted) {
    let maxFront = aheadRear;
    const s = stops ? stops(it) : Infinity;
    if (s < maxFront) maxFront = s;
    const front = it.x + it.len / 2;
    const nf = Math.min(front + dx, Math.max(front, maxFront));
    it.x = nf - it.len / 2;
    aheadRear = it.x - it.len / 2;
  }
}

/** Cảm biến quang/tiệm cận dạng điểm trên trục X: có vật che? */
export const beam = (items, x, filter) => items.some((it) => (!filter || filter(it)) && Math.abs(it.x - x) <= it.len / 2);

export const PANEL_INPUTS = [
  { addr: '%I0.0', tag: 'Start', desc: 'Nút Start (NO)' },
  { addr: '%I0.1', tag: 'Stop', desc: 'Nút Stop (NC — bình thường = 1)' },
  { addr: '%I0.2', tag: 'Reset', desc: 'Nút Reset lỗi (NO)' },
  { addr: '%I0.3', tag: 'EStop', desc: 'Dừng khẩn (NC — bình thường = 1)' },
  { addr: '%I0.4', tag: 'AutoMan', desc: 'Công tắc chế độ (1 = Auto, 0 = Manual)' },
];
export const PANEL_OUTPUTS = [
  { addr: '%Q0.0', tag: 'H_Run', desc: 'Đèn chạy (xanh)' },
  { addr: '%Q0.1', tag: 'H_Fault', desc: 'Đèn lỗi (đỏ)' },
];
export const PANEL_BUTTONS = [
  { id: 'Start', label: 'Start', kind: 'momentary', color: 'green' },
  { id: 'Stop', label: 'Stop', kind: 'momentary', color: 'red' },
  { id: 'Reset', label: 'Reset', kind: 'momentary', color: 'blue' },
  { id: 'EStop', label: 'Dừng khẩn', kind: 'latching', color: 'estop' },
  { id: 'AutoMan', label: 'Auto / Man', kind: 'selector', color: 'black' },
];

/**
 * Lớp máy cơ sở. Lớp con khai báo def (ioMap gồm cả bảng nút), cylinders, drives và hiện thực
 * physics(dt) dùng this.out(tag) và cập nhật this.inputs[tag].
 */
export class Machine {
  constructor(def) {
    this.panelDefaults = def.panelDefaults || {};
    this.def = {
      ...def,
      ioMap: { inputs: [...PANEL_INPUTS, ...def.ioMap.inputs], outputs: [...PANEL_OUTPUTS, ...def.ioMap.outputs] },
      buttons: [...PANEL_BUTTONS, ...(def.buttons || [])],
      faults: [
        { id: 'noAir', label: 'Mất khí nén' },
        ...(def.faults || []),
      ],
    };
    this.inputs = {}; this.outputs = {};
    for (const io of this.def.ioMap.inputs) this.inputs[io.tag] = io.type && io.type !== 'Bool' ? 0 : false;
    for (const io of this.def.ioMap.outputs) this.outputs[io.tag] = io.type && io.type !== 'Bool' ? 0 : false;
    this.faults = {}; for (const f of this.def.faults) this.faults[f.id] = false;
    this.events = [];        // nhật ký sự cố cơ khí (va chạm, kẹt…) cho HMI & chấm bài
    this.items = [];
    this.time = 0;
    this.panel = { Start: false, Stop: false, Reset: false, EStop: false, AutoMan: true, ...this.panelDefaults };
    this.stats = { produced: 0, rejected: 0, defects: 0, crashes: 0, cycleTimeMs: 0 };
    this.crashed = null;     // máy đứng do va chạm: { message }
  }

  /* ---- API cho UI ---- */
  press(id, down) {
    const b = this.def.buttons.find((x) => x.id === id);
    if (!b) return;
    if (b.kind === 'latching') { if (down) this.panel[id] = !this.panel[id]; }
    else if (b.kind === 'selector') { if (down) this.panel[id] = !this.panel[id]; }
    else this.panel[id] = !!down;
    if (b.action && down) this.action(b.action);
  }
  action() {}
  setFault(id, on) {
    if (!(id in this.faults)) return;
    this.faults[id] = !!on;
    this.applyFault(id, !!on);
    this.log(on ? `Giảng viên bật lỗi: ${this.def.faults.find((f) => f.id === id).label}` : `Tắt lỗi: ${id}`, 'info');
  }
  /** Lỗi dạng "<cyl>:<kind>" tự động áp lên xi lanh. */
  applyFault(id, on) {
    const m = id.match(/^cyl_(\w+)_(stuck|slow|b1|b2|leak)$/);
    if (m && this.cyl[m[1]]) this.cyl[m[1]].fault[m[2]] = on;
  }
  reset() {
    this.items = []; this.events = []; this.crashed = null; this._fx = [];
    this.stats = { produced: 0, rejected: 0, defects: 0, crashes: 0, cycleTimeMs: 0 };
    for (const c of Object.values(this.cyl || {})) c.reset();
    for (const d of Object.values(this.drives || {})) d.reset();
    this.init();
    for (const [id, on] of Object.entries(this.faults)) if (on) this.applyFault(id, true);
  }
  /** Ghi nhận một sản phẩm hoàn thành, tính thời gian chu kỳ. */
  produced(ok = true) {
    if (ok) this.stats.produced++; else this.stats.defects++;
    if (this._lastDone !== undefined) this.stats.cycleTimeMs = Math.round(this.time - this._lastDone);
    this._lastDone = this.time;
  }
  init() {}

  /* ---- bên trong ---- */
  out(tag) { return this.outputs[tag]; }
  get safetyOk() { return !this.panel.EStop && (this.doorOk ?? true); }
  get air() { return !this.faults.noAir; }
  log(message, level = 'warn') {
    this.events.push({ t: this.time, message, level });
    if (this.events.length > 200) this.events.shift();
  }
  /** Hiệu ứng trực quan (minh họa hậu quả): type spark|smoke|steam|impact|breaker; at = tên node 3D hoặc null. */
  effect(type, at = null, ms = 2500, intensity = 1) {
    (this._fx ||= []).push({ id: (this._fxId = (this._fxId || 0) + 1), type, at, t0: this.time, ms, intensity });
    if (this._fx.length > 40) this._fx.shift();
  }
  /** Hiệu ứng liên tục theo trạng thái (vd. động cơ nóng) — lớp con ghi đè. */
  fxState() { return []; }
  crash(message) {
    if (this.crashed) return;
    this.effect('impact', this.crashAt || null, 1600, 1);
    this.crashed = { message, t: this.time };
    this.stats.crashes++;
    this.log('VA CHẠM: ' + message, 'error');
  }
  step(dt, t) {
    this.time = t;
    this.inputs.Start = this.panel.Start;
    this.inputs.Stop = !this.panel.Stop;
    this.inputs.Reset = this.panel.Reset;
    this.inputs.EStop = !this.panel.EStop;
    this.inputs.AutoMan = this.panel.AutoMan;
    // Rơ-le an toàn: khi dừng khẩn / mở cửa, cắt nguồn 24 V cấp cho van & contactor
    this.powerOk = this.safetyOk;
    this._dt = dt;
    this.physics(dt);
    this.syncCyl();
    if (this.crashed && this.panel.Reset && this.allHome()) { this.crashed = null; this.log('Đã giải trừ va chạm', 'info'); }
  }
  /** Đầu ra cấp cho cơ cấu chấp hành (bị cắt khi an toàn ngắt hoặc máy đang kẹt). */
  act(tag) { return this.powerOk && !this.crashed && !!this.outputs[tag]; }
  allHome() { return Object.values(this.cyl || {}).every((c) => c.pos < 0.5); }
  stepCyl(key, y1, y2, limit) {
    const c = this.cyl[key];
    const a = this.crashed ? false : this.powerOk;
    c.step(this._dt, a && y1, a && y2, this.air, limit);
    return c;
  }
  /** Ghi cảm biến hành trình nB1/nB2 cho mọi xi lanh khóa 'nA'. */
  syncCyl() {
    for (const [k, c] of Object.entries(this.cyl || {})) {
      const n = k.replace(/A$/, '');
      if (n + 'B1' in this.inputs) this.inputs[n + 'B1'] = c.b1;
      if (n + 'B2' in this.inputs) this.inputs[n + 'B2'] = c.b2;
    }
  }
  /** Lỗi xi lanh chuẩn để giảng viên cài. */
  static cylFaults(keys) {
    const out = [];
    for (const k of keys) {
      out.push({ id: `cyl_${k}_stuck`, label: `Xi lanh ${k} bị kẹt` });
      out.push({ id: `cyl_${k}_slow`, label: `Xi lanh ${k} chạy chậm (tiết lưu sai)` });
      out.push({ id: `cyl_${k}_b2`, label: `Cảm biến ${k.replace('A', 'B2')} hỏng` });
    }
    return out;
  }
  cylLeds() {
    const leds = {};
    for (const [k, c] of Object.entries(this.cyl || {})) { leds[k + 'B1'] = c.b1; leds[k + 'B2'] = c.b2; }
    return leds;
  }
  visualBase() {
    const parts = {};
    for (const b of this.def.buttons) if (!PANEL_BUTTONS.some((x) => x.id === b.id)) parts['btn_' + b.id] = this.panel[b.id] ? 1 : 0;
    for (const [k, c] of Object.entries(this.cyl || {})) parts[c.node || `cyl_${k}_rod`] = c.pos;
    return parts;
  }
  getVisual() {
    const leds = {};
    for (const io of this.def.ioMap.inputs) if (typeof this.inputs[io.tag] === 'boolean') leds[io.tag] = this.inputs[io.tag];
    return {
      parts: this.visualParts(),
      items: this.items.map((it) => ({ ...it })),
      leds,
      belts: this.beltOffsets ? this.beltOffsets() : {},
      crashed: this.crashed,
      lamps: { run: !!this.outputs.H_Run, fault: !!this.outputs.H_Fault },
      effects: [
        ...(this._fx || []).filter((f) => this.time - f.t0 < f.ms).map((f) => ({ id: f.id, type: f.type, at: f.at, intensity: f.intensity, age: (this.time - f.t0) / f.ms })),
        ...this.fxState(),
      ],
      outs: Object.fromEntries(this.def.ioMap.outputs.filter((o) => !o.type || o.type === 'Bool').map((o) => [o.tag, !!this.outputs[o.tag]])),
    };
  }
  visualParts() { return this.visualBase(); }
}

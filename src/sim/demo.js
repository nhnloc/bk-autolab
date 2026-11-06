// Chạy thử mẫu: phát lại "băng ghi" (trace) đầu ra PLC lên máy mô phỏng thật.
// Trace được ghi sẵn từ lời giải mẫu bằng tools/record-demos.mjs (máy giảng viên) → sinh viên xem máy vận hành
// mà không cần (và không thấy) chương trình mẫu. Mô phỏng có yếu tố ngẫu nhiên (thời điểm sinh thùng, mã…) nên
// lúc ghi và lúc phát dùng cùng một bộ sinh số ngẫu nhiên có seed → máy chạy y hệt từng mili-giây.
import { createMachine } from './index.js';

/** PRNG mulberry32 — tất định theo seed. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chạy fn với Math.random tạm thay bằng rnd. */
export function withRandom(rnd, fn) {
  const orig = Math.random;
  Math.random = rnd;
  try { return fn(); } finally { Math.random = orig; }
}

/**
 * Trình phát trace. trace = { v:1, machineId, seed, stepMs, durMs, events:[[k, kind, …]] }
 *   k: số bước vật lý đã chạy xong khi sự kiện xảy ra
 *   ['o', {tag: value}]   đầu ra PLC đổi
 *   ['p', id, down]       nhấn/nhả nút trên bảng
 *   ['n', {vi, en}]       chú thích cho người xem
 */
export class DemoPlayer {
  constructor(trace) {
    this.trace = trace;
    this.stepMs = trace.stepMs || 1;
    this.durMs = trace.durMs;
    this.rnd = seededRandom(trace.seed);
    this.m = withRandom(this.rnd, () => createMachine(trace.machineId));
    this.m.plc = this;
    this.k = 0;          // số bước đã chạy
    this.ei = 0;         // chỉ số sự kiện kế tiếp
    this._accum = 0;
    this.listeners = new Set();
  }
  /** Gọi cb(ev) cho mỗi sự kiện được phát (để giao diện ghi nhật ký). */
  onEvent(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  get timeMs() { return this.k * this.stepMs; }
  get done() { return this.k * this.stepMs >= this.durMs; }
  // Bảng I/O đọc giá trị thẳng từ máy; giao diện coi "PLC" của phiên chạy thử luôn ở RUN.
  get state() { return this.done ? 'STOP' : 'RUN'; }
  read() { return undefined; }

  _apply() {
    const evs = this.trace.events;
    while (this.ei < evs.length && evs[this.ei][0] <= this.k) {
      const ev = evs[this.ei++];
      if (ev[1] === 'o') Object.assign(this.m.outputs, ev[2]);
      else if (ev[1] === 'p') this.m.press(ev[2], ev[3]);
      for (const cb of this.listeners) { try { cb(ev); } catch (e) { console.error(e); } }
    }
  }
  /** Chạy thêm ms mili-giây thời gian mô phỏng. */
  advance(ms) {
    this._accum += ms;
    withRandom(this.rnd, () => {
      while (this._accum >= this.stepMs && !this.done) {
        this._accum -= this.stepMs;
        this._apply();
        this.m.step(this.stepMs, (this.k + 1) * this.stepMs);
        this.k++;
      }
      if (this.done) { this._apply(); this._accum = 0; }
    });
  }
}

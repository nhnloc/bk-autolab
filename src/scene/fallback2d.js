// Dự phòng khi máy không có WebGL: sơ đồ nhìn từ trên (canvas 2D) — vật liệu, vị trí cơ cấu, LED cảm biến.
import { loadManifest } from './viewer.js';

export class Fallback2D {
  constructor(container, { machineId } = {}) {
    this.container = container; this.machineId = machineId; this.source = null; this.isPlaceholder = false; this.disposed = false;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'viewer-canvas';
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'Sơ đồ 2D của máy (không có WebGL)');
    container.appendChild(this.canvas);
    this.box = [[-100, -700], [1600, 900]];
    this._loop = this._loop.bind(this); this._raf = requestAnimationFrame(this._loop);
  }
  async load() {
    const mf = await loadManifest();
    const b = mf?.machines?.[this.machineId]?.bboxFC;
    if (b) this.box = [[b[0][0], b[0][1]], [b[1][0], b[1][1]]];
  }
  setSource(fn) { this.source = fn; }
  setView() {}
  applyTheme() {}
  _loop() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(this._loop);
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    const c = this.canvas; if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const v = this.source?.() || {};
    const g = c.getContext('2d');
    const dark = document.documentElement.dataset.theme === 'dark';
    g.fillStyle = dark ? '#1b2229' : '#e4e9ee'; g.fillRect(0, 0, w, h);
    // khung nhìn
    let [[x0, y0], [x1, y1]] = this.box;
    for (const it of v.items || []) { x0 = Math.min(x0, it.x - 200); x1 = Math.max(x1, it.x + 200); y0 = Math.min(y0, it.y - 200); y1 = Math.max(y1, it.y + 200); }
    const pad = 30, top = 70;
    const s = Math.min((w - 2 * pad) / (x1 - x0), (h - top - 120) / (y1 - y0));
    const X = (x) => pad + (x - x0) * s, Y = (y) => top + (y1 - y) * s;
    g.strokeStyle = dark ? '#3a4652' : '#c3cbd3'; g.lineWidth = 1;
    for (let gx = Math.ceil(x0 / 500) * 500; gx < x1; gx += 500) { g.beginPath(); g.moveTo(X(gx), Y(y0)); g.lineTo(X(gx), Y(y1)); g.stroke(); }
    g.fillStyle = dark ? '#9aa8b5' : '#5b6876'; g.font = '12px system-ui';
    g.fillText('Không có WebGL — sơ đồ nhìn từ trên (mm). Hãy bật tăng tốc phần cứng để xem 3D.', 10, 18);
    for (const it of v.items || []) {
      const [l, wd] = it.size || [100, 100];
      g.save(); g.translate(X(it.x), Y(it.y)); g.rotate(-((it.rotZ || 0) * Math.PI) / 180);
      g.fillStyle = it.color || (it.kind === 'carton' ? '#c8a273' : '#b98b55');
      if (it.kind === 'puck' || it.kind === 'part') { g.beginPath(); g.arc(0, 0, (l / 2) * s, 0, Math.PI * 2); g.fill(); }
      else { g.fillRect((-l / 2) * s, (-wd / 2) * s, l * s, wd * s); g.strokeStyle = '#0006'; g.strokeRect((-l / 2) * s, (-wd / 2) * s, l * s, wd * s); }
      if (it.label) { g.fillStyle = '#fff'; g.fillText(String(it.label), -4, 4); }
      g.restore();
    }
    // cơ cấu + LED
    const parts = Object.entries(v.parts || {}).filter(([k]) => !/^belt|^rollers/.test(k));
    let px = 10; const py = h - 100;
    g.font = '11px ui-monospace, monospace';
    for (const [k, val] of parts) {
      g.fillStyle = dark ? '#dbe3ea' : '#1c2631'; g.fillText(k, px, py);
      g.fillStyle = dark ? '#33404c' : '#cfd5db'; g.fillRect(px, py + 4, 90, 8);
      g.fillStyle = '#00708c'; g.fillRect(px, py + 4, 90 * Math.max(0, Math.min(1, +val || 0)), 8);
      px += 110; if (px > w - 100) break;
    }
    let lx = 10; const ly = h - 50;
    for (const [tag, on] of Object.entries(v.leds || {})) {
      g.beginPath(); g.arc(lx + 6, ly, 6, 0, Math.PI * 2); g.fillStyle = on ? '#2fd15a' : (dark ? '#3a424b' : '#9aa3ad'); g.fill();
      g.fillStyle = dark ? '#dbe3ea' : '#1c2631'; g.fillText(tag, lx + 15, ly + 4);
      lx += 24 + g.measureText(tag).width; if (lx > w - 60) break;
    }
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this._raf); this.canvas.remove(); }
}

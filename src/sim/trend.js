// Bộ ghi xu hướng (trend) cho getVisual().trend
export class Trend {
  constructor(series, { dtMs = 100, points = 600 } = {}) {
    this.dtMs = dtMs; this.points = points; this.acc = 0;
    this.series = series.map((s) => ({ ...s, data: [] }));
  }
  step(dt, values) {
    this.acc += dt;
    if (this.acc < this.dtMs) return;
    this.acc -= this.dtMs;
    for (const s of this.series) { s.data.push(+(values[s.id] ?? 0).toFixed(3)); if (s.data.length > this.points) s.data.shift(); }
  }
  clear() { for (const s of this.series) s.data = []; }
  view() { return { dtMs: this.dtMs, series: this.series.map((s) => ({ ...s, data: s.data.slice() })) }; }
}

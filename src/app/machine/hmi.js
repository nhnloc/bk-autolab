// HMI vận hành chung cho mọi máy (phong cách màn hình cảm ứng công nghiệp):
// Tổng quan (mimic 2D) · Chạy tay · Cảnh báo · Thống kê.
import { h, svg, fmtValue } from '../dom.js';
import { t } from '../i18n.js';
import { machineIo } from '../engine.js';
import { ioValue } from './ioState.js';

const STAT_LABELS = { produced: 'Sản phẩm đạt', rejected: 'Loại bỏ', defects: 'Lỗi', crashes: 'Va chạm', cycleTimeMs: 'Chu kỳ (ms)', running: 'Đang chạy' };

export function createHmi({ m, getPlc, title }) {
  const { inputs, outputs } = machineIo(m.def);
  const cyls = [];
  for (const o of outputs) {
    const mm = /^(\d)Y1$/.exec(o.tag); if (!mm) continue;
    const n = mm[1];
    cyls.push({ n, y1: o, y2: outputs.find((x) => x.tag === n + 'Y2'), b1: inputs.find((x) => x.tag === n + 'B1'), b2: inputs.find((x) => x.tag === n + 'B2') });
  }
  const motors = outputs.filter((o) => /^M\d/.test(o.tag) && o.type === 'Bool');
  const sensors = inputs.filter((i) => i.type === 'Bool' && !/^(Start|Stop|Reset|EStop|AutoMan)$/.test(i.tag) && !/^\dB\d$/.test(i.tag));
  const forced = new Map();
  let screen = 'overview';
  const acked = new Set();

  const hdrMode = h('span.hmi-pill'), hdrState = h('span.hmi-pill'), clock = h('span.hmi-clock');
  const content = h('div.hmi-content');
  const navBtns = [['overview', t('hmi.overview')], ['manual', t('hmi.manual')], ['alarms', t('hmi.alarms')], ['stats', t('hmi.stats')]].map(([id, l]) =>
    h('button.hmi-nav', { type: 'button', dataset: { id }, onclick: () => { screen = id; build(); } }, l));
  const alarmCnt = h('span.hmi-badge', { hidden: true });
  navBtns[2].append(alarmCnt);
  const el = h('div.hmi-wrap', h('div.hmi-bezel', h('div.hmi-brand', 'BK-AutoLab HMI · 12"'),
    h('div.hmi-screen',
      h('div.hmi-header', h('b', title || m.def?.title || 'HMI'), h('span.spacer'), hdrMode, hdrState, clock),
      content,
      h('div.hmi-footer', navBtns))));

  /* ---------- Tổng quan ---------- */
  let dyn = [];
  function overview() {
    const W = 760, H = 330;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mimic', role: 'img', 'aria-label': t('hmi.overview') });
    dyn = [];
    // băng tải
    s.appendChild(svg('rect', { x: 30, y: 210, width: W - 60, height: 26, rx: 13, class: 'mm-belt' }));
    for (let x = 50; x < W - 40; x += 40) s.appendChild(svg('line', { x1: x, y1: 212, x2: x, y2: 234, class: 'mm-belt-l' }));
    // động cơ
    motors.forEach((mo, i) => {
      const cx = 60 + i * 70, cy = 275;
      const c = svg('circle', { cx, cy, r: 17, class: 'mm-motor' });
      s.append(c, svg('text', { x: cx, y: cy + 5, class: 'mm-t', 'text-anchor': 'middle' }, 'M'), svg('text', { x: cx, y: cy + 34, class: 'mm-s', 'text-anchor': 'middle' }, mo.tag));
      dyn.push(() => c.classList.toggle('on', !!ioValue(mo, m, getPlc())));
    });
    // xi lanh
    const n = cyls.length || 1;
    cyls.forEach((c, i) => {
      const x = 80 + ((i + 0.5) * (W - 160)) / n, y = 60;
      const body = svg('rect', { x: x - 14, y, width: 28, height: 70, rx: 3, class: 'mm-cyl' });
      const rod = svg('rect', { x: x - 4, y: y + 70, width: 8, height: 20, class: 'mm-rod' });
      const head = svg('rect', { x: x - 18, y: y + 90, width: 36, height: 8, class: 'mm-rod' });
      const sol = svg('rect', { x: x + 16, y: y + 8, width: 12, height: 18, class: 'mm-sol' });
      const l1 = svg('circle', { cx: x - 24, cy: y + 12, r: 5, class: 'mm-led' });
      const l2 = svg('circle', { cx: x - 24, cy: y + 58, r: 5, class: 'mm-led' });
      s.append(body, rod, head, sol, l1, l2,
        svg('text', { x, y: y - 10, class: 'mm-t', 'text-anchor': 'middle' }, c.n + 'A'),
        svg('text', { x: x - 32, y: y + 16, class: 'mm-s', 'text-anchor': 'end' }, c.b1 ? c.n + 'B1' : ''),
        svg('text', { x: x - 32, y: y + 62, class: 'mm-s', 'text-anchor': 'end' }, c.b2 ? c.n + 'B2' : ''));
      dyn.push(() => {
        const plc = getPlc();
        const out = !!ioValue(c.y1, m, plc);
        const b1 = c.b1 ? !!ioValue(c.b1, m, plc) : false, b2 = c.b2 ? !!ioValue(c.b2, m, plc) : false;
        const ext = b2 ? 1 : b1 ? 0 : 0.5;
        rod.setAttribute('height', String(20 + ext * 50)); head.setAttribute('y', String(y + 90 + ext * 50));
        sol.classList.toggle('on', out); l1.classList.toggle('on', b1); l2.classList.toggle('on', b2);
      });
    });
    // cảm biến
    sensors.forEach((se, i) => {
      const x = 40 + (i * (W - 80)) / Math.max(1, sensors.length - 1), y = 190;
      const c = svg('circle', { cx: x, cy: y, r: 7, class: 'mm-sen' });
      s.append(c, svg('text', { x, y: y - 12, class: 'mm-s', 'text-anchor': 'middle' }, se.tag));
      dyn.push(() => c.classList.toggle('on', !!ioValue(se, m, getPlc())));
    });
    const kpi = h('div.hmi-kpis');
    dyn.push(() => {
      const st = m.stats || {};
      kpi.replaceChildren(...['produced', 'rejected', 'cycleTimeMs'].filter((k) => k in st).map((k) => h('div.hmi-kpi', h('span', STAT_LABELS[k] || k), h('b', fmtValue(st[k])))));
    });
    return h('div.hmi-ov', s, kpi);
  }

  /* ---------- Chạy tay ---------- */
  function manual() {
    const isMan = () => !(m.panel?.AutoMan ?? true);
    const warn = h('div.hmi-warn');
    const rows = outputs.filter((o) => !/^H_/.test(o.tag) && o.type === 'Bool').map((o) => {
      const led = h('span.hmi-led');
      const b = h('button.hmi-btn', { type: 'button', onclick: () => {
        const plc = getPlc(); if (!plc || !isMan()) return;
        const cur = forced.get(o.addr);
        try {
          if (cur) { plc.unforce(o.addr); forced.delete(o.addr); } else { plc.force(o.addr, true); forced.set(o.addr, true); }
        } catch (e) { console.warn(e); }
        tick();
      } });
      dyn.push(() => { const on = forced.get(o.addr) || !!ioValue(o, m, getPlc()); led.classList.toggle('on', on); b.textContent = forced.get(o.addr) ? t('hmi.off') : t('hmi.on'); b.disabled = !isMan() || !getPlc(); b.classList.toggle('active', !!forced.get(o.addr)); });
      return h('div.hmi-man-row', led, h('span.hmi-man-tag', o.tag), h('span.hmi-man-desc', o.desc), b);
    });
    dyn.push(() => { warn.textContent = isMan() ? t('hmi.manOk') : t('hmi.manNeed'); warn.classList.toggle('ok', isMan()); });
    return h('div.hmi-man', warn, h('div.hmi-man-list', rows));
  }

  /* ---------- Cảnh báo ---------- */
  function alarmsList() {
    const list = [];
    const ev = Array.isArray(m.events) ? m.events : [];
    ev.forEach((e, i) => { if (e.level === 'warn' || e.level === 'error') list.push({ key: 'ev' + i + (e.t ?? ''), t: e.t, text: e.message, level: e.level }); });
    const plc = getPlc();
    const estop = inputs.find((x) => x.tag === 'EStop');
    if (estop && ioValue(estop, m, plc) === false) list.push({ key: 'estop', text: t('hmi.alEstop'), level: 'error', active: true });
    if (m.crashed) list.push({ key: 'crash', text: t('op.crashed') + ' ' + (m.crashed.message || ''), level: 'error', active: true });
    if (plc && plc.state !== 'RUN') list.push({ key: 'stop', text: t('hmi.alPlcStop'), level: 'warn', active: true });
    return list;
  }
  function alarms() {
    const body = h('tbody');
    const box = h('div.hmi-alarms', h('table.hmi-table', h('thead', h('tr', h('th', t('hmi.alTime')), h('th', t('hmi.alText')), h('th', t('hmi.alState')))), body),
      h('div.hmi-al-act', h('button.hmi-btn', { type: 'button', onclick: () => { for (const a of alarmsList()) acked.add(a.key); tick(); } }, t('hmi.ack'))));
    let sig = '';
    dyn.push(() => {
      const list = alarmsList().slice(-40).reverse();
      const s2 = list.map((a) => a.key + acked.has(a.key)).join('|');
      if (s2 === sig) return; sig = s2;
      body.replaceChildren(...(list.length ? list.map((a) => h('tr', { class: [a.level, acked.has(a.key) && 'acked'] },
        h('td.mono', a.t !== undefined ? (a.t / 1000).toFixed(1) + ' s' : '—'), h('td', a.text), h('td', a.active ? t('hmi.active') : acked.has(a.key) ? t('hmi.acked') : t('hmi.unacked')))) : [h('tr', h('td', { colspan: 3 }, t('hmi.noAlarm')))]));
    });
    return box;
  }

  /* ---------- Thống kê ---------- */
  function stats() {
    const body = h('tbody');
    dyn.push(() => {
      const st = m.stats || {};
      const v = m.getVisual?.() || {};
      const extra = {};
      if (v.drive) { extra['Tốc độ biến tần (%)'] = v.drive.speedPct; extra['Lỗi biến tần'] = v.drive.fault || '—'; }
      if (v.magazine) extra['Ổ chứa carton'] = `${v.magazine.count}/${v.magazine.capacity}`;
      const plc = getPlc();
      if (plc) { extra['Thời gian quét (ms)'] = (+plc.scanTimeMs || 0).toFixed(2); extra['Chu kỳ PLC'] = plc.cycle; }
      body.replaceChildren(...[...Object.entries(st).map(([k, val]) => [STAT_LABELS[k] || k, val]), ...Object.entries(extra)].map(([k, val]) => h('tr', h('td', k), h('td.num.mono', fmtValue(val)))));
    });
    return h('div.hmi-stats', h('table.hmi-table', body));
  }

  function build() {
    dyn = [];
    navBtns.forEach((b) => b.classList.toggle('active', b.dataset.id === screen));
    content.replaceChildren(screen === 'overview' ? overview() : screen === 'manual' ? manual() : screen === 'alarms' ? alarms() : stats());
    tick();
  }
  function tick() {
    const auto = m.panel?.AutoMan ?? true;
    hdrMode.textContent = auto ? 'AUTO' : 'MAN'; hdrMode.className = 'hmi-pill ' + (auto ? 'auto' : 'man');
    const plc = getPlc();
    const st = plc?.state || 'STOP';
    hdrState.textContent = st; hdrState.className = 'hmi-pill ' + (st === 'RUN' ? 'run' : 'stop');
    clock.textContent = new Date().toLocaleTimeString('vi-VN');
    const n = alarmsList().filter((a) => !acked.has(a.key)).length;
    alarmCnt.hidden = !n; alarmCnt.textContent = String(n);
    dyn.forEach((f) => f());
  }
  build();
  const timer = setInterval(() => { if (el.isConnected && el.offsetParent !== null) tick(); }, 200);
  return {
    el,
    dispose() { clearInterval(timer); const plc = getPlc(); for (const a of forced.keys()) { try { plc?.unforce(a); } catch { /* bỏ qua */ } } },
  };
}

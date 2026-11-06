// Bảng nút vận hành 2D: Start/Stop/Reset, nấm dừng khẩn (giữ trạng thái), công tắc Auto/Man, đèn Run/Fault,
// cộng các nút riêng của máy (Refill, Feed, Door…). Gọi m.press(id, down).
import { h } from '../dom.js';
import { t } from '../i18n.js';

const DEFAULT_BUTTONS = [
  { id: 'Start', label: 'Start', kind: 'momentary', color: 'green' },
  { id: 'Stop', label: 'Stop', kind: 'momentary', color: 'red' },
  { id: 'Reset', label: 'Reset', kind: 'momentary', color: 'blue' },
  { id: 'EStop', label: 'Dừng khẩn', kind: 'latching', color: 'estop' },
  { id: 'AutoMan', label: 'Auto / Man', kind: 'selector', color: 'black' },
];

export function createOperatorPanel({ m, getVisual, readOnly = false }) {
  const buttons = (m.def?.buttons?.length ? m.def.buttons : DEFAULT_BUTTONS);
  const panel = () => m.panel || {};
  const els = [];
  const lampRun = h('span.lamp.green', { role: 'img', 'aria-label': 'H_Run' });
  const lampFault = h('span.lamp.red', { role: 'img', 'aria-label': 'H_Fault' });

  const press = (id, down) => { try { m.press(id, down); } catch (e) { console.warn(e); } };

  function momentary(b) {
    const el = h('button.pb', { type: 'button', class: 'c-' + (b.color || 'grey'), title: b.label || b.id, disabled: readOnly, 'aria-label': b.label || b.id });
    const down = (e) => { e.preventDefault(); el.classList.add('down'); press(b.id, true); el.setPointerCapture?.(e.pointerId); };
    const up = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); press(b.id, false); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); el.classList.add('down'); press(b.id, true); } });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    return h('div.pb-wrap', el, h('span.pb-l', b.label || b.id));
  }
  function latching(b) {
    const el = h('button.estop', { type: 'button', 'aria-pressed': 'false', disabled: readOnly, title: t('op.estopTip'), 'aria-label': b.label || 'E-Stop',
      onclick: () => { press(b.id, true); press(b.id, false); refresh(); } }, h('span.estop-cap'));
    els.push(() => { const on = !!panel()[b.id]; el.setAttribute('aria-pressed', String(on)); el.classList.toggle('latched', on); });
    return h('div.pb-wrap', h('div.estop-ring', el), h('span.pb-l', b.label || 'E-Stop'));
  }
  function selector(b) {
    const el = h('button.selsw', { type: 'button', disabled: readOnly, title: t('op.selTip'), 'aria-label': b.label || b.id,
      onclick: () => { press(b.id, true); press(b.id, false); refresh(); } }, h('span.selsw-knob'));
    const lbl = h('span.sel-pos');
    els.push(() => { const auto = !!panel()[b.id]; el.classList.toggle('auto', auto); lbl.textContent = auto ? 'AUTO' : 'MAN'; el.setAttribute('aria-pressed', String(auto)); });
    return h('div.pb-wrap', h('div.sel-scale', h('span', 'MAN'), h('span', 'AUTO')), el, h('span.pb-l', lbl));
  }

  const main = buttons.filter((b) => ['Start', 'Stop', 'Reset', 'EStop', 'AutoMan'].includes(b.id));
  const extra = buttons.filter((b) => !main.includes(b));
  const build = (b) => (b.kind === 'latching' ? latching(b) : b.kind === 'selector' ? selector(b) : momentary(b));

  const crash = h('div.crash-msg', { role: 'alert', hidden: true });
  const el = h('section.op-panel', { 'aria-label': t('op.title') },
    h('div.op-title', t('op.title')),
    h('div.op-row', h('div.lamp-wrap', lampRun, h('span.pb-l', 'Run')), h('div.lamp-wrap', lampFault, h('span.pb-l', 'Fault')), ...main.map(build)),
    extra.length ? h('div.op-row.extra', ...extra.map(build)) : null,
    crash);

  function refresh() {
    els.forEach((f) => f());
    const v = getVisual?.();
    const run = v?.lamps ? v.lamps.run : !!(m.outputs?.H_Run ?? m.outputs?.['%Q0.0']);
    const fault = v?.lamps ? v.lamps.fault : !!(m.outputs?.H_Fault ?? m.outputs?.['%Q0.1']);
    lampRun.classList.toggle('on', !!run); lampFault.classList.toggle('on', !!fault);
    const c = v?.crashed || m.crashed;
    crash.hidden = !c; if (c) crash.textContent = t('op.crashed') + ' ' + (c.message || '');
  }
  refresh();
  return { el, refresh };
}

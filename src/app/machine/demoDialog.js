// Hộp thoại "Chạy thử mẫu": phát lại băng ghi assets/demos/<lab>.json trên một máy mô phỏng riêng
// (không đụng tới PLC/máy của bài làm). Có chạy/tạm dừng, chạy lại, tốc độ, tua và nhật ký diễn biến.
import { h } from '../dom.js';
import { t, getLang } from '../i18n.js';
import { modal, toast } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { machineIo } from '../engine.js';
import { trMachine } from '../loc.js';
import { createMachineView } from './machineView.js';
import { DemoPlayer } from '../../sim/demo.js';

const BASE = 'assets/demos/';
let indexP = null;
/** Danh sách lab có bản chạy thử: { L07: { durMs }, … } (rỗng nếu không tải được). */
export function demoIndex() {
  indexP ||= fetch(BASE + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return indexP;
}

const fmtT = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const noteText = (n) => (typeof n === 'string' ? n : n[getLang()] || n.vi || '');

export async function openDemo({ labId, title }) {
  let trace;
  try {
    const r = await fetch(BASE + encodeURIComponent(labId) + '.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    trace = await r.json();
  } catch (e) { toast(t('demo.loadErr') + ' ' + (e.message || e), 'err'); return; }

  let player = null, mv = null, playing = false, speed = 1, ended = false;
  const io = (() => { const { inputs, outputs } = machineIo(new DemoPlayer(trace).m.def); return new Map([...inputs, ...outputs].map((x) => [x.tag, x])); })();

  /* ---------- Nhật ký diễn biến ---------- */
  const caption = h('div.demo-caption', { role: 'status', 'aria-live': 'polite' }, t('demo.start'));
  const log = h('ol.demo-log', { 'aria-label': t('demo.log') });
  const addLog = (ms, cls, ...txt) => {
    log.append(h('li', { class: cls }, h('span.demo-t.mono', fmtT(ms)), h('span', ...txt)));
    while (log.childElementCount > 300) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  };
  const onEvent = (ev) => {
    const ms = ev[0] * (trace.stepMs || 1);
    if (ev[1] === 'n') { const s = noteText(ev[2]); caption.textContent = s; addLog(ms, 'note', s); }
    else if (ev[1] === 'p') {
      const b = (trMachine(player.m.def)?.buttons || player.m.def.buttons).find((x) => x.id === ev[2]);
      if (ev[3] || b?.kind === 'momentary') addLog(ms, 'press', icon('bolt', { size: 12 }), ' ', t(ev[3] ? 'demo.press' : 'demo.release', { id: b?.label || ev[2] }));
    } else if (ev[1] === 'o') {
      for (const [tag, v] of Object.entries(ev[2])) {
        const x = io.get(tag);
        const on = typeof v === 'boolean' ? v : v !== 0;
        addLog(ms, 'out ' + (on ? 'on' : 'off'), h('span.led.out', { class: on ? 'on' : '' }), ' ',
          h('b.mono', tag), typeof v === 'boolean' ? (v ? ' = 1' : ' = 0') : ` = ${v}`, x?.desc ? h('span.muted', ' — ' + x.desc) : null);
      }
    }
  };

  /* ---------- Điều khiển ---------- */
  const btnPlay = h('button.btn.primary', { type: 'button', onclick: () => setPlaying(!playing) });
  const btnRestart = h('button.btn', { type: 'button', title: t('demo.restart'), 'aria-label': t('demo.restart'), onclick: () => { restart(); setPlaying(true); } }, icon('reset', { size: 15 }));
  const seg = h('div.seg.sm', { role: 'group', 'aria-label': t('demo.speed'), title: t('demo.speed') },
    ...[0.5, 1, 2, 4].map((v) => h('button.seg-btn', { type: 'button', 'aria-pressed': String(v === speed), dataset: { v }, onclick: () => {
      speed = v; seg.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === v)));
    } }, `${v}×`)));
  const range = h('input.demo-range', { type: 'range', min: 0, max: trace.durMs, step: 100, value: 0, 'aria-label': t('demo.seek') });
  const clock = h('span.demo-clock.mono', `0:00 / ${fmtT(trace.durMs)}`);
  let dragging = false;
  range.addEventListener('input', () => { dragging = true; clock.textContent = `${fmtT(+range.value)} / ${fmtT(trace.durMs)}`; });
  range.addEventListener('change', () => { dragging = false; seek(+range.value); });

  function setPlaying(on) {
    if (on && ended) restart();
    playing = on;
    btnPlay.replaceChildren(icon(on ? 'pause' : 'play', { size: 14 }), on ? t('demo.pause') : t('demo.play'));
  }
  const stage = h('div.demo-stage');
  function restart() {
    mv?.dispose(); player?.listeners.clear();
    player = new DemoPlayer(trace);
    player.onEvent(onEvent);
    ended = false;
    log.replaceChildren(); caption.textContent = t('demo.start');
    mv = createMachineView({ m: player.m, getPlc: () => player, readOnlyPanel: true, allowOverride: false, splitKey: 'demo-v' });
    stage.replaceChildren(mv.el);
  }
  function seek(ms) {
    if (ms < player.timeMs) restart();
    player.advance(ms - player.timeMs);
    sync();
  }
  function sync() {
    if (!dragging) { range.value = player.timeMs; clock.textContent = `${fmtT(player.timeMs)} / ${fmtT(trace.durMs)}`; }
    if (player.done && !ended) { ended = true; setPlaying(false); caption.textContent = t('demo.ended'); }
  }

  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now(); const dt = Math.min(200, now - last); last = now;
    if (playing && player && !player.done) player.advance(dt * speed);
    if (player) sync();
  }, 16);

  restart();
  setPlaying(true);
  const body = h('div.demo-body',
    h('p.demo-intro.muted.small', icon('info', { size: 14 }), ' ', t('demo.intro')),
    h('div.demo-main', stage,
      h('aside.demo-side', caption, h('div.demo-log-h', { title: t('demo.logTip') }, t('demo.log')), log)),
    h('div.demo-ctrl', btnPlay, btnRestart, range, clock, seg));
  try {
    await modal({ title: t('demo.title', { lab: title }), body, width: 1280, cls: 'demo-dlg' });
  } finally {
    clearInterval(timer); playing = false;
    mv?.dispose(); player?.listeners.clear();
  }
}

// Trang Lab (không gian làm việc chính): hướng dẫn | [PLC Studio ⇆ Máy 3D] / HMI / Kết quả chấm.
import { h, debounce } from '../dom.js';
import { t, fmtTime } from '../i18n.js';
import { trText } from '../loc.js';
import { api } from '../mockApi.js';
import { loadEngine } from '../engine.js';
import { icon } from '../components/icons.js';
import { split, tabBar, toast, confirmBox } from '../components/ui.js';
import { storage } from '../store.js';
import { getLab, createSession, starterFor } from '../labSession.js';
import { createStudio } from '../studio/studio.js';
import { createMachineView } from '../machine/machineView.js';
import { createHmi } from '../machine/hmi.js';
import { createGuidePanel } from '../machine/guidePanel.js';
import { loadLectures, lectureFor, hasSeenLab, markSeenLab } from '../lectures.js';
import { createResultsPanel } from '../machine/resultsPanel.js';
import { openDemo, demoIndex } from '../machine/demoDialog.js';

/** Lỗi lúc chạy/biên dịch (engine) → 1 dòng, dịch theo ngôn ngữ hiện tại. */
const errText = (e) => `${e.block || ''}${e.network !== undefined ? ` ${t('info.network')} ${+e.network + 1}` : ''}${e.line ? ` ${t('info.line')} ${e.line}` : ''}: ${trText(e.message)}`;

export async function labPage({ id }, { user, carry }) {
  const [eng, lab, labsMeta, LECTURES] = await Promise.all([loadEngine(), getLab(id), api.listLabs(user.classId), loadLectures()]);
  if (!lab || !lab.machineId) throw new Error(t('lab.notFound', { id }));
  const meta = labsMeta.find((l) => l.id === id);
  if (meta && !meta.open) throw new Error(t('lab.locked'));

  // Đổi ngôn ngữ: dùng lại phiên PLC/máy đang chạy và trạng thái giao diện của trang trước (cùng lab, cùng SV).
  const keep = carry?.lab && carry.lab.id === id && carry.lab.userId === user.id ? carry.lab : null;
  if (keep) carry.taken = true;
  const sess = keep ? keep.sess : createSession(eng, lab.machineId, { faults: await api.getFaults(id) });
  const { m, plc } = sess;
  const def = m.def;
  const saved = keep ? null : await api.getProject(id);
  const project = keep ? keep.project : saved || starterFor(eng, lab, def);
  const disposers = [];
  const ioForced = keep?.ioForced || new Map();
  let keepSession = false; // true khi trang được vẽ lại do đổi ngôn ngữ → không dừng PLC

  /* ---------- Studio ---------- */
  const saveState = h('span.save-state.muted.small');
  const autosave = debounce((p) => { api.saveProject(id, p).then(() => { saveState.textContent = t('lab.saved', { time: fmtTime() }); }).catch((e) => console.warn('[lab] cannot save:', e?.message || e)); }, 800);
  const studio = createStudio({ project, getPlc: () => plc, initialState: keep?.studio, onChange: (p) => { saveState.textContent = t('lab.saving'); autosave(p); } });
  disposers.push(() => { autosave.flush(studio.project); studio.dispose(); });
  if (!saved && !keep) api.saveProject(id, project);

  /* ---------- Máy ---------- */
  const mv = createMachineView({ m, getPlc: () => plc, allowOverride: lab.allowOverride !== false, splitKey: 'lab-machine-v', ioForced });
  disposers.push(() => mv.dispose());

  /* ---------- Thanh công cụ ---------- */
  const stLed = h('span.cpu-led');
  const stText = h('span.cpu-state', 'STOP');
  const scan = h('span.scan.mono', '—');
  const btnRun = h('button.btn.run', { type: 'button', title: 'RUN', onclick: () => run() }, icon('play', { size: 14 }), 'RUN');
  const btnStop = h('button.btn.stopb', { type: 'button', title: 'STOP', onclick: () => stop() }, icon('stop', { size: 14 }), 'STOP');
  const btnDemo = h('button.btn.demo-btn', { type: 'button', title: t('demo.tip'), disabled: true, onclick: () => openDemo({ labId: demoId, title: `${lab.id} — ${lab.title}` }) }, icon('film', { size: 15 }), h('span.hide-mid', t('demo.btn')));
  const demoId = lab.engineId || lab.id;
  demoIndex().then((idx) => { const ok = !eng.isFake && !!idx[demoId]; btnDemo.disabled = !ok; btnDemo.title = ok ? t('demo.tip') : t('demo.none'); });
  const btnMon = h('button.btn', { type: 'button', 'aria-pressed': 'false', title: t('lab.monitorTip'), onclick: () => setMonitor(!monitor) }, icon('eye', { size: 15 }), h('span.hide-mid', t('lab.monitor')));
  const toolbar = h('div.lab-toolbar', { role: 'toolbar', 'aria-label': t('lab.toolbar') },
    h('a.btn.ghost.sm', { href: '#/home', title: t('nav.home') }, icon('chevronL', { size: 14 }), h('span.lab-tb-id', lab.id)),
    h('span.tb-sep'),
    h('button.btn', { type: 'button', onclick: () => compile(), title: t('lab.compileTip') }, icon('compile', { size: 15 }), h('span.hide-mid', t('lab.compile'))),
    h('button.btn', { type: 'button', onclick: () => download(), title: t('lab.downloadTip') }, icon('download', { size: 15 }), h('span.hide-mid', t('lab.download'))),
    h('span.tb-sep'),
    h('div.cpu-box', stLed, stText), btnRun, btnStop,
    btnMon,
    h('div.scan-box', { title: t('lab.scanTip') }, h('span.muted.small', t('lab.scan')), scan),
    h('span.tb-sep'),
    btnDemo,
    h('span.spacer'),
    saveState,
    h('button.btn.ghost', { type: 'button', title: t('lab.resetMachineTip'), onclick: () => { m.reset(); mv.clearForces(); toast(t('lab.machineReset'), 'info', 1500); } }, icon('reset', { size: 15 }), h('span.hide-mid', t('lab.resetMachine'))),
    h('button.btn.primary', { type: 'button', onclick: () => submit() }, icon('send', { size: 15 }), t('lab.submit')));

  /* ---------- PLC ---------- */
  let monitor = !!keep?.monitor;
  function setMonitor(on) { monitor = on; btnMon.setAttribute('aria-pressed', String(on)); btnMon.classList.toggle('on', on); studio.setMonitor(on); }
  function updateState() {
    const s = plc.state;
    stText.textContent = s; stLed.className = 'cpu-led ' + (s === 'RUN' ? 'run' : 'stop');
    btnRun.disabled = s === 'RUN'; btnStop.disabled = s !== 'RUN';
  }
  function compile() {
    studio.flush();
    let res;
    try { res = plc.compile(studio.project); } catch (e) { res = { ok: false, errors: [{ block: '—', message: String(e.message || e) }] }; }
    studio.showCompile(res);
    toast(res.ok ? t('lab.compileOk') : t('lab.compileErrN', { n: res.errors.length }), res.ok ? 'ok' : 'err', 2200);
    return res;
  }
  function download() {
    studio.flush();
    const wasRun = plc.state === 'RUN';
    let res;
    try { res = sess.load(studio.project); } catch (e) { res = { ok: false, errors: [{ block: '—', message: String(e.message || e) }] }; }
    studio.showCompile(res);
    if (res.ok) { studio.diag(() => t('lab.diagLoaded')); toast(wasRun ? t('lab.loadedStopped') : t('lab.loaded'), 'ok', 2200); }
    else toast(t('lab.compileErrN', { n: res.errors.length }), 'err');
    updateState();
    return res.ok;
  }
  function run() {
    studio.flush();
    if (!sess.isLoaded(studio.project)) { if (!download()) return; }
    try { plc.start(); } catch (e) { toast(trText(String(e.message || e)), 'err'); }
    studio.diag(() => t('lab.diagRun')); updateState();
  }
  function stop() { plc.stop(); studio.diag(() => t('lab.diagStop')); updateState(); }

  const offs = [];
  const on = (ev, cb) => { const r = plc.on?.(ev, cb); if (typeof r === 'function') offs.push(r); else offs.push(() => plc.off?.(ev, cb)); };
  let lastScanUi = 0;
  on('scan', (e) => {
    const now = performance.now(); if (now - lastScanUi < 250) return; lastScanUi = now;
    scan.textContent = `${(+e.scanTimeMs || 0).toFixed(2)} ms · #${e.cycle}`;
  });
  on('error', (e) => {
    studio.diag(() => t('lab.diagError') + ' ' + errText(e), 'err'); studio.showDiag(); toast(t('lab.runtimeErr') + ' ' + trText(e.message), 'err', 5000); updateState();
  });
  on('state', () => updateState());
  updateState();
  const tickT = setInterval(() => { studio.tick(); if (plc.state !== stText.textContent) updateState(); }, 150);
  disposers.push(() => clearInterval(tickT));

  /* ---------- Bố cục ---------- */
  const views = storage.get('bk.lab.view', 'both');
  if (keep?.monitor) setMonitor(true);
  const work = split({ dir: 'h', a: studio.el, b: mv.el, ratio: 0.58, min: 300, key: 'lab-main' });
  const seg = h('div.seg.sm', { role: 'group', 'aria-label': t('lab.layout') },
    ...[['studio', t('lab.onlyStudio'), 'panel'], ['both', t('lab.both'), 'split'], ['machine', t('lab.onlyMachine'), 'cube']].map(([id, l, ic]) =>
      h('button.seg-btn', { type: 'button', 'aria-pressed': String(views === id), title: l, dataset: { id }, onclick: () => setView(id) }, icon(ic, { size: 14 }), h('span.hide-mid', l))));
  function setView(id) {
    work.solo(id === 'studio' ? 'a' : id === 'machine' ? 'b' : null);
    seg.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    storage.set('bk.lab.view', id);
  }
  setView(views);

  let hmi = null;
  const hmiHost = h('div.tab-pane.hmi-pane', { hidden: true });
  const results = createResultsPanel({ onGrade: () => grade(false), onSubmit: () => submit() });
  const resHost = h('div.tab-pane', { hidden: true }, results.el);
  const workHost = h('div.tab-pane.work-pane', work);
  const tabs = tabBar([
    { id: 'work', label: t('lab.tabWork'), icon: 'split' },
    { id: 'hmi', label: 'HMI', icon: 'panel' },
    { id: 'res', label: t('lab.tabResult'), icon: 'check' },
  ], 'work', (tid) => showTab(tid), 'lab-tabs');
  tabs.append(h('span.spacer'), seg);
  function showTab(tid) {
    tabs.setActive(tid);
    workHost.hidden = tid !== 'work'; hmiHost.hidden = tid !== 'hmi'; resHost.hidden = tid !== 'res';
    seg.hidden = tid !== 'work';
    if (tid === 'hmi' && !hmi) { hmi = createHmi({ m, getPlc: () => plc, title: lab.title, keep: hmiKeep }); hmiKeep = null; hmiHost.append(hmi.el); }
  }
  let hmiKeep = keep?.hmi || null; // HMI cũ (đầu ra đang ép, cảnh báo đã xác nhận, màn hình)
  disposers.push(() => { const st = hmi?.dispose({ keepForces: keepSession }); if (keepSession) hmiKeep = st || hmiKeep; });

  // Lần đầu mở lab (có bài giảng) → tab Bài giảng, mở sẵn ô hướng dẫn; các lần sau → tab Nhiệm vụ.
  const lecture = lectureFor(LECTURES, lab);
  const firstVisit = !keep && !!lecture && !hasSeenLab(user.id, lab.id);
  markSeenLab(user.id, lab.id);
  let body = null;
  const guideOpen = keep ? keep.guideOpen : firstVisit || storage.get('bk.lab.guide', window.innerWidth >= 1600);
  const guide = createGuidePanel({
    lab, def, lecture, userId: user.id, initialTab: keep ? keep.guideTab : firstVisit ? 'lecture' : 'task',
    onCollapse: () => toggleGuide(false),
    onTab: (tab) => { body?.classList.toggle('lecture-tab', tab === 'lecture'); if (tab !== 'lecture') setReading(false); },
    onWide: (on) => setReading(on ?? !body.classList.contains('reading')),
  });
  const guideRail = h('button.guide-rail', { type: 'button', title: t('guide.expand'), 'aria-label': t('guide.expand'), onclick: () => toggleGuide(true) }, icon('book', { size: 16 }), h('span', t('guide.title')));
  body = h('div.lab-body', guide.el, guideRail, h('div.lab-main', tabs, workHost, hmiHost, resHost));
  body.classList.toggle('lecture-tab', guide.tab === 'lecture');
  function toggleGuide(open) { body.classList.toggle('guide-closed', !open); storage.set('bk.lab.guide', open); if (!open) setReading(false); }
  /** Chế độ đọc rộng: bài giảng phủ lên vùng làm việc (không làm co Studio/3D). Esc để thoát. */
  function setReading(on) {
    if (!body) return;
    body.classList.toggle('reading', !!on);
    guide.el.querySelector('.wide-btn')?.setAttribute('aria-pressed', String(!!on));
  }
  toggleGuide(guideOpen);
  if (keep?.reading && guide.tab === 'lecture') setReading(true);

  /* ---------- Chấm / nộp ---------- */
  if (keep?.results) results.show(keep.results.res, keep.results.note);
  else {
    const prev = await api.getSubmission(id);
    if (prev) results.show(prev, { key: 'res.prevSubmission' });
  }
  if (keep?.tab && keep.tab !== 'work') showTab(keep.tab);
  let grading = false;
  async function grade(doSubmit) {
    if (grading) return null;
    grading = true; studio.flush();
    showTab('res'); results.setBusy(true, 0);
    try {
      const res = await eng.grade(lab, studio.project, (f) => results.setBusy(true, f));
      if (!res) { results.show(null, { key: 'res.noGrader' }); return null; }
      if (doSubmit) {
        const sub = await api.submit(id, studio.project, res);
        results.show(sub, { key: 'res.submitted', cls: 'ok-text' });
        toast(t('res.submittedToast', { s: res.score, m: res.max }), 'ok', 4000);
      } else results.show(res, { key: 'res.tryNote' });
      return res;
    } catch (e) {
      console.error(e); toast(t('res.gradeErr') + ' ' + trText(String(e.message || e)), 'err'); return null;
    } finally { grading = false; results.setBusy(false); }
  }
  async function submit() {
    if (!(await confirmBox(t('lab.submitTitle'), t('lab.submitMsg'), t('lab.submit')))) return;
    await grade(true);
  }

  const el = h('div.lab-page', toolbar, body);
  window.__bk = { plc, m, studio, lab }; // hỗ trợ gỡ lỗi từ console
  // phím tắt toàn trang
  const onKey = (e) => {
    if (e.key === 'Escape' && body.classList.contains('reading') && !document.querySelector('.modal-back')) { setReading(false); return; }
    if (e.key === 'F7' || ((e.ctrlKey || e.metaKey) && e.key === 'b')) { e.preventDefault(); compile(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); download(); }
  };
  window.addEventListener('keydown', onKey);
  disposers.push(() => window.removeEventListener('keydown', onKey));

  return {
    el,
    /** relang: vẽ lại do đổi ngôn ngữ → giữ phiên PLC/máy (vẫn chạy) và trạng thái giao diện, trả về carry. */
    dispose(o) {
      keepSession = !!o?.relang;
      const ui = keepSession ? {
        id, userId: user.id, sess, ioForced,
        studio: studio.getState(), project: studio.project, monitor,
        tab: !hmiHost.hidden ? 'hmi' : !resHost.hidden ? 'res' : 'work',
        guideTab: guide.tab, guideOpen: !body.classList.contains('guide-closed'), reading: body.classList.contains('reading'),
        results: results.state,
      } : null;
      offs.forEach((f) => { try { f(); } catch { /* bỏ qua */ } });
      disposers.forEach((f) => { try { f(); } catch (e) { console.warn(e); } });
      if (window.__bk?.plc === plc) delete window.__bk;
      if (keepSession) { ui.hmi = hmiKeep; return { lab: ui, release: () => { for (const a of ioForced.keys()) { try { plc.unforce(a); } catch { /* bỏ qua */ } } sess.dispose(); } }; }
      sess.dispose();
      return undefined;
    },
  };
}

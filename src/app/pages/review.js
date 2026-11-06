// Giảng viên xem bài nộp của SV (chỉ đọc) hoặc lời giải tham khảo: Studio chỉ đọc + chạy thử trên máy + kết quả chấm.
import { h } from '../dom.js';
import { t } from '../i18n.js';
import { trText } from '../loc.js';
import { api } from '../mockApi.js';
import { loadEngine } from '../engine.js';
import { icon } from '../components/icons.js';
import { split, toast } from '../components/ui.js';
import { getLab, createSession, starterFor } from '../labSession.js';
import { createStudio } from '../studio/studio.js';
import { createMachineView } from '../machine/machineView.js';
import { renderResult } from '../machine/resultsPanel.js';

export async function reviewPage({ student, lab: labId, solution }, { carry } = {}) {
  const [eng, lab] = await Promise.all([loadEngine(), getLab(labId)]);
  if (!lab?.machineId) throw new Error(t('lab.notFound', { id: labId }));
  // Đổi ngôn ngữ: giữ phiên PLC/máy đang chạy, trạng thái Studio và kết quả chấm lại.
  const keyId = `${solution ? '#sol' : student}|${labId}`;
  const keep = carry?.review?.key === keyId ? carry.review : null;
  if (keep) carry.taken = true;
  const sess = keep ? keep.sess : createSession(eng, lab.machineId);
  const ioForced = keep?.ioForced || new Map();
  let project, sub = null, who = '';
  if (solution) {
    project = eng.solutionProject ? eng.solutionProject(lab) : null;
    if (!project) project = starterFor(eng, lab, sess.m.def);
    who = t('review.solution');
  } else {
    const u = await api.getUser(student);
    who = u ? `${u.name} (${u.mssv || u.username})` : student;
    sub = await api.getSubmission(labId, student);
    project = sub?.project || (await api.getProject(labId, student));
    if (!project) { project = starterFor(eng, lab, sess.m.def); who += ' — ' + t('review.noProject'); }
  }
  const studio = createStudio({ project, readOnly: true, getPlc: () => sess.plc, initialState: keep?.studio });
  const mv = createMachineView({ m: sess.m, getPlc: () => sess.plc, allowOverride: true, splitKey: 'review-v', ioForced });
  const res = keep ? keep.res : sess.load(project);
  if (!keep) studio.showCompile(res);
  let monitor = !!keep?.monitor;
  let regraded = keep?.regraded || null;
  const stText = h('span.cpu-state', 'STOP');
  const upd = () => { stText.textContent = sess.plc.state; };
  const regrade = h('button.btn', { type: 'button', onclick: async () => {
    regrade.disabled = true;
    try { regraded = await eng.grade(lab, project); resBox.replaceChildren(renderResult(regraded, { title: t('review.regraded') })); } catch (e) { toast(trText(String(e.message || e)), 'err'); }
    regrade.disabled = false;
  } }, icon('check', { size: 14 }), t('review.regrade'));
  const resBox = h('div.review-res', regraded ? renderResult(regraded, { title: t('review.regraded') }) : sub ? renderResult(sub, { title: t('review.submitted') }) : h('p.muted.pad', solution ? t('review.solutionNote') : t('res.none')));
  const toolbar = h('div.lab-toolbar',
    h('a.btn.ghost.sm', { href: '#/teacher', onclick: (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } } }, icon('chevronL', { size: 14 }), t('common.back')),
    h('b', `${lab.id} · ${who}`), solution ? h('span.badge.warn', t('review.teacherOnly')) : h('span.badge', t('studio.readOnly')),
    h('span.tb-sep'),
    h('button.btn.run', { type: 'button', disabled: !res.ok, onclick: () => { sess.plc.start(); upd(); } }, icon('play', { size: 14 }), 'RUN'),
    h('button.btn.stopb', { type: 'button', onclick: () => { sess.plc.stop(); upd(); } }, icon('stop', { size: 14 }), 'STOP'),
    h('div.cpu-box', stText),
    h('button.btn', { type: 'button', class: monitor ? 'on' : '', onclick: (e) => { monitor = !monitor; e.currentTarget.classList.toggle('on', monitor); studio.setMonitor(monitor); } }, icon('eye', { size: 14 }), t('lab.monitor')),
    h('span.spacer'), regrade);
  const tick = setInterval(() => { studio.tick(); upd(); }, 200);
  const main = split({ dir: 'h', a: studio.el, b: mv.el, ratio: 0.58, min: 300, key: 'review-main' });
  const el = h('div.lab-page', toolbar, h('div.review-body', main, h('aside.review-side', resBox)));
  return {
    el,
    dispose(o) {
      const st = o?.relang ? { key: keyId, sess, ioForced, res, monitor, regraded, studio: studio.getState() } : null;
      clearInterval(tick); studio.dispose(); mv.dispose();
      if (st) return { review: st, release: () => sess.dispose() };
      sess.dispose();
      return undefined;
    },
  };
}

// Trang chủ sinh viên: lớp, tiến độ, danh sách lab theo phần, trạng thái.
import { h } from '../dom.js';
import { t } from '../i18n.js';
import { api } from '../mockApi.js';
import { PARTS, MACHINE_TITLES } from '../course.js';
import { icon } from '../components/icons.js';
import { getLabs } from '../labSession.js';

const STATUS = { todo: ['', 'home.todo'], doing: ['warn', 'home.doing'], submitted: ['err', 'home.submitted'], passed: ['ok', 'home.passed'] };

export async function homePage(_, { user }) {
  const [classes, list, labs] = await Promise.all([api.listClasses(), api.listLabs(user.classId), getLabs()]);
  const cls = classes[0];
  const byId = Object.fromEntries(labs.map((l) => [l.id, l]));
  const avail = list.filter((l) => l.machineId);
  const passed = avail.filter((l) => l.status === 'passed').length;
  const doing = avail.filter((l) => l.status === 'doing' || l.status === 'submitted').length;
  const pct = avail.length ? Math.round((passed / avail.length) * 100) : 0;
  const next = avail.find((l) => l.open && l.status !== 'passed');

  const card = (l) => {
    const [cls2, key] = STATUS[l.status] || STATUS.todo;
    const usable = !!l.machineId && l.open;
    const meta = byId[l.id];
    const inner = [
      h('div.lab-card-top', h('span.lab-id', l.id), l.machineId ? h('span.badge.info', MACHINE_TITLES[l.machineId]) : h('span.badge', t('home.soon')), h('span.spacer'),
        !l.open ? h('span.badge', icon('lock', { size: 12 }), t('home.locked')) : h('span.badge', { class: cls2 }, t(key), l.score !== null && l.score !== undefined ? ` · ${l.score}/${l.max}` : '')),
      h('div.lab-title', l.title),
      h('div.lab-meta.muted.small', `${t('home.week')} ${l.week}`, ' · ', '★'.repeat(l.level) , l.due && l.open ? ` · ${t('home.due')} ${new Date(l.due).toLocaleDateString('vi-VN')}` : '', meta?.durationMin ? ` · ${meta.durationMin} ${t('guide.min')}` : ''),
    ];
    return usable ? h('a.lab-card', { href: '#/lab/' + l.id, class: 'st-' + l.status }, inner) : h('div.lab-card.disabled', { 'aria-disabled': 'true' }, inner);
  };

  const el = h('div.container',
    h('div.home-head',
      h('div', h('h1', t('home.hello', { name: user.name })), h('p.muted', cls ? `${cls.name} · ${cls.course} · ${cls.term}` : '')),
      next ? h('a.btn.primary', { href: '#/lab/' + next.id }, icon('play', { size: 15 }), t('home.continue', { id: next.id })) : null),
    h('div.stats-row',
      h('div.card.stat', h('div.stat-l', t('home.progress')), h('div.stat-v', `${pct}%`), h('div.pbar', h('span', { style: { width: pct + '%' } })), h('div.muted.small', t('home.passedOf', { n: passed, m: avail.length }))),
      h('div.card.stat', h('div.stat-l', t('home.inProgress')), h('div.stat-v', String(doing))),
      h('div.card.stat', h('div.stat-l', t('home.available')), h('div.stat-v', String(avail.filter((l) => l.open).length)), h('div.muted.small', t('home.ofTotal', { n: list.length })))),
    ...PARTS.map((p) => {
      const items = list.filter((l) => l.part === p.id);
      if (!items.length) return null;
      return h('section.part', h('div.part-head', h('h2', p.title), h('span.muted.small', `${t('home.weeks')} ${p.weeks}`)), h('div.lab-grid', items.map(card)));
    }),
  );
  return { el };
}

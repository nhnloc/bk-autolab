// Trang giảng viên: danh sách lớp + danh mục lab có máy mô phỏng (xem lời giải tham khảo).
import { h } from '../dom.js';
import { t } from '../i18n.js';
import { api } from '../mockApi.js';
import { icon } from '../components/icons.js';
import { getLabs } from '../labSession.js';
import { MACHINE_TITLES } from '../course.js';

export async function teacherPage(_, { user }) {
  const [classes, labs] = await Promise.all([api.listClasses(), getLabs()]);
  const machineLabs = labs.filter((l) => l.machineId);
  const el = h('div.container',
    h('div.home-head', h('div', h('h1', t('teacher.hello', { name: user.name })), h('p.muted', t('teacher.sub')))),
    h('h2.section-h', t('teacher.classes')),
    h('div.class-grid', classes.map((c) => h('a.card.class-card', { href: '#/teacher/class/' + encodeURIComponent(c.id) },
      h('div.card-b', h('div.row', icon('user', { size: 18 }), h('b', c.name)), h('div.muted.small', `${c.course} · ${c.term}`),
        h('div.row.class-stats', h('span.badge.info', t('teacher.students', { n: c.studentCount })), h('span.spacer'), h('span.link-more', t('teacher.open'), icon('chevronR', { size: 14 }))))))),
    h('h2.section-h', t('teacher.labs')),
    h('div.card', h('table.table',
      h('thead', h('tr', h('th', 'Lab'), h('th', t('teacher.labTitle')), h('th', t('teacher.machine')), h('th', t('teacher.week')), h('th', ''))),
      h('tbody', machineLabs.map((l) => h('tr', h('td.mono', l.id), h('td', l.title), h('td', MACHINE_TITLES[l.machineId] || l.machineId), h('td', String(l.week ?? '')),
        h('td', h('a.btn.sm', { href: `#/teacher/solution/${l.id}`, title: t('teacher.solutionTip') }, icon('eye', { size: 14 }), t('teacher.solution')))))))),
  );
  return { el };
}

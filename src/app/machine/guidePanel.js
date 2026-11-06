// Ô hướng dẫn bài lab (trái): mục tiêu, bảng I/O (từ def.ioMap), các bước, gợi ý.
import { h } from '../dom.js';
import { t } from '../i18n.js';
import { machineIo, machineTitle } from '../engine.js';

export function createGuidePanel({ lab, def, onCollapse }) {
  const { inputs, outputs } = machineIo(def);
  const ioTable = (rows) => h('table.io-table', h('thead', h('tr', h('th', t('guide.addr')), h('th', t('guide.tag')), h('th', t('guide.desc')))),
    h('tbody', rows.map((r) => h('tr', h('td.mono', r.addr), h('td.mono', r.tag), h('td', r.desc || '')))));
  const stars = '★'.repeat(lab.level || 1) + '☆'.repeat(Math.max(0, 4 - (lab.level || 1)));
  const el = h('aside.guide', { 'aria-label': t('guide.title') },
    h('div.guide-head', h('div', h('div.guide-id', lab.id + (lab.week ? ` · ${t('home.week')} ${lab.week}` : '')), h('h2', lab.title)),
      h('button.btn.ghost.sm.icon', { type: 'button', title: t('guide.collapse'), 'aria-label': t('guide.collapse'), onclick: onCollapse }, '«')),
    h('div.guide-body',
      h('div.guide-meta', h('span.badge.info', machineTitle(lab.machineId, def)), h('span.badge', { title: t('home.level') }, stars), lab.durationMin ? h('span.badge', `${lab.durationMin} ${t('guide.min')}`) : null),
      lab.summary || def?.summary ? h('p.muted', lab.summary || def.summary) : null,
      lab.objectives?.length ? h('section', h('h3', t('guide.objectives')), h('ul', lab.objectives.map((o) => h('li', o)))) : null,
      h('section', h('h3', t('guide.io')),
        h('details', { open: true }, h('summary', `${t('io.inputs')} (${inputs.length})`), ioTable(inputs)),
        h('details', { open: true }, h('summary', `${t('io.outputs')} (${outputs.length})`), ioTable(outputs))),
      lab.steps?.length ? h('section', h('h3', t('guide.steps')), h('ol.steps', lab.steps.map((s) => h('li', s.title ? h('b', s.title + ' ') : null, s.text)))) : null,
      lab.hints?.length ? h('section', h('details', h('summary', t('guide.hints')), h('ul', lab.hints.map((x) => h('li', x))))) : null,
      h('section.guide-tips', h('h3', t('guide.howto')), h('ol', [t('guide.h1'), t('guide.h2'), t('guide.h3'), t('guide.h4')].map((x) => h('li', x)))),
    ));
  return { el };
}

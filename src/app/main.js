// Khởi động ứng dụng: thanh trên, router, phân quyền theo vai trò.
import { h, $ } from './dom.js';
import { PUBLIC_MODE } from './config.js';
import { router } from './router.js';
import { settings, applyTheme } from './store.js';
import { t, setLang, getLang } from './i18n.js';
import { api } from './mockApi.js';
import { icon } from './components/icons.js';
import { loadEngine } from './engine.js';
import { loginPage } from './pages/login.js';
import { homePage } from './pages/home.js';
import { labPage } from './pages/lab.js';
import { teacherPage } from './pages/teacher.js';
import { classPage } from './pages/teacherClass.js';
import { reviewPage } from './pages/review.js';

applyTheme();
setLang(settings.lang);
const root = $('#app');
let current = null;
let renderToken = 0;

function topbar(user, active) {
  const nav = user?.role === 'teacher'
    ? [['#/teacher', t('nav.classes'), 'teacher']]
    : user ? [['#/home', t('nav.home'), 'home']] : [];
  const engBadge = h('span.badge.eng-badge', { hidden: true });
  loadEngine().then((e) => { engBadge.hidden = false; engBadge.textContent = e.isFake ? t('app.engineFake') : t('app.engineReal'); engBadge.className = 'badge eng-badge ' + (e.isFake ? 'warn' : 'ok'); engBadge.title = e.isFake ? t('app.engineFakeTip') : ''; });
  return h('header.topbar',
    h('a.brand', { href: user ? (user.role === 'teacher' ? '#/teacher' : '#/home') : '#/login', 'aria-label': 'BK-AutoLab' },
      h('span.brand-logo', icon('bolt', { size: 18 })), 'BK-AutoLab', h('small', t('app.tagline'))),
    h('nav.topnav', nav.map(([href, label, key]) => h('a', { href, class: active === key ? 'active' : '' }, label))),
    h('span.spacer'),
    h('span.hide-narrow', engBadge),
    h('button.btn.ghost.sm', { type: 'button', title: t('app.lang'), onclick: () => { settings.lang = getLang() === 'vi' ? 'en' : 'vi'; setLang(settings.lang); router.resolve(); } }, getLang() === 'vi' ? 'EN' : 'VI'),
    h('button.btn.ghost.icon', { type: 'button', title: t('app.theme'), 'aria-label': t('app.theme'), onclick: () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; window.dispatchEvent(new Event('bk-theme')); render(); } }, icon(settings.theme === 'dark' ? 'sun' : 'moon')),
    user ? h('div.user-chip', h('span.avatar', initials(user.name)), h('span.hide-narrow', h('div', user.name), h('span.role-badge', user.role === 'teacher' ? t('role.teacher') : t('role.student')))) : null,
    user ? h('button.btn.ghost.icon', { type: 'button', title: t('app.logout'), 'aria-label': t('app.logout'), onclick: async () => { await api.logout(); router.go('/login'); } }, icon('logout')) : null);
  function render() { const nb = topbar(user, active); root.querySelector('.topbar')?.replaceWith(nb); }
}
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase();

async function show(pageFn, params, { role, active, full } = {}) {
  const token = ++renderToken;
  const user = await api.getMe();
  if (role && !user) { router.go('/login', { replace: true }); return; }
  if (role && user.role !== role) { router.go(user.role === 'teacher' ? '/teacher' : '/home', { replace: true }); return; }
  try { current?.dispose?.(); } catch (e) { console.warn(e); }
  current = null;
  const page = h('main.page', { class: full ? 'full' : '' });
  root.replaceChildren(topbar(user, active), page);
  try {
    const res = await pageFn(params, { user, page });
    if (token !== renderToken) { res?.dispose?.(); return; }
    current = res;
    if (res?.el) page.replaceChildren(res.el);
  } catch (e) {
    console.error(e);
    page.replaceChildren(h('div.container', h('div.card', h('div.card-b', h('h2', t('app.error')), h('p.err-text', String(e.message || e)), h('a', { href: '#/' }, t('app.backHome'))))));
  }
}

const teacherGuard = (fn) => (p) => (PUBLIC_MODE ? router.go('/home', { replace: true }) : fn(p));
router
  .add('/', async () => { const u = await api.getMe(); router.go(!u ? '/login' : u.role === 'teacher' ? '/teacher' : '/home', { replace: true }); })
  .add('/login', (p) => show(loginPage, p, {}))
  .add('/home', (p) => show(homePage, p, { role: 'student', active: 'home' }))
  .add('/lab/:id', (p) => show(labPage, p, { role: 'student', active: 'home', full: true }))
  .add('/teacher', teacherGuard((p) => show(teacherPage, p, { role: 'teacher', active: 'teacher' })))
  .add('/teacher/class/:id', teacherGuard((p) => show(classPage, p, { role: 'teacher', active: 'teacher' })))
  .add('/teacher/review/:student/:lab', teacherGuard((p) => show(reviewPage, p, { role: 'teacher', active: 'teacher', full: true })))
  .add('/teacher/solution/:lab', teacherGuard((p) => show(reviewPage, { ...p, solution: true }, { role: 'teacher', active: 'teacher', full: true })));
router.on('notfound', () => router.go('/', { replace: true }));
router.resolve();
loadEngine();

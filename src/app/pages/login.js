// Đăng nhập (mock): chọn vai trò Sinh viên / Giảng viên.
import { h } from '../dom.js';
import { PUBLIC_MODE } from '../config.js';
import { t } from '../i18n.js';
import { api } from '../mockApi.js';
import { router } from '../router.js';
import { icon } from '../components/icons.js';

export async function loginPage() {
  let role = 'student';
  const user = h('input.input#lg-user', { autocomplete: 'username', required: true, placeholder: '20210101' });
  const pass = h('input.input#lg-pass', { type: 'password', autocomplete: 'current-password', required: true });
  const err = h('div.err-text.small', { role: 'alert' });
  const seg = h('div.seg', { role: 'radiogroup', 'aria-label': t('login.role') },
    ...[['student', t('role.student')], ...(PUBLIC_MODE ? [] : [['teacher', t('role.teacher')]])].map(([id, l]) => h('button.seg-btn', { type: 'button', role: 'radio', 'aria-checked': String(id === role), dataset: { id },
      onclick: () => { role = id; seg.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === role))); user.placeholder = role === 'teacher' ? 'gv.tranminh' : '20210101'; } }, l)));
  const btn = h('button.btn.primary.wide', { type: 'submit' }, t('login.submit'));
  const form = h('form.login-form', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true;
    try { await api.login({ username: user.value.trim(), password: pass.value, role }); router.go(role === 'teacher' ? '/teacher' : '/home'); }
    catch (ex) { err.textContent = ex.message; }
    finally { btn.disabled = false; }
  } },
    h('label.field', h('span', t('login.role')), seg),
    h('label.field', { for: 'lg-user' }, h('span', t('login.user')), user),
    h('label.field', { for: 'lg-pass' }, h('span', t('login.pass')), pass),
    err, btn,
    h('p.muted.small.demo', icon('info', { size: 14 }), t('login.demo')));
  const el = h('div.login-page',
    h('div.login-hero',
      h('div.hero-mark', icon('bolt', { size: 40 })),
      h('h1', 'BK-AutoLab'),
      h('p', t('login.hero')),
      h('ul.hero-list', [t('login.f1'), t('login.f2'), t('login.f3'), t('login.f4')].map((x) => h('li', icon('check', { size: 15 }), x))),
      h('p.small.hero-legal', t('app.legal'))),
    h('div.login-card.card', h('div.card-b', h('h2', t('login.title')), h('p.muted', t('login.sub')), form)));
  setTimeout(() => user.focus(), 0);
  return { el };
}

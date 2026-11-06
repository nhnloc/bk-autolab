// API giả lập (cùng hình dạng API server sau này). Dữ liệu lưu localStorage (bọc try/catch qua storage).
// login, logout, getMe, listClasses, getClass, listLabs, getProject, saveProject, submit, getSubmission,
// getGradebook, updateSchedule, setFaults, getFaults
import { storage } from './store.js';
import { PUBLIC_MODE } from './config.js';
import { COURSE } from './course.js';
import { clone } from './dom.js';

const K = { db: 'bk.mock.db.v2', session: 'bk.mock.session' };
const delay = (v, ms = 60) => new Promise((r) => setTimeout(() => r(v), ms));

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Đức', 'Thanh', 'Quang', 'Ngọc', 'Hữu', 'Gia', 'Tuấn'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Khoa', 'Linh', 'Long', 'Mai', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Trang', 'Tú', 'Vy'];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function seed() {
  const r = rng(68);
  const students = [];
  for (let i = 0; i < 16; i++) {
    const name = `${HO[Math.floor(r() * HO.length)]} ${DEM[Math.floor(r() * DEM.length)]} ${TEN[Math.floor(r() * TEN.length)]}`;
    const mssv = String(20210000 + 101 + i * 37);
    students.push({ id: 'sv' + mssv, username: mssv, name, role: 'student', classId: 'AUT-K68-01', mssv });
  }
  const users = [
    { id: 'gv01', username: 'gv.tranminh', name: 'TS. Trần Minh Đức', role: 'teacher' },
    ...students,
  ];
  const schedule = {};
  for (const c of COURSE) schedule[c.id] = { open: !!c.machineId, week: c.week, due: dueOf(c.week) };
  const subs = {};
  if (!PUBLIC_MODE) for (const s of students) {
    for (const c of COURSE.filter((x) => x.machineId && x.part <= 2)) {
      const x = r();
      if (x < 0.25) continue;
      const max = 100, score = Math.round(40 + r() * 60);
      subs[`${s.id}|${c.id}`] = { userId: s.id, labId: c.id, score, max, passed: score >= 50, at: Date.now() - Math.floor(r() * 20) * 86400000, criteria: [], project: null };
    }
  }
  return {
    users,
    classes: [
      { id: 'AUT-K68-01', name: 'Tự động hóa K68 — Nhóm 01', course: 'EE4xxx PLC & Khí nén', term: 'HK1 2026–2027', teacherId: 'gv01', studentIds: students.map((s) => s.id), schedule },
      { id: 'AUT-K68-02', name: 'Tự động hóa K68 — Nhóm 02', course: 'EE4xxx PLC & Khí nén', term: 'HK1 2026–2027', teacherId: 'gv01', studentIds: [], schedule: clone(schedule) },
    ],
    projects: {}, submissions: subs, faults: {},
  };
}
function dueOf(week) { const start = new Date('2026-09-07T00:00:00'); start.setDate(start.getDate() + week * 7 - 1); return start.toISOString().slice(0, 10); }

function db() { let d = storage.get(K.db); if (!d || !d.users) { d = seed(); storage.set(K.db, d); } return d; }
function save(d) { storage.set(K.db, d); }
function me() { const s = storage.get(K.session); if (!s) return null; return db().users.find((u) => u.id === s.userId) || null; }
function need() { const u = me(); if (!u) throw new Error('Chưa đăng nhập'); return u; }

export const api = {
  async login({ username, password, role }) {
    if (!username || !password) throw new Error('Nhập tên đăng nhập và mật khẩu');
    const d = db();
    let u = d.users.find((x) => x.username === username.trim());
    if (u && u.role !== role) throw new Error(role === 'teacher' ? 'Tài khoản này không phải giảng viên' : 'Tài khoản này không phải sinh viên');
    if (!u) {
      u = role === 'teacher'
        ? { id: 'gv_' + username, username: username.trim(), name: username.trim(), role: 'teacher' }
        : { id: 'sv_' + username, username: username.trim(), name: username.trim(), role: 'student', classId: 'AUT-K68-01', mssv: username.trim() };
      d.users.push(u);
      if (role === 'student') d.classes[0].studentIds.push(u.id);
      else d.classes.forEach((c) => { c.teacherId = c.teacherId || u.id; });
      save(d);
    }
    storage.set(K.session, { userId: u.id, token: 'mock-' + Math.random().toString(36).slice(2) });
    return delay({ token: 'mock', user: clone(u) });
  },
  async logout() { storage.remove(K.session); return delay(true, 10); },
  async getMe() { return delay(clone(me()), 5); },

  async listClasses() {
    const u = need(); const d = db();
    const list = u.role === 'teacher' ? d.classes : d.classes.filter((c) => c.id === u.classId);
    return delay(list.map((c) => ({ id: c.id, name: c.name, course: c.course, term: c.term, studentCount: c.studentIds.length })));
  },
  async getClass(id) {
    need(); const d = db(); const c = d.classes.find((x) => x.id === id);
    if (!c) throw new Error('Không tìm thấy lớp');
    return delay({ ...clone(c), students: c.studentIds.map((sid) => clone(d.users.find((u) => u.id === sid))).filter(Boolean) });
  },
  /** Danh sách lab + lịch + trạng thái của người dùng hiện tại. */
  async listLabs(classId) {
    const u = need(); const d = db();
    const c = d.classes.find((x) => x.id === (classId || u.classId)) || d.classes[0];
    return delay(COURSE.map((l) => {
      const sch = c.schedule[l.id] || { open: false };
      const sub = d.submissions[`${u.id}|${l.id}`];
      const proj = d.projects[`${u.id}|${l.id}`];
      const status = sub ? (sub.passed ? 'passed' : 'submitted') : proj ? 'doing' : 'todo';
      return { ...l, ...sch, status, score: sub?.score ?? null, max: sub?.max ?? null };
    }));
  },
  async getProject(labId, userId) {
    const u = need(); const d = db();
    const uid = userId && u.role === 'teacher' ? userId : u.id;
    return delay(clone(d.projects[`${uid}|${labId}`]?.project || null), 10);
  },
  async saveProject(labId, project) {
    const u = need(); const d = db();
    d.projects[`${u.id}|${labId}`] = { project: clone(project), at: Date.now() };
    save(d); return delay({ ok: true, at: Date.now() }, 10);
  },
  async submit(labId, project, result) {
    const u = need(); const d = db();
    const sub = { userId: u.id, labId, project: clone(project), at: Date.now(), score: result?.score ?? 0, max: result?.max ?? 100, passed: !!result?.passed, criteria: clone(result?.criteria || []) };
    d.submissions[`${u.id}|${labId}`] = sub; save(d);
    return delay(clone(sub), 150);
  },
  async getSubmission(labId, userId) {
    const u = need(); const d = db();
    const uid = userId && u.role === 'teacher' ? userId : u.id;
    return delay(clone(d.submissions[`${uid}|${labId}`] || null), 10);
  },
  async getGradebook(classId) {
    need(); const d = db(); const c = d.classes.find((x) => x.id === classId);
    if (!c) throw new Error('Không tìm thấy lớp');
    const students = c.studentIds.map((sid) => d.users.find((u) => u.id === sid)).filter(Boolean);
    const grades = {};
    for (const s of students) {
      grades[s.id] = {};
      for (const l of COURSE) { const sub = d.submissions[`${s.id}|${l.id}`]; if (sub) grades[s.id][l.id] = { score: sub.score, max: sub.max, passed: sub.passed, at: sub.at }; }
    }
    return delay({ classId, students: clone(students), labs: COURSE.map((l) => ({ id: l.id, title: l.title, part: l.part })), grades: clone(grades), schedule: clone(c.schedule) });
  },
  async updateSchedule(classId, labId, patch) {
    const u = need(); if (u.role !== 'teacher') throw new Error('Không có quyền');
    const d = db(); const c = d.classes.find((x) => x.id === classId);
    c.schedule[labId] = { ...(c.schedule[labId] || {}), ...patch }; save(d);
    return delay(clone(c.schedule[labId]), 10);
  },
  /** Giảng viên gán lỗi cho 1 SV / 1 lab. SV sẽ gặp lỗi này khi mở lab. */
  async setFaults(studentId, labId, faultIds) {
    const u = need(); if (u.role !== 'teacher') throw new Error('Không có quyền');
    const d = db(); d.faults[`${studentId}|${labId}`] = [...faultIds]; save(d);
    return delay(true, 10);
  },
  async getFaults(labId, userId) {
    const u = need(); const d = db();
    return delay(clone(d.faults[`${userId || u.id}|${labId}`] || []), 5);
  },
  async getUser(id) { need(); return delay(clone(db().users.find((u) => u.id === id) || null), 5); },
};

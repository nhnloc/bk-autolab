// Kiểm tra song ngữ giao diện: không còn chuỗi tiếng Việt cố định trong mã UI (phải đi qua t() trong src/app/i18n.js).
// Quét index.html, src/app/**, src/scene/** — tìm string literal / template literal có dấu tiếng Việt (bỏ qua chú thích).
// Đồng thời kiểm tra mọi khóa vi trong i18n.js đều có bản en (và ngược lại), và các {tham số} khớp nhau.
// Chạy: node tests/ui-strings.test.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

// Ngoại lệ thật sự cần thiết: [đường dẫn (tiền tố), lý do].
const ALLOW_FILES = [
  ['src/app/i18n.js', 'bảng chuỗi giao diện'],
  ['src/app/dev/', 'engine giả lập chỉ dùng khi phát triển (?engine=fake): dữ liệu máy/lab mẫu, không có ở bản chạy thật'],
];
// Ngoại lệ theo chuỗi: [file, đoạn chuỗi, lý do].
const ALLOW_STRINGS = [
  ['index.html', '<noscript>BK-AutoLab cần JavaScript · BK-AutoLab requires JavaScript.</noscript>', 'noscript: không có JS để đổi ngôn ngữ nên ghi cả hai thứ tiếng'],
];

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(m?js|html)$/.test(n)) out.push(p);
  }
  return out;
}

/** Trả về các literal chuỗi ({ text, line }) trong mã JS, bỏ chú thích; template: chỉ phần chữ (không gồm ${...}). */
export function jsStrings(src) {
  const out = [];
  let i = 0, line = 1;
  const n = src.length;
  let prevSig = ''; // ký tự có nghĩa trước đó (để đoán regex)
  let prevWord = '';
  const stack = []; // template đang mở: số { lồng nhau trong ${ }
  function readTemplate() { // i trỏ sau ` hoặc sau } đóng ${
    let buf = '', start = line;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { buf += src.slice(i, i + 2); if (src[i + 1] === '\n') line++; i += 2; continue; }
      if (c === '`') { i++; out.push({ text: buf, line: start }); return 'end'; }
      if (c === '$' && src[i + 1] === '{') { i += 2; out.push({ text: buf, line: start }); stack.push(0); return 'expr'; }
      if (c === '\n') line++;
      buf += c; i++;
    }
    return 'end';
  }
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const seg = src.slice(i, e < 0 ? n : e + 2); line += (seg.match(/\n/g) || []).length; i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, buf = '';
      while (j < n && src[j] !== c) { if (src[j] === '\\') { buf += src.slice(j, j + 2); j += 2; continue; } if (src[j] === '\n') break; buf += src[j]; j++; }
      out.push({ text: buf, line }); i = j + 1; prevSig = 'a'; prevWord = ''; continue;
    }
    if (c === '`') { i++; if (readTemplate() === 'end') { prevSig = 'a'; } continue; }
    if (c === '/') {
      const regexOk = !prevSig || /[(,=:[!&|?{};+\-*%<>~^]/.test(prevSig) || /^(return|typeof|case|of|in|void|delete|throw|new)$/.test(prevWord);
      if (regexOk) {
        let j = i + 1, cls = false;
        while (j < n) { const d = src[j]; if (d === '\\') { j += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; j++; }
        j++; while (/[a-z]/i.test(src[j] || '')) j++;
        i = j; prevSig = 'a'; prevWord = ''; continue;
      }
    }
    if (stack.length) {
      if (c === '{') { stack[stack.length - 1]++; }
      else if (c === '}') {
        if (stack[stack.length - 1] === 0) { stack.pop(); i++; if (readTemplate() === 'end') prevSig = 'a'; continue; }
        stack[stack.length - 1]--;
      }
    }
    if (/[\w$]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(src[j])) j++; prevWord = src.slice(i, j); prevSig = 'a'; i = j; continue; }
    prevSig = c; prevWord = ''; i++;
  }
  return out;
}

function htmlStrings(src) {
  const out = [];
  const noCom = src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  // phần script: chỉ lấy literal; phần còn lại: text + giá trị thuộc tính
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let last = 0, m;
  const lineAt = (idx) => noCom.slice(0, idx).split('\n').length;
  const plain = (s, off) => { s.split('\n').forEach((ln, k) => { if (VI.test(ln)) out.push({ text: ln.trim(), line: lineAt(off) + k }); }); };
  while ((m = re.exec(noCom))) {
    plain(noCom.slice(last, m.index), last);
    const base = lineAt(m.index) - 1;
    for (const s of jsStrings(m[1])) out.push({ text: s.text, line: base + s.line });
    last = m.index + m[0].length;
  }
  plain(noCom.slice(last), last);
  return out;
}

const files = [join(ROOT, 'index.html'), ...walk(join(ROOT, 'src/app')), ...walk(join(ROOT, 'src/scene'))];
const bad = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  if (ALLOW_FILES.some(([p]) => rel.startsWith(p))) continue;
  const src = readFileSync(f, 'utf8');
  const strs = rel.endsWith('.html') ? htmlStrings(src) : jsStrings(src);
  for (const s of strs) {
    if (!VI.test(s.text)) continue;
    if (ALLOW_STRINGS.some(([p, sub]) => rel === p && s.text.includes(sub) && s.text.trim() === sub)) continue;
    bad.push(`${rel}:${s.line}  ${JSON.stringify(s.text.length > 90 ? s.text.slice(0, 90) + '…' : s.text)}`);
  }
}

/* ---------- bảng i18n: vi ⇄ en đầy đủ, tham số khớp ---------- */
const { STR } = await import('../src/app/i18n.js').catch((e) => { bad.push('Không nạp được src/app/i18n.js: ' + e.message); return {}; });
let missing = [];
if (STR) {
  const params = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',');
  for (const k of Object.keys(STR.vi)) {
    if (!(k in STR.en)) missing.push(`en thiếu: ${k}`);
    else if (params(STR.vi[k]) !== params(STR.en[k])) missing.push(`tham số khác nhau: ${k} (vi {${params(STR.vi[k])}} / en {${params(STR.en[k])}})`);
    else if (VI.test(STR.en[k])) missing.push(`en còn dấu tiếng Việt: ${k} = ${JSON.stringify(STR.en[k])}`);
  }
  for (const k of Object.keys(STR.en)) if (!(k in STR.vi)) missing.push(`vi thiếu: ${k}`);
}

if (bad.length || missing.length) {
  if (bad.length) console.log(`✗ ${bad.length} chuỗi tiếng Việt cố định (chuyển vào src/app/i18n.js):\n  ` + bad.join('\n  '));
  if (missing.length) console.log(`✗ ${missing.length} lỗi bảng i18n:\n  ` + missing.join('\n  '));
  process.exit(1);
}
console.log(`✓ ${files.length} file UI không còn chuỗi tiếng Việt cố định; ${Object.keys(STR.vi).length} khóa i18n đủ vi/en.`);

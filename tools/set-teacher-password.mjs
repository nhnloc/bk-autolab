// Đặt mật khẩu giảng viên cho bản web: node tools/set-teacher-password.mjs
// Ghi data/teacher.json (chỉ chứa salt + băm PBKDF2, không chứa mật khẩu). Sau đó commit + git push.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const ITER = 200000;
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (q) => new Promise((res) => {
  process.stdout.write(q);
  rl.output.write = () => {};                      // ẩn ký tự khi gõ
  rl.question('', (a) => { rl.output.write = process.stdout.write.bind(process.stdout); process.stdout.write('\n'); res(a); });
});
const p1 = await ask('Mật khẩu giảng viên mới (ít nhất 10 ký tự): ');
const p2 = await ask('Nhập lại: ');
rl.close();
if (p1 !== p2) { console.error('Hai lần nhập không khớp.'); process.exit(1); }
if (p1.length < 10) { console.error('Mật khẩu quá ngắn (cần ít nhất 10 ký tự).'); process.exit(1); }
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(p1, salt, ITER, 32, 'sha256').toString('hex');
const file = new URL('../data/teacher.json', import.meta.url);
writeFileSync(file, JSON.stringify({ algo: 'PBKDF2-SHA256', iterations: ITER, salt, hash }, null, 2) + '\n');
console.log('Đã ghi data/teacher.json. Tiếp theo: git add data/teacher.json && git commit -m "Đặt mật khẩu giảng viên" && git push');

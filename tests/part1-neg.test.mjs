// Chương trình sai điển hình phải bị trừ điểm
import { LAB_BY_ID, starterProject } from '../src/labs/index.js';
import { gradeLab } from '../src/labs/grader.js';
const scl = (lab, src, fields = []) => { const p = starterProject(lab); p.blocks = [{ name: 'St', type: 'DB', fields }, { name: 'Main', type: 'OB', number: 1, lang: 'SCL', source: src }]; return p; };
const cases = [
  ['L01', 'BUZ dùng NO thay vì NC', `"H1":="S1"; "H2":="S1" AND "S2"; "H3":="S2" OR "SW1"; "BUZ":="S3"; "H4":="PRX" AND NOT "PE";`, ['t4']],
  ['L02', 'Không khóa liên động', `"KM1" := ("S_Up" OR "KM1") AND "Stop" AND "F1" AND NOT "LS_Up"; "KM2" := ("S_Down" OR "KM2") AND "Stop" AND "F1" AND NOT "LS_Down" AND NOT "PE"; "H_Up":="KM1"; "H_Down":="KM2"; "H_Fault" := NOT "F1";`, ['interlock']],
  ['L02', 'Không tự giữ', `"KM1" := "S_Up" AND "Stop" AND NOT "LS_Up" AND NOT "KM2"; "KM2" := "S_Down" AND "Stop" AND NOT "LS_Down" AND NOT "KM1"; "H_Up":="KM1"; "H_Down":="KM2";`, ['up', 'down']],
  ['L03', 'Khởi động trực tiếp tam giác', `IF "Start" THEN "St".Run := TRUE; END_IF; IF NOT "Stop" OR NOT "EStop" THEN "St".Run := FALSE; END_IF; "H_Run" := "St".Run; "KM1" := "St".Run AND "PS"; "KM3" := "KM1";`, ['quality']],
  ['L04', 'Không đổi thùng khi đủ 12', `IF "Start" THEN "St".Run := TRUE; END_IF; IF NOT "Stop" OR NOT "EStop" THEN "St".Run := FALSE; END_IF; "H_Run" := "St".Run; "M1" := "St".Run;`, ['throughput']],
];
let bad = 0;
for (const [id, name, src, mustFail] of cases) {
  const r = await gradeLab(LAB_BY_ID[id], scl(LAB_BY_ID[id], src, [{ name: 'Run', type: 'Bool' }]));
  const failed = r.checks.filter((c) => !c.pass).map((c) => c.id);
  const ok = mustFail.every((f) => failed.includes(f));
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', id, name, r.score, 'failed:', failed.join(','));
}
process.exit(bad ? 1 : 0);

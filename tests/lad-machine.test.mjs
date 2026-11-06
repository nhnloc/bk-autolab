// Lời giải LAD cho bộ cấp phôi: kiểm tra LAD trên máy thật (set/reset, TON, P-contact).
import { LAB_BY_ID, starterProject } from '../src/labs/index.js';
import { gradeLab } from '../src/labs/grader.js';
const S = (...items) => ({ t: 'series', items }), P = (...branches) => ({ t: 'parallel', branches });
const NO = (op) => ({ t: 'contact', kind: 'NO', op }), NC = (op) => ({ t: 'contact', kind: 'NC', op });
const C = (op, kind = '=') => ({ t: 'coil', kind, op });
const lab = LAB_BY_ID.L07;
const p = starterProject(lab);
p.tags.push(
  { name: 'Run', address: '%M0.0', type: 'Bool' }, { name: 'S10', address: '%M1.0', type: 'Bool' }, { name: 'S20', address: '%M1.1', type: 'Bool' },
  { name: 'S30', address: '%M1.2', type: 'Bool' }, { name: 'S40', address: '%M1.3', type: 'Bool' }, { name: 'S50', address: '%M1.4', type: 'Bool' },
  { name: 'Idle', address: '%M1.7', type: 'Bool' },
);
p.blocks[0].networks = [
  { title: 'Chạy / dừng', rung: S(P(S(NO('"Start"'), NO('"AutoMan"')), NO('"Run"')), NO('"Stop"'), NO('"EStop"'), NO('"AutoMan"'), C('"Run"')) },
  { title: 'Đèn + băng tải', rung: S(NO('"Run"'), C('"H_Run"'), C('"M1"')) },
  { title: 'Không ở bước nào', rung: S(NC('"S10"'), NC('"S20"'), NC('"S30"'), NC('"S40"'), NC('"S50"'), C('"Idle"')) },
  { title: 'Bắt đầu: kẹp', rung: S(NO('"Idle"'), NO('"Run"'), NO('"B4"'), NC('"B5"'), NO('"1B1"'), NO('"2B1"'), C('"S10"', 'S')) },
  { title: '10→20', rung: S(NO('"S10"'), NO('"2B2"'), C('"S10"', 'R'), C('"S20"', 'S')) },
  { title: '20→30', rung: S(NO('"S20"'), NO('"1B2"'), C('"S20"', 'R'), C('"S30"', 'S')) },
  { title: '30→40', rung: S(NO('"S30"'), NO('"1B1"'), C('"S30"', 'R'), C('"S40"', 'S')) },
  { title: '40→50', rung: S(NO('"S40"'), NO('"2B1"'), C('"S40"', 'R'), C('"S50"', 'S')) },
  { title: 'chờ rơi', rung: S(NO('"S50"'), { t: 'box', fn: 'TON', instance: '"T_Drop"', params: { PT: 'T#300ms' } }, C('"S50"', 'R')) },
  { title: 'Van', rung: P(S(P(NO('"S10"'), NO('"S20"'), NO('"S30"')), C('"2Y1"')), S(NO('"S20"'), C('"1Y1"'))) },
  { title: 'Dừng khẩn', rung: S(NC('"EStop"'), C('"S10"', 'R'), C('"S20"', 'R'), C('"S30"', 'R'), C('"S40"', 'R'), C('"S50"', 'R'), C('"1Y1"', 'R'), C('"2Y1"', 'R'), C('"M1"', 'R')) },
];
const r = await gradeLab(lab, p);
console.log('LAD feeder', r.score, r.checks.filter(c => !c.pass).map(c => c.label + ': ' + c.detail));
process.exit(r.score === 100 ? 0 : 1);

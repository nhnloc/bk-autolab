// Đặc tả lệnh LAD phía UI: chân của box (khớp BOX_SPECS của src/plc/lad.js) + danh mục palette.

/** pin: chân nhận công suất (không lưu trong params); ins/outs: chân có toán hạng; out: chân xuất công suất. */
export const BOX_PINS = {
  TON: { pin: 'IN', ins: ['PT'], outs: ['Q', 'ET'], out: 'Q', inst: true },
  TOF: { pin: 'IN', ins: ['PT'], outs: ['Q', 'ET'], out: 'Q', inst: true },
  TP: { pin: 'IN', ins: ['PT'], outs: ['Q', 'ET'], out: 'Q', inst: true },
  TONR: { pin: 'IN', ins: ['R', 'PT'], outs: ['Q', 'ET'], out: 'Q', inst: true },
  CTU: { pin: 'CU', ins: ['R', 'PV'], outs: ['Q', 'CV'], out: 'Q', inst: true },
  CTD: { pin: 'CD', ins: ['LD', 'PV'], outs: ['Q', 'CV'], out: 'Q', inst: true },
  CTUD: { pin: 'CU', ins: ['CD', 'R', 'LD', 'PV'], outs: ['QU', 'QD', 'CV'], out: 'QU', inst: true },
  R_TRIG: { pin: 'CLK', ins: [], outs: ['Q'], out: 'Q', inst: 'optional' },
  F_TRIG: { pin: 'CLK', ins: [], outs: ['Q'], out: 'Q', inst: 'optional' },
  SR: { pin: 'S', ins: ['R1'], outs: ['Q'], out: 'Q', bit: true },
  RS: { pin: 'R', ins: ['S1'], outs: ['Q'], out: 'Q', bit: true },
  MOVE: { pin: 'EN', ins: ['IN'], outs: ['OUT1'], out: 'ENO' },
  ADD: { pin: 'EN', ins: ['IN1', 'IN2'], outs: ['OUT'], out: 'ENO' },
  SUB: { pin: 'EN', ins: ['IN1', 'IN2'], outs: ['OUT'], out: 'ENO' },
  MUL: { pin: 'EN', ins: ['IN1', 'IN2'], outs: ['OUT'], out: 'ENO' },
  DIV: { pin: 'EN', ins: ['IN1', 'IN2'], outs: ['OUT'], out: 'ENO' },
  MOD: { pin: 'EN', ins: ['IN1', 'IN2'], outs: ['OUT'], out: 'ENO' },
  INC: { pin: 'EN', ins: ['IN_OUT'], outs: [], out: 'ENO' },
  DEC: { pin: 'EN', ins: ['IN_OUT'], outs: [], out: 'ENO' },
  SHL: { pin: 'EN', ins: ['IN', 'N'], outs: ['OUT'], out: 'ENO' },
  SHR: { pin: 'EN', ins: ['IN', 'N'], outs: ['OUT'], out: 'ENO' },
  NORM_X: { pin: 'EN', ins: ['MIN', 'VALUE', 'MAX'], outs: ['OUT'], out: 'ENO' },
  SCALE_X: { pin: 'EN', ins: ['MIN', 'VALUE', 'MAX'], outs: ['OUT'], out: 'ENO' },
  LIMIT: { pin: 'EN', ins: ['MN', 'IN', 'MX'], outs: ['OUT'], out: 'ENO' },
  CALL: { pin: 'EN', ins: [], outs: [], out: 'ENO' },
};

/** Chân của box CALL lấy từ interface của khối được gọi. */
export function boxPins(node, project) {
  const spec = BOX_PINS[node.fn] || { pin: 'EN', ins: [], outs: [], out: 'ENO' };
  if (node.fn !== 'CALL') return spec;
  const name = String(node.block || '').replace(/"/g, '');
  const blk = project?.blocks?.find((b) => b.name === name);
  const itf = blk?.interface || {};
  return {
    ...spec,
    ins: [...(itf.Input || []), ...(itf.InOut || [])].map((v) => v.name).filter(Boolean),
    outs: (itf.Output || []).map((v) => v.name).filter(Boolean),
    inst: blk?.type === 'FB',
  };
}

let counter = 0;
const nextIdx = (project, prefix) => {
  const used = new Set();
  const walk = (n) => { if (!n) return; if (n.t === 'series') n.items.forEach(walk); else if (n.t === 'parallel') n.branches.forEach(walk); else if (n.instance) used.add(String(n.instance).replace(/"/g, '')); };
  for (const b of project?.blocks || []) for (const nw of b.networks || []) walk(nw.rung);
  for (const b of project?.blocks || []) used.add(b.name);
  let i = 0; while (used.has(`${prefix}${i}_DB`)) i++;
  counter = i;
  return `"${prefix}${i}_DB"`;
};

/** Tạo node mới cho một mục palette. */
export function makeNode(key, project) {
  switch (key) {
    case 'NO': case 'NC': case 'P': case 'N': case 'NOT': {
      const n = { t: 'contact', kind: key, op: '' };
      if (key === 'NOT') delete n.op;
      return n;
    }
    case 'coil=': return { t: 'coil', kind: '=', op: '' };
    case 'coil/': return { t: 'coil', kind: '/', op: '' };
    case 'coilS': return { t: 'coil', kind: 'S', op: '' };
    case 'coilR': return { t: 'coil', kind: 'R', op: '' };
    case 'coilP': return { t: 'coil', kind: 'P', op: '' };
    case 'coilN': return { t: 'coil', kind: 'N', op: '' };
  }
  if (key.startsWith('cmp')) return { t: 'cmp', op: key.slice(3), type: 'Int', in1: '', in2: '' };
  if (key.startsWith('call:')) {
    const name = key.slice(5);
    const blk = project?.blocks?.find((b) => b.name === name);
    const n = { t: 'box', fn: 'CALL', block: name, params: {} };
    if (blk?.type === 'FB') n.instance = nextIdx(project, name + '_');
    return n;
  }
  const spec = BOX_PINS[key];
  if (!spec) return null;
  const n = { t: 'box', fn: key, params: {} };
  if (spec.inst === true) n.instance = nextIdx(project, /^T/.test(key) ? 'IEC_Timer_' : 'IEC_Counter_');
  if (spec.bit) n.instance = '';
  if (/^T(ON|OF|P|ONR)$/.test(key)) n.params.PT = 'T#2s';
  if (/^CT/.test(key)) n.params.PV = '10';
  return n;
}

/** Danh mục lệnh (palette) giống thư viện lệnh "Basic instructions". */
export const PALETTE = [
  { id: 'bit', title: 'Logic bit', items: [
    { key: 'NO', label: '-| |-', name: 'Tiếp điểm thường mở', icon: 'NO', kbd: 'Shift+F2', scl: '' },
    { key: 'NC', label: '-|/|-', name: 'Tiếp điểm thường đóng', icon: 'NC', kbd: 'Shift+F3' },
    { key: 'NOT', label: '-|NOT|-', name: 'Đảo kết quả logic', icon: 'NOT' },
    { key: 'P', label: '-|P|-', name: 'Sườn lên của toán hạng', icon: 'P' },
    { key: 'N', label: '-|N|-', name: 'Sườn xuống của toán hạng', icon: 'N' },
    { key: 'coil=', label: '-( )-', name: 'Cuộn dây (gán)', icon: '=', kbd: 'Shift+F7' },
    { key: 'coil/', label: '-(/)-', name: 'Cuộn dây đảo', icon: '/' },
    { key: 'coilS', label: '-(S)-', name: 'Set', icon: 'S' },
    { key: 'coilR', label: '-(R)-', name: 'Reset', icon: 'R' },
    { key: 'coilP', label: '-(P)-', name: 'Xung khi sườn lên', icon: 'coilP' },
    { key: 'coilN', label: '-(N)-', name: 'Xung khi sườn xuống', icon: 'coilN' },
    { key: 'SR', label: 'SR', name: 'Flip-flop Set/Reset (Reset ưu tiên)' },
    { key: 'RS', label: 'RS', name: 'Flip-flop Reset/Set (Set ưu tiên)' },
    { key: 'R_TRIG', label: 'R_TRIG', name: 'Phát hiện sườn lên', scl: '#R_TRIG_1(CLK := );\n' },
    { key: 'F_TRIG', label: 'F_TRIG', name: 'Phát hiện sườn xuống', scl: '#F_TRIG_1(CLK := );\n' },
  ] },
  { id: 'timer', title: 'Bộ định thời', items: [
    { key: 'TP', label: 'TP', name: 'Tạo xung', scl: '"IEC_Timer_0_DB".TP(IN := , PT := T#1s);\n' },
    { key: 'TON', label: 'TON', name: 'Trễ đóng', scl: '"IEC_Timer_0_DB".TON(IN := , PT := T#2s);\n' },
    { key: 'TOF', label: 'TOF', name: 'Trễ ngắt', scl: '"IEC_Timer_0_DB".TOF(IN := , PT := T#2s);\n' },
    { key: 'TONR', label: 'TONR', name: 'Trễ đóng có nhớ', scl: '"IEC_Timer_0_DB".TONR(IN := , R := , PT := T#2s);\n' },
  ] },
  { id: 'counter', title: 'Bộ đếm', items: [
    { key: 'CTU', label: 'CTU', name: 'Đếm lên', scl: '"IEC_Counter_0_DB".CTU(CU := , R := , PV := 10);\n' },
    { key: 'CTD', label: 'CTD', name: 'Đếm xuống', scl: '"IEC_Counter_0_DB".CTD(CD := , LD := , PV := 10);\n' },
    { key: 'CTUD', label: 'CTUD', name: 'Đếm lên/xuống' },
  ] },
  { id: 'cmp', title: 'So sánh', items: ['==', '<>', '>=', '<=', '>', '<'].map((o) => ({ key: 'cmp' + o, label: 'CMP ' + o, name: 'So sánh ' + o, icon: 'cmp', scl: `IF a ${o === '==' ? '=' : o} b THEN\n  ;\nEND_IF;\n` })) },
  { id: 'move', title: 'Di chuyển & dịch', items: [
    { key: 'MOVE', label: 'MOVE', name: 'Chép giá trị', scl: 'dst := src;\n' },
    { key: 'SHL', label: 'SHL', name: 'Dịch trái', scl: 'x := SHL(IN := x, N := 1);\n' },
    { key: 'SHR', label: 'SHR', name: 'Dịch phải', scl: 'x := SHR(IN := x, N := 1);\n' },
  ] },
  { id: 'math', title: 'Toán học', items: [
    { key: 'ADD', label: 'ADD', name: 'Cộng', scl: 'out := in1 + in2;\n' },
    { key: 'SUB', label: 'SUB', name: 'Trừ', scl: 'out := in1 - in2;\n' },
    { key: 'MUL', label: 'MUL', name: 'Nhân', scl: 'out := in1 * in2;\n' },
    { key: 'DIV', label: 'DIV', name: 'Chia', scl: 'out := in1 / in2;\n' },
    { key: 'MOD', label: 'MOD', name: 'Chia lấy dư', scl: 'out := in1 MOD in2;\n' },
    { key: 'INC', label: 'INC', name: 'Tăng 1' },
    { key: 'DEC', label: 'DEC', name: 'Giảm 1' },
    { key: 'LIMIT', label: 'LIMIT', name: 'Giới hạn' },
  ] },
  { id: 'conv', title: 'Chuyển đổi', items: [
    { key: 'NORM_X', label: 'NORM_X', name: 'Chuẩn hóa', scl: 'r := NORM_X(MIN := 0, VALUE := x, MAX := 27648);\n' },
    { key: 'SCALE_X', label: 'SCALE_X', name: 'Co giãn', scl: 'y := SCALE_X(MIN := 0.0, VALUE := r, MAX := 100.0);\n' },
  ] },
  { id: 'prog', title: 'Điều khiển chương trình', items: [] }, // điền động: gọi FC/FB của project
];

export const DATA_TYPES = ['Bool', 'Byte', 'Word', 'DWord', 'Int', 'UInt', 'DInt', 'Real', 'Time', 'Char', 'String', 'IEC_TIMER', 'IEC_COUNTER', 'TON', 'TOF', 'CTU', 'R_TRIG'];
export const SCL_KEYWORDS = ['IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF', 'CASE', 'OF', 'END_CASE', 'FOR', 'TO', 'BY', 'DO', 'END_FOR', 'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT', 'EXIT', 'CONTINUE', 'RETURN', 'AND', 'OR', 'XOR', 'NOT', 'MOD', 'TRUE', 'FALSE', 'REGION', 'END_REGION', 'VAR', 'END_VAR'];

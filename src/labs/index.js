// Nội dung các bài lab giai đoạn này (nhóm A + B1, B4) và hàm tạo project.
import { MACHINES } from '../sim/index.js';
// Lời giải tham khảo KHÔNG nằm trong repo/web: đặt ở bk-autolab/private/solutions.js (đã .gitignore) trên máy giảng viên.
let SOL = null;
export async function loadSolutions() {
  if (SOL) return true;
  try { SOL = await import('../../private/solutions.js'); } catch { SOL = null; }
  return !!SOL;
}

/** Bảng tag PLC sinh từ ioMap của máy. */
export function tagsFor(machineId) {
  const def = MACHINES[machineId];
  return [...def.ioMap.inputs, ...def.ioMap.outputs].map((io) => ({ name: io.tag, address: io.addr, type: io.type || 'Bool', comment: io.desc }));
}

/** Project khởi đầu cho sinh viên: đủ tag, OB1 LAD có 1 network mẫu (đèn Run theo công tắc Auto). */
export function starterProject(lab) {
  const def = MACHINES[lab.machineId];
  return {
    schema: 'bk-autolab/project@1',
    name: `${lab.id} — ${lab.title}`,
    machineId: lab.machineId,
    cpu: def.cpu || '1214C',
    tags: tagsFor(lab.machineId),
    blocks: [
      { name: 'Main', type: 'OB', number: 1, lang: 'LAD', networks: [
        { title: 'Ví dụ: đèn Run sáng khi công tắc ở Auto', comment: 'Xóa network này và bắt đầu viết chương trình của bạn.',
          rung: { t: 'series', items: [{ t: 'contact', kind: 'NO', op: '"AutoMan"' }, { t: 'coil', kind: '=', op: '"H_Run"' }] } },
      ] },
    ],
    watch: [],
  };
}

/** Project lời giải tham khảo (SCL). */
export function solutionProject(lab) {
  if (!SOL || !SOL.SOLUTIONS[lab.machineId]) return null;
  const { SOLUTIONS, solutionFields } = SOL;
  const sol = SOLUTIONS[lab.machineId];
  const p = starterProject(lab);
  p.name = `${lab.id} — Lời giải tham khảo`;
  const def = MACHINES[lab.machineId];
  const offs = def.ioMap.outputs.map((o) => `"${o.tag}" := ${o.type && o.type !== 'Bool' ? '0' : 'FALSE'};`).join(' ');
  const estop = `\n// ---- Dừng khẩn: về bước 0, tắt mọi đầu ra ----\nIF NOT "EStop" THEN\n  "St".Run := FALSE; "St".Step := 0;\n  ${offs}\nEND_IF;\n`;
  p.blocks = [
    { name: 'St', type: 'DB', number: 1, fields: solutionFields(lab.machineId) },
    { name: 'Main', type: 'OB', number: 1, lang: 'SCL', source: sol.source.trim() + '\n' + estop },
  ];
  p.watch = [{ op: '"St".Step' }, { op: '"St".Run' }];
  return p;
}

const SAFETY_TASKS = [
  'Nút Start chỉ có tác dụng khi công tắc ở Auto, Stop và Dừng khẩn không bị nhấn.',
  'Nhấn Stop hoặc Dừng khẩn: máy dừng ngay, mọi van và động cơ tắt. Nhả Dừng khẩn không được tự chạy lại — phải nhấn Start.',
  'Đèn H_Run sáng khi máy đang chạy tự động; đèn H_Fault sáng khi một bước bị kẹt quá thời gian giám sát.',
];


/* ---------------- Phần 1: PLC cơ bản ---------------- */
const truth = async (c, label, max, combos, expect) => {
  // combos: [{ S1:1, S2:0, ... }], expect(state) → { tag: bool }
  const fails = [];
  for (const st of combos) {
    for (const [k, v] of Object.entries(st)) c.set(k, v);
    await c.run(80);
    const want = expect(st);
    for (const [tag, w] of Object.entries(want)) if (!!c.out(tag) !== !!w) fails.push(`${Object.entries(st).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' ')} → ${tag} phải ${w ? 'BẬT' : 'TẮT'}`);
    for (const k of Object.keys(st)) c.set(k, false);
  }
  await c.run(80);
  c.add(label.id, label.text, max, fails.length === 0, fails.slice(0, 3).join('\n'));
};
const combos = (keys) => { const out = []; for (let i = 0; i < 1 << keys.length; i++) out.push(Object.fromEntries(keys.map((k, j) => [k, !!(i >> j & 1)]))); return out; };

const PART1 = [
  {
    id: 'L01', part: 1, week: 1, machineId: 'trainer', level: 1, durationMin: 90,
    title: 'Làm quen PLC: địa chỉ I/O và logic bit',
    objectives: ['Hiểu ngõ vào %I, ngõ ra %Q và bảng tag', 'Dùng tiếp điểm thường mở (NO), thường đóng (NC) và cuộn dây trong LAD', 'Ghép nối tiếp (AND), song song (OR)', 'Phân biệt nút nhấn NO / NC và cảm biến PNP / NPN'],
    tasks: [
      'H1 (đỏ) sáng khi nhấn S1.',
      'H2 (vàng) sáng khi nhấn đồng thời S1 và S2.',
      'H3 (xanh lá) sáng khi nhấn S2 HOẶC công tắc SW1 ở vị trí phải.',
      'Còi BUZ kêu khi nhấn S3. Lưu ý: S3 là nút thường đóng (NC) — bình thường ngõ vào = 1, nhấn = 0.',
      'H4 (xanh dương) sáng khi cảm biến tiệm cận PRX thấy kim loại VÀ tia cảm biến quang PE KHÔNG bị chắn.',
      'Thử nghiệm: bấm "Thay bằng cảm biến NPN" rồi đưa kim loại vào — quan sát đèn trên cảm biến và ngõ vào %I1.1. Giải thích vì sao.',
    ],
    hints: ['Nút NC: muốn "khi nhấn" thì dùng tiếp điểm thường đóng -|/|- cho tag S3.', 'Bấm vào nút trên mô hình 3D hoặc trên bảng điều khiển 2D đều được.', 'Bật "Giám sát" để thấy dòng điện chạy qua từng tiếp điểm.'],
    grading: {
      scenario: async (c) => {
        await c.run(200);
        await truth(c, { id: 't1', text: 'H1 = S1' }, 18, combos(['S1']), (st) => ({ H1: st.S1 }));
        await truth(c, { id: 't2', text: 'H2 = S1 AND S2' }, 18, combos(['S1', 'S2']), (st) => ({ H2: st.S1 && st.S2 }));
        await truth(c, { id: 't3', text: 'H3 = S2 OR SW1' }, 18, combos(['S2', 'SW1']), (st) => ({ H3: st.S2 || st.SW1 }));
        await truth(c, { id: 't4', text: 'Còi BUZ kêu khi nhấn S3 (nút NC)' }, 18, combos(['S3']), (st) => ({ BUZ: st.S3 }));
        await truth(c, { id: 't5', text: 'H4 = có kim loại AND tia quang không bị chắn' }, 18, combos(['Metal', 'Block']), (st) => ({ H4: st.Metal && !st.Block }));
      },
    },
  },
  {
    id: 'L02', part: 1, week: 2, machineId: 'motor', level: 1, durationMin: 120,
    title: 'Mạch tự giữ và đảo chiều động cơ: cửa cuốn',
    objectives: ['Mạch tự giữ (seal-in) Start/Stop trong LAD', 'Khóa liên động (interlock) giữa 2 contactor đảo chiều', 'Dùng công tắc hành trình, rơ-le nhiệt và cảm biến an toàn'],
    tasks: [
      'Nhấn Lên (nhả tay): KM1 đóng và tự giữ, cửa đi lên; tới công tắc hành trình trên LS_Up thì KM1 nhả. Đèn H_Up sáng khi cửa đang lên.',
      'Nhấn Xuống: KM2 đóng và tự giữ, cửa đi xuống; tới LS_Down thì KM2 nhả. Đèn H_Down sáng khi cửa đang xuống.',
      'Nút Stop (thường đóng) và Dừng khẩn dừng cửa ở bất kỳ vị trí nào.',
      'Khóa liên động: KM1 và KM2 KHÔNG BAO GIỜ được đóng cùng lúc, kể cả khi nhấn cả hai nút.',
      'Khi cửa đang xuống mà cảm biến chân cửa PE báo có vật cản: dừng ngay.',
      'Khi rơ-le nhiệt F1 tác động (F1 = 0): dừng động cơ, bật đèn H_Fault.',
    ],
    hints: ['Nút Stop trên bảng là nút NC: ngõ vào "Stop" = 1 khi KHÔNG nhấn → dùng tiếp điểm thường mở cho "Stop".', 'Khóa liên động: đặt tiếp điểm NC của "KM2" nối tiếp trước cuộn dây "KM1" và ngược lại.'],
    grading: {
      scenario: async (c) => {
        const { m } = c;
        await c.run(300);
        // 1. Lên + tự giữ + dừng ở LS_Up
        await c.press('Up', 200);
        await c.run(800);
        const goingUp = c.out('KM1') && c.out('H_Up') && !c.out('KM2');
        await c.run(10500);
        c.add('up', 'Nhấn Lên: cửa tự giữ đi lên và dừng ở công tắc hành trình trên', 15, goingUp && m.pos >= 0.99 && !c.out('KM1') && m.f1, !goingUp ? 'Nhả nút Lên thì KM1 phải vẫn đóng (tự giữ) và H_Up sáng' : !m.f1 ? 'Rơ-le nhiệt tác động — KM1 không nhả khi chạm LS_Up' : c.out('KM1') ? 'KM1 vẫn đóng khi cửa đã mở hết' : '');
        // 2. Xuống
        await c.press('Down', 200);
        await c.run(800);
        const goingDown = c.out('KM2') && c.out('H_Down') && !c.out('KM1');
        await c.run(9800);
        c.add('down', 'Nhấn Xuống: cửa tự giữ đi xuống và dừng ở công tắc hành trình dưới', 15, goingDown && m.pos <= 0.01 && !c.out('KM2') && m.f1, !goingDown ? 'Nhả nút Xuống thì KM2 phải vẫn đóng và H_Down sáng' : c.out('KM2') ? 'KM2 vẫn đóng khi cửa đã đóng hết' : '');
        // 3. Stop giữa chừng
        await c.press('Up', 200); await c.run(3000);
        await c.press('Stop', 150); await c.run(1000);
        const p1 = m.pos; await c.run(1000);
        c.add('stop', 'Nút Stop dừng cửa giữa hành trình', 15, !c.out('KM1') && !c.out('KM2') && Math.abs(m.pos - p1) < 0.01 && p1 > 0.1 && p1 < 0.9, c.out('KM1') || c.out('KM2') ? 'Contactor vẫn đóng sau khi nhấn Stop' : '');
        // 4. Khóa liên động: nhấn cả hai
        let both = false;
        m.press('Up', true); m.press('Down', true);
        for (let i = 0; i < 20; i++) { await c.run(50); if (c.out('KM1') && c.out('KM2')) both = true; }
        m.press('Up', false); m.press('Down', false);
        await c.press('Down', 200); for (let i = 0; i < 20; i++) { await c.run(50); if (c.out('KM1') && c.out('KM2')) both = true; }
        await c.press('Up', 200); for (let i = 0; i < 20; i++) { await c.run(50); if (c.out('KM1') && c.out('KM2')) both = true; }
        await c.press('Stop', 150); await c.run(800);
        const movedAtAll = m.stats.produced > 0;
        c.add('interlock', 'Khóa liên động: KM1 và KM2 không bao giờ đóng cùng lúc', 15, movedAtAll && !both && m.stats.crashes === 0, both || m.stats.crashes ? 'KM1 và KM2 đã đóng cùng lúc — ngắn mạch' : '');
        if (m.crashed) { m.press('Reset', true); await c.run(200); m.press('Reset', false); }
        // 5. Vật cản khi đang xuống
        await c.press('Up', 200); await c.run(10500);
        c.set('Obstacle', true);
        await c.press('Down', 200); await c.run(6000);
        const stoppedForObstacle = !c.out('KM2') && m.pos > 0.12 && m.stats.crashes === 0;
        c.set('Obstacle', false); await c.press('Stop', 150); await c.run(500);
        c.add('obstacle', 'Có vật cản ở chân cửa khi đang xuống: dừng ngay', 15, stoppedForObstacle, stoppedForObstacle ? '' : 'Cửa vẫn đi xuống khi PE = 1');
        if (m.crashed) { m.press('Reset', true); await c.run(200); m.press('Reset', false); }
        // 6. Quá tải F1
        m.setFault('jam', true);
        await c.press('Down', 200); await c.run(4000);
        const tripped = !m.f1;
        const off = !c.out('KM1') && !c.out('KM2');
        const lamp = !!c.out('H_Fault');
        m.setFault('jam', false);
        c.add('overload', 'Rơ-le nhiệt F1 tác động: dừng động cơ và bật đèn H_Fault', 15, tripped && off && lamp, !tripped ? 'F1 không tác động (kiểm tra kịch bản)' : !off ? 'Contactor vẫn đóng khi F1 = 0' : !lamp ? 'Đèn H_Fault không sáng khi F1 = 0' : '');
      },
    },
  },
  {
    id: 'L03', part: 1, week: 3, machineId: 'stardelta', level: 2, durationMin: 120,
    title: 'Timer IEC: khởi động sao–tam giác máy nén khí',
    objectives: ['Dùng timer TON, TOF, TP với instance DB', 'Lập trình khởi động sao–tam giác có thời gian chết khi chuyển', 'Đọc tín hiệu analog áp suất, dòng điện; quan sát đồ thị dòng khởi động'],
    tasks: [
      'Nhấn Start (công tắc ở Auto): máy ở trạng thái sẵn sàng. Khi công tắc áp suất PS = 1 (áp thấp): đóng KM1 + KM2 (sao).',
      'Sau 4 s chạy sao: nhả KM2, chờ 80 ms (thời gian chết), rồi đóng KM3 (tam giác).',
      'Khi PS = 0 (đủ 8 bar): dừng động cơ (nhả KM1, KM3). Khi áp tụt, PS = 1 lại: tự khởi động sao–tam giác lại.',
      'KM2 và KM3 không bao giờ đóng cùng lúc.',
      'Stop / Dừng khẩn / rơ-le nhiệt F1 tác động: dừng ngay. F1 tác động thì bật H_Fault.',
      'Quan sát đồ thị: so sánh dòng khởi động khi chạy đúng sao–tam giác và khi thử đóng thẳng tam giác.',
    ],
    hints: ['Dùng một TON cho thời gian sao và một TON (hoặc TP) cho thời gian chết.', 'H_Run nên sáng khi máy ở trạng thái chạy tự động, kể cả lúc động cơ tạm dừng vì đủ áp.'],
    grading: { runMs: 60000, minGood: 2 },
  },
  {
    id: 'L04', part: 1, week: 4, machineId: 'counter', level: 2, durationMin: 120,
    title: 'Counter, so sánh, MOVE: đếm 12 lon vào thùng',
    objectives: ['Dùng bộ đếm CTU / CTUD với instance DB', 'So sánh (CMP) và MOVE giá trị ra bảng hiển thị', 'Điều khiển hai băng tải phối hợp theo cảm biến'],
    tasks: [
      'Nhấn Start: nếu có thùng đúng vị trí (B2 = 1) thì chạy băng tải sản phẩm M1.',
      'Đếm số lon rơi vào thùng bằng cảm biến B1. Hiển thị số đếm hiện tại lên bảng LED (MOVE vào "Display").',
      'Đủ 12 lon: dừng M1, bật đèn H_Full, chạy băng tải thùng M2 tới khi thùng rỗng mới tới vị trí (B2 = 1), reset bộ đếm, chạy tiếp.',
      'Không được để lon rơi khi không có thùng, không được bỏ quá 12 lon vào một thùng.',
      'Stop / Dừng khẩn: dừng cả hai băng tải.',
    ],
    hints: ['B2 vẫn = 1 trong lúc thùng đầy còn đứng yên: chờ B2 về 0 rồi lên 1 (thùng mới) mới chạy tiếp — dùng sườn lên.', 'Lon thứ 12 còn đang rơi khi bạn dừng M1? Hãy kiểm tra: dừng M1 ngay khi đếm đủ.'],
    grading: {
      runMs: 90000, minGood: 4,
      sampleLabel: 'Bảng LED hiển thị đúng số lon trong thùng đang nạp',
      sample: (m) => {
        const box = m.boxes.find((b) => Math.abs(b.y) < 12);
        if (!box || box.count === 0) return undefined;
        const v = m.outputs.Display || 0;
        return v === box.count || v === box.count - 1 || v === box.count + 1 ? true : `bảng LED = ${v}, thùng có ${box.count} lon`;
      },
    },
  },
];

export const LABS = [
  ...PART1,
  {
    id: 'L06', part: 2, week: 6, machineId: 'indexer', level: 2, durationMin: 120,
    title: 'Bàn xoay chia vị trí: trình tự nhiều trạm',
    objectives: ['Điều khiển chuyển động gián đoạn bằng động cơ + cam vị trí', 'Khóa liên động: không quay bàn khi chốt hoặc xi lanh chưa về', 'Dùng thanh ghi dịch 1 bit để mang kết quả kiểm tra từ trạm 2 sang trạm 3'],
    tasks: [
      'Chu trình mỗi nấc: đẩy chốt định vị → nạp phôi (nếu ổ gá trống và máng có phôi) → ép 300 ms → đọc kết quả kiểm tra → gạt phôi ở trạm 3 vào máng OK hoặc NG → rút chốt → quay bàn đúng 1 nấc.',
      'Bàn chỉ được dừng khi cam IdxPos chuyển từ 0 lên 1 (bắt sườn lên).',
      'Kết quả kiểm tra đo ở trạm 2 phải được "nhớ" và dùng ở trạm 3 sau một nấc quay.',
      ...SAFETY_TASKS,
    ],
    hints: ['Bàn đứng ở vị trí chia thì IdxPos = 1 ngay khi bắt đầu: phải chờ IdxPos về 0 rồi lên 1 mới dừng.', 'HeightOK chỉ có nghĩa khi P2 = 1.'],
    grading: { runMs: 60000, minGood: 6 },
  },
  {
    id: 'L07', part: 2, week: 7, machineId: 'feeder', level: 2, durationMin: 90,
    title: 'Bộ cấp phôi từ ổ chứa',
    objectives: ['Điều khiển 2 xi lanh theo trình tự có điều kiện', 'Hiểu vai trò xi lanh kẹp giữ chồng phôi', 'Dùng cảm biến báo sắp hết/hết phôi'],
    tasks: [
      'Trình tự: 2A kẹp giữ chồng phôi → 1A đẩy phôi đáy ra → 1A lùi → 2A nhả cho chồng phôi rơi xuống → chờ 300 ms.',
      'Chỉ đẩy phôi khi có phôi ở đáy ổ (B4) và cuối băng tải trống (B5 = 0).',
      'Băng tải chạy khi máy ở trạng thái chạy.',
      ...SAFETY_TASKS,
    ],
    hints: ['Đẩy khi 2A chưa giữ: phôi thứ hai bị kéo theo và kẹt.'],
    grading: { runMs: 45000, minGood: 8 },
  },
  {
    id: 'L08', part: 2, week: 8, machineId: 'escapement', level: 2, durationMin: 90,
    title: 'Bộ tách thùng trên băng tải tích lũy',
    objectives: ['Tách từng thùng một bằng hai chặn so le', 'Điều kiện cho phép nhả thùng từ máy phía sau', 'Tránh nâng chặn trúng đáy thùng'],
    tasks: [
      'Bình thường: chặn 2 nâng giữ thùng đầu, chặn 1 hạ.',
      'Khi có thùng ở chặn 2 (B3) và đầu ra trống (B5 = 0): nâng chặn 1 → hạ chặn 2 → chờ thùng đi qua → nâng chặn 2 → hạ chặn 1.',
      'Không được nhả 2 thùng cùng lúc.',
      ...SAFETY_TASKS,
    ],
    hints: ['Chặn 1 đặt cách chặn 2 đúng một chiều dài thùng.'],
    grading: { runMs: 45000, minGood: 8 },
  },
  {
    id: 'L09', part: 2, week: 8, machineId: 'diverter', level: 3, durationMin: 150,
    title: 'Hệ phân phối thùng 3 làn',
    objectives: ['Theo dõi vị trí sản phẩm trên băng tải bằng bộ đệm vòng (FIFO)', 'Ra quyết định gạt theo mã sản phẩm', 'Xử lý làn đầy và thùng không đọc được mã'],
    tasks: [
      'Băng tải chính chạy 100 % tốc độ (M1_Speed = 27648) khi máy chạy.',
      'Đầu đọc mã ở X = 300 cho mã 1..3 của thùng. Thùng mã n phải vào làn n.',
      'Làn đầy (LnF = 1) hoặc không đọc được mã (Code = 0): cho thùng đi thẳng ra làn loại cuối băng.',
      'Mỗi lần gạt: xi lanh ra hết (nB2) rồi lùi.',
      ...SAFETY_TASKS,
    ],
    hints: ['Thùng tới gạt 3 có thể xảy ra sau khi thùng kế tiếp đã qua gạt 1: không dùng một biến "mã hiện tại" duy nhất.', 'Bắt sườn lên B0, CodeValid, B1..B3 bằng R_TRIG.'],
    grading: { runMs: 60000, minGood: 12, maxWrongLane: 0 },
  },
  {
    id: 'L10', part: 2, week: 9, machineId: 'erector', level: 3, durationMin: 180,
    title: 'Máy dựng thùng carton',
    objectives: ['Trình tự dài nhiều cơ cấu với van kép cuộn và chân không', 'Thử lại khi hút hụt', 'Điều kiện an toàn: cửa, khí nén, ổ chứa'],
    tasks: [
      'Tay hút tiến → hút → chờ VacOK (quá 1 s: lùi và thử lại) → kéo tấm carton về → tay mở bẻ thành hộp → gấp 2 vạt nhỏ → nhả chân không → tay mở về → đẩy thùng (sau 250 ms rút tay gấp) → đẩy lùi.',
      'Van 1A và 5A là van kép cuộn: chỉ cần xung, nhưng không được bật cả hai cuộn cùng lúc.',
      'Không bắt đầu chu trình mới khi hết carton, mất khí hoặc cửa mở. Bật đèn H_Low khi sắp hết carton.',
      ...SAFETY_TASKS,
    ],
    hints: ['Nhả chân không trước khi thùng mở hết thì tấm carton bật lại.', 'Đẩy thùng khi còn hút: thùng bị giật rách.'],
    grading: { runMs: 60000, minGood: 8 },
  },
  {
    id: 'L11A', part: 2, week: 9, machineId: 'sealer', level: 3, durationMin: 120,
    title: 'Máy dán thùng (đóng nắp)',
    objectives: ['Định vị thùng bằng chặn', 'Thứ tự gấp vạt và giữ nắp', 'Khóa liên động giữa tay gấp và đai kéo'],
    tasks: [
      'Băng tải vào đưa thùng tới chặn (BPos) → gấp vạt trước → gấp vạt sau → hạ tấm ép → rút hai tay gấp → hạ chặn → chạy đai kéo tới khi thùng ra (BOut) → nâng tấm ép.',
      'Không chạy đai kéo khi tay gấp chưa rút.',
      ...SAFETY_TASKS,
    ],
    hints: ['Tấm ép phải hạ trước khi thùng tới thanh gấp vạt lớn, nếu không vạt nhỏ bật lên.'],
    grading: { runMs: 60000, minGood: 6 },
  },
  {
    id: 'L11B', part: 2, week: 9, machineId: 'pickplace', level: 3, durationMin: 120,
    title: 'Trạm gắp–đặt 2 trục khí nén',
    objectives: ['Van 5/3 tâm kín và xi lanh không cần', 'Khóa liên động trục X – trục Z', 'Đồng bộ với băng tải khay theo cảm biến bước'],
    tasks: [
      'Z xuống → hút → chờ VacOK → Z lên → X sang vị trí đặt → chờ ô trống của khay (chạy băng tải khay tới khi BoxStep = 1) → Z xuống → nhả + thổi 150 ms → Z lên → X về.',
      'Không di chuyển X khi Z chưa lên hết.',
      ...SAFETY_TASKS,
    ],
    hints: ['Van 5/3: tắt cả hai cuộn thì trục X dừng tại chỗ.'],
    grading: { runMs: 60000, minGood: 1, minPlaced: 10 },
  },
  {
    id: 'L18P', part: 5, week: 14, machineId: 'palletizer', level: 4, durationMin: 240,
    title: 'Đồ án: máy xếp pallet khí nén',
    objectives: ['Kết hợp xi lanh và bàn nâng động cơ', 'Đếm hàng/lớp, quản lý pallet', 'Tránh va chạm giữa bàn nâng và tấm đỡ'],
    tasks: [
      'Gom 2 thùng → đẩy hàng lên tấm đỡ. Đủ 2 hàng → nâng pallet tới mức nhận lớp (LayerLvl) → mở tấm đỡ thả lớp → hạ bàn nâng tới khi LayerLvl → đóng tấm đỡ.',
      'Đủ 3 lớp: hạ bàn xuống đáy, chạy con lăn đưa pallet ra, chờ pallet mới.',
      'Không đóng tấm đỡ khi chồng hàng còn cao hơn tấm đỡ.',
      ...SAFETY_TASKS,
    ],
    hints: ['Băng tải vào phải dừng trong lúc đẩy hàng.'],
    grading: { runMs: 150000, minGood: 1 },
  },
];

export const LAB_BY_ID = Object.fromEntries(LABS.map((l) => [l.id, l]));
export { MACHINES };

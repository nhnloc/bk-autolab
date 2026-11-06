// Nội dung các bài lab giai đoạn này (nhóm A + B1, B4) và hàm tạo project.
import { MACHINES } from '../sim/index.js';
// Lời giải tham khảo KHÔNG nằm trong repo/web: đặt ở <thư mục dự án>/private/solutions.js trên máy giảng viên.
let SOL = null;
export async function loadSolutions() {
  if (SOL) return true;
  try { SOL = await import('../../../private/solutions.js'); } catch { SOL = null; }
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

export const LABS = [
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

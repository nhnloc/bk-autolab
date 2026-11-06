// Định nghĩa node chuyển động dự phòng (CONTRACT §6) + hình học placeholder (hộp đơn giản, mm hệ FreeCAD).
// manifest.json (luồng 3D) sẽ ghi đè phần "nodes" khi có.

const T = (axisFC, travel, parent) => ({ type: 'translate', axisFC, travel, ...(parent ? { parent } : {}) });
const R = (axisFC, travel) => ({ type: 'rotate', axisFC, travel });
const B = { type: 'belt' };

export const NODE_DEFS = {
  feeder: { cyl_1A_rod: T([1, 0, 0], 120), cyl_2A_rod: T([0, -1, 0], 30), belt_1: B },
  escapement: { cyl_1A_rod: T([0, 0, 1], 40), cyl_2A_rod: T([0, 0, 1], 40), rollers: B },
  diverter: { cyl_1A_rod: T([0, 1, 0], 420), cyl_2A_rod: T([0, 1, 0], 420), cyl_3A_rod: T([0, 1, 0], 420), belt_main: B },
  erector: { cyl_1A_rod: T([0, -1, 0], 350), arm_2A: R([0, 0, 1], 90), flap_3A: R([0, 1, 0], 90), flap_4A: R([0, 1, 0], -90), cyl_5A_rod: T([1, 0, 0], 500), magazine_pusher: T([0, -1, 0], 600), belt_out: B },
  sealer: { cyl_1A_rod: T([0, 0, 1], 40), flap_2A: R([0, 1, 0], 90), flap_3A: R([0, 1, 0], -120), cyl_4A_rod: T([0, 0, -1], 80), belt_in: B, belt_side_L: B, belt_side_R: B },
  pickplace: { slide_1A: T([1, 0, 0], 500), cyl_2A_rod: T([0, 0, -1], 150, 'slide_1A'), belt_in: B, belt_out: B },
  indexer: { table: R([0, 0, 1], 360), cyl_1A_rod: T([0, 0, 1], 30), cyl_2A_rod: T([0, 0, -1], 80), cyl_3A_rod: T([0, -1, 0], 200), cyl_4A_rod: T([1, 0, 0], 200), cyl_5A_rod: T([1, 0, 0], 200) },
  palletizer: { cyl_1A_rod: T([0, 0, 1], 40), cyl_2A_rod: T([0, 1, 0], 650), plate_3A_L: T([-1, 0, 0], 450), plate_3A_R: T([1, 0, 0], 450), lift: T([0, 0, 1], 900), pallet: { type: 'static', parent: 'lift' }, belt_in: B },
};

/* ---------- Placeholder: danh sách khối. Mỗi khối: [x0,y0,z0, x1,y1,z1] (mm, FreeCAD), màu, node? pivot? ---------- */
const C = { frame: '#B8BEC6', steel: '#D5D9DD', body: '#9AA3AD', rod: '#E8EAEC', grip: '#2B2F33', belt: '#2E7D4F', beltW: '#F2F2F2', roller: '#A7ADB3', base: '#5B6168', warn: '#F2C200', glass: '#9FD3F0', wood: '#B8894F' };

function conveyor(x0, x1, y0, y1, node, color = C.belt, z = 800) {
  return [
    { b: [x0, y0 - 30, z - 120, x1, y0, z - 10], c: C.frame },
    { b: [x0, y1, z - 120, x1, y1 + 30, z - 10], c: C.frame },
    { b: [x0, y0, z - 20, x1, y1, z], c: color, node },
    ...legs(x0, x1, y0 - 30, y1 + 30, z - 120),
  ];
}
function legs(x0, x1, y0, y1, top) {
  const out = [];
  const xs = [x0 + 20, x1 - 60]; if (x1 - x0 > 1400) xs.splice(1, 0, (x0 + x1) / 2);
  for (const x of xs) for (const y of [y0, y1 - 40]) out.push({ b: [x, y, 0, x + 40, y + 40, top], c: C.frame });
  return out;
}
function cylX(x0, x1, y, z, node, rodLen, dir = 1) {
  // thân dọc X, cần đẩy theo dir
  const rodStart = dir > 0 ? x1 : x0 - rodLen;
  const rodEnd = dir > 0 ? x1 + rodLen : x0;
  return [
    { b: [x0, y - 25, z - 25, x1, y + 25, z + 25], c: C.body },
    { node, b: [rodStart, y - 8, z - 8, rodEnd, y + 8, z + 8], c: C.rod, extra: [{ b: dir > 0 ? [rodEnd, y - 40, z - 40, rodEnd + 20, y + 40, z + 40] : [rodStart - 20, y - 40, z - 40, rodStart, y + 40, z + 40], c: C.grip }] },
  ];
}

export const PLACEHOLDER = {
  feeder: [
    ...conveyor(200, 800, -70, 70, 'belt_1'),
    { b: [-150, -150, 0, 180, 150, 780], c: C.base },
    { b: [115, -35, 800, 185, 35, 1150], c: C.glass, name: 'glass_tube' },
    { b: [790, -80, 800, 820, 80, 860], c: C.warn },
    { b: [-120, -25, 787, 60, 25, 837], c: C.body },
    { node: 'cyl_1A_rod', b: [60, -12, 800, 115, 12, 824], c: C.rod },
    { b: [130, 60, 815, 170, 160, 855], c: C.body },
    { node: 'cyl_2A_rod', b: [140, 30, 825, 160, 60, 845], c: C.rod },
  ],
  escapement: [
    ...conveyor(0, 2000, -260, 260, 'rollers', C.roller),
    { b: [1080, -150, 620, 1120, 150, 760], c: C.body },
    { node: 'cyl_1A_rod', b: [1090, -140, 740, 1110, 140, 795], c: C.warn },
    { b: [1380, -150, 620, 1420, 150, 760], c: C.body },
    { node: 'cyl_2A_rod', b: [1390, -140, 740, 1410, 140, 795], c: C.warn },
  ],
  diverter: [
    ...conveyor(0, 3000, -200, 200, 'belt_main'),
    ...[900, 1700, 2500].flatMap((x, i) => [
      { b: [x - 60, -420, 760, x + 60, -260, 840], c: C.body },
      { node: `cyl_${i + 1}A_rod`, b: [x - 175, -255, 800, x + 175, -235, 950], c: C.steel },
      { b: [x - 190, 230, 700, x + 190, 1430, 760], c: C.roller },
      ...legs(x - 190, x + 190, 230, 1430, 700),
    ]),
    { b: [260, -260, 1000, 340, 260, 1040], c: C.grip },
  ],
  erector: [
    { b: [0, -400, 0, 2000, 500, 700], c: C.base },
    { b: [100, 300, 700, 420, 1300, 760], c: C.frame },
    { node: 'magazine_pusher', b: [110, 1280, 760, 410, 1300, 1150], c: C.steel },
    { b: [130, 320, 760, 400, 700, 1100], c: '#C8A273' },
    { node: 'cyl_1A_rod', b: [200, 230, 900, 320, 260, 1000], c: C.grip },
    { b: [240, 260, 930, 280, 400, 970], c: C.body },
    { node: 'arm_2A', pivot: [500, 50, 950], b: [500, 50, 930, 520, 350, 970], c: C.steel },
    { node: 'flap_3A', pivot: [1150, 0, 780], b: [1150, -100, 780, 1160, 100, 900], c: C.warn },
    { node: 'flap_4A', pivot: [650, 0, 780], b: [640, -100, 780, 650, 100, 900], c: C.warn },
    { b: [560, -40, 840, 700, 40, 900], c: C.body },
    { node: 'cyl_5A_rod', b: [700, -150, 800, 720, 150, 1000], c: C.steel },
    ...conveyor(1500, 2000, -220, 220, 'belt_out'),
    { b: [0, -400, 700, 1500, -380, 1300], c: C.glass, name: 'glass_front' },
  ],
  sealer: [
    ...conveyor(0, 1500, -250, 250, 'belt_in'),
    { b: [780, -150, 640, 820, 150, 760], c: C.body },
    { node: 'cyl_1A_rod', b: [790, -140, 740, 810, 140, 795], c: C.warn },
    { b: [300, -350, 0, 340, -300, 1500], c: C.frame }, { b: [300, 300, 0, 340, 350, 1500], c: C.frame },
    { b: [1100, -350, 0, 1140, -300, 1500], c: C.frame }, { b: [1100, 300, 0, 1140, 350, 1500], c: C.frame },
    { b: [300, -350, 1460, 1140, 350, 1500], c: C.frame },
    { node: 'flap_2A', pivot: [420, 0, 1160], b: [420, -60, 1160, 560, 60, 1175], c: C.steel },
    { node: 'flap_3A', pivot: [1000, 0, 1160], b: [860, -60, 1160, 1000, 60, 1175], c: C.steel },
    { b: [680, -30, 1300, 720, 30, 1460], c: C.body },
    { node: 'cyl_4A_rod', b: [500, -160, 1190, 1000, 160, 1210], c: C.steel },
    { node: 'belt_side_L', b: [1000, -300, 820, 1500, -270, 1050], c: C.belt },
    { node: 'belt_side_R', b: [1000, 270, 820, 1500, 300, 1050], c: C.belt },
  ],
  pickplace: [
    ...conveyor(0, 800, -110, 110, 'belt_in'),
    { b: [800, -110, 800, 820, 110, 860], c: C.warn },
    ...conveyor(1150, 1450, -700, 700, 'belt_out', C.beltW).map((p) => p),
    { b: [650, 200, 0, 700, 250, 1450], c: C.frame }, { b: [1450, 200, 0, 1500, 250, 1450], c: C.frame },
    { b: [650, 160, 1400, 1500, 250, 1460], c: C.frame },
    { node: 'slide_1A', b: [760, 120, 1340, 840, 250, 1420], c: C.body },
    { node: 'cyl_2A_rod', b: [785, 120, 1050, 815, 150, 1340], c: C.rod, extra: [{ b: [770, 105, 1030, 830, 165, 1050], c: C.grip }] },
  ],
  indexer: [
    { b: [100, -500, 0, 1100, 500, 760], c: C.base },
    { node: 'table', pivot: [600, 0, 800], cylinder: { r: 400, h: 30, z0: 0 }, c: C.steel, extra: [0, 90, 180, 270].map((a) => ({ cyl: { r: 40, h: 8, at: [300 * Math.cos((a + 180) * Math.PI / 180), 300 * Math.sin((a + 180) * Math.PI / 180), 30] }, c: C.grip })) },
    { b: [580, -20, 700, 620, 20, 760], c: C.body },
    { node: 'cyl_1A_rod', b: [590, -10, 760, 610, 10, 795], c: C.rod },
    { b: [570, 270, 1100, 630, 330, 1250], c: C.body },
    { node: 'cyl_2A_rod', b: [580, 280, 900, 620, 320, 1100], c: C.rod },
    { b: [570, -80, 850, 630, 0, 900], c: C.body },
    { node: 'cyl_3A_rod', b: [560, -120, 840, 640, -100, 900], c: C.steel },
    ...cylX(-150, 50, 0, 850, 'cyl_4A_rod', 60),
    { b: [200, -420, 850, 300, -380, 900], c: C.body },
    { node: 'cyl_5A_rod', b: [300, -330, 840, 320, -270, 900], c: C.steel },
  ],
  palletizer: [
    ...conveyor(0, 1500, -250, 250, 'belt_in'),
    { b: [1480, -150, 640, 1520, 150, 760], c: C.body },
    { node: 'cyl_1A_rod', b: [1490, -140, 740, 1510, 140, 795], c: C.warn },
    { b: [700, -450, 820, 1500, -420, 1000], c: C.body },
    { node: 'cyl_2A_rod', b: [750, -330, 800, 1450, -310, 1000], c: C.steel },
    { node: 'plate_3A_L', b: [700, 300, 760, 1100, 1150, 780], c: C.steel },
    { node: 'plate_3A_R', b: [1100, 300, 760, 1500, 1150, 780], c: C.steel },
    { b: [640, 260, -300, 680, 1200, 1300], c: C.frame }, { b: [1520, 260, -300, 1560, 1200, 1300], c: C.frame },
    { node: 'lift', b: [700, 300, -320, 1500, 1150, -300], c: C.roller },
    { node: 'pallet', b: [600, 325, -300, 1600, 1125, -150], c: C.wood },
  ],
};

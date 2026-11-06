// Khung khóa học (20 lab, 5 phần) phía UI. Nội dung chi tiết (mục tiêu, bước, chấm) lấy từ src/labs khi có;
// bảng này chỉ để hiển thị danh sách, tuần học và ánh xạ lab → máy mô phỏng.

export const PARTS = [
  { id: 1, title: 'Phần 1. Nền tảng: tủ điện và PLC cơ bản', weeks: '1–4' },
  { id: 2, title: 'Phần 2. Điều khiển xi lanh trong máy đóng gói', weeks: '5–9' },
  { id: 3, title: 'Phần 3. Biến tần, analog, PID', weeks: '10–11' },
  { id: 4, title: 'Phần 4. Lập trình có cấu trúc, chế độ vận hành, HMI', weeks: '12–13' },
  { id: 5, title: 'Phần 5. Đồ án nhóm', weeks: '14–15' },
];

/** machineId = null → lab chưa có máy mô phỏng ở giai đoạn này. */
export const COURSE = [
  { id: 'L01', part: 1, week: 1, level: 1, title: 'Tủ điện, cảm biến và làm quen PLC Studio', machineId: null },
  { id: 'L02', part: 1, week: 2, level: 1, title: 'Logic bit và mạch động cơ', machineId: null },
  { id: 'L03', part: 1, week: 3, level: 2, title: 'Timer IEC — khởi động sao–tam giác', machineId: null },
  { id: 'L04', part: 1, week: 4, level: 2, title: 'Counter, so sánh, di chuyển dữ liệu', machineId: null },
  { id: 'L05', part: 2, week: 5, level: 1, title: 'Linh kiện khí nén, điều khiển 1 xi lanh (máy dập 2 tay)', machineId: null },
  { id: 'L06', part: 2, week: 5, level: 2, title: 'Trình tự xi lanh, giám sát lỗi — bàn xoay chia 4 vị trí', machineId: 'indexer' },
  { id: 'L07', part: 2, week: 6, level: 2, title: 'Cấp phôi từ ổ chứa', machineId: 'feeder' },
  { id: 'L08', part: 2, week: 7, level: 2, title: 'Bộ tách thùng và chặn thùng', machineId: 'escapement' },
  { id: 'L09', part: 2, week: 8, level: 3, title: 'Hệ phân phối thùng 3 làn', machineId: 'diverter' },
  { id: 'L10', part: 2, week: 9, level: 3, title: 'Máy dựng thùng carton', machineId: 'erector' },
  { id: 'L11A', part: 2, week: 9, level: 3, title: 'Máy dán thùng (đóng nắp)', machineId: 'sealer' },
  { id: 'L11B', part: 2, week: 9, level: 3, title: 'Trạm gắp–đặt 2 trục khí nén', machineId: 'pickplace' },
  { id: 'L12', part: 3, week: 10, level: 2, title: 'Cài đặt biến tần, điều khiển bằng DI/AI', machineId: null },
  { id: 'L13', part: 3, week: 10, level: 3, title: 'Biến tần qua PROFINET, xử lý lỗi', machineId: null },
  { id: 'L14', part: 3, week: 11, level: 3, title: 'Analog và PID_Compact', machineId: null },
  { id: 'L15', part: 4, week: 12, level: 2, title: 'FC, FB, DB, SCL: thư viện thiết bị', machineId: null },
  { id: 'L16', part: 4, week: 12, level: 3, title: 'Chế độ vận hành và GRAPH', machineId: null },
  { id: 'L17', part: 4, week: 13, level: 2, title: 'HMI vận hành', machineId: null },
  { id: 'L18', part: 5, week: 14, level: 4, title: 'Đồ án: Dây chuyền đóng gói cuối line', machineId: null },
  { id: 'L18P', part: 5, week: 14, level: 4, title: 'Đồ án: Máy xếp pallet khí nén', machineId: 'palletizer' },
  { id: 'L19', part: 5, week: 14, level: 4, title: 'Đồ án: Trạm phân loại theo màu và chiều cao', machineId: null },
  { id: 'L20', part: 5, week: 15, level: 4, title: 'Đồ án: Máy chiết rót – đóng nắp chai', machineId: null },
];

export const MACHINE_TITLES = {
  feeder: 'Bộ cấp phôi từ ổ chứa',
  escapement: 'Băng tải tích lũy + tách thùng',
  diverter: 'Hệ phân phối thùng 3 làn',
  erector: 'Máy dựng thùng carton',
  sealer: 'Máy dán thùng',
  pickplace: 'Trạm gắp–đặt 2 trục',
  indexer: 'Bàn xoay chia 4 vị trí',
  palletizer: 'Máy xếp pallet',
};
export const MACHINE_IDS = Object.keys(MACHINE_TITLES);

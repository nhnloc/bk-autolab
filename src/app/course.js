// Khung khóa học (20 lab, 5 phần) phía UI. Nội dung chi tiết (mục tiêu, bước, chấm) lấy từ src/labs khi có;
// bảng này chỉ để hiển thị danh sách, tuần học và ánh xạ lab → máy mô phỏng.
// Tên học phần / phần / lab / máy nằm trong src/app/i18n.js (khóa course.*, part.*, machine.*) — đọc theo ngôn ngữ hiện tại.
import { t } from './i18n.js';

/** Tên học phần (dự phòng khi chưa có COURSE_INFO của nhóm nội dung). */
export const courseTitle = () => t('course.title');

const withTitle = (list, prefix) => list.map((x) => Object.defineProperty(x, 'title', { get: () => t(prefix + x.id), enumerable: true, configurable: true }));

export const PARTS = withTitle([
  { id: 1, weeks: '1–4' },
  { id: 2, weeks: '5–9' },
  { id: 3, weeks: '10–11' },
  { id: 4, weeks: '12–13' },
  { id: 5, weeks: '14–15' },
], 'part.');

/** machineId = null → lab chưa có máy mô phỏng ở giai đoạn này. */
export const COURSE = withTitle([
  { id: 'L01', part: 1, week: 1, level: 1, machineId: 'trainer' },
  { id: 'L02', part: 1, week: 2, level: 1, machineId: 'motor' },
  { id: 'L03', part: 1, week: 3, level: 2, machineId: 'stardelta' },
  { id: 'L04', part: 1, week: 4, level: 2, machineId: 'counter' },
  { id: 'L05', part: 2, week: 5, level: 1, machineId: null },
  { id: 'L06', part: 2, week: 5, level: 2, machineId: 'indexer' },
  { id: 'L07', part: 2, week: 6, level: 2, machineId: 'feeder' },
  { id: 'L08', part: 2, week: 7, level: 2, machineId: 'escapement' },
  { id: 'L09', part: 2, week: 8, level: 3, machineId: 'diverter' },
  { id: 'L10', part: 2, week: 9, level: 3, machineId: 'erector' },
  { id: 'L11A', part: 2, week: 9, level: 3, machineId: 'sealer' },
  { id: 'L11B', part: 2, week: 9, level: 3, machineId: 'pickplace' },
  { id: 'L12', part: 3, week: 10, level: 2, machineId: null },
  { id: 'L13', part: 3, week: 10, level: 3, machineId: null },
  { id: 'L14', part: 3, week: 11, level: 3, machineId: null },
  { id: 'L15', part: 4, week: 12, level: 2, machineId: null },
  { id: 'L16', part: 4, week: 12, level: 3, machineId: null },
  { id: 'L17', part: 4, week: 13, level: 2, machineId: null },
  { id: 'L18', part: 5, week: 14, level: 4, machineId: null },
  { id: 'L18P', part: 5, week: 14, level: 4, machineId: 'palletizer' },
  { id: 'L19', part: 5, week: 14, level: 4, machineId: null },
  { id: 'L20', part: 5, week: 15, level: 4, machineId: null },
], 'course.');

export const MACHINE_IDS = ['trainer', 'motor', 'stardelta', 'counter', 'feeder', 'escapement', 'diverter', 'erector', 'sealer', 'pickplace', 'indexer', 'palletizer'];
/** Tên máy theo ngôn ngữ hiện tại: MACHINE_TITLES[id]. */
export const MACHINE_TITLES = Object.defineProperties({}, Object.fromEntries(MACHINE_IDS.map((id) => [id, { get: () => t('machine.' + id), enumerable: true }])));

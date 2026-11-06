// Danh mục máy mô phỏng.
import { Feeder } from './machines/feeder.js';
import { Escapement } from './machines/escapement.js';
import { Diverter } from './machines/diverter.js';
import { Erector } from './machines/erector.js';
import { Sealer } from './machines/sealer.js';
import { PickPlace } from './machines/pickplace.js';
import { Indexer } from './machines/indexer.js';
import { Palletizer } from './machines/palletizer.js';

const CLASSES = { feeder: Feeder, escapement: Escapement, diverter: Diverter, erector: Erector, sealer: Sealer, pickplace: PickPlace, indexer: Indexer, palletizer: Palletizer };

export function createMachine(id) {
  const C = CLASSES[id];
  if (!C) throw new Error('Không có máy: ' + id);
  return new C();
}

/** Thông tin tĩnh (không tạo mô phỏng): id, title, summary, labs, ioMap, buttons, faults, cpu */
export const MACHINES = Object.fromEntries(Object.keys(CLASSES).map((id) => [id, createMachine(id).def]));
export const MACHINE_IDS = Object.keys(CLASSES);

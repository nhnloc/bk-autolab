
## Engine (lead) — 2026-11-06

Engine files are in place: `src/plc/runtime.js`, `src/sim/index.js`, `src/labs/index.js`, `src/labs/grader.js`.
Run `node tests/plc.test.mjs` and `node tests/labs.test.mjs` (all 8 reference solutions score 100/100).

Additions to CONTRACT §4:
- `new PlcRuntime(project|null, { cycleMs:10, speed:1, manualClock:false })`. In the browser the sim clock starts on `attach()` and keeps running while the PLC is STOP (machine still feeds parts, panel buttons work). `plc.dispose()` stops the clock — call it when leaving the lab page.
- `plc.load(project)` must be called (or project passed to the constructor) before `start()`. Compile errors: `{ block, network?, path?, line?, message }` — `path` is the LAD node path of the faulty element (same scheme as getPowerFlow) so the editor can highlight it; `line` for SCL.
- Events: `'scan'`, `'error'` (runtime error → CPU goes STOP), `'state'` ('RUN'|'STOP'), `'load'`, `'force'`, `'attach'`.
- `plc.read(op)` returns undefined for unknown operands (never throws). `plc.typeOf(op)`.
- `formatValue(type, v)` and `parseConstant(text)` exported from `src/plc/values.js` for watch tables.
- `BOX_SPECS` exported from `src/plc/lad.js`: pin names per LAD box (`pin`, `inputs`, `outputs`, `out`, `instance`). Use it to draw box pins. Timers/counters need `instance` (e.g. `"T_Push"` — auto-created global instance DB, or `#T` local in an FB). Also boxes INC/DEC (`params.IN_OUT`), LIMIT, NORM_X, SCALE_X, MOD.
- DB block: `{ name, type:'DB', number, fields:[{name,type,init?}] }`, types include `TON`, `R_TRIG`, `Array[0..15] of Int`, FB names. Instance DB of an FB: `{ name, type:'DB', instanceOf:'FB_Cylinder' }`.
- OB blocks may have `interface.Temp`. OB30 cyclic: `{type:'OB', number:30, cycleMs:100}`. OB100 startup.

Machine (`createMachine(id)`):
- `m.def` also has `title`, `summary`, `labs`, `cpu` ('1214C'|'1215C'|'1217C'), `buttons` (includes machine-specific buttons such as `Refill`, `Feed`, `Door`, `Clear` with `kind` momentary|latching|selector and `color`), `faults:[{id,label}]`. ioMap now includes the common panel I/O (%I0.0–%I0.4, %Q0.0–%Q0.1).
- `m.panel` = current state of panel buttons (`EStop` true = mushroom pressed; `AutoMan` true = Auto).
- `m.getVisual()` returns `{ parts, items, leds, belts, crashed, lamps:{run,fault} }` plus per-machine extras: diverter `drive:{speedPct, fault}`, erector `magazine:{count,capacity}`, indexer `feed`.
  - `parts` keys follow CONTRACT §6 node names; extra keys you may ignore: `magazine_pusher` (erector, 0..1), `pallet_visible` (palletizer 0/1 — hide pallet node when 0), `table` (indexer, 0..1 = 0..360°).
  - `belts`: `{ nodeName: offsetMeters }` — scroll belt textures by this offset.
  - `leds`: keyed by **tag** (e.g. `1B1`, `B3`) — map to node `sen_<tag>`.
  - item kinds: `puck`, `box`, `carton`, `product`, `part`, `tray` (pickplace tray, `filled` count). Coordinates: x,y,z mm FreeCAD frame; z = bottom face of the item. `rotZ` degrees. Box may have `label` (lane code, diverter) and `color`.
  - carton `fold` also has `topMinorFront`, `topMinorRear`, `tapedTop` (sealer: top flaps). Bottom flaps: `minorFront`, `minorRear`, `major`, `taped`.
- `m.events` = log `[{t, message, level:'info'|'warn'|'error'}]` for the HMI alarm list. `m.crashed` = `{message}` while the machine is jammed (Reset with all cylinders home clears it). `m.stats` = `{produced, rejected, defects, crashes, cycleTimeMs, …}`.
- `m.reset()` restores initial state.

Labs (`src/labs/index.js`): `LABS` (id, part, week, machineId, level, durationMin, title, objectives[], tasks[], hints[], grading), `LAB_BY_ID`, `starterProject(lab)`, `solutionProject(lab)` (teacher only), `tagsFor(machineId)`, `MACHINES`.
Grader (`src/labs/grader.js`): `await gradeLab(lab, project, { onProgress })` → `{ score, max, checks:[{id,label,points,max,pass,detail}], stats, log }`. Runs headless (~1–3 s), yields to the event loop.

## 3D — 2026-11-06

All 8 machines are in `assets/models/<id>.glb` (+ `src/<id>.FCStd`, `preview/<id>.png`, `manifest.json`), built by
`tools/freecad/<id>.py` (shared parts + GLB writer in `tools/freecad/lib.py`, all machines: `build_all.py`,
contract check: `python3 tools/freecad/check.py`). Every node name from CONTRACT §6 is present; rest poses as §6.

GLB / manifest notes for UI:
- GLB is written by our own exporter (not OCC): one primitive per material per node, PBR materials named after the
  palette key (`alu`, `inox`, `rod`, `glass`, `led`, `accent`, …). `glass` material already has alpha 0.28 / BLEND,
  doubleSided. Node translation = pivot/reference, rotation = identity, flat hierarchy under a root node named `<id>`.
- Belt nodes (`belt_*`) have `TEXCOORD_0`: u = metres along `uvAxisFC` (direction of travel, given in the manifest),
  v = metres across. Scroll `texture.offset.x` by the belt offset (m) — `getVisual().belts` already is metres.
- `rollers` (escapement) carries `rollerAxisFC`, `rollerRadius`, `rollerX` in the manifest if you want to spin rollers.
- `sen_<TAG>` = a small LED sphere (material `led`) at the LED; node origin = LED position.
- Extra optional nodes: `static_lamp_green|amber|red` (stack light segments, manifest `type:"lamp"`, `signal`
  H_Run / H_Warn(H_Low on erector) / H_Fault), `glass_guard`, `glass_magazine` (feeder tube), `glass_feed` (indexer tube).
- Manifest per machine also has `bboxUnits` (bbox is three.js metres Y-up), `bboxFC` (FreeCAD mm), `camera.fov`,
  `triangles`, `bytes`, `accent`, and `refs` = measured spawn/reference points in FreeCAD mm (belt tops, stop faces,
  pick/place points, magazine axes, station positions …). Use `refs` for procedural items.

Deviations / decisions:
- **erector `cyl_1A_rod` axis is +Y (not −Y)**: magazine is behind the erecting station (back-left) and the stack
  is pushed −Y (`magazine_pusher` −Y/600 as contract) toward a front pick face at Y=240, so the suction head (in front)
  must advance +Y 350 to reach the blank and retract −Y pulling it to the erecting position (case Y −100..100).
- **indexer `table` axisFC = [0,0,−1]** (clockwise seen from above) so that +value advances station 0 (left, X=240)
  → 1 (back) → 2 (right) → 3 (front). Nests at radius 360 (contract "X=200" = table edge side).
- **pickplace / palletizer sensors on moving parts** carry `parent` in the manifest: `sen_2B1`, `sen_2B2`, `sen_VacOK`
  → `slide_1A`; `sen_PalletIn` → `lift`.
- **palletizer** (as agreed with Engine): box 400×300×250, stop 1A face X=1400 (pop-up in a gap, so `belt_in` ends at
  X=1395, dead plate to 1520), pusher face rest Y=−150 travel 650, plates top Z=800 X 600..1400 Y 500..1100 split at
  X=1000, back wall Y=1100, pallet 1000×800×100 centred (1000,800), pallet top Z=150 at rest, `lift` travel **630**,
  `pallet` = translate X/1500 with parent `lift`, LayerLvl beam Z=785 (just under the plates), pallet outfeed
  rollers X 1640..3150 (top Z=50).
- **erector** magazine: horizontal bed, blanks stand in XZ planes leaning 10° (pusher plate tilted 10°), pick face
  Y=240, pusher face Y=850 (full) → 250 (empty). Case 300×200×200, bottom Z=800, flaps 100. `arm_2A` pivot at the case
  corner (500, −105), `flap_3A` pivot (508,0,790) paddle hangs down, `flap_4A` pivot (192,0,790). `cyl_5A_rod` face X=190.
- **sealer**: case 300×200×200 (top Z=1000), stop face X=600; `flap_2A` pivot (560,0,1112) paddle points +X at rest,
  `flap_3A` pivot (340,0,1112) paddle points −X at rest; `belt_side_L` = +Y side, `belt_side_R` = −Y side (inner faces
  at Y=±100, X 470..1450). Roller bed (idle) X 615..1800.
- **diverter**: three gravity lanes inclined 3° (entry Y=250, top Z=792), B0/BC/B1–B3 are down-looking sensors on an
  overhead bridge (Z≈1200); pusher face rest Y=−215 (travel 420 → 205).
- **pickplace**: product 70×70×60 centred at the pick point (800,0), stop face X=835; case belt runs +Y at X=1300,
  top Z=760; cup lip Z=1010 at rest (860 when down).
- **feeder**: pucks Ø50×25, magazine axis X=150, pusher face X=120→240, end stop face X=780 (puck centre 755).

## UI — 2026-11-06

UI files: `index.html`, `styles/*.css`, `src/app/**`, `src/scene/**`. Engine is loaded through `src/app/engine.js`
(single switch `ENGINE_MODE = 'auto'|'real'|'fake'`, or URL `?engine=fake`); the dev shim lives in `src/app/dev/`.

What the UI relies on / assumes (beyond CONTRACT §4):
- Grading: `gradeLab(lab, project, {onProgress})` from `src/labs/grader.js`; checks are shown as-is (`label`, `points/max`, `detail`). Pass mark in UI = score ≥ 50 % of max (proposal — engine may export its own `passed`).
- Student project start: `starterProject(lab)`; teacher-only route `#/teacher/solution/<labId>` uses `solutionProject(lab)` (never reachable from student routes).
- Panel buttons: momentary → `m.press(id,true)` on pointer-down, `m.press(id,false)` on pointer-up; latching (EStop) and selector (AutoMan) → `press(id,true)` then `press(id,false)` per click (toggle on down, as in kit.js). State read from `m.panel`.
- I/O LEDs read `m.inputs[tag]` / `m.outputs[tag]` (fallback `plc.read(addr)`). Input override = `plc.force(addr, v)` / `plc.unforce(addr)`; allowed unless lab has `allowOverride === false` (proposal: optional lab field).
- HMI manual mode forces outputs (`plc.force('%Qx.y', true)`) only when AutoMan = Man; alarms come from `m.events` (level warn/error), `m.crashed`, EStop input, PLC STOP.
- Machine faults: `m.def.faults[].label`; teacher-assigned faults are stored per student (mock API `setFaults/getFaults`) and applied with `m.setFault(id,true)` when the student opens the lab.
- 3D: manifest `nodes` override the fallback table in `src/scene/nodes.js`; `axisFC`, `parent`, `uvAxisFC`, lamp `signal`, camera `fov` honoured; belts scroll by `getVisual().belts[node]` (m); `pallet_visible` hides `pallet`. Items: z = bottom face, mm FreeCAD frame; carton uses all fold fields incl. `topMinorFront/Rear`, `tapedTop`; `tray` draws `filled` products.
- Without WebGL (some lab PCs / remote desktops) the viewer falls back to a 2D top-view canvas (`src/scene/fallback2d.js`) instead of failing.
- The LAD editor stores UI-only `_collapsed` on networks (ignored by the engine). Timer/counter boxes get auto-named instances `"IEC_Timer_<n>_DB"` / `"IEC_Counter_<n>_DB"` (engine auto-creates instance DBs). MOVE uses `params.OUT1`; SR/RS bit operand in `instance`.
- Proposal: engine could export `LAB_PASS_RATIO` and a per-lab `allowOverride` flag; UI already reads them if present.

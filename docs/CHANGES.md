
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

## UI — Phần 1 (2026-11-06)

L01–L04 mapped in `src/app/course.js` → `trainer`, `motor`, `stardelta`, `counter` (+ `MACHINE_TITLES`). Tested end-to-end
with the real engine (2D fallback in the browser at 1366×768, light/dark) and the 3D binding logic in Node on placeholders.

- **Availability**: `mergeCourse(LABS, MACHINES)` sets `machineId = null` (shown "Sắp có") when the engine has no such
  machine, so a lab never opens on a missing machine. Home uses that, and in `PUBLIC_MODE` shows only labs with a machine.
  Mock DB: one-time migration (`migP1`) opens Part-1 labs in demo data created before this change.
- **Grading**: generic checks table (any number of checks); `passed` taken from the engine result if it has one, else ≥ 50 %.
- **Operator panel** (`machine/operatorPanel.js`): machine buttons in a wrapping row (2-line labels); `latching` buttons
  that are not the E-Stop (`color:'estop'` / id `EStop`) are ON/OFF toggles with an LED; generic `selector` shows `0/1`
  (or `def.buttons[].positions`); `nc:true` gets a red **NC** tag unless the label already says NC. Buttons pressed from 3D
  are reflected. `getVisual().displays` → red 7-segment LED readouts at the top of the panel (`machine/readouts.js`,
  decimals shown with the DP segment, overflow → `----`).
- **Trend** (`machine/readouts.js`, `createTrend`): when `getVisual().trend` exists, a collapsible strip under the 3D view
  (canvas, themed from CSS tokens, legend with live values, y-axis scaled to the first series' `max`, other series scaled
  to their own `max`, 600-point window × `dtMs`). Open/closed remembered (`bk.trend.open`).
- **3D viewer**: `out_<TAG>` nodes glow in their colour (manifest `color`, else material colour brightened) from
  `getVisual().outs` (fallback `m.outputs`); `btn_<ID>` nodes are clickable (capture-phase pointerdown on the container
  so OrbitControls does not rotate; momentary = press on down / release on pointerup anywhere; latching/selector toggle per
  click) with a pointer cursor on hover; any `parts.<node>_visible` hides/shows that node (motor `obstacle_visible`);
  `needle_*`, `drum`, `pulley` use the generic rotate binding. Items: `product` with `shape:'can'` → cylinder can.
  **Proposal for the 3D author**: optional manifest node field `clipZ` (FreeCAD mm) clips the node's geometry above that
  height (used by the placeholder roller door so it disappears into the drum housing instead of floating above the frame).
- **Placeholders** (`scene/nodes.js`): `NODE_DEFS` + box placeholders for the 4 machines with every contract node name
  (manifest entries override them when the GLBs arrive).
- **2D fallback**: draws placeholder blocks (top view, translate nodes follow `parts`), output lamps row (`outs`) and LED
  displays; bounding box from manifest or placeholder.
- **HMI**: belt mimic only when the machine has motors; lamp row for machines without cylinders; displays as KPIs.
- Dev shim (`src/app/dev/fakeP1.js`): stub P1 machines + L01–L04 for `?engine=fake`.

Gaps: real GLBs for the 4 machines not yet checked (manifest nodes override the placeholder defs; rerun the Node check
when they land). `display` node texture (digits on the 3D LED board) not implemented — readout is on the 2D panel.

## 3D — Phần 1 (L01–L04) — 2026-11-06

New GLBs `trainer`, `motor`, `stardelta`, `counter` (+ `src/*.FCStd`, `preview/*.png`, merged into `manifest.json`;
the 8 existing entries untouched). Scripts `tools/freecad/<id>.py`; new parts appended to `tools/freecad/lib.py`
(section "Phần 1": face-frame helpers `face_pl/lbox/lcyl`, `pushbutton`, `selector`, `pilot_lamp`, `buzzer`,
`din_rail`, `s7_1200`, `psu`, `mcb`, `terminals`, `contactor`, `overload`, `gauge`, `seg7_digit`, `cabinet`,
`through_beam`, `limit_switch`, `text` = flat DejaVu glyph faces). `build_all.py` ORDER and `check.py` cover all 12
(check also verifies `out_*` manifest type/tag/colour). Result: trainer 25.5k tris / 0.91 MB, motor 18.8k / 0.76 MB,
stardelta 45.0k / 1.5 MB, counter 20.7k / 0.82 MB — all OK.

Manifest conventions added (all FreeCAD mm / Z-up, as before):
- `out_<TAG>`: `{type:'output', tag, color}`; mesh material = dark lens (`lens_red|yellow|green|blue|amber`) — light
  it with emissive = `color`. Node origin = lens centre. Contactor indicators (`out_KM*`) are small green windows on the
  contactor front, inside the cabinet behind `glass_cabinet`.
- `btn_<ID>`: extra fields `button` (id for `m.press`) and `kind` (`momentary` | `selector`).
  motor buttons carry `button:'S_Up'/'S_Down'` (I/O tags) — the node names stay `btn_Up`/`btn_Down` per contract;
  map node → `def.buttons` id in the UI if the ids differ.
- `needle_*`: extra `zeroDeg` (angle of the zero mark, CCW from "right" seen from the front), `range`, `unit`.
  Needles are modelled pointing at zero; positive value turns clockwise on the dial.
- Optional extra node **`flywheel`** (stardelta): `{type:'rotate', axisFC:[0,1,0], continuous:true, follow:'pulley',
  ratio:0.3053}` → rotate by `pulleyAngle * ratio` (allowed by check.py as an extra). Without it the compressor
  flywheel just stays still.
- Continuous rotors (`drum`, `pulley`, `flywheel`) have `continuous:true`; `drum.openingSign = +1` (positive rotation
  about +X = door going up).
- Gauge cover glasses are in `static_glass` (material `glass`, already alpha-blended).

Per machine (refs are in the manifest under `refs`):
- **trainer**: desk top Z=750, panel 800×500 at X 0..800, bottom edge front face (0,−120,795), tilted 15° back,
  outward normal (0,−0.9659,0.2588). Buttons `btn_S1..S3` axisFC = into panel (0,0.9659,−0.2588) travel 4.
  `btn_SW1` axisFC = into panel, travel 90: rest = knob at 45° left ("0"), value 1 = 45° right ("1").
  Sensor module on the desk right (X 860..1230): `target_metal` rest X=1000 → +120 under the M18 sensor at X=1120
  (sensing face Z=810); through-beam along X at Y=60, Z=840; `blocker` flag rest bottom Z=862 → −60 covers the beam.
  Panel also has decorative I/O jacks, header "BK-AutoLab PLC TRAINER S7-1200", labelled plates (S1 I0.5 … BUZ Q0.6). PLC module is unbranded (text "PLC" / "CPU 1214C" only — no vendor names or logos in any model).
- **motor**: door bottom edge Z range **0 → 2200** (`door` origin (1000,−65,0)), curtain X 30..1970, slats up to
  Z=2420. **The door mesh is a rigid curtain: when translated up it sticks out above the drum hood. UI must clip it:
  `renderer.localClippingEnabled = true` and a clipping plane on the door materials at FC Z = `nodes.door.clipAboveZFC`
  (2420 mm → three y = 2.42, keep y < 2.42).** Drum axis (·, −245, 2590) R=180, spoked end discs + seams so the
  rotation is visible. LS_Down / LS_Up roller switches on the right guide at Z 70 / 2230. Safety through-beam at Z=300,
  Y=−150 (in front of the curtain). `obstacle` carton 450×278×380 at X 800..1250 (in the doorway, cuts the beam) —
  app hides/shows it. Wall push-button station (yellow) at X 2260: lamps H_Up (green) / H_Down (amber) above
  `btn_Up` / `btn_Down` (press axis +Y). Cabinet 400×600×200 at X 2700 on the wall, Z 1000..1600, glass window over
  CB, KM1/KM2 (+ interlock), F1, terminals.
- **stardelta**: tank 1600×Ø600 X 50..1650, axis Z=430; motor shaft axis Y at (520, ·, 915), pulley face Y=−380;
  compressor flywheel (1080, ·, 910) Ø380, 2×V-belts; open fan cage at the back so the fan (part of `pulley`) shows.
  `needle_P`: gauge Ø110 facing −Y at (1500,−194,955), axisFC (0,−1,0), zeroDeg 225 (bottom-left), −270 → 10 bar at
  bottom-right; zones green 0–6, amber 6–8, red 8–10 bar. `sen_PS` LED on the pressure switch above the manifold.
  Cabinet 600×800×250 on a 100 plinth at X 1950..2550 (front Y=10), glass window over Q1, PSU, S7-1200, KM1 LINE /
  KM2 STAR / KM3 DELTA, F1 (`sen_F1`), KT; door bottom: 96×96 ammeter `needle_A` (axisFC (0,−1,0), zeroDeg 135 =
  upper-left, −90 → 200 A upper-right), RUN/STAR/TRIP lamps (static, not outputs), red/yellow isolator.
- **counter**: belt_1 white X 0..1500 top 800 width 200, can guides clear 90; product spawn (60,0,800).
  Chute X 1495→1605 (45°), drop point (1600,0,675). belt_2 green along +Y, Y −800..750, X centre 1600, top 450,
  width 260; box 200 (X) × 300 (Y) × 200; box spawn (1600,−650,450); box centred under the chute = (1600,0,450);
  B2 beam along X at **Y=150** (box leading edge there ⇒ box centred at Y=0); end stop plate at Y=766.
  B3 at X=150, B1 at X=1440 (end of belt, beam across Y at can mid-height 860).
  `display`: LED board on a column, face normal **−Y** (facing the operator/camera), face centre (750,382,1635),
  face 590×160 mm. The `display` mesh has two primitives: material `lcd` (black face, TEXCOORD_0 0..1, u → +X,
  v down = glTF) and `seg` (four unlit "8." digits). To show digits in 3D: draw a canvas texture on the `lcd`
  primitive and hide the `seg` primitive. `out_H_Full` = amber beacon on top of the board.
  Operator box with stack light at X 2150 is decor only (stack-light segments are static, not `static_lamp_*` nodes).

Deviations: none on node names or the dimensions in CONTRACT-P1. Counter box orientation chosen as 300 along the
box-belt travel (Y). Motor "cao 2400" = guide height; drum/hood sit above it (top of model Z≈2850, wall 3050).

## UI — Đăng ký & bài giảng (2026-11-06)

**Accounts / data (`src/app/mockApi.js`, new DB key `bk.db.v3`, session `bk.session`).**
- All demo data removed: no fake students, fake submissions or fake classes are seeded; the DB starts empty.
- Teacher: one built-in account (`gv01`, "Giảng viên"), **local only** — entered with the "Vào vai trò giảng viên"
  button on the login page when not `PUBLIC_MODE`; `getMe()` never returns a teacher in `PUBLIC_MODE`.
- Migration from `bk.mock.db.v2` (runs once, then deletes the old key + old session): drops every old account, the 2
  demo classes, demo schedules/faults and every submission without a `project` (the demo ones). Keeps projects and real
  submissions, re-keyed to `sv<MSSV>|<lab>`; when a student re-registers with the same MSSV the work re-attaches
  (toast "Đã khôi phục bài làm cũ…"). Unit-checked in Node and on a real old DB in the browser.
- Student ids are `sv<MSSV>`. API: `register({name, classId, mssv})` → logs in; `loginStudent({mssv})`;
  `loginTeacher()`; `logout()`. Name trimmed + spaces collapsed (2–80 chars); MSSV trimmed, `^\d{7,10}$`, unique per
  browser. Lab schedule = default (open if the lab has a machine) + teacher overrides stored per class on that browser.

**Class list = static file `data/classes.json`** (`{ "classes": [ {id, name, term} ] }`, one "Lớp mẫu" example entry).
`src/app/classes.js` fetches it (`cache: 'no-cache'`), normalises it, friendly errors (missing file / bad JSON /
offline) with a "Thử lại" button on the form. Teacher page **Danh sách lớp** (`#/teacher/classes`, local only): edit
id/name/term, add/delete (confirm if students are registered), validation (id `[A-Za-z0-9._-]`, unique; name required),
warning when renaming an id that registered students use, live JSON preview, draft kept in `bk.classes.draft`, button
**Tải xuống classes.json** (no BOM) + steps (replace `data/classes.json`, `git push`, wait for Pages). Teacher pages
show an honest note: no server, they only see students registered in this browser. Classes referenced by local students
but missing from the file are still listed ("Không có trong classes.json").

**Login page** = "Đăng ký / Đăng nhập" tabs (default Đăng ký if no account on this browser). Register: Họ và tên,
Lớp (dropdown from classes.json), MSSV; login: MSSV only; note that it is a practice site without passwords and work
stays in this browser. Top bar: avatar + name + MSSV · class name (refreshed from classes.json), "Đổi tài khoản"
(flushes the lab autosave before logging out).

**Lectures** (`src/app/lectures.js` loads `src/labs/lectures.js` by dynamic import, `{}` on failure; `COURSE_INFO`
used for the course title, fallback `COURSE_TITLE` in `src/app/course.js`). Safe Markdown subset renderer
`src/app/components/md.js` (DOM text nodes only, no `innerHTML`): paragraphs, `#..###` headings, `-`/`*` lists,
numbered lists (with start), `**bold**`, `` `code` ``, pipe tables (a `|` inside a code span or written `\|` does not
split cells — needed for LAD symbols like `` `-| |-` ``).
- Lab guide panel: tabs **Bài giảng** (badges for reading time / quiz size, "Sau bài này bạn có thể…" outcomes,
  contents list when > 2 sections, sections, quiz, "Sang phần Nhiệm vụ") and **Nhiệm vụ** (previous content; requirements
  now above the I/O table). First visit of a lab with a lecture opens the guide on Bài giảng (forced open even at
  1366 px); later visits open on Nhiệm vụ (`bk.lecture.seen.<userId>`). Lecture tab widens the guide to 400 px (360 px
  ≤ 1280 px); the ⤢ button opens a 920 px reading overlay over the work area (Studio/3D are not resized), Esc closes.
- Quiz: instant feedback (correct/wrong + explanation), options locked once answered, score badge, "Làm lại"; saved in
  `bk.quiz.<userId>.<labId>`.
- **Đề cương** page (`#/syllabus`, nav for students and teacher): course title/subtitle, the 5 parts with labs in
  order: week, id, title, machine, duration, lecture/quiz badges, outcomes (fallback: lab objectives), student status and
  "Vào lab". `PUBLIC_MODE` shows only labs with a machine (same rule as home).

**3D viewer fixes (`src/scene/`)** — requested by the lead, checked in Node with GLTFLoader.parse on the real GLBs
(the in-app browser has no WebGL):
- Clipping unified: node field `clipAboveZFC` (manifest) or legacy `clipZ` (placeholder now uses `clipAboveZFC` too) →
  world clipping plane y ≤ Z/1000 on cloned materials (array materials handled). Motor door: 4 materials clipped at
  y = 2.42; nothing else clipped.
- Buttons: press id always from the node name `btn_<ID>`; manifest `button` is used only if `<ID>` is not in
  `def.buttons` (motor `btn_Up` → `Up`, not `S_Up`); click kind falls back to the manifest `kind`.
- Counter `display`: canvas texture with red 7-segment digits (dim unlit segments) on the `lcd` primitive
  (`flipY=false`, glTF UVs), `seg` primitive hidden, value from `getVisual().displays` (matched by `tag`, else index),
  redrawn only on change. Shared 7-segment table/format in `src/scene/seg7.js` (also used by the 2D readouts).
- Rotating nodes with `follow`/`ratio` (stardelta `flywheel` = pulley × 0.3053).

Tested in the in-app browser at 1366×768 with the real engine (2D fallback): old-DB migration, registration validation
(bad MSSV, duplicate, unknown MSSV on login), restore of old work, home, syllabus, L01 first visit → lecture, reading mode
+ Esc, quiz feedback + persistence, task tab, RUN, test grade (10/100 on the starter), HMI, account switching, teacher
dashboard / class tabs (grades, schedule, faults, students), class-list editing/validation/download (blob checked),
missing classes.json error + retry. No console errors in the flow.

Gaps: `PUBLIC_MODE` paths reviewed but only exercised on localhost. `README.md` still mentions the old demo logins
(not in the UI's file set). Data stays per browser (by design until there is a server); teacher schedule/fault settings
do not reach students' browsers.

## UI — Song ngữ (2026-11-06)

The EN/VI switch now covers the whole front-end. UI files only (`index.html`, `src/app/**`, `src/scene/**`,
new `tests/ui-strings.test.mjs`); content translation comes from `src/i18n/loc.js` (content agent).

- **UI strings** (`src/app/i18n.js`): every user-visible string goes through `t()`; `en` is now complete (553 keys,
  same `{params}` as `vi`). Moved in: course/part/lab titles and `MACHINE_TITLES` (`course.*`, `part.*`, `machine.*` —
  `COURSE`/`PARTS`/`MACHINE_TITLES` in `src/app/course.js` expose `title` getters, `COURSE_TITLE` → `courseTitle()`),
  mock-API / classes.json / teacher-password errors, login placeholders, common I/O descriptions, HMI statistics,
  palette instruction names + groups, LAD property kinds, address validation, block types, 2D-fallback and 3D
  aria/notes, CSV headers + file name, git commit hint, default E-Stop label, teacher avatar/name (`role.teacher`).
  Console-only developer logs were switched to English. Helpers: `locale()` (`vi-VN` / `en-GB`), `fmtDate`,
  `fmtTime`, `fmtDateTime`, `fmtNum`; every date/time (save state, info/diagnostics, HMI clock, results, gradebook
  students, due dates) uses them. `setLang` also updates `<html lang>` and the meta description; `index.html` sets
  `lang` early from `bk.lang`.
- **Content** (`src/app/loc.js`): thin wrapper over `src/i18n/loc.js` (dynamic import, identity fallback, always
  identity for `vi`; `main.js` awaits it before the first render). Translated at display time, engine objects untouched:
  `trMachine` (machine title/summary in guide + HMI, I/O descriptions through `machineIo`, operator-panel button
  labels, fault labels in the teacher fault tab), `trLab` (via `getLabs()` — returns localized `title/summary/
  objectives/steps/hints`, `lab.raw` stays original for grading), `trLecture` (lecture/outcomes/quiz in guide and
  syllabus), `trCourseInfo` (home/syllabus), `trText` (HMI alarms from `m.events`/`m.crashed`, crash banners, LED
  display + trend labels/units, 2D fallback display labels, grading criteria + details in results and teacher review,
  compile errors in the Info pane, runtime errors in Diagnostics/toasts, watch-table write/force errors, project name
  in the tree).
- **Switching language keeps state**: the topbar switch re-renders the page with a *carry*: `dispose({ relang: true })`
  returns state that the new page takes (`carry.taken`; `main.js` calls `carry.release()` if nobody took it).
  Lab page: same PLC/machine session keeps running (RUN, forces, faults), Studio state (open tabs, active doc, undo/redo,
  selection, monitor, compile result, diagnostics re-translated), HMI screen + forced outputs + acknowledged alarms,
  I/O-panel input forces, current tab (work/HMI/results), last result + note, guide tab/open/reading mode. Review page:
  session, Studio state, regrade result. Class page: tab, and on the fault tab the preview session, student/lab,
  live/assigned faults. Class list: rows being edited. Login: typed name/class/student ID and tab. Scroll restored.
- **Checker** `node tests/ui-strings.test.mjs`: scans string/template literals (comments skipped) in `index.html`,
  `src/app/**`, `src/scene/**` for Vietnamese diacritics outside `i18n.js`, and checks `vi`/`en` key parity, matching
  `{params}` and no diacritics in `en`. Allow-list: `src/app/dev/` (fake-engine data used only with `?engine=fake`) and
  the bilingual `<noscript>` line.

Tested in the in-app browser at 1366×768 (2D fallback, real engine) in EN: registration (typed values survive a switch),
login errors, home, syllabus, L01 lecture + quiz feedback + tasks, RUN, input force, HMI alarms, test grade + results,
switch EN↔VI while RUN (same PLC object, still RUN, forces/HMI/tabs/undo kept), L03 alarms (DOL-start warning,
KM2+KM3 collision), LED displays, trend legend, compile error in Info pane, submit dialog, teacher (local session):
dashboard, gradebook, schedule, students, fault tab (preview kept running across a switch), solution review + regrade,
class list. Back in VI: home, syllabus, lab unchanged. No console errors (only the pane's own `/favicon.ico` 404).

Remaining Vietnamese in EN (by design): student/class names and class terms (data), tag comments, network
titles/comments and SCL comments inside student/starter projects (editable code — not translated so edits never save
English into the project), proper names. Gaps: watch-table forces set from the watch table itself are kept on the PLC
but the table's "F" markers reset after a language switch; a grading run in progress during a switch finishes on the
old (detached) results panel — re-run "Test grade"; strings coming from the engine that `trText` does not know stay
Vietnamese (fallback by design). English plurals use "(s)".

## Chạy thử mẫu (demo run)

- Nút **Chạy thử mẫu** trên thanh công cụ trang lab → hộp thoại `src/app/machine/demoDialog.js`: máy mô phỏng riêng
  (`createMachineView`, bảng nút chỉ xem), chạy/tạm dừng, chạy lại, tốc độ 0,5/1/2/4×, thanh tua, chú thích hiện tại
  và nhật ký (chú thích, nhấn/nhả nút, đầu ra đổi kèm mô tả I/O). Không đụng PLC/máy của bài làm. Chuỗi giao diện: khóa `demo.*`.
- Trình phát `src/sim/demo.js` (`DemoPlayer`): áp sự kiện của trace (`o` đầu ra, `p` nút, `n` chú thích {vi,en}) theo
  từng bước vật lý 1 ms; `Math.random` được thay bằng PRNG có seed (mulberry32) trong lúc tạo máy/chạy bước → tất định.
- Ghi trace: `node tools/record-demos.mjs` chạy lời giải mẫu với cùng seed, theo kịch bản trong `SCRIPTS` (L01–L03 riêng,
  còn lại: chờ → Start → chạy → Stop), rồi phát lại và so khớp stats/inputs/thời gian. Ra `assets/demos/<lab>.json`
  (2–6 KB) + `index.json`. Không chứa code lời giải.
- `modal()` nhận thêm `cls`.


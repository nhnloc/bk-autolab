# BK-AutoLab — Hợp đồng kỹ thuật chung (v1)

Tài liệu này là “nguồn sự thật” giữa 3 luồng làm song song:
- **UI** (giao diện, cảnh 3D, PLC Studio, HMI, trang lớp học) — `src/app/`, `src/scene/`, `index.html`, `styles/`
- **3D** (FreeCAD → GLB) — `assets/models/`, `tools/freecad/`
- **Engine** (soft-PLC, mô hình vật lý, nội dung lab, chấm bài) — `src/plc/`, `src/sim/`, `src/labs/`

Không sửa file của luồng khác. Cần đổi hợp đồng → ghi vào `docs/CHANGES.md` và báo lại.

## 1. Công nghệ

- Web tĩnh, **ES modules thuần, không bước build** (mở bằng `npx http-server` hoặc `python3 -m http.server`).
- three.js r160 vendored: `vendor/three/three.module.js`, addons `vendor/three/addons/{loaders,controls,utils,libs}/…`.
  Import map trong `index.html`:
  ```html
  <script type="importmap">{"imports":{"three":"./vendor/three/three.module.js","three/addons/":"./vendor/three/addons/"}}</script>
  ```
- Không CDN lúc chạy (phòng lab có thể không có mạng). Font: system font stack.
- Ngôn ngữ giao diện: tiếng Việt chính, chuỗi đặt trong `src/app/i18n.js` (`vi`, `en`) để sau dịch.
- Server/tài khoản: giai đoạn sau. Giai đoạn này UI dùng **mock** (`src/app/mockApi.js`) với cùng hình dạng API sẽ có ở server: `login`, `getMe`, `listClasses`, `listLabs`, `getProject`, `saveProject`, `submit`, `getGradebook`. Lưu tạm vào localStorage (bọc try/catch).

## 2. Hệ tọa độ & đơn vị 3D

- FreeCAD: **mm**, **Z hướng lên**, **X = chiều dòng chảy vật liệu (trái → phải)**, Y = chiều sâu (ra phía sau máy).
- Xuất GLB bằng `ImportGui.export([...objs], "x.glb")` (OCC): tự đổi sang **mét, Y-up**: FreeCAD `(x, y, z)` mm → three `(x, z, -y)/1000`.
- Gốc tọa độ mỗi máy: tâm mặt sàn dưới máy, X=0 ở **mép vào** (đầu vào vật liệu).
- Mặt băng tải chuẩn cao **Z = 800 mm**.

## 3. Quy tắc mô hình GLB (luồng 3D phải tuân thủ)

- Mỗi máy 1 file `assets/models/<machineId>.glb` + nguồn `assets/models/src/<machineId>.FCStd` + script `tools/freecad/<machineId>.py`.
- **Chi tiết chuyển động** là object riêng, **Label đúng tên trong bảng mục 6** (tên node GLB = Label). Các chi tiết tĩnh gộp tùy ý (nên gộp theo màu cho nhẹ), tên tự do nhưng tiền tố `static_`.
- Chi tiết chuyển động được dựng ở **vị trí nghỉ** (xi lanh lùi / tay về gốc). App sẽ dịch chuyển node theo `axis` × `travel` × giá trị 0..1.
- Chi tiết **quay** (bàn xoay, tay gấp vạt): dựng hình học quanh gốc, đặt bằng `Placement` sao cho gốc object = **tâm trục quay** (OCC ghi Placement thành translation của node, nên app xoay quanh node origin).
- Một chi tiết chuyển động nằm trên chi tiết chuyển động khác (vd. xi lanh Z gắn trên bàn trượt X): app tự cộng dồn — chỉ cần cả hai là node riêng; mục 6 ghi `parent`.
- Cảm biến: object riêng tên `sen_<TAG>` (chỉ để app gắn đèn LED trạng thái; vị trí = vị trí đèn trên cảm biến).
- Xi lanh: thân `static_…`, **cần piston + đầu** gộp thành 1 node chuyển động.
- Màu (ShapeColor) theo bảng: khung nhôm `#B8BEC6`, tấm inox `#D5D9DD`, thân xi lanh `#9AA3AD`, cần piston `#E8EAEC`, đầu kẹp/giác hút `#2B2F33`, băng tải PVC `#2E7D4F` (xanh) hoặc `#F2F2F2` (trắng), con lăn `#A7ADB3`, cảm biến `#1F5FBF`, van `#3A3F45`, nắp an toàn kính `#9FD3F0` (app sẽ làm trong suốt node tên tiền tố `glass_`), sàn/khung đế `#5B6168`, chi tiết cảnh báo `#F2C200`.
- Low-poly: tổng ≤ 60k tam giác/máy, file ≤ 3 MB. Dùng `Part` primitives / extrude, tránh fillet nhỏ.
- **Không mô hình hóa vật liệu chạy trên máy** (phôi, thùng, tấm carton, sản phẩm, pallet hàng) — app sinh procedural. Pallet gỗ rỗng ban đầu thì có (node `pallet`).
- Sau mỗi máy: ghi `assets/models/manifest.json` (xem mục 7) và ảnh chụp `assets/models/preview/<machineId>.png`.

## 4. Engine API (luồng Engine cung cấp, UI dùng)

```js
import { PlcRuntime } from './src/plc/runtime.js';
import { createMachine, MACHINES } from './src/sim/index.js';
import { LABS } from './src/labs/index.js';

const m   = createMachine('diverter');          // xem mục 6
const plc = new PlcRuntime(project, { cpu: '1214C' });
plc.attach(m);         // nối bus I/O: m.inputs → %I, %Q → m.outputs
plc.start();           // RUN (vòng quét OB1 mặc định 10 ms, bước vật lý 1 ms)
plc.stop();            // STOP: mọi %Q = 0
plc.on('scan', cb);    // sau mỗi chu kỳ quét: cb({ scanTimeMs, cycle })
plc.on('error', cb);   // lỗi biên dịch/chạy: cb({ block, network, message })
plc.read('"Start"' | '%I0.0' | 'DB1.Count');   // đọc giá trị (monitor)
plc.write(op, value);                            // ghi từ watch table
plc.force(op, value) / plc.unforce(op);
plc.compile(project) → { ok, errors:[{block, network, line, message}] }
plc.load(project)      // compile + nạp (khi STOP); trả về như compile
plc.getPowerFlow(blockName, networkIndex) → { [path]: true|false }
                       // path = chỉ số con trong cây Node nối bằng '.', gốc = '' ; giá trị = công suất RA khỏi node đó ở chu kỳ quét gần nhất
plc.state              // 'STOP' | 'RUN'
plc.scanTimeMs, plc.cycle

m.def        // { id, title, ioMap:{inputs:[…], outputs:[…]}, parts:{…}, buttons:[…], faults:[…] }
m.getVisual()// { parts:{ nodeName: value }, items:[…], leds:{ TAG:true/false } } — gọi mỗi khung hình
m.press(buttonId, down) // nút trên máy/bảng điều khiển: Start, Stop, Reset, EStop(toggle), Auto/Man…
m.setFault(faultId, on) // giảng viên cài lỗi
m.reset()               // về trạng thái ban đầu
m.stats                 // { produced, rejected, cycleTimeMs, … } cho HMI
```

`items` (vật liệu procedural, app vẽ):
```js
{ id, kind:'puck'|'box'|'carton'|'product'|'part', x,y,z /*mm, hệ FreeCAD*/, rotZ /*độ*/,
  size:[l,w,h] /*mm*/, color, // tùy kind
  fold /*chỉ carton*/: { open:0..1, minorFront:0..1, minorRear:0..1, major:0..1, topMinor:0..1, topMajor:0..1, taped:bool } }
```
Carton/box: `kind:'carton'` vẽ dạng các tấm bản lề theo `fold` (0 = phẳng / vạt mở, 1 = gấp xong).

## 5. Mô hình dữ liệu project PLC (UI soạn, Engine biên dịch)

```js
project = {
  schema: 'bk-autolab/project@1',
  name, machineId, cpu: '1214C',
  tags: [{ name:'Start', address:'%I0.0', type:'Bool', comment:'' }, …],   // PLC tags
  blocks: [
    { name:'Main', type:'OB', number:1, lang:'LAD', networks:[ Network, … ] },
    { name:'FB_Cylinder', type:'FB', number:1, lang:'SCL', interface:{ Input:[…], Output:[…], InOut:[…], Static:[…], Temp:[…] }, source:'…' },
    { name:'Data', type:'DB', number:1, fields:[{name,type,init}] }   // global DB
  ],
  watch: [{ op:'"Start"' }, …]
}
Network = { title:'', comment:'', rung: Node }
```

LAD là cây nối tiếp / song song (giống TIA, nguồn từ thanh trái):
```js
Node =
 | { t:'series',   items:[Node…] }
 | { t:'parallel', branches:[Node…] }            // nhánh OR
 | { t:'contact',  kind:'NO'|'NC'|'P'|'N'|'NOT', op:'"Start"', mem?:'%M10.0' }   // P/N cần bit nhớ sườn
 | { t:'coil',     kind:'='|'/'|'S'|'R'|'P'|'N', op:'%Q0.0' }
 | { t:'cmp',      op:'=='|'<>'|'>'|'>='|'<'|'<=', type:'Int'|'DInt'|'Real'|'Time', in1, in2 }  // dạng tiếp điểm
 | { t:'box',      fn:'TON'|'TOF'|'TP'|'TONR'|'CTU'|'CTD'|'CTUD'|'MOVE'|'ADD'|'SUB'|'MUL'|'DIV'|'SR'|'RS'|'R_TRIG'|'F_TRIG'|'SHL'|'SHR'|'NORM_X'|'SCALE_X'|'CALL',
                   instance?:'"T_Push"' /*IEC timer/counter/FB instance DB*/, block?:'FB_Cylinder' /*fn:'CALL'*/,
                   params:{ PT:'T#2s', PV:'12', IN:'…', OUT:'…', R:'…', … } }   // power flow vào EN/IN/CU/S tùy fn
```
Quy tắc: luồng công suất đi qua `series` từ trái sang phải; `coil` truyền công suất qua (cho phép nhiều coil nối tiếp như TIA); `box` nhận công suất ở chân đầu tiên (IN/EN/CU/S), xuất Q/ENO.
Toán hạng: `"TagName"`, `%I0.0`, `%IW64`, `%MW10`, `%Q0.1`, `"DB".Field`, `#Local`, hằng `T#5s`, `16#047F`, `12`, `TRUE`.

SCL: tập con IEC 61131-3 ST kiểu Siemens: `IF/ELSIF/ELSE/END_IF`, `CASE OF`, `FOR/WHILE/REPEAT`, `:=`, toán tử số học/so sánh/logic, gọi instance `#T1(IN:=…, PT:=T#2s); #T1.Q`, `R_TRIG`, mảng `Array[0..9] of Int`, UDT (sau).

## 6. Danh mục máy (ioMap + chi tiết 3D)

Ký hiệu tag theo kiểu ISO 1219: xi lanh `1A`, van `1V`, cuộn van `1Y1/1Y2`, cảm biến hành trình `1B1` (lùi) / `1B2` (ra).
Mọi máy dùng chung **bảng nút** (không vẽ 3D, UI vẽ 2D): `Start %I0.0 (NO)`, `Stop %I0.1 (NC)`, `Reset %I0.2`, `EStop %I0.3 (NC)`, `AutoMan %I0.4 (1=Auto)`; đèn `H_Run %Q0.0`, `H_Fault %Q0.1`. Các I/O máy bắt đầu từ `%I0.5` / `%Q0.2`. CPU 1214C có `%I0.0–%I1.5`, `%Q0.0–%Q1.1`; máy cần nhiều hơn dùng module mở rộng `%I2.0…`, `%Q2.0…` (CPU 1215C/1217C ảo).

Cột “Node 3D”: tên node trong GLB. `axis` theo hệ FreeCAD, `travel` mm (hoặc độ nếu `rot`).

### 6.1 `feeder` — Bộ cấp phôi từ ổ chứa (A6, Lab L07)
Ống chứa đứng Ø60 chứa phôi tròn Ø50×25 (đặt ở X=150). Xi lanh chặn 2A giữ phôi thứ 2 từ dưới lên khi 1A đẩy phôi đáy ra băng tải ngắn (dài 600, X=200..800). Cuối băng có chặn cố định + cảm biến.

| Node 3D | Loại | axis / travel |
|---|---|---|
| `cyl_1A_rod` | xi lanh đẩy (ngang, sau ống chứa, đẩy theo +X) | X / 120 |
| `cyl_2A_rod` | xi lanh chặn (ngang, đặt phía sau ống, đâm vào ống theo -Y) | -Y / 30 |
| `belt_1` | mặt băng tải (app cuộn texture) | — |
| `sen_1B1`,`sen_1B2`,`sen_2B1`,`sen_2B2`,`sen_B3`,`sen_B4`,`sen_B5` | cảm biến | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | 1B1 | 1A lùi |
| %I0.6 | 1B2 | 1A ra |
| %I0.7 | 2B1 | 2A lùi (không chặn) |
| %I1.0 | 2B2 | 2A ra (đang chặn) |
| %I1.1 | B3 | ổ chứa sắp hết (còn ≤ 3) — tiệm cận ở cao độ phôi thứ 3 (1 = có phôi) |
| %I1.2 | B4 | ổ chứa rỗng — tiệm cận ở phôi đáy (1 = có phôi) |
| %I1.3 | B5 | phôi tới cuối băng tải (quang) |
| %Q0.2 | 1Y1 | van 5/2 đơn cuộn 1A (1 = ra) |
| %Q0.3 | 2Y1 | van 5/2 đơn cuộn 2A (1 = chặn) |
| %Q0.4 | M1 | động cơ băng tải |

### 6.2 `escapement` — Bộ tách thùng trên băng tải tích lũy (A3, Lab L08)
Băng tải con lăn dài 2000 (X=0..2000). Thùng 300×200×200. Hai chặn đứng: `2A` ở X=1400, `1A` ở X=1100 (cách 1 thùng). Khi 2A hạ cho thùng đầu đi thì 1A nâng giữ thùng thứ hai.

| Node 3D | axis / travel |
|---|---|
| `cyl_1A_rod` (chặn 1, nâng lên chặn) | Z / 40 |
| `cyl_2A_rod` (chặn 2) | Z / 40 |
| `rollers` (cụm con lăn, app quay từng con lăn không bắt buộc) | — |
| `sen_1B1 sen_1B2 sen_2B1 sen_2B2 sen_B3 sen_B4 sen_B5` | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5/%I0.6 | 1B1/1B2 | chặn 1 hạ / nâng |
| %I0.7/%I1.0 | 2B1/2B2 | chặn 2 hạ / nâng |
| %I1.1 | B3 | có thùng tại chặn 2 (X≈1250) |
| %I1.2 | B4 | hàng tích lũy đầy (X≈500) |
| %I1.3 | B5 | máy sau sẵn sàng / thùng đã qua (X≈1900) |
| %Q0.2 | 1Y1 | nâng chặn 1 (đơn cuộn, lò xo hạ) |
| %Q0.3 | 2Y1 | nâng chặn 2 |
| %Q0.4 | M1 | động cơ con lăn |
| %Q0.5 | M2 | băng tải ra (sau chặn 2) |

### 6.3 `diverter` — Hệ phân phối thùng 3 làn (A2, Lab L09/L13)
Băng tải chính dài 3000 (X=0..3000), rộng 400. Ba xi lanh gạt phía trước (−Y) đẩy thùng theo +Y vào 3 làn con lăn nghiêng dài 1200 phía sau. Tâm làn X = 900 / 1700 / 2500. Đầu đọc mã ở X=300. Thùng không gạt chạy ra cuối băng (làn loại).

| Node 3D | axis / travel |
|---|---|
| `cyl_1A_rod`, `cyl_2A_rod`, `cyl_3A_rod` (bàn gạt 350×150) | Y / 420 |
| `belt_main` | — |
| `sen_B0` (vào), `sen_BC` (đầu đọc mã), `sen_B1`,`sen_B2`,`sen_B3` (thùng trước bàn gạt), `sen_L1F`,`sen_L2F`,`sen_L3F` (làn đầy), `sen_1B1`…`sen_3B2` | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | B0 | thùng vào |
| %I0.6 | B1 | thùng tại gạt 1 |
| %I0.7 | B2 | thùng tại gạt 2 |
| %I1.0 | B3 | thùng tại gạt 3 |
| %I1.1 | L1F | làn 1 đầy |
| %I1.2 | L2F | làn 2 đầy |
| %I1.3 | L3F | làn 3 đầy |
| %I1.4 | CodeValid | đầu đọc có mã |
| %I1.5 | — | dự phòng |
| %I2.0–%I2.5 | 1B1,1B2,2B1,2B2,3B1,3B2 | reed các xi lanh |
| %IW68 | Code | mã sản phẩm 1..3 (0 = lỗi đọc) |
| %Q0.2/%Q0.3/%Q0.4 | 1Y1/2Y1/3Y1 | gạt 1/2/3 (đơn cuộn) |
| %Q0.5 | M1_Run | chạy băng tải chính (biến tần, chế độ DI) |
| %QW80 | M1_Speed | setpoint tốc độ 0..27648 (0–100 %) — lab L13 dùng PROFINET sau |

### 6.4 `erector` — Máy dựng thùng carton (A1, Lab L10/L15/L16)
Ổ chứa tấm carton phẳng (dài 1000, nghiêng 10°) phía sau-trái. Trình tự: (1) `1A` tay hút tiến (−Y) áp vào tấm, `VAC` hút, `1A` lùi kéo tấm ra → (2) `2A` tay mở quay 90° bẻ tấm thành hộp (vạt trên, dưới vẫn mở) → (3) `3A` gấp vạt nhỏ trước (quay), `4A` gấp vạt nhỏ sau (quay) → (4) `5A` đẩy thùng theo +X qua thanh gấp vạt lớn cố định + đầu dán băng keo đáy → thùng ra băng tải `M1`.

| Node 3D | axis / travel |
|---|---|
| `cyl_1A_rod` (cụm tay hút + 4 giác hút) | -Y / 350 |
| `arm_2A` (tay mở, quay quanh trục đứng) | rot Z / 90 |
| `flap_3A` (tay gấp vạt nhỏ trước, quay quanh trục Y) | rot Y / 90 |
| `flap_4A` (tay gấp vạt nhỏ sau) | rot Y / -90 |
| `cyl_5A_rod` (tấm đẩy thùng) | X / 500 |
| `magazine_pusher` (tấm ép ổ chứa, app dịch theo số tấm còn) | -Y / 600 |
| `belt_out` | — |
| `sen_*` cho tất cả B dưới | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5/%I0.6 | 1B1/1B2 | tay hút lùi / tiến |
| %I0.7 | VacOK | công tắc chân không đạt |
| %I1.0/%I1.1 | 2B1/2B2 | tay mở về / mở xong |
| %I1.2/%I1.3 | 3B1/3B2 | gấp vạt trước về / xong |
| %I1.4/%I1.5 | 4B1/4B2 | gấp vạt sau về / xong |
| %I2.0/%I2.1 | 5B1/5B2 | đẩy thùng lùi / ra |
| %I2.2 | MagLow | ổ chứa sắp hết (≤ 10 tấm) |
| %I2.3 | MagEmpty | ổ chứa hết |
| %I2.4 | BoxOut | thùng ra băng tải (quang) |
| %I2.5 | TapeOK | còn băng keo |
| %I2.6 | AirOK | đủ áp khí |
| %I2.7 | DoorOK | cửa an toàn đóng |
| %Q0.2/%Q0.3 | 1Y1/1Y2 | van 5/2 **kép cuộn** tay hút: tiến / lùi |
| %Q0.4 | VAC | van chân không (ejector) |
| %Q0.5 | 2Y1 | tay mở (đơn cuộn) |
| %Q0.6 | 3Y1 | gấp vạt trước |
| %Q0.7 | 4Y1 | gấp vạt sau |
| %Q1.0/%Q1.1 | 5Y1/5Y2 | van kép cuộn đẩy thùng: ra / lùi |
| %Q2.0 | M1 | băng tải ra |
| %Q2.1 | H_Low | đèn vàng báo sắp hết carton |

### 6.5 `sealer` — Máy dán thùng (đóng nắp) (A4, Lab L11)
Thùng mở nắp vào từ trái trên băng tải vào. Chặn `1A` giữ thùng ở X=600. `2A` tay gấp vạt nhỏ trước (quay), `3A` tay gấp vạt nhỏ sau (quay, từ trên), `4A` tấm ép trên hạ xuống giữ nắp; sau đó 2 dây đai kéo hai bên (`M2`) kéo thùng qua thanh gấp vạt lớn cố định + đầu dán băng keo trên → ra.

| Node 3D | axis / travel |
|---|---|
| `cyl_1A_rod` (chặn) | Z / 40 |
| `flap_2A` | rot Y / 90 |
| `flap_3A` | rot Y / -120 |
| `cyl_4A_rod` (tấm ép trên, có bánh lăn) | -Z / 80 |
| `belt_in`, `belt_side_L`, `belt_side_R` | — |
| `sen_*` | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | BIn | thùng vào |
| %I0.6 | BPos | thùng đúng vị trí tại chặn |
| %I0.7 | BOut | thùng ra |
| %I1.0/%I1.1 | 1B1/1B2 | chặn hạ / nâng |
| %I1.2/%I1.3 | 2B1/2B2 | gấp trước về / xong |
| %I1.4/%I1.5 | 3B1/3B2 | gấp sau về / xong |
| %I2.0/%I2.1 | 4B1/4B2 | tấm ép lên / xuống |
| %I2.2 | TapeOK | còn băng keo |
| %Q0.2 | M1 | băng tải vào |
| %Q0.3 | 1Y1 | nâng chặn |
| %Q0.4 | 2Y1 | gấp trước |
| %Q0.5 | 3Y1 | gấp sau |
| %Q0.6 | 4Y1 | hạ tấm ép |
| %Q0.7 | M2 | đai kéo hai bên |

### 6.6 `pickplace` — Trạm gắp–đặt 2 trục khí nén (A5, Lab L11)
Băng tải sản phẩm vào (X=0..800, chặn cuối ở X=800 = vị trí gắp). Trục X là xi lanh không cần (rodless) dài hành trình 500 từ X=800 → X=1300 (vị trí đặt, trên thùng). Trục Z xi lanh dẫn hướng 150 gắn trên bàn trượt X, đầu có giác hút. Thùng trên băng tải ra chạy theo Y (vuông góc), app dịch thùng 1 ô sau mỗi sản phẩm (thùng 2×3 = 6 sản phẩm, băng tải ra chạy theo cảm biến bước).

| Node 3D | parent | axis / travel |
|---|---|---|
| `slide_1A` (bàn trượt X) | — | X / 500 |
| `cyl_2A_rod` (cụm Z + giác hút) | `slide_1A` | -Z / 150 |
| `belt_in`, `belt_out` | — | — |
| `sen_*` | — | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5/%I0.6 | 1B1/1B2 | X tại gắp / tại đặt |
| %I0.7/%I1.0 | 2B1/2B2 | Z lên / xuống |
| %I1.1 | VacOK | đã hút được |
| %I1.2 | PartAtPick | có sản phẩm tại vị trí gắp |
| %I1.3 | BoxAtPlace | có thùng tại vị trí đặt |
| %I1.4 | BoxStep | cảm biến bước băng tải ra (xung mỗi ô) |
| %Q0.2/%Q0.3 | 1Y1/1Y2 | X: sang đặt / về gắp (5/3 tâm kín — cả hai 0 = dừng) |
| %Q0.4 | 2Y1 | Z xuống (đơn cuộn) |
| %Q0.5 | VAC | hút chân không |
| %Q0.6 | Blow | thổi nhả |
| %Q0.7 | M1 | băng tải vào |
| %Q1.0 | M2 | băng tải ra (thùng) |

### 6.7 `indexer` — Bàn xoay chia 4 vị trí (B1, thay L06)
Bàn tròn Ø800 tâm tại (X=600, Y=0), cao Z=800, 4 ổ gá cách 90°. Trạm 0 (X=200, phía trái): nạp phôi bằng xi lanh `4A` đẩy từ máng nạp. Trạm 1 (phía sau): `2A` ép xuống. Trạm 2 (phải): cảm biến kiểm tra chiều cao. Trạm 3 (trước): `3A` gạt phôi ra máng ra (OK) — phôi lỗi gạt vào thùng NG bằng `5A` ở trạm 3 theo hướng khác. Động cơ `M1` + cam chỉ vị trí; chốt định vị `1A` từ dưới lên.

| Node 3D | axis / travel |
|---|---|
| `table` (bàn xoay, origin = tâm bàn) | rot Z / 360 (app quay liên tục, 90°/bước) |
| `cyl_1A_rod` (chốt định vị) | Z / 30 |
| `cyl_2A_rod` (đầu ép) | -Z / 80 |
| `cyl_3A_rod` (gạt OK, đặt phía sau bàn, gạt ra phía trước) | -Y / 200 |
| `cyl_4A_rod` (nạp phôi) | X / 200 |
| `cyl_5A_rod` (gạt NG) | X / 200 |
| `sen_*` | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | IdxPos | cam: bàn đúng vị trí chia |
| %I0.6/%I0.7 | 1B1/1B2 | chốt rút / chốt vào |
| %I1.0/%I1.1 | 2B1/2B2 | ép lên / xuống |
| %I1.2/%I1.3 | 3B1/3B2 | gạt OK lùi / ra |
| %I1.4/%I1.5 | 4B1/4B2 | nạp lùi / ra |
| %I2.0/%I2.1 | 5B1/5B2 | gạt NG lùi / ra |
| %I2.2 | FeedAvail | máng nạp có phôi |
| %I2.3 | P0 | có phôi tại trạm 0 |
| %I2.4 | P2 | có phôi tại trạm 2 (kiểm tra) |
| %I2.5 | HeightOK | phôi đạt chiều cao (chỉ hợp lệ khi P2) |
| %I2.6 | P3 | có phôi tại trạm 3 |
| %Q0.2 | M1 | động cơ quay bàn |
| %Q0.3 | 1Y1 | đẩy chốt vào |
| %Q0.4 | 2Y1 | ép xuống |
| %Q0.5 | 3Y1 | gạt OK |
| %Q0.6 | 4Y1 | nạp phôi |
| %Q0.7 | 5Y1 | gạt NG |

### 6.8 `palletizer` — Máy xếp pallet khí nén đơn giản (B4, Lab đồ án)
Thùng 400×300×250 vào trên băng tải (X=0..1500). Chặn `1A` ở cuối, gom 2 thùng thành 1 hàng; `2A` đẩy hàng theo +Y lên **tấm đỡ lớp** (2 tấm trượt `3A` mở theo ±X). Đủ 2 hàng (lớp 2×2) → `3A` mở tấm, lớp rơi xuống pallet trên **bàn nâng** (động cơ `M2` lên/xuống, vị trí theo cảm biến). Mỗi lớp xong bàn hạ 1 lớp (cảm biến `LayerLvl` nhìn đỉnh chồng). 3 lớp = pallet đầy → băng tải pallet `M3` đưa ra, pallet rỗng mới vào (app tạo).

| Node 3D | axis / travel |
|---|---|
| `cyl_1A_rod` (chặn) | Z / 40 |
| `cyl_2A_rod` (tấm đẩy hàng) | Y / 650 |
| `plate_3A_L`, `plate_3A_R` (tấm đỡ lớp, mở ra hai phía) | -X / 450, X / 450 |
| `lift` (bàn nâng + con lăn pallet) | Z / 900 (0 = thấp nhất, 1 = sát tấm đỡ) |
| `pallet` (pallet gỗ 1000×800) | parent `lift` |
| `belt_in` | — |
| `sen_*` | — |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | BIn | thùng vào |
| %I0.6 | RowFull | đủ 2 thùng tại chặn |
| %I0.7/%I1.0 | 1B1/1B2 | chặn hạ / nâng |
| %I1.1/%I1.2 | 2B1/2B2 | đẩy lùi / ra |
| %I1.3/%I1.4 | 3B1/3B2 | tấm đỡ đóng / mở |
| %I1.5 | LiftTop | bàn nâng chạm trên |
| %I2.0 | LiftBottom | bàn nâng chạm dưới |
| %I2.1 | LayerLvl | đỉnh chồng hàng ngang mức nhận lớp (quang) |
| %I2.2 | PalletIn | có pallet trên bàn nâng |
| %I2.3 | PalletOut | pallet đã ra (cuối băng ra) |
| %Q0.2 | M1 | băng tải thùng vào |
| %Q0.3 | 1Y1 | nâng chặn |
| %Q0.4 | 2Y1 | đẩy hàng |
| %Q0.5 | 3Y1 | mở tấm đỡ |
| %Q0.6 | M2_Up | bàn nâng lên |
| %Q0.7 | M2_Down | bàn nâng xuống |
| %Q1.0 | M3 | băng tải pallet ra (khi bàn ở dưới) |

## 7. `assets/models/manifest.json`

```json
{ "units":"m", "up":"Y",
  "machines": {
    "feeder": { "file":"feeder.glb", "bbox":[[x0,y0,z0],[x1,y1,z1]], "camera":{ "pos":[…], "target":[…] },
                "nodes": { "cyl_1A_rod": { "type":"translate", "axisFC":[1,0,0], "travel":120 },
                           "table":      { "type":"rotate",    "axisFC":[0,0,1], "travel":360 },
                           "sen_1B1":    { "type":"sensor" } } } } }
```
`axisFC` theo hệ FreeCAD (Z-up); app tự đổi sang three. `travel` mm hoặc độ. Luồng 3D lấy giá trị từ mục 6.

## 8. Thư mục

```
bk-autolab/
  index.html            (UI)
  styles/               (UI)
  src/app/              (UI)  router, pages, components, PLC Studio, HMI, mockApi, i18n
  src/scene/            (UI)  viewer three.js, nạp GLB, binder getVisual() → node, items procedural
  src/plc/              (Engine) runtime.js, lad.js, scl.js, values.js, addr.js
  src/sim/              (Engine) index.js, kit.js (xi lanh, van, băng tải, cảm biến), machines/<id>.js
  src/labs/             (Engine) index.js, <labId>.js: mô tả, mục tiêu, I/O, project khởi đầu, kịch bản chấm
  assets/models/        (3D)  *.glb, manifest.json, preview/*.png, src/*.FCStd
  tools/freecad/        (3D)  lib.py (chi tiết dùng chung), <machineId>.py, build_all.py
  vendor/three/         three r160 (MIT)
  docs/
```

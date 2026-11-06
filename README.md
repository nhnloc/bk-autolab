# BK-AutoLab — Phòng lab ảo PLC S7-1200

Mô phỏng PLC kiểu Siemens S7-1200 (LAD, SCL) chạy hoàn toàn trên trình duyệt, kèm 8 máy công nghiệp 3D dựng bằng FreeCAD và chấm bài tự động. Phục vụ giảng dạy; không liên kết với Siemens AG.

## Chạy thử

```bash
python3 -m http.server 8000
```
Mở http://localhost:8000. Sinh viên tự **đăng ký** (Họ tên, Lớp, MSSV) rồi đăng nhập bằng MSSV.
Khi chạy trên máy (localhost) có thêm nút **Vào vai trò giảng viên**; bản trên web (GitHub Pages) chỉ có vai trò sinh viên.

**Danh sách lớp** nằm trong `data/classes.json`. Giảng viên sửa ở trang *Danh sách lớp* (chạy trên máy) → *Tải xuống classes.json* → thay file trong repo → `git push`.

**Lời giải mẫu** đặt ở `private/solutions.js` (không đưa lên git, xem `.gitignore`).

> Trang web tĩnh không có server: đăng ký, bài làm, điểm lưu trên trình duyệt của từng sinh viên.
Máy không có WebGL sẽ hiện sơ đồ 2D thay cho 3D.

## Chạy thử mẫu (cho sinh viên xem trước quy trình)

Trên trang lab có nút **Chạy thử mẫu**: mở một máy mô phỏng riêng chạy theo chương trình mẫu (chạy/tạm dừng, chạy lại, tốc độ 0,5–4×, tua, nhật ký diễn biến có chú thích). Bài làm của sinh viên không bị ảnh hưởng.

Bản chạy thử là "băng ghi" đầu ra PLC + thao tác nút trong `assets/demos/<lab>.json` — **không chứa code lời giải**, nên đưa lên web được. Ghi lại (trên máy giảng viên, cần `private/solutions.js`) mỗi khi sửa lời giải, mô phỏng máy hoặc kịch bản:
```bash
node tools/record-demos.mjs          # mọi lab (hoặc: node tools/record-demos.mjs L07 L09)
```
Script tự phát lại và so khớp từng lab; kịch bản thao tác (nút nào, lúc nào, chú thích) nằm trong `SCRIPTS` của script. Lab chưa có file thì nút bị mờ.

## Kiểm thử

```bash
node tests/plc.test.mjs          # lõi PLC (LAD, SCL, timer, FB/FC)
node tests/labs.test.mjs         # 8 lời giải mẫu phải đạt 100/100
node tests/lad-machine.test.mjs  # chương trình LAD trên máy cấp phôi
node tests/part1-neg.test.mjs    # chương trình sai điển hình Phần 1 phải bị trừ điểm
```
`tests/view3d.html?m=<machineId>` — trang xem 3D độc lập (chạy lời giải mẫu).

## Bài lab giai đoạn này

| Lab | Máy |
|---|---|
| L01 | Bàn thực hành PLC: nút, đèn, cảm biến PNP/NPN |
| L02 | Cửa cuốn: tự giữ, đảo chiều, khóa liên động |
| L03 | Máy nén khí: khởi động sao–tam giác |
| L04 | Băng tải đếm 12 lon/thùng |
| L06 | Bàn xoay chia 4 vị trí |
| L07 | Bộ cấp phôi từ ổ chứa |
| L08 | Bộ tách thùng trên băng tải tích lũy |
| L09 | Hệ phân phối thùng 3 làn |
| L10 | Máy dựng thùng carton |
| L11A | Máy dán thùng |
| L11B | Trạm gắp–đặt 2 trục khí nén |
| L18P | Máy xếp pallet (đồ án) |

## Cấu trúc

- `src/plc/` soft-PLC · `src/sim/` mô phỏng máy · `src/labs/` nội dung lab, bài giảng (`lectures.js`), chấm bài
- `src/app/`, `src/scene/`, `styles/` giao diện · `assets/models/` mô hình GLB + nguồn FreeCAD
- `tools/freecad/` script dựng mô hình (chạy trong FreeCAD) · `docs/CONTRACT.md`, `docs/CHANGES.md` đặc tả kỹ thuật
- `vendor/three/` three.js r160 (MIT)

Muốn giảng viên xem được bài nộp và điểm của cả lớp cần thêm server/dịch vụ lưu trữ — giai đoạn sau.

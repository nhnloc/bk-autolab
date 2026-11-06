# BK-AutoLab — Phòng lab ảo PLC S7-1200

Mô phỏng PLC kiểu Siemens S7-1200 (LAD, SCL) chạy hoàn toàn trên trình duyệt, kèm 8 máy công nghiệp 3D dựng bằng FreeCAD và chấm bài tự động. Phục vụ giảng dạy; không liên kết với Siemens AG.

## Chạy thử

```bash
python3 -m http.server 8000
```
Mở http://localhost:8000 — đăng nhập demo: sinh viên `20210101`, giảng viên `gv.tranminh`, mật khẩu bất kỳ.
Máy không có WebGL sẽ hiện sơ đồ 2D thay cho 3D.

## Kiểm thử

```bash
node tests/plc.test.mjs          # lõi PLC (LAD, SCL, timer, FB/FC)
node tests/labs.test.mjs         # 8 lời giải mẫu phải đạt 100/100
node tests/lad-machine.test.mjs  # chương trình LAD trên máy cấp phôi
```
`tests/view3d.html?m=<machineId>` — trang xem 3D độc lập (chạy lời giải mẫu).

## Bài lab giai đoạn này

| Lab | Máy |
|---|---|
| L06 | Bàn xoay chia 4 vị trí |
| L07 | Bộ cấp phôi từ ổ chứa |
| L08 | Bộ tách thùng trên băng tải tích lũy |
| L09 | Hệ phân phối thùng 3 làn |
| L10 | Máy dựng thùng carton |
| L11A | Máy dán thùng |
| L11B | Trạm gắp–đặt 2 trục khí nén |
| L18P | Máy xếp pallet (đồ án) |

## Cấu trúc

- `src/plc/` soft-PLC · `src/sim/` mô phỏng máy · `src/labs/` nội dung lab, lời giải, chấm bài
- `src/app/`, `src/scene/`, `styles/` giao diện · `assets/models/` mô hình GLB + nguồn FreeCAD
- `tools/freecad/` script dựng mô hình (chạy trong FreeCAD) · `docs/CONTRACT.md`, `docs/CHANGES.md` đặc tả kỹ thuật
- `vendor/three/` three.js r160 (MIT)

Đăng nhập, lớp học, sổ điểm hiện là bản demo lưu trong trình duyệt; server tài khoản sinh viên là giai đoạn sau.

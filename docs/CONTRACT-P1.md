# Hợp đồng bổ sung — Phần 1 (L01–L04)

Bổ sung cho `docs/CONTRACT.md` (mọi quy tắc cũ giữ nguyên: mm, Z-up, X = chiều vật liệu, gốc máy ở sàn, node chuyển động đặt ở vị trí nghỉ, `sen_<TAG>` cho LED cảm biến, `glass_` trong suốt, `static_` tĩnh, manifest §7).

## Quy ước mới

- **Đèn/thiết bị đầu ra**: node `out_<TAG>` (vd. `out_H1`, `out_KM1`). Viewer làm phát sáng (emissive) khi `getVisual().outs[TAG] === true`. Màu gốc của node = màu đèn khi tắt (tối); viewer tự tăng emissive cùng màu khi bật. Manifest: `{ "type": "output", "tag": "H1", "color": "#e53935" }`.
- **Nút nhấn trên mô hình**: node `btn_<ID>` (ID = id nút trong `def.buttons`), manifest `{ "type": "translate", "axisFC": [hướng nhấn], "travel": 4 }`; engine trả `parts.btn_<ID>` = 0/1. Click vào node này trong 3D ⇒ viewer gọi `m.press(ID, down)` (nút nhấn nhả khi thả chuột; latching/selector: mỗi click đảo trạng thái).
- **Kim đồng hồ**: node `needle_<name>` quay quanh trục mặt đồng hồ, manifest `{ "type": "rotate", "axisFC": […], "travel": -270 }` (value 0..1).
- `getVisual()` có thêm:
  - `outs: { TAG: bool }` cho mọi đầu ra Bool.
  - `displays: [{ id, label, value, unit, digits }]` — bảng LED / đồng hồ số (UI vẽ dạng 7 đoạn trên bảng điều khiển 2D).
  - `trend: { series: [{ id, label, unit, max, color, data:[…] }], dtMs }` — đồ thị thời gian thực (UI vẽ ở bảng bên dưới cảnh 3D, tối đa ~600 điểm).

## Máy

### `trainer` — Bàn thực hành PLC (L01)
Bàn trainer đặt trên bàn học: tấm nhôm nghiêng 15° rộng 800, cao 500, trên mặt bàn Z=750. Gồm: hộp PLC S7-1200 ảo + nguồn 24 V trên thanh DIN (phía trên), hàng nút S1 (xanh lá), S2 (xanh lá), S3 (đỏ, NC), công tắc xoay SW1, 4 đèn H1 đỏ / H2 vàng / H3 xanh lá / H4 xanh dương, còi BUZ; bên phải: cảm biến tiệm cận M18 nhìn xuống một tấm trượt có miếng kim loại (`target_metal`), cảm biến quang thu–phát với tấm chắn (`blocker`).

| Node | Loại |
|---|---|
| `btn_S1`, `btn_S2`, `btn_S3` | translate, hướng vào mặt tấm, 4 |
| `btn_SW1` | rotate quanh trục vuông góc mặt tấm, 90 |
| `out_H1` đỏ, `out_H2` vàng, `out_H3` xanh lá, `out_H4` xanh dương, `out_BUZ` (vòng đỏ của còi) | output |
| `target_metal` | translate X, 120 (1 = nằm dưới cảm biến) |
| `blocker` | translate Z, -60 (1 = chắn tia) |
| `sen_PRX`, `sen_PE` | sensor |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | S1 | Nút S1 xanh (NO) |
| %I0.6 | S2 | Nút S2 xanh (NO) |
| %I0.7 | S3 | Nút S3 đỏ (NC — bình thường = 1) |
| %I1.0 | SW1 | Công tắc xoay (1 = phải) |
| %I1.1 | PRX | Cảm biến tiệm cận điện cảm PNP (1 = có kim loại) |
| %I1.2 | PE | Cảm biến quang thu–phát, Dark-On (1 = tia bị chắn) |
| %Q0.2..%Q0.5 | H1..H4 | Đèn đỏ, vàng, xanh lá, xanh dương |
| %Q0.6 | BUZ | Còi |

### `motor` — Cửa cuốn, động cơ 3 pha đảo chiều (L02)
Khung cửa cuốn rộng 2000, cao 2400 (đặt từ X=0), lô cuốn + động cơ ở trên đỉnh, ray hai bên. Bên phải: tủ điện nhỏ 400×600 cửa kính (`glass_cabinet`) chứa CB, 2 contactor KM1/KM2 (nút chỉ thị trên mặt contactor = `out_KM1`, `out_KM2`), rơ-le nhiệt F1; hộp nút Lên/Xuống trên tường. Cảm biến quang an toàn ở chân cửa (thu–phát hai bên ray, Z=300).

| Node | Loại |
|---|---|
| `door` (tấm cửa dạng lá, mép dưới ở Z=0 khi đóng) | translate Z, 2200 (1 = mở hết) |
| `drum` (lô cuốn) | rotate quanh trục X, 360 (app quay liên tục) |
| `btn_Up`, `btn_Down` | translate, 4 |
| `out_KM1`, `out_KM2`, `out_H_Up`, `out_H_Down` | output |
| `obstacle` (thùng carton dưới cửa, app ẩn/hiện) | translate Y, 0 |
| `sen_LS_Up`, `sen_LS_Down`, `sen_PE` | sensor |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | S_Up | Nút Lên (NO) |
| %I0.6 | S_Down | Nút Xuống (NO) |
| %I0.7 | F1 | Tiếp điểm rơ-le nhiệt (NC — 1 = bình thường, 0 = quá tải) |
| %I1.0 | LS_Up | Công tắc hành trình trên (1 = cửa mở hết) |
| %I1.1 | LS_Down | Công tắc hành trình dưới (1 = cửa đóng hết) |
| %I1.2 | PE | Cảm biến an toàn chân cửa (1 = có vật cản) |
| %Q0.2 | KM1 | Contactor Lên (thuận) |
| %Q0.3 | KM2 | Contactor Xuống (nghịch) |
| %Q0.4 | H_Up | Đèn báo đang lên |
| %Q0.5 | H_Down | Đèn báo đang xuống |

### `stardelta` — Máy nén khí khởi động sao–tam giác (L03)
Cụm máy nén khí piston trên bình chứa nằm ngang 500 L (dài 1600, Ø600), động cơ điện có quạt, dây curoa; đồng hồ áp suất trên bình (`needle_P`). Bên phải: tủ điện 600×800 cửa kính có 3 contactor KM1 (nguồn), KM2 (sao), KM3 (tam giác) với chỉ thị `out_KM1..3`, rơ-le nhiệt F1, ampe kế mặt tủ (`needle_A`).

| Node | Loại |
|---|---|
| `pulley` (puli + quạt động cơ) | rotate quanh trục động cơ, 360 (app quay theo tốc độ) |
| `needle_P` (0..10 bar) | rotate, -270 |
| `needle_A` (0..200 A) | rotate, -90 |
| `out_KM1`, `out_KM2`, `out_KM3` | output |
| `sen_PS`, `sen_F1` | sensor |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | F1 | Rơ-le nhiệt (NC — 1 = bình thường) |
| %I0.6 | PS | Công tắc áp suất (1 = áp thấp, cần nén; tự ngắt ở 8 bar, đóng lại ở 6 bar) |
| %IW64 | P_Raw | Cảm biến áp suất 0..27648 = 0..10 bar |
| %IW66 | I_Raw | Biến dòng 0..27648 = 0..200 A |
| %Q0.2 | KM1 | Contactor nguồn |
| %Q0.3 | KM2 | Contactor sao |
| %Q0.4 | KM3 | Contactor tam giác |

### `counter` — Băng tải đếm sản phẩm vào thùng (L04)
Băng tải sản phẩm (trắng) dài 1500 dọc X, mặt Z=800; cuối băng là máng trượt thả sản phẩm (lon nước Ø66×120) xuống thùng carton (300×200×200) nằm trên băng tải thùng (xanh, ngang dọc theo Y, mặt Z=450) tại X≈1600. Cảm biến quang đếm ở cuối băng, cảm biến thùng ở băng tải thùng. Bảng LED hiển thị số đếm 4 chữ số gắn trên cột (`display`), đèn báo thùng đầy.

| Node | Loại |
|---|---|
| `belt_1` (X), `belt_2` (Y) | belt |
| `display` (mặt bảng LED; UI vẽ số bằng texture nếu được, không bắt buộc) | static |
| `out_H_Full` | output |
| `sen_B1`, `sen_B2`, `sen_B3` | sensor |

| I/O | Tag | Mô tả |
|---|---|---|
| %I0.5 | B1 | Cảm biến quang đếm sản phẩm rơi vào thùng (cuối băng) |
| %I0.6 | B2 | Có thùng đúng vị trí dưới máng |
| %I0.7 | B3 | Sản phẩm vào đầu băng tải |
| %Q0.2 | M1 | Băng tải sản phẩm |
| %Q0.3 | M2 | Băng tải thùng |
| %Q0.4 | H_Full | Đèn báo thùng đầy |
| %QW80 | Display | Số hiển thị trên bảng LED (Int) |

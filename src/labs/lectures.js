// Bài giảng, chuẩn đầu ra (outcomes) và câu hỏi nhanh cho từng bài lab.
// body: Markdown rút gọn — đoạn văn, "### ", "- ", "1. ", **đậm**, `mã`, bảng | a | b |.

export const COURSE_INFO = {
  title: 'Lập trình PLC và điều khiển khí nén',
  subtitle: 'Thực hành trên PLC S7-1200 mô phỏng',
};

export const LECTURES = {
  /* ======================= PHẦN 1 — PLC CƠ BẢN ======================= */
  L01: {
    durationMin: 30,
    outcomes: [
      { code: 'L01.1', text: 'Mô tả cấu trúc một hệ PLC: nguồn, CPU, ngõ vào số (DI), ngõ ra số (DQ), chu kỳ quét.' },
      { code: 'L01.2', text: 'Đọc và viết đúng địa chỉ %I, %Q, %M; tạo bảng tag có tên gợi nhớ.' },
      { code: 'L01.3', text: 'Lập trình LAD với tiếp điểm NO, NC, cuộn dây; ghép nối tiếp (AND) và song song (OR).' },
      { code: 'L01.4', text: 'Phân biệt nút nhấn NO/NC và cảm biến PNP/NPN; giải thích vì sao cảm biến NPN không chạy với ngõ vào kiểu sink.' },
    ],
    sections: [
      {
        title: '1. PLC là gì?',
        body: `PLC (Programmable Logic Controller — bộ điều khiển logic khả trình) là máy tính công nghiệp đọc tín hiệu từ nút nhấn, cảm biến rồi điều khiển đèn, van, contactor, động cơ theo chương trình người lập trình viết.

So với mạch rơ-le, PLC thay hàng chục rơ-le và dây nối bằng **chương trình**: muốn đổi chức năng chỉ cần sửa chương trình, không phải đi lại dây.

### Thành phần của một hệ PLC S7-1200
- **Nguồn 24 VDC** cấp cho CPU, cảm biến và mạch ngõ vào.
- **CPU** (ví dụ 1214C DC/DC/DC): chứa bộ nhớ chương trình, có sẵn 14 ngõ vào số, 10 ngõ ra số, 2 ngõ vào analog.
- **Ngõ vào số (DI)**: nhận tín hiệu 0 V / 24 V từ nút nhấn, công tắc, cảm biến.
- **Ngõ ra số (DQ)**: xuất 24 V để bật đèn, cuộn van, cuộn hút contactor.
- **Phần mềm lập trình** (trong lớp này: PLC Studio mô phỏng giao diện kiểu TIA Portal).`,
      },
      {
        title: '2. Chu kỳ quét (scan cycle)',
        body: `PLC chạy chương trình lặp đi lặp lại theo 3 bước, mỗi vòng gọi là một **chu kỳ quét** (thường 1–10 ms):

1. **Đọc ngõ vào**: chụp trạng thái tất cả ngõ vào vào vùng nhớ ảnh %I.
2. **Thực hiện chương trình** từ network đầu đến network cuối của OB1 (Main).
3. **Ghi ngõ ra**: chép vùng nhớ ảnh %Q ra các chân ngõ ra thật.

Hệ quả quan trọng: trong một chu kỳ quét, giá trị %I **không đổi**; nếu một cuộn dây được ghi hai lần, **lần ghi sau cùng thắng**. Thời gian quét hiện ở góc trên thanh công cụ ("Quét … ms").`,
      },
      {
        title: '3. Địa chỉ và bảng tag',
        body: `| Vùng | Ý nghĩa | Ví dụ |
|---|---|---|
| %I | Ngõ vào (Input) | %I0.5 = byte 0, bit 5 |
| %Q | Ngõ ra (Output) | %Q0.2 |
| %M | Bit nhớ trung gian (Memory) | %M10.0 |
| %IW / %QW / %MW | Word 16 bit | %IW64 (analog) |

Mỗi byte có 8 bit đánh số 0..7, vì vậy sau %I0.7 là **%I1.0** (không có %I0.8).

**Bảng tag (PLC tags)** gán tên gợi nhớ cho địa chỉ: viết \`"S1"\` dễ đọc hơn \`%I0.5\`. Trong bài này bảng tag đã có sẵn — mở **Tag PLC → Bảng tag** để xem.`,
      },
      {
        title: '4. Ba phần tử LAD cơ bản',
        body: `| Ký hiệu | Tên | Dẫn điện khi |
|---|---|---|
| \`-| |-\` | Tiếp điểm thường mở (NO) | toán hạng = 1 |
| \`-|/|-\` | Tiếp điểm thường đóng (NC) | toán hạng = 0 |
| \`-( )-\` | Cuộn dây (coil) | — ghi 1 nếu có dòng tới, 0 nếu không |

### Nối tiếp và song song
- **Nối tiếp = AND**: hai tiếp điểm nối tiếp → cuộn dây chỉ bật khi cả hai cùng dẫn.
- **Song song = OR**: mở nhánh song song → chỉ cần một nhánh dẫn.

Bật **Giám sát** (Monitor): đường có dòng điện tô xanh liền, đường không có dòng là nét đứt. Đây là cách nhanh nhất để tìm lỗi logic.`,
      },
      {
        title: '5. Nút nhấn NO / NC — bẫy hay gặp',
        body: `Tiếp điểm **trong chương trình** và tiếp điểm **của nút nhấn thật** là hai chuyện khác nhau.

- Nút **NO** (thường mở): không nhấn → ngõ vào = 0; nhấn → 1.
- Nút **NC** (thường đóng): không nhấn → ngõ vào = **1**; nhấn → **0**. Nút Stop và Dừng khẩn luôn dùng loại NC để **đứt dây thì máy dừng** (an toàn khi hỏng).

Vì vậy: muốn "khi nhấn S3 (NC) thì còi kêu", trong LAD phải dùng tiếp điểm **thường đóng** \`-|/|-\` cho "S3". Ngược lại, với nút Stop NC, ta dùng tiếp điểm **thường mở** "Stop" nối tiếp trong mạch chạy.`,
      },
      {
        title: '6. Cảm biến PNP và NPN',
        body: `Cảm biến tiệm cận/quang loại 3 dây (nâu +24 V, xanh dương 0 V, đen tín hiệu):

- **PNP (sourcing)**: khi tác động, dây đen **xuất +24 V**.
- **NPN (sinking)**: khi tác động, dây đen **kéo về 0 V**.

Ngõ vào S7-1200 thường đấu kiểu **sink**: chân chung 1M nối 0 V, ngõ vào nhận +24 V → chỉ dùng được cảm biến **PNP**. Lắp cảm biến NPN vào: đèn trên thân cảm biến vẫn sáng nhưng PLC **không** nhận tín hiệu. Hãy thử nút "Thay bằng cảm biến NPN" trên bàn trainer!

Cảm biến quang thu–phát kiểu **Dark-On**: ngõ ra = 1 khi tia bị **chắn**.`,
      },
    ],
    quiz: [
      { q: 'Địa chỉ nào đứng ngay sau %I0.7?', options: ['%I0.8', '%I1.0', '%I1.7', '%IW1'], answer: 1, explain: 'Mỗi byte có 8 bit (0..7), bit tiếp theo là bit 0 của byte 1.' },
      { q: 'Nút S3 là nút NC. Khi KHÔNG nhấn, ngõ vào %I0.7 bằng?', options: ['0', '1', 'Không xác định'], answer: 1, explain: 'Nút thường đóng dẫn điện khi không nhấn → ngõ vào = 1.' },
      { q: 'Muốn H2 sáng khi nhấn đồng thời S1 và S2, ta nối hai tiếp điểm NO "S1", "S2"…', options: ['song song', 'nối tiếp', 'dùng tiếp điểm NC'], answer: 1, explain: 'Nối tiếp tương ứng phép AND.' },
      { q: 'Cảm biến NPN đấu vào ngõ vào kiểu sink (1M = 0 V) thì…', options: ['chạy bình thường', 'PLC không nhận tín hiệu', 'cháy ngõ vào'], answer: 1, explain: 'Ngõ vào kiểu sink cần nguồn +24 V từ cảm biến (PNP).' },
    ],
  },

  L02: {
    durationMin: 35,
    outcomes: [
      { code: 'L02.1', text: 'Vẽ và giải thích mạch tự giữ Start/Stop trong LAD; so sánh với lệnh Set/Reset.' },
      { code: 'L02.2', text: 'Lập trình đảo chiều động cơ 3 pha với khóa liên động bằng contactor và bằng nút nhấn.' },
      { code: 'L02.3', text: 'Sử dụng công tắc hành trình, rơ-le nhiệt và cảm biến an toàn để dừng máy đúng cách.' },
      { code: 'L02.4', text: 'Nhận biết nguy cơ ngắn mạch khi hai contactor đảo chiều đóng cùng lúc.' },
    ],
    sections: [
      {
        title: '1. Động cơ 3 pha và contactor',
        body: `Động cơ không đồng bộ 3 pha được đóng/cắt bằng **contactor** (công tắc tơ): PLC xuất 24 V vào cuộn hút A1–A2, tiếp điểm chính đóng nguồn 380 V cho động cơ. Bảo vệ quá tải bằng **rơ-le nhiệt F1**: khi động cơ quá tải, tiếp điểm NC 95–96 của F1 mở ra.

**Đảo chiều quay**: đổi chỗ 2 trong 3 pha. Dùng 2 contactor: KM1 (thuận: L1-L2-L3) và KM2 (nghịch: L3-L2-L1). Nếu KM1 và KM2 **đóng cùng lúc** → ngắn mạch giữa 2 pha, CB nhảy, có thể cháy contactor.`,
      },
      {
        title: '2. Mạch tự giữ (seal-in)',
        body: `Nút nhấn chỉ cho tín hiệu trong lúc nhấn. Để động cơ chạy tiếp sau khi nhả tay, ta dùng **tiếp điểm của chính cuộn dây** mắc song song với nút Start:

| Network | Nội dung |
|---|---|
| 1 | ( "S_Up" **song song** "KM1" ) → "Stop" → … → ( "KM1" ) |

- Nhấn S_Up → KM1 = 1 → tiếp điểm "KM1" dẫn → giữ KM1 = 1 khi nhả tay.
- Nhấn Stop (NC) → ngõ vào "Stop" = 0 → đứt mạch → KM1 = 0.

Cách khác: lệnh **-(S)-** (Set) và **-(R)-** (Reset). Mạch tự giữ "ưu tiên dừng" tự nhiên và an toàn khi mất điện (không tự chạy lại).`,
      },
      {
        title: '3. Khóa liên động (interlock)',
        body: `Hai lớp khóa liên động cho mạch đảo chiều:

1. **Khóa bằng contactor**: nối tiếp tiếp điểm NC "KM2" trước cuộn "KM1", và NC "KM1" trước cuộn "KM2". Contactor này đang đóng thì contactor kia không thể đóng.
2. **Khóa bằng nút nhấn**: nối tiếp NC "S_Down" trong mạch KM1 và NC "S_Up" trong mạch KM2 — nhấn cả hai nút cùng lúc thì không cái nào đóng.

Trong tủ điện thật còn có **khóa liên động cơ khí** giữa hai contactor. PLC chỉ là một lớp bảo vệ.

**Lưu ý**: đảo chiều khi động cơ còn quay gây dòng điện và lực cơ khí rất lớn — nên dừng 0,5–1 s trước khi đảo chiều.`,
      },
      {
        title: '4. Công tắc hành trình và cảm biến an toàn',
        body: `- **LS_Up / LS_Down**: công tắc hành trình báo cửa đã tới giới hạn trên/dưới. Nối tiếp tiếp điểm NC "LS_Up" trong mạch KM1 để động cơ tự dừng khi cửa mở hết. Nếu không, động cơ tiếp tục kéo → quá tải → rơ-le nhiệt tác động.
- **PE (cảm biến chân cửa)**: khi cửa đang xuống mà có vật cản → phải dừng ngay (nhiều cửa thật còn tự mở lên lại).
- **F1 (rơ-le nhiệt)**: là tiếp điểm NC, F1 = 1 khi bình thường. Đưa "F1" (tiếp điểm NO) nối tiếp vào cả hai mạch, và bật đèn H_Fault khi F1 = 0.`,
      },
    ],
    quiz: [
      { q: 'Trong mạch tự giữ, tiếp điểm "KM1" được mắc như thế nào với nút "S_Up"?', options: ['Nối tiếp', 'Song song', 'Không cần'], answer: 1, explain: 'Song song: khi nhả nút, dòng đi qua tiếp điểm KM1 để giữ cuộn dây.' },
      { q: 'Nút Stop trên bảng điều khiển là loại NC. Trong mạch chạy ta dùng tiếp điểm nào cho "Stop"?', options: ['Thường mở -| |-', 'Thường đóng -|/|-'], answer: 0, explain: 'Ngõ vào Stop = 1 khi không nhấn, nên tiếp điểm thường mở dẫn điện; nhấn Stop → 0 → đứt mạch.' },
      { q: 'KM1 và KM2 cùng đóng thì điều gì xảy ra?', options: ['Động cơ quay nhanh hơn', 'Ngắn mạch 2 pha', 'Động cơ dừng an toàn'], answer: 1, explain: 'KM2 đảo 2 pha so với KM1 → hai pha chập trực tiếp qua contactor.' },
    ],
  },

  L03: {
    durationMin: 40,
    outcomes: [
      { code: 'L03.1', text: 'Sử dụng timer IEC TON, TOF, TP, TONR với instance DB; đọc .Q và .ET.' },
      { code: 'L03.2', text: 'Giải thích nguyên lý khởi động sao–tam giác và lợi ích giảm dòng khởi động.' },
      { code: 'L03.3', text: 'Lập trình chuyển sao → tam giác có thời gian chết, khóa liên động KM2–KM3.' },
      { code: 'L03.4', text: 'Đọc giá trị analog (%IW) và quan sát đồ thị dòng điện, tốc độ, áp suất.' },
    ],
    sections: [
      {
        title: '1. Timer IEC trong S7-1200',
        body: `| Timer | Hoạt động | Ứng dụng |
|---|---|---|
| **TON** (on-delay) | IN = 1 liên tục đủ PT → Q = 1; IN = 0 → reset | Trễ đóng: chạy sao 4 s |
| **TOF** (off-delay) | IN = 0 đủ PT → Q = 0 | Quạt chạy thêm sau khi tắt |
| **TP** (pulse) | Sườn lên IN → Q = 1 đúng PT | Tạo xung cố định |
| **TONR** | Như TON nhưng **cộng dồn**, reset bằng R | Đếm giờ chạy máy |

Mỗi timer cần một **instance DB** (ví dụ \`"T_Star"\`) để nhớ thời gian đã trôi qua. Đọc \`"T_Star".Q\` (đã hết giờ chưa) và \`"T_Star".ET\` (thời gian đã chạy). Hằng thời gian viết dạng \`T#4s\`, \`T#80ms\`, \`T#1m30s\`.`,
      },
      {
        title: '2. Vì sao phải khởi động sao–tam giác?',
        body: `Khởi động trực tiếp (DOL), động cơ hút dòng **6–8 lần dòng định mức** trong vài giây → sụt áp lưới, nhảy CB, sốc cơ khí.

Khởi động **sao (Y)**: mỗi cuộn dây chịu điện áp 380/√3 = 220 V → dòng và mômen giảm còn **1/3**. Khi động cơ đạt ~80–90 % tốc độ, chuyển sang **tam giác (Δ)** để chạy đủ công suất.

### Ba contactor
| Contactor | Vai trò |
|---|---|
| KM1 | Nguồn chính (đóng suốt quá trình) |
| KM2 | Nối sao (đầu cuộn dây chụm lại) |
| KM3 | Nối tam giác |

**KM2 và KM3 không bao giờ được đóng cùng lúc** — ngắn mạch 3 pha.`,
      },
      {
        title: '3. Trình tự điều khiển',
        body: `1. Start → đóng KM1 + KM2 (sao), bắt đầu TON thời gian sao (ví dụ 4 s).
2. Hết thời gian sao → **nhả KM2**.
3. Chờ **thời gian chết** 50–100 ms (TON thứ hai) để hồ quang trên tiếp điểm KM2 tắt hẳn.
4. Đóng KM3 (tam giác). Động cơ chạy bình thường.

Chuyển tam giác **quá sớm** (tốc độ còn thấp) → dòng tăng vọt gần như khởi động trực tiếp. Chờ **quá lâu** khi cả hai nhả → động cơ chậm lại, cũng gây dòng lớn. Chạy sao quá lâu (> 15 s) → quá tải.

Hãy quan sát **đồ thị** dưới mô hình 3D: so sánh đỉnh dòng điện khi chạy đúng và khi thử đóng thẳng tam giác.`,
      },
      {
        title: '4. Công tắc áp suất và tín hiệu analog',
        body: `- **PS** (công tắc áp suất): = 1 khi áp thấp (≤ 6 bar), tự ngắt về 0 khi đủ 8 bar. Máy nén tự chạy/dừng theo PS khi đang ở chế độ Auto.
- **P_Raw (%IW64)**: cảm biến áp suất 0..10 bar ↔ giá trị số 0..27648.
- **I_Raw (%IW66)**: biến dòng 0..200 A ↔ 0..27648.

Công thức đổi đơn vị: giá trị thực = Raw × Max / 27648. Ví dụ P_Raw = 22118 → 22118 × 10 / 27648 ≈ 8,0 bar. (Lệnh NORM_X / SCALE_X sẽ học kỹ ở Phần 3.)`,
      },
    ],
    quiz: [
      { q: 'Khởi động sao giảm dòng khởi động còn khoảng bao nhiêu so với khởi động trực tiếp?', options: ['1/2', '1/3', '1/√3', 'Không đổi'], answer: 1, explain: 'Điện áp pha giảm √3 lần và cách nối đổi → dòng dây giảm 3 lần.' },
      { q: 'Timer nào phù hợp để đếm thời gian chạy sao 4 s?', options: ['TON', 'TOF', 'TP'], answer: 0, explain: 'TON: Q lên 1 sau khi IN = 1 liên tục đủ PT.' },
      { q: 'Vì sao cần thời gian chết giữa KM2 nhả và KM3 đóng?', options: ['Để động cơ quay nhanh hơn', 'Để hồ quang trên KM2 tắt, tránh ngắn mạch', 'Không cần thiết'], answer: 1, explain: 'Tiếp điểm vừa mở vẫn còn hồ quang vài chục ms.' },
    ],
  },

  L04: {
    durationMin: 35,
    outcomes: [
      { code: 'L04.1', text: 'Sử dụng bộ đếm CTU, CTD, CTUD với instance DB; đọc .Q và .CV; reset bộ đếm.' },
      { code: 'L04.2', text: 'Dùng lệnh so sánh (CMP) và MOVE để hiển thị, ra quyết định theo giá trị số.' },
      { code: 'L04.3', text: 'Nhận biết sườn lên/xuống tín hiệu (P_TRIG, R_TRIG) và vì sao cần dùng khi đếm.' },
      { code: 'L04.4', text: 'Phối hợp 2 băng tải theo cảm biến để đóng gói đủ số lượng.' },
    ],
    sections: [
      {
        title: '1. Bộ đếm IEC',
        body: `| Bộ đếm | Đếm khi | Q = 1 khi |
|---|---|---|
| **CTU** (đếm lên) | sườn lên CU | CV ≥ PV |
| **CTD** (đếm xuống) | sườn lên CD | CV ≤ 0 |
| **CTUD** (lên/xuống) | CU / CD | QU: CV ≥ PV; QD: CV ≤ 0 |

- **CV**: giá trị đếm hiện tại; **PV**: giá trị đặt (ví dụ 12).
- **R** (reset, CTU/CTUD): đưa CV về 0. **LD** (load, CTD): nạp CV = PV.
- Bộ đếm chỉ đếm khi ngõ vào **chuyển từ 0 lên 1** (sườn lên), không đếm liên tục khi tín hiệu giữ mức 1.

Giống timer, mỗi bộ đếm cần một instance DB, ví dụ \`"C_Cans"\`.`,
      },
      {
        title: '2. So sánh và MOVE',
        body: `- **Lệnh so sánh** (dạng tiếp điểm): \`==\`, \`<>\`, \`>\`, \`>=\`, \`<\`, \`<=\` — dẫn điện khi phép so sánh đúng. Ví dụ: \`"C_Cans".CV >= 12\`.
- **MOVE**: khi EN = 1, chép giá trị IN sang OUT1. Ví dụ: MOVE \`"C_Cans".CV\` → \`"Display"\` (%QW80) để bảng LED hiển thị số lon.

Kiểu dữ liệu phải phù hợp: CV là **Int** (16 bit), Display là **Int** tại %QW80.`,
      },
      {
        title: '3. Sườn tín hiệu',
        body: `Nhiều yêu cầu cần phản ứng **một lần** khi tín hiệu thay đổi, không phải suốt thời gian tín hiệu = 1:

- \`-|P|-\` (sườn lên): dẫn điện **đúng một chu kỳ quét** khi toán hạng chuyển 0 → 1. Cần một bit nhớ riêng để so sánh với chu kỳ trước.
- \`-|N|-\` (sườn xuống): khi chuyển 1 → 0.
- **R_TRIG / F_TRIG**: dạng khối, có instance.

Ví dụ trong bài: sau khi thùng đầy chạy đi, cảm biến B2 về 0, rồi lên 1 khi thùng rỗng mới tới → dùng **sườn lên B2** để biết "thùng mới đã vào vị trí".`,
      },
      {
        title: '4. Ứng dụng: đóng 12 lon/thùng',
        body: `1. Có thùng đúng vị trí (B2 = 1) → chạy băng tải lon M1.
2. Mỗi lon rơi qua máng làm B1 tạo một xung → CTU đếm.
3. CV = 12 (Q = 1) → **dừng M1 ngay**, bật đèn H_Full, chạy băng tải thùng M2.
4. Thùng đầy rời đi (B2 = 0), thùng rỗng tới (B2 = 1) → dừng M2, **reset bộ đếm**, chạy lại M1.

Lỗi hay gặp: quên dừng M1 → lon rơi khi không có thùng; reset bộ đếm sai lúc → thùng thiếu/thừa lon.`,
      },
    ],
    quiz: [
      { q: 'CTU tăng CV khi nào?', options: ['Mỗi chu kỳ quét khi CU = 1', 'Khi CU chuyển từ 0 lên 1', 'Khi R = 1'], answer: 1, explain: 'Bộ đếm IEC đếm theo sườn lên của CU.' },
      { q: 'Muốn hiển thị số đếm lên %QW80, dùng lệnh nào?', options: ['MOVE', 'CMP', 'TON'], answer: 0, explain: 'MOVE chép CV sang Display.' },
      { q: 'Lệnh "-|P|-" dẫn điện trong bao lâu?', options: ['Suốt khi toán hạng = 1', 'Đúng một chu kỳ quét', '1 giây'], answer: 1, explain: 'Tiếp điểm sườn lên chỉ dẫn điện một chu kỳ quét.' },
    ],
  },

  /* ======================= PHẦN 2 — XI LANH ======================= */
  L06: {
    durationMin: 25,
    outcomes: [
      { code: 'L06.1', text: 'Lập trình trình tự nhiều trạm theo bước (step) bằng CASE hoặc bit nhớ bước.' },
      { code: 'L06.2', text: 'Điều khiển chuyển động gián đoạn bằng động cơ + cam vị trí, bắt sườn để dừng đúng nấc.' },
      { code: 'L06.3', text: 'Khóa liên động: không quay bàn khi chốt hoặc xi lanh chưa về.' },
      { code: 'L06.4', text: 'Dùng thanh ghi dịch 1 bit để mang kết quả kiểm tra sang trạm sau.' },
    ],
    sections: [
      { title: '1. Bàn xoay chia vị trí (indexing table)', body: `Bàn xoay đưa phôi lần lượt qua nhiều trạm gia công. Mỗi lần quay đúng 1 nấc (90°), sau đó **chốt định vị** khóa bàn lại để các trạm làm việc chính xác. Vị trí chia được báo bằng **cam + cảm biến IdxPos**.

Trình tự mỗi nấc: chốt vào → các trạm làm việc (nạp, ép, kiểm tra, gạt) → tất cả xi lanh về → rút chốt → quay tới khi IdxPos chuyển 0 → 1.` },
      { title: '2. Lập trình theo bước', body: `Mỗi bước có **hành động** (đầu ra nào bật) và **điều kiện chuyển** (cảm biến nào báo xong). Dùng biến \`"Step"\` kiểu Int và lệnh CASE (SCL) hoặc các bit nhớ bước + Set/Reset (LAD).

Nên tách: phần **chuyển bước** và phần **xuất đầu ra theo bước** — dễ đọc, dễ tìm lỗi.` },
      { title: '3. Thanh ghi dịch', body: `Kết quả kiểm tra đo ở trạm 2, nhưng phôi được gạt ở trạm 3 sau một nấc quay. Phải **nhớ** kết quả và **dịch** theo bàn: sau mỗi nấc, \`Good3 := Good2\`. Đây là ý tưởng của thanh ghi dịch (shift register) dùng rất nhiều trong băng tải phân loại.` },
    ],
  },
  L07: {
    durationMin: 20,
    outcomes: [
      { code: 'L07.1', text: 'Đọc ký hiệu van 5/2 đơn cuộn, xi lanh tác dụng kép, cảm biến hành trình (reed).' },
      { code: 'L07.2', text: 'Lập trình trình tự 2 xi lanh có điều kiện cảm biến.' },
      { code: 'L07.3', text: 'Giải thích vai trò xi lanh kẹp giữ chồng phôi trong bộ cấp phôi.' },
    ],
    sections: [
      { title: '1. Xi lanh và van khí nén', body: `- **Xi lanh tác dụng kép**: khí vào buồng sau → cần đi ra; vào buồng trước → cần lùi.
- **Van 5/2 đơn cuộn**: cuộn có điện → xi lanh ra; mất điện → lò xo đẩy van về, xi lanh lùi.
- **Cảm biến từ (reed) nB1 / nB2** gắn trên thân xi lanh báo vị trí lùi / ra (đặt tên theo chuẩn ISO 1219: xi lanh 1A, van 1V, cuộn 1Y1, cảm biến 1B1, 1B2).` },
      { title: '2. Bộ cấp phôi từ ổ chứa', body: `Phôi xếp chồng trong ống. Xi lanh 1A đẩy phôi **dưới cùng** ra băng tải. Nếu không giữ, phôi thứ hai bị ma sát kéo theo → kẹt. Vì vậy xi lanh 2A **kẹp giữ** chồng phôi trước khi đẩy, nhả ra sau khi 1A đã lùi để chồng phôi rơi xuống.

Trình tự: 2A+ → 1A+ → 1A− → 2A− → chờ rơi.` },
    ],
  },
  L08: {
    durationMin: 20,
    outcomes: [
      { code: 'L08.1', text: 'Lập trình bộ tách thùng bằng hai chặn so le.' },
      { code: 'L08.2', text: 'Dùng tín hiệu sẵn sàng của máy sau để điều khiển dòng sản phẩm.' },
    ],
    sections: [
      { title: '1. Băng tải tích lũy và tách thùng', body: `Thùng dồn thành hàng trên băng tải con lăn (tích lũy). Máy phía sau chỉ nhận **từng thùng một**. Hai chặn so le: chặn 2 giữ thùng đầu, chặn-kẹp 1 giữ thùng thứ hai. Nhả: kẹp 1 → hạ chặn 2 → thùng đầu đi → nâng chặn 2 → nhả kẹp 1.` },
      { title: '2. Điều kiện nhả thùng', body: `Chỉ nhả khi máy phía sau trống (B5 = 0). Chờ thùng đi qua **hẳn** rồi mới nâng chặn, nếu không chặn nâng trúng đáy thùng.` },
    ],
  },
  L09: {
    durationMin: 30,
    outcomes: [
      { code: 'L09.1', text: 'Theo dõi vị trí sản phẩm trên băng tải bằng bộ đệm vòng (FIFO) và mảng.' },
      { code: 'L09.2', text: 'Ra quyết định gạt theo mã sản phẩm; xử lý làn đầy và mã không đọc được.' },
      { code: 'L09.3', text: 'Điều khiển tốc độ băng tải qua giá trị analog đặt cho biến tần.' },
    ],
    sections: [
      { title: '1. Bài toán phân làn', body: `Đầu đọc mã ở đầu băng cho biết thùng thuộc làn nào, nhưng bàn gạt ở xa phía sau. Trong lúc thùng di chuyển, có thể đã có thùng khác đi vào → **không được** dùng một biến "mã hiện tại" duy nhất.` },
      { title: '2. Bộ đệm vòng (FIFO)', body: `Mỗi thùng vào băng (sườn lên B0) được cấp một số thứ tự, mã lưu vào mảng \`Codes[n MOD 16]\`. Mỗi trạm gạt có con trỏ riêng, tăng khi có thùng tới; trạm sau bỏ qua những thùng đã được gạt ở trạm trước.` },
      { title: '3. Tốc độ băng tải', body: `M1_Speed (%QW80) = 0..27648 tương ứng 0..100 % tốc độ biến tần. Đặt 27648 để chạy định mức.` },
    ],
  },
  L10: {
    durationMin: 30,
    outcomes: [
      { code: 'L10.1', text: 'Lập trình trình tự dài nhiều cơ cấu (≥ 5 xi lanh + chân không).' },
      { code: 'L10.2', text: 'Phân biệt van đơn cuộn và van kép cuộn (bistable); điều khiển bằng xung.' },
      { code: 'L10.3', text: 'Xử lý thử lại khi hút hụt, giám sát thời gian từng bước.' },
    ],
    sections: [
      { title: '1. Máy dựng thùng carton', body: `Tay hút lấy tấm carton phẳng → tay mở bẻ thành hộp → gấp 2 vạt nhỏ đáy → đẩy thùng qua thanh gấp vạt lớn và đầu dán băng keo.` },
      { title: '2. Van kép cuộn', body: `Van 5/2 **kép cuộn** nhớ vị trí cuối cùng: chỉ cần một xung vào 1Y1 (tiến) hoặc 1Y2 (lùi). Mất điện, xi lanh **giữ nguyên** vị trí — phù hợp cơ cấu không được tự lùi khi mất điện. Không bật cả hai cuộn cùng lúc.` },
      { title: '3. Chân không', body: `Ejector tạo chân không khi có khí. Công tắc chân không VacOK báo đã hút được tấm carton. Quá 1 s chưa có VacOK → coi như hút hụt: lùi tay hút và thử lại, đếm số lần thử.` },
    ],
  },
  L11A: {
    durationMin: 20,
    outcomes: [
      { code: 'L11A.1', text: 'Định vị sản phẩm bằng chặn và cảm biến vị trí.' },
      { code: 'L11A.2', text: 'Lập trình thứ tự gấp vạt, giữ nắp và khóa liên động với đai kéo.' },
    ],
    sections: [
      { title: '1. Máy dán thùng', body: `Thùng có hàng vào máy, bị chặn đúng vị trí. Hai tay gấp vạt nhỏ nắp trên, tấm ép giữ nắp, đai kéo hai bên đưa thùng qua thanh gấp vạt lớn và đầu dán băng keo.` },
      { title: '2. Khóa liên động', body: `Đai kéo không được chạy khi tay gấp chưa rút (thùng bị kẹt). Tấm ép phải hạ trước khi thùng tới thanh gấp vạt lớn, nếu không vạt nhỏ bật lên.` },
    ],
  },
  L11B: {
    durationMin: 20,
    outcomes: [
      { code: 'L11B.1', text: 'Điều khiển xi lanh không cần với van 5/3 tâm kín (dừng giữa hành trình).' },
      { code: 'L11B.2', text: 'Khóa liên động trục X – trục Z trong tay gắp.' },
      { code: 'L11B.3', text: 'Đồng bộ tay gắp với băng tải khay theo cảm biến bước.' },
    ],
    sections: [
      { title: '1. Van 5/3 tâm kín', body: `Van 5/3 có 3 vị trí: hai cuộn điều khiển hai chiều, **cả hai cuộn tắt** → van về giữa, khóa khí hai buồng → xi lanh dừng tại chỗ. Dùng cho trục cần dừng giữa hành trình hoặc khi mất điện.` },
      { title: '2. Trình tự gắp–đặt', body: `Z xuống → hút → Z lên → X sang → chờ ô trống → Z xuống → nhả + thổi → Z lên → X về. **Không bao giờ di chuyển X khi Z chưa lên hết.**` },
    ],
  },
  L18P: {
    durationMin: 30,
    outcomes: [
      { code: 'L18P.1', text: 'Thiết kế trình tự cho máy kết hợp xi lanh và bàn nâng động cơ.' },
      { code: 'L18P.2', text: 'Đếm hàng/lớp, quản lý chu kỳ pallet.' },
      { code: 'L18P.3', text: 'Phân tích và tránh va chạm giữa bàn nâng và tấm đỡ lớp.' },
    ],
    sections: [
      { title: '1. Máy xếp pallet', body: `Gom 2 thùng thành hàng → đẩy lên tấm đỡ → đủ 2 hàng thành lớp 2×2 → nâng pallet tới mức nhận lớp → mở tấm đỡ thả lớp → hạ bàn một lớp → đóng tấm đỡ. Đủ 3 lớp: hạ bàn xuống đáy, đưa pallet ra.` },
      { title: '2. Phân tích va chạm', body: `Trước khi viết chương trình, hãy liệt kê mọi cặp cơ cấu có thể va nhau (bàn nâng ↔ tấm đỡ, đẩy hàng ↔ tấm đỡ đang mở…) và điều kiện an toàn cho từng chuyển động.` },
    ],
  },
};

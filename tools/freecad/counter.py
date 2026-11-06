"""P1 counter - product belt (white, X 0..1500, top Z=800) dropping cans through a chute into a
carton on a cross box conveyor (green, along +Y, top Z=450, centre X=1600). Photo-eyes B3 (infeed),
B1 (count, end of belt), B2 (box in position); 4-digit LED display on a column; H_Full beacon (Lab L04)."""
from lib import *

TOP1, TOP2 = 800.0, 450.0
L1 = 1500.0
BX = 1600.0                    # box conveyor centre line (X)
BOX = (200.0, 300.0, 200.0)    # carton X x Y x Z (300 along the box-conveyor travel)
CAN = (66.0, 120.0)
B2Y = 150.0                    # B2 beam Y: box leading edge stops here -> box centred at Y=0
DROP = V(BX, 0, TOP2 + BOX[2] + 25)


def rotz(parts, ang, dx=0.0, dy=0.0):
    out = []
    for s, c in parts:
        s2 = s.copy()
        s2.rotate(V(0, 0, 0), V(0, 0, 1), ang)
        s2.translate(V(dx, dy, 0))
        out.append((s2, c))
    return out


def build(doc):
    m = Machine('counter', 'Băng tải đếm sản phẩm vào thùng', accent='#6A3FA0')
    m.previewEye = (-0.75, -1.3, 0.8)
    m.previewZoom = 0.74
    m.focusFC = [[-100, -900, 0], [2350, 800, 1900]]
    m.st(floor_plate(-300, 2450, -1000, 850))
    # ------------------------------------------------------------------ product belt (white)
    b1 = belt_conveyor(0, L1, 200, TOP1, 0, 'belt_w', motor_side=-1, motor_end='in', leg_inset=140,
                       guides=(CAN[0] + 24, 70))
    m.st(b1['static'])
    m.node('belt_1', V(L1 / 2, 0, TOP1), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, b1['belt'])
    fy1 = b1['frame_y']
    # ------------------------------------------------------------------ box belt (green) along +Y
    b2 = belt_conveyor(-800, 750, 260, TOP2, 0, 'belt_g', motor_side=1, motor_end='out', leg_inset=120,
                       guides=(BOX[0] + 30, 70), frame_h=70)
    m.st(rotz(b2['static'], 90, BX, 0))
    m.node('belt_2', V(BX, 0, TOP2), {'type': 'belt', 'uvAxisFC': [0, 1, 0]}, rotz(b2['belt'], 90, BX, 0))
    fy2 = b2['frame_y']
    # end stop plate at the outfeed of the box belt
    m.st([(box(BX - 140, 760, TOP2 - 30, BX + 140, 772, TOP2 + 90, ch=2), 'accent')])
    # ------------------------------------------------------------------ chute (inclined trough)
    p0 = V(L1 - 5, 0, TOP1 - 4)
    p1 = V(BX + 5, 0, DROP.z + 10)
    d = p1 - p0
    cpl = frame_pl(p0, d, V(0, 0, 1))          # local x along the chute, z up (normal to the floor of trough)
    Lc = d.Length + 60
    cw = CAN[0] + 30
    chute = [lbox(cpl, -10, -cw / 2, -4, Lc, cw / 2, 0, 'inox'),
             lbox(cpl, -10, -cw / 2 - 3, -4, Lc, -cw / 2, 90, 'inox', ch=0.8),
             lbox(cpl, -10, cw / 2, -4, Lc, cw / 2 + 3, 90, 'inox', ch=0.8)]
    chute = [(s, c) for s, c in chute]
    m.st([(s, c) for s, c in chute])
    for s_ in (-1, 1):                          # chute hangers from the belt frame
        a = V(L1 - 30, s_ * (fy1 + 15), TOP1 - 40)
        b = cpl.multVec(V(Lc * 0.55, s_ * (cw / 2 + 3), 60))
        m.st([(cyl(6, a, V(b.x, a.y, a.z)), 'inox'), (cyl(6, V(b.x, a.y, a.z), V(b.x, a.y, b.z)), 'inox'),
              (cyl(6, V(b.x, a.y, b.z), b), 'inox')])
    # ------------------------------------------------------------------ photo-eyes
    zf = b1['roller_z'] - 40
    for tag, x in (('B3', 150.0), ('B1', L1 - 60)):
        y0 = -(fy1 + 45)
        pe, led = photo_eye(V(x, y0, TOP1 + CAN[1] / 2), V(0, 1, 0), post_to_z=zf, reflector_at=2 * (fy1 + 45))
        m.st(pe)
        m.st(bar(V(x, y0 - 38, zf), V(x, -fy1 - 6, zf), 24, 6))
        m.st(bar(V(x, -y0 + 20, zf), V(x, fy1 + 6, zf), 24, 6))
        m.sensor(tag, led)
    # B2: beam along -X across the box belt at Y = B2Y, Z = box mid height
    zf2 = b2['roller_z'] - 40
    xe = BX + fy2 + 45
    pe, led = photo_eye(V(xe, B2Y, TOP2 + 100), V(-1, 0, 0), post_to_z=zf2, reflector_at=2 * (fy2 + 45))
    m.st(pe)
    m.st(bar(V(xe + 38, B2Y, zf2), V(BX + fy2 + 6, B2Y, zf2), 24, 6))
    m.st(bar(V(BX - fy2 - 65, B2Y, zf2), V(BX - fy2 - 6, B2Y, zf2), 24, 6))
    m.sensor('B2', led)
    # ------------------------------------------------------------------ LED display on a column
    dx, dy, dz = 750.0, 430.0, 1650.0
    W, H, T = 640.0, 230.0, 90.0
    m.st(profile(V(dx, dy + T / 2 + 30, 0), V(dx, dy + T / 2 + 30, dz + 40), 80, 80, wdir=V(1, 0, 0)))
    m.st([(box(dx - 150, dy - 100, 0, dx + 150, dy + 200, 12, ch=3), 'base'),
          (box(dx - 60, dy + T / 2, dz - 60, dx + 60, dy + T / 2 + 70, dz + 40, ch=3), 'inox')])
    m.st([(box(dx - W / 2, dy - T / 2, dz - H / 2, dx + W / 2, dy + T / 2, dz + H / 2, ch=6), 'black')])
    fpl = face_pl(V(dx, dy - T / 2, dz), V(0, -1, 0))
    FW, FH = W - 50, H - 70
    m.st([lbox(fpl, -W / 2 + 10, -H / 2 + 10, 0, W / 2 - 10, H / 2 - 10, 1.0, 'accent', ch=0.5)])
    disp = [lbox(fpl, -FW / 2, -FH / 2 - 15, 1.0, FW / 2, FH / 2 - 15, 3.0, 'lcd')]
    dh = 120.0
    for i in range(4):
        disp += seg7_digit(fpl, -FW / 2 + 45 + i * 130, -FH / 2 - 15 + (FH - dh) / 2, dh, 3.0)
    m.node('display', lp(fpl, 0, -15, 3.0), {'type': 'static', 'role': 'display', 'tag': 'Display', 'digits': 4,
                                             'faceNormalFC': [0, -1, 0], 'faceSizeMM': [FW, FH],
                                             'uAxisFC': [1, 0, 0], 'vAxisFC': [0, 0, 1],
                                             'faceMaterial': 'lcd', 'segmentMaterial': 'seg'}, disp)
    m.st(text(fpl, 'COUNT', -W / 2 + 30, H / 2 - 32, 14, 'white', 0.3, align='l', z=1.0))
    m.st(text(fpl, 'BK-AutoLab', W / 2 - 30 - 110, H / 2 - 32, 14, 'white', 0.3, align='l', z=1.0))
    # H_Full beacon on top of the display
    bxp = V(dx + W / 2 - 70, dy, dz + H / 2)
    m.st([(cyl(42, bxp, bxp + V(0, 0, 22), ch=3), 'black')])
    m.node('out_H_Full', bxp + V(0, 0, 70), {'type': 'output', 'tag': 'H_Full', 'color': LAMP_HEX['amber']},
           [(cyl(36, bxp + V(0, 0, 22), bxp + V(0, 0, 110), ch=14), 'lens_amber')])
    m.st([(cyl(30, bxp + V(0, 0, 110), bxp + V(0, 0, 118), ch=3), 'black')])
    # ------------------------------------------------------------------ operator box (right)
    cb, lamps = control_box(V(2150, -250, 950), V(0, -1, 0), post_from_z=0)
    m.st(cb)
    for c, parts in lamps.items():
        m.st(parts)
    # cable duct along the product belt
    m.st(duct(V(150, fy1 + 40, b1['roller_z'] - 140), V(L1 - 150, fy1 + 40, b1['roller_z'] - 140), 40, 50))
    m.refs = {'belt1TopZ': TOP1, 'belt1X': [0, L1], 'belt1Width': 200, 'guideClear': CAN[0] + 24,
              'can': list(CAN), 'productSpawnFC': [60, 0, TOP1], 'chuteTopFC': [p0.x, 0, p0.z],
              'chuteDropFC': [DROP.x, DROP.y, DROP.z], 'chuteAngleDeg': round(math.degrees(math.atan2(-d.z, d.x)), 1),
              'belt2TopZ': TOP2, 'belt2Y': [-800, 750], 'belt2X': BX, 'box': list(BOX),
              'boxSpawnFC': [BX, -650, TOP2], 'boxAtChuteFC': [BX, 0, TOP2], 'boxStopFaceY': 766,
              'sensorX': {'B3': 150, 'B1': L1 - 60}, 'b2BeamY': B2Y, 'displayFaceFC': [dx, dy - T / 2 - 3, dz - 15]}
    return m.export(doc)

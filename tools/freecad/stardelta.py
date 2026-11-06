"""P1 stardelta - piston air compressor on a horizontal 500 L tank, star-delta started (Lab L03).
Tank 1600 x Ø600 along X, motor + V-twin compressor on a saddle plate, V-belt drive, pressure gauge
(needle_P), pressure switch (PS). Right: floor cabinet 600 x 800 with KM1/KM2/KM3, F1 and an
ammeter on the door (needle_A)."""
from lib import *

TL, TR = 1600.0, 300.0
TZ = 430.0                       # tank axis height
TX0 = 50.0                       # tank left end
PZ = TZ + TR + 20                # saddle plate top
MOT = V(520, -380, PZ + 165)     # motor pulley centre (front face)
FLY = V(1080, -380, PZ + 160)    # compressor flywheel centre
RP, RF = 58.0, 190.0


def tank():
    p = []
    a, b = TX0 + 140, TX0 + TL - 140
    p.append((cyl(TR, V(a, 0, TZ), V(b, 0, TZ)), 'tank'))
    for x, d in ((a, -1), (b, 1)):
        h = Part.makeSphere(TR, V(0, 0, 0), V(d, 0, 0), 0, 90, 360)
        mtx = App.Matrix(); mtx.scale(140.0 / TR, 1, 1)
        h = h.transformGeometry(mtx)
        h.translate(V(x, 0, TZ))
        p.append((h, 'tank'))
        p.append((cyl(TR + 3, V(x - 6, 0, TZ), V(x + 6, 0, TZ)), 'tank'))     # weld seam ring
    # feet (pressed steel saddles) + rubber pads
    for x in (TX0 + 260, TX0 + TL - 260):
        for s in (-1, 1):
            p.append((box(x - 45, s * 170 - 30, 0, x + 45, s * 170 + 30, 12, ch=2), 'black'))
            p.append((box(x - 35, s * 170 - 20, 12, x + 35, s * 170 + 20, TZ - TR * 0.55, ch=3), 'tank'))
    # saddle plate for motor + compressor
    p.append((box(260, -330, PZ - 20, 1400, 330, PZ, ch=3), 'base'))
    for x in (330, 1330):
        p.append((box(x - 30, -200, TZ + TR - 40, x + 30, 200, PZ - 20, ch=2), 'base'))
    # drain valve + safety valve + nameplate
    p.append((cyl(14, V(TX0 + TL / 2, 0, TZ - TR + 5), V(TX0 + TL / 2, 0, TZ - TR - 40)), 'copper'))
    p.append((box(TX0 + TL / 2 - 25, -6, TZ - TR - 55, TX0 + TL / 2 + 25, 6, TZ - TR - 45, ch=1), 'red'))
    npl = face_pl(V(0, -TR - 2, 0), V(0, -1, 0))
    p.append(lbox(npl, 250, TZ - 75, -6, 430, TZ + 25, 0, 'inox', ch=1))
    p += text(npl, '500 L  10 bar', 340, TZ - 15, 18, 'black', 0.3)
    p += text(npl, 'BK-AutoLab', 340, TZ - 50, 14, 'black', 0.3)
    return p


def motor_unit(m):
    st = []
    y0, y1 = MOT.y + 70, MOT.y + 420          # motor body along +Y
    c = V(MOT.x, 0, MOT.z)
    R = 125.0
    st.append((cyl(R, V(c.x, y0, c.z), V(c.x, y1, c.z), ch=6), 'motor'))
    for i in range(13):                        # cooling fins (radial ribs on top half)
        a = math.radians(-60 + i * 20)
        rib = box(-4, y0 + 20, R - 4, 4, y1 - 20, R + 14).rotated(V(0, 0, 0), V(0, 1, 0), math.degrees(a))
        st.append((rib.translated(c), 'motor'))
    st.append((cyl(R - 10, V(c.x, y0 - 18, c.z), V(c.x, y0, c.z), ch=4), 'motor'))      # front shield
    st.append((cyl(20, V(c.x, MOT.y + 10, c.z), V(c.x, y0 - 18, c.z)), 'nickel'))       # shaft
    st.append((box(c.x - 150, y0 + 10, PZ, c.x - 105, y1 - 30, PZ + 18, ch=2), 'motor'))
    st.append((box(c.x + 105, y0 + 10, PZ, c.x + 150, y1 - 30, PZ + 18, ch=2), 'motor'))
    st.append((box(c.x - 110, y0 + 30, PZ + 10, c.x + 110, y1 - 50, c.z - 60, ch=4), 'motor'))
    st.append((box(c.x - 70, y0 + 100, c.z + R - 5, c.x + 70, y0 + 230, c.z + R + 85, ch=6), 'motor'))  # terminal box
    st.append((cyl(14, V(c.x - 70, y0 + 165, c.z + R + 40), V(c.x - 95, y0 + 165, c.z + R + 40)), 'black'))
    npl = face_pl(V(0, y0 + 100, 0), V(0, -1, 0))
    st.append(lbox(npl, c.x - 50, c.z + R + 10, -0.1, c.x + 50, c.z + R + 70, 0.6, 'inox'))
    st += text(npl, '7.5 kW  Y/D', c.x, c.z + R + 35, 11, 'black', 0.3, z=0.6)
    # open fan cage at the back so the fan blades (part of `pulley`) are visible
    yf0, yf1 = y1, y1 + 110
    for yy in (yf0 + 4, yf0 + 50, yf1 - 4):
        st.append((cyl(R, V(c.x, yy - 4, c.z), V(c.x, yy + 4, c.z)).cut(cyl(R - 10, V(c.x, yy - 10, c.z), V(c.x, yy + 10, c.z))), 'black'))
    for k in range(8):
        a = 2 * math.pi * k / 8
        p = V(c.x + (R - 5) * math.cos(a), 0, c.z + (R - 5) * math.sin(a))
        st.append((cyl(4, V(p.x, yf0, p.z), V(p.x, yf1, p.z)), 'black'))
    st.append((cyl(R, V(c.x, yf1, c.z), V(c.x, yf1 + 6, c.z)).cut(
        cyl(R - 30, V(c.x, yf1 - 1, c.z), V(c.x, yf1 + 8, c.z))), 'black'))
    for k in range(4):
        b = box(-3, yf1, -R + 15, 3, yf1 + 6, R - 15).rotated(V(0, 0, 0), V(0, 1, 0), 45 * k)
        st.append((b.translated(V(c.x, 0, c.z)), 'black'))
    m.st(st)
    # rotating node: pulley (2-groove) + shaft key + fan blades
    pul = []
    pul.append((cyl(RP, V(c.x, MOT.y - 12, c.z), V(c.x, MOT.y + 32, c.z), ch=3), 'iron'))
    for yy in (MOT.y - 2, MOT.y + 14):
        pul.append((cyl(RP + 1, V(c.x, yy, c.z), V(c.x, yy + 8, c.z)).cut(cyl(RP - 9, V(c.x, yy - 1, c.z), V(c.x, yy + 9, c.z))), 'black'))
    for k in range(4):
        a = math.radians(45 + 90 * k)
        pul.append((cyl(9, V(c.x + 34 * math.cos(a), MOT.y - 13, c.z + 34 * math.sin(a)),
                        V(c.x + 34 * math.cos(a), MOT.y - 12, c.z + 34 * math.sin(a))), 'black'))
    pul.append((box(c.x - 5, MOT.y - 14, c.z + 14, c.x + 5, MOT.y - 12, c.z + 50), 'warn'))   # paint mark
    pul.append((cyl(30, V(c.x, y1 + 30, c.z), V(c.x, y1 + 60, c.z)), 'black'))
    for k in range(7):
        b = box(-12, y1 + 28, 25, 12, y1 + 62, R - 14).rotated(V(0, 0, 0), V(0, 1, 0), 360.0 * k / 7)
        pul.append((b.translated(V(c.x, 0, c.z)), 'accent'))
    m.node('pulley', MOT, {'type': 'rotate', 'axisFC': [0, 1, 0], 'travel': 360, 'continuous': True}, pul)


def compressor(m):
    st = []
    cx, cz = FLY.x, FLY.z
    st.append((box(cx - 170, -130, PZ, cx + 170, 140, cz + 70, ch=12), 'accent'))      # crankcase
    st.append((box(cx - 190, -150, PZ, cx + 190, 160, PZ + 20, ch=4), 'accent'))
    st.append((cyl(14, V(cx + 120, -131, PZ + 60), V(cx + 120, -136, PZ + 60)), 'glass'))   # oil glass
    st.append((cyl(42, V(cx, -130, cz), V(cx, FLY.y + 30, cz), ch=3), 'accent'))      # bearing housing
    for ang in (-40, 40):                                   # V-twin cylinders
        a = math.radians(ang)
        d = V(math.sin(a), 0, math.cos(a))
        base = V(cx, 0, cz) + d * 60
        st.append((cyl(62, base, base + d * 200), 'iron'))
        for i in range(7):
            q = base + d * (40 + i * 22)
            st.append((cyl(84, q, q + d * 6), 'iron'))
        top = base + d * 200
        hd = box(-95, -95, 0, 95, 95, 70, ch=8)
        hd.Placement = frame_pl(top, V(math.cos(a), 0, -math.sin(a)), d)
        st.append((hd, 'iron'))
        for i in range(3):
            fin = box(-100, -100, 0, 100, 100, 6)
            fin.Placement = frame_pl(top + d * (12 + i * 18), V(math.cos(a), 0, -math.sin(a)), d)
            st.append((fin, 'iron'))
        f = top + d * 70 + V(math.cos(a), 0, -math.sin(a)) * 0
        st.append((cyl(18, f, f + d * 40), 'nickel'))
        st.append((cyl(65, f + d * 40, f + d * 110, ch=8), 'black'))                   # air filter
    # discharge pipe (copper) to the tank: head -> down the back -> tank top
    pts = [V(cx + 200, 60, cz + 210), V(cx + 290, 60, cz + 210), V(cx + 290, 60, PZ + 40),
           V(1480, 60, PZ + 40), V(1480, 60, TZ + TR - 20)]
    for i in range(len(pts) - 1):
        st.append((cyl(11, pts[i], pts[i + 1]), 'copper'))
        st.append((Part.makeSphere(13, pts[i + 1]), 'copper'))
    st.append((ngon(22, V(1480, 60, PZ + 10), V(1480, 60, PZ + 70), 6), 'copper'))  # check valve
    m.st(st)
    # flywheel (optional extra node, follows pulley)
    fw = [(cyl(RF, V(cx, FLY.y - 30, cz), V(cx, FLY.y + 30, cz), ch=4).cut(
        cyl(RF - 30, V(cx, FLY.y - 40, cz), V(cx, FLY.y + 40, cz))), 'iron'),
          (cyl(45, V(cx, FLY.y - 32, cz), V(cx, FLY.y + 32, cz), ch=3), 'iron')]
    for yy in (FLY.y - 15, FLY.y + 3):
        fw.append((cyl(RF + 1, V(cx, yy, cz), V(cx, yy + 10, cz)).cut(cyl(RF - 10, V(cx, yy - 1, cz), V(cx, yy + 11, cz))), 'black'))
    for k in range(5):
        a = 72.0 * k
        sp = box(-12, FLY.y - 10, 40, 12, FLY.y + 10, RF - 25).rotated(V(0, 0, 0), V(0, 1, 0), a)
        fw.append((sp.translated(V(cx, 0, cz)), 'iron'))
    fw.append((box(-10, FLY.y - 32, RF - 28, 10, FLY.y - 30, RF - 2).translated(V(cx, 0, cz)), 'warn'))
    m.node('flywheel', FLY, {'type': 'rotate', 'axisFC': [0, 1, 0], 'travel': 360, 'continuous': True,
                             'follow': 'pulley', 'ratio': round(RP / RF, 4)}, fw)
    # V-belts (two strands each, two grooves)
    _m = math
    dx, dz = FLY.x - MOT.x, FLY.z - MOT.z
    L = _m.hypot(dx, dz); ang = _m.atan2(dz, dx)
    beta = _m.asin((RF - RP) / L)
    for yy in (FLY.y + 2, FLY.y + 18):
        for sgn in (1, -1):
            nrm = ang + sgn * (_m.pi / 2 + beta)
            p0 = V(MOT.x + (RP - 4) * _m.cos(nrm), yy, MOT.z + (RP - 4) * _m.sin(nrm))
            p1 = V(FLY.x + (RF - 4) * _m.cos(nrm), yy, FLY.z + (RF - 4) * _m.sin(nrm))
            m.st([(cyl(6, p0, p1), 'black')])
    # belt guard (back half only so the drive stays visible from the front)
    m.st(warn_label(V(800, -331, PZ - 10), V(0, -1, 0), 50))


def gauges(m):
    # riser + manifold on the tank top (right end)
    x, y = 1500.0, -200.0
    zb = TZ + TR - 60
    st = [(cyl(14, V(x, y + 140, zb), V(x, y + 140, PZ + 180)), 'nickel'),
          (box(x - 40, y + 100, PZ + 180, x + 40, y + 180, PZ + 230, ch=4), 'nickel'),
          (cyl(10, V(x, y + 100, PZ + 205), V(x, y + 40, PZ + 205)), 'nickel')]
    m.st(st)
    gpl = face_pl(V(x, y + 40, PZ + 205), V(0, -1, 0))
    g, needle, piv, ax = gauge(gpl, 0, 0, R=55, sweep=-270, zero_deg=225, depth=34,
                               zones=[(0.0, 0.6, 'green'), (0.6, 0.8, 'amber'), (0.8, 1.0, 'red')], label='bar')
    m.st(g)
    for i in range(0, 11, 2):
        a = math.radians(225 - 27 * i)
        m.st(text(gpl, str(i), 55 * 0.55 * math.cos(a), 55 * 0.55 * math.sin(a) - 3, 7, 'black', 0.3, z=34))
    m.node('needle_P', piv, {'type': 'rotate', 'axisFC': [round(v, 4) for v in ax], 'travel': -270,
                             'zeroDeg': 225, 'range': [0, 10], 'unit': 'bar'}, needle)
    # pressure switch (PS) on the manifold top + transmitter
    ps = [(box(x - 55, y + 95, PZ + 230, x + 55, y + 185, PZ + 330, ch=6), 'ctr'),
          (box(x - 20, y + 80, PZ + 300, x + 20, y + 95, PZ + 320, ch=2), 'red'),       # on/off lever
          (cyl(10, V(x + 55, y + 140, PZ + 260), V(x + 80, y + 140, PZ + 260)), 'black')]
    m.st(ps)
    m.sensor('PS', V(x - 35, y + 94, PZ + 316))
    m.st([(cyl(13, V(x + 40, y + 140, PZ + 205), V(x + 120, y + 140, PZ + 205)), 'inox'),
          (cyl(9, V(x + 120, y + 140, PZ + 205), V(x + 145, y + 140, PZ + 205)), 'black')])   # P transmitter
    # safety valve (brass)
    m.st([(cyl(10, V(x - 40, y + 140, PZ + 230), V(x - 40, y + 140, PZ + 275)), 'copper'),
          (cyl(16, V(x - 40, y + 140, PZ + 275), V(x - 40, y + 140, PZ + 300), ch=3), 'copper'),
          (Part.makeSphere(7, V(x - 40, y + 140, PZ + 308)), 'copper')])
    return piv


def cabinet_unit(m):
    cx, yb = 2250.0, 260.0
    plinth = 100.0
    m.st([(box(cx - 300, yb - 250, 0, cx + 300, yb, plinth, ch=3), 'black')])
    cab = cabinet(V(cx, yb, plinth), V(0, -1, 0), 600, 800, 250, window=(60, 380, 540, 770), hinge='left')
    m.st(cab['static'])
    m.node('glass_cabinet', cab['glass'][0][0].BoundBox.Center, {}, cab['glass'])
    pp = cab['pl_plate']
    for y in (260, 70, -120, -290):
        m.st(din_rail(pp, -250, 250, y))
    for y0 in (155, -35, -215):
        m.st([lbox(pp, -250, y0, 0, 250, y0 + 40, 45, 'duct'), lbox(pp, -252, y0 - 2, 45, 252, y0 + 42, 49, 'duct', ch=1)])
    m.st(mcb(pp, -200, 260, 3))
    m.st(text(pp, 'Q1', -200, 312, 10, 'black', 0.3))
    m.st(mcb(pp, -135, 260, 1))
    m.st(psu(pp, -75, 260, w=55))
    m.st(s7_1200(pp, 40, 260))
    m.st(terminals(pp, 110, 20, 260))
    for i, (tag, lab) in enumerate((('KM1', 'KM1 LINE'), ('KM2', 'KM2 STAR'), ('KM3', 'KM3 DELTA'))):
        x = -170 + i * 85
        st, ind, o = contactor(pp, x, 70, w=55)
        m.st(st)
        m.st(text(pp, tag, x, 115, 7, 'black', 0.3, z=7.5 + 89))
        m.st(text(pp, lab.split()[1], x, 22, 8, 'black', 0.3, z=7.5))
        m.node('out_' + tag, o, {'type': 'output', 'tag': tag, 'color': '#43a047'}, ind)
    m.st(terminals(pp, 90, 22, 70))
    ol, led = overload(pp, -170, -120, w=55)
    m.st(ol)
    m.sensor('F1', led)
    m.st(text(pp, 'F1', -170, -168, 10, 'black', 0.3))
    st, ind, o = contactor(pp, -85, -120, w=45)       # timer relay look-alike (decor)
    m.st(st); m.st([(ind[0][0], 'amber')])
    m.st(text(pp, 'KT', -85, -165, 10, 'black', 0.3))
    m.st(terminals(pp, -30, 40, -120))
    m.st(terminals(pp, -230, 70, -290, cols=('valve', 'valve', 'btnblue', 'warn')))
    # door lower part: ammeter (96 x 96), lamps, main switch
    dp = cab['pl_door']
    ax0, ay0 = -150.0, -200.0
    m.st([lbox(dp, ax0 - 48, ay0 - 48, 0, ax0 + 48, ay0 + 48, 12, 'black', ch=2),
          lbox(dp, ax0 - 42, ay0 - 42, 12, ax0 + 42, ay0 + 42, 12.5, 'white')])
    g, needle, piv, axd = gauge(dp, ax0, ay0 - 30, R=62, sweep=-90, zero_deg=135, depth=12.5, case=None,
                                zones=[(0.75, 1.0, 'red')], ticks=5)
    m.st(g)
    m.st(text(dp, 'A', ax0, ay0 + 5, 10, 'black', 0.3, z=12.5))
    for i, v in enumerate((0, 50, 100, 150, 200)):
        a = math.radians(135 - 22.5 * i)
        m.st(text(dp, str(v), ax0 + 50 * math.cos(a), ay0 - 30 + 50 * math.sin(a) - 1, 5, 'black', 0.3, z=12.5))
    m.st([lbox(dp, ax0 - 42, ay0 - 42, 13, ax0 + 42, ay0 + 42, 14, 'glass')])
    m.node('needle_A', piv, {'type': 'rotate', 'axisFC': [round(v, 4) for v in axd], 'travel': -90,
                             'zeroDeg': 135, 'range': [0, 200], 'unit': 'A'}, needle)
    for i, (c, lab) in enumerate((('green', 'RUN'), ('amber', 'STAR'), ('red', 'TRIP'))):
        x = -10 + i * 70
        st, lens, o = pilot_lamp(dp, x, -170, c)
        m.st(st + lens)
        m.st(label_plate(dp, x, -205, lab, w=50))
    # main isolator (red handle on yellow plate)
    m.st([lbox(dp, 150, -330, 0, 240, -240, 1.5, 'warn', ch=1), lcyl(dp, 30, 195, -285, 1.5, 12, 'black'),
          lbox(dp.multiply(App.Placement(V(195, -285, 0), App.Rotation(V(0, 0, 1), 0))), -9, -38, 12, 9, 38, 30, 'red', ch=3)])
    m.st(warn_label(lp(dp, -150, -310, 0.5), V(0, -1, 0), 55))
    m.st(text(dp, 'Y / D  STARTER', 20, -330, 16, 'black', 0.4))
    # conduit cabinet -> motor terminal box (along the floor)
    yc = MOT.y + 70 + 165
    pts = [V(cx - 200, yb - 125, plinth), V(cx - 200, yb - 125, 30), V(cx - 200, 390, 30),
           V(MOT.x - 120, 390, 30), V(MOT.x - 120, 390, MOT.z + 165), V(MOT.x - 120, yc, MOT.z + 165)]
    for i in range(len(pts) - 1):
        m.st([(cyl(13, pts[i], pts[i + 1]), 'black'), (Part.makeSphere(13, pts[i + 1]), 'black')])
    m.st([(cyl(13, V(MOT.x - 120, yc, MOT.z + 165), V(MOT.x - 95, yc, MOT.z + 165)), 'black')])
    return cab


def build(doc):
    m = Machine('stardelta', 'Máy nén khí – khởi động sao/tam giác', accent='#1C6E8C')
    m.previewEye = (-0.8, -1.3, 0.75)
    m.previewZoom = 0.72
    m.quality['static_tank'] = (2.0, 0.2)
    m.st(floor_plate(-250, 2700, -800, 500))
    m.st(tank())
    motor_unit(m)
    compressor(m)
    gp = gauges(m)
    cabinet_unit(m)
    m.refs = {'tankAxisFC': [[TX0, 0, TZ], [TX0 + TL, 0, TZ]], 'tankRadius': TR, 'motorAxisFC': [MOT.x, MOT.y, MOT.z],
              'flywheelAxisFC': [FLY.x, FLY.y, FLY.z], 'beltRatio': round(RP / RF, 4),
              'gaugeP_FC': [round(v, 1) for v in gp], 'psOn_bar': 6, 'psOff_bar': 8}
    return m.export(doc)

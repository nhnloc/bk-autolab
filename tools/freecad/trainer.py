"""P1 trainer - PLC training bench (Lab L01): sloped aluminium panel 800 x 500 at 15 deg on a desk
(top Z=750) with S7-1200 + 24 V PSU on DIN rail, pushbuttons S1/S2/S3, selector SW1, pilot lamps H1..H4,
buzzer BUZ; sensor demo module on the right: M18 inductive sensor over a slide with `target_metal`,
through-beam photo-eye with a drop-in `blocker` flag."""
from lib import *

DESK = 750.0
TILT = 15.0
PW, PH = 800.0, 500.0
PY0, PZ0 = -120.0, DESK + 45.0        # panel front face, bottom edge
C, S = math.cos(math.radians(TILT)), math.sin(math.radians(TILT))
N = V(0, -C, S)                       # panel outward normal
INTO = [0, round(C, 4), round(-S, 4)]


def build(doc):
    m = Machine('trainer', 'Bàn thực hành PLC S7-1200', accent='#1C4F8F')
    m.previewEye = (-0.55, -1.35, 0.85)
    m.previewZoom = 0.72
    m.focusFC = [[-60, -380, 720], [1260, 380, 1300]]
    pl = face_pl(V(0, PY0, PZ0), N)
    # ------------------------------------------------------------------ desk
    m.st(table_frame(-80, 1280, -380, 380, DESK, top='wood', top_t=30, shelf=True, legw=40, rail_h=60))
    m.st(floor_plate(-300, 1500, -700, 600))
    # ------------------------------------------------------------------ panel + stand
    m.st([(prism([(0, 0), (PW, 0), (PW, PH), (0, PH)], -6, pl), 'alu')])
    for x0, x1 in ((-14, 0), (PW, PW + 14)):           # side cheeks (accent), bevelled
        m.st([lbox(pl, x0, -20, -60, x1, PH + 10, 4, 'accent', ch=2)])
    m.st([lbox(pl, -14, -30, -60, PW + 14, 0, 8, 'accent', ch=2)])       # bottom lip
    for x in (30, PW - 30):                                                # rear struts + feet
        top = lp(pl, x, PH - 40, -50)
        m.st(profile(lp(pl, x, 0, -50), top, 30, 30, wdir=V(1, 0, 0)))
        m.st(profile(V(x, top.y + 15, DESK + 15), V(x, top.y + 15, top.z - 15), 30, 30))
        m.st([(box(x - 30, PY0 - 40, DESK, x + 30, top.y + 45, DESK + 15, ch=2), 'black')])
    m.st([(box(-10, PY0 - 40, DESK, PW + 10, PY0 + 10, DESK + 45, ch=3), 'accent')])   # front foot rail
    # header strip
    m.st([lbox(pl, 0, PH - 46, 0, PW, PH, 1.0, 'accent')])
    m.st(text(pl, 'BK-AutoLab', 20, PH - 32, 18, 'white', 0.4, align='l', z=1.0))
    m.st(text(pl, 'PLC TRAINER  S7-1200', PW - 20 - 230, PH - 30, 14, 'white', 0.4, align='l', z=1.0))
    # ------------------------------------------------------------------ DIN rail, PLC, PSU, ducts
    yr = 355
    m.st(din_rail(pl, 20, PW - 20, yr))
    for y0, y1 in ((yr + 60, yr + 85), (yr - 92, yr - 62)):
        m.st([lbox(pl, 20, y0, 0, PW - 20, y1, 34, 'duct'), lbox(pl, 18, y0 - 2, 34, PW - 18, y1 + 2, 38, 'duct', ch=1)])
    m.st(s7_1200(pl, 105, yr))
    m.st(psu(pl, 205, yr))
    m.st(mcb(pl, 260, yr, 2, col='white'))
    m.st(terminals(pl, 300, 24, yr, cols=('valve', 'valve', 'btnblue', 'red')))
    # field I/O jacks (decor): inputs / outputs strips on the right
    for i in range(8):
        xj = 486 + i * 38
        for y, col, s in ((235, 'green', 'I0.%d' % i), (180, 'red', 'Q0.%d' % i)):
            m.st([lcyl(pl, 6.5, xj, y, 0, 2, 'nickel'), lcyl(pl, 5, xj, y, 2, 9, col, ch=1),
                  lcyl(pl, 2.0, xj, y, 9, 9.3, 'black')])
            m.st(text(pl, s, xj, y - 20, 6.5, 'black', 0.3))
    m.st(text(pl, 'INPUTS  %I0.0 - %I0.7', 470, 252, 7.5, 'black', 0.3, align='l'))
    m.st(text(pl, 'OUTPUTS  %Q0.0 - %Q0.7', 470, 197, 7.5, 'black', 0.3, align='l'))
    m.st([lbox(pl, 462, 140, 0, 790, 268, 0.6, 'cabinet')])
    for i, (s, col) in enumerate((('+24V', 'red'), ('0V', 'btnblue'), ('M', 'black'))):
        xj = 500 + i * 60
        m.st([lcyl(pl, 6.5, xj, 95, 0, 2, 'nickel'), lcyl(pl, 5, xj, 95, 2, 9, col, ch=1)])
        m.st(text(pl, s, xj, 74, 7, 'black', 0.3))
    # ------------------------------------------------------------------ lamps + buzzer
    yl = 215
    m.st([lbox(pl, 30, yl - 72, 0, 445, yl + 42, 0.6, 'white')])
    m.st(text(pl, 'INDICATORS', 40, yl + 28, 7.5, 'black', 0.3, align='l'))
    for i, (tag, colr) in enumerate((('H1', 'red'), ('H2', 'yellow'), ('H3', 'green'), ('H4', 'blue'))):
        x = 75 + i * 80
        st, lens, o = pilot_lamp(pl, x, yl, colr)
        m.st(st)
        m.node('out_' + tag, o, {'type': 'output', 'tag': tag, 'color': LAMP_HEX[colr]}, lens)
        m.st(label_plate(pl, x, yl - 45, '%s  Q0.%d' % (tag, 2 + i), w=58))
    st, ring, o = buzzer(pl, 395, yl)
    m.st(st)
    m.node('out_BUZ', o, {'type': 'output', 'tag': 'BUZ', 'color': '#e53935'}, ring)
    m.st(label_plate(pl, 395, yl - 45, 'BUZ Q0.6', w=58))
    # ------------------------------------------------------------------ buttons + selector
    yb = 85
    m.st([lbox(pl, 30, yb - 70, 0, 445, yb + 42, 0.6, 'white')])
    m.st(text(pl, 'OPERATOR', 40, yb + 28, 7.5, 'black', 0.3, align='l'))
    btn_pos = {}
    for i, (bid, colr, lab) in enumerate((('S1', 'green', 'S1  I0.5'), ('S2', 'green', 'S2  I0.6'),
                                          ('S3', 'red', 'S3 NC I0.7'))):
        x = 75 + i * 80
        st, cap, o, ax = pushbutton(pl, x, yb, colr)
        m.st(st)
        m.node('btn_' + bid, o, {'type': 'translate', 'axisFC': INTO, 'travel': 4, 'button': bid,
                                 'kind': 'momentary'}, cap)
        m.st(label_plate(pl, x, yb - 45, lab, w=62))
        btn_pos[bid] = [round(v, 1) for v in o]
    st, knob, piv, ax = selector(pl, 335, yb, rest_deg=45)
    m.st(st)
    m.node('btn_SW1', piv, {'type': 'rotate', 'axisFC': INTO, 'travel': 90, 'button': 'SW1', 'kind': 'selector'}, knob)
    m.st(text(pl, '0', 335 - 26, yb + 18, 7, 'black', 0.3))
    m.st(text(pl, '1', 335 + 26, yb + 18, 7, 'black', 0.3))
    m.st(label_plate(pl, 335, yb - 45, 'SW1  I1.0', w=62))
    btn_pos['SW1'] = [round(v, 1) for v in piv]
    # ------------------------------------------------------------------ sensor module (right)
    bx0, bx1, by0, by1 = 860, 1230, -300, 160
    zt = DESK + 20
    m.st([(box(bx0, by0, DESK, bx1, by1, zt, ch=3), 'alu')])
    m.st([(box(bx0 + 4, by0 - 1, DESK + 4, bx1 - 4, by0, zt - 4), 'accent')])
    fp = face_pl(V(0, by0 - 1, 0), V(0, -1, 0))
    m.st(text(fp, 'SENSORS', bx0 + 40, DESK + 6.5, 8, 'white', 0.3, align='l'))
    # -- inductive: slide rail along X at Y=-180, sensor at X=1120 looking down
    ys, xs = -180.0, 1120.0
    m.st([(box(bx0 + 20, ys - 12, zt, bx1 - 20, ys + 12, zt + 14, ch=1.5), 'inox')])
    for xe in (bx0 + 14, bx1 - 26):
        m.st([(box(xe, ys - 18, zt, xe + 12, ys + 18, zt + 26, ch=1.5), 'black')])
    zc = zt + 14
    rest_x = xs - 120
    tm = [(box(rest_x - 30, ys - 22, zc, rest_x + 30, ys + 22, zc + 12, ch=2), 'black'),
          (box(rest_x - 18, ys - 18, zc + 12, rest_x + 18, ys + 18, zc + 18, ch=1), 'nickel'),
          (cyl(7, V(rest_x - 30, ys, zc + 8), V(rest_x - 44, ys, zc + 8), ch=1.5), 'red')]
    m.node('target_metal', V(rest_x, ys, zc + 18), {'type': 'translate', 'axisFC': [1, 0, 0], 'travel': 120}, tm)
    zf = zc + 18 + 8                   # sensing face 8 mm above the metal
    pr, led = prox_m18(V(xs, ys, zf), V(0, 0, -1), length=80)
    m.st(pr)
    m.sensor('PRX', led)
    pyp = ys - 60                      # post in front of the rail
    m.st(profile(V(xs, pyp, zt), V(xs, pyp, zf + 70), 30, 30))
    m.st([(box(xs - 22, pyp - 8, zf + 30, xs + 22, ys + 14, zf + 36, ch=1), 'inox')])
    for zz in (zf + 22, zf + 42):
        m.st([(ngon(15, V(xs, ys, zz), V(xs, ys, zz + 6), 6), 'nickel')])
    m.st([(box(xs - 22, pyp - 22, zt, xs + 22, pyp + 22, zt + 6, ch=1), 'black')])
    lpl = face_pl(V(0, pyp - 15, 0), V(0, -1, 0))
    m.st(label_plate(lpl, xs, zf + 85, 'PRX I1.1', w=54))
    # -- through-beam: along X at Y=+60, Z beam = zt + 70
    yb2, zbm = 60.0, zt + 70
    for xe, dirx, sen in ((bx0 + 40, 1, False), (bx1 - 40, -1, True)):
        parts, led = through_beam(V(xe, yb2, zbm), V(dirx, 0, 0))
        m.st(parts)
        m.st(profile(V(xe - dirx * 55, yb2, zt), V(xe - dirx * 55, yb2, zbm + 25), 30, 30))
        m.st([(box(xe - dirx * 55, yb2 - 12, zbm - 30, xe - dirx * 40, yb2 + 12, zbm + 20, ch=1), 'inox')])
        if sen:
            m.sensor('PE', led)
    xb = (bx0 + bx1) / 2
    flag_bot = zbm + 22                # rest: flag clear above the beam; -60 -> covers it
    bl = [(box(xb - 3, yb2 - 35, flag_bot, xb + 3, yb2 + 35, flag_bot + 70, ch=1), 'warn'),
          (box(xb - 3.5, yb2 - 10, flag_bot + 25, xb + 3.5, yb2 + 10, flag_bot + 45), 'black'),
          (cyl(5, V(xb, yb2, flag_bot + 70), V(xb, yb2, flag_bot + 175)), 'rod'),
          (cyl(13, V(xb, yb2, flag_bot + 175), V(xb, yb2, flag_bot + 195), ch=3), 'red')]
    m.node('blocker', V(xb, yb2, flag_bot + 35), {'type': 'translate', 'axisFC': [0, 0, 1], 'travel': -60}, bl)
    yg = yb2 + 70                      # guide gantry behind
    m.st(profile(V(xb, yg, zt), V(xb, yg, flag_bot + 150), 30, 30))
    m.st([(box(xb - 15, yb2 - 15, flag_bot + 110, xb + 15, yg + 15, flag_bot + 125, ch=1), 'inox'),
          (cyl(10, V(xb, yb2, flag_bot + 104), V(xb, yb2, flag_bot + 131)), 'black')])
    m.st([(box(xb - 22, yg - 22, zt, xb + 22, yg + 22, zt + 6, ch=1), 'black')])
    m.st(label_plate(face_pl(V(0, yb2 - 40, 0), V(0, -1, 0)), bx0 + 75, zt + 120, 'PE I1.2', w=50))
    m.refs = {'deskTopZ': DESK, 'panelTiltDeg': TILT, 'panelNormalFC': [0, round(-C, 4), round(S, 4)],
              'panelOriginFC': [0, PY0, PZ0], 'panelSize': [PW, PH],
              'buttonsFC': btn_pos, 'proxSensorFC': [xs, ys, zf], 'targetRestX': rest_x,
              'beamFC': [[bx0 + 40, yb2, zbm], [bx1 - 40, yb2, zbm]], 'blockerX': xb}
    return m.export(doc)

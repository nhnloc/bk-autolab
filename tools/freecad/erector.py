"""6.4 erector - case erector: blank magazine, suction pick 1A, opening arm 2A, minor-flap folders
3A/4A, case pusher 5A over fixed major-flap plows + bottom taping head, outfeed belt M1."""
from lib import *

TBL = 600.0                 # base table top
BOX = (300.0, 200.0, 200.0)  # erected case L x W x H
BX0, BX1 = 200.0, 500.0     # case X at the erecting position
BY0, BY1 = -100.0, 100.0
ZB = 800.0                  # case bottom (fold line) = outfeed belt top
FLAP = 100.0                # bottom/top flap length (W/2)
PICK_Y = 240.0              # magazine pick face (front blank front face)
CUP_Y = BY0 - 10            # suction cup lips at rest
PUSHER_REST_Y = 850.0       # magazine pusher face at rest (full magazine)


def build(doc):
    m = Machine('erector', 'Máy dựng thùng carton', accent='#1C4F8F')
    m.st(floor_plate(-1000, 2050, -1050, 1600))
    m.st(table_frame(-800, 1150, -700, 1350, TBL, panels="accent"))
    # ------------------------------------------------------------------ magazine (back-left)
    mx0, mx1 = BX0, BX0 + BOX[0] + BOX[1]           # blank width 500 in X
    for x in (mx0 + 50, mx1 - 50):
        m.st([(cyl(10, V(x, 200, ZB - FLAP - 10), V(x, 1240, ZB - FLAP - 10)), 'inox')])
        for y in (260, 700, 1180):
            m.st([(box(x - 15, y - 15, TBL, x + 15, y + 15, ZB - FLAP - 20, ch=1.5), 'alu')])
    for x in (mx0 - 12, mx1 + 12):                  # side guides
        for z in (ZB - 60, ZB + 140):
            m.st([(box(x - 3, 230, z, x + 3, 1240, z + 30, ch=1), 'inox')])
        for y in (300, 760, 1200):
            m.st([(box(x - 4 + (0 if x < 400 else 0), y - 15, TBL, x + 4, y + 15, ZB + 175, ch=1), 'inox')])
    for x in (mx0 - 2, mx1 - 13):                   # pick-face retaining fingers
        for z in (ZB - FLAP + 5, ZB + BOX[2] + FLAP - 25):
            m.st([(box(x, PICK_Y - 12, z, x + 15, PICK_Y, z + 20, ch=1), 'inox')])
    rl = rodless(V(450, PUSHER_REST_Y + 87, 650), V(450, 200, 650), V(0, 0, 1), reeds=False)
    m.st(rl['body'])
    for y in (180, PUSHER_REST_Y + 140):
        m.st([(box(420, y - 20, TBL, 480, y + 20, 630, ch=1.5), 'alu')])
    plate = [(box(-220, 0, 0, 220, 12, 380, ch=2), 'inox'), (box(-60, 12, 40, 60, 30, 300, ch=2), 'inox')]
    plate = xf(plate, App.Placement(V(450, PUSHER_REST_Y, ZB - FLAP + 5), App.Rotation(V(1, 0, 0), -10)))
    plate.append((box(430, PUSHER_REST_Y - 60, 691, 470, PUSHER_REST_Y + 40, ZB - FLAP + 10, ch=1.5), 'inox'))
    m.node('magazine_pusher', V(450, PUSHER_REST_Y, ZB - FLAP + 5), {'type': 'translate', 'axisFC': [0, -1, 0], 'travel': 600},
           rl['carriage'] + plate)
    # magazine level sensors (beam across X at the front of the stack)
    for tag, y in (('MagLow', PICK_Y + 90), ('MagEmpty', PICK_Y + 22)):
        pe, led = photo_eye(V(mx0 - 60, y, ZB + 130), V(1, 0, 0), post_to_z=TBL, reflector_at=mx1 - mx0 + 120)
        m.st(pe); m.sensor(tag, led)
    # ------------------------------------------------------------------ 1A suction pick (moves +Y, see CHANGES)
    zc = (ZB + BOX[2] / 2)
    xc = (BX0 + BX1) / 2
    head_y = CUP_Y - 52                       # cup mount plate front
    tool = [(box(xc - 140, head_y - 10, zc - 90, xc + 140, head_y, zc + 90, ch=2), 'alu'),
            (box(xc - 30, head_y - 24, zc - 30, xc + 30, head_y - 10, zc + 30, ch=2), 'inox')]
    for dx in (-80, 80):
        for dz in (-50, 50):
            tool += vcup(V(xc + dx, CUP_Y, zc + dz), V(0, 1, 0), 18)
    for s in (-1, 1):
        tool.append((cyl(10, V(xc + s * 100, head_y - 10, zc), V(xc + s * 100, head_y - 480, zc)), 'rod'))
        tool.append((box(xc + s * 100 - 15, head_y - 496, zc - 15, xc + s * 100 + 15, head_y - 480, zc + 15, ch=2), 'inox'))
    c1 = pcyl(V(xc, head_y - 24 - 14, zc), V(0, 1, 0), 350, bore=40, up=V(0, 0, 1), mount='foot')
    m.cylinder('cyl_1A_rod', c1, [0, 1, 0], 350, tool, b1='1B1', b2='1B2')
    fr = head_y - 38
    m.st([(box(xc - 130, fr - 45, zc - 30, xc + 130, fr - 4, zc + 30, ch=3), 'alu')])
    for s in (-1, 1):
        m.st([(cyl(18, V(xc + s * 100, fr - 47, zc), V(xc + s * 100, fr - 2, zc), ch=2), 'cylcap')])
    zf = zc - c1['a'] / 2 - 22
    for y in (fr - 25, fr - c1['L'] + 25):
        m.st(profile(V(xc, y, TBL), V(xc, y, zf), 80, 40))
        m.st([(box(xc - 60, y - 30, zf - 8, xc + 60, y + 30, zf, ch=1.5), 'alu')])
    # ------------------------------------------------------------------ 2A opening arm (rot Z +90 about the case corner)
    piv = V(BX1, BY0 - 5, 1110)
    arm = [(cyl(10, V(0, 0, 0), V(0, 0, -260)), 'rod'),
           (box(-12, -16, -150, 200, -6, -140, ch=1), 'inox'),
           (box(5, -16, -300, 190, -6, -140, ch=2), 'inox'),
           (box(30, -6, -280, 175, -2, -160, ch=1), 'black')]
    arm = xf(arm, App.Placement(piv, App.Rotation()))
    m.node('arm_2A', piv, {'type': 'rotate', 'axisFC': [0, 0, 1], 'travel': 90}, arm)
    ra, leds = rotary(piv + V(0, 0, 60), V(0, 0, -1), 80, up=V(0, -1, 0))
    m.st(ra)
    m.sensor('2B1', leds[0]); m.sensor('2B2', leds[1])
    m.st(profile(V(BX1 + 60, -260, TBL), V(BX1 + 60, -260, piv.z + 140), 40, 40))
    m.st([(box(BX1 - 50, -280, piv.z + 100, BX1 + 80, -60, piv.z + 112, ch=2), 'inox'),
          (box(BX1 - 50, -100, piv.z + 60, BX1 + 50, -60, piv.z + 112, ch=2), 'inox')])
    # ------------------------------------------------------------------ 3A / 4A minor flap folders (rot about Y)
    def folder(name, x, travel, tags):
        p = V(x, 0, ZB - 10)
        parts = [(cyl(9, V(0, -170, 0), V(0, 60, 0)), 'rod'),
                 (box(-6, -60, -100, 6, 60, 5, ch=2), 'inox'),
                 (box(-8, -50, -95, 8, 50, -70, ch=2), 'black')]
        m.node(name, p, {'type': 'rotate', 'axisFC': [0, 1, 0], 'travel': travel}, xf(parts, App.Placement(p, App.Rotation())))
        ra, leds = rotary(V(x, -170, ZB - 10), V(0, 1, 0), 70, up=V(0, 0, -1))
        m.st(ra)
        m.st([(box(x - 45, -260, TBL, x + 45, -230, ZB - 50, ch=2), 'alu'),
              (box(x - 45, -260, ZB - 52, x + 45, -170 - 56, ZB - 44, ch=1.5), 'inox')])
        m.sensor(tags[0], leds[0]); m.sensor(tags[1], leds[1])
    folder('flap_3A', BX1 + 8, 90, ('3B1', '3B2'))
    folder('flap_4A', BX0 - 8, -90, ('4B1', '4B2'))
    # ------------------------------------------------------------------ 5A case pusher (+X 500)
    pf = BX0 - 10
    tool = [(box(pf - 14, -90, ZB + 20, pf, 90, ZB + 180, ch=2), 'inox'),
            (box(pf - 4, -70, ZB + 40, pf, 70, ZB + 160), 'black')]
    for s in (-1, 1):
        tool.append((cyl(10, V(pf - 14, s * 70, ZB + 100), V(pf - 640, s * 70, ZB + 100)), 'rod'))
    c5 = pcyl(V(pf - 14 - 14, 0, ZB + 100), V(1, 0, 0), 500, bore=32, up=V(0, 0, 1))
    m.cylinder('cyl_5A_rod', c5, [1, 0, 0], 500, tool, b1='5B1', b2='5B2')
    fr5 = pf - 28
    m.st([(box(fr5 - 45, -110, ZB + 70, fr5 - 4, 110, ZB + 130, ch=3), 'alu')])
    for s in (-1, 1):
        m.st([(cyl(18, V(fr5 - 47, s * 70, ZB + 100), V(fr5 - 2, s * 70, ZB + 100), ch=2), 'cylcap')])
    for x in (fr5 - 25, fr5 - c5['L'] + 20):
        m.st(profile(V(x, 0, TBL), V(x, 0, ZB + 100 - c5['a'] / 2), 40, 80, wdir=V(0, 1, 0)))
    # ------------------------------------------------------------------ fixed major-flap plows + taping head
    for s in (-1, 1):
        pts = [V(BX1 + 15, s * 115, ZB - 95), V(BX1 + 130, s * 50, ZB - 12), V(BX1 + 600, s * 50, ZB - 12)]
        for a, b in zip(pts[:-1], pts[1:]):
            m.st([(cyl(8, a, b), 'inox'), (Part.makeSphere(8, b), 'inox')])
        m.st([(box(BX1 + 15, s * 115 - 6, TBL, BX1 + 35, s * 115 + 6, ZB - 95, ch=1), 'inox'),
              (box(BX1 + 580, s * 50 - 6, TBL, BX1 + 600, s * 50 + 6, ZB - 12, ch=1), 'inox')])
    tx = BX1 + 160
    m.st([(box(tx - 20, -32, TBL, tx + 200, 32, ZB - 40, ch=4), 'warn'),
          (box(tx - 30, -36, ZB - 60, tx + 210, 36, ZB - 40, ch=2), 'inox'),
          (cyl(14, V(tx, -30, ZB - 14), V(tx, 30, ZB - 14), ch=2), 'black'),
          (cyl(14, V(tx + 180, -30, ZB - 14), V(tx + 180, 30, ZB - 14), ch=2), 'black'),
          (cyl(75, V(tx + 90, -40, ZB - 170), V(tx + 90, 40, ZB - 170), ch=3), 'tape'),
          (cyl(38, V(tx + 90, -42, ZB - 170), V(tx + 90, 42, ZB - 170)), 'cabinet')])
    pr, led = prox(V(tx + 90, -70, ZB - 170 + 40), V(0, 1, 0), 40)
    m.st(pr); m.sensor('TapeOK', led)
    # ------------------------------------------------------------------ outfeed belt
    bc = belt_conveyor(BX1 + 220, 1850, 260, ZB, 0, 'belt_g', motor_side=-1, legs=False,
                       guides=(BOX[1] + 30, 80), motor_dir=V(0, 0, -1))
    m.st(bc['static'])
    m.node('belt_out', V((BX1 + 220 + 1850) / 2, 0, ZB), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bc['belt'])
    fy = bc['frame_y']
    for x in (BX1 + 300, 1080):
        for s in (-1, 1):
            m.st([(box(x - 20, s * fy - 15, TBL, x + 20, s * fy + 15, ZB - 84), 'alu')])
    for s in (-1, 1):
        m.st(leg(1700, s * fy, ZB - 84))
    m.st(profile(V(1700, -fy + 20, 220), V(1700, fy - 20, 220), 40, 40))
    pe, led = photo_eye(V(1600, -fy - 55, ZB + 90), V(0, 1, 0), post_to_z=ZB - 40, reflector_at=2 * fy + 110)
    m.st(pe); m.sensor('BoxOut', led)
    # ------------------------------------------------------------------ guard
    gx0, gx1, gy0, gy1, gz1 = -800, 1150, -700, 1350, 2000
    st, gl = guard(gx0, gx1, gy0, gy1, TBL, gz1, openings={'right': [(-200, 200, ZB + 300)]},
                   handles=[('front', 360, 1350), ('front', 440, 1350), ('back', 450, 1350)],
                   hinges=[('front', -40, 900), ('front', -40, 1700), ('front', 840, 900), ('front', 840, 1700)])
    m.st(st)
    m.node('glass_guard', V(0, 0, 0), {}, gl)
    # door safety switch (DoorOK) at the front door
    m.st([(box(395, gy0 - 20, 1560, 405, gy0 - 4, 1640, ch=1), 'warn'),
          (box(370, gy0 - 48, 1560, 400, gy0 - 20, 1640, ch=2), 'warn')])
    m.sensor('DoorOK', V(385, gy0 - 49, 1625))
    # ------------------------------------------------------------------ pneumatics / electrics
    m.st([(box(780, 1000, TBL, 1100, 1010, TBL + 300, ch=1), 'inox')])
    m.st(valve_island(V(940, 980, TBL + 40), 7, V(1, 0, 0), V(0, -1, 0)))
    # vacuum ejector + switch
    m.st([(box(800, 940, TBL + 160, 860, 1000, TBL + 210, ch=3), 'valve'),
          (cyl(9, V(830, 940, TBL + 185), V(830, 900, TBL + 185), ch=2), 'black'),
          (box(870, 950, TBL + 160, 905, 1000, TBL + 205, ch=2), 'sensor')])
    m.sensor('VacOK', V(887, 948, TBL + 196))
    m.st(frl(V(1000, 940, TBL + 220), V(0, -1, 0)))
    m.st([(box(1080, 925, TBL + 230, 1110, 960, TBL + 260, ch=2), 'sensor')])
    m.sensor('AirOK', V(1095, 923, TBL + 252))
    m.st(duct(V(-780, 1320, TBL), V(1130, 1320, TBL), 40, 60))
    m.st(warn_label(V(0, gy0 - 4, 900), V(0, -1, 0), 80))
    m.st(warn_label(V(1600, -fy - 16, ZB - 40), V(0, -1, 0), 50))
    cb, lamps = control_box(V(1400, -700, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps, amber='H_Low')
    m.refs = {'caseSize': list(BOX), 'caseAtErect': [[BX0, BY0, ZB], [BX1, BY1, ZB + BOX[2]]],
              'caseAfterPush': [[BX0 + 500, BY0, ZB], [BX1 + 500, BY1, ZB + BOX[2]]],
              'flapLength': FLAP, 'blankFlat': {'x': [mx0, mx1], 'z': [ZB - FLAP, ZB + BOX[2] + FLAP], 'foldX': BX1},
              'magazine': {'pickFaceY': PICK_Y, 'pusherRestY': PUSHER_REST_Y, 'pusherEmptyY': PUSHER_REST_Y - 600,
                           'blankLeanDeg': 10, 'blankBottomZ': ZB - FLAP, 'stackDirFC': [0, 1, 0]},
              'cupFaceRestY': CUP_Y, 'cupFaceExtendedY': CUP_Y + 350,
              'arm2APivot': [BX1, BY0 - 5], 'flap3APivot': [BX1 + 8, 0, ZB - 10], 'flap4APivot': [BX0 - 8, 0, ZB - 10],
              'pusher5AFaceRestX': BX0 - 10, 'tapeHeadX': [BX1 + 160, BX1 + 340], 'beltOutX': [BX1 + 220, 1850],
              'beltTopZ': ZB}
    return m.export(doc)

"""6.5 sealer - case sealer: infeed belt, pop-up stop 1A, minor flap folders 2A/3A, top compression
plate 4A, side drive belts M2, fixed major-flap plows + top taping head (Lab L11)."""
from lib import *

TOP = 800.0
BOX = (300.0, 200.0, 200.0)
STOP_X = 600.0
BX0, BX1 = STOP_X - BOX[0], STOP_X
ZT = TOP + BOX[2]          # case top (flap hinge line) = 1000
FL = 100.0                 # flap length
PIV_Z = ZT + FL + 12       # paddle pivots just above the upright flaps
HEAD_Y = -210.0            # head beam (front)
COL_X = (420.0, 1300.0)
COL_Y = 300.0
BRIDGE_Z = 1500.0


def build(doc):
    m = Machine('sealer', 'Máy dán thùng', accent='#12808A')
    m.st(floor_plate(-450, 2150, -950, 800))
    # ---------------------------------------------------------------- infeed belt + bed
    bi = belt_conveyor(0, 595, 320, TOP, 0, 'belt_g', motor_side=-1, motor_end='in', leg_inset=110,
                       guides=None)
    m.st(bi['static'])
    for s_ in (-1, 1):
        y = s_ * (BOX[1] / 2 + 22)
        m.st([(box(20, y - 3, TOP + 45, 440, y + 3, TOP + 75, ch=1), 'inox')])
        for x in (80, 400):
            yo = s_ * (bi['frame_y'] + 15)
            m.st([(cyl(5, V(x, y, TOP + 60), V(x, yo, TOP + 60)), 'inox'),
                  (cyl(5, V(x, yo, TOP + 60), V(x, yo, TOP - 25)), 'inox'),
                  (box(x - 10, yo - 8, TOP - 45, x + 10, yo + 8, TOP - 20, ch=1.5), 'black')])
    m.node('belt_in', V(300, 0, TOP), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bi['belt'])
    rc = roller_conveyor(615, 1800, 300, TOP, 0, pitch=75, R=25, chain_guard=False, leg_inset=100)
    m.st(rc['static'] + rc['rollers'])
    # ---------------------------------------------------------------- 1A pop-up stop at X=600
    t = 12.0
    rest_top = TOP - 6
    bb = rest_top - 95
    blade = [(box(STOP_X, -70, bb, STOP_X + t, 70, rest_top, ch=1.5), 'inox'),
             (box(STOP_X - 5, -55, rest_top - 28, STOP_X, 55, rest_top - 2, ch=1.2), 'black'),
             (box(STOP_X - 8, -22, bb - 10, STOP_X + 20, 22, bb, ch=1.5), 'inox')]
    c1 = pcyl(V(STOP_X + 6, 0, bb - 24), V(0, 0, 1), 40, bore=32, up=V(0, -1, 0))
    m.cylinder('cyl_1A_rod', c1, [0, 0, 1], 40, blade, b1='1B1', b2='1B2')
    m.st([(box(STOP_X - 50, -180, bb - 24, STOP_X + 60, 180, bb - 14, ch=1).cut(box(STOP_X - 10, -75, bb - 30, STOP_X + 22, 75, bb)), 'inox')])
    for s in (-1, 1):
        m.st([(box(STOP_X - 50, s * 180 - 6, bb - 24, STOP_X + 60, s * 180 + 6, TOP - 40, ch=1), 'inox')])
    # ---------------------------------------------------------------- head frame: 4 columns + bridge
    for x in COL_X:
        for s in (-1, 1):
            m.st(leg(x, s * COL_Y, BRIDGE_Z, w=80, h=40) if False else (foot(x, s * COL_Y) + profile(V(x, s * COL_Y, 60), V(x, s * COL_Y, BRIDGE_Z), 80, 40)))
            m.st(endcap(V(x, s * COL_Y, BRIDGE_Z + 20), V(0, 0, 1), 80, 40))
        m.st(profile(V(x, -COL_Y + 20, BRIDGE_Z), V(x, COL_Y - 20, BRIDGE_Z), 40, 80, wdir=V(0, 0, 1)))
        m.st(profile(V(x, -COL_Y + 20, 300), V(x, COL_Y - 20, 300), 40, 40))
        m.st(profile(V(x, -COL_Y - 20, 1250), V(x, HEAD_Y, 1250), 40, 40) if False else [])
    for s in (-1, 1):
        m.st(profile(V(COL_X[0] + 40, s * COL_Y, BRIDGE_Z - 20), V(COL_X[1] - 40, s * COL_Y, BRIDGE_Z - 20), 80, 40))
    # head beam (front) carrying the flap folders
    m.st(profile(V(COL_X[0] - 20, HEAD_Y, 1290), V(COL_X[1] + 20, HEAD_Y, 1290), 40, 80, wdir=V(0, 0, 1)))
    for x in COL_X:
        m.st(profile(V(x, -COL_Y, 1290), V(x, HEAD_Y - 20, 1290), 40, 40) if False else [])
    # top beam (centre) for compression cylinder + taping head
    m.st(profile(V(COL_X[0] + 20, 0, BRIDGE_Z - 40), V(COL_X[1] - 20, 0, BRIDGE_Z - 40), 40, 80, wdir=V(0, 0, 1)))
    for x in COL_X:
        m.st([(box(x - 30, -COL_Y + 20, BRIDGE_Z - 60, x + 30, COL_Y - 20, BRIDGE_Z - 50, ch=1), 'inox')])
    for x in COL_X:     # head-beam hangers
        m.st(profile(V(x + (40 if x < 800 else -40), HEAD_Y, 1340), V(x + (40 if x < 800 else -40), HEAD_Y, BRIDGE_Z - 20), 40, 40))
    # ---------------------------------------------------------------- flap folders 2A (+90) and 3A (-120)
    def folder(name, x, dirx, travel, tags):
        p = V(x, 0, PIV_Z)
        L = 120.0
        parts = [(cyl(9, V(0, HEAD_Y + 60, 0), V(0, 70, 0)), 'rod'),
                 (box(min(0, dirx * L), -60, -6, max(0, dirx * L), 60, 6, ch=2), 'inox'),
                 (box(min(dirx * 30, dirx * (L - 5)), -50, -10, max(dirx * 30, dirx * (L - 5)), 50, -6, ch=1), 'black'),
                 (box(-14, -66, -14, 14, -54, 14, ch=2), 'inox')]
        m.node(name, p, {'type': 'rotate', 'axisFC': [0, 1, 0], 'travel': travel}, xf(parts, App.Placement(p, App.Rotation())))
        ra, leds = rotary(V(x, HEAD_Y + 60, PIV_Z), V(0, 1, 0), 70, up=V(0, 0, 1))
        m.st(ra)
        m.st([(box(x - 40, HEAD_Y - 20, PIV_Z - 40, x + 40, HEAD_Y + 60 - 56, PIV_Z + 40, ch=2), 'alu'),
              (box(x - 20, HEAD_Y - 20, PIV_Z + 40, x + 20, HEAD_Y + 20, 1250, ch=1), 'alu')])
        m.sensor(tags[0], leds[0]); m.sensor(tags[1], leds[1])
    folder('flap_2A', BX1 - 40, 1, 90, ('2B1', '2B2'))
    folder('flap_3A', BX0 + 40, -1, -120, ('3B1', '3B2'))
    # ---------------------------------------------------------------- 4A compression plate (-Z 80) with rollers
    xc = (BX0 + BX1) / 2
    pb = ZT + 85
    plate = [(box(xc - 90, -60, pb, xc + 90, 60, pb + 12, ch=2), 'inox'),
             (box(xc - 30, -30, pb + 12, xc + 30, 30, pb + 30, ch=2), 'inox')]
    for dx in (-60, 0, 60):
        plate.append((cyl(14, V(xc + dx, -45, pb - 2), V(xc + dx, 45, pb - 2)), 'black'))
    for s in (-1, 1):
        plate.append((cyl(8, V(xc, s * 45, pb + 12), V(xc, s * 45, pb + 300)), 'rod'))
    c4 = pcyl(V(xc, 0, pb + 30 + 14), V(0, 0, -1), 80, bore=40, up=V(0, -1, 0))
    m.cylinder('cyl_4A_rod', c4, [0, 0, -1], 80, plate, b1='4B1', b2='4B2')
    m.st([(box(xc - 40, -70, c4['rear'].z, xc + 40, 70, BRIDGE_Z - 80, ch=2), 'alu'),
          (box(xc - 70, -70, pb + 30 + 14 + 4, xc + 70, 70, pb + 30 + 14 + 30, ch=2), 'alu')])
    # ---------------------------------------------------------------- side drive belts (M2)
    for name, s in (('belt_side_L', 1), ('belt_side_R', -1)):
        ya = s * BOX[1] / 2            # inner face
        r = 45.0
        yc = ya + s * (r + 4)
        xa, xb = 470.0, 1450.0
        z0, z1 = TOP + 40, TOP + 150
        bl = [(box(xa, ya, z0, xb, ya + s * 4, z1), 'belt_g'),
              (box(xa, yc + s * r, z0, xb, yc + s * (r + 4), z1), 'belt_g')]
        for x in (xa, xb):
            bl.append((cyl(r + 4, V(x, yc, z0), V(x, yc, z1)), 'belt_g'))
        m.node(name, V((xa + xb) / 2, ya, (z0 + z1) / 2), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bl)
        housing = [(box(xa - 60, yc - 60, z1 + 2, xb + 60, yc + 60, z1 + 10, ch=2), 'inox'),
                   (box(xa - 60, yc - 60, z0 - 10, xb + 60, yc + 60, z0 - 2, ch=2), 'inox'),
                   (box(xa + 60, yc + s * 10, z0, xb - 60, yc + s * 30, z1, ch=2), 'accent')]
        for x in (xa, xb):
            housing.append((cyl(14, V(x, yc, z0 - 20), V(x, yc, z1 + 20)), 'roller'))
        m.st(housing)
        m.st(gearmotor(V(xb, yc, z1 + 10), V(0, 0, -1), V(-1, 0, 0), 0.65))
        # support arms to the columns
        for x in (COL_X[0], COL_X[1] - 60):
            m.st(profile(V(x + 40, s * COL_Y, (z0 + z1) / 2), V(x + 40, yc + s * 62, (z0 + z1) / 2), 40, 40))
    # ---------------------------------------------------------------- major-flap plows + top taping head
    for s in (-1, 1):
        pts = [V(BX1 + 40, s * 100, ZT + 110), V(BX1 + 200, s * 70, ZT + 60), V(BX1 + 330, s * 40, ZT + 10), V(1550, s * 40, ZT + 10)]
        for a, b in zip(pts[:-1], pts[1:]):
            m.st([(cyl(8, a, b), 'inox'), (Part.makeSphere(8, b), 'inox')])
        m.st(profile(V(BX1 + 40, s * 100, ZT + 110), V(BX1 + 40, s * 100, 1290), 30, 30))
    m.st(profile(V(BX1 + 40, -100, 1290), V(BX1 + 40, 100, 1290), 30, 30))
    tx = 1000.0
    m.st([(box(tx - 20, -32, ZT + 40, tx + 210, 32, ZT + 230, ch=4), 'warn'),
          (box(tx - 30, -36, ZT + 30, tx + 220, 36, ZT + 50, ch=2), 'inox'),
          (cyl(14, V(tx, -30, ZT + 14), V(tx, 30, ZT + 14), ch=2), 'black'),
          (cyl(14, V(tx + 190, -30, ZT + 14), V(tx + 190, 30, ZT + 14), ch=2), 'black'),
          (cyl(75, V(tx + 100, -40, ZT + 320), V(tx + 100, 40, ZT + 320), ch=3), 'tape'),
          (cyl(38, V(tx + 100, -42, ZT + 320), V(tx + 100, 42, ZT + 320)), 'cabinet'),
          (box(tx + 80, -12, ZT + 230, tx + 120, 12, BRIDGE_Z - 80, ch=2), 'alu')])
    pr, led = prox(V(tx + 100, -66, ZT + 320 + 40), V(0, 1, 0), 40)
    m.st(pr); m.sensor('TapeOK', led)
    # ---------------------------------------------------------------- photo-eyes
    for tag, x, post in (('BIn', 120, TOP - 40), ('BPos', STOP_X - 150, TOP - 40), ('BOut', 1700, TOP - 40)):
        pe, led = photo_eye(V(x, -230, TOP + 60), V(0, 1, 0), post_to_z=post, reflector_at=460)
        fy = bi['frame_y'] + 15 if x < 600 else rc['frame_y'] + 5
        m.st(pe + bar(V(x, -268, post), V(x, -fy, post), 24, 6) + bar(V(x, 250, post), V(x, fy, post), 24, 6))
        m.sensor(tag, led)
    # ---------------------------------------------------------------- guard (floor-standing cell)
    st, gl = guard(250, 1550, -600, 600, 0, 1800, sides=('front', 'back', 'left', 'right'),
                   openings={'left': [(-200, 200, 1180)], 'right': [(-200, 200, 1180)]},
                   handles=[('front', 860, 1200), ('front', 940, 1200)],
                   hinges=[('front', 300, 600), ('front', 300, 1500), ('front', 1500, 600), ('front', 1500, 1500)])
    m.st(st)
    m.node('glass_guard', V(0, 0, 0), {}, gl)
    for x in (250, 1550):
        m.st(foot(x, -600) + foot(x, 600))
    # ---------------------------------------------------------------- pneumatics / electrics
    m.st([(box(1600, 620, 900, 1950, 630, 1200, ch=1), 'inox')])
    m.st(profile(V(1780, 650, 60), V(1780, 650, 1250), 80, 40))
    m.st(foot(1755, 650) + foot(1805, 650))
    m.st(valve_island(V(1760, 600, 1000), 4, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(1900, 600, 1120), V(0, -1, 0)))
    m.st(duct(V(270, 580, BRIDGE_Z + 40), V(1530, 580, BRIDGE_Z + 40), 40, 40))
    m.st(warn_label(V(900, -604, 300), V(0, -1, 0), 80))
    cb, lamps = control_box(V(1750, -650, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'beltTopZ': TOP, 'beltInX': [0, 595], 'bedX': [615, 1800], 'box': list(BOX), 'flapLength': FL,
              'stopFaceX': STOP_X, 'caseAtStop': [[BX0, -BOX[1] / 2, TOP], [BX1, BOX[1] / 2, ZT]],
              'flap2APivot': [BX1 - 40, 0, PIV_Z], 'flap3APivot': [BX0 + 40, 0, PIV_Z],
              'pressPlateBottomRestZ': ZT + 85 - 16, 'sideBeltsX': [470, 1450], 'tapeHeadX': [1000, 1190],
              'sensorX': {'BIn': 120, 'BPos': STOP_X - 150, 'BOut': 1700}}
    return m.export(doc)

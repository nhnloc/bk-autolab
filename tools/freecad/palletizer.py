"""6.8 palletizer - simple pneumatic layer palletizer: infeed belt + stop 1A, row pusher 2A, layer
plates 3A (L/R), motorised lift M2 with pallet, pallet outfeed rollers M3 (project lab)."""
from lib import *

TOP = 800.0
BOX = (400.0, 300.0, 250.0)
STOP_X = 1400.0
ROW_X = (600.0, 1400.0)
PUSH_FACE = -150.0
PLATE_Y = (500.0, 1100.0)
PLATE_SPLIT = 1000.0
PAL = (1000.0, 800.0, 100.0)     # pallet L x W x H
PAL_C = (1000.0, 800.0)
DECK_TOP = 50.0                  # lift roller top at rest (pallet bottom)
LIFT_TRAVEL = 630.0
COLS = [(430.0, 330.0), (1570.0, 330.0), (430.0, 1270.0), (1570.0, 1270.0)]


def pallet_shape(cx, cy, z0):
    L, W, H = PAL
    p = []
    for i in range(7):                      # top deck boards (along X)
        y = cy - W / 2 + 5 + i * (W - 10 - 100) / 6
        p.append((box(cx - L / 2, y, z0 + H - 22, cx + L / 2, y + 100, z0 + H, ch=1.5), 'wood'))
    for j in (-1, 0, 1):                    # stringer boards + blocks
        y = cy + j * (W / 2 - 50)
        p.append((box(cx - L / 2, y - 50, z0 + H - 44, cx + L / 2, y + 50, z0 + H - 22, ch=1), 'wood'))
        for i in (-1, 0, 1):
            x = cx + i * (L / 2 - 60)
            p.append((box(x - 50, y - 50, z0 + 22, x + 50, y + 50, z0 + H - 44, ch=1.5), 'wood'))
        p.append((box(cx - L / 2, y - 50, z0, cx + L / 2, y + 50, z0 + 22, ch=1), 'wood'))
    return p


def build(doc):
    m = Machine('palletizer', 'Máy xếp pallet khí nén', accent='#1C4F8F')
    m.st(floor_plate(-450, 3350, -1150, 1650))
    # ---------------------------------------------------------------- infeed belt (ends at the stop gap)
    bi = belt_conveyor(0, STOP_X - 5, 360, TOP, 0, 'belt_g', motor_side=-1, motor_end='in', leg_inset=120)
    m.st(bi['static'])
    m.node('belt_in', V((STOP_X - 5) / 2, 0, TOP), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bi['belt'])
    fy = bi['frame_y']
    for s in (-1, 1):
        y = s * (BOX[1] / 2 + 25)
        m.st([(box(20, y - 3, TOP + 60, ROW_X[0] - 30, y + 3, TOP + 95, ch=1), 'inox')])
        for x in (100, 520):
            yo = s * (fy + 15)
            m.st([(cyl(5, V(x, y, TOP + 78), V(x, yo, TOP + 78)), 'inox'),
                  (cyl(5, V(x, yo, TOP + 78), V(x, yo, TOP - 25)), 'inox'),
                  (box(x - 10, yo - 8, TOP - 45, x + 10, yo + 8, TOP - 20, ch=1.5), 'black')])
    m.st([(box(STOP_X + 15, -fy, TOP - 10, 1520, fy, TOP, ch=1), 'inox')])          # end dead plate
    # ---------------------------------------------------------------- 1A stop (pop-up in the gap)
    rest_top = TOP - 6
    bb = rest_top - 95
    blade = [(box(STOP_X, -90, bb, STOP_X + 12, 90, rest_top, ch=1.5), 'inox'),
             (box(STOP_X - 5, -70, rest_top - 30, STOP_X, 70, rest_top - 2, ch=1.2), 'black'),
             (box(STOP_X - 8, -22, bb - 10, STOP_X + 20, 22, bb, ch=1.5), 'inox')]
    c1 = pcyl(V(STOP_X + 6, 0, bb - 24), V(0, 0, 1), 40, bore=32, up=V(0, -1, 0))
    m.cylinder('cyl_1A_rod', c1, [0, 0, 1], 40, blade, b1='1B1', b2='1B2')
    m.st([(box(STOP_X - 50, -fy, bb - 24, STOP_X + 60, fy, bb - 14, ch=1).cut(box(STOP_X - 10, -95, bb - 30, STOP_X + 22, 95, bb)), 'inox')])
    for s in (-1, 1):
        m.st([(box(STOP_X - 50, s * fy - 6, bb - 24, STOP_X + 60, s * fy + 6, TOP - 40, ch=1), 'inox')])
    # ---------------------------------------------------------------- 2A row pusher (+Y 650)
    zc = TOP + 5 + 95
    pb = PUSH_FACE - 6 - 15
    tool = [(box(ROW_X[0] + 5, pb, TOP + 6, ROW_X[1] - 5, pb + 15, TOP + 200, ch=2), 'inox'),
            (box(ROW_X[0] + 20, pb + 15, TOP + 20, ROW_X[1] - 20, PUSH_FACE, TOP + 180, ch=1.5), 'black'),
            (box(980, pb - 16, zc - 30, 1020, pb, zc + 30, ch=2), 'inox')]
    for dx in (-300, 300):
        tool.append((cyl(12, V(1000 + dx, pb, zc), V(1000 + dx, pb - 800, zc)), 'rod'))
        tool.append((box(1000 + dx - 18, pb - 818, zc - 18, 1000 + dx + 18, pb - 800, zc + 18, ch=2), 'inox'))
    c2 = pcyl(V(1000, pb - 16 - 14, zc), V(0, 1, 0), 650, bore=50, up=V(0, 0, 1), mount='foot')
    m.cylinder('cyl_2A_rod', c2, [0, 1, 0], 650, tool, b1='2B1', b2='2B2')
    front = pb - 30
    m.st([(box(650, front - 50, zc - 35, 1350, front - 5, zc + 35, ch=3), 'alu')])
    for dx in (-300, 300):
        m.st([(cyl(22, V(1000 + dx, front - 52, zc), V(1000 + dx, front - 3, zc), ch=2), 'cylcap')])
    zf = zc - c2['a'] / 2 - 22
    for y in (front - 30, front - c2['L'] + 40):
        for x in (940, 1060):
            m.st(leg(x, y, zf - 10))
        m.st([(box(900, y - 30, zf - 10, 1100, y + 30, zf, ch=1.5), 'alu')])
        m.st(profile(V(960, y, 250), V(1040, y, 250), 40, 40))
    for x in (940, 1060):
        m.st(profile(V(x, front - 50, 250), V(x, front - c2['L'] + 60, 250), 40, 40))
    m.st(warn_label(V(1000, front - 51, zc), V(0, -1, 0), 55))
    # transfer dead plate belt -> layer plates
    m.st([(box(ROW_X[0], fy + 16, TOP - 10, ROW_X[1], PLATE_Y[0], TOP, ch=1), 'inox')])
    for x in (ROW_X[0] + 40, ROW_X[1] - 40):
        m.st([(box(x - 20, fy + 40, 300, x + 20, fy + 80, TOP - 10, ch=1), 'alu')])
    # ---------------------------------------------------------------- layer plates 3A (L opens -X, R opens +X)
    t = 10.0
    for name, x0, x1, ax, xs in (('plate_3A_L', ROW_X[0], PLATE_SPLIT, -1, ROW_X[0]), ('plate_3A_R', PLATE_SPLIT, ROW_X[1], 1, ROW_X[1])):
        pl = [(box(x0, PLATE_Y[0] + 2, TOP - t, x1, PLATE_Y[1] - 2, TOP, ch=1.5), 'inox')]
        # drive bracket at the outer end (towards the open direction)
        bx = x0 if ax < 0 else x1
        cy = PLATE_Y[1] + 60 if ax < 0 else PLATE_Y[0] - 60
        pl.append((box(bx - 20 * ax - 20, min(cy, PLATE_Y[1] if ax < 0 else PLATE_Y[0]) - (0 if ax < 0 else 0),
                       TOP - 50, bx - 20 * ax + 20, max(cy, PLATE_Y[1] if ax < 0 else PLATE_Y[0]), TOP - t, ch=1.5), 'inox'))
        meta = {'type': 'translate', 'axisFC': [ax, 0, 0], 'travel': 450}
        # rod tip sits at the bracket (bx - 20*ax); cylinder body extends opposite to ax
        c = pcyl(V(bx - 20 * ax - ax * 14 - ax * 20, cy, TOP - 30), V(ax, 0, 0), 450, bore=32, up=V(0, 0, -1))
        tags = ('3B1', '3B2') if ax < 0 else (None, None)
        m.cylinder(name, c, [ax, 0, 0], 450, pl, b1=tags[0], b2=tags[1])
        m.nodes[name]['origin'] = V((x0 + x1) / 2, (PLATE_Y[0] + PLATE_Y[1]) / 2, TOP)
        rear = c['rear']
        for xx in (rear.x, c['tip'].x - ax * 40):
            m.st([(box(xx - 25, cy - 25, 0, xx + 25, cy + 25, TOP - 30 - c['a'] / 2, ch=1.5), 'alu'),
                  (box(xx - 50, cy - 50, 0, xx + 50, cy + 50, 10, ch=1.5), 'alu')])
    # plate guide rails (both sides), extended so the plates can open
    for y, s in ((PLATE_Y[0], -1), (PLATE_Y[1], 1)):
        m.st([(box(ROW_X[0] - 470, y + s * 2 - (12 if s > 0 else 0), TOP - 26, ROW_X[1] + 470, y + s * 2 + (0 if s > 0 else 12), TOP + 4, ch=1), 'alu')])
    for x in (ROW_X[0] - 450, ROW_X[1] + 450):
        for y in (PLATE_Y[0] - 20, PLATE_Y[1] + 20):
            m.st(leg(x, y, TOP - 26))
    # back wall + side walls of the layer cage
    m.st([(box(ROW_X[0] - 10, PLATE_Y[1], TOP + 6, ROW_X[1] + 10, PLATE_Y[1] + 10, TOP + 330, ch=2), 'inox')])
    for x, s in ((ROW_X[0], -1), (ROW_X[1], 1)):
        m.st([(box(x + (0 if s > 0 else -10), PLATE_Y[0] + 30, TOP + 6, x + (10 if s > 0 else 0), PLATE_Y[1], TOP + 330, ch=2), 'inox')])
        for y in (PLATE_Y[0] + 30, PLATE_Y[1]):
            m.st(profile(V(x + s * 25, y, TOP + 4), V(x + s * 25, y, TOP + 400), 40, 40))
    # ---------------------------------------------------------------- lift (node 'lift') + pallet (child)
    lift = []
    for (x, y) in COLS:
        lift.append((box(x - 50 if x < 1000 else x - 70, y - 40, 10, x + 70 if x < 1000 else x + 50, y + 40, 150, ch=3), 'accent'))
    for y in (COLS[0][1], COLS[2][1]):
        lift += profile(V(COLS[0][0] + 60, y, 40), V(COLS[1][0] - 60, y, 40), 40, 60)
    yl0, yl1 = PAL_C[1] - PAL[1] / 2 - 20, PAL_C[1] + PAL[1] / 2 + 20
    for y in (yl0, yl1):
        lift.append((box(COLS[0][0] + 40, y - 6, 8, COLS[1][0] - 40, y + 6, DECK_TOP + 25, ch=1.5), 'inox'))
    for i in range(11):
        x = 500 + i * 100
        lift.append((cyl(20, V(x, yl0 + 6, DECK_TOP - 20), V(x, yl1 - 6, DECK_TOP - 20)), 'roller'))
    for y in (COLS[0][1] + 40, ):
        pass
    lift.append((box(COLS[0][0] + 40, yl0 - 70, 8, COLS[0][0] + 60, yl1 + 70, 50, ch=1), 'alu'))
    lift.append((box(COLS[1][0] - 60, yl0 - 70, 8, COLS[1][0] - 40, yl1 + 70, 50, ch=1), 'alu'))
    # pallet-present sensor on the lift deck (moves with lift)
    pe, led = photo_eye(V(COLS[1][0] - 120, yl0 - 30, DECK_TOP + 40), V(0, 1, 0), size=0.8, with_post=False)
    lift += pe
    lift.append((box(COLS[1][0] - 150, yl0 - 60, 8, COLS[1][0] - 100, yl0 - 20, DECK_TOP + 20, ch=1), 'inox'))
    m.node('lift', V(PAL_C[0], PAL_C[1], DECK_TOP), {'type': 'translate', 'axisFC': [0, 0, 1], 'travel': LIFT_TRAVEL}, lift)
    m.node('sen_PalletIn', led, {'type': 'sensor', 'parent': 'lift'}, [(led_shape(led), 'led')])
    m.node('pallet', V(PAL_C[0], PAL_C[1], DECK_TOP), {'type': 'translate', 'axisFC': [1, 0, 0], 'travel': 1500, 'parent': 'lift'},
           pallet_shape(PAL_C[0], PAL_C[1], DECK_TOP))
    # lift columns, top frame, motor M2 with chain covers
    for (x, y) in COLS:
        m.st(foot(x - 30, y - 30) + foot(x + 30, y + 30))
        m.st([(box(x - 60, y - 60, 0, x + 60, y + 60, 12, ch=2), 'alu')])
        m.st(profile(V(x, y, 12), V(x, y, 1480), 80, 80))
        m.st(endcap(V(x, y, 1480), V(0, 0, 1), 80, 80))
        m.st([(box(x - 20, y + (-60 if y < 800 else 40), 60, x + 20, y + (-40 if y < 800 else 60), 1440, ch=2), 'black')])   # chain cover
    for y in (COLS[0][1], COLS[2][1]):
        m.st(profile(V(COLS[0][0] + 40, y, 1440), V(COLS[1][0] - 40, y, 1440), 80, 40, wdir=V(0, 0, 1)))
    for x in (COLS[0][0], COLS[1][0]):
        m.st(profile(V(x, COLS[0][1] + 40, 1440), V(x, COLS[2][1] - 40, 1440), 80, 40, wdir=V(0, 0, 1)))
    m.st(gearmotor(V(COLS[0][0], COLS[0][1] + 40, 1440), V(0, 1, 0), V(1, 0, 0), 1.0))
    m.st([(cyl(8, V(COLS[0][0], COLS[0][1] + 40, 1440), V(COLS[2][0], COLS[2][1] - 40, 1440)), 'nickel')])
    # lift limit switches on the front-right column
    x, y = COLS[1]
    for tag, z in (('LiftBottom', 120), ('LiftTop', 120 + LIFT_TRAVEL)):
        pr, led = prox(V(x - 75, y - 45, z), V(0, 0, -1), 40, bracket=False)
        m.st(pr + [(box(x - 90, y - 60, z + 15, x - 40, y - 30, z + 20, ch=1), 'inox')])
        m.sensor(tag, led)
    # layer level photo-eye under the plates (beam +X at Y = pallet centre)
    pe, led = photo_eye(V(330, PAL_C[1], TOP - 15), V(1, 0, 0), post_to_z=0, reflector_at=1340)
    m.st(pe); m.sensor('LayerLvl', led)
    # ---------------------------------------------------------------- pallet outfeed rollers (M3)
    ox0, ox1 = 1640.0, 3150.0
    for y in (yl0, yl1):
        m.st([(box(ox0, y - 6, 0, ox1, y + 6, DECK_TOP + 25, ch=1.5), 'inox')])
    rr = []
    for i in range(int((ox1 - ox0 - 60) // 100) + 1):
        xx = ox0 + 40 + i * 100
        rr.append((cyl(20, V(xx, yl0 + 6, DECK_TOP - 20), V(xx, yl1 - 6, DECK_TOP - 20)), 'roller'))
    m.st(rr)
    m.st([(box(ox0 + 20, yl1 + 6, 5, ox1 - 20, yl1 + 40, 60, ch=3), 'accent')])
    m.st(gearmotor(V(ox1 - 60, yl1 + 40, 35), V(0, -1, 0), V(-1, 0, 0), 0.6))
    pe, led = photo_eye(V(ox1 - 80, yl0 - 60, DECK_TOP + 60), V(0, 1, 0), post_to_z=0, reflector_at=PAL[1] + 160)
    m.st(pe); m.sensor('PalletOut', led)
    # ---------------------------------------------------------------- photo-eyes on the infeed
    pe, led = photo_eye(V(150, -fy - 50, TOP + 100), V(0, 1, 0), post_to_z=TOP - 40, reflector_at=2 * fy + 100)
    m.st(pe + bar(V(150, -fy - 88, TOP - 40), V(150, -fy - 16, TOP - 40), 24, 6)
         + bar(V(150, fy + 70, TOP - 40), V(150, fy + 16, TOP - 40), 24, 6))
    m.sensor('BIn', led)
    # RowFull: down-looking sensor on an overhead arm above the 2nd box position
    m.st(profile(V(520, 260, 0 + 60), V(520, 260, 1260), 40, 40) + foot(520, 260) + endcap(V(520, 260, 1260), V(0, 0, 1)))
    m.st(profile(V(540, 260, 1240), V(740, 260, 1240), 40, 40) + profile(V(740, 280, 1240), V(740, 0, 1240), 40, 40))
    pe, led = photo_eye(V(740, 0, 1150), V(0, 0, -1), up=V(1, 0, 0))
    m.st(pe + [(box(725, -15, 1170, 755, 15, 1220, ch=1), 'inox')])
    m.sensor('RowFull', led)
    # ---------------------------------------------------------------- guard (floor standing)
    st, gl = guard(80, 1920, -420, 1420, 0, 2000,
                   openings={'left': [(-260, 260, 1180)], 'right': [(yl0 - 40, yl1 + 40, 420)],
                             'front': [(650, 1350, 1060)]},
                   handles=[('back', 1000, 1100)], hinges=[('back', 340, 600), ('back', 340, 1500)])
    m.st(st)
    m.node('glass_guard', V(0, 0, 0), {}, gl)
    for x in (80, 1920):
        m.st(foot(x, -420) + foot(x, 1420))
    # pneumatics / electrics
    m.st(profile(V(-200, 700, 60), V(-200, 700, 1300), 80, 40) + foot(-225, 700) + foot(-175, 700))
    m.st([(box(-320, 680, 900, -80, 690, 1220, ch=1), 'inox')])
    m.st(valve_island(V(-200, 660, 950), 3, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(-200, 650, 1130), V(0, -1, 0)))
    m.st(warn_label(V(1300, -424, 1500), V(0, -1, 0), 90))
    cb, lamps = control_box(V(2100, -500, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'beltTopZ': TOP, 'beltInX': [0, STOP_X - 5], 'box': list(BOX), 'stopFaceX': STOP_X,
              'rowX': list(ROW_X), 'pusherFaceRestY': PUSH_FACE, 'pusherTravel': 650,
              'layerPlates': {'topZ': TOP, 'x': list(ROW_X), 'y': list(PLATE_Y), 'splitX': PLATE_SPLIT},
              'backWallY': PLATE_Y[1], 'pallet': list(PAL), 'palletCentre': list(PAL_C),
              'palletTopRestZ': DECK_TOP + PAL[2], 'liftTravel': LIFT_TRAVEL,
              'palletTopAtLiftTopZ': DECK_TOP + PAL[2] + LIFT_TRAVEL, 'palletOutTravel': 1500,
              'palletOutConveyorX': [ox0, ox1], 'layerLvlBeamZ': TOP - 15, 'layersPerPallet': 3}
    return m.export(doc)

"""6.3 diverter - main belt 3000 + 3 front pushers + 3 inclined gravity roller lanes (Lab L09/L13)."""
from lib import *

TOP = 800.0
BW = 400.0                     # main belt width
LANES = (900.0, 1700.0, 2500.0)
LANE_LEN, LANE_W, LANE_DEG = 1200.0, 360.0, 3.0
LANE_Y0 = 250.0                # lane entry (Y)
LANE_Z0 = TOP - 8              # roller top at lane entry
PUSH_FACE = -215.0             # pusher face Y at rest (travel +420)
PLATE = (350.0, 150.0)
BEAM_Z = 1200.0                # overhead sensor bridge


def lane(m, xc):
    rc = roller_conveyor(0, LANE_LEN, LANE_W, 0, 0, pitch=80, R=25, legs=False, chain_guard=False)
    pl = App.Placement(V(xc, LANE_Y0, LANE_Z0), App.Rotation(V(0, 0, 1), 90).multiply(App.Rotation(V(0, 1, 0), LANE_DEG)))
    m.st(xf(rc['static'] + rc['rollers'], pl))
    fy = rc['frame_y']
    # end stop + side guide rails (local coordinates)
    loc = [(box(LANE_LEN - 5, -fy, -30, LANE_LEN + 10, fy, 170, ch=2), 'inox'),
           (box(LANE_LEN - 25, -120, 20, LANE_LEN - 5, 120, 130, ch=3), 'black')]
    for s in (-1, 1):
        loc.append((box(60, s * (fy + 2) - 3, 110, LANE_LEN, s * (fy + 2) + 3, 140, ch=1), 'inox'))
        for x in (150, 600, 1050):
            loc.append((box(x - 12, s * (fy + 2) - 4, 10, x + 12, s * (fy + 2) + 4, 125, ch=1), 'inox'))
    m.st(xf(loc, pl))
    # legs under the lane
    for x in (90, LANE_LEN - 90):
        for s in (-1, 1):
            p = pl.multVec(V(x, s * (fy + 25), -25 - 60))
            m.st(leg(p.x, p.y, p.z))
            m.st(xf([(box(x - 20, s * (fy + 3), -125, x + 20, s * (fy + 45), -85, ch=1), 'alu')], pl))
        a = pl.multVec(V(x, -(fy + 25), -85)); b = pl.multVec(V(x, fy + 25, -85))
        m.st(profile(V(a.x + 20, a.y, 230), V(b.x - 20, b.y, 230), 40, 40))
    return pl, fy


def pusher(m, i, xc):
    n = i + 1
    zc = TOP + 5 + PLATE[1] / 2
    plate_back = PUSH_FACE - 6 - 15
    c = pcyl(V(xc, plate_back - 14, zc), V(0, 1, 0), 420, bore=40, up=V(0, 0, 1), mount='foot')
    front = plate_back - 14
    tool = [(box(xc - PLATE[0] / 2, plate_back, TOP + 5, xc + PLATE[0] / 2, plate_back + 15, TOP + 5 + PLATE[1], ch=2), 'inox'),
            (box(xc - PLATE[0] / 2 + 10, plate_back + 15, TOP + 15, xc + PLATE[0] / 2 - 10, PUSH_FACE, TOP + PLATE[1] - 5, ch=1.5), 'black'),
            (box(xc - 30, plate_back - 14, zc - 30, xc + 30, plate_back, zc + 30, ch=2), 'inox')]
    for s in (-1, 1):
        tool.append((cyl(10, V(xc + s * 120, plate_back, zc), V(xc + s * 120, plate_back - 540, zc)), 'rod'))
        tool.append((box(xc + s * 120 - 16, plate_back - 556, zc - 16, xc + s * 120 + 16, plate_back - 540, zc + 16, ch=2), 'inox'))
    m.cylinder('cyl_%dA_rod' % n, c, [0, 1, 0], 420, tool, b1='%dB1' % n, b2='%dB2' % n)
    # guide bearing block + stand
    m.st([(box(xc - 150, front - 50, zc - 32, xc + 150, front - 5, zc + 32, ch=3), 'alu')])
    for s in (-1, 1):
        m.st([(cyl(18, V(xc + s * 120, front - 52, zc), V(xc + s * 120, front - 3, zc), ch=2), 'cylcap')])
    zf = zc - c['a'] / 2 - 22
    for y in (front - 30, front - c['L'] + 30):
        m.st(leg(xc, y, zf - 10))
        m.st([(box(xc - 60, y - 30, zf - 10, xc + 60, y + 30, zf, ch=1.5), 'alu')])
    m.st(profile(V(xc, front - 30, zf - 30), V(xc, front - c['L'] + 30, zf - 30), 40, 40))
    m.st(profile(V(xc, front - 30, 250), V(xc, front - c['L'] + 30, 250), 40, 40))
    m.st(warn_label(V(xc, front - 51, zc), V(0, -1, 0), 50))


def down_sensor(m, tag, x, y=0.0, z=BEAM_Z - 40, reader=False):
    p = V(x, y, z - 70)
    if reader:
        parts = [(cbox(x, y, z - 35, 110, 80, 70, ch=4), 'valve'),
                 (cbox(x, y, z - 71, 70, 50, 2), 'black'),
                 (cbox(x - 30, y, z - 72, 8, 30, 1), 'red'),
                 (cbox(x, y, z + 10, 40, 40, 20, ch=2), 'inox')]
        m.st(parts)
        m.sensor(tag, V(x + 40, y - 30, z + 0.5))
        return
    parts, led = photo_eye(V(x, y, z - 30), V(0, 0, -1), up=V(1, 0, 0))
    m.st(parts)
    m.st([(cbox(x - 0, y, z + 6, 30, 30, 22, ch=2), 'inox')])
    m.sensor(tag, led)


def build(doc):
    m = Machine('diverter', 'Hệ phân phối thùng 3 làn', accent='#12808A')
    m.st(floor_plate(-350, 3450, -1050, 1650))
    bc = belt_conveyor(0, 3000, BW, TOP, 0, 'belt_g', motor_side=1, frame_h=90)
    m.st(bc['static'])
    m.node('belt_main', V(1500, 0, TOP), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bc['belt'])
    fy = bc['frame_y']
    lanes = {}
    for i, xc in enumerate(LANES):
        pl, lfy = lane(m, xc)
        lanes[i] = pl
        pusher(m, i, xc)
        # lane-full photo-eye across the lane (beam -X), near the lane entry
        yy = 520.0
        zl = pl.multVec(V(yy - LANE_Y0, 0, 0)).z
        pe, led = photo_eye(V(xc + lfy + 45, yy, zl + 70), V(-1, 0, 0), post_to_z=zl - 20,
                            reflector_at=2 * (lfy + 45))
        m.st(pe)
        m.sensor('L%dF' % (i + 1), led)
        # transfer bridge plate between belt and lane entry
        m.st([(box(xc - LANE_W / 2, fy + 16, TOP - 12, xc + LANE_W / 2, LANE_Y0 + 2, TOP - 6, ch=1), 'inox')])
    # overhead sensor bridge with code reader + down-looking sensors
    for x in (60, 1300, 2100, 2960):
        for s in (-1, 1):
            m.st(leg(x, s * 300, BEAM_Z - 20))
        m.st(profile(V(x, -320, BEAM_Z), V(x, 320, BEAM_Z), 40, 40))
        m.st(profile(V(x, -280, 260), V(x, 280, 260), 40, 40))
    m.st(profile(V(40, 0, BEAM_Z + 20), V(2980, 0, BEAM_Z + 20), 80, 40))
    m.st(endcap(V(40, 0, BEAM_Z + 20), V(-1, 0, 0), 80, 40) + endcap(V(2980, 0, BEAM_Z + 20), V(1, 0, 0), 80, 40))
    m.st(duct(V(60, 40, BEAM_Z + 60), V(2960, 40, BEAM_Z + 60), 40, 40))
    down_sensor(m, 'B0', 120)
    down_sensor(m, 'BC', 300, reader=True)
    for i, xc in enumerate(LANES):
        down_sensor(m, 'B%d' % (i + 1), xc)
    # brand strip on the bridge
    m.st([(box(400, -24, BEAM_Z - 10, 2700, -22, BEAM_Z + 50), 'accent')])
    # pneumatics + operator station
    m.st([(box(1280, -720, 0, 1520, -560, 12, ch=2), 'base')])
    m.st(profile(V(1400, -640, 72), V(1400, -640, 900), 80, 40))
    m.st(foot(1375, -640) + foot(1425, -640))
    m.st([(box(1290, -620, 900, 1510, -612, 1100, ch=1.5), 'inox')])
    m.st(valve_island(V(1400, -650, 930), 3, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(1560, -640, 980), V(0, -1, 0)))
    cb, lamps = control_box(V(3200, -560, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'beltTopZ': TOP, 'beltX': [0, 3000], 'beltWidth': BW, 'laneCentresX': list(LANES),
              'laneEntryY': LANE_Y0, 'laneLength': LANE_LEN, 'laneClearWidth': LANE_W, 'laneSlopeDeg': LANE_DEG,
              'laneEntryTopZ': LANE_Z0, 'laneEndStopY': LANE_Y0 + LANE_LEN - 5,
              'pusherFaceRestY': PUSH_FACE, 'pusherTravel': 420, 'pusherPlate': list(PLATE),
              'readerX': 300, 'box': [300, 200, 200]}
    return m.export(doc)

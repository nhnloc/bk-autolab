"""6.2 escapement - accumulating roller conveyor with two pop-up stops 1A / 2A (Lab L08)."""
from lib import *

TOP = 800.0
W = 330.0          # roller length between side channels
BOX = (300.0, 200.0, 200.0)
X1A, X2A = 1100.0, 1400.0   # stop faces (box fronts stop here)


def stopper(m, name, xface, tags):
    """pop-up stop: blade upstream face at xface, rises +Z 40 between two rollers"""
    t = 12.0
    top_rest = TOP - 6
    blade_bot = top_rest - 95
    blade = [(box(xface, -70, blade_bot, xface + t, 70, top_rest, ch=1.5), 'inox'),
             (box(xface - 6, -55, top_rest - 30, xface, 55, top_rest - 2, ch=1.2), 'black')]   # PU bumper
    tip_x = xface + t / 2
    c = pcyl(V(tip_x, 0, blade_bot - 14 - 10), V(0, 0, 1), 40, bore=32, up=V(0, -1, 0), rod_ext=14)
    clevis = [(box(tip_x - 14, -22, blade_bot - 10, tip_x + 14, 22, blade_bot, ch=1.5), 'inox')]
    m.cylinder(name, c, [0, 0, 1], 40, blade + clevis, b1=tags[0], b2=tags[1])
    # mounting plate across the frame + guide block
    zp = blade_bot - 14 - 10
    fy = W / 2 + 10
    plate = box(tip_x - 60, -fy, zp, tip_x + 60, fy, zp + 10, ch=1).cut(box(tip_x - 10, -75, zp - 1, tip_x + 10, 75, zp + 11))
    m.st([(plate, 'inox')])
    for s in (-1, 1):
        m.st([(box(tip_x - 60, s * fy - (8 if s > 0 else 0), zp, tip_x + 60, s * fy + (0 if s > 0 else 8) , TOP - 25 - 40, ch=1), 'inox')])
        m.st([(box(tip_x - 18, s * 88 - 8, zp + 10, tip_x + 18, s * 88 + 8, zp + 60, ch=2), 'black')])  # guide bushes
    m.st(warn_label(V(tip_x, -fy - 9, zp + 50), V(0, -1, 0), 45))


def build(doc):
    m = Machine('escapement', 'Bộ tách thùng băng tải tích lũy', accent='#1C4F8F')
    m.st(floor_plate(-300, 2500, -760, 620))
    rc = roller_conveyor(0, 2000, W, TOP, 0, pitch=100, R=25, drive_side=-1)
    m.st(rc['static'])
    zc = rc['roller_z']; fy = rc['frame_y']
    m.node('rollers', V(1000, 0, zc), {'type': 'rollers', 'rollerAxisFC': [0, 1, 0], 'rollerRadius': 25,
                                       'rollerX': [50 + 100 * i for i in range(20)],
                                       'zones': {'M1': [0, 1400], 'M2': [1400, 2000]}}, rc['rollers'])
    # drive zones: two gear motors under the conveyor on the back side
    for xm in (700, 1700):
        m.st(gearmotor(V(xm, fy + 30, zc - 70), V(0, -1, 0), V(-1, 0, 0), 0.75))
        m.st([(box(xm - 40, fy + 6, zc - 120, xm + 40, fy + 32, zc - 20, ch=2), 'inox')])
    # side guide rails for the boxes
    for s in (-1, 1):
        y = s * (BOX[1] / 2 + 22)
        m.st([(box(20, y - 3, TOP + 50, 1980, y + 3, TOP + 85, ch=1), 'inox')])
        for x in (120, 520, 920, 1250, 1650, 1880):
            yo = s * (fy + 18)
            m.st([(cyl(6, V(x, y, TOP + 67), V(x, yo, TOP + 67)), 'inox'),
                  (cyl(6, V(x, yo, TOP + 67), V(x, yo, zc - 20)), 'inox'),
                  (box(x - 12, s * (fy + 6), zc - 40, x + 12, s * (fy + 30), zc - 10, ch=2), 'black')])
    stopper(m, 'cyl_1A_rod', X1A - 12, ('1B1', '1B2'))
    stopper(m, 'cyl_2A_rod', X2A, ('2B1', '2B2'))
    # photo-eyes B3 / B4 / B5 (beam across +Y, at box mid-height)
    for tag, x in (('B3', 1250), ('B4', 500), ('B5', 1900)):
        y0 = -(fy + 40)
        pe, led = photo_eye(V(x, y0, TOP + 100), V(0, 1, 0), post_to_z=zc - 30, reflector_at=2 * (fy + 40))
        m.st(pe)
        m.st(bar(V(x, y0 - 38, zc - 30), V(x, -fy - 6, zc - 30), 24, 6))
        m.st(bar(V(x, -y0 + 20, zc - 30), V(x, fy + 6, zc - 30), 24, 6))
        m.sensor(tag, led)
    # pneumatics: FRL + valve island on a bracket under the front channel
    m.st([(box(1000, -fy - 14, zc - 200, 1260, -fy - 8, zc - 40, ch=1.5), 'inox')])
    m.st(valve_island(V(1100, -fy - 40, zc - 190), 2, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(1220, -fy - 45, zc - 130), V(0, -1, 0)))
    m.st(duct(V(0, fy + 60, zc - 140), V(2000, fy + 60, zc - 140), 40, 50))
    cb, lamps = control_box(V(2230, -420, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'rollerTopZ': TOP, 'conveyorX': [0, 2000], 'clearWidth': BOX[1] + 44, 'box': list(BOX),
              'stop1FaceX': X1A - 12, 'stop2FaceX': X2A, 'stopRiseZ': 40,
              'box1CentreAtStop2': [X2A - BOX[0] / 2, 0, TOP + BOX[2] / 2],
              'box2CentreAtStop1': [X1A - 12 - BOX[0] / 2, 0, TOP + BOX[2] / 2],
              'sensorX': {'B3': 1250, 'B4': 500, 'B5': 1900}}
    return m.export(doc)

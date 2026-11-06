"""6.7 indexer - 4-station rotary indexing table: feed 4A, press 2A, height check, OK eject 3A /
NG eject 5A, locating pin 1A, drive M1 + index cam (replaces L06)."""
from lib import *

CX, CY = 600.0, 0.0
TZ = 800.0              # table top
R_TAB = 400.0
R_NEST = 360.0
PAD = 3.0               # nest pad height
PART = (50.0, 25.0)     # puck dia, OK height
BASE = 640.0
PZ = TZ + PAD           # part bottom
BRIDGE_Z = 1170.0


def st_pos(k):
    a = math.radians((180, 90, 0, 270)[k])
    return V(CX + R_NEST * math.cos(a), CY + R_NEST * math.sin(a), PZ)


def build(doc):
    m = Machine('indexer', 'Bàn xoay chia 4 vị trí', accent='#12808A')
    m.st(floor_plate(-650, 1700, -900, 800))
    m.st(table_frame(-450, 1250, -560, 560, BASE - 20, top=None, panels='accent'))
    m.st(slot_plate(-450, 1250, -560, 560, BASE))
    # ---------------------------------------------------------------- rotary table (node 'table')
    tab = [(cyl(R_TAB, V(CX, CY, TZ - 20), V(CX, CY, TZ), ch=2), 'inox'),
           (cyl(R_TAB + 2, V(CX, CY, TZ - 16), V(CX, CY, TZ - 6)), 'accent'),
           (cyl(70, V(CX, CY, TZ), V(CX, CY, TZ + 14), ch=3), 'alu')]
    for k in range(4):
        a = math.radians(90 * k)
        p = V(CX + R_NEST * math.cos(a), CY + R_NEST * math.sin(a), TZ)
        tab.append((cyl(34, p, p + V(0, 0, PAD), ch=1), 'black'))
        tab.append((cyl(27, p + V(0, 0, PAD), p + V(0, 0, PAD + 0.6)), 'inox'))
        b = math.radians(45 + 90 * k)
        q = V(CX + 250 * math.cos(b), CY + 250 * math.sin(b), TZ - 20)
        tab.append((cyl(16, q - V(0, 0, 12), q), 'black'))           # locating bushes
        tab.append((cyl(6, V(CX + 200 * math.cos(a + 0.4), CY + 200 * math.sin(a + 0.4), TZ),
                        V(CX + 200 * math.cos(a + 0.4), CY + 200 * math.sin(a + 0.4), TZ + 2)), 'nickel'))
    m.node('table', V(CX, CY, TZ), {'type': 'rotate', 'axisFC': [0, 0, -1], 'travel': 360,
                                    'note': 'clockwise seen from above: station 0 -> 1 -> 2 -> 3, 90 deg per index'},
           tab, quality=(0.8, 0.12))
    # drive + cam
    m.st([(cyl(110, V(CX, CY, BASE), V(CX, CY, BASE + 70), ch=4), 'motor'),
          (box(CX - 120, CY - 120, BASE, CX + 120, CY + 120, BASE + 12, ch=2), 'alu'),
          (cyl(60, V(CX, CY, BASE + 70), V(CX, CY, TZ - 40)), 'nickel'),
          (cyl(80, V(CX, CY, TZ - 40), V(CX, CY, TZ - 20)), 'alu')])
    m.st(gearmotor(V(CX + 110, CY, BASE + 45), V(-1, 0, 0), V(0, -1, 0) * -1, 0.8))
    cam = cyl(150, V(CX, CY, TZ - 75), V(CX, CY, TZ - 63))
    for k in range(4):
        a = math.radians(90 * k)
        cam = cam.cut(cbox(CX + 150 * math.cos(a), CY + 150 * math.sin(a), TZ - 69, 30, 30, 20))
    m.st([(cam, 'inox')])
    pr2, led2 = prox(V(CX - 158 - 0, CY, TZ - 69), V(1, 0, 0), 45)
    m.st(pr2 + [(box(CX - 230, -30, BASE, CX - 215, 30, TZ - 50, ch=1), 'inox')])
    m.sensor('IdxPos', led2)
    # ---------------------------------------------------------------- 1A locating pin (from below, +Z 30)
    b = math.radians(225)
    pp = V(CX + 250 * math.cos(b), CY + 250 * math.sin(b), TZ - 20 - 12)
    pin = [(cyl(10, pp, pp + V(0, 0, 12), ch=2), 'rod')]
    c1 = pcyl(pp - V(0, 0, 14), V(0, 0, 1), 30, bore=20, up=V(-1, 0, 0))
    m.cylinder('cyl_1A_rod', c1, [0, 0, 1], 30, pin, b1='1B1', b2='1B2')
    m.st([(box(pp.x - 40, pp.y - 40, pp.z - 14 - 8, pp.x + 40, pp.y + 40, pp.z - 14, ch=1.5), 'inox')])
    for s in (-1, 1):
        m.st([(box(pp.x + s * 34 - 4, pp.y - 40, BASE, pp.x + s * 34 + 4, pp.y + 40, pp.z - 14 - 8, ch=1), 'inox')])
    # ---------------------------------------------------------------- overhead bridge (fixed) from back posts
    for x in (300.0, 900.0):
        m.st(profile(V(x, 470, BASE), V(x, 470, BRIDGE_Z + 60), 80, 40))
        m.st(endcap(V(x, 470, BRIDGE_Z + 60), V(0, 0, 1), 80, 40))
    m.st(profile(V(260, 470, BRIDGE_Z + 20), V(940, 470, BRIDGE_Z + 20), 40, 80, wdir=V(0, 0, 1)))
    m.st(profile(V(CX, 450, BRIDGE_Z), V(CX, -120, BRIDGE_Z), 80, 40, wdir=V(1, 0, 0)))
    m.st(profile(V(CX + 40, 0, BRIDGE_Z), V(CX + 400, 0, BRIDGE_Z), 40, 40))
    m.st(endcap(V(CX, -120, BRIDGE_Z), V(0, -1, 0), 80, 40) + endcap(V(CX + 400, 0, BRIDGE_Z), V(1, 0, 0)))
    m.st([(box(CX - 90, -90, BRIDGE_Z - 32, CX + 90, 90, BRIDGE_Z - 20, ch=2), 'alu')])
    m.st([(box(CX - 300, 466, BRIDGE_Z + 40, CX + 300, 470 - 22, BRIDGE_Z + 0), 'accent')] if False else [])
    # ---------------------------------------------------------------- station 1 (back): 2A press (-Z 80)
    s1 = st_pos(1)
    hb = PZ + PART[1] + 80
    head = [(cyl(26, V(s1.x, s1.y, hb), V(s1.x, s1.y, hb + 25), ch=3), 'black'),
            (cyl(20, V(s1.x, s1.y, hb + 25), V(s1.x, s1.y, hb + 40)), 'inox')]
    c2 = pcyl(V(s1.x, s1.y, hb + 40 + 14), V(0, 0, -1), 80, bore=40, up=V(0, -1, 0))
    m.cylinder('cyl_2A_rod', c2, [0, 0, -1], 80, head, b1='2B1', b2='2B2')
    top2 = c2['rear'].z
    m.st([(box(s1.x - 40, s1.y - 40, top2, s1.x + 40, s1.y + 40, BRIDGE_Z - 20, ch=2), 'alu'),
          (box(s1.x - 60, s1.y - 50, BRIDGE_Z - 32, s1.x + 60, s1.y + 50, BRIDGE_Z - 20, ch=2), 'alu')])
    # ---------------------------------------------------------------- station 0 (left): feed magazine + 4A
    s0 = st_pos(0)
    fx = s0.x - 200                                     # magazine axis X (= part centre before feeding)
    face0 = fx - PART[0] / 2 - 5
    m.st([(box(face0 - 25, -42, PZ - 12, CX - R_TAB + 8, 42, PZ, ch=1.5), 'inox'),
          (box(face0 - 15, -40, BASE, CX - R_TAB - 20, 40, PZ - 12, ch=2), 'alu')])
    for s in (-1, 1):
        m.st([(box(face0 - 25, s * 27 - (6 if s < 0 else 0), PZ, CX - R_TAB, s * 27 + (6 if s > 0 else 0), PZ + 15, ch=1), 'inox')])
    zt0 = PZ + PART[1] + 3
    tube = cyl(35, V(fx, 0, zt0), V(fx, 0, zt0 + 320)).cut(cyl(30.5, V(fx, 0, zt0 - 1), V(fx, 0, zt0 + 321)))
    m.node('glass_feed', V(fx, 0, zt0), {}, [(tube, 'glass')])
    m.st(profile(V(fx, 120, BASE), V(fx, 120, zt0 + 340), 40, 40) + endcap(V(fx, 120, zt0 + 340), V(0, 0, 1)))
    for z in (zt0 + 60, zt0 + 300):
        ring = cyl(41, V(fx, 0, z - 7), V(fx, 0, z + 7)).cut(cyl(35, V(fx, 0, z - 8), V(fx, 0, z + 8)))
        m.st([(ring, 'inox'), (box(fx - 10, 38, z - 7, fx + 10, 100, z + 7, ch=1), 'inox')])
    pr, led = prox(V(fx, -31, PZ + PART[1] / 2), V(0, 1, 0), 45, bracket=False)
    m.st(pr + [(box(fx - 14, -70, PZ - 12, fx + 14, -66, PZ + 28, ch=1), 'inox')])
    m.sensor('FeedAvail', led)
    head4 = [(box(face0 - 10, -22, PZ + 2, face0, 22, PZ + 22, ch=1.5), 'black')]
    c4 = pcyl(V(face0 - 10 - 14, 0, PZ + 12), V(1, 0, 0), 200, bore=20, mount='foot')
    m.cylinder('cyl_4A_rod', c4, [1, 0, 0], 200, head4, b1='4B1', b2='4B2')
    m.st([(box(c4['rear'].x, -30, BASE, face0 - 30, 30, PZ + 12 - c4['a'] / 2 - 22, ch=2), 'alu')])
    pe, led = photo_eye(V(s0.x - 75, -95, PZ + 14), unit(V(75, 95, 0)), post_to_z=BASE, size=0.8)
    m.st(pe); m.sensor('P0', led)
    # ---------------------------------------------------------------- station 2 (right): P2 + height check
    s2 = st_pos(2)
    pe, led = photo_eye(V(s2.x + 75, 95, PZ + 14), unit(V(-75, -95, 0)), post_to_z=BASE, size=0.8)
    m.st(pe); m.sensor('P2', led)
    hs = [(box(s2.x - 25, -40, BRIDGE_Z - 260, s2.x + 25, 10, BRIDGE_Z - 180, ch=3), 'sensor'),
          (box(s2.x - 12, -20, BRIDGE_Z - 262, s2.x + 12, -2, BRIDGE_Z - 260), 'black'),
          (box(s2.x - 6, 10, BRIDGE_Z - 240, s2.x + 6, 26, BRIDGE_Z - 20), 'inox')]
    m.st(hs)
    m.sensor('HeightOK', V(s2.x + 26, -20, BRIDGE_Z - 190))
    # ---------------------------------------------------------------- station 3 (front): OK eject 3A (-Y), NG eject 5A (+X)
    s3 = st_pos(3)
    bl3 = s3.y + PART[0] / 2 + 3            # blade face (rest)
    blade3 = [(box(s3.x - 28, bl3, PZ + 3, s3.x + 28, bl3 + 10, PZ + 100, ch=1.5), 'inox'),
              (box(s3.x - 22, bl3 - 0.1, PZ + 6, s3.x + 22, bl3 + 0.1, PZ + 22), 'black')]
    c3 = pcyl(V(s3.x, bl3 + 10 + 14, PZ + 100 - 20), V(0, -1, 0), 200, bore=25, up=V(0, 0, 1))
    m.cylinder('cyl_3A_rod', c3, [0, -1, 0], 200, blade3, b1='3B1', b2='3B2')
    zt3 = PZ + 100 - 20 + c3['a'] / 2
    m.st([(box(s3.x - 30, c3['rear'].y - 0, zt3, s3.x + 30, -60, zt3 + 10, ch=1.5), 'alu'),
          (box(s3.x - 30, -100, zt3, s3.x + 30, -60, BRIDGE_Z - 32, ch=2), 'alu')])
    bl5 = s3.x - PART[0] / 2 - 5
    blade5 = [(box(bl5 - 10, s3.y - 28, PZ + 3, bl5, s3.y + 28, PZ + 100, ch=1.5), 'inox')]
    c5 = pcyl(V(bl5 - 10 - 14, s3.y, PZ + 100 - 20), V(1, 0, 0), 200, bore=25, up=V(0, 0, 1))
    m.cylinder('cyl_5A_rod', c5, [1, 0, 0], 200, blade5, b1='5B1', b2='5B2')
    px, py = c5['rear'].x + 40, -480
    m.st(profile(V(px, py, BASE), V(px, py, zt3 + 10), 40, 40))
    m.st([(box(px - 30, py - 20, zt3, bl5 - 120, s3.y + 30, zt3 + 10, ch=1.5), 'alu')])
    pe, led = photo_eye(V(s3.x + 110, s3.y - 100, PZ + 14), unit(V(-110, 100, 0)), post_to_z=BASE, size=0.8)
    m.st(pe); m.sensor('P3', led)
    # OK chute (front) into a tote, NG chute (right-front) into a red bin
    ch_pl = App.Placement(V(s3.x, -R_TAB - 5, PZ - 3), App.Rotation(V(1, 0, 0), -12))
    m.st(xf([(box(-35, -330, -3, 35, 0, 0), 'inox'), (box(-41, -330, -3, -35, 0, 30, ch=0.8), 'inox'),
             (box(35, -330, -3, 41, 0, 30, ch=0.8), 'inox')], ch_pl))
    m.st([(box(s3.x - 140, -900, BASE - 12, s3.x + 140, -560, BASE, ch=2), 'inox')])
    for dx in (-110, 110):
        m.st(leg(s3.x + dx, -870, BASE - 12))
    m.st(profile(V(s3.x - 90, -870, 220), V(s3.x + 90, -870, 220), 40, 40))
    m.st([(box(s3.x - 120, -880, BASE, s3.x + 120, -700, BASE + 150, ch=4).cut(box(s3.x - 112, -872, BASE + 8, s3.x + 112, -708, BASE + 160)), 'btnblue')])
    ng_pl = App.Placement(V(CX + R_TAB * 0.43, s3.y, PZ - 3), App.Rotation(V(0, 1, 0), 15))
    m.st(xf([(box(0, -40, -3, 260, 40, 0), 'inox'), (box(0, -46, -3, 260, -40, 30, ch=0.8), 'inox'),
             (box(0, 40, -3, 260, 46, 30, ch=0.8), 'inox')], ng_pl))
    m.st([(box(1080, s3.y - 110, BASE, 1240, s3.y + 110, BASE + 130, ch=4).cut(box(1088, s3.y - 102, BASE + 8, 1232, s3.y + 102, BASE + 140)), 'red')])
    # ---------------------------------------------------------------- guard
    st, gl = guard(-450, 1250, -560, 560, BASE, 1750, openings={'front': [(s3.x - 80, s3.x + 80, BASE + 200)]}, handles=[('front', 360, 1250), ('front', 440, 1250)],
                   hinges=[('front', -380, 900), ('front', -380, 1500), ('front', 1180, 900), ('front', 1180, 1500)])
    m.st(st)
    m.node('glass_guard', V(0, 0, 0), {}, gl)
    # pneumatics / electrics
    m.st([(box(-420, 400, BASE, -120, 410, BASE + 260, ch=1), 'inox')])
    m.st(valve_island(V(-270, 380, BASE + 40), 5, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(-160, 370, BASE + 200), V(0, -1, 0)))
    m.st(duct(V(-430, 530, BASE), V(1230, 530, BASE), 40, 60))
    m.st(warn_label(V(400, -561, BASE - 70), V(0, -1, 0), 70))
    cb, lamps = control_box(V(1450, -560, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'tableCentre': [CX, CY, TZ], 'tableRadius': R_TAB, 'nestRadius': R_NEST, 'nestPadTopZ': PZ,
              'part': list(PART), 'stations': {str(k): [round(st_pos(k).x, 1), round(st_pos(k).y, 1)] for k in range(4)},
              'stationAnglesDeg': {'0': 180, '1': 90, '2': 0, '3': 270},
              'feedMagazineAxis': [fx, 0], 'feedFaceRestX': face0, 'okBladeFaceRestY': bl3, 'ngBladeFaceRestX': bl5,
              'pressHeadBottomRestZ': hb, 'okToteCentre': [s3.x, -790, BASE], 'ngBinCentre': [1160, s3.y, BASE]}
    return m.export(doc)

"""P1 motor - roller shutter door driven by a reversing 3-phase motor (Lab L02).
Door opening X 0..2000, guides to Z=2400, drum + gear motor on top; wall push-button station
(Up/Down + lamps), small glass-door cabinet with CB, KM1/KM2, F1; safety photo-eye at Z=300."""
from lib import *

W, H = 2000.0, 2400.0
YC = -65.0                 # curtain plane
DRUM = V(0, -245, 2590)    # drum axis (y, z)
RC = 180.0                 # coil radius
TRAVEL = 2200.0
SLAT = 77.0


def build(doc):
    m = Machine('motor', 'Cửa cuốn – động cơ 3 pha đảo chiều', accent='#C0392B')
    m.previewEye = (-0.7, -1.4, 0.65)
    m.previewZoom = 0.9
    m.focusFC = [[-100, -500, 0], [2950, 0, 2900]]
    m.st(floor_plate(-500, 3200, -1300, 0))
    # ------------------------------------------------------------------ wall with opening
    wall = box(-500, 0, 0, 3200, 220, 3050).cut(box(30, -10, -10, W - 30, 230, H - 20))
    m.st([(wall, 'wall')])
    m.st([(box(-500, -12, 0, 3200, 0, 100), 'base')])                      # skirting
    m.st([(box(30, 0, H - 20, W - 30, 220, H - 5), 'inox')])                # lintel sheet
    # ------------------------------------------------------------------ guides
    for x0, x1 in ((0, 90), (W - 90, W)):
        g = box(x0, -115, 0, x1, -15, H, ch=2)
        inner = box(x0 + (25 if x0 == 0 else -1), -85, -1, x1 - (-1 if x0 == 0 else 25), -45, H + 1)
        g = g.cut(inner)
        m.st([(g, 'inox')])
        m.st([(box(x0 + 5, -15, 0, x1 - 5, 0, H, ch=1), 'base')])           # wall angle
        m.st([(box(x0 - 2, -125, 0, x1 + 2, -10, 60, ch=3), 'accent')])     # guide shoe
        for z in (400, 1200, 2000):
            for xx in (x0 + 20, x1 - 20):
                m.st([(cyl(6, V(xx, -115, z), V(xx, -119, z)), 'nickel')])
        m.st([(box(x0, -120, H - 10, x1, -10, H + 30, ch=2), 'black')])     # bell mouth
    # ------------------------------------------------------------------ curtain (door node)
    door = []
    n = int(math.ceil((H + 20) / SLAT))
    for i in range(n):
        z = 60 + i * SLAT
        if z > H + 20: break
        door.append((box(30, YC - 9, z, W - 30, YC + 9, min(z + SLAT - 2, H + 20), ch=3), 'door'))
        door.append((box(30, YC - 10.5, z + SLAT * 0.45, W - 30, YC - 8.5, z + SLAT * 0.55), 'door'))
    for i in range(6):                                  # vision/vent slots in slat 3
        xv = 400 + i * 240
        door.append((box(xv, YC - 10, 60 + 3 * SLAT + 20, xv + 120, YC - 8.8, 60 + 3 * SLAT + 40, ch=0.4), 'black'))
    door += [(box(20, YC - 22, 8, W - 20, YC + 22, 62, ch=4), 'alu'),                  # bottom bar
             (box(25, YC - 16, 0, W - 25, YC + 16, 10, ch=3), 'black'),               # rubber seal
             (box(860, YC - 40, 20, 1140, YC - 22, 45, ch=6), 'black'),               # handle
             (box(30, YC - 23, 34, W - 30, YC - 22, 46), 'warn')]
    for x in (40, W - 40):                              # end locks (in the guides)
        door.append((box(x - 12, YC - 14, 120, x + 12, YC + 14, 2300, ch=2), 'black'))
    m.node('door', V(W / 2, YC, 0), {'type': 'translate', 'axisFC': [0, 0, 1], 'travel': TRAVEL,
                                      'clipAboveZFC': H + 20}, door)
    # ------------------------------------------------------------------ drum + brackets + motor
    dx0, dx1 = 25, W - 25
    dy, dz = DRUM.y, DRUM.z
    drum = [(cyl(RC, V(dx0 + 15, dy, dz), V(dx1 - 15, dy, dz)), 'door'),
            (cyl(30, V(-60, dy, dz), V(W + 60, dy, dz)), 'nickel')]
    for x in (dx0, dx1 - 15):                           # spoked end discs
        drum.append((cyl(RC + 25, V(x, dy, dz), V(x + 15, dy, dz), ch=2), 'accent'))
        for k in range(4):
            a = math.radians(45 + 90 * k)
            drum.append((box(x - 1, -8, 60, x + 16, 8, RC + 5).rotated(V(x, 0, 0), V(1, 0, 0), math.degrees(a)).translated(V(0, dy, dz)), 'black'))
    for k in range(3):                                  # axial seams -> rotation is visible
        a = math.radians(120 * k)
        p = V(0, dy + RC * math.cos(a), dz + RC * math.sin(a))
        drum.append((box(dx0 + 20, -6, -6, dx1 - 20, 6, 6).translated(p), 'black'))
    drum.append((cyl(95, V(W + 30, dy, dz), V(W + 44, dy, dz), ch=2), 'black'))
    for k in range(18):
        a = 360.0 * k / 18
        drum.append((box(W + 30, -6, 92, W + 44, 6, 104).rotated(V(0, 0, 0), V(1, 0, 0), a).translated(V(0, dy, dz)), 'black'))
    m.node('drum', DRUM, {'type': 'rotate', 'axisFC': [1, 0, 0], 'travel': 360, 'continuous': True,
                          'openingSign': 1}, drum)
    for x0, x1 in ((-60, -25), (W + 50, W + 85)):       # end brackets on the wall
        br = box(x0, dy - RC - 70, H - 20, x1, 0, dz + RC + 70, ch=4)
        m.st([(br, 'accent')])
        m.st([(cyl(50, V(x0 - 8, dy, dz), V(x1 + 8, dy, dz), ch=3), 'black')])     # bearing
    # hood (top canopy, open at the front-bottom so the drum stays visible)
    m.st([(box(-60, dy - RC - 70, dz + RC + 70, W + 85, 0, dz + RC + 82, ch=3), 'inox')])
    m.st([(box(-60, dy - RC - 82, dz + 20, W + 85, dy - RC - 70, dz + RC + 82, ch=3), 'inox')])
    m.st(text(face_pl(V(0, dy - RC - 82, 0), V(0, -1, 0)), 'BK-AutoLab  ROLLER DOOR', W / 2, dz + 70, 60, 'white', 0.5))
    # gear motor driving a chain to the drum sprocket
    mp = V(W + 160, dy + 60, dz - 260)
    m.st(gearmotor(mp, V(-1, 0, 0), V(0, 0, -1), 1.5))
    m.st([(box(W + 95, dy - 100, dz - 380, W + 125, -10, dz - 150, ch=3), 'accent')])   # motor bracket
    m.st([(cyl(40, V(W + 30, mp.y, mp.z), V(W + 44, mp.y, mp.z), ch=2), 'black'),
          (cyl(10, V(W + 44, mp.y, mp.z), V(W + 160, mp.y, mp.z)), 'nickel')])
    # chain (two straight strands between sprockets)
    for s in (-1, 1):
        p0 = V(W + 37, dy + s * 98, dz)
        p1 = V(W + 37, mp.y + s * 42, mp.z)
        m.st([(cyl(5, p0, p1), 'valve')])
    # ------------------------------------------------------------------ limit switches on the right guide
    for tag, z, lev in (('LS_Down', 70, 1), ('LS_Up', TRAVEL + 30, -1)):
        parts, led = limit_switch(V(W - 45, -115, z), V(0, -1, 0))
        m.st(parts)
        m.sensor(tag, led)
    # ------------------------------------------------------------------ safety photo-eye Z=300
    ype = -150.0
    for xe, d, sen in ((95, 1, False), (W - 95, -1, True)):
        parts, led = through_beam(V(xe + d * 30, ype, 300), V(d, 0, 0))
        m.st(parts)
        m.st([(box(min(xe, xe + d * 15), ype - 28, 262, max(xe, xe + d * 15), -112, 338, ch=1), 'inox')])
        if sen:
            m.sensor('PE', led)
    # ------------------------------------------------------------------ obstacle (carton) in the doorway
    ob = [(box(800, -360, 0, 1250, -82, 380, ch=4), 'carton'),
          (box(1010, -362, 0, 1040, -80, 382), 'tape'),
          (box(1010, -362, 300, 1040, -80, 382), 'tape')]
    m.node('obstacle', V(1025, -221, 0), {'type': 'translate', 'axisFC': [0, 1, 0], 'travel': 0,
                                          'visibleFrom': 'getVisual().obstacle (app shows/hides)'}, ob)
    # ------------------------------------------------------------------ push-button station on the wall
    bx, bz = 2260.0, 1250.0
    sp = face_pl(V(bx, -90, bz), V(0, -1, 0))
    m.st([lbox(sp, -70, -130, -90, 70, 130, 0, 'warn', ch=6),
          lbox(sp, -60, -120, 0, 60, 120, 1, 'warn', ch=1)])
    for i, (tag, col, lab) in enumerate((('H_Up', 'green', 'UP'), ('H_Down', 'amber', 'DOWN'))):
        x = -32 + i * 64
        st, lens, o = pilot_lamp(sp, x, 70, col)
        m.st(st)
        m.node('out_' + tag, o, {'type': 'output', 'tag': tag, 'color': LAMP_HEX[col]}, lens)
    for i, (bid, lab, up) in enumerate((('Up', 'UP', 1), ('Down', 'DOWN', -1))):
        x = -32 + i * 64
        st, cap, o, ax = pushbutton(sp, x, -5, 'black')
        tri = [(-6, -5 * up), (6, -5 * up), (0, 6 * up)]
        cap.append((prism(tri, 0.6, sp.multiply(App.Placement(V(x, -5, 9), App.Rotation()))), 'white'))
        m.st(st)
        m.node('btn_' + bid, o, {'type': 'translate', 'axisFC': [0, 1, 0], 'travel': 4, 'button': 'S_' + bid,
                                 'kind': 'momentary'}, cap)
        m.st(label_plate(sp, x, -48, lab, w=52, h=16))
    m.st(label_plate(sp, 0, 108, 'BK DOOR', w=90, h=16))
    # conduit from the station up
    m.st([(cyl(12, V(bx, -45, bz + 130), V(bx, -45, 2200)), 'duct')])
    # ------------------------------------------------------------------ cabinet 400 x 600 x 200
    cx, cz = 2700.0, 1000.0
    cab = cabinet(V(cx, 0, cz), V(0, -1, 0), 400, 600, 200, window=(40, 170, 360, 560), hinge='left')
    m.st(cab['static'])
    m.node('glass_cabinet', cab['glass'][0][0].BoundBox.Center, {}, cab['glass'])
    pp = cab['pl_plate']
    for y in (180, 30, -130):
        m.st(din_rail(pp, -160, 160, y))
    for y0 in (95, -55):
        m.st([lbox(pp, -160, y0, 0, 160, y0 + 30, 40, 'duct')])
    m.st(mcb(pp, -100, 180, 3))
    m.st(text(pp, 'CB', -100, 230, 9, 'black', 0.3))
    m.st(mcb(pp, -25, 180, 1))
    m.st(psu(pp, 50, 180, w=50, s='24V'))
    m.st(terminals(pp, 95, 8, 180))
    for i, tag in enumerate(('KM1', 'KM2')):
        st, ind, o = contactor(pp, -95 + i * 60, 30)
        m.st(st)
        m.st(text(pp, tag, -95 + i * 60, 74, 7, 'black', 0.3, z=7.5 + 89))
        m.node('out_' + tag, o, {'type': 'output', 'tag': tag, 'color': '#43a047'}, ind)
    m.st([lbox(pp, -62, 20, 7.5, -58, 40, 60, 'ctr')])   # mechanical interlock
    m.st(terminals(pp, 30, 14, 30))
    ol, f1led = overload(pp, -95, -130)
    m.st(ol)
    m.st(text(pp, 'F1', -95, -175, 9, 'black', 0.3))
    m.st(terminals(pp, -40, 18, -130))
    m.st([(Part.makeSphere(2.4, f1led), 'green')])
    dp = cab['pl_door']
    m.st(warn_label(lp(dp, 0, -220, 0.5), V(0, -1, 0), 60))
    m.st(text(dp, 'MCC  CUA CUON', 0, -275, 18, 'black', 0.4))
    # conduit cabinet -> motor
    m.st([(cyl(16, V(cx - 120, -40, cz + 600), V(cx - 120, -40, 2820)), 'duct'),
          (cyl(16, V(cx - 120, -40, 2820), V(W + 160, -40, 2820)), 'duct'),
          (cyl(16, V(W + 160, -40, 2820), V(W + 160, -40, dz - 140)), 'duct')])
    m.refs = {'doorBottomZ': [0, TRAVEL], 'doorClipAboveZ': H + 20, 'doorX': [30, W - 30], 'curtainY': YC,
              'drumAxisFC': [[0, DRUM.y, DRUM.z], [W, DRUM.y, DRUM.z]], 'drumRadius': RC,
              'peBeamFC': [[125, ype, 300], [W - 125, ype, 300]], 'obstacleBoxFC': [[800, -360, 0], [1250, -82, 380]],
              'lsDownZ': 70, 'lsUpZ': TRAVEL + 30, 'stationFC': [bx, -90, bz], 'cabinetFC': [cx, 0, cz]}
    return m.export(doc)

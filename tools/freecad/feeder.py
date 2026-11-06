"""6.1 feeder - gravity magazine + pusher 1A + separator 2A + short belt (Lab L07)."""
from lib import *

TABLE = 700.0       # slotted plate top
BELT = 800.0        # belt top (contract)
PUCK_D, PUCK_H = 50.0, 25.0
MX = 150.0          # magazine axis X


def build(doc):
    m = Machine('feeder', 'Bộ cấp phôi từ ổ chứa', accent='#12808A')
    m.st(floor_plate(-420, 1270, -560, 500))
    # ---- base table with slotted aluminium plate
    m.st(table_frame(-200, 1090, -270, 330, TABLE - 20, top=None, panels='accent'))
    m.st(slot_plate(-200, 1090, -270, 330, TABLE))
    # ---- belt conveyor X=200..800 on brackets
    bc = belt_conveyor(200, 800, 110, BELT, 0, 'belt_g', motor_side=1, legs=False,
                       guides=(62, 22), frame_h=70, motor_dir=V(-1, 0, 0))
    m.st(bc['static'])
    fy = bc['frame_y']
    for x in (260, 740):
        for s in (-1, 1):
            m.st([(box(x - 25, s * fy - 15, TABLE, x + 25, s * fy + 15, BELT - 4 - 70), 'alu'),
                  (box(x - 35, s * fy - 25, TABLE, x + 35, s * fy + 25, TABLE + 6, ch=1.5), 'alu')])
    m.node('belt_1', V(500, 0, BELT), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bc['belt'])
    # ---- end stop + B5 photo-eye
    m.st([(box(780, -45, BELT + 2, 792, 45, BELT + 40, ch=2), 'black'),
          (box(792, -fy - 15, BELT - 10, 800, fy + 15, BELT + 40, ch=1.5), 'inox')])
    pe, led = photo_eye(V(755, -112, BELT + 13), V(0, 1, 0), post_to_z=TABLE, reflector_at=224)
    m.sensor('B5', led, pe)
    # ---- magazine slide plate + guide rails at the bottom window
    m.st([(box(100, -40, BELT - 12, 205, 40, BELT, ch=1.5), 'inox')])
    for s in (-1, 1):
        m.st([(box(100, s * 27 - (6 if s < 0 else 0), BELT, 205, s * 27 + (6 if s > 0 else 0), BELT + 18, ch=1), 'inox')])
    m.st([(box(110, -40, TABLE, 200, 40, BELT - 12, ch=2), 'alu')])          # plate pedestal
    # ---- magazine tube (polycarbonate, transparent) Ø60 inner, above a 28 mm window
    z_tube0 = BELT + PUCK_H + 3
    tube = cyl(35, V(MX, 0, z_tube0), V(MX, 0, 1140)).cut(cyl(30.5, V(MX, 0, z_tube0 - 1), V(MX, 0, 1141)))
    tube = tube.cut(box(MX - 9, 20, z_tube0 - 1, MX + 9, 40, z_tube0 + 32))   # slot for separator finger
    tube = tube.cut(box(MX - 6, -40, z_tube0 + 50, MX + 6, -20, 1100))         # front level window
    m.node('glass_magazine', V(MX, 0, z_tube0), {}, [(tube, 'glass')])
    # magazine frame: two corner posts at the back + clamp rings
    post_y = 185
    m.st(profile(V(MX, post_y, TABLE), V(MX, post_y, 1190), 40, 40))
    m.st(endcap(V(MX, post_y, 1190), V(0, 0, 1)))
    for z in (960, 1125):
        ring = cyl(41, V(MX, 0, z - 7), V(MX, 0, z + 7)).cut(cyl(35, V(MX, 0, z - 8), V(MX, 0, z + 8)))
        if z == z_tube0 + 8:
            ring = ring.cut(box(MX - 12, 20, z - 9, MX + 12, 45, z + 9))
        m.st([(ring, 'inox'), (box(MX - 10, 38, z - 7, MX + 10, post_y - 20, z + 7, ch=1), 'inox')])
    m.st([(cyl(36, V(MX, 0, 1140), V(MX, 0, 1150), ch=2), 'black')])
    # ---- 1A pusher: horizontal, behind (-X) the magazine, pushes +X
    head_face = MX - PUCK_D / 2 - 5            # 120
    c1 = pcyl(V(head_face - 10 - 14, 0, BELT + PUCK_H / 2), V(1, 0, 0), 120, bore=20, mount='foot')
    head = [(box(head_face - 10, -22, BELT + 2, head_face, 22, BELT + 23, ch=1.5), 'black')]
    m.cylinder('cyl_1A_rod', c1, [1, 0, 0], 120, head, b1='1B1', b2='1B2')
    rear = c1['rear']
    m.st([(box(rear.x - 2, -30, TABLE, c1['tip'].x - 14, 30, BELT + PUCK_H / 2 - c1['a'] / 2 - 22, ch=2), 'alu')])
    # ---- 2A separator: horizontal behind (+Y) the tube, finger at 2nd puck, travels -Y 30
    zc2 = BELT + PUCK_H * 1.5
    finger_face = PUCK_D / 2 + 30                # 55 at rest -> 25 extended (touches puck 2)
    c2 = pcyl(V(MX, finger_face + 8 + 12, zc2 + 18), V(0, -1, 0), 30, bore=16, up=V(-1, 0, 0) * 0 + V(0, 0, 1))
    finger = [(box(MX - 7, finger_face, zc2 - 6, MX + 7, finger_face + 20, zc2 + 6, ch=1.5), 'inox'),
              (box(MX - 9, finger_face + 8, zc2 + 6, MX + 9, finger_face + 20, zc2 + 30, ch=1.5), 'inox')]
    m.cylinder('cyl_2A_rod', c2, [0, -1, 0], 30, finger, b1='2B1', b2='2B2')
    # bracket from the cylinder body to the post
    zb2 = zc2 + 18 - c2['a'] / 2
    m.st([(box(MX - 28, finger_face + 30, TABLE, MX + 28, post_y - 22, zb2, ch=2), 'alu'),
          (box(MX - 36, finger_face + 22, zb2 - 8, MX + 36, post_y - 22, zb2, ch=1), 'inox')])
    # ---- level sensors B3 (3rd puck) / B4 (bottom puck) from the front
    fp = profile(V(MX, -95, TABLE), V(MX, -95, BELT + 95), 40, 40)
    m.st(fp + endcap(V(MX, -95, BELT + 95), V(0, 0, 1)))
    for tag, z, face_y in (('B4', BELT + PUCK_H * 0.5, -31), ('B3', BELT + PUCK_H * 2.5, -37)):
        pr, led = prox(V(MX, face_y, z), V(0, 1, 0), length=45, bracket=False)
        m.st(pr + [(box(MX - 14, -75, z - 14, MX + 14, -71, z + 14, ch=1), 'inox')])
        m.sensor(tag, led)
    # ---- pneumatics, electrics, operator station
    m.st(valve_island(V(560, 230, TABLE), 2, V(1, 0, 0), V(0, -1, 0)))
    m.st(frl(V(840, 260, TABLE + 60), V(0, -1, 0)))
    m.st([(box(800, 245, TABLE, 880, 275, TABLE + 60, ch=1), 'alu')])
    m.st(duct(V(-180, 300, TABLE), V(1070, 300, TABLE), 40, 50))
    m.st(warn_label(V(-100, -271, TABLE - 60), V(0, -1, 0), 70))
    cb, lamps = control_box(V(945, -40, TABLE), V(0, -1, 0), w=260, h=300, t=160)
    m.st(cb); m.lamps(lamps)
    m.refs = {'beltTopZ': BELT, 'beltX': [200, 800], 'beltWidth': 110,
              'magazineAxis': [MX, 0], 'puckDiameter': PUCK_D, 'puckHeight': PUCK_H,
              'bottomPuckCentre': [MX, 0, BELT + PUCK_H / 2],
              'pusherFaceRestX': head_face, 'pusherFaceExtendedX': head_face + 120,
              'separatorFaceRestY': finger_face, 'separatorFaceExtendedY': finger_face - 30,
              'magazineTopZ': 1140, 'magazineCapacity': 12,
              'endStopX': 780, 'puckStopCentre': [755, 0, BELT + PUCK_H / 2]}
    return m.export(doc)

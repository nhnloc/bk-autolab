"""6.6 pickplace - 2-axis pneumatic pick & place: rodless X (slide_1A) + guided Z (cyl_2A_rod) with
vacuum cup, infeed belt (X) and outfeed case belt (Y) (Lab L11)."""
from lib import *

TOP_IN = 800.0
TOP_OUT = 760.0
PICK_X, PLACE_X = 800.0, 1300.0
PROD = (70.0, 70.0, 60.0)
CASE = (180.0, 260.0, 100.0)       # 2 x 3 cells of 80 mm
BEAM_Z = 1250.0                    # rodless axis centre line
RL_Y = 65.0
CUP_REST_Z = TOP_IN + PROD[2] + 150.0   # cup lip at rest (touches product top when down)


def build(doc):
    m = Machine('pickplace', 'Trạm gắp-đặt 2 trục khí nén', accent='#1C4F8F')
    m.st(floor_plate(-300, 2100, -900, 950))
    # ---------------------------------------------------------------- infeed belt + stop
    bi = belt_conveyor(0, 795, 150, TOP_IN, 0, 'belt_g', motor_side=-1, motor_end='in', leg_inset=110,
                       guides=(PROD[1] + 20, 30))
    m.st(bi['static'])
    m.node('belt_in', V(400, 0, TOP_IN), {'type': 'belt', 'uvAxisFC': [1, 0, 0]}, bi['belt'])
    fy = bi['frame_y']
    stop_x = PICK_X + PROD[0] / 2
    m.st([(box(795, -fy + 15, TOP_IN - 10, stop_x + 10, fy - 15, TOP_IN, ch=1), 'inox'),
          (box(stop_x, -45, TOP_IN, stop_x + 12, 45, TOP_IN + 45, ch=2), 'black'),
          (box(stop_x + 10, -fy - 15, TOP_IN - 90, stop_x + 20, fy + 15, TOP_IN + 45, ch=1.5), 'inox')])
    pe, led = photo_eye(V(PICK_X, -fy - 50, TOP_IN + 25), V(0, 1, 0), post_to_z=TOP_IN - 40, reflector_at=2 * fy + 100)
    m.st(pe + bar(V(PICK_X, -fy - 88, TOP_IN - 40), V(PICK_X, -fy - 16, TOP_IN - 40), 24, 6)
         + bar(V(PICK_X, fy + 70, TOP_IN - 40), V(PICK_X, fy + 16, TOP_IN - 40), 24, 6))
    m.sensor('PartAtPick', led)
    # ---------------------------------------------------------------- outfeed case belt along +Y at X=1300
    bo = belt_conveyor(-750, 750, 320, TOP_OUT, 0, 'belt_g', motor_side=1, motor_end='out', leg_inset=110,
                       guides=(CASE[0] + 30, 50))
    pl = App.Placement(V(PLACE_X, 0, 0), App.Rotation(V(0, 0, 1), 90))
    m.st(xf(bo['static'], pl))
    m.node('belt_out', V(PLACE_X, 0, TOP_OUT), {'type': 'belt', 'uvAxisFC': [0, 1, 0]}, xf(bo['belt'], pl))
    ofy = bo['frame_y']
    pe, led = photo_eye(V(PLACE_X - ofy - 50, -60, TOP_OUT + 50), V(1, 0, 0), post_to_z=TOP_OUT - 40, reflector_at=2 * ofy + 100)
    m.st(pe + bar(V(PLACE_X - ofy - 88, -60, TOP_OUT - 40), V(PLACE_X - ofy - 16, -60, TOP_OUT - 40), 24, 6)
         + bar(V(PLACE_X + ofy + 70, -60, TOP_OUT - 40), V(PLACE_X + ofy + 16, -60, TOP_OUT - 40), 24, 6))
    m.sensor('BoxAtPlace', led)
    # step sensor: encoder disc on the tail roller shaft + inductive sensor
    ey = -750 + 25
    ex = PLACE_X + ofy + 22 + 14
    disc = cyl(45, V(ex, ey, TOP_OUT - 25), V(ex + 6, ey, TOP_OUT - 25))
    for k in range(6):
        a = 2 * math.pi * k / 6
        disc = disc.cut(cbox(ex + 3, ey + 32 * math.cos(a), TOP_OUT - 25 + 32 * math.sin(a), 10, 14, 14))
    m.st([(disc, 'inox')])
    pr, led = prox(V(ex + 3, ey, TOP_OUT - 25 + 32 + 6 + 30), V(0, 0, -1) * 0 + V(0, 0, -1), 40)
    m.st(pr); m.sensor('BoxStep', led)
    # ---------------------------------------------------------------- gantry
    for x in (560.0, 1560.0):
        m.st(foot(x - 25, RL_Y + 140) + foot(x + 25, RL_Y + 140))
        m.st(profile(V(x, RL_Y + 140, 60), V(x, RL_Y + 140, BEAM_Z + 80), 80, 40))
        m.st([(box(x - 110, RL_Y + 30, 0, x + 110, RL_Y + 250, 10, ch=2), 'base')])
        m.st(profile(V(x, RL_Y + 140, 300), V(x, RL_Y + 220, 300), 40, 40) if False else [])
        m.st(endcap(V(x, RL_Y + 140, BEAM_Z + 80), V(0, 0, 1), 80, 40))
        # diagonal brace
        m.st(profile(V(x, RL_Y + 160, 200), V(x, RL_Y + 160, 200) + V(0, 0, 0) + V(0, 1, 0), 40, 40) if False else [])
    m.st(profile(V(520, RL_Y + 140, BEAM_Z + 40), V(1600, RL_Y + 140, BEAM_Z + 40), 80, 40, wdir=V(0, 0, 1)))
    m.st(profile(V(520, RL_Y + 90, BEAM_Z), V(1600, RL_Y + 90, BEAM_Z), 40, 80, wdir=V(0, 1, 0)) if False else [])
    m.st([(box(600, RL_Y + 23, BEAM_Z - 40, 1520, RL_Y + 120, BEAM_Z + 40, ch=2), 'alu')])   # mounting plate
    m.st(duct(V(560, RL_Y + 140, BEAM_Z + 80), V(1560, RL_Y + 140, BEAM_Z + 80), 40, 40))
    m.st([(box(700, RL_Y + 118, BEAM_Z + 85, 1420, RL_Y + 122, BEAM_Z + 125), 'accent')])
    # ---------------------------------------------------------------- X axis rodless (slide_1A)
    p0 = V(PICK_X - 87, RL_Y, BEAM_Z)
    p1 = V(PLACE_X + 87 + 2, RL_Y, BEAM_Z)
    rl = rodless(p0, p1, V(0, -1, 0), w=46, h=42, carr_len=170, carr_w=86)
    m.st(rl['body'])
    m.sensor('1B1', rl['led1']); m.sensor('1B2', rl['led2'])
    car_face = rl['top'].y            # carriage front face (Y)
    # adapter plate + Z guided cylinder (body moves with the slide)
    gy = car_face - 6
    slide = rl['carriage'] + [(box(PICK_X - 45, gy, 1035, PICK_X + 45, car_face, BEAM_Z + 40, ch=2), 'alu')]
    t = 36.0
    zfront = CUP_REST_Z + 52 + 3 + 12
    g = gcyl(V(PICK_X, gy - t / 2, zfront), V(0, 0, -1), 150, w=64, t=t, up=V(0, -1, 0))
    slide += g['body']
    # vacuum switch + drag chain bracket on the slide
    slide += [(box(PICK_X + 50, gy - 30, BEAM_Z - 40, PICK_X + 80, gy, BEAM_Z, ch=2), 'sensor')]
    m.node('slide_1A', rl['top'], {'type': 'translate', 'axisFC': [1, 0, 0], 'travel': 500}, slide)
    for tag, lp in (('2B1', g['led1']), ('2B2', g['led2'])):
        m.node('sen_' + tag, lp, {'type': 'sensor', 'parent': 'slide_1A'}, [(led_shape(lp), 'led')])
    m.node('sen_VacOK', V(PICK_X + 65, gy - 31, BEAM_Z - 15), {'type': 'sensor', 'parent': 'slide_1A'},
           [(led_shape(V(PICK_X + 65, gy - 31, BEAM_Z - 15)), 'led')])
    tool = g['rod'] + vcup(V(PICK_X, gy - t / 2, CUP_REST_Z), V(0, 0, -1), 22)
    m.node('cyl_2A_rod', g['tip'], {'type': 'translate', 'axisFC': [0, 0, -1], 'travel': 150, 'parent': 'slide_1A'}, tool)
    # ---------------------------------------------------------------- pneumatics / electrics
    m.st([(box(1600, RL_Y + 160, 850, 1610, RL_Y + 400, 1150, ch=1), 'inox')])
    m.st(valve_island(V(1640, RL_Y + 280, 900), 3, V(0, 1, 0), V(1, 0, 0)))
    m.st(frl(V(1650, RL_Y + 200, 1080), V(1, 0, 0)))
    m.st(warn_label(V(1100, RL_Y + 22, BEAM_Z + 60), V(0, -1, 0), 50))
    cb, lamps = control_box(V(1850, -480, 1000), V(0, -1, 0), post_from_z=0)
    m.st(cb); m.lamps(lamps)
    m.refs = {'beltInTopZ': TOP_IN, 'beltInX': [0, 795], 'product': list(PROD), 'pickCentre': [PICK_X, 0, TOP_IN],
              'stopFaceX': stop_x, 'placeCentre': [PLACE_X, 0, TOP_OUT], 'beltOutTopZ': TOP_OUT,
              'beltOutY': [-750, 750], 'case': list(CASE), 'caseCells': [2, 3], 'cellPitch': 80,
              'cupLipRestZ': CUP_REST_Z, 'cupLipDownZ': CUP_REST_Z - 150, 'cupXY': [PICK_X, round(gy - t / 2, 1)]}
    return m.export(doc)

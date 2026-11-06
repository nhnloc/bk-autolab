"""Validate assets/models/*.glb against CONTRACT section 6 node names + budget.
Usage: python3 tools/freecad/check.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbinfo import info

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = os.path.join(ROOT, 'assets', 'models')
S = lambda *t: ['sen_' + x for x in t]
EXPECT = {
    'feeder': ['cyl_1A_rod', 'cyl_2A_rod', 'belt_1'] + S('1B1', '1B2', '2B1', '2B2', 'B3', 'B4', 'B5'),
    'escapement': ['cyl_1A_rod', 'cyl_2A_rod', 'rollers'] + S('1B1', '1B2', '2B1', '2B2', 'B3', 'B4', 'B5'),
    'diverter': ['cyl_1A_rod', 'cyl_2A_rod', 'cyl_3A_rod', 'belt_main'] +
                S('B0', 'BC', 'B1', 'B2', 'B3', 'L1F', 'L2F', 'L3F', '1B1', '1B2', '2B1', '2B2', '3B1', '3B2'),
    'erector': ['cyl_1A_rod', 'arm_2A', 'flap_3A', 'flap_4A', 'cyl_5A_rod', 'magazine_pusher', 'belt_out'] +
               S('1B1', '1B2', 'VacOK', '2B1', '2B2', '3B1', '3B2', '4B1', '4B2', '5B1', '5B2', 'MagLow', 'MagEmpty',
                 'BoxOut', 'TapeOK', 'AirOK', 'DoorOK'),
    'sealer': ['cyl_1A_rod', 'flap_2A', 'flap_3A', 'cyl_4A_rod', 'belt_in', 'belt_side_L', 'belt_side_R'] +
              S('BIn', 'BPos', 'BOut', '1B1', '1B2', '2B1', '2B2', '3B1', '3B2', '4B1', '4B2', 'TapeOK'),
    'pickplace': ['slide_1A', 'cyl_2A_rod', 'belt_in', 'belt_out'] +
                 S('1B1', '1B2', '2B1', '2B2', 'VacOK', 'PartAtPick', 'BoxAtPlace', 'BoxStep'),
    'indexer': ['table', 'cyl_1A_rod', 'cyl_2A_rod', 'cyl_3A_rod', 'cyl_4A_rod', 'cyl_5A_rod'] +
               S('IdxPos', '1B1', '1B2', '2B1', '2B2', '3B1', '3B2', '4B1', '4B2', '5B1', '5B2', 'FeedAvail', 'P0', 'P2', 'HeightOK', 'P3'),
    'palletizer': ['cyl_1A_rod', 'cyl_2A_rod', 'plate_3A_L', 'plate_3A_R', 'lift', 'pallet', 'belt_in'] +
                  S('BIn', 'RowFull', '1B1', '1B2', '2B1', '2B2', '3B1', '3B2', 'LiftTop', 'LiftBottom', 'LayerLvl', 'PalletIn', 'PalletOut'),
}
man = json.load(open(os.path.join(M, 'manifest.json')))
ok = True
for mid, names in EXPECT.items():
    p = os.path.join(M, mid + '.glb')
    if not os.path.exists(p):
        print(f'{mid:11} MISSING'); ok = False; continue
    r = info(p)
    got = set(r['names'])
    miss = [n for n in names if n not in got]
    bad = [n for n in got if n != mid and not (n in names or n.startswith('static_') or n.startswith('glass_'))]
    mnodes = man['machines'].get(mid, {}).get('nodes', {})
    mmiss = [n for n in names if n not in mnodes]
    flag = 'OK' if not (miss or bad or mmiss) and r['tris'] <= 60000 and r['size'] <= 3 * 1024 * 1024 else 'FAIL'
    ok &= flag == 'OK'
    print(f"{mid:11} {flag}  {r['size']/1024:7.1f} KB  {r['tris']:6d} tris  nodes={len(got)}"
          + (f'  missing={miss}' if miss else '') + (f'  unexpected={bad}' if bad else '')
          + (f'  manifest-missing={mmiss}' if mmiss else ''))
sys.exit(0 if ok else 1)

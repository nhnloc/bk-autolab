"""Build every BK-AutoLab machine (run inside the FreeCAD GUI):
    exec(open('<root>/tools/freecad/build_all.py').read())
or, from the FreeCAD Python console:  import build_all; build_all.main()"""
import importlib, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else None
if HERE is None:
    HERE = '/home/nhnloc/0_Project/plc-simulation/bk-autolab/tools/freecad'
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import lib
importlib.reload(lib)

ORDER = ['feeder', 'escapement', 'diverter', 'erector', 'sealer', 'pickplace', 'indexer', 'palletizer',
         'trainer', 'motor', 'stardelta', 'counter']   # P1 (CONTRACT-P1)


def main(ids=None):
    res = {}
    for mid in ids or ORDER:
        r = lib.run(mid)
        res[mid] = (r['tris'], r['size'])
    for mid, (t, s) in res.items():
        print('%-11s %6d tris %8.1f KB' % (mid, t, s / 1024.0))
    return res


if __name__ == '__main__':
    main(sys.argv[1:] or None)

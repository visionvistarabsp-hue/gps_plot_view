"""Dump a few label bitmaps at NATIVE pixel resolution to learn the glyph aspect.
usage: python a07_native.py X0 Y0 X1 Y1 N   (list of first N connected comps in that window)
"""
import sys, cv2, numpy as np

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
x0, y0, x1, y1 = (int(v) for v in sys.argv[1:5])
N = int(sys.argv[5]) if len(sys.argv) > 5 else 3

img = cv2.imread(SRC, cv2.IMREAD_COLOR)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
S, V = hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
ink = ((gray < 190) | ((S > 60) & (V > 50))).astype(np.uint8)
ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))

win = np.zeros_like(ink)
win[y0:y1, x0:x1] = ink[y0:y1, x0:x1]
n, lab, stats, cent = cv2.connectedComponentsWithStats(win, connectivity=8)
comps = [i for i in range(1, n) if stats[i][4] >= 100]
comps.sort(key=lambda i: stats[i][0])

print(f"{len(comps)} comps in window")
for i in comps[:N]:
    cx, cy, w, h, a = stats[i]
    sub = (lab[cy:cy + h, cx:cx + w] == i).astype(np.uint8)
    ys, xs = np.nonzero(sub)
    sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = sub.shape
    print(f"\n=== comp at ({cx},{cy}) raw {w}x{h} area={a} ===")
    print("+" + "-" * w + "+")
    for row in sub:
        print("|" + "".join("#" if v else "." for v in row) + "|")
    print("+" + "-" * w + "+")
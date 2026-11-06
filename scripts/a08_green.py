"""Isolate ONE colour layer (no morphology) and print components at native resolution.
usage: python a08_green.py Y0 Y1 X0 X1 [MAXC]
"""
import sys, cv2, numpy as np

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
y0, y1, x0, x1 = (int(v) for v in sys.argv[1:5])
MAXC = int(sys.argv[5]) if len(sys.argv) > 5 else 4

img = cv2.imread(SRC, cv2.IMREAD_COLOR)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
green = ((H >= 40) & (H <= 85) & (S > 60) & (V > 50)).astype(np.uint8)

n, lab, stats, _ = cv2.connectedComponentsWithStats(green, connectivity=8)
sel = [i for i in range(1, n)
       if stats[i][4] >= 100 and stats[i][1] >= y0 and stats[i][1] + stats[i][3] <= y1
       and stats[i][0] >= x0 and stats[i][0] + stats[i][2] <= x1]
sel.sort(key=lambda i: stats[i][0])
print(f"{len(sel)} green comps in window; showing {min(MAXC, len(sel))}")

for i in sel[:MAXC]:
    cx, cy, w, h, a = stats[i]
    sub = (lab[cy:cy + h, cx:cx + w] == i).astype(np.uint8)
    ys, xs = np.nonzero(sub)
    sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = sub.shape
    print(f"\n=== ({cx},{cy}) {w}x{h} area={a} fill={a/(w*h):.2f} ===")
    print("+" + "-" * w + "+")
    for row in sub:
        print("|" + "".join("#" if v else "." for v in row) + "|")
    print("+" + "-" * w + "+")
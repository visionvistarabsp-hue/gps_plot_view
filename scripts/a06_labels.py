"""Render a horizontal band of the plan as large ASCII art so glyphs are readable.
usage: python a06_labels.py Y0 Y1 X0 X1 [NCOLS]
"""
import sys, cv2, numpy as np

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
y0, y1, x0, x1 = (int(v) for v in sys.argv[1:5])
NCOLS = int(sys.argv[5]) if len(sys.argv) > 5 else 6

img = cv2.imread(SRC, cv2.IMREAD_COLOR)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
S, V, HUE = hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int), hsv[:, :, 0].astype(int)
# "label ink" = anything dark-ish OR coloured, within the band
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
band_ink = (((gray < 190) | ((S > 60) & (V > 50)))[y0:y1, x0:x1]).astype(np.uint8)
band_ink = cv2.morphologyEx(band_ink, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))

n, lab, stats, cent = cv2.connectedComponentsWithStats(band_ink, connectivity=8)
groups = [dict(i=int(i), x=int(stats[i][0]), y=int(stats[i][1]), w=int(stats[i][2]),
               h=int(stats[i][3]), a=int(stats[i][4])) for i in range(1, n)
          if stats[i][3] >= 18 and stats[i][4] >= 120 and stats[i][2] >= 8]
# merge blobs whose x ranges overlap -> one label
groups.sort(key=lambda g: g["x"])
merged = []
for g in groups:
    if merged and g["x"] <= merged[-1]["x1"] + 8:
        m = merged[-1]
        m["x0"] = min(m["x0"], g["x"]); m["y0"] = min(m["y0"], g["y"])
        m["x1"] = max(m["x1"], g["x"] + g["w"]); m["y1"] = max(m["y1"], g["y"] + g["h"])
    else:
        merged.append(dict(x0=g["x"], y0=g["y"], x1=g["x"] + g["w"], y1=g["y"] + g["h"]))
print(f"band y[{y0},{y1}] x[{x0},{x1}] -> {len(merged)} label groups")

GW, GH = 9, 16   # chars per label

def art(g):
    pad = 2
    a, b = max(0, g["x0"] - pad), g["x1"] + pad
    c, d = max(0, g["y0"] - pad), g["y1"] + pad
    sub = band_ink[max(0, c - x0):d - x0, max(0, a - x0):b - x0]
    if sub.size == 0:
        return []
    im = cv2.resize(sub.astype(np.float32), (GW, GH), interpolation=cv2.INTER_AREA)
    ramp = " .:-=+*#%@"
    return ["".join(ramp[min(9, int(v * 9.99))] for v in row) for row in im]

for start in range(0, len(merged), NCOLS):
    batch = merged[start:start + NCOLS]
    arts = [art(g) for g in batch]
    hdr = "  ".join(f"{start+i:>2}@({g['x0']+x0},{g['y0']+y0})".ljust(GW) for i, g in enumerate(batch))
    print("\n" + hdr)
    for r in range(GH):
        print("  ".join(a[r] for a in arts))
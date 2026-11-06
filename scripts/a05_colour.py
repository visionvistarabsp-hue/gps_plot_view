import cv2, numpy as np, os

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
OUT = r"C:\Users\User\AppData\Local\Temp\opencode\gps"
os.makedirs(OUT, exist_ok=True)
img = cv2.imread(SRC, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
S, V = hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
HUE = hsv[:, :, 0].astype(int)

strong = (S > 60) & (V > 50)
print("strong-coloured px:", int(strong.sum()))

def rng(h):
    return strong & (HUE >= h[0]) & (HUE <= h[1])

classes = {
    "BLUE  (h 100-130)": rng((100, 130)),
    "GREEN (h 40- 85)":  rng((40, 85)),
    "RED   (h 0- 12 )":  rng((0, 12)),
    "MAGENTA(h140-170)":  rng((140, 170)),
    "ORANGE(h 13- 35)":  rng((13, 35)),
}
tot = np.zeros((H, W), np.uint8)
for name, m in classes.items():
    m8 = m.astype(np.uint8)
    tot = cv2.bitwise_or(tot, m8)
    # morph close to merge jpeg/anti-alias noise inside a fill
    mm = cv2.morphologyEx(m8, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7)))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mm, connectivity=8)
    comps = [(stats[i][4], stats[i], cent[i], i) for i in range(1, n) if stats[i][4] >= 400]
    comps.sort(key=lambda c: -c[0])
    ys, xs = np.nonzero(m)
    bb = (xs.min(), xs.max(), ys.min(), ys.max()) if xs.size else (0,0,0,0)
    print(f"\n### {name}: {int(m.sum())} px  bbox x[{bb[0]}..{bb[1]}] y[{bb[2]}..{bb[3]}]  regions>=400px: {len(comps)}")
    for a, st, ct, i in comps[:80]:
        print(f"    area={a:>7} bbox=({st[0]:>4},{st[1]:>4}) {st[2]:>3}x{st[3]:>3} centroid=({ct[0]:.0f},{ct[1]:.0f})")

print("\nunion of all strong colour:", int(tot.sum()))
cv2.imwrite(os.path.join(OUT, "colour_union.png"), 255 - tot * 255)

# ASCII of the union of colour so I can perceive shapes
COLS = 185
rows = max(1, int(round(COLS * H / W / 2.1)))
sx, sy = W / COLS, H / rows
print(f"\nCOLOUR ASCII ({COLS}x{rows})")
sym = {"BLUE  (h 100-130)": "B", "GREEN (h 40- 85)": "G", "RED   (h 0- 12 )": "R",
       "MAGENTA(h140-170)": "M", "ORANGE(h 13- 35)": "O"}
for r in range(rows):
    line = []
    for c in range(COLS):
        x0, x1 = int(c*sx), max(int(c*sx)+1, int((c+1)*sx))
        y0, y1 = int(r*sy), max(int(r*sy)+1, int((r+1)*sy))
        best, ch = 0, " "
        for name, m in classes.items():
            f = m[y0:y1, x0:x1].mean()
            if f > best:
                best, ch = f, sym[name]
        line.append(ch if best > 0.25 else " ")
    print("".join(line))
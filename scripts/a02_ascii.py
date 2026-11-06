import cv2, numpy as np

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
img = cv2.imread(SRC, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
ink = (gray < 200).astype(np.uint8)

edges = cv2.Canny(gray, 50, 150, apertureSize=3)
lines = cv2.HoughLinesP(edges, 1, np.pi / 1800.0, threshold=120,
                        minLineLength=60, maxLineGap=6)
if lines is not None:
    segs = lines.reshape(-1, 4)
    angs = []
    for x1, y1, x2, y2 in segs:
        a = np.degrees(np.arctan2(float(y2) - float(y1), float(x2) - float(x1)))
        angs.append(a + 180 if a < 0 else a)
    angs = np.array(angs)
    h = np.histogram(angs, bins=36, range=(-180, 180))[0]
    print("Hough angle histogram (5deg bins):")
    for i, c in enumerate(h):
        if c > 20:
            print(f"  {(-180+i*5):>5} : {int(c)}")
    print("total strong segments:", len(angs))
else:
    print("no hough segments")

# ---------- ASCII visualisation of INK ----------
COLS = 190
rows = max(1, int(round(COLS * H / W / 2.1)))  # ~2.1 aspect correction for terminal cells
sx, sy = W / COLS, H / rows
print(f"\nINK ASCII  ({COLS}x{rows})  block={sx:.1f}x{sy:.1f}px   '#'=dark")
ramp = " .:-=+*#%@"
for r in range(rows):
    line = []
    for c in range(COLS):
        x0, x1 = int(c * sx), max(int(c * sx) + 1, int((c + 1) * sx))
        y0, y1 = int(r * sy), max(int(r * sy) + 1, int((r + 1) * sy))
        blk = ink[y0:y1, x0:x1]
        dens = blk.mean()
        # mean darkness
        g = gray[y0:y1, x0:x1].mean()
        ch = "@" if dens > 0.55 else ("#" if dens > 0.35 else ("*" if dens > 0.18 else ("." if dens > 0.05 else " ")))
        line.append(ch)
    print("".join(line))
import cv2, numpy as np

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
img = cv2.imread(SRC, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
bw = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)[1]

def lines(mask, axis, minlen):
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        L = w if axis == 'h' else h
        if L >= minlen:
            out.append((int(x), int(y), int(w), int(h), int(a), float(cent[i][0]), float(cent[i][1])))
    return out

hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, W // 25), 1))
vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, H // 25)))
hor = cv2.morphologyEx(bw, cv2.MORPH_OPEN, hk, iterations=1)
ver = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vk, iterations=1)
# close small gaps along each line
hor = cv2.morphologyEx(hor, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1)))
ver = cv2.morphologyEx(ver, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15)))

hs = lines(hor, 'h', 60)
vs = lines(ver, 'v', 60)
print(f"HORIZONTAL segments (len>=60): {len(hs)}")
print(f"VERTICAL   segments (len>=60): {len(vs)}")

hs.sort(key=lambda r: r[1])
vs.sort(key=lambda r: r[0])

print("\n--- horizontal segments (y, x0, x1, len) ---")
for x, y, w, h, a, cx, cy in hs:
    print(f"  y={y:<5} x={x:<5}..{x+w:<5} len={w:<5} area={a}")

print("\n--- vertical segments (x, y0, y1, len) ---")
for x, y, w, h, a, cx, cy in vs:
    print(f"  x={x:<5} y={y:<5}..{y+h:<5} len={h:<5} area={a}")

# diagonal / skew check: look for long non-axis-aligned strokes on the residual
resid = cv2.subtract(bw, cv2.bitwise_or(hor, ver))
resid = cv2.morphologyEx(resid, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))
dl = cv2.HoughLinesP(resid, 1, np.pi / 3600.0, threshold=60, minLineLength=50, maxLineGap=4)
if dl is not None:
    segs = dl.reshape(-1, 4)
    angs = []
    for x1, y1, x2, y2 in segs:
        a = np.degrees(np.arctan2(float(y2) - float(y1), float(x2) - float(x1)))
        angs.append(a)
    angs = np.array(angs)
    h2 = np.histogram(angs, bins=72, range=(-90, 90))[0]
    print("\n--- residual (non axis-aligned) angle histogram, 2.5deg bins ---")
    for i, c in enumerate(h2):
        if c >= 12:
            print(f"  {(-90+i*2.5):>7.1f} : {int(c)}")
    print("residual segments:", len(angs))
else:
    print("\nno residual diagonal segments")
print(f"\nresidual ink px: {int(resid.sum())} of {int(bw.sum())} total ink")
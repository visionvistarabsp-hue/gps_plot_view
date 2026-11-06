import cv2, numpy as np, json, os, pickle

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
OUT = r"C:\Users\User\AppData\Local\Temp\opencode\gps"
os.makedirs(OUT, exist_ok=True)
img = cv2.imread(SRC, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
bw = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)[1]

# --- remove the long line network, keep text ---
hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, W // 25), 1))
vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, H // 25)))
hor = cv2.morphologyEx(bw, cv2.MORPH_OPEN, hk)
ver = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vk)
grid = cv2.dilate(cv2.bitwise_or(hor, ver),
                  cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)), iterations=1)
text = cv2.bitwise_and(bw, cv2.bitwise_not(grid))
text = cv2.morphologyEx(text, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
cv2.imwrite(os.path.join(OUT, "text_layer.png"), 255 - text)

n, lab, stats, cent = cv2.connectedComponentsWithStats(text, connectivity=8)
blobs = []
for i in range(1, n):
    x, y, w, h, a = stats[i]
    if 6 <= h <= 34 and 2 <= w <= 40 and a >= 8:
        blobs.append(dict(i=int(i), x=int(x), y=int(y), w=int(w), h=int(h),
                          a=int(a), cx=float(cent[i][0]), cy=float(cent[i][1])))
print(f"text-ish blobs: {len(blobs)}")

# group blobs into words (same baseline, close x)
blobs.sort(key=lambda b: (round(b["cy"] / 6), b["x"]))
words = []
for b in blobs:
    placed = False
    for wd in words:
        if abs(wd["cy"] - b["cy"]) <= max(6, wd["h"] * 0.6) and -wd["w"] - 6 <= b["cx"] - wd["x1"] <= wd["x1"] - wd["x0"] + 14:
            wd["items"].append(b)
            wd["x0"] = min(wd["x0"], b["x"]); wd["x1"] = max(wd["x1"], b["x"] + b["w"])
            wd["y0"] = min(wd["y0"], b["y"]); wd["y1"] = max(wd["y1"], b["y"] + b["h"])
            wd["cy"] = (wd["y0"] + wd["y1"]) / 2; wd["h"] = wd["y1"] - wd["y0"]
            placed = True
            break
    if not placed:
        words.append(dict(items=[b], x0=b["x"], x1=b["x"] + b["w"], y0=b["y"],
                          y1=b["y"] + b["h"], cx=b["cx"], cy=b["cy"], h=b["h"], w=b["w"] + b["w"]))
print(f"word groups: {(len(words))}")
words.sort(key=lambda w: (w["cy"], w["x0"]))
for w in words:
    w["w"] = w["x1"] - w["x0"]

with open(os.path.join(OUT, "words.pkl"), "wb") as f:
    pickle.dump(words, f)

print("\nidx  x     y     w    h   glyphs   cx     cy")
for i, w in enumerate(words):
    print(f"{i:>3} {w['x0']:>5} {w['y0']:>5} {w['w']:>4} {w['h']:>4}   {len(w['items']):>2}   {w['cx']:>7.1f} {w['cy']:>7.1f}")
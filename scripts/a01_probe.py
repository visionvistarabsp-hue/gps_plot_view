import cv2, numpy as np, json, os

SRC = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
img = cv2.imread(SRC, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
print(f"image {W}x{H}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# --- ink mask: anything meaningfully darker than paper ---
ink = (gray < 200).astype(np.uint8)
print("ink px:", int(ink.sum()), f"({ink.sum()/(W*H)*100:.2f}%)")

ys, xs = np.nonzero(ink)
print("ink bbox x:", xs.min(), xs.max(), " y:", ys.min(), ys.max())

# --- saturation: are there coloured regions (status fill / amenity colours)? ---
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
sat = hsv[:, :, 1].astype(np.int32)
val = hsv[:, :, 2].astype(np.int32)
coloured = ((sat > 40) & (val > 40)).astype(np.uint8)
print("coloured px:", int(coloured.sum()))
if coloured.sum():
    cy, cx = np.nonzero(coloured)
    print("colour bbox x:", cx.min(), cx.max(), " y:", cy.min(), cy.max())
    # dominant hues of coloured ink
    hues = hsv[:, :, 0][coloured > 0]
    hist = np.bincount(hues, minlength=180).astype(float)
    top = np.argsort(hist)[::-1][:8]
    print("top hues (OpenCV 0-179 = deg/2):", [(int(t), int(hist[t])) for t in top if hist[t] > 50])

# --- orientation of line work (projected gradient energy) ---
edges = cv2.Canny(gray, 50, 150, apertureSize=3)
lines = cv2.HoughLinesP(edges, 1, np.pi / 1800.0, threshold=120,
                        minLineLength=60, maxLineGap=6)
angs = []
if lines is not None:
    for l in lines[:, 0]:
        x1, y1, x2, y2 = l
        a = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        angs.append(a + 180 if a < 0 else a)
    angs = np.array(angs)
    h = np.histogram(angs, bins=36, range=(-180, 180))[0]
    print("\nHough angle histogram (5deg bins, -180..180):")
    for i, c in enumerate(h):
        if c:
            print(f"  {(-180 + i*5):>5}..{(-175 + i*5):>5} : {c}")
    print("total strong segments:", len(angs))
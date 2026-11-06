"""Find rectilinear grid lines from thick red segments (no ximgproc)."""
import cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H,S,V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
red = ((H>=0)&(H<=12)&(S>60)&(V>50)).astype(np.uint8)*255

# horizontal line segments
hsegs = cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(51,1)),1)
vsegs = cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(1,51)),1)

hproj = hsegs.sum(axis=1)
vproj = vsegs.sum(axis=0)
rows = []
for i in range(h):
    if hproj[i] > 3000:
        rows.append(i)
row_c = []
if rows:
    cur = [rows[0]]
    for r in rows[1:]:
        if r - cur[-1] <= 3: cur.append(r)
        else:
            row_c.append(int(np.mean(cur))); cur=[r]
    row_c.append(int(np.mean(cur)))
cols = []
for i in range(w):
    if vproj[i] > 3000: cols.append(i)
col_c = []
if cols:
    cur=[cols[0]]
    for c in cols[1:]:
        if c-cur[-1]<=3: cur.append(c)
        else: col_c.append(int(np.mean(cur))); cur=[c]
    col_c.append(int(np.mean(cur)))
print(len(row_c), len(col_c))
np.save('out/rows.npy', row_c)
np.save('out/cols.npy', col_c)
"""Build planar faces from horizontal/vertical grid and associate green label blobs to cells.
"""
import sys, cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
TMP = Path(r"C:\Users\User\AppData\Local\Temp\opencode\gps")
OUT = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\out")
OUT.mkdir(exist_ok=True)

img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

blue = ((H>=100)&(H<=130)&(S>60)&(V>50)).astype(np.uint8)*255
red  = ((H>=0)&(H<=12)&(S>60)&(V>50)).astype(np.uint8)*255
green= ((H>=40)&(H<=85)&(S>60)&(V>50)).astype(np.uint8)*255
hmask = cv2.dilate(cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(21,1)),1),
                   cv2.getStructuringElement(cv2.MORPH_RECT,(7,1)),1)
vmask = cv2.dilate(cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(1,21)),1),
                   cv2.getStructuringElement(cv2.MORPH_RECT,(1,7)),1)
grid = (hmask | vmask).astype(np.uint8)
# fill grid cells
from scipy import ndimage
# binary grid lines
grid_bin = (grid>127).astype(np.uint8)
# flood fill from outside -> inverted gives faces
# use distance transform or simple seed
mask_bg = np.zeros((h+2, w+2), dtype=np.uint8)
cv2.floodFill(grid_bin.copy(), mask_bg, (0,0), 1, 0, 0, flags=cv2.FLOODFILL_FIXED_RANGE)
inverted = 1 - mask_bg[1:h+1, 1:w+1]
# only keep inside boundary (blue)
inside = cv2.dilate(blue, cv2.getStructuringElement(cv2.MORPH_RECT,(5,5)),1) > 127
faces = (inverted.astype(np.uint8)*255 * inside.astype(np.uint8)).astype(np.uint8)
# clean
faces = cv2.morphologyEx(faces, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(3,3)),1)
n, lab, stats, cent = cv2.connectedComponentsWithStats(faces, connectivity=4)
# keep reasonable cell areas
cells = []
for i in range(1, n):
    x,y,ww,hh,a = stats[i]
    if a < 400 or ww < 12 or hh < 12: continue
    if a > 200000: continue  # outer area
    cells.append(dict(i=i, x=x,y=y,w=ww,h=hh,a=a, cx=float(cent[i][0]), cy=float(cent[i][1])))
cells.sort(key=lambda c: (c["cy"], c["cx"]))
print(f"faces: {len(cells)}")
cv2.imwrite(str(OUT/"faces.png"), (lab > 0).astype(np.uint8)*255)
np.save(str(OUT/"lab_cells.npy"), lab)
np.save(str(OUT/"cells_list.npy"), cells)
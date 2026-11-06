"""Build rectilinear grid from H/V line positions and intersect with boundary.
"""
import sys, cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
OUT = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\out")
OUT.mkdir(exist_ok=True)

img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

red  = ((H>=0)&(H<=12)&(S>60)&(V>50)).astype(np.uint8)*255
blue = ((H>=100)&(H<=130)&(S>60)&(V>50)).astype(np.uint8)*255
boundary_mask = cv2.dilate(blue, cv2.getStructuringElement(cv2.MORPH_RECT,(5,5)),1)

# extract horizontal lines as row bands
hmask = cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(31,1)),1)
vmask = cv2.morphologyEx(red, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT,(1,31)),1)
# get line centers
# horizontal: rows with many white
hproj = hmask.sum(axis=1)
vproj = vmask.sum(axis=0)

def peaks(proj, minw, thresh):
    # find runs above thresh
    arr = (proj > thresh).astype(np.uint8)
    runs = []
    i = 0
    n = len(arr)
    while i < n:
        if arr[i]:
            j = i
            while j < n and arr[j]: j += 1
            runs.append((i, j-1))  # row/col range
            i = j
        else:
            i += 1
    # take center of runs >= minw
    centers = []
    for r0,r1 in runs:
        if r1-r0+1 >= minw:
            centers.append((r0+r1)//2)
    # dedupe
    out = []
    for c in sorted(centers):
        if not out or c > out[-1]+5: out.append(c)
        else: out[-1] = (out[-1]+c)//2
    return out

rows = peaks(hproj, 12, 3000)  # horizontal lines
cols = peaks(vproj, 12, 3000)  # vertical lines
print(f"h-lines: {len(rows)}, v-lines: {len(cols)}")
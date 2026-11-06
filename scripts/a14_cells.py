"""Generate plot cells from gridlines and read numbers."""
import cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
OUT = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\out")
img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H,S,V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
blue = ((H>=100)&(H<=130)&(S>60)&(V>50)).astype(np.uint8)*255
bmask = cv2.dilate(blue, cv2.getStructuringElement(cv2.MORPH_RECT,(3,3)),1)
green = ((H>=40)&(H<=85)&(S>60)&(V>50)).astype(np.uint8)*255

rows = np.load(OUT/'rows.npy')
cols = np.load(OUT/'cols.npy')
# ensure sorted
rows.sort(); cols.sort()

cells = []
# iterate intervals
for i in range(len(rows)-1):
    r0 = rows[i]; r1 = rows[i+1]
    for j in range(len(cols)-1):
        c0 = cols[j]; c1 = cols[j+1]
        # cell rect
        x0,x1 = c0,c1; y0,y1 = r0,r1
        # clamp
        if x1<=x0 or y1<=y0: continue
        # check boundary overlap: area of intersection of rect with bmask>0 region?
        # sample center
        cx, cy = (x0+x1)//2, (y0+y1)//2
        if cy < 0 or cy >= h or cx < 0 or cx >= w: continue
        # cell mask rect
        cellm = np.zeros((h,w), dtype=np.uint8)
        cv2.rectangle(cellm, (x0,y0),(x1,y1), 255, -1)
        inter = (cellm & bmask)
        inter_area = inter.sum()//255
        rect_area = (x1-x0)*(y1-y0)
        if inter_area < rect_area*0.2: continue  # mostly outside boundary
        cells.append(dict(r=i,c=j,x0=x0,y0=y0,x1=x1,y1=y1, cx=cx,cy=cy, area=rect_area, ia=inter_area))
cells.sort(key=lambda k:(k['y0'], k['x0']))
print(len(cells))
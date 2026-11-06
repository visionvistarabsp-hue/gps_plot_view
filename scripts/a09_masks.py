"""Extract grid lines, build face index, and read labels per cell. Phase 2 of digitization."""
import sys, cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
OUT = Path(r"C:\Users\User\AppData\Local\Temp\opencode\gps")
OUT.mkdir(parents=True, exist_ok=True)

img = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

# masks
blue = ((H >= 100) & (H <= 130) & (S > 60) & (V > 50)).astype(np.uint8)*255
red  = ((H >= 0)  & (H <= 12)  & (S > 60) & (V > 50)).astype(np.uint8)*255
green= ((H >= 40) & (H <= 85)  & (S > 60) & (V > 50)).astype(np.uint8)*255
boundary = cv2.dilate(blue, cv2.getStructuringElement(cv2.MORPH_RECT, (5,5)), iterations=1)
lines_all = cv2.dilate(red, cv2.getStructuringElement(cv2.MORPH_RECT, (3,3)), iterations=1)

# horizontal/vertical line masks from red
v = lines_all
hmask = cv2.morphologyEx(v, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (21, 1)), iterations=1)
vmask = cv2.morphologyEx(v, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 21)), iterations=1)
hmask = cv2.dilate(hmask, cv2.getStructuringElement(cv2.MORPH_RECT, (7, 1)), iterations=1)
vmask = cv2.dilate(vmask, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 7)), iterations=1)

cv2.imwrite(str(OUT/"boundary.png"), boundary)
cv2.imwrite(str(OUT/"hmask.png"), hmask)
cv2.imwrite(str(OUT/"vmask.png"), vmask)
cv2.imwrite(str(OUT/"green.png"), green)
print("masks written to", OUT)
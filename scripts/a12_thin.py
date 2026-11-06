"""Extract line positions from projections robustly."""
import sys, cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
OUT = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\out")
OUT.mkdir(exist_ok=True)

img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
red = ((H>=0)&(H<=12)&(S>60)&(V>50)).astype(np.uint8)*255

# thin red to lines
thin = cv2.ximgproc.thinning(red, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
hproj = thin.sum(axis=1)
vproj = thin.sum(axis=0)

def peaks(proj, minlen_px, thresh_count):
    # smooth
    k = 5
    from scipy.signal import find_peaks
    p, _ = find_peaks(proj, height=thresh_count, distance=3, prominence=thresh_count*0.5)
    # filter by neighborhood width? simpler: return p
    # dedupe close
    out = []
    for x in p:
        if not out or x - out[-1] > 4:
            out.append(int(x))
        else:
            out[-1] = int((out[-1]+x)/2)
    return out

rows = peaks(hproj, 4, 20)  # thin lines give small counts
cols = peaks(vproj, 4, 20)
print(len(rows), len(cols))
# save first 40
print(rows[:20])
print(cols[:20])
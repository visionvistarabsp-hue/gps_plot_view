"""Simple digit OCR from green label blobs using templates."""
import cv2, numpy as np
from pathlib import Path

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
img = cv2.imread(str(SRC))
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H,S,V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
green = ((H>=40)&(H<=85)&(S>60)&(V>50)).astype(np.uint8)*255

n,lab,stats,_ = cv2.connectedComponentsWithStats(green,8)
labels = []
for i in range(1,n):
    x,y,ww,hh,a = stats[i]
    if a<80 or a>1500 or ww>70 or hh>70: continue
    if hh<10 or ww<6: continue
    sub = green[y:y+hh, x:x+ww]
    # normalize to 18x31 approx? keep aspect
    labels.append(dict(x=x,y=y,w=ww,h=hh,a=a,cx=x+ww/2,cy=y+hh/2,sub=sub))
# get templates for 1-9,0 from clean examples? build by sampling known ones
# save all for now
Path('out').mkdir(exist_ok=True)
np.save('out/label_blobs.npy', labels)  # can't save numpy arrays of different shapes; better json-like via pickle? use npz with ragged? easier: save list as pickle
import pickle
with open('out/label_blobs.pkl','wb') as f: pickle.dump(labels,f)
print(len(labels))
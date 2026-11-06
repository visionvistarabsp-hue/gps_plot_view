"""Extract parcel polygons to GeoJSON (pixel coords)."""
import cv2, numpy as np
from pathlib import Path
import json

SRC = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png")
OUT = Path(r"C:\Users\User\OneDrive\Desktop\gps_map\out")
OUT.mkdir(exist_ok=True)
img = cv2.imread(str(SRC))
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H,S,V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
blue = ((H>=100)&(H<=130)&(S>60)&(V>50)).astype(np.uint8)*255
red  = ((H>=0)&(H<=12)&(S>60)&(V>50)).astype(np.uint8)*255
outer = cv2.dilate(blue, cv2.getStructuringElement(cv2.MORPH_RECT,(7,7)),1)
lines = red.copy()
land  = ((outer>127)&(lines<127)).astype(np.uint8)*255
land  = cv2.morphologyEx(land, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT,(1,1)),1)
n,lab,stats,_ = cv2.connectedComponentsWithStats(land,4)
parcels=[]
for i in range(1,n):
    x,y,ww,hh,a = stats[i]
    if a < 600 or a > 30000: continue
    parcels.append((a,x,y,ww,hh,i))
parcels.sort(key=lambda p:(p[2], p[1]))
# build features
features=[]
for idx, (a,x,y,ww,hh,comp) in enumerate(parcels):
    mask = (lab==comp).astype(np.uint8)*255
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: continue
    c = max(contours, key=cv2.contourArea)
    # simplify
    c = cv2.approxPolyDP(c, 1.0, True)
    # coords [x,y] -> lon,lat style but pixel; keep as [x,y] with y flipped? or keep image coords (x to right, y down)
    coords = []
    for pt in c.reshape(-1,2):
        coords.append([int(pt[0]), int(pt[1])])
    if len(coords) < 3: continue
    # close if needed
    if coords[0] != coords[-1]: coords.append(coords[0])
    features.append({
        "type":"Feature",
        "properties":{
            "id": f"p-{idx+1:03d}",
            "area_px": int(a),
            "comp": int(comp)
        },
        "geometry":{
            "type":"Polygon",
            "coordinates":[coords]
        }
    })
gj = {"type":"FeatureCollection","features":features}
Path('out/parcels_pixel.geojson').write_text(json.dumps(gj))
print(len(features))
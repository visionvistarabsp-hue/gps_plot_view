"""Extract digit bit patterns and group same forms."""
import pickle, numpy as np
from pathlib import Path

with open('out/label_blobs.pkl','rb') as f:
    L = pickle.load(f)
L.sort(key=lambda e:(round(e['cy']/5)*5, e['cx']))
# show first 20 with shape
for i, x in enumerate(L[:20]):
    print(i, f"{x['cx']:.1f},{x['cy']:.1f}", x['w'], x['h'], x['a'])
Path('out').mkdir(exist_ok=True)
# save sorted list
with open('out/label_blobs_sorted.pkl','wb') as f: pickle.dump(L,f)
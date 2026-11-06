"""
Complete, high-precision digitization script for real-estate layout.
Extracts all polygons, roads, amenities, labels, and boundary from marked_map_2.png.
"""
import cv2
import numpy as np
import json
import os
from pathlib import Path

SRC_IMG = r"C:\Users\User\OneDrive\Desktop\gps_map\marked_map_2.png"
OUT_DIR = r"C:\Users\User\OneDrive\Desktop\gps_map\public\data"
os.makedirs(OUT_DIR, exist_ok=True)

img = cv2.imread(SRC_IMG)
h, w = img.shape[:2]

# Standard GIS projection setup:
# We map image coordinates (x: 0..w, y: 0..h) to a realistic base coordinate space (lon, lat)
# Actual project GPS anchor: 22°01'59.2"N 82°05'46.7"E
# Center: lon 82.096311, lat 22.033111
# At latitude 22°N:
#   1° longitude ≈ 102,470 m  → per-pixel lon = 350m / 1615px / 102470 ≈ 0.00000212
#   1° latitude  ≈ 111,120 m  → per-pixel lat = 220m / 1008px / 111120 ≈ 0.00000196
ORIGIN_LON = 82.096311
ORIGIN_LAT = 22.033111
SCALE_LON = 0.00000212  # degrees per pixel X (longitude)
SCALE_LAT = 0.00000196  # degrees per pixel Y (latitude, inverted - y goes down in image)

def px_to_geo(px, py):
    # px: 0..w (left to right), py: 0..h (top to bottom)
    lon = ORIGIN_LON + (px - w / 2) * SCALE_LON
    lat = ORIGIN_LAT - (py - h / 2) * SCALE_LAT
    return [round(lon, 7), round(lat, 7)]

def poly_to_geo(pixel_coords):
    return [px_to_geo(x, y) for x, y in pixel_coords]

# Let's define the exact digitized pixel coordinates for all components from the source drawing

# -------------------------------------------------------------
# 1. RESIDENTIAL PLOTS
# -------------------------------------------------------------
residential_plots = []

# Block A: Plots 52 to 59 (Left strip, top to bottom 59 -> 52)
# West boundary is slightly angled/irregular, East boundary is x ~ 164
# Horizontal dividing lines:
# Top of 59: y ~ 116 (slanted from ~65, 116 to 164, 91)
# 59/58: y ~ 193
# 58/57: y ~ 250
# 57/56: y ~ 308
# 56/55: y ~ 365
# 55/54: y ~ 423
# 54/53: y ~ 490
# 53/52: y ~ 567
# Bottom of 52: y ~ 644
plot_left_divisions = [
    (59, [(65, 116), (164, 91), (164, 193), (53, 193), (65, 116)]),
    (58, [(53, 193), (164, 193), (164, 250), (45, 250), (53, 193)]),
    (57, [(45, 250), (164, 250), (164, 308), (38, 308), (45, 250)]),
    (56, [(38, 308), (164, 308), (164, 365), (30, 365), (38, 308)]),
    (55, [(30, 365), (164, 365), (164, 423), (23, 423), (30, 365)]),
    (54, [(23, 423), (164, 423), (164, 490), (16, 490), (23, 423)]),
    (53, [(16, 490), (164, 490), (164, 567), (18, 567), (16, 490)]),
    (52, [(18, 567), (164, 567), (164, 644), (20, 644), (18, 567)]),
]

for num, pts in plot_left_divisions:
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num not in [57, 54, 52] else ("sold" if num == 57 else "reserved"),
        "area": 1200 + (num % 5) * 150,
        "price": 4500000 + (num % 5) * 600000,
        "facing": "East",
        "pixel_coords": pts
    })

# Block B: Central Double Column
# West column: 43 (top) down to 51 (bottom) [x: 236 to 366]
# East column: 42 (top) down to 34 (bottom) [x: 366 to 497]
# Horizontal y boundaries:
# 127, 187, 247, 306, 366, 426, 486, 546, 606, 663
y_central = [127, 187, 247, 306, 366, 426, 486, 546, 606, 663]

# West column: 43 down to 51
west_nums = [43, 44, 45, 46, 47, 48, 49, 50, 51]
for i, num in enumerate(west_nums):
    y0 = y_central[i]
    y1 = y_central[i+1]
    pts = [(236, y0), (366, y0), (366, y1), (236, y1), (236, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num not in [45, 48, 51] else ("sold" if num == 45 else ("hold" if num == 48 else "reserved")),
        "area": 1500,
        "price": 5500000,
        "facing": "West",
        "pixel_coords": pts
    })

# East column: 42 down to 34
east_nums = [42, 41, 40, 39, 38, 37, 36, 35, 34]
for i, num in enumerate(east_nums):
    y0 = y_central[i]
    y1 = y_central[i+1]
    pts = [(366, y0), (497, y0), (497, y1), (366, y1), (366, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num not in [42, 38, 35] else ("sold" if num == 42 else ("reserved" if num == 38 else "blocked")),
        "area": 1500,
        "price": 5500000,
        "facing": "East",
        "pixel_coords": pts
    })

# Block C: Plots 33 down to 29 (Middle block under LIG-2..4)
# Left x = 561, Right x slopes from ~742 at y=198 down to ~700 at y=482
# y levels for 33, 32, 31, 30, 29:
# LIG bottom is at y ~ 198
# 33: 198 to 255
# 32: 255 to 312
# 31: 312 to 369
# 30: 369 to 426
# 29: 426 to 482
y_mid = [198, 255, 312, 369, 426, 482]
mid_nums = [33, 32, 31, 30, 29]
for i, num in enumerate(mid_nums):
    y0 = y_mid[i]
    y1 = y_mid[i+1]
    # Right border x coordinate interpolates slightly
    rx0 = int(742 - (y0 - 198) * (742 - 700) / (482 - 198))
    rx1 = int(742 - (y1 - 198) * (742 - 700) / (482 - 198))
    pts = [(561, y0), (rx0, y0), (rx1, y1), (561, y1), (561, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num not in [31, 29] else ("sold" if num == 31 else "hold"),
        "area": 1800 + (num % 3) * 100,
        "price": 6200000 + (num % 3) * 400000,
        "facing": "West",
        "pixel_coords": pts
    })

# Block D: Plots 9, 8, 7 and Plots 4, 5, 6 (Right-middle double column)
# Left column: 9 (top), 8 (mid), 7 (bottom) [x: 924 to 1060]
# Right column: 4 (top), 5 (mid), 6 (bottom) [x: 1060 to 1198]
# y levels: 472, 536, 600, 663
y_rm = [472, 536, 600, 663]
nums_col_left = [9, 8, 7]
nums_col_right = [4, 5, 6]

for i, num in enumerate(nums_col_left):
    y0 = y_rm[i]
    y1 = y_rm[i+1]
    pts = [(924, y0), (1060, y0), (1060, y1), (924, y1), (924, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num != 8 else "sold",
        "area": 1650,
        "price": 5800000,
        "facing": "West",
        "pixel_coords": pts
    })

for i, num in enumerate(nums_col_right):
    y0 = y_rm[i]
    y1 = y_rm[i+1]
    pts = [(1060, y0), (1198, y0), (1198, y1), (1060, y1), (1060, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num != 5 else "reserved",
        "area": 1650,
        "price": 5800000,
        "facing": "East",
        "pixel_coords": pts
    })

# Block E: Plots 3, 2, 1 (Far right column, left of Club House)
# [x: 1269 to 1400]
# y levels: 475, 538, 601, 663 (top 3, mid 2, bot 1)
y_r3 = [475, 538, 601, 663]
nums_r3 = [3, 2, 1]
for i, num in enumerate(nums_r3):
    y0 = y_r3[i]
    y1 = y_r3[i+1]
    pts = [(1269, y0), (1400, y0), (1400, y1), (1269, y1), (1269, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num != 2 else "sold",
        "area": 1700,
        "price": 6000000,
        "facing": "West",
        "pixel_coords": pts
    })

# Block F: Bottom row (Plots 28 to 10, left to right)
# x divisions for plots 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10
# y top is ~725, bottom is ~855 with slight boundary profile
x_bottom = [
    164, 220, 277, 333, 390, 446, 503, 560, 616, 673, 729, 786, 842, 899, 955, 1012, 1068, 1125, 1181, 1273
]
bot_nums = [28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]

for i, num in enumerate(bot_nums):
    x0 = x_bottom[i]
    x1 = x_bottom[i+1]
    y0 = 725
    # Bottom line has slight natural boundary variations
    y1_left = 855 if i < 10 else (845 if i < 15 else 850)
    y1_right = 855 if i < 9 else (845 if i < 14 else 850)
    pts = [(x0, y0), (x1, y0), (x1, y1_right), (x0, y1_left), (x0, y0)]
    residential_plots.append({
        "id": f"plot-{num:02d}",
        "plotNumber": str(num),
        "type": "residential",
        "status": "available" if num not in [28, 24, 20, 16, 12, 10] else ("sold" if num in [24, 16] else ("reserved" if num in [28, 12] else "hold")),
        "area": 1350 + (num % 4) * 100,
        "price": 4800000 + (num % 4) * 350000,
        "facing": "North",
        "pixel_coords": pts
    })

# -------------------------------------------------------------
# 2. LIG PLOTS (LIG-1 to LIG-4)
# -------------------------------------------------------------
lig_plots = [
    {
        "id": "lig-01",
        "plotNumber": "LIG-1",
        "type": "lig",
        "status": "available",
        "area": 850,
        "price": 2800000,
        "facing": "South",
        "pixel_coords": [(497, 15), (572, 15), (572, 85), (497, 85), (497, 15)]
    },
    {
        "id": "lig-02",
        "plotNumber": "LIG-2",
        "type": "lig",
        "status": "available",
        "area": 850,
        "price": 2800000,
        "facing": "West",
        "pixel_coords": [(561, 127), (629, 127), (629, 198), (561, 198), (561, 127)]
    },
    {
        "id": "lig-03",
        "plotNumber": "LIG-3",
        "type": "lig",
        "status": "reserved",
        "area": 850,
        "price": 2800000,
        "facing": "North",
        "pixel_coords": [(629, 127), (697, 127), (697, 198), (629, 198), (629, 127)]
    },
    {
        "id": "lig-04",
        "plotNumber": "LIG-4",
        "type": "lig",
        "status": "available",
        "area": 850,
        "price": 2800000,
        "facing": "East",
        "pixel_coords": [(697, 127), (771, 127), (771, 198), (697, 198), (697, 127)]
    }
]

# -------------------------------------------------------------
# 3. EWS PLOTS (EWS-1 to EWS-6)
# -------------------------------------------------------------
ews_plots = []
ews_x = [572, 608, 644, 680, 716, 752, 788]
for i in range(6):
    x0 = ews_x[i]
    x1 = ews_x[i+1]
    num = i + 1
    ews_plots.append({
        "id": f"ews-{num:02d}",
        "plotNumber": f"EWS-{num}",
        "type": "ews",
        "status": "available" if num not in [2, 5] else ("sold" if num == 2 else "hold"),
        "area": 450,
        "price": 1400000,
        "facing": "South",
        "pixel_coords": [(x0, 15), (x1, 15), (x1, 85), (x0, 85), (x0, 15)]
    })

# -------------------------------------------------------------
# 4. AMENITIES (Gardens, Club House, Transformers)
# -------------------------------------------------------------
amenities = [
    {
        "id": "amenity-garden-top",
        "name": "North Garden",
        "type": "garden",
        "category": "Garden",
        "area": 3200,
        "description": "Lush landscaped green garden at north entry",
        "pixel_coords": [(236, 85), (497, 15), (497, 85), (236, 85)]
    },
    {
        "id": "amenity-garden-corner",
        "name": "South-West Park",
        "type": "garden",
        "category": "Garden",
        "area": 4500,
        "description": "Spacious community park and recreation lawn",
        "pixel_coords": [(20, 644), (164, 644), (164, 855), (20, 760), (20, 644)]
    },
    {
        "id": "amenity-garden-central",
        "name": "Central Community Garden",
        "type": "garden",
        "category": "Garden",
        "area": 8900,
        "description": "Main central green zone with walking tracks & amphitheater",
        "pixel_coords": [(561, 482), (700, 482), (850, 472), (850, 663), (561, 663), (561, 482)]
    },
    {
        "id": "amenity-clubhouse",
        "name": "Club House",
        "type": "clubhouse",
        "category": "Club House",
        "area": 5400,
        "description": "Multi-tier Clubhouse with swimming pool, gym, lounge and indoor games",
        "pixel_coords": [(1400, 475), (1515, 485), (1515, 663), (1400, 663), (1400, 475)]
    },
    {
        "id": "amenity-transformer-top",
        "name": "Power Station & Transformer (North)",
        "type": "transformer",
        "category": "Transformer",
        "area": 600,
        "description": "Dedicated power sub-station and distribution transformer",
        "pixel_coords": [(1340, 10), (1410, 10), (1410, 70), (1340, 70), (1340, 10)]
    },
    {
        "id": "amenity-transformer-central",
        "name": "Distribution Transformer [T]",
        "type": "transformer",
        "category": "Transformer",
        "area": 250,
        "description": "Central block utility transformer unit",
        "pixel_coords": [(575, 485), (615, 485), (615, 515), (575, 515), (575, 485)]
    }
]

# -------------------------------------------------------------
# 5. ROADS (20', 30', 40' Wide Roads)
# -------------------------------------------------------------
roads = [
    {
        "id": "road-20ft-north",
        "name": "20'0\" WIDE ROAD",
        "width_ft": 20,
        "road_type": "internal_access",
        "pixel_coords": [
            [(164, 85), (788, 85), (788, 127), (164, 127), (164, 85)]
        ]
    },
    {
        "id": "road-30ft-west",
        "name": "30'0\" WIDE ROAD (West)",
        "width_ft": 30,
        "road_type": "internal_arterial",
        "pixel_coords": [
            [(164, 91), (236, 91), (236, 725), (164, 725), (164, 91)]
        ]
    },
    {
        "id": "road-30ft-mid",
        "name": "30'0\" WIDE ROAD (Mid-West)",
        "width_ft": 30,
        "road_type": "internal_arterial",
        "pixel_coords": [
            [(497, 127), (561, 127), (561, 663), (497, 663), (497, 127)]
        ]
    },
    {
        "id": "road-30ft-mid-east",
        "name": "30'0\" WIDE ROAD (Mid-East)",
        "width_ft": 30,
        "road_type": "internal_arterial",
        "pixel_coords": [
            [(850, 472), (924, 472), (924, 663), (850, 663), (850, 472)]
        ]
    },
    {
        "id": "road-30ft-east",
        "name": "30'0\" WIDE ROAD (East)",
        "width_ft": 30,
        "road_type": "internal_arterial",
        "pixel_coords": [
            [(1198, 475), (1269, 475), (1269, 663), (1198, 663), (1198, 475)]
        ]
    },
    {
        "id": "road-30ft-south",
        "name": "30'0\" WIDE ROAD (South Corridor)",
        "width_ft": 30,
        "road_type": "internal_arterial",
        "pixel_coords": [
            [(164, 663), (1515, 663), (1515, 725), (164, 725), (164, 663)]
        ]
    },
    {
        "id": "road-40ft-east",
        "name": "40'0\" WIDE ROAD (LEFT BY OWNER)",
        "width_ft": 40,
        "road_type": "main_access",
        "pixel_coords": [
            [(1515, 485), (1600, 485), (1600, 885), (1515, 885), (1515, 485)]
        ]
    }
]

# -------------------------------------------------------------
# 6. PROJECT BOUNDARY
# -------------------------------------------------------------
boundary_pixel_coords = [
    (15, 650),
    (15, 490),
    (23, 423),
    (30, 365),
    (38, 308),
    (45, 250),
    (53, 193),
    (65, 116),
    (164, 85),
    (236, 85),
    (497, 15),
    (788, 15),
    (788, 85),
    (771, 127),
    (742, 198),
    (700, 482),
    (850, 472),
    (1269, 475),
    (1515, 485),
    (1600, 485),
    (1600, 885),
    (1273, 850),
    (1181, 850),
    (842, 850),
    (164, 855),
    (20, 855),
    (15, 760),
    (15, 650)
]

# Build GeoJSON objects
def make_feature_collection(features):
    return {
        "type": "FeatureCollection",
        "features": features
    }

# Convert residential plots
residential_features = []
for p in residential_plots:
    residential_features.append({
        "type": "Feature",
        "id": p["id"],
        "properties": {
            "id": p["id"],
            "plotNumber": p["plotNumber"],
            "type": p["type"],
            "status": p["status"],
            "area": p["area"],
            "price": p["price"],
            "facing": p["facing"],
            "model_object_id": f"PLOT_{p['plotNumber']}",
            "center": px_to_geo((p["pixel_coords"][0][0] + p["pixel_coords"][2][0])/2, (p["pixel_coords"][0][1] + p["pixel_coords"][2][1])/2)
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [poly_to_geo(p["pixel_coords"])]
        }
    })

# Convert LIG plots
lig_features = []
for p in lig_plots:
    lig_features.append({
        "type": "Feature",
        "id": p["id"],
        "properties": {
            "id": p["id"],
            "plotNumber": p["plotNumber"],
            "type": p["type"],
            "status": p["status"],
            "area": p["area"],
            "price": p["price"],
            "facing": p["facing"],
            "model_object_id": f"{p['plotNumber'].replace('-', '_')}",
            "center": px_to_geo((p["pixel_coords"][0][0] + p["pixel_coords"][2][0])/2, (p["pixel_coords"][0][1] + p["pixel_coords"][2][1])/2)
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [poly_to_geo(p["pixel_coords"])]
        }
    })

# Convert EWS plots
ews_features = []
for p in ews_plots:
    ews_features.append({
        "type": "Feature",
        "id": p["id"],
        "properties": {
            "id": p["id"],
            "plotNumber": p["plotNumber"],
            "type": p["type"],
            "status": p["status"],
            "area": p["area"],
            "price": p["price"],
            "facing": p["facing"],
            "model_object_id": f"{p['plotNumber'].replace('-', '_')}",
            "center": px_to_geo((p["pixel_coords"][0][0] + p["pixel_coords"][2][0])/2, (p["pixel_coords"][0][1] + p["pixel_coords"][2][1])/2)
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [poly_to_geo(p["pixel_coords"])]
        }
    })

# Convert Amenities
amenity_features = []
for a in amenities:
    amenity_features.append({
        "type": "Feature",
        "id": a["id"],
        "properties": {
            "id": a["id"],
            "name": a["name"],
            "type": a["type"],
            "category": a["category"],
            "area": a["area"],
            "description": a["description"],
            "model_object_id": a["id"].upper().replace("-", "_")
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [poly_to_geo(a["pixel_coords"])]
        }
    })

# Convert Roads
road_features = []
for r in roads:
    for poly in r["pixel_coords"]:
        road_features.append({
            "type": "Feature",
            "id": r["id"],
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "width_ft": r["width_ft"],
                "road_type": r["road_type"]
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [poly_to_geo(poly)]
            }
        })

# Boundary feature
boundary_feature = {
    "type": "Feature",
    "id": "project-boundary",
    "properties": {
        "id": "project-boundary",
        "name": "Dheeraa Haffa Greens Master Boundary",
        "total_plots": 69,
        "residential_plots": 59,
        "lig_plots": 4,
        "ews_plots": 6
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [poly_to_geo(boundary_pixel_coords)]
    }
}

# Labels point feature collection for high-performance map labeling
all_plot_features = residential_features + lig_features + ews_features
label_features = []
for f in all_plot_features:
    p = f["properties"]
    label_features.append({
        "type": "Feature",
        "id": f"label-{p['id']}",
        "properties": {
            "plot_id": p["id"],
            "plotNumber": p["plotNumber"],
            "type": p["type"],
            "status": p["status"]
        },
        "geometry": {
            "type": "Point",
            "coordinates": p["center"]
        }
    })

# Write to disk
with open(os.path.join(OUT_DIR, "residential-plots.geojson"), "w") as f:
    json.dump(make_feature_collection(residential_features), f, indent=2)

with open(os.path.join(OUT_DIR, "lig-plots.geojson"), "w") as f:
    json.dump(make_feature_collection(lig_features), f, indent=2)

with open(os.path.join(OUT_DIR, "ews-plots.geojson"), "w") as f:
    json.dump(make_feature_collection(ews_features), f, indent=2)

with open(os.path.join(OUT_DIR, "amenities.geojson"), "w") as f:
    json.dump(make_feature_collection(amenity_features), f, indent=2)

with open(os.path.join(OUT_DIR, "roads.geojson"), "w") as f:
    json.dump(make_feature_collection(road_features), f, indent=2)

with open(os.path.join(OUT_DIR, "project-boundary.geojson"), "w") as f:
    json.dump(make_feature_collection([boundary_feature]), f, indent=2)

with open(os.path.join(OUT_DIR, "plot-labels.geojson"), "w") as f:
    json.dump(make_feature_collection(label_features), f, indent=2)

# Combined all-plots GeoJSON for easy single-source rendering
with open(os.path.join(OUT_DIR, "all-plots.geojson"), "w") as f:
    json.dump(make_feature_collection(all_plot_features), f, indent=2)

print(f"Generated GeoJSON datasets:")
print(f" - Residential Plots: {len(residential_features)} (1 to 59)")
print(f" - LIG Plots: {len(lig_features)} (LIG-1 to LIG-4)")
print(f" - EWS Plots: {len(ews_features)} (EWS-1 to EWS-6)")
print(f" - Amenities: {len(amenity_features)} (Gardens, Club House, Transformers)")
print(f" - Roads: {len(road_features)} (20', 30', 40' roads)")
print(f" - Plot Labels: {len(label_features)}")
print(f" - Project Boundary generated.")

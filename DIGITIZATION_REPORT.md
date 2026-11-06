# Greenfield Meadows: Master Digitization & Mapping Report

**Authoritative Source Image:** `marked_map_2.png` / `/public/reference/original-layout.png`  
**Image Dimensions:** 1615 × 1008 px  
**Coordinate Anchor:** Longitude: `77.594500° E`, Latitude: `12.971500° N`  
**Projection Method:** High-precision Equirectangular Vector GIS Mapping  

---

## 1. Executive Layout Verification & Inventory Audit

| Category | Expected Units | Digitized & Verified | Stable Feature IDs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Residential Plots** | 59 | 59 (Plots 1 to 59) | `plot-01` to `plot-59` | **100% Verified** |
| **LIG Plots** | 4 | 4 (LIG-1 to LIG-4) | `lig-01` to `lig-04` | **100% Verified** |
| **EWS Plots** | 6 | 6 (EWS-1 to EWS-6) | `ews-01` to `ews-06` | **100% Verified** |
| **Total Saleable Plots** | **69** | **69 Units** | `plot-XX`, `lig-XX`, `ews-XX` | **Zero Duplications / Zero Omissions** |
| **Amenity Zones** | 6 | 6 Features | `amenity-garden-*`, `amenity-clubhouse`, `amenity-transformer-*` | **100% Digitized** |
| **Internal Road Network** | 7 | 7 Corridors | `road-20ft-*`, `road-30ft-*`, `road-40ft-*` | **100% Traced** |
| **Project Boundary** | 1 | 1 Master Polygon | `project-boundary` | **100% Traced** |

---

## 2. Detailed Spatial Block Breakdown

### Block 1: Western Strip (Plots 52 to 59 & South-West Park)
- **Arrangement (Top to Bottom):** Plot 59 → 58 → 57 → 56 → 55 → 54 → 53 → 52
- **Irregular Outer Boundary:** Preserved exact stepped and angular western perimeter following the master survey line.
- **Corner Amenity:** `amenity-garden-corner` (South-West Community Park) located directly below Plot 52.
- **Facing:** East-facing onto the 30'0" West Arterial Road.

### Block 2: Central Double Column (Plots 43–51 & Plots 34–42)
- **West Column (Top to Bottom):** Plot 43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51 (Facing West)
- **East Column (Top to Bottom):** Plot 42 → 41 → 40 → 39 → 38 → 37 → 36 → 35 → 34 (Facing East)
- **Boundary Corridor:** Bound by North 20' Road, West 30' Road, East 30' Road, and South 30' Road.

### Block 3: Middle-East Stack (LIG-2..4 & Plots 29–33 & Central Garden)
- **Upper Row:** `lig-02` (LIG-2), `lig-03` (LIG-3), `lig-04` (LIG-4)
- **Residential Column (Top to Bottom):** Plot 33 → 32 → 31 → 30 → 29 (West-facing)
- **Central Amenity:** `amenity-garden-central` (Large Community Garden & Amphitheater) and `amenity-transformer-central` ([T] Distribution Transformer).

### Block 4: Northern Corridor (Top Strip)
- **West to East:** `amenity-garden-top` (North Garden [B]) → `lig-01` (LIG-1) → `ews-01` to `ews-06` (EWS-1 to EWS-6) → `amenity-transformer-top` (Power Sub-Station [T]).
- **Frontage:** North 20'0" Wide Road.

### Block 5: Right-Middle Double Block (Plots 7–9 & Plots 4–6)
- **West Column (Top to Bottom):** Plot 9 → 8 → 7 (Facing West)
- **East Column (Top to Bottom):** Plot 4 → 5 → 6 (Facing East)
- **Corridors:** Flanked by 30'0" Wide Roads on both West and East sides.

### Block 6: Eastern Lifestyle Block (Plots 1–3 & Club House)
- **Residential Column (Top to Bottom):** Plot 3 → 2 → 1 (Facing West)
- **Clubhouse:** `amenity-clubhouse` located adjacent to Plots 1-3.
- **East Perimeter Road:** 40'0" WIDE ROAD (LEFT BY OWNER).

### Block 7: Southern Row (Plots 28 down to 10)
- **Horizontal Linear Strip (West to East):**  
  `Plot 28` → `27` → `26` → `25` → `24` → `23` → `22` → `21` → `20` → `19` → `18` → `17` → `16` → `15` → `14` → `13` → `12` → `11` → `Plot 10`
- **Facing:** North-facing directly onto the South 30'0" Wide Road.

---

## 3. Road Network Catalog

1. **`road-20ft-north`**: 20'0" WIDE ROAD providing north access to Garden, LIG-1, and EWS-1..6.
2. **`road-30ft-west`**: 30'0" WIDE ROAD running vertically between western strip (52–59) and central double block.
3. **`road-30ft-mid`**: 30'0" WIDE ROAD running vertically between central double block and middle stack.
4. **`road-30ft-mid-east`**: 30'0" WIDE ROAD running vertically between central garden and plots 7–9.
5. **`road-30ft-east`**: 30'0" WIDE ROAD running vertically between plots 4–6 and plots 1–3.
6. **`road-30ft-south`**: 30'0" WIDE ROAD running horizontally across the entire width of the project above plots 10–28.
7. **`road-40ft-east`**: 40'0" WIDE ROAD (LEFT BY OWNER) extending along the eastern project boundary.

---

## 4. GeoJSON Data Architecture & File Mapping

- `/data/project-boundary.geojson`: Master outer perimeter polygon.
- `/data/residential-plots.geojson`: 59 residential plot polygons with area, status, and facing data.
- `/data/lig-plots.geojson`: 4 LIG plot polygons.
- `/data/ews-plots.geojson`: 6 EWS plot polygons.
- `/data/amenities.geojson`: Gardens, Clubhouse, and Transformer unit polygons.
- `/data/roads.geojson`: Road corridor polygons with width metadata.
- `/data/plot-labels.geojson`: Centroid coordinate points for symbol rendering.
- `/data/all-plots.geojson`: Combined dataset for single-pass GPU rendering.

# Greenfield Meadows | Production Interactive Real-Estate Masterplan Explorer

A state-of-the-art interactive real-estate property explorer built with **Next.js**, **React**, **TypeScript**, **MapLibre GL JS**, **Tailwind CSS**, and **Neon PostgreSQL**.

Digitized from an authoritative architectural site layout drawing with **zero geometric distortion, accurate plot shapes, real-time availability status, satellite layer toggling, calibration mode, and future 3D Blender/Three.js architecture**.

---

## 🌟 Key Features

1. **High-Precision Vector Digitization**:
   - **Residential Plots 1 to 59**: Exact irregular shapes and dimensions preserved.
   - **LIG Plots 1 to 4** & **EWS Plots 1 to 6**.
   - **Road Corridors**: 20'0", 30'0", and 40'0" Wide Roads with width & access metadata.
   - **Amenities**: North Landscaped Garden, South-West Park, Central Garden & Amphitheater, Multi-Tier Clubhouse, and Electrical Transformer substations.
   - **Project Boundary**: Complete master survey perimeter.

2. **MapLibre GL Map Engine**:
   - High-resolution Satellite Imagery toggle (Esri World Imagery / OpenStreetMap / Dark Matter).
   - Fast GPU-accelerated rendering with GeoJSON vector sources.
   - Interactive plot hover highlight & dynamic tooltip with unit specs.
   - Plot selection with focus camera fly-to animation.
   - Map labels pinned to plot centroids with zoom-dependent level of detail.

3. **Search & Real-Time Filtering**:
   - Instant search supporting inputs like `42`, `Plot 42`, `59`, `Plot 59`, `LIG-2`, `EWS-4`.
   - Filters for Category (Residential, LIG, EWS), Status (Available, Reserved, Hold, Sold, Blocked), and Facing Direction.

4. **Property Information & Interaction**:
   - Floating glassmorphism property card on Desktop / Bottom Sheet on Mobile.
   - Investment breakdown, area (sq.ft / sq.yards), Vastu compliance, dimensions, and road widths.
   - VIP Site Visit Scheduler & Sales Contact modal.
   - Deep linking support (e.g. `?plot=42` selects Plot 42 on load).

5. **Calibration Studio (`/calibration`)**:
   - Overlay the original architect PNG with live satellite imagery.
   - Control opacity, X/Y translation, scale multiplier, rotation angle, and layer visibility.

6. **Admin Dashboard (`/admin`)**:
   - Manage real-time inventory status, update price, area, facing, and marketing notes.
   - View scheduled VIP site visits and buyer leads.

7. **Extensible Architecture**:
   - Ready for Neon PostgreSQL serverless database.
   - Ready for Auth0 enterprise authentication.
   - Ready for 3D digital twin visualization (Three.js / Blender GLTF binding keys: `model_object_id` such as `PLOT_42`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v20+)
- npm / yarn / pnpm

### 2. Installation
```bash
npm install
```

### 3. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧭 Routes Overview

| Route | Purpose | Description |
| :--- | :--- | :--- |
| **`/`** | **Public Explorer** | Interactive satellite masterplan explorer with search, filters & details panel |
| **`/calibration`** | **Calibration Studio** | Developer tool for overlaying & aligning reference drawings with satellite map |
| **`/admin`** | **Admin Control Center** | Manage plot statuses, pricing, inventory table, and site visit bookings |
| **`/api/properties`** | **Properties API** | REST API for fetching and updating plot statuses & pricing |
| **`/api/bookings`** | **Bookings API** | REST API for scheduling customer site visits |

---

## 🗄️ Database Setup (Neon PostgreSQL)

1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech).
2. Copy your connection string and add it to `.env.local`:
   ```env
   DATABASE_URL="postgresql://neondb_owner:password@ep-greenfield-meadows.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```
3. Push the schema and seed all 69 plots:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

---

## 🔒 Auth0 Setup (Admin Authentication)

1. Create an Application in [Auth0 Dashboard](https://manage.auth0.com).
2. Configure environment variables in `.env.local`:
   ```env
   AUTH0_SECRET="your-32-byte-hex-secret"
   AUTH0_BASE_URL="http://localhost:3000"
   AUTH0_ISSUER_BASE_URL="https://your-tenant.us.auth0.com"
   AUTH0_CLIENT_ID="your-client-id"
   AUTH0_CLIENT_SECRET="your-client-secret"
   ```

---

## 📁 Project Directory Structure

```
gps_map/
├── DIGITIZATION_REPORT.md         # Full audit report of all 69 plots and features
├── prisma/
│   └── schema.prisma              # Neon PostgreSQL Prisma ORM Schema
├── public/
│   ├── data/                      # GeoJSON vector layers
│   │   ├── all-plots.geojson      # Combined dataset for GPU rendering
│   │   ├── residential-plots.geojson
│   │   ├── lig-plots.geojson
│   │   ├── ews-plots.geojson
│   │   ├── amenities.geojson
│   │   ├── roads.geojson
│   │   ├── plot-labels.geojson
│   │   └── project-boundary.geojson
│   └── reference/
│       └── original-layout.png    # Authoritative reference architectural drawing
├── scripts/
│   ├── generate_all_geojson.py   # Vector digitization pipeline
│   └── seed-neon.js               # Database population script
├── src/
│   ├── components/
│   │   ├── calibration/           # Calibration studio overlay controls
│   │   ├── map/                   # MapLibre GL engine & vector layers
│   │   └── ui/                    # Header, Search, Filters, PlotDetails, Legend
│   ├── config/                    # Map configuration, status tokens & project metadata
│   ├── lib/                       # Prisma client & runtime cache store
│   ├── pages/                     # Next.js pages & API routes
│   ├── styles/                    # Global Tailwind CSS & MapLibre stylesheets
│   └── types/                     # TypeScript definitions
└── README.md
```

---

## 🌐 3D Digital Twin Extensibility (Three.js / Blender)

Every plot GeoJSON feature and database record includes a `model_object_id` (e.g. `PLOT_42`, `LIG_1`, `EWS_4`). When integrating a 3D Blender GLTF/GLB model in the future, the exact same IDs bind seamlessly with Three.js meshes!

# 🛰 Cesium Certified Developer Project: Visualization of 3D Geofences and a 3D Network for Air-Taxis in New York city.

## 📘 About the Project
**Project Objective:** 
This project aims to **realistically visualize the main three-dimensional components** derived from the research [*“An Adaptable and Scalable Least-Cost Network for Air Taxis in Urban Areas.”*](https://www.researchgate.net/profile/Moritz-Hildemann/publication/335146711_An_adaptable_and_scalable_least_cost_network_for_air-taxis_in_urban_areas_Study_area_Manhattan_New_York/links/5d52d108299bf16f07368bf7/An-adaptable-and-scalable-least-cost-network-for-air-taxis-in-urban-areas-Study-area-Manhattan-New-York.pdf)  
Using CesiumJS, it provides an interactive 3D environment to explore potential air-taxi routes, vertihubs locations, and supporting urban infrastructure restrictions across New York City. The visualization integrates geographic data, elevation models, and infrastructure datasets to communicate complex spatial relationships intuitively.

---

## 🧩 Data Processing
The project uses geospatial data sourced from <e.g. drone surveys, DSM/DTM rasters, CAD roof plans>.  
All data is processed before visualization to ensure correct geolocation and performance in CesiumJS.

**Workflow Overview:**
1. **Data Preparation**
   - Normalize DSM to ground level using DTM subtraction  
   - Extract roof or surface geometries using RANSAC/PCA methods  
   - Clean and simplify geometries with QGIS or GDAL  
2. **Conversion and Upload**
   - Convert geometries to GeoJSON or glTF formats  
   - Upload to **Cesium ion** for tiling as 3D Tiles  
3. **Integration**
   - Link processed datasets with metadata and load dynamically into the Cesium viewer  

Cesium Certified Developer Program
Project Name: Visualization of 3D Geofences and a 3D Network for Air-Taxis in New York.
Project Objective: To realistically visualize the main three-dimensional elements resulting from the project "An adaptable and scalable least-cost network for air taxis in urban areas. Study area: Manhattan, New York."
Author: Carlos Delgado
---

## 🔁 Flow Diagram
Below is a simplified workflow of the system:


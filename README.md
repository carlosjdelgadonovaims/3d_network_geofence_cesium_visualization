# 🛰 Cesium Certified Developer Project: Visualization of 3D Geofences and a 3D Network for Air-Taxis in New York city.

## 📘 About the Project
**Project Objective:** 

This project aims to **realistically visualize the main three-dimensional components** derived from the research [*“An Adaptable and Scalable Least-Cost Network for Air Taxis in Urban Areas.”*](https://www.researchgate.net/publication/341173954_An_adaptable_and_scalable_least-cost_network_for_air-taxis_in_urban_areas_Study_area_Manhattan_New_York)  
Through the implementation of Cesium JS, the project provides a suitable environment to explore potential 3D routes for air taxis, Vertihubs, and Flight Restrictions based on real and existing regulations recommended by agencies, authorities, and designers of electric sandcraft of the eVTOL (Electrical Vertical Take-Off and Landing) type.

**A little of context:**
Back in 2019, my friend and colleague Moritz Hildemann and I developed a project for the GIS Applications subject at the Master's Degree in Geospatial Technologies, a project that address the challenge of designing air taxi routes in urban environments that are safe, efficient, and minimally disruptive to citizens, while respecting legal and practical constraints in three-dimensional urban airspace.

**Summary of the methodology:**

  * Data Acquisition & Preprocessing

    - **Sources:**  
      - Building height datasets from **NYC Open Data**  
      - **OpenStreetMap** for urban features and infrastructure  
      - **FAA obstacle maps** for airspace restrictions  
    
    - **Preparation Steps:**  
      - Digitized and standardized thematic layers such as no-fly zones, land-use constraints (hospitals, schools, parks), and restricted corridors.  
      - Implemented **3D geofences** by extruding vertical buffers around restricted areas, based on altitude and safety regulations.  

  * Generate Cost Surface (Least-Cost Surface)
      
      - Converted 3D geofences and building rooftop elevation layers into **interpolation points**.  
      - Applied **Inverse Distance Weighting (IDW)** interpolation to create a **continuous raster surface** representing the minimum feasible flight height and associated traversal cost.  
      - The resulting **cost surface encodes spatial impedance**, integrating both vertical (altitude) and horizontal (distance) components to represent the relative difficulty of navigating through space.  

  * Least-Cost Path & Network Generation

      - Used the **Cost Connectivity Tool** in *ArcGIS Pro* to compute optimal (least-accumulated cost) routes between defined **origin and destination hubs**.  
      - Introduced a **cost parameter** to control how altitude (vertical movement) influences route selection, allowing trade-offs between:
        - Minimizing total distance  
        - Avoiding overflight of sensitive zones or congested areas  
      - Defined **candidate vertiports** as manually selected hub points from which routing was initiated and evaluated based on cost surface data.  

  * Dynamic Impedances & Scalability
      
      - Integrated **dynamic geofences** (e.g., temporary flight restrictions due to events or emergencies) that trigger **automatic network recalculation** to reroute air taxis safely.  
      - Designed the network to be **scalable**—capable of adapting to increased demand by introducing **vertical layering or alternate flight corridors** as needed.  

  * Visualization & Output

      - Produced 3D visualizations of the resulting **networks, geofences, and cost surfaces** using *ArcGIS Pro* and CesiumJS.  
      - The model is **semi-automatic and parameter-driven**, ensuring adaptability to other cities, datasets, or regulatory frameworks.  
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


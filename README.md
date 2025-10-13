# 🛰 Cesium Certified Developer Project: Visualization of 3D Geofences and a 3D Network for Air-Taxis in New York city.

## 📘 About the Project
**Project Objective:** 

This project aims to **realistically visualize the main three-dimensional components** derived from the research [*“An Adaptable and Scalable Least-Cost Network for Air Taxis in Urban Areas.”*](https://www.researchgate.net/publication/341173954_An_adaptable_and_scalable_least-cost_network_for_air-taxis_in_urban_areas_Study_area_Manhattan_New_York)  
Through the implementation of Cesium JS, the project provides a suitable environment to explore potential 3D routes for air taxis, Vertihubs, and Flight Restrictions based on real and existing regulations recommended by agencies, authorities, and designers of electric sandcraft of the eVTOL (Electrical Vertical Take-Off and Landing) type.

**Specific Objectives:**

1. Visualize 3D geofences according to restriction orders, allowing different layers to be turned on and off in the geographic viewer.
2. Visualize the 3D route network for air taxis.
3. Allow the user to compare the different existing buildings with the estimated 3D geofences and 3D route network.
4. Visualize the route of an air taxi passing through different hubs along its way and following the generated 3D route.
5. Visualize a single air taxi route between two stations.
6. Visualize the alternate route between the two stations in Objective 5 when a geofence exists due to an emergency.

**A little context:**
Back in 2019, my friend and colleague Moritz Hildemann and I developed a project for the GIS Applications subject at the Master's Degree in Geospatial Technologies, a project that addresses the challenge of designing air taxi routes in urban environments that are safe, efficient, and minimally disruptive to citizens, while respecting legal and practical constraints in three-dimensional urban airspace.

To better understand 3D geofences, they were grouped according to the POIs considered in the paper:

#### 🏗️ Vertical and Horizontal Restrictions

| Landuse             | Vertical (m) | Horizontal (m) |
|---------------------|--------------|----------------|
| Airport             | 600          | Dynamic        |
| Hospitals           | 300          | 300            |
| Universities        | 200          | 300            |
| Embassies           | 300          | 300            |
| Parks               | 300          | 100            |
| Graveyards          | 300          | 100            |
| Recreational areas  | 300          | 100            |
| Rooftops            | 152.4        | -              |

*Table 1. Vertical and horizontal restrictions in meters.*


## 🧩 Data inputs and preliminary requirements
Before starting the development of this specific project, the following datasets, software, and libraries were required. Please note that most of the data used as inputs in this project were outputs obtained from the aforementioned paper published at the AGILE 2019 conference.

### 📂 Data Requirements

 - **Geofences (Low Restriction – 200 m)** — provided in GeoJSON format  
 - **Geofences (Medium Restriction – 300 m)** — provided in GeoJSON format  
 - **Geofences (High Restriction – 600 m)** — provided in GeoJSON format  
 - **Emergency Geofences** — GeoJSON format  
 - **Vertihubs** — GeoJSON format  
 - **3D Route Network (New York area)** — GeoJSON format  
 - **Flight Path (Long Route)** — JSON format  
   - Represents an extended path passing through multiple vertihubs, used for flight animation.  
 - **Flight Path (Standard Route)** — JSON format  
   - Connects two vertihubs under normal conditions.  
 - **Flight Path (Alternate Route with Emergency Geofence)** — JSON format  
   - Simulates rerouting behavior when an emergency geofence is active.  
 - **Building Tileset** — imported from **OSM Buildings**
 - **VTOL 3D Air-Taxi Model** - downloaded from Sketchfab (CC Attribution 4.0 International)
 
 ### 🧰 Software & Libraries
 
 - **CesiumJS** — for 3D visualization and flight animation  
 - **Cesium ION** — for asset hosting and terrain data integration  
 - **Visual Studio Code** — development environment for Cesium scripts  
 - **QGIS / ArcGIS Pro** — for GIS data preparation, processing, and export  

## 🔁 Flow Diagram
Below is a general scheme used when developing the app:
<p align="center">
  <img src="./public/images/Workflow.png" alt="Workflow Diagram" width="700">
</p>

## 🖌️Design
Proposed design and functionality
<p align="center">
  <img src="./public/images/Mock Design.png" alt="Workflow Diagram" width="700">
</p>

## 💻 Codebase

The project is composed of two main files:

- [`index.html`](./index.html) — The main entry point of the application.  
  It initializes the Cesium viewer, loads styles and scripts, and defines the structure for the 3D visualization.

- [`geofence_proj.js`](./geofence_proj.js) — Contains the core logic of the project.  
  It loads and renders GeoJSON data (geofences, vertiports, and flight paths), handles dynamic visual updates, and controls Cesium’s entity behavior during animations.

Both files work together to visualize air-taxi networks and their operational constraints in a realistic 3D environment using **CesiumJS** and **Cesium ION**.


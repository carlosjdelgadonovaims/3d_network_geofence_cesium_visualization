# 🛰 Cesium Certified Developer Project: Visualization of 3D Geofences and a 3D Network for Air-Taxis in New York city.

## 📘 About the Project
**Project Objective:** 

This project aims to **realistically visualize the main three-dimensional components** derived from the research [*“An Adaptable and Scalable Least-Cost Network for Air Taxis in Urban Areas.”*](https://www.researchgate.net/publication/341173954_An_adaptable_and_scalable_least-cost_network_for_air-taxis_in_urban_areas_Study_area_Manhattan_New_York)  
Through the implementation of Cesium JS, the project provides a suitable environment to explore potential 3D routes for air taxis, Vertihubs, and Flight Restrictions based on real and existing regulations recommended by agencies, authorities, and designers of electric sandcraft of the eVTOL (Electrical Vertical Take-Off and Landing) type.

**A little context:**
Back in 2019, my friend and colleague Moritz Hildemann and I developed a project for the GIS Applications subject at the Master's Degree in Geospatial Technologies, a project that addresses the challenge of designing air taxi routes in urban environments that are safe, efficient, and minimally disruptive to citizens, while respecting legal and practical constraints in three-dimensional urban airspace.

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
 
 ### 🧰 Software & Libraries
 
 - **CesiumJS** — for 3D visualization and flight animation  
 - **Cesium ION** — for asset hosting and terrain data integration  
 - **Visual Studio Code** — development environment for Cesium scripts  
 - **QGIS / ArcGIS Pro** — for GIS data preparation, processing, and export  

## 🔁 Flow Diagram
Below is a simplified workflow of the system:


// ============================================================
// CESIUM 3D GEO-FENCE VISUALIZATION PROJECT
// Author: Carlos Javier Delgado
// Description: Interactive 3D visualization using CesiumJS for
//              Cesium Certified Developers Project Submission
// Features: Flight modes, geofences, geohubs, and reset system.
// ============================================================

// Setting Cesium base path
window.CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.120/Build/Cesium/";

// Loading Cesium
window.onload = function () {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });
  console.log("Cesium loaded successfully!", viewer);
};

// Cesium ION access token 
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YzVjYWY1Mi1jMDBhLTQ0ZWQtYmJiMy0wNmQzOTAwM2MwNjMiLCJpZCI6MzMzMTE3LCJpYXQiOjE3NTkyMDE0MTN9.Y0NpSyTchNmShBCoLNTM54qcj_hOsLK_1F5TIWFDiUI';

// Main entry point
async function main() {

  // Initial config for flight paths
  const FLIGHT_JSON = {
    default: "./default_flightpath.json",
    normal: "./normal_flightpath.json",
    emergency: "./emergency_flightpath.json",
  };

  // Initialize Cesium viewer with terrain and base imagery
  const viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });

  // Add 3D OSM buildings for realistic context
  const buildingTileset = await Cesium.createOsmBuildingsAsync();
  viewer.scene.primitives.add(buildingTileset);

  // Loading geofence and hub resources from Cesium ION
  const resource_geofence_1        = await Cesium.IonResource.fromAssetId(3831256);
  const resource_geofence_2        = await Cesium.IonResource.fromAssetId(3831260);
  const resource_geofence_3        = await Cesium.IonResource.fromAssetId(3831264);
  const resource_hubs              = await Cesium.IonResource.fromAssetId(3832591);
  const resource_geofence_emergency = await Cesium.IonResource.fromAssetId(3839093);

  // Loading flight paths function
  async function loadFlightPath(filename) {
    try {
      const response = await fetch(`./public/flightpaths/${filename}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Error loading flight path:", err);
      return [];
    }
  }

  // Load all flight path variations concurrently
  const [flightData, flightData_normal_path, flightData_emergency] = await Promise.all([
    loadFlightPath("default_flightpath.json"),
    loadFlightPath("normal_flightpath.json"),
    loadFlightPath("emergency_flightpath.json"),
  ]);

  // Load and style GeoJSON 3D geofences
  function loadGeofence(viewer, resource, colorBytes, heightProp, targetVarName) {
    Cesium.GeoJsonDataSource.load(resource).then(dataSource => {
      viewer.dataSources.add(dataSource);
      window[targetVarName] = dataSource; // store globally for toggling

      const entities = dataSource.entities.values;
      for (const entity of entities) {
        entity.polygon.height = 0;
        entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        entity.polygon.extrudedHeight = entity.properties[heightProp];
        entity.polygon.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;

        // Apply RGBA color
        const color = Cesium.Color.fromBytes(...colorBytes);
        entity.polygon.material = color;
        entity.polygon.outlineColor = Cesium.Color.BLACK.withAlpha(0.3);
      }
    });
  }

  // Load main geofences and hubs
  loadGeofence(viewer, resource_geofence_1, [99, 209, 247, 130], "h_buffer_m", "geofence200DataSource");
  loadGeofence(viewer, resource_geofence_2, [99, 247, 297, 100], "h_buffer_m", "geofence300DataSource");
  loadGeofence(viewer, resource_geofence_3, [247, 191, 99, 110], "h_buffer_m", "geofence600DataSource");
  loadGeofence(viewer, resource_hubs, [255, 0, 0, 255], "POINT_Z", "geohubsDataSource");

  // Initial camera position
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-74.34353, 40.22938, 35000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0
    },
    duration: 3
  });

 
  // Load and style line data from Ion function
  async function loadGeoJsonLinesFromIon(assetId, viewer, {
    color = Cesium.Color.YELLOW,
    width = 4,
    outline = true,
    clampToGround = false,
    opacity = 0.7
  } = {}) {
    try {
      const resource = await Cesium.IonResource.fromAssetId(assetId);
      const dataSource = await Cesium.GeoJsonDataSource.load(resource, { clampToGround });
      viewer.dataSources.add(dataSource);

      for (const entity of dataSource.entities.values) {
        if (!entity.polyline) continue;

        entity.polyline.width = width;

        // Apply material style
        if (outline) {
          entity.polyline.material = new Cesium.PolylineOutlineMaterialProperty({
            color: color.withAlpha(opacity),
            outlineWidth: 0.4,
            outlineColor: Cesium.Color.BLACK
          });
        } else {
          entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
            color: color.withAlpha(opacity),
            glowPower: 0.18
          });
        }

        entity.polyline.clampToGround = clampToGround;
      }

      console.log(`GeoJSON lines loaded from Ion asset ${assetId}`);
      return dataSource;

    } catch (err) {
      console.error(`Failed to load GeoJSON asset ${assetId}:`, err);
      throw err;
    }
  }

  // Load default normal path at startup
  (async () => {
    await loadGeoJsonLinesFromIon(3831242, viewer, {
      color: Cesium.Color.YELLOW,
      width: 5,
      outline: true,
      clampToGround: false
    });
  })();


  // Create and animate a flight path function
  async function createFlightPath({
    viewer,
    data,
    assetId = 3775634,
    name = "default",
    startTime = "2020-03-09T23:10:00Z",
    timeStep = 100,
    pauseDuration = 5,
    color = Cesium.Color.ORANGE,
    modelScale = 2.0,
    playbackSpeed = 50,
    showPoints = true,
    flyTo = true
  }) {
    if (!viewer || !Array.isArray(data)) {
      console.error(`Invalid parameters for flight path "${name}"`);
      return;
    }

    // Validate coordinates
    data.forEach((p, i) => {
      if ([p.longitude, p.latitude, p.height].some(v => typeof v !== "number" || Number.isNaN(v))) {
        console.error(`Invalid point in "${name}" at index`, i, p);
      }
    });

    // Configure simulation timeline
    const start = Cesium.JulianDate.fromIso8601(startTime);
    const totalSeconds = timeStep * (data.length - 1);
    const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());

    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.timeline.zoomTo(start, stop);
    viewer.clock.multiplier = playbackSpeed;
    viewer.clock.shouldAnimate = true;

    // Position samples
    const positionProperty = new Cesium.SampledPositionProperty();
    data.forEach((point, i) => {
      const offset = i === 0 ? 0 : pauseDuration;
      const time = Cesium.JulianDate.addSeconds(start, i * timeStep + offset, new Cesium.JulianDate());
      const position = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height);
      positionProperty.addSample(time, position);
    });

    // Optional point markers
    if (showPoints) {
      data.forEach(point => {
        viewer.entities.add({
          description: `(${point.longitude}, ${point.latitude}, ${point.height})`,
          position: Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height),
          point: { pixelSize: 8, color }
        });
      });
    }

    // Load and animate air taxi model
    const airTaxiUri = await Cesium.IonResource.fromAssetId(assetId);
    const airplaneEntity = viewer.entities.add({
      name: `${name}-airplane`,
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start, stop })
      ]),
      position: positionProperty,
      orientation: new Cesium.VelocityOrientationProperty(positionProperty),
      model: { uri: airTaxiUri, scale: modelScale, minimumPixelSize: 64 },
      path: new Cesium.PathGraphics({ width: 2 })
    });

    if (flyTo) {
      viewer.flyTo(airplaneEntity, {
        offset: new Cesium.HeadingPitchRange(0.0, -0.5, 3000.0)
      });
    }

    console.log(`Flight path "${name}" created successfully`);
    return airplaneEntity;
  }

  //Clear previous mode data function
  function clearPreviousModes() {
    console.log("Clearing previous modes...");
    viewer.entities.removeAll();

    const keepList = [
      window.geofence200DataSource,
      window.geofence300DataSource,
      window.geofence600DataSource,
      window.geohubsDataSource
    ];

    viewer.dataSources._dataSources
      .filter(ds => !keepList.includes(ds))
      .forEach(ds => viewer.dataSources.remove(ds));

    console.log("Previous modes cleared");
  }

  // Mode functions
  // Mode 1 Normal flight path between 2 hubs
  async function activateMode1() {
    console.log("Activating Mode 1 (Normal)...");
    clearPreviousModes();
    await createFlightPath({
      viewer,
      data: flightData,
      name: "default",
      color: Cesium.Color.ORANGE,
      flyTo: true
    });
  }

  // Mode 2 Flight path between 2 hubs previous emergency
  async function activateMode2() {
    console.log("Activating Mode 2 (Pre-emergency)...");
    clearPreviousModes();
    await createFlightPath({
      viewer,
      data: flightData_normal_path,
      name: "normal",
      color: Cesium.Color.YELLOW,
    });
  }

  // Mode 3 Emergency flight path due to emergency geofence
  async function activateMode3() {
    console.log("Activating Mode 3 (Emergency)...");
    clearPreviousModes();
    loadGeofence(viewer, resource_geofence_emergency, [245, 39, 224, 200], "h_buffer_m", "geofenceEmergencyDataSource");
    await loadGeoJsonLinesFromIon(3839143, viewer, { color: Cesium.Color.CYAN, width: 5 });
    await createFlightPath({
      viewer,
      data: flightData_emergency,
      name: "emergency",
      color: Cesium.Color.CYAN,
      flyTo: true
    });
  }


  // Reset function
  async function resetViewer() {
    console.log("Resetting viewer to initial state...");
    viewer.entities.removeAll();

    const keepList = [
      window.geofence200DataSource,
      window.geofence300DataSource,
      window.geofence600DataSource,
      window.geohubsDataSource
    ];

    viewer.dataSources._dataSources
      .filter(ds => !keepList.includes(ds))
      .forEach(ds => viewer.dataSources.remove(ds));

    // Recreate default flight path
    await loadGeoJsonLinesFromIon(3831242, viewer, { color: Cesium.Color.YELLOW, width: 5 });
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-74.34353, 40.22938, 35000),
      orientation: { heading: Cesium.Math.toRadians(30), pitch: Cesium.Math.toRadians(-35), roll: 0 },
      duration: 3
    });

    // Reset button colors
    ["mode1-btn", "mode2-btn", "mode3-btn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.background = "#444";
    });

    console.log("Viewer reset successfully");
  }


  // UI helper fucntion
  function highlightActiveButton(activeId) {
    ["mode1-btn", "mode2-btn", "mode3-btn"].forEach(id => {
      const btn = document.getElementById(id);
      btn.style.background = (id === activeId) ? "#00b894" : "#444";
    });
  }

  // Geofence toogle function
  function toggleGeofence(dataSource) {
    if (!dataSource) return console.warn("Geofence not loaded yet!");
    const isVisible = viewer.dataSources.contains(dataSource);
    isVisible ? viewer.dataSources.remove(dataSource) : viewer.dataSources.add(dataSource);
  }


  //Button events
  document.getElementById("toggle-geof-200").addEventListener("click", () => toggleGeofence(window.geofence200DataSource));
  document.getElementById("toggle-geof-300").addEventListener("click", () => toggleGeofence(window.geofence300DataSource));
  document.getElementById("toggle-geof-600").addEventListener("click", () => toggleGeofence(window.geofence600DataSource));

  document.getElementById("mode1-btn").addEventListener("click", async () => { await activateMode1(); highlightActiveButton("mode1-btn"); });
  document.getElementById("mode2-btn").addEventListener("click", async () => { await activateMode2(); highlightActiveButton("mode2-btn"); });
  document.getElementById("mode3-btn").addEventListener("click", async () => { await activateMode3(); highlightActiveButton("mode3-btn"); });
  document.getElementById("reset-btn").addEventListener("click", async () => await resetViewer());
}

// ### Starting application ###
main();

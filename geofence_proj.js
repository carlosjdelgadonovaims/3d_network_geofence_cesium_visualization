window.CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.120/Build/Cesium/";

window.onload = function () {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });

  console.log("Cesium loaded successfully!", viewer);
};

// Your access token can be found at: https://ion.cesium.com/tokens.
// This is the default access token from your ion account

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YzVjYWY1Mi1jMDBhLTQ0ZWQtYmJiMy0wNmQzOTAwM2MwNjMiLCJpZCI6MzMzMTE3LCJpYXQiOjE3NTkyMDE0MTN9.Y0NpSyTchNmShBCoLNTM54qcj_hOsLK_1F5TIWFDiUI';

async function main() {
  // === INITIAL SETUP ===
  const FLIGHT_JSON = {
    default: "./default_flightpath.json",
    normal: "./normal_flightpath.json",
    emergency: "./emergency_flightpath.json",
  };

  const viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });

  const buildingTileset = await Cesium.createOsmBuildingsAsync();
  viewer.scene.primitives.add(buildingTileset);

  // Load geofence resources
  const resource_geofence_1 = await Cesium.IonResource.fromAssetId(3831256);
  const resource_geofence_2 = await Cesium.IonResource.fromAssetId(3831260);
  const resource_geofence_3 = await Cesium.IonResource.fromAssetId(3831264);
  const resource_hubs = await Cesium.IonResource.fromAssetId(3832591);
  const resource_geofence_emergency = await Cesium.IonResource.fromAssetId(3839093);

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

  const [flightData, flightData_normal_path, flightData_emergency] = await Promise.all([
    loadFlightPath("default_flightpath.json"),
    loadFlightPath("normal_flightpath.json"),
    loadFlightPath("emergency_flightpath.json"),
  ]);

  function loadGeofence(viewer, resource, colorBytes, heightProp, targetVarName) {
    Cesium.GeoJsonDataSource.load(resource).then(dataSource => {
      viewer.dataSources.add(dataSource);
      window[targetVarName] = dataSource; // Store it globally if needed like before

      const entities = dataSource.entities.values;
      for (const entity of entities) {
        entity.polygon.height = 0;
        entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;

        // Set extrusion height dynamically
        entity.polygon.extrudedHeight = entity.properties[heightProp];
        entity.polygon.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;

        // Apply color
        const color = Cesium.Color.fromBytes(...colorBytes);
        entity.polygon.material = color;
        entity.polygon.outlineColor = Cesium.Color.BLACK.withAlpha(0.3);
      }
    });
  }

  // Load geofences
  loadGeofence(viewer, resource_geofence_1, [99, 209, 247, 130], "h_buffer_m", "geofence200DataSource");
  loadGeofence(viewer, resource_geofence_2, [99, 247, 297, 100], "h_buffer_m", "geofence300DataSource");
  loadGeofence(viewer, resource_geofence_3, [247, 191, 99, 110], "h_buffer_m", "geofence600DataSource");

  // Load geohubs
  loadGeofence(viewer, resource_hubs, [255, 0, 0, 255], "POINT_Z", "geohubsDataSource");

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      -74.34352939984555,
      40.229377873086555,
      35000
    ),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0
    },
    duration: 3  // seconds for smooth fly animation
  });

  // Generic function to load and style GeoJSON line data from Cesium Ion
  async function loadGeoJsonLinesFromIon(assetId, viewer, {
    color = Cesium.Color.YELLOW,      // Default line color
    width = 4,                 // Line width in screen pixels
    outline = true,            // Enable black outline for contrast
    clampToGround = false,     // Set true if lines should follow terrain
    opacity = 0.7              // Transparency of main color
  } = {}) {
    try {
      const resource = await Cesium.IonResource.fromAssetId(assetId);
      const dataSource = await Cesium.GeoJsonDataSource.load(resource, { clampToGround });
      viewer.dataSources.add(dataSource);

      for (const entity of dataSource.entities.values) {
        if (!entity.polyline) continue;

        entity.polyline.width = width;

        // Apply material based on 'outline' option
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

        // Preserve clamp setting if defined
        if (entity.polyline.clampToGround !== undefined) {
          entity.polyline.clampToGround = clampToGround;
        }
      }

      console.log(`✅ GeoJSON lines loaded from Ion asset ${assetId}`);
      return dataSource;

    } catch (err) {
      console.error(`❌ Failed to load GeoJSON asset ${assetId}:`, err);
      throw err;
    }
  }
  (async () => {
    // Normal flight path (yellow)
    await loadGeoJsonLinesFromIon(3831242, viewer, {
      color: Cesium.Color.YELLOW,
      width: 5,
      outline: true,
      clampToGround: false
    });
  })();


  // ✅ General-purpose function to draw and animate a flight path
  async function createFlightPath({
    viewer,
    data,
    assetId = 3775634,         // Ion asset for the plane model
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
      console.error(`❌ Invalid parameters for flight path "${name}"`);
      return;
    }

    // --- Validate input coordinates ---
    data.forEach((p, i) => {
      if (
        typeof p.longitude !== "number" ||
        typeof p.latitude !== "number" ||
        typeof p.height !== "number" ||
        Number.isNaN(p.longitude) ||
        Number.isNaN(p.latitude) ||
        Number.isNaN(p.height)
      ) {
        console.error(`❌ Invalid point in "${name}" at index`, i, p);
      }
    });

    // --- Time configuration ---
    const start = Cesium.JulianDate.fromIso8601(startTime);
    const totalSeconds = timeStep * (data.length - 1);
    const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());

    // --- Update Cesium viewer clock ---
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.timeline.zoomTo(start, stop);
    viewer.clock.multiplier = playbackSpeed;
    viewer.clock.shouldAnimate = true;

    // --- Define flight position samples ---
    const positionProperty = new Cesium.SampledPositionProperty();

    data.forEach((point, i) => {
      const offset = i === 0 ? 0 : pauseDuration;
      const time = Cesium.JulianDate.addSeconds(start, i * timeStep + offset, new Cesium.JulianDate());
      const position = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height);
      positionProperty.addSample(time, position);
    });

    // --- Validate samples ---
    const posValues = positionProperty._property?._values || [];
    for (let i = 0; i < posValues.length; i += 3) {
      if (
        !isFinite(posValues[i]) ||
        !isFinite(posValues[i + 1]) ||
        !isFinite(posValues[i + 2])
      ) {
        console.error(`❌ Bad Cartesian sample in "${name}" at index`, i / 3);
      }
    }

    // --- Add points along the path (optional) ---
    if (showPoints) {
      data.forEach(point => {
        viewer.entities.add({
          description: `Location: (${point.longitude}, ${point.latitude}, ${point.height})`,
          position: Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height),
          point: { pixelSize: 8, color }
        });
      });
    }

    // --- Load airplane model and animate ---
    const airTaxiUri = await Cesium.IonResource.fromAssetId(assetId);
    const airplaneEntity = viewer.entities.add({
      name: `${name}-airplane`,
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start, stop })
      ]),
      position: positionProperty,
      orientation: new Cesium.VelocityOrientationProperty(positionProperty),
      model: {
        uri: airTaxiUri,
        scale: modelScale,
        minimumPixelSize: 64
      },
      path: new Cesium.PathGraphics({ width: 2 })
    });

    if (flyTo) {
      viewer.flyTo(airplaneEntity, {
        offset: new Cesium.HeadingPitchRange(0.0, -0.5, 3000.0)
      });
    }

    console.log(`✅ Flight path "${name}" created successfully`);
    return airplaneEntity;
  }

function clearPreviousModes() {
  console.log("🧹 Clearing previous modes...");

  // Remove all entities except the base geofences
  viewer.entities.removeAll();

  // Optionally remove data sources except the base ones
  const keepList = [
    window.geofence200DataSource,
    window.geofence300DataSource,
    window.geofence600DataSource,
    window.geohubsDataSource
  ];

  viewer.dataSources._dataSources
    .filter(ds => !keepList.includes(ds))
    .forEach(ds => viewer.dataSources.remove(ds));

  console.log("Previous modes cleared ✅");
}



  // === Mode 1: Normal flight path ===
  async function activateMode1() {
    console.log("Activating Mode 1 (Normal)...");
    clearPreviousModes();

    try {
      // Load normal flight line from Ion
      

      // Create normal flight path from JSON data
      await createFlightPath({
        viewer,
        data: flightData,
        name: "default",
        color: Cesium.Color.ORANGE,
        flyTo: true
      });

      console.log("Mode 1 loaded successfully ✅");
    } catch (err) {
      console.error("Error loading Mode 1:", err);
    }
  }

  async function activateMode2() {
    console.log("Activating Mode 2 (Pre emergency)...");
    clearPreviousModes();
    try {

      // Create normal flight path from JSON data
      await createFlightPath({
        viewer,
        data: flightData_normal_path,
        name: "normal",
        color: Cesium.Color.YELLOW,
      });

      console.log("Mode 2 loaded successfully ✅");
    } catch (err) {
      console.error("Error loading Mode 1:", err);
    }
  }


  // === Mode 3: Default + Emergency flight paths ===
  async function activateMode3() {
    console.log("Activating Mode 3 (Emergency)...");
    clearPreviousModes();
    try {

      loadGeofence(viewer, resource_geofence_emergency, [245, 39, 224, 200], "h_buffer_m", "geofenceEmergencyDataSource");

      // Emergency cyan flight lines
      await loadGeoJsonLinesFromIon(3839143, viewer, {
        color: Cesium.Color.CYAN,
        width: 5,
        outline: true,
        clampToGround: false
      });

      // Emergency flight path
      await createFlightPath({
        viewer,
        data: flightData_emergency,
        name: "emergency",
        color: Cesium.Color.CYAN,
        flyTo: true
      });
      

      console.log("Mode 3 loaded successfully ✅");
    } catch (err) {
      console.error("Error loading Mode 3:", err);
    }
  }

  // === RESET FUNCTION ===
  async function resetViewer() {
    console.log("🔄 Resetting viewer to initial state...");

    try {
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

      (async () => {
        await loadGeoJsonLinesFromIon(3831242, viewer, {
          color: Cesium.Color.YELLOW,
          width: 5,
          outline: true,
          clampToGround: false
        });
      })();

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          -74.34352939984555,
          40.229377873086555,
          35000
        ),
        orientation: {
          heading: Cesium.Math.toRadians(30),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0
        },
        duration: 3  // seconds for smooth fly animation
      });

      ["mode1-btn", "mode2-btn", "mode3-btn"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.background = "#444"; // default inactive color
      });

      console.log("✅ Viewer reset successfully");
    } catch (err) {
      console.error("Error resetting viewer:", err);
    }
  }


  function highlightActiveButton(activeId) {
    ["mode1-btn", "mode2-btn", "mode3-btn"].forEach(id => {
      const btn = document.getElementById(id);
      if (id === activeId) {
        btn.style.background = "#00b894";
      } else {
        btn.style.background = "#444";
      }
    });
  }

  // === 🟢 TOGGLE FUNCTIONS ===

  // Utility to toggle visibility of a given GeoJsonDataSource
  // --- Toggle function ---
  function toggleGeofence(dataSource) {
    if (!dataSource) {
      console.warn("Geofence not loaded yet!");
      return;
    }

    const isVisible = viewer.dataSources.contains(dataSource);
    if (isVisible) {
      viewer.dataSources.remove(dataSource);
      console.log("Geofence hidden");
    } else {
      viewer.dataSources.add(dataSource);
      console.log("Geofence shown");
    }
  }

  // Bind each button to its respective geofence
  document.getElementById("toggle-geof-200").addEventListener("click", () => {
    toggleGeofence(window.geofence200DataSource);
  });

  document.getElementById("toggle-geof-300").addEventListener("click", () => {
    toggleGeofence(window.geofence300DataSource);
  });

  document.getElementById("toggle-geof-600").addEventListener("click", () => {
    toggleGeofence(window.geofence600DataSource);
  });

  document.getElementById("mode1-btn").addEventListener("click", async () => {
    await activateMode1();
    highlightActiveButton("mode1-btn");
  });

  document.getElementById("mode2-btn").addEventListener("click", async () => {
    await activateMode2();
    highlightActiveButton("mode2-btn");
  });

  document.getElementById("mode3-btn").addEventListener("click", async () => {
    await activateMode3();
    highlightActiveButton("mode3-btn");
  });
  document.getElementById("reset-btn").addEventListener("click", async () => {
    await resetViewer();
  });

}

// ✅ Launch everything
main();


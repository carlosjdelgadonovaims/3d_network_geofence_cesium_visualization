// ============================================================
// FLIGHT ANALYSIS TOOLS
// Adds four features on top of the base visualization:
//   1. Rooftop-rule highlight on OSM Buildings (> 152.4 m)
//   2. Playback controls (pause, restart, speed)
//   3. Safety corridor around the active flight path
//   4. Elevation profile chart synced with the animation
// Usage (from geofence_proj.js):
//   const analysis = setupFlightAnalysis({ viewer, buildingTileset });
//   analysis.registerFlight({ data, start, timeStep, pauseDuration, color, playbackSpeed });
//   analysis.clearFlight();
// ============================================================

const ANALYSIS_CONFIG = {
  rooftopLimitM: 152.4,   // rooftop restriction (Table 1 in README)
  corridorRadiusM: 50,    // clearance buffer drawn around the flight path
  basePlayback: 50,       // clock multiplier at "1x" until a flight sets its own
  ceilings: [             // reference lines drawn on the elevation profile
    { label: "Rooftop limit (152.4 m)", height: 152.4, color: "#ff5c5c" },
    { label: "Low restriction (200 m)", height: 200, color: "#63d1f7" },
    { label: "Medium restriction (300 m)", height: 300, color: "#63f7c8" },
  ],
};

function setupFlightAnalysis({ viewer, buildingTileset, config = ANALYSIS_CONFIG }) {
  const state = {
    rooftopOn: false,
    corridorVisible: true,
    profileVisible: true,
    speedFactor: 1,
    basePlayback: config.basePlayback,
    flight: null,          // { data, times, distances, start, corridor, color }
    chart: null,
    lastChartUpdate: 0,
    lastAnimating: null,
  };

  const $ = id => document.getElementById(id);

  // ----------------------------------------------------------
  // 1. Rooftop-rule highlight
  // ----------------------------------------------------------
  const defaultBuildingStyle = buildingTileset ? buildingTileset.style : undefined;
  const rooftopStyle = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["${feature['cesium#estimatedHeight']} > " + config.rooftopLimitM, "color('#ff3b3b')"],
        ["true", "color('#ffffff', 0.9)"],
      ],
    },
  });

  function toggleRooftopHighlight() {
    if (!buildingTileset) return;
    state.rooftopOn = !state.rooftopOn;
    buildingTileset.style = state.rooftopOn ? rooftopStyle : defaultBuildingStyle;
    $("toggle-rooftop").classList.toggle("active", state.rooftopOn);
    $("rooftop-legend").hidden = !state.rooftopOn;
  }

  // ----------------------------------------------------------
  // 2. Playback controls
  // ----------------------------------------------------------
  function setSpeed(factor) {
    state.speedFactor = factor;
    viewer.clock.multiplier = state.basePlayback * factor;
    document.querySelectorAll(".speed-btn").forEach(btn =>
      btn.classList.toggle("active", Number(btn.dataset.speed) === factor)
    );
  }

  function togglePause() {
    viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
    syncPauseLabel();
  }

  function restartFlight() {
    viewer.clock.currentTime = viewer.clock.startTime.clone();
    viewer.clock.shouldAnimate = true;
    syncPauseLabel();
    updateCursor();
  }

  function syncPauseLabel() {
    const animating = viewer.clock.shouldAnimate;
    if (animating === state.lastAnimating) return;
    state.lastAnimating = animating;
    $("pause-btn").textContent = animating ? "⏸ Pause" : "▶ Play";
  }

  // ----------------------------------------------------------
  // 3. Safety corridor
  // ----------------------------------------------------------
  function circleShape(radius, segments = 24) {
    const shape = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Cesium.Math.TWO_PI;
      shape.push(new Cesium.Cartesian2(radius * Math.cos(a), radius * Math.sin(a)));
    }
    return shape;
  }

  // Group consecutive points that share a horizontal position (within 1 m).
  // These are hub pauses and vertical take-off / landing stacks.
  function groupByLocation(data) {
    const groups = [];
    for (const p of data) {
      const g = groups[groups.length - 1];
      const here = Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude);
      if (g && Cesium.Cartesian3.distance(g.surface, here) < 1) g.points.push(p);
      else groups.push({ surface: here, points: [p] });
    }
    return groups;
  }

  // The corridor is a tube along the horizontal legs plus a cylinder for each
  // vertical climb/descent (polylineVolume cannot follow a purely vertical segment).
  function addCorridor(data, color) {
    const material = color.withAlpha(0.2);
    const radius = config.corridorRadiusM;
    const description = `Clearance buffer of ${radius} m around the flight path.`;
    const groups = groupByLocation(data);
    const entities = [];

    // Tube: one point per location; leave the first hub from the top of the
    // climb and arrive at the last hub at the top of the descent.
    const tubePoints = groups.map((g, i) => (i === 0 ? g.points[g.points.length - 1] : g.points[0]));
    if (tubePoints.length >= 2) {
      entities.push(viewer.entities.add({
        name: "Safety corridor",
        description,
        show: state.corridorVisible,
        polylineVolume: {
          positions: tubePoints.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height)),
          shape: circleShape(radius),
          cornerType: Cesium.CornerType.ROUNDED,
          material,
        },
      }));
    }

    // Cylinders for vertical segments
    groups.forEach(g => {
      const heights = g.points.map(p => p.height);
      const low = Math.min(...heights), high = Math.max(...heights);
      if (high - low < 1) return;
      const p = g.points[0];
      entities.push(viewer.entities.add({
        name: "Safety corridor (vertical segment)",
        description,
        show: state.corridorVisible,
        position: Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, (low + high) / 2),
        cylinder: { length: high - low, topRadius: radius, bottomRadius: radius, material },
      }));
    });

    return entities;
  }

  function toggleCorridor() {
    state.corridorVisible = !state.corridorVisible;
    $("toggle-corridor").classList.toggle("active", state.corridorVisible);
    if (state.flight) state.flight.corridor.forEach(e => (e.show = state.corridorVisible));
  }

  // ----------------------------------------------------------
  // 4. Elevation profile
  // ----------------------------------------------------------

  // Sample times (s from start) and cumulative horizontal distance (m) per point.
  // Times mirror the sampling in createFlightPath (pause added after the first point).
  function computeProfile(data, timeStep, pauseDuration) {
    const times = data.map((_, i) => i * timeStep + (i === 0 ? 0 : pauseDuration));
    const distances = [0];
    for (let i = 1; i < data.length; i++) {
      const a = Cesium.Cartographic.fromDegrees(data[i - 1].longitude, data[i - 1].latitude);
      const b = Cesium.Cartographic.fromDegrees(data[i].longitude, data[i].latitude);
      const same = a.longitude === b.longitude && a.latitude === b.latitude;
      const d = same ? 0 : new Cesium.EllipsoidGeodesic(a, b).surfaceDistance;
      distances.push(distances[i - 1] + d);
    }
    return { times, distances };
  }

  // Distance (m) and height (m) of the taxi at a given elapsed time (s)
  function stateAtElapsed(flight, elapsed) {
    const { times, distances, data } = flight;
    const last = times.length - 1;
    if (elapsed <= times[0]) return { distance: 0, height: data[0].height };
    if (elapsed >= times[last]) return { distance: distances[last], height: data[last].height };
    let i = 0;
    while (i < last - 1 && times[i + 1] <= elapsed) i++;
    const f = (elapsed - times[i]) / (times[i + 1] - times[i]);
    return {
      distance: distances[i] + f * (distances[i + 1] - distances[i]),
      height: data[i].height + f * (data[i + 1].height - data[i].height),
    };
  }

  // Elapsed time (s) at which the taxi reaches a given distance (m)
  function elapsedAtDistance(flight, distance) {
    const { times, distances } = flight;
    const last = distances.length - 1;
    if (distance <= 0) return times[0];
    if (distance >= distances[last]) return times[last];
    for (let i = 0; i < last; i++) {
      const d0 = distances[i], d1 = distances[i + 1];
      if (distance >= d0 && distance <= d1 && d1 > d0) {
        return times[i] + ((distance - d0) / (d1 - d0)) * (times[i + 1] - times[i]);
      }
    }
    return times[last];
  }

  function renderChart() {
    const flight = state.flight;
    const pts = flight.data.map((p, i) => ({ x: flight.distances[i] / 1000, y: p.height }));
    const maxX = pts[pts.length - 1].x;
    const maxY = Math.max(...pts.map(p => p.y));
    const lineColor = flight.color.toCssColorString();

    const ceilings = config.ceilings.map(c => ({
      label: c.label,
      data: [{ x: 0, y: c.height }, { x: maxX, y: c.height }],
      showLine: true,
      borderColor: c.color,
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
    }));

    const datasets = [
      {
        label: "Flight altitude",
        data: pts,
        showLine: true,
        borderColor: lineColor,
        backgroundColor: flight.color.withAlpha(0.15).toCssColorString(),
        fill: "origin",
        borderWidth: 2,
        pointRadius: 0,
      },
      ...ceilings,
      {
        label: "Air taxi",
        data: [{ x: 0, y: flight.data[0].height }],
        pointRadius: 6,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: lineColor,
        pointBorderWidth: 2,
      },
    ];

    if (state.chart) state.chart.destroy();
    state.chart = new Chart($("profile-chart"), {
      type: "scatter",
      data: { datasets },
      options: {
        animation: false,
        maintainAspectRatio: false,
        color: "#dddddd",
        scales: {
          x: {
            min: 0, max: maxX,
            title: { display: true, text: "Distance along path (km)", color: "#bbbbbb" },
            ticks: { color: "#bbbbbb" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
          y: {
            min: 0, suggestedMax: Math.max(320, maxY + 40),
            title: { display: true, text: "Height (m)", color: "#bbbbbb" },
            ticks: { color: "#bbbbbb" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#dddddd", boxWidth: 12, font: { size: 10 },
                      filter: item => item.text !== "Air taxi" },
          },
          tooltip: {
            filter: item => item.datasetIndex === 0,
            callbacks: { label: item => `${item.parsed.y.toFixed(0)} m at ${item.parsed.x.toFixed(2)} km` },
          },
        },
        // Click on the chart to jump the animation to that point of the path
        onClick: (event, _elements, chart) => {
          if (!state.flight) return;
          const pos = Chart.helpers.getRelativePosition(event, chart);
          const km = chart.scales.x.getValueForPixel(pos.x);
          const elapsed = elapsedAtDistance(state.flight, km * 1000);
          viewer.clock.currentTime = Cesium.JulianDate.addSeconds(
            state.flight.start, elapsed, new Cesium.JulianDate()
          );
          updateCursor();
        },
      },
    });

    $("profile-total").textContent =
      `${maxX.toFixed(2)} km · ${Math.min(...pts.map(p => p.y)).toFixed(0)}–${maxY.toFixed(0)} m`;
  }

  function updateCursor() {
    const { chart, flight } = state;
    if (!chart || !flight || !state.profileVisible) return;
    const elapsed = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, flight.start);
    const s = stateAtElapsed(flight, elapsed);
    const cursor = chart.data.datasets[chart.data.datasets.length - 1];
    cursor.data[0] = { x: s.distance / 1000, y: s.height };
    chart.update("none");
    $("profile-now").textContent = `Now: ${s.height.toFixed(0)} m · ${(s.distance / 1000).toFixed(2)} km`;
  }

  function showProfilePanel() {
    $("profile-panel").hidden = !(state.flight && state.profileVisible);
  }

  function toggleProfile() {
    state.profileVisible = !state.profileVisible;
    $("toggle-profile").classList.toggle("active", state.profileVisible);
    showProfilePanel();
    if (state.profileVisible && state.chart) { state.chart.resize(); updateCursor(); }
  }

  // ----------------------------------------------------------
  // Flight lifecycle (called by geofence_proj.js)
  // ----------------------------------------------------------
  function registerFlight({ data, start, timeStep, pauseDuration, color, playbackSpeed }) {
    if (!Array.isArray(data) || data.length < 2) return;
    if (playbackSpeed) state.basePlayback = playbackSpeed;
    const { times, distances } = computeProfile(data, timeStep, pauseDuration);
    state.flight = { data, times, distances, start, color, corridor: addCorridor(data, color) };
    viewer.clock.multiplier = state.basePlayback * state.speedFactor;
    showProfilePanel();
    renderChart();
    updateCursor();
  }

  // Corridor entity is removed by viewer.entities.removeAll() in the caller
  function clearFlight() {
    state.flight = null;
    if (state.chart) { state.chart.destroy(); state.chart = null; }
    showProfilePanel();
  }

  // Keep cursor and pause label in sync (chart throttled to ~10 fps)
  viewer.clock.onTick.addEventListener(() => {
    syncPauseLabel();
    const now = performance.now();
    if (now - state.lastChartUpdate > 100) {
      state.lastChartUpdate = now;
      updateCursor();
    }
  });

  // ----------------------------------------------------------
  // Wire up UI
  // ----------------------------------------------------------
  $("toggle-rooftop").addEventListener("click", toggleRooftopHighlight);
  $("toggle-corridor").addEventListener("click", toggleCorridor);
  $("toggle-profile").addEventListener("click", toggleProfile);
  $("pause-btn").addEventListener("click", togglePause);
  $("restart-btn").addEventListener("click", restartFlight);
  document.querySelectorAll(".speed-btn").forEach(btn =>
    btn.addEventListener("click", () => setSpeed(Number(btn.dataset.speed)))
  );
  if (!buildingTileset) $("toggle-rooftop").disabled = true;
  syncPauseLabel();

  return { registerFlight, clearFlight, computeProfile, stateAtElapsed, elapsedAtDistance };
}

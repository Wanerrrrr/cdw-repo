"use strict";

const elements = {
  startMic: document.querySelector("#start-mic"),
  captureSound: document.querySelector("#capture-sound"),
  demoMode: document.querySelector("#demo-mode"),
  demoControl: document.querySelector("#demo-control"),
  demoSlider: document.querySelector("#demo-slider"),
  captureDemo: document.querySelector("#capture-demo"),
  resetButton: document.querySelector("#reset-button"),
  micStatus: document.querySelector("#mic-status"),
  liveValue: document.querySelector("#live-value"),
  meterFill: document.querySelector("#meter-fill"),
  captureMessage: document.querySelector("#capture-message"),
  waveform: document.querySelector("#waveform"),
  valueR: document.querySelector("#value-r"),
  valueG: document.querySelector("#value-g"),
  valueB: document.querySelector("#value-b"),
  channelRows: [...document.querySelectorAll(".channel-row")],
  colorSection: document.querySelector("#color-section"),
  colorSwatch: document.querySelector("#color-swatch"),
  rgbLabel: document.querySelector("#rgb-label"),
  hexLabel: document.querySelector("#hex-label"),
  revealPlaces: document.querySelector("#reveal-places"),
  placesSection: document.querySelector("#places-section"),
  placeGrid: document.querySelector("#place-grid"),
  placesGeneratedSwatch: document.querySelector("#places-generated-swatch"),
  placesGeneratedLabel: document.querySelector("#places-generated-label"),
  selectionCount: document.querySelector("#selection-count"),
  routeSection: document.querySelector("#route-section"),
  routeList: document.querySelector("#route-list"),
  routeLine: document.querySelector("#route-line"),
  routeNodes: document.querySelector("#route-nodes"),
  clearRoute: document.querySelector("#clear-route")
};

const state = {
  audioContext: null,
  analyser: null,
  stream: null,
  dataArray: null,
  animationFrame: null,
  liveValue: 0,
  values: [null, null, null],
  currentChannel: 0,
  candidates: [],
  selected: [],
  demoMode: false,
  captureInProgress: false
};

/*
  Synthetic demo library used until a real storefront/facade dataset exists.
  Every record has a fixed stored color. The interface retrieves the nearest
  color neighborhood; it never recolors a place to match the user's input.
*/
const placeProfiles = [
  { key: "broadway-books", name: "Broadway Books", category: "Bookstore", location: "Broadway near W 112th St", x: 155, y: 115 },
  { key: "garden-cafe", name: "Garden Cafe", category: "Cafe", location: "Amsterdam Ave near W 114th St", x: 338, y: 170 },
  { key: "campus-florist", name: "Campus Florist", category: "Storefront", location: "Broadway near W 116th St", x: 548, y: 110 },
  { key: "cathedral-corner", name: "Cathedral Corner", category: "Building Entrance", location: "Amsterdam Ave near W 112th St", x: 760, y: 175 },
  { key: "morningside-market", name: "Morningside Market", category: "Storefront", location: "Morningside Dr near W 116th St", x: 250, y: 292 },
  { key: "riverside-bakery", name: "Riverside Bakery", category: "Bakery", location: "Broadway near W 110th St", x: 445, y: 265 },
  { key: "college-pharmacy", name: "College Pharmacy", category: "Storefront", location: "Amsterdam Ave near W 120th St", x: 690, y: 300 },
  { key: "westside-theater", name: "Westside Theater", category: "Marquee", location: "Broadway near W 121st St", x: 115, y: 420 },
  { key: "park-wall", name: "Park Wall", category: "Public Artwork", location: "Morningside Park edge", x: 365, y: 430 },
  { key: "community-entry", name: "Community Entry", category: "Building Entrance", location: "W 113th St near Amsterdam Ave", x: 590, y: 415 },
  { key: "corner-deli", name: "Corner Deli", category: "Storefront", location: "Broadway near W 119th St", x: 795, y: 455 },
  { key: "studio-window", name: "Studio Window", category: "Shop Window", location: "W 111th St near Broadway", x: 540, y: 510 },
  { key: "library-door", name: "Library Door", category: "Entrance", location: "W 114th St near Broadway", x: 185, y: 500 },
  { key: "music-shop", name: "Music Shop", category: "Storefront", location: "Broadway near W 108th St", x: 720, y: 500 },
  { key: "avenue-awning", name: "Avenue Awning", category: "Awning", location: "Amsterdam Ave near W 118th St", x: 430, y: 85 },
  { key: "neighborhood-grocer", name: "Neighborhood Grocer", category: "Storefront", location: "W 109th St near Amsterdam Ave", x: 830, y: 325 },
  { key: "brick-arcade", name: "Brick Arcade", category: "Facade", location: "W 117th St near Morningside Dr", x: 95, y: 250 },
  { key: "small-gallery", name: "Small Gallery", category: "Gallery", location: "W 120th St near Broadway", x: 620, y: 235 }
];

const paletteLevels = [20, 60, 100, 140, 180, 220];

function buildPlaceLibrary() {
  const library = [];
  let colorIndex = 0;

  for (const r of paletteLevels) {
    for (const g of paletteLevels) {
      for (const b of paletteLevels) {
        const profile = placeProfiles[(colorIndex * 7) % placeProfiles.length];
        library.push({
          ...profile,
          id: `${profile.key}-${r}-${g}-${b}`,
          color: [r, g, b]
        });
        colorIndex += 1;
      }
    }
  }

  return library;
}

const placeLibrary = buildPlaceLibrary();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function perceivedTextColor([r, g, b]) {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#243129" : "#fffaf0";
}

function colorDistance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mixWithWhite([r, g, b], amount = 0.45) {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount)
  ];
}

function mapDbToByte(db) {
  // A practical demo range: quiet room ≈ low value; strong voice/clap ≈ high value.
  const normalized = (db + 60) / 54;
  return Math.round(clamp(normalized, 0, 1) * 255);
}

function calculateRms(samples) {
  let sumSquares = 0;
  for (const sample of samples) {
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

function getCurrentSoundValue() {
  if (!state.analyser || !state.dataArray) {
    return 0;
  }

  state.analyser.getFloatTimeDomainData(state.dataArray);
  const rms = calculateRms(state.dataArray);
  const db = rms > 0 ? 20 * Math.log10(rms) : -100;
  return mapDbToByte(db);
}

function drawWaveform() {
  const canvas = elements.waveform;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, width, height);

  if (!state.analyser || !state.dataArray) {
    context.strokeStyle = "rgba(36, 75, 56, 0.2)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    return;
  }

  state.analyser.getFloatTimeDomainData(state.dataArray);
  context.beginPath();
  context.lineWidth = 4;
  context.strokeStyle = "#9d5d43";

  const step = width / (state.dataArray.length - 1);
  state.dataArray.forEach((sample, index) => {
    const x = index * step;
    const y = height / 2 + sample * height * 0.38;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();
}

function updateMeter() {
  const value = state.demoMode
    ? Number(elements.demoSlider.value)
    : getCurrentSoundValue();

  state.liveValue = value;
  elements.liveValue.textContent = String(value);
  elements.meterFill.style.width = `${(value / 255) * 100}%`;
  drawWaveform();
  state.animationFrame = window.requestAnimationFrame(updateMeter);
}

async function enableMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser or context.");
  }

  state.stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    },
    video: false
  });

  state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  await state.audioContext.resume();

  const source = state.audioContext.createMediaStreamSource(state.stream);
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 2048;
  state.analyser.smoothingTimeConstant = 0.72;
  state.dataArray = new Float32Array(state.analyser.fftSize);
  source.connect(state.analyser);

  state.demoMode = false;
  elements.demoControl.hidden = true;
  elements.micStatus.textContent = "Microphone active";
  elements.startMic.textContent = "Microphone enabled";
  elements.startMic.disabled = true;
  elements.captureSound.disabled = false;
  elements.captureMessage.textContent = "Make a sound, then click Capture sound.";
}

async function captureMicrophoneValue() {
  if (state.captureInProgress || state.currentChannel > 2) return;

  state.captureInProgress = true;
  elements.captureSound.disabled = true;
  elements.captureMessage.textContent = "Listening for 1.5 seconds…";

  const values = [];
  const startedAt = performance.now();

  await new Promise((resolve) => {
    function sample(now) {
      values.push(getCurrentSoundValue());
      if (now - startedAt < 1500) {
        requestAnimationFrame(sample);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(sample);
  });

  values.sort((a, b) => b - a);
  const topCount = Math.max(1, Math.floor(values.length * 0.20));
  const selectedValues = values.slice(0, topCount);
  const averageTopValue = Math.round(
    selectedValues.reduce((sum, value) => sum + value, 0) / selectedValues.length
  );

  commitValue(averageTopValue);
  state.captureInProgress = false;
  elements.captureSound.disabled = state.currentChannel > 2;
}

function commitValue(value) {
  if (state.currentChannel > 2) return;

  const safeValue = clamp(Math.round(value), 0, 255);
  state.values[state.currentChannel] = safeValue;

  [elements.valueR, elements.valueG, elements.valueB][state.currentChannel].textContent = String(safeValue);
  elements.channelRows[state.currentChannel].classList.remove("active");
  elements.channelRows[state.currentChannel].classList.add("complete");

  state.currentChannel += 1;

  if (state.currentChannel <= 2) {
    elements.channelRows[state.currentChannel].classList.add("active");
    const channelNames = ["red", "green", "blue"];
    elements.captureMessage.textContent = `Captured ${safeValue}. Create the ${channelNames[state.currentChannel]} value next.`;
  } else {
    elements.captureMessage.textContent = "Three values captured. Your color is ready.";
    elements.captureSound.disabled = true;
    elements.captureDemo.disabled = true;
    revealColorResult();
  }
}

function revealColorResult() {
  const rgb = state.values;
  const color = `rgb(${rgb.join(", ")})`;
  const hex = rgbToHex(rgb);

  elements.colorSection.classList.remove("is-locked");
  elements.colorSwatch.style.background = color;
  elements.colorSwatch.style.color = perceivedTextColor(rgb);
  elements.colorSwatch.innerHTML = `<strong>${hex}</strong>`;
  elements.rgbLabel.textContent = `RGB ${rgb.join(" · ")}`;
  elements.hexLabel.textContent = hex;
  elements.revealPlaces.disabled = false;
  elements.colorSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function chooseCandidates(rgb) {
  const sorted = placeLibrary
    .map((place) => ({ ...place, distance: colorDistance(rgb, place.color) }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = [];
  const usedProfiles = new Set();

  for (const place of sorted) {
    if (usedProfiles.has(place.key)) continue;
    nearest.push(place);
    usedProfiles.add(place.key);
    if (nearest.length === 6) break;
  }

  // Shuffle only after finding the nearest color neighborhood so no ranking is implied.
  return shuffle(nearest);
}

function locationPinIcon() {
  return `
    <svg class="location-pin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c-4.15 0-7.5 3.35-7.5 7.5 0 5.55 7.5 11.5 7.5 11.5s7.5-5.95 7.5-11.5c0-4.15-3.35-7.5-7.5-7.5Z"></path>
      <circle cx="12" cy="10" r="2.7"></circle>
    </svg>
  `;
}

function renderPlaces() {
  elements.placeGrid.innerHTML = "";

  state.candidates.forEach((place) => {
    const selected = state.selected.some((item) => item.id === place.id);
    const card = document.createElement("article");
    card.className = `place-card${selected ? " selected" : ""}`;

    const lightColor = mixWithWhite(place.color, 0.48);
    const placeHex = rgbToHex(place.color);
    const userHex = rgbToHex(state.values);

    card.innerHTML = `
      <div class="place-image" style="--place-color: rgb(${place.color.join(",")}); --place-light: rgb(${lightColor.join(",")});">
        <div class="facade-mockup" aria-hidden="true">
          <span></span><span></span><span></span><i></i>
        </div>
        <span class="place-image-label">Matched facade color</span>
      </div>
      <div class="place-card-content">
        <small>${place.category}</small>
        <h3>${place.name}</h3>
        <p class="place-location">${locationPinIcon()}<span>${place.location}</span></p>
        <div class="color-relation" aria-label="Generated and stored facade colors">
          <div>
            <span class="color-bar" style="background: rgb(${state.values.join(",")})"></span>
            <small>Your color</small>
            <strong>${userHex}</strong>
          </div>
          <span class="relation-arrow" aria-hidden="true">↔</span>
          <div>
            <span class="color-bar" style="background: rgb(${place.color.join(",")})"></span>
            <small>Facade color</small>
            <strong>${placeHex}</strong>
          </div>
        </div>
        <button class="${selected ? "secondary-button" : "primary-button"}" type="button" data-place-id="${place.id}">
          ${selected ? "Remove from route" : "Add to my route"}
        </button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => togglePlace(place.id));
    elements.placeGrid.appendChild(card);
  });
}

function togglePlace(placeId) {
  const existingIndex = state.selected.findIndex((place) => place.id === placeId);

  if (existingIndex >= 0) {
    state.selected.splice(existingIndex, 1);
  } else {
    const place = state.candidates.find((item) => item.id === placeId);
    if (place) state.selected.push(place);
  }

  renderPlaces();
  renderRoute();
  updateSelectionCount();
}

function updateSelectionCount() {
  const count = state.selected.length;
  elements.selectionCount.textContent = `${count} selected`;
  elements.routeSection.classList.toggle("is-locked", count === 0);
}

function moveRouteItem(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.selected.length) return;
  [state.selected[index], state.selected[nextIndex]] = [state.selected[nextIndex], state.selected[index]];
  renderRoute();
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function renderRoute() {
  elements.routeList.innerHTML = "";
  elements.routeNodes.innerHTML = "";

  if (state.selected.length === 0) {
    elements.routeLine.setAttribute("points", "");
    elements.routeList.innerHTML = `
      <div class="empty-route">
        Select locations above. They will appear here in the order you choose them.
      </div>
    `;
    return;
  }

  const points = state.selected.map((place) => `${place.x},${place.y}`).join(" ");
  elements.routeLine.setAttribute("points", points);

  state.selected.forEach((place, index) => {
    const item = document.createElement("div");
    item.className = "route-list-item";
    item.innerHTML = `
      <span class="route-order-pin" aria-hidden="true"><b>${index + 1}</b></span>
      <strong>${place.name}</strong>
      <div class="route-controls">
        <button type="button" aria-label="Move ${place.name} earlier" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" aria-label="Move ${place.name} later" ${index === state.selected.length - 1 ? "disabled" : ""}>↓</button>
      </div>
    `;

    const [up, down] = item.querySelectorAll("button");
    up.addEventListener("click", () => moveRouteItem(index, -1));
    down.addEventListener("click", () => moveRouteItem(index, 1));
    elements.routeList.appendChild(item);

    const group = createSvgElement("g", {
      class: "route-node",
      transform: `translate(${place.x} ${place.y})`
    });

    const pin = createSvgElement("path", {
      class: "route-pin-shape",
      d: "M0 -28C-16 -28 -27 -17 -27 -1C-27 18 0 43 0 43S27 18 27 -1C27 -17 16 -28 0 -28Z"
    });

    const pinCenter = createSvgElement("circle", {
      class: "route-pin-center",
      cx: 0,
      cy: -2,
      r: 12
    });

    const number = createSvgElement("text", {
      class: "route-pin-number",
      x: 0,
      y: 4,
      "text-anchor": "middle"
    });
    number.textContent = String(index + 1);

    const label = createSvgElement("text", {
      class: "route-node-label",
      x: 36,
      y: 4
    });
    label.textContent = place.name;

    group.append(pin, pinCenter, number, label);
    elements.routeNodes.appendChild(group);
  });
}

function revealPlaces() {
  state.candidates = chooseCandidates(state.values);
  state.selected = [];
  elements.placesSection.classList.remove("is-locked");
  elements.routeSection.classList.add("is-locked");
  elements.placesGeneratedSwatch.style.background = `rgb(${state.values.join(",")})`;
  elements.placesGeneratedLabel.textContent = `RGB ${state.values.join(" · ")} · ${rgbToHex(state.values)}`;
  renderPlaces();
  renderRoute();
  updateSelectionCount();
  elements.placesSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateDemoMode() {
  state.demoMode = true;
  elements.demoControl.hidden = false;
  elements.captureSound.disabled = true;
  elements.micStatus.textContent = "Demo slider active";
  elements.captureMessage.textContent = "Move the slider and use one value for each RGB channel.";
}

function stopMicrophone() {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  if (state.audioContext && state.audioContext.state !== "closed") {
    state.audioContext.close().catch(() => {});
  }

  state.stream = null;
  state.audioContext = null;
  state.analyser = null;
  state.dataArray = null;
}

function resetDemo() {
  stopMicrophone();

  state.values = [null, null, null];
  state.currentChannel = 0;
  state.candidates = [];
  state.selected = [];
  state.demoMode = false;
  state.captureInProgress = false;
  state.liveValue = 0;

  [elements.valueR, elements.valueG, elements.valueB].forEach((element) => {
    element.textContent = "—";
  });

  elements.channelRows.forEach((row, index) => {
    row.classList.remove("active", "complete");
    if (index === 0) row.classList.add("active");
  });

  elements.micStatus.textContent = "Microphone not started";
  elements.liveValue.textContent = "0";
  elements.meterFill.style.width = "0%";
  elements.startMic.textContent = "Enable microphone";
  elements.startMic.disabled = false;
  elements.captureSound.disabled = true;
  elements.captureDemo.disabled = false;
  elements.demoControl.hidden = true;
  elements.captureMessage.textContent = "Enable the microphone, then make one sound for each channel.";
  elements.colorSection.classList.add("is-locked");
  elements.placesSection.classList.add("is-locked");
  elements.routeSection.classList.add("is-locked");
  elements.colorSwatch.removeAttribute("style");
  elements.colorSwatch.innerHTML = "<span>Waiting for three sounds</span>";
  elements.rgbLabel.textContent = "RGB — · — · —";
  elements.hexLabel.textContent = "#———";
  elements.revealPlaces.disabled = true;
  elements.placesGeneratedSwatch.removeAttribute("style");
  elements.placesGeneratedLabel.textContent = "RGB — · — · —";
  elements.placeGrid.innerHTML = "";
  renderRoute();
  updateSelectionCount();
  drawWaveform();
  updateMeter();
}

elements.startMic.addEventListener("click", async () => {
  try {
    elements.startMic.disabled = true;
    elements.micStatus.textContent = "Requesting permission…";
    await enableMicrophone();
  } catch (error) {
    console.error(error);
    elements.startMic.disabled = false;
    elements.micStatus.textContent = "Microphone unavailable";
    elements.captureMessage.textContent = "Microphone access failed. Run the site on localhost or HTTPS, allow permission, or use the demo slider.";
    activateDemoMode();
  }
});

elements.captureSound.addEventListener("click", captureMicrophoneValue);
elements.demoMode.addEventListener("click", activateDemoMode);
elements.captureDemo.addEventListener("click", () => commitValue(Number(elements.demoSlider.value)));
elements.demoSlider.addEventListener("input", () => {
  if (state.demoMode) {
    state.liveValue = Number(elements.demoSlider.value);
  }
});
elements.revealPlaces.addEventListener("click", revealPlaces);
elements.clearRoute.addEventListener("click", () => {
  state.selected = [];
  renderPlaces();
  renderRoute();
  updateSelectionCount();
});
elements.resetButton.addEventListener("click", resetDemo);
window.addEventListener("beforeunload", stopMicrophone);

renderRoute();
drawWaveform();
updateMeter();

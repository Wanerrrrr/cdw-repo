(() => {
  "use strict";

  if (typeof L === "undefined") {
    document.getElementById("connectionStatus").textContent = "The map library could not load. Check your internet connection.";
    return;
  }

  const soundDefinitions = {
    wind: { name: "Wind", audio: "audio/wind.mp3" },
    water: { name: "Flowing water", audio: "audio/water.mp3" },
    birds: { name: "Bird calls", audio: "audio/birds.m4a" },
    door: { name: "Opening door", audio: "audio/door.m4a" },
    restaurant: { name: "Restaurant", audio: "audio/restaurant.m4a" },
    market: { name: "Market", audio: "audio/market.m4a" },
    concrete: { name: "Concrete footsteps", audio: "audio/concrete-footsteps.m4a" },
    grass: { name: "Grass footsteps", audio: "audio/grass-footsteps.mp3" },
    mud: { name: "Mud footsteps", audio: "audio/mud-footsteps.mp3" },
    "traffic-light": { name: "Waiting at a traffic light", audio: "audio/traffic-light.m4a" },
    crosswalk: { name: "Crossing the street", audio: "audio/crosswalk.m4a" },
    cars: { name: "Passing cars", audio: "audio/cars.m4a" }
  };

  // These are plausible prototype locations, not measured sound observations.
  // Each sound is randomly assigned to one candidate that spatially fits the sound.
  const candidateLocations = {
    wind: [
      { name: "The Battery waterfront", lat: 40.7033, lng: -74.0170 },
      { name: "Brooklyn Heights Promenade", lat: 40.6985, lng: -73.9967 },
      { name: "Governors Island", lat: 40.6895, lng: -74.0168 },
      { name: "Rockaway Beach", lat: 40.5834, lng: -73.8165 },
      { name: "Roosevelt Island waterfront", lat: 40.7494, lng: -73.9608 }
    ],
    water: [
      { name: "Hudson River Park", lat: 40.7339, lng: -74.0116 },
      { name: "East River Esplanade", lat: 40.7077, lng: -73.9947 },
      { name: "Brooklyn Bridge Park", lat: 40.7023, lng: -73.9965 },
      { name: "Riverside Park", lat: 40.7998, lng: -73.9702 },
      { name: "Gantry Plaza State Park", lat: 40.7476, lng: -73.9587 }
    ],
    birds: [
      { name: "The Ramble, Central Park", lat: 40.7778, lng: -73.9690 },
      { name: "Prospect Park", lat: 40.6602, lng: -73.9690 },
      { name: "Jamaica Bay Wildlife Refuge", lat: 40.6166, lng: -73.8247 },
      { name: "Inwood Hill Park", lat: 40.8720, lng: -73.9257 },
      { name: "Van Cortlandt Park", lat: 40.8970, lng: -73.8860 }
    ],
    door: [
      { name: "Grand Central Terminal", lat: 40.7527, lng: -73.9772 },
      { name: "New York Public Library", lat: 40.7532, lng: -73.9822 },
      { name: "The Metropolitan Museum of Art", lat: 40.7794, lng: -73.9632 },
      { name: "Chelsea Market entrance", lat: 40.7424, lng: -74.0060 },
      { name: "St. Patrick’s Cathedral", lat: 40.7585, lng: -73.9760 }
    ],
    restaurant: [
      { name: "East Village restaurant area", lat: 40.7265, lng: -73.9815 },
      { name: "Koreatown", lat: 40.7477, lng: -73.9869 },
      { name: "Chinatown", lat: 40.7158, lng: -73.9970 },
      { name: "Jackson Heights food area", lat: 40.7557, lng: -73.8831 },
      { name: "Williamsburg restaurant area", lat: 40.7180, lng: -73.9580 }
    ],
    market: [
      { name: "Union Square Greenmarket", lat: 40.7359, lng: -73.9906 },
      { name: "Chelsea Market", lat: 40.7424, lng: -74.0060 },
      { name: "Essex Market", lat: 40.7180, lng: -73.9880 },
      { name: "Arthur Avenue Retail Market", lat: 40.8545, lng: -73.8886 },
      { name: "Queens Night Market", lat: 40.7464, lng: -73.8466 }
    ],
    concrete: [
      { name: "Times Square", lat: 40.7580, lng: -73.9855 },
      { name: "World Trade Center plaza", lat: 40.7119, lng: -74.0133 },
      { name: "Lincoln Center plaza", lat: 40.7725, lng: -73.9835 },
      { name: "Downtown Brooklyn", lat: 40.6927, lng: -73.9903 },
      { name: "Hudson Yards plaza", lat: 40.7536, lng: -74.0017 }
    ],
    grass: [
      { name: "Sheep Meadow", lat: 40.7711, lng: -73.9742 },
      { name: "Long Meadow, Prospect Park", lat: 40.6680, lng: -73.9704 },
      { name: "Fort Greene Park", lat: 40.6915, lng: -73.9750 },
      { name: "Bryant Park lawn", lat: 40.7536, lng: -73.9832 },
      { name: "Flushing Meadows–Corona Park", lat: 40.7498, lng: -73.8408 }
    ],
    mud: [
      { name: "Inwood Hill Park trail", lat: 40.8730, lng: -73.9250 },
      { name: "Van Cortlandt Park trail", lat: 40.8974, lng: -73.8868 },
      { name: "Marine Park Salt Marsh", lat: 40.6060, lng: -73.9320 },
      { name: "Pelham Bay Park trail", lat: 40.8660, lng: -73.8068 },
      { name: "Alley Pond Park trail", lat: 40.7405, lng: -73.7440 }
    ],
    "traffic-light": [
      { name: "Times Square intersection", lat: 40.7583, lng: -73.9851 },
      { name: "Atlantic Avenue and Flatbush Avenue", lat: 40.6844, lng: -73.9777 },
      { name: "Delancey Street and Essex Street", lat: 40.7180, lng: -73.9875 },
      { name: "Queensboro Plaza", lat: 40.7505, lng: -73.9403 },
      { name: "125th Street and Lexington Avenue", lat: 40.8045, lng: -73.9375 }
    ],
    crosswalk: [
      { name: "Herald Square crosswalk", lat: 40.7506, lng: -73.9877 },
      { name: "Columbus Circle crosswalk", lat: 40.7681, lng: -73.9819 },
      { name: "Union Square crosswalk", lat: 40.7359, lng: -73.9904 },
      { name: "Court Square crosswalk", lat: 40.7466, lng: -73.9436 },
      { name: "Jay Street–MetroTech crosswalk", lat: 40.6920, lng: -73.9870 }
    ],
    cars: [
      { name: "Queens Boulevard", lat: 40.7360, lng: -73.8720 },
      { name: "FDR Drive near East 42nd Street", lat: 40.7480, lng: -73.9680 },
      { name: "Brooklyn–Queens Expressway", lat: 40.6990, lng: -73.9960 },
      { name: "Grand Concourse", lat: 40.8385, lng: -73.9110 },
      { name: "Flatbush Avenue", lat: 40.6782, lng: -73.9730 }
    ]
  };

  const state = {
    draggingPointer: null,
    dragCard: null,
    pins: [],
    route: [],
    connecting: false,
    usedCandidates: new Map()
  };

  const mapFrame = document.getElementById("mapFrame");
  const mapEmpty = document.getElementById("mapEmpty");
  const connectionStatus = document.getElementById("connectionStatus");
  const threadControl = document.getElementById("threadControl");
  const audioButton = document.getElementById("audioButton");
  const resetButton = document.getElementById("resetButton");
  const dragGhost = document.getElementById("dragGhost");
  const cards = [...document.querySelectorAll(".sound-card")];

  const map = L.map("nycMap", {
    zoomControl: true,
    minZoom: 9,
    maxZoom: 18,
    maxBoundsViscosity: 0.75
  });

  const nycBounds = L.latLngBounds(
    [40.49, -74.27],
    [40.93, -73.68]
  );

  map.fitBounds(nycBounds, { padding: [18, 18] });
  map.setMaxBounds(nycBounds.pad(0.18));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);

  const speakerSvg = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 25h12l16-13v40L22 39H10z"></path>
      <path d="M45 23c5 5 5 13 0 18"></path>
      <path d="M51 16c10 9 10 23 0 32"></path>
    </svg>`;

  function pinIcon(isRoute = false) {
    return L.divIcon({
      className: "sound-pin-wrapper",
      html: `<div class="sound-pin${isRoute ? " is-route" : ""}">${speakerSvg}</div>`,
      iconSize: [42, 55],
      iconAnchor: [21, 50],
      tooltipAnchor: [0, -47]
    });
  }

  class AudioManager {
    constructor() {
      this.context = null;
      this.source = null;
      this.cache = new Map();
      this.enabled = false;
      this.requestId = 0;
    }

    async enable() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error("Web Audio is not supported in this browser.");
        this.context = new AudioContext();
      }
      if (this.context.state === "suspended") await this.context.resume();
      this.enabled = true;
    }

    stop() {
      this.requestId += 1;
      if (this.source) {
        try { this.source.stop(); } catch (_) { /* already stopped */ }
        this.source.disconnect();
        this.source = null;
      }
    }

    async load(url) {
      if (this.cache.has(url)) return this.cache.get(url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Audio file not found: ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.cache.set(url, buffer);
      return buffer;
    }

    async play(type) {
      const definition = soundDefinitions[type];
      if (!definition) return;
      if (!this.enabled) {
        connectionStatus.textContent = "Click ‘Enable sounds’ once, then hover over the cards.";
        return;
      }

      this.stop();
      const requestId = ++this.requestId;

      try {
        const buffer = await this.load(definition.audio);
        if (requestId !== this.requestId) return;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        gain.gain.value = 0.9;
        source.buffer = buffer;
        source.connect(gain).connect(this.context.destination);
        source.start();
        source.onended = () => {
          if (this.source === source) this.source = null;
        };
        this.source = source;
        connectionStatus.textContent = `Listening: ${definition.name}`;
      } catch (error) {
        connectionStatus.textContent = `Add your file at ${definition.audio}`;
        console.warn(error);
      }
    }
  }

  const audio = new AudioManager();

  function randomCandidate(type) {
    const choices = candidateLocations[type];
    const used = state.usedCandidates.get(type) || new Set();
    let available = choices.map((_, index) => index).filter(index => !used.has(index));

    if (!available.length) {
      used.clear();
      available = choices.map((_, index) => index);
    }

    const index = available[Math.floor(Math.random() * available.length)];
    used.add(index);
    state.usedCandidates.set(type, used);
    return choices[index];
  }

  function createPin(type) {
    const candidate = randomCandidate(type);
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const marker = L.marker([candidate.lat, candidate.lng], {
      icon: pinIcon(false),
      keyboard: true,
      riseOnHover: true
    }).addTo(markerLayer);

    marker.bindTooltip(
      `<div class="sound-tooltip"><strong>${soundDefinitions[type].name}</strong><small>${candidate.name}</small></div>`,
      { direction: "top", className: "sound-tooltip-shell", opacity: 1 }
    );

    const pin = { id, type, candidate, marker };
    state.pins.push(pin);

    marker.on("mouseover", () => audio.play(type));
    marker.on("mouseout", () => audio.stop());
    marker.on("click", () => handlePinClick(id));
    marker.on("keypress", event => {
      if (event.originalEvent?.key === "Enter") handlePinClick(id);
    });

    mapEmpty.classList.add("hidden");
    connectionStatus.textContent = `${soundDefinitions[type].name} was randomly placed at ${candidate.name}.`;
    const latLng = L.latLng(candidate.lat, candidate.lng);
    if (!map.getBounds().contains(latLng)) {
      map.panTo(latLng, { animate: true, duration: 0.55 });
    }
  }

  function handlePinClick(id) {
    const pin = state.pins.find(item => item.id === id);
    if (!pin) return;

    if (!state.connecting) {
      audio.play(pin.type);
      connectionStatus.textContent = `${soundDefinitions[pin.type].name} · ${pin.candidate.name}`;
      return;
    }

    const existingIndex = state.route.indexOf(id);
    if (existingIndex !== -1) {
      state.route = state.route.slice(0, existingIndex + 1);
      connectionStatus.textContent = "The line was pulled back to this point.";
    } else {
      state.route.push(id);
      connectionStatus.textContent = state.route.length === 1
        ? "First point selected. Choose another point to extend the line."
        : "Line extended. Select another point or click a line segment to retract it.";
    }

    drawRoute();
  }

  function drawRoute() {
    routeLayer.clearLayers();

    state.pins.forEach(pin => {
      pin.marker.setIcon(pinIcon(state.route.includes(pin.id)));
    });

    for (let index = 0; index < state.route.length - 1; index += 1) {
      const start = state.pins.find(pin => pin.id === state.route[index]);
      const end = state.pins.find(pin => pin.id === state.route[index + 1]);
      if (!start || !end) continue;

      const segment = L.polyline(
        [start.marker.getLatLng(), end.marker.getLatLng()],
        {
          color: "#b13f31",
          weight: 6,
          opacity: 0.94,
          lineCap: "round",
          lineJoin: "round",
          interactive: true
        }
      ).addTo(routeLayer);

      segment.on("mouseover", () => segment.setStyle({ weight: 9 }));
      segment.on("mouseout", () => segment.setStyle({ weight: 6 }));
      segment.on("click", () => {
        state.route = state.route.slice(0, index + 1);
        connectionStatus.textContent = "The line was retracted from that segment.";
        drawRoute();
      });
    }
  }

  function toggleThread() {
    if (!state.pins.length) {
      connectionStatus.textContent = "Place at least one sound card on the map first.";
      return;
    }

    if (!state.connecting) {
      state.connecting = true;
      threadControl.setAttribute("aria-pressed", "true");
      threadControl.querySelector(".thread-label").textContent = "Retract";
      connectionStatus.textContent = "Line active. Click the points in your preferred order.";
      return;
    }

    if (state.route.length > 1) {
      state.route.pop();
      connectionStatus.textContent = "The last connection was retracted.";
      drawRoute();
      return;
    }

    state.connecting = false;
    state.route = [];
    threadControl.setAttribute("aria-pressed", "false");
    threadControl.querySelector(".thread-label").textContent = "Connect";
    connectionStatus.textContent = "Connection mode closed.";
    drawRoute();
  }

  function pointInsideMap(clientX, clientY) {
    const rect = mapFrame.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function startDrag(event, card) {
    event.preventDefault();
    card.setPointerCapture?.(event.pointerId);
    state.draggingPointer = event.pointerId;
    state.dragCard = card;
    card.classList.add("is-dragging");
    dragGhost.classList.add("show");
    dragGhost.style.left = `${event.clientX}px`;
    dragGhost.style.top = `${event.clientY}px`;
    audio.play(card.dataset.sound);
  }

  function moveDrag(event) {
    if (state.draggingPointer !== event.pointerId || !state.dragCard) return;
    dragGhost.style.left = `${event.clientX}px`;
    dragGhost.style.top = `${event.clientY}px`;
    mapFrame.classList.toggle("is-target", pointInsideMap(event.clientX, event.clientY));
  }

  function endDrag(event) {
    if (state.draggingPointer !== event.pointerId || !state.dragCard) return;
    const card = state.dragCard;

    if (pointInsideMap(event.clientX, event.clientY)) {
      createPin(card.dataset.sound);
      card.classList.add("is-used");
    }

    card.classList.remove("is-dragging");
    dragGhost.classList.remove("show");
    mapFrame.classList.remove("is-target");
    audio.stop();
    state.draggingPointer = null;
    state.dragCard = null;
  }

  cards.forEach(card => {
    card.addEventListener("mouseenter", () => audio.play(card.dataset.sound));
    card.addEventListener("mouseleave", () => {
      if (!card.classList.contains("is-dragging")) audio.stop();
    });
    card.addEventListener("focus", () => audio.play(card.dataset.sound));
    card.addEventListener("blur", () => audio.stop());
    card.addEventListener("pointerdown", event => startDrag(event, card));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        createPin(card.dataset.sound);
        card.classList.add("is-used");
      }
    });
  });

  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  threadControl.addEventListener("click", toggleThread);

  audioButton.addEventListener("click", async () => {
    try {
      if (!audio.enabled) {
        await audio.enable();
        audioButton.textContent = "Sound on";
        audioButton.classList.add("is-on");
        connectionStatus.textContent = "Audio enabled. Hover over any speaker card to listen.";
      } else {
        audio.stop();
        audio.enabled = false;
        audioButton.textContent = "Sound off";
        audioButton.classList.remove("is-on");
        connectionStatus.textContent = "Audio is off.";
      }
    } catch (error) {
      connectionStatus.textContent = error.message;
    }
  });

  resetButton.addEventListener("click", () => {
    audio.stop();
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    state.pins = [];
    state.route = [];
    state.connecting = false;
    state.usedCandidates.clear();
    cards.forEach(card => card.classList.remove("is-used", "is-dragging"));
    threadControl.setAttribute("aria-pressed", "false");
    threadControl.querySelector(".thread-label").textContent = "Connect";
    mapEmpty.classList.remove("hidden");
    map.fitBounds(nycBounds, { padding: [18, 18] });
    connectionStatus.textContent = audio.enabled
      ? "Hover over a card to hear it."
      : "Enable audio, then hover over a card.";
  });

  window.addEventListener("resize", () => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 150);
})();

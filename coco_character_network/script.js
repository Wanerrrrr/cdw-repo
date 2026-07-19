const svg = d3.select("#network");
const tooltip = d3.select("#tooltip");
const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll(".filter-button");
const resetButton = document.querySelector("#reset-button");

const skullIconPath = "skull-icon.png";

const realmStroke = {
  Living: "#ff7ea7",
  Dead: "#59f3e2",
  Spirit: "#ffd34e"
};

const realmBadgeFill = {
  Living: "#ee467b",
  Dead: "#13b7b0",
  Spirit: "#ff9f1c"
};

const relationshipColors = {
  family: "#ffcf4a",
  friendship: "#44e0d0",
  companion: "#44e0d0",
  music: "#ef5ba1",
  "music-conflict": "#ef5ba1",
  memory: "#a989ff",
  spirit: "#ff8b2c"
};

let activeRealm = "all";
let currentSearch = "";
let simulation;
let zoomBehavior;
let nodeSelection;
let linkSelection;
let graphGroup;
let width;
let height;

Promise.all([
  d3.csv("nodes.csv", d3.autoType),
  d3.csv("edges.csv", d3.autoType)
]).then(([nodes, links]) => {
  nodes.forEach(node => {
    node.degree = 0;
    node.weightedDegree = 0;
  });

  const nodeById = new Map(nodes.map(node => [node.id, node]));

  links.forEach(link => {
    link.weight = Number(link.weight) || 1;
    if (nodeById.has(link.source)) {
      nodeById.get(link.source).degree += 1;
      nodeById.get(link.source).weightedDegree += link.weight;
    }
    if (nodeById.has(link.target)) {
      nodeById.get(link.target).degree += 1;
      nodeById.get(link.target).weightedDegree += link.weight;
    }
  });

  const adjacency = new Set();
  links.forEach(link => {
    adjacency.add(`${link.source}|${link.target}`);
    adjacency.add(`${link.target}|${link.source}`);
  });

  document.querySelector("#node-count").textContent = nodes.length;
  document.querySelector("#edge-count").textContent = links.length;

  const radius = d3.scaleSqrt()
    .domain(d3.extent(nodes, d => d.weightedDegree))
    .range([14, 31]);

  const iconSize = d => radius(d.weightedDegree) * 2.45;
  const outerRingSize = d => radius(d.weightedDegree) + 8;
  const badgeRadius = d => Math.max(5.5, radius(d.weightedDegree) * 0.24);

  const chartWrap = document.querySelector(".chart-wrap");

  function measure() {
    width = chartWrap.clientWidth;
    height = chartWrap.clientHeight;
    svg.attr("viewBox", [0, 0, width, height]);
  }

  measure();

  graphGroup = svg.append("g");

  linkSelection = graphGroup.append("g")
    .attr("class", "links")
    .attr("aria-hidden", "true")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", d => `link relationship-${relationshipClass(d.relationship)}`)
    .attr("stroke", d => relationshipColors[d.relationship] || "#ffffff")
    .attr("stroke-width", d => 0.8 + d.weight * 0.32)
    .attr("stroke-dasharray", d => {
      if (d.relationship === "memory") return "4 5";
      if (d.relationship === "music-conflict") return "9 4";
      return null;
    });

  nodeSelection = graphGroup.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", d => `node realm-${d.realm.toLowerCase()}`)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", d => `${d.label}, ${d.role}, ${d.degree} relationships`);

  nodeSelection.append("circle")
    .attr("class", "node-glow")
    .attr("r", d => outerRingSize(d) + 7)
    .attr("fill", "none")
    .attr("stroke", d => realmStroke[d.realm])
    .attr("filter", "url(#soft-glow)");

  nodeSelection.append("circle")
    .attr("class", "petal-ring")
    .attr("r", d => outerRingSize(d) + 3)
    .attr("fill", "none")
    .attr("stroke", d => realmStroke[d.realm])
    .attr("stroke-dasharray", "2 4");

  nodeSelection.append("image")
    .attr("class", "node-skull")
    .attr("href", skullIconPath)
    .attr("x", d => -iconSize(d) / 2)
    .attr("y", d => -iconSize(d) / 2)
    .attr("width", d => iconSize(d))
    .attr("height", d => iconSize(d))
    .attr("preserveAspectRatio", "xMidYMid meet");

  nodeSelection.append("circle")
    .attr("class", "realm-badge")
    .attr("r", d => badgeRadius(d))
    .attr("cx", d => radius(d.weightedDegree) * 0.82)
    .attr("cy", d => -radius(d.weightedDegree) * 0.82)
    .attr("fill", d => realmBadgeFill[d.realm])
    .attr("stroke", "rgba(255,255,255,.92)")
    .attr("stroke-width", 1.8);

  nodeSelection.append("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")
    .attr("y", d => radius(d.weightedDegree) + 32)
    .text(d => d.label);

  zoomBehavior = d3.zoom()
    .scaleExtent([0.4, 4.5])
    .on("zoom", event => graphGroup.attr("transform", event.transform));

  svg.call(zoomBehavior);

  const dragBehavior = d3.drag()
    .on("start", dragStarted)
    .on("drag", dragged)
    .on("end", dragEnded);

  nodeSelection
    .call(dragBehavior)
    .on("dblclick", (event, d) => {
      event.stopPropagation();
      d.fx = null;
      d.fy = null;
      simulation.alpha(0.6).restart();
    })
    .on("mouseenter focus", (event, d) => {
      highlightNeighborhood(d);
      showTooltip(event, d);
    })
    .on("mousemove", (event, d) => showTooltip(event, d))
    .on("mouseleave blur", () => {
      hideTooltip();
      applyFilters();
    });

  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 95 - Math.min(22, d.weight * 4))
      .strength(d => 0.18 + d.weight * 0.08))
    .force("charge", d3.forceManyBody().strength(d => -250 - d.weightedDegree * 8))
    .force("center", d3.forceCenter(width / 2, height / 2 + 18))
    .force("x", d3.forceX(d => realmX(d.realm)).strength(0.055))
    .force("y", d3.forceY(height / 2).strength(0.045))
    .force("collision", d3.forceCollide().radius(d => radius(d.weightedDegree) + 34).iterations(3))
    .alphaDecay(0.028)
    .on("tick", ticked);

  searchInput.addEventListener("input", event => {
    currentSearch = event.target.value.trim().toLowerCase();
    applyFilters();
    focusFirstSearchResult(nodes);
  });

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      activeRealm = button.dataset.filter;
      applyFilters();
    });
  });

  resetButton.addEventListener("click", () => {
    currentSearch = "";
    activeRealm = "all";
    searchInput.value = "";
    filterButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.filter === "all");
    });

    nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });

    svg.transition()
      .duration(650)
      .call(zoomBehavior.transform, d3.zoomIdentity);

    applyFilters();
    simulation.alpha(0.9).restart();
  });

  window.addEventListener("resize", () => {
    measure();
    simulation
      .force("center", d3.forceCenter(width / 2, height / 2 + 18))
      .force("x", d3.forceX(d => realmX(d.realm)).strength(0.055))
      .force("y", d3.forceY(height / 2).strength(0.045))
      .alpha(0.45)
      .restart();
  });

  function realmX(realm) {
    if (realm === "Living") return width * 0.25;
    if (realm === "Spirit") return width * 0.76;
    return width * 0.56;
  }

  function ticked() {
    linkSelection
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeSelection.attr("transform", d => `translate(${d.x},${d.y})`);
  }

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = event.x;
    d.fy = event.y;
  }

  function isConnected(a, b) {
    return a.id === b.id || adjacency.has(`${a.id}|${b.id}`);
  }

  function highlightNeighborhood(selectedNode) {
    nodeSelection
      .classed("highlight", d => d.id === selectedNode.id)
      .classed("neighbor", d => d.id !== selectedNode.id && isConnected(selectedNode, d))
      .classed("dimmed", d => !isConnected(selectedNode, d));

    linkSelection
      .classed("highlight", d => d.source.id === selectedNode.id || d.target.id === selectedNode.id)
      .classed("dimmed", d => d.source.id !== selectedNode.id && d.target.id !== selectedNode.id);
  }

  function applyFilters() {
    nodeSelection
      .classed("highlight", false)
      .classed("neighbor", false)
      .classed("dimmed", d => {
        const realmMatch = activeRealm === "all" || d.realm === activeRealm;
        const searchMatch = !currentSearch || d.label.toLowerCase().includes(currentSearch);
        return !(realmMatch && searchMatch);
      })
      .classed("filtered-out", d => activeRealm !== "all" && d.realm !== activeRealm);

    linkSelection
      .classed("highlight", false)
      .classed("dimmed", d => {
        const sourceRealmMatch = activeRealm === "all" || d.source.realm === activeRealm;
        const targetRealmMatch = activeRealm === "all" || d.target.realm === activeRealm;
        const sourceSearchMatch = !currentSearch || d.source.label.toLowerCase().includes(currentSearch);
        const targetSearchMatch = !currentSearch || d.target.label.toLowerCase().includes(currentSearch);

        if (currentSearch) return !(sourceSearchMatch || targetSearchMatch);
        return !(sourceRealmMatch && targetRealmMatch);
      });
  }

  function focusFirstSearchResult(allNodes) {
    if (!currentSearch) return;
    const match = allNodes.find(node => node.label.toLowerCase().includes(currentSearch));
    if (!match || !Number.isFinite(match.x) || !Number.isFinite(match.y)) return;

    const scale = 1.55;
    const transform = d3.zoomIdentity
      .translate(width / 2 - match.x * scale, height / 2 - match.y * scale)
      .scale(scale);

    svg.transition().duration(500).call(zoomBehavior.transform, transform);
  }

  function showTooltip(event, d) {
    const bounds = chartWrap.getBoundingClientRect();
    const x = Math.min(Math.max(12, event.clientX - bounds.left + 18), bounds.width - 340);
    const y = Math.max(12, event.clientY - bounds.top - 30);
    const connected = links
      .filter(link => link.source.id === d.id || link.target.id === d.id)
      .map(link => link.relationship)
      .filter((value, index, array) => array.indexOf(value) === index)
      .map(prettyRelationship)
      .join(" · ");

    tooltip
      .html(`
        <span class="tooltip-realm">${escapeHtml(d.realm)} · ${escapeHtml(d.group)}</span>
        <strong>${escapeHtml(d.label)}</strong>
        <em>${escapeHtml(d.role)}</em>
        <p>${escapeHtml(d.description)}</p>
        <span class="meta">${d.degree} direct connections${connected ? ` · ${escapeHtml(connected)}` : ""}</span>
      `)
      .style("left", `${x}px`)
      .style("top", `${y}px`)
      .classed("visible", true);
  }

  function hideTooltip() {
    tooltip.classed("visible", false);
  }
}).catch(error => {
  console.error(error);
  document.querySelector(".chart-wrap").innerHTML = `
    <div class="load-error">
      <strong>The CSV files could not be loaded.</strong><br>
      Run this folder through a local server instead of opening <code>index.html</code> directly.<br>
      Example: <code>python3 -m http.server 8000</code>
    </div>
  `;
});

function relationshipClass(value) {
  if (value === "companion") return "friendship";
  if (value === "music-conflict") return "music";
  return value;
}

function prettyRelationship(value) {
  const labels = {
    family: "Family",
    friendship: "Friendship",
    companion: "Companion",
    music: "Music",
    "music-conflict": "Music / conflict",
    memory: "Memory",
    spirit: "Spirit guides"
  };
  return labels[value] || value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

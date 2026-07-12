const svg = d3.select("#pixar-chart");
const tooltip = d3.select("#tooltip");
const parseDate = d3.timeParse("%Y-%m-%d");
const formatYear = d3.timeFormat("%Y");
const formatMoney = d3.format(",.0f");

let allData = [];
let activeFilter = "All";

function seededRandom(index) {
  const value = Math.sin(index * 999.91 + 27.3) * 43758.5453;
  return value - Math.floor(value);
}

function safeId(title, index) {
  return `film-arc-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function upperArc(radius) {
  // A top semicircle, used as the baseline for each curved movie title.
  return `M ${-radius},0 A ${radius},${radius} 0 0,1 ${radius},0`;
}

function render(data) {
  const node = svg.node();
  const width = Math.max(node.getBoundingClientRect().width, 760);
  const isCompact = width < 900;
  const height = isCompact ? 670 : 760;

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const margin = {
    top: isCompact ? 66 : 80,
    right: isCompact ? 42 : 94,
    bottom: 78,
    left: isCompact ? 82 : 108
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const defs = svg.append("defs");

  const softGlow = defs.append("filter")
    .attr("id", "softGlow")
    .attr("x", "-100%")
    .attr("y", "-100%")
    .attr("width", "300%")
    .attr("height", "300%");

  softGlow.append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 0)
    .attr("stdDeviation", 4)
    .attr("flood-color", "#ffffff")
    .attr("flood-opacity", 0.34);

  const plot = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Large concentric arcs create the orbital field seen in the reference,
  // while the Cartesian axes remain the quantitative structure of the chart.
  const orbitCenterX = innerWidth * 0.47;
  const orbitCenterY = innerHeight + (isCompact ? 235 : 290);
  const orbitRadii = d3.range(0, isCompact ? 9 : 12).map(i => 230 + i * (isCompact ? 48 : 56));

  plot.append("g")
    .attr("class", "orbit-field")
    .selectAll("circle")
    .data(orbitRadii)
    .join("circle")
    .attr("cx", orbitCenterX)
    .attr("cy", orbitCenterY)
    .attr("r", d => d);

  plot.append("g")
    .attr("class", "star-field")
    .selectAll("circle")
    .data(d3.range(isCompact ? 28 : 46))
    .join("circle")
    .attr("cx", (_, i) => seededRandom(i) * innerWidth)
    .attr("cy", (_, i) => seededRandom(i + 100) * innerHeight)
    .attr("r", (_, i) => 0.45 + seededRandom(i + 200) * 1.2)
    .attr("opacity", (_, i) => 0.12 + seededRandom(i + 300) * 0.2);

  const x = d3.scaleTime()
    .domain([new Date(1994, 6, 1), new Date(2026, 5, 1)])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.worldwide_gross_m) * 1.1])
    .nice()
    .range([innerHeight, 0]);

  // Outer ring size remains the runtime encoding.
  const radius = d3.scaleSqrt()
    .domain(d3.extent(allData, d => d.runtime_min))
    .range(isCompact ? [12, 26] : [15, 34]);

  function titleRadius(d) {
    const bubbleRadius = radius(d.runtime_min);
    const characterWidth = isCompact ? 4.7 : 5.2;
    const estimated = (d.title.length * characterWidth) / Math.PI;
    return Math.max(bubbleRadius + 8, estimated + 4);
  }

  const yTicks = y.ticks(6);

  plot.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
      .tickValues(yTicks)
      .tickSize(-innerWidth)
      .tickFormat(""));

  const xAxis = d3.axisBottom(x)
    .ticks(d3.timeYear.every(isCompact ? 5 : 3))
    .tickFormat(formatYear)
    .tickSizeOuter(0)
    .tickPadding(12);

  const yAxis = d3.axisLeft(y)
    .tickValues(yTicks)
    .tickFormat(d => `$${formatMoney(d)}M`)
    .tickSizeOuter(0)
    .tickPadding(10);

  plot.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  plot.append("g")
    .attr("class", "axis y-axis")
    .call(yAxis);

  plot.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 60)
    .attr("text-anchor", "middle")
    .text("Release year");

  plot.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -76)
    .attr("text-anchor", "middle")
    .text("Worldwide box office (USD millions)");

  const medianGross = d3.median(allData, d => d.worldwide_gross_m);

  plot.append("line")
    .attr("class", "median-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", y(medianGross))
    .attr("y2", y(medianGross));

  plot.append("text")
    .attr("class", "median-label")
    .attr("x", innerWidth - 2)
    .attr("y", y(medianGross) - 8)
    .attr("text-anchor", "end")
    .text(`MEDIAN $${formatMoney(medianGross)}M`);

  // Highest-grossing films receive the reference image's small elbow callouts.
  const annotationCount = isCompact ? 4 : 7;
  const annotatedTitles = new Set(
    [...data]
      .sort((a, b) => d3.descending(a.worldwide_gross_m, b.worldwide_gross_m))
      .slice(0, annotationCount)
      .map(d => d.title)
  );

  const nodes = plot.append("g")
    .attr("class", "film-layer")
    .selectAll("g.film-node")
    .data(data, d => d.title)
    .join("g")
    .attr("class", d => {
      const typeClass = d.type === "Original" ? "original" : "sequel";
      const limitedClass = d.release_mode !== "Wide theatrical" ? "limited" : "";
      return `film-node ${typeClass} ${limitedClass}`;
    })
    .attr("tabindex", 0)
    .attr("aria-label", d => `${d.title}, ${formatYear(d.release_date)}, ${d.runtime_min} minutes, ${d.worldwide_gross_m} million dollars worldwide gross`)
    .attr("transform", d => `translate(${x(d.release_date)},${y(d.worldwide_gross_m)})`)
    .style("opacity", 0)
    .on("mouseenter focus", (event, d) => showTooltip(event, d))
    .on("mousemove", event => moveTooltip(event))
    .on("mouseleave blur", hideTooltip);

  // Larger transparent target makes the outlined bubbles easy to hover.
  nodes.append("circle")
    .attr("class", "hit-area")
    .attr("r", d => titleRadius(d) + 6);

  nodes.append("circle")
    .attr("class", "limited-halo")
    .attr("r", 0)
    .transition()
    .delay((_, i) => 250 + i * 22)
    .duration(650)
    .ease(d3.easeCubicOut)
    .attr("r", d => radius(d.runtime_min) + 7);

  nodes.append("circle")
    .attr("class", "orbit-ring")
    .attr("r", 0)
    .transition()
    .delay((_, i) => 260 + i * 24)
    .duration(720)
    .ease(d3.easeBackOut.overshoot(1.15))
    .attr("r", d => radius(d.runtime_min));

  // Sequels/spinoffs use a second ring instead of a different color.
  nodes.filter(d => d.type !== "Original")
    .append("circle")
    .attr("class", "sequel-ring")
    .attr("r", 0)
    .transition()
    .delay((_, i) => 340 + i * 24)
    .duration(700)
    .ease(d3.easeBackOut.overshoot(1.1))
    .attr("r", d => radius(d.runtime_min) + 4);

  nodes.append("circle")
    .attr("class", "core-dot")
    .attr("r", 0)
    .transition()
    .delay((_, i) => 470 + i * 25)
    .duration(520)
    .ease(d3.easeBackOut.overshoot(1.4))
    .attr("r", isCompact ? 4.6 : 5.7);

  // Curved titles: every film name is visible on an arc around its bubble.
  nodes.each(function(d, i) {
    const group = d3.select(this);
    const arcId = safeId(d.title, i);
    const labelR = titleRadius(d);

    group.append("path")
      .attr("id", arcId)
      .attr("class", "title-arc")
      .attr("d", upperArc(labelR));

    const text = group.append("text")
      .attr("class", "film-label-arc")
      .attr("font-size", d.title.length > 20 ? (isCompact ? 7 : 7.7) : (isCompact ? 7.8 : 8.8))
      .style("opacity", 0);

    text.append("textPath")
      .attr("href", `#${arcId}`)
      .attr("startOffset", "50%")
      .attr("text-anchor", "middle")
      .attr("dy", -3)
      .text(d.title.toUpperCase());

    text.transition()
      .delay(920 + i * 14)
      .duration(420)
      .style("opacity", 1);
  });

  const callouts = nodes
    .filter(d => annotatedTitles.has(d.title))
    .append("g")
    .attr("class", "gross-callout")
    .style("opacity", 0);

  callouts.each(function(d, i) {
    const group = d3.select(this);
    const r = radius(d.runtime_min);
    const absoluteX = x(d.release_date);
    const side = absoluteX > innerWidth * 0.74 ? -1 : 1;
    const lift = i % 2 === 0 ? -14 : -21;
    const endX = side * (r + (isCompact ? 42 : 56));
    const startX = side * (r + 3);
    const elbowX = side * (r + 15);

    group.append("path")
      .attr("d", `M ${startX},-2 L ${elbowX},${lift} L ${endX},${lift}`);

    group.append("text")
      .attr("x", endX + side * 4)
      .attr("y", lift - 3)
      .attr("text-anchor", side === 1 ? "start" : "end")
      .text(`$${formatMoney(d.worldwide_gross_m)}M`);
  });

  callouts.transition()
    .delay(1180)
    .duration(430)
    .style("opacity", 1);

  nodes.transition()
    .delay((_, i) => 180 + i * 18)
    .duration(430)
    .style("opacity", 1);
}

function showTooltip(event, d) {
  const modeNote = d.release_mode === "Wide theatrical"
    ? "Wide theatrical release"
    : d.release_mode;

  tooltip
    .html(`
      <div class="tip-type">${d.type} · ${d.franchise}</div>
      <h3>${d.title}</h3>
      <div class="tooltip-grid">
        <div><span>Released</span><strong>${formatYear(d.release_date)}</strong></div>
        <div><span>Runtime</span><strong>${d.runtime_min} min</strong></div>
        <div><span>Worldwide</span><strong>$${formatMoney(d.worldwide_gross_m)}M</strong></div>
        <div><span>Story type</span><strong>${d.type}</strong></div>
      </div>
      <p class="tooltip-note">${modeNote}</p>
    `)
    .classed("visible", true);

  moveTooltip(event);
}

function moveTooltip(event) {
  const pad = 16;
  const tooltipNode = tooltip.node();
  const box = tooltipNode.getBoundingClientRect();
  let left = event.clientX + 18;
  let top = event.clientY - box.height / 2;

  if (left + box.width > window.innerWidth - pad) left = event.clientX - box.width - 18;
  if (top < pad) top = pad;
  if (top + box.height > window.innerHeight - pad) top = window.innerHeight - box.height - pad;

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

function applyFilter(filter) {
  activeFilter = filter;
  const filtered = filter === "All"
    ? allData
    : allData.filter(d => d.type === filter);
  render(filtered);
}

d3.csv("data/pixar_movies.csv", d => ({
  ...d,
  release_date: parseDate(d.release_date),
  runtime_min: +d.runtime_min,
  worldwide_gross_m: +d.worldwide_gross_m
})).then(data => {
  allData = data.sort((a, b) => d3.ascending(a.release_date, b.release_date));
  render(allData);

  d3.selectAll(".filter-btn").on("click", function() {
    d3.selectAll(".filter-btn").classed("active", false);
    d3.select(this).classed("active", true);
    applyFilter(this.dataset.filter);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyFilter(activeFilter), 180);
  });
}).catch(error => {
  console.error(error);
  d3.select("#chart-wrap").append("p")
    .style("color", "#ffb1c7")
    .text("The CSV could not be loaded. Open this project through a local server rather than double-clicking index.html.");
});

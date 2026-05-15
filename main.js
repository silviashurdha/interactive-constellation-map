// main.js

import { initGame, isCorrectEdge } from "./game.js";
import { drawScene } from "./render.js";

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

// ---------------- State ----------------
let starsById = {};
let drawnLines = [];
let hoveredStar = null;
let hoveredLine = null;
let selectedStar = null;

let zoom = 1, offsetX = 0, offsetY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0;

let showConstellations = true;
let gameMode = false;

// UI
const startBtn = document.getElementById("startGameBtn");
const label = document.getElementById("targetConstellation");

// ---------------- Init ----------------
function init(data) {
    window.starData = data;

    for (const s of data.stars) {
        if (s.hip != null) starsById[s.hip] = s;
    }

    resizeCanvas();
    draw();
}

// ---------------- Draw ----------------
function draw() {
    if (!window.starData) return;

    drawScene({
        ctx,
        stars: window.starData.stars,
        starsById,
        drawnLines,
        hoveredStar,
        selectedStar,
        hoveredLine,
        constellations: window.starData.constellations,
        showConstellations,
        isCorrectEdge,
        zoom,
        offsetX,
        offsetY,
        gameMode
    });
}

// ---------------- Resize ----------------
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    draw();
}
window.addEventListener("resize", resizeCanvas);

// ---------------- Mouse ----------------
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
});

canvas.addEventListener("mousemove", (e) => {
    const { x, y } = getMousePos(e);

    if (isDragging) {
        offsetX = x - dragStartX;
        offsetY = y - dragStartY;
        draw();
        return;
    }

    hoveredStar = findStarAt(x, y);
    hoveredLine = hoveredStar ? null : findLineAt(x, y);

    draw();
});

canvas.addEventListener("click", (e) => {
    const { x, y } = getMousePos(e);

    if (hoveredLine) {
        drawnLines = drawnLines.filter(l => l !== hoveredLine);
        hoveredLine = null;
        draw();
        return;
    }

    const star = findStarAt(x, y);

    if (!star) {
        selectedStar = null;
        draw();
        return;
    }

    if (!selectedStar) selectedStar = star;
    else {
        drawnLines.push({ from: selectedStar.hip, to: star.hip });
        selectedStar = star;
    }

    draw();
});

// ---------------- Game ----------------
startBtn.addEventListener("click", () => {
    gameMode = true;
    drawnLines = [];
    selectedStar = null;

    const name = initGame(window.starData.constellations);
    label.textContent = `Find: ${name}`;

    draw();
});

// ---------------- Helpers ----------------
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function project(x, y) {
    let px = (x + 1) / 2 * canvas.width;
    let py = (1 - y) / 2 * canvas.height;

    px = (px - canvas.width / 2) * zoom + canvas.width / 2 + offsetX;
    py = (py - canvas.height / 2) * zoom + canvas.height / 2 + offsetY;

    return [px, py];
}

function findStarAt(px, py) {
    let closest = null, minDist = 10;

    for (const star of window.starData.stars) {
        if (star.mag > 6) continue;

        const [sx, sy] = project(star.x, star.y);
        const dist = Math.hypot(px - sx, py - sy);

        if (dist < minDist) {
            minDist = dist;
            closest = star;
        }
    }

    return closest;
}

function findLineAt(px, py) {
    let closest = null, minDist = 6;

    for (const seg of drawnLines) {
        const s1 = starsById[seg.from];
        const s2 = starsById[seg.to];
        if (!s1 || !s2) continue;

        const d = pointToSegmentDistance(px, py, ...project(s1.x, s1.y), ...project(s2.x, s2.y));

        if (d < minDist) {
            minDist = d;
            closest = seg;
        }
    }

    return closest;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1;
    const C = x2 - x1, D = y2 - y1;

    const t = Math.max(0, Math.min(1, (A*C + B*D)/(C*C + D*D)));

    const dx = px - (x1 + t*C);
    const dy = py - (y1 + t*D);

    return Math.hypot(dx, dy);
}

// ---------------- Load ----------------
fetch("sky.json")
    .then(res => res.json())
    .then(init)
    .catch(err => console.error("Error loading sky:", err));
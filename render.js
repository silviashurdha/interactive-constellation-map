// render.js

export function drawScene({
    ctx,
    stars,
    starsById,
    drawnLines,
    hoveredStar,
    selectedStar,
    hoveredLine,
    constellations,
    showConstellations,
    isCorrectEdge,
    zoom,
    offsetX,
    offsetY,
    gameMode
}) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // ---------------- Stars ----------------
    for (const star of stars) {
        if (star.mag > 6) continue;

        const [x, y] = project(star.x, star.y, ctx, zoom, offsetX, offsetY);

        ctx.fillStyle = colorFromCI(star.ci);
        ctx.beginPath();
        ctx.arc(x, y, starSize(star), 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------------- Constellations ----------------
    if (showConstellations && !gameMode) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;

        for (const name in constellations) {
            for (const seg of constellations[name]) {
                drawLine(seg.from, seg.to);
            }
        }
    }

    // ---------------- Player Lines ----------------
    for (const seg of drawnLines) {
        let color = "white";

        if (gameMode) {
            color = isCorrectEdge(seg.from, seg.to) ? "lime" : "red";
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        drawLine(seg.from, seg.to);
    }

    // ---------------- Hover / Selection ----------------
    if (hoveredStar) highlightStar(hoveredStar, "yellow");
    if (selectedStar) highlightStar(selectedStar, "cyan");

    if (hoveredLine) {
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 3;
        drawLine(hoveredLine.from, hoveredLine.to);
    }

    // ---------------- Helpers ----------------
    function drawLine(a, b) {
        const s1 = starsById[a];
        const s2 = starsById[b];
        if (!s1 || !s2) return;

        const [x1, y1] = project(s1.x, s1.y, ctx, zoom, offsetX, offsetY);
        const [x2, y2] = project(s2.x, s2.y, ctx, zoom, offsetX, offsetY);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function highlightStar(star, color) {
        const [x, y] = project(star.x, star.y, ctx, zoom, offsetX, offsetY);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ---------------- Utilities ----------------
function project(x, y, ctx, zoom, offsetX, offsetY) {
    let px = (x + 1) / 2 * ctx.canvas.width;
    let py = (1 - y) / 2 * ctx.canvas.height;

    px = (px - ctx.canvas.width / 2) * zoom + ctx.canvas.width / 2 + offsetX;
    py = (py - ctx.canvas.height / 2) * zoom + ctx.canvas.height / 2 + offsetY;

    return [px, py];
}

function starSize(star) {
    let size = Math.max(0.5, 4 - star.mag * 0.5);
    if (star.proper && star.proper.trim() !== "") size *= 1.7;
    return size;
}

function colorFromCI(ci) {
    if (ci === null) return "white";

    ci = Math.max(-0.3, Math.min(2.0, ci));
    const t = (ci + 0.3) / 2.3;

    const colors = [
        [155,176,255],[170,191,255],[202,215,255],
        [255,244,234],[255,210,161],[255,204,111],[255,170,90]
    ];

    const i = Math.floor(t * (colors.length - 1));
    const f = t * (colors.length - 1) - i;

    const c1 = colors[i];
    const c2 = colors[i + 1] || c1;

    return `rgb(
        ${Math.round(c1[0] + f * (c2[0] - c1[0]))},
        ${Math.round(c1[1] + f * (c2[1] - c1[1]))},
        ${Math.round(c1[2] + f * (c2[2] - c1[2]))}
    )`;
}
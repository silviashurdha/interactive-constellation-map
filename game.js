// game.js

let currentConstellation = null;
let correctEdges = new Set();

function normalizeEdge(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function initGame(constellations) {
    const names = Object.keys(constellations);
    currentConstellation = names[Math.floor(Math.random() * names.length)];

    correctEdges.clear();

    for (const seg of constellations[currentConstellation]) {
        correctEdges.add(normalizeEdge(seg.from, seg.to));
    }

    console.log("Game started:", currentConstellation);

    return currentConstellation; // ✅ IMPORTANT
}

export function isCorrectEdge(a, b) {
    return correctEdges.has(normalizeEdge(a, b));
}

export function checkPlayerLines(drawnLines) {
    let correct = 0;

    for (const line of drawnLines) {
        if (isCorrectEdge(line.from, line.to)) correct++;
    }

    return {
        correct,
        total: correctEdges.size
    };
}
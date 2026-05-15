import { useState, useEffect, useRef } from "react";
import { drawScene } from "../utils/render";
import { isCorrectEdge } from "../utils/game";

export default function SkyCanvas({
  starData,
  gameMode,
  nextSignal,
  resetSignal,
  recenterSignal,
  showConstellations
}) {

  const canvasRef = useRef(null);

  const [starsById, setStarsById] = useState({});
  const [drawnLines, setDrawnLines] = useState([]);
  const [hoveredStar, setHoveredStar] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);

  const [zoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState({ isDragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    if (!starData) return;
    const map = {};
    for (const s of starData.stars) {
      if (s.hip != null) map[s.hip] = s;
    }
    setStarsById(map);
  }, [starData]);

  // Recenter
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    // if you add zoom later:
    // setZoom(1);
  }, [recenterSignal]);

  // Reset lines
  useEffect(() => {
    setDrawnLines([]);
  }, [resetSignal]);

  // Next constellation
  useEffect(() => {
    setDrawnLines([]);
    setSelectedStar(null);
    setHoveredLine(null);
    setHoveredStar(null);
  }, [nextSignal]);

  useEffect(() => {
    if (!starData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    drawScene({
      ctx,
      stars: starData.stars,
      starsById,
      drawnLines,
      hoveredStar,
      selectedStar,
      hoveredLine,
      constellations: starData.constellations,
      showConstellations: true,
      isCorrectEdge,
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
      gameMode
    });
  }, [
    starData,
    starsById,
    drawnLines,
    hoveredStar,
    selectedStar,
    hoveredLine,
    zoom,
    offset,
    gameMode
  ]);

  function getMousePos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function project(x, y) {
    const canvas = canvasRef.current;
    let px = (x + 1) / 2 * canvas.width;
    let py = (1 - y) / 2 * canvas.height;

    px = (px - canvas.width / 2) * zoom + canvas.width / 2 + offset.x;
    py = (py - canvas.height / 2) * zoom + canvas.height / 2 + offset.y;

    return [px, py];
  }

  function findStarAt(px, py) {
    let closest = null, minDist = 10;

    for (const star of starData.stars) {
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

  function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1;
    const C = x2 - x1, D = y2 - y1;

    const t = Math.max(0, Math.min(1, (A*C + B*D)/(C*C + D*D)));

    const dx = px - (x1 + t*C);
    const dy = py - (y1 + t*D);

    return Math.hypot(dx, dy);
  }

  function findLineAt(px, py) {
    let closest = null, minDist = 6;

    for (const seg of drawnLines) {
      const s1 = starsById[seg.from];
      const s2 = starsById[seg.to];
      if (!s1 || !s2) continue;

      const [x1, y1] = project(s1.x, s1.y);
      const [x2, y2] = project(s2.x, s2.y);

      const d = pointToSegmentDistance(px, py, x1, y1, x2, y2);

      if (d < minDist) {
        minDist = d;
        closest = seg;
      }
    }

    return closest;
  }

  function handleMouseDown(e) {
    const { x, y } = getMousePos(e);
    setDrag({
      isDragging: true,
      startX: x - offset.x,
      startY: y - offset.y
    });
  }

  function handleMouseUp() {
    setDrag(d => ({ ...d, isDragging: false }));
  }

  function handleMouseMove(e) {
    const { x, y } = getMousePos(e);

    if (drag.isDragging) {
      setOffset({
        x: x - drag.startX,
        y: y - drag.startY
      });
      return;
    }

    setHoveredStar(findStarAt(x, y));
    setHoveredLine(findLineAt(x, y));
  }

  function handleClick(e) {
    const { x, y } = getMousePos(e);

    if (hoveredLine) {
      setDrawnLines(lines => lines.filter(l => l !== hoveredLine));
      setHoveredLine(null);
      return;
    }

    const star = findStarAt(x, y);

    if (!star) {
      setSelectedStar(null);
      return;
    }

    if (!selectedStar) {
      setSelectedStar(star);
    } else {
      setDrawnLines(lines => [
        ...lines,
        { from: selectedStar.hip, to: star.hip }
      ]);
      setSelectedStar(star);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%", display: "block" }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}

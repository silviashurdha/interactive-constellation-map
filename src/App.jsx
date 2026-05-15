import { useState, useEffect } from "react";
import SkyCanvas from "./components/SkyCanvas";
import GameUI from "./components/GameUI";
import { initGame } from "./utils/game";


export default function App() {
  const [starData, setStarData] = useState(null);
  const [gameMode, setGameMode] = useState(false);
  const [targetConstellation, setTargetConstellation] = useState("");
  const [nextSignal, setNextSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [showConstellations, setShowConstellations] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Next Button
  function handleNext() {
    const names = Object.keys(starData.constellations);
    setScore(s => s + 1);

    // Iterate through the list of the constellations
    // Make this random????
    setCurrentIndex(i => {
      const next = i + 1;
      return next >= names.length ? 0 : next; // wrap or stop
    });

    const nextName = names[currentIndex + 1] || names[0];   
    setTargetConstellation(nextName);
    setNextSignal(n => n + 1);

  }

  // Reset the lines drawn by user
  function handleResetLines() {
    setResetSignal(n => n + 1);
  }

  // Turn the constellations on and off
  function handleToggleConstellations() {
    setShowConstellations(v => !v);
  }

  // Reset the position of the map
  function handleRecenter() {
    setRecenterSignal(n => n + 1);
  }

  useEffect(() => {
    fetch("/sky.json")
      .then(res => res.json())
      .then(setStarData);
  }, []);

  // Start the game
  function handleStartGame() {
    setCurrentIndex(0);
    const names = Object.keys(starData.constellations);

    if (names.length === 0) return;

    setCurrentIndex(0);
    setTargetConstellation(names[0]);
    setGameMode(true);
  }

  if (!starData) return <div>Loading sky…</div>;

  return (
    <div className="app">
    <GameUI
      onStartGame={handleStartGame}
      onNext={handleNext}
      onResetLines={handleResetLines}
      onToggleConstellations={handleToggleConstellations}
      onRecenter={handleRecenter}
      showConstellations={showConstellations}
      target={targetConstellation}
    />

    <SkyCanvas
      starData={starData}
      gameMode={gameMode}
      nextSignal={nextSignal}
      resetSignal={resetSignal}
      recenterSignal={recenterSignal}
      showConstellations={showConstellations}
    />

    </div>
  );
}

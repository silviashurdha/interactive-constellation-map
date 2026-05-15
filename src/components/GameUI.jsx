import { initGame } from "../utils/game";

export default function GameUI({
  onStartGame,
  onNext,
  onResetLines,
  onToggleConstellations,
  onRecenter,
  showConstellations,
  target
}) {
  return (
    <div id="gameUI">
      <button onClick={() => onStartGame()}>Start Game</button>
      <button onClick={() => onNext()}>Next</button>
      <button onClick={() => onResetLines()}>Reset Lines</button>
      <button onClick={() => onToggleConstellations()}>
        {showConstellations ? "Hide Constellations" : "Show Constellations"}
      </button>
      <button onClick={() => onRecenter()}>Recenter</button>
      {target && <div>Find: {target}</div>}
    </div>
  );
}

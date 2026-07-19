const VIEW_IDS = {
  landing: "view-landing",
  lobby: "view-lobby",
  "role-reveal": "view-role-reveal",
  guessing: "view-guessing",
  voting: "view-voting",
  results: "view-results",
};

export function renderRoute(state) {
  const activeView = state.roomId ? state.phase : "landing";

  Object.entries(VIEW_IDS).forEach(([name, id]) => {
    const el = document.getElementById(id);
    if (el) el.hidden = name !== activeView;
  });

  const roomCodeDisplay = document.getElementById("room-code-display");
  if (roomCodeDisplay) {
    if (state.roomId) {
      roomCodeDisplay.hidden = false;
      roomCodeDisplay.textContent = `Room: ${state.roomId}`;
    } else {
      roomCodeDisplay.hidden = true;
    }
  }
}

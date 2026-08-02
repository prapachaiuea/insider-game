import { getState } from "../state.js";
import { computeResult } from "../votes.js";
import { startRound, backToLobby, triggerRestartCountdown } from "../game.js";
import { serverNow } from "../utils/timer.js";
import { showToast } from "./components.js";

let initialized = false;
let restartIntervalId = null;
let restartTriggered = false;

export function init() {
  if (initialized) return;
  initialized = true;
  document.getElementById("btn-play-again").addEventListener("click", async (e) => {
    const { roomId } = getState();
    const btn = e.target;
    btn.disabled = true;
    try {
      // Broadcasts a shared countdown (rendered below via the same full-screen overlay used
      // before the guessing timer) instead of a host-only button-text countdown — everyone
      // gets a beat to look up from the results screen, not just the host.
      await triggerRestartCountdown(roomId);
    } catch {
      showToast("Could not start a new round — check your connection.", true);
      btn.disabled = false;
    }
  });
  document.getElementById("btn-back-to-lobby").addEventListener("click", async () => {
    const { roomId } = getState();
    await backToLobby(roomId);
  });
}

function restartTick() {
  const state = getState();
  const overlay = document.getElementById("preround-overlay");
  const overlayNumber = document.getElementById("preround-number");
  const restartAt = state.public?.restartAt;

  if (!restartAt) {
    overlay.hidden = true;
    return;
  }

  const msRemaining = restartAt - serverNow();
  if (msRemaining > 0) {
    overlay.hidden = false;
    overlayNumber.textContent = Math.ceil(msRemaining / 1000);
    return;
  }
  overlay.hidden = true;

  if (state.isHost && !restartTriggered) {
    restartTriggered = true;
    startRound(state.roomId).catch(() => {
      showToast("Could not start a new round — check your connection.", true);
    });
  }
}

export function render(state) {
  if (state.phase !== "results") {
    if (restartIntervalId) {
      clearInterval(restartIntervalId);
      restartIntervalId = null;
    }
    restartTriggered = false;
    document.getElementById("preround-overlay").hidden = true;
    return;
  }

  if (!restartIntervalId) {
    restartTriggered = false;
    restartIntervalId = setInterval(() => restartTick(), 250);
    restartTick();
  }

  const banner = document.getElementById("results-banner");
  const insiderEl = document.getElementById("results-insider");
  const tallyList = document.getElementById("results-tally");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnBackToLobby = document.getElementById("btn-back-to-lobby");

  const wordGuessed = state.public?.guess?.wordGuessed;
  const insiderUid = state.insiderUid;
  const players = state.players || {};

  tallyList.innerHTML = "";

  if (!wordGuessed) {
    banner.textContent = "Time's up! The word was never guessed.";
    banner.className = "results-banner lose";
    insiderEl.textContent = insiderUid
      ? `The Insider was ${players[insiderUid]?.name || "unknown"}. They win!`
      : "";
  } else {
    const result = computeResult(state.votes, insiderUid, Object.keys(players));

    banner.textContent = result.winner === "group" ? "The Insider was caught!" : "The Insider got away!";
    banner.className = `results-banner ${result.winner === "group" ? "win" : "lose"}`;
    insiderEl.textContent = insiderUid ? `The Insider was ${players[insiderUid]?.name || "unknown"}.` : "";

    Object.entries(players).forEach(([uid, p]) => {
      const votes = result.tally[uid] || 0;
      const li = document.createElement("li");
      li.className = `player-chip${uid === insiderUid ? " is-insider" : ""}`;
      li.textContent = `${p.name}${uid === state.uid ? " (you)" : ""} — ${votes} vote${votes === 1 ? "" : "s"}`;
      tallyList.appendChild(li);
    });
  }

  if (state.isHost) {
    btnPlayAgain.hidden = false;
    btnPlayAgain.disabled = Boolean(state.public?.restartAt);
    btnBackToLobby.hidden = false;
  } else {
    btnPlayAgain.hidden = true;
    btnBackToLobby.hidden = true;
  }
}

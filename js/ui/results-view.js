import { getState } from "../state.js";
import { computeResult } from "../votes.js";
import { startRound, backToLobby } from "../game.js";
import { showToast } from "./components.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;
  document.getElementById("btn-play-again").addEventListener("click", async (e) => {
    const { roomId } = getState();
    const btn = e.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    try {
      // A beat before the next round actually starts — gives everyone a second to look up
      // from the results screen instead of instantly getting a new secret word.
      for (let n = 3; n > 0; n--) {
        btn.textContent = `Starting in ${n}…`;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await startRound(roomId);
    } catch {
      showToast("Could not start a new round — check your connection.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
  document.getElementById("btn-back-to-lobby").addEventListener("click", async () => {
    const { roomId } = getState();
    await backToLobby(roomId);
  });
}

export function render(state) {
  if (state.phase !== "results") return;

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
    btnBackToLobby.hidden = false;
  } else {
    btnPlayAgain.hidden = true;
    btnBackToLobby.hidden = true;
  }
}

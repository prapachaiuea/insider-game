import { getState } from "../state.js";
import { castVote } from "../votes.js";
import { revealResults } from "../game.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;
  document.getElementById("btn-reveal").addEventListener("click", async () => {
    const { roomId } = getState();
    await revealResults(roomId);
  });
}

export function render(state) {
  if (state.phase !== "voting") return;

  const list = document.getElementById("vote-list");
  const hint = document.getElementById("voting-hint");
  const btnReveal = document.getElementById("btn-reveal");

  const isMaster = state.mySecret?.role === "master";
  const myVote = state.votes?.[state.uid]?.votedFor || null;

  hint.textContent = isMaster
    ? "As the Master, you don't vote. Wait for the group to decide."
    : myVote
      ? "Vote cast — you can change it until results are revealed."
      : "Who do you think was the Insider?";

  list.innerHTML = "";
  Object.entries(state.players || {}).forEach(([uid, p]) => {
    const li = document.createElement("li");
    li.className = "player-chip vote-option";
    const selected = myVote === uid;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `vote-btn${selected ? " selected" : ""}`;
    btn.textContent = p.name + (uid === state.uid ? " (you)" : "");
    btn.disabled = isMaster;
    btn.addEventListener("click", async () => {
      const { roomId } = getState();
      await castVote(roomId, uid);
    });
    li.appendChild(btn);
    list.appendChild(li);
  });

  const votesCast = Object.keys(state.votes || {}).length;
  const totalPlayers = Object.keys(state.players || {}).length;

  if (state.isHost) {
    btnReveal.hidden = false;
    btnReveal.textContent = `Reveal Results (${votesCast}/${Math.max(totalPlayers - 1, 0)} voted)`;
  } else {
    btnReveal.hidden = true;
  }
}
